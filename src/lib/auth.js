import Credentials from "next-auth/providers/credentials";
import fs from "fs";
import path from "path";
import crypto from "crypto";

import bcrypt from "bcryptjs";

import prisma from "@/lib/prisma";
import { recordLogin } from "./audit";
import {
  getDashboardSessionCookieName,
  getDashboardCsrfCookieName,
  getDashboardCallbackUrlCookieName,
  getDashboardPkceCookieName,
  getDashboardStateCookieName,
  getDashboardNonceCookieName,
  isDashboardAuthCookieSecure,
} from "./dashboardAuthCookie";

let cachedTimeoutMs = null;
let lastTimeoutFetch = 0;

export const authOptions = {
  session: {
    strategy: "jwt",
  },

  providers: [
    Credentials({
      name: "credentials",

      credentials: {
        email: {
          label: "Email",
          type: "email",
        },
        password: {
          label: "Password",
          type: "password",
        },
        recaptchaToken: {
          label: "reCAPTCHA Token",
          type: "text",
        },
        twoFACode: {
          label: "2FA Code",
          type: "text",
        },
      },

      async authorize(credentials, req) {
        const logFile = path.join(process.cwd(), "auth_debug.log");
        const writeLog = (msg) => {
          console.log(msg); // Also output to Vercel/NextJS server console
          try {
            fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${msg}\n`);
          } catch (e) {
            // Ephemeral file systems on Vercel will trigger this, which is fine
          }
        };

        writeLog(`[Auth] Attempt started. Email: ${credentials?.email}`);

        if (!credentials?.email || !credentials?.password) {
          writeLog("[Auth] Failed: Email or password missing");
          throw new Error("Email and password required");
        }

        let secretKey = process.env.RECAPTCHA_SECRET_KEY;
        const host = req.headers?.host || "";
        writeLog(`[Auth] Request Host: ${host}`);

        if (secretKey) {
          const isTestKeyHost = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}/.test(host) ||
            host.includes("localhost") ||
            host.includes("127.0.0.1") ||
            host.includes(".ngrok.io") ||
            host.includes(".ngrok-free.app") ||
            host.includes(".ngrok-free.dev") ||
            host.includes(".vercel.app");

          if (isTestKeyHost) {
            writeLog("[Auth] Detected local, IP, Ngrok, or Vercel host. Skipping reCAPTCHA entirely.");
            secretKey = null; // Disable verification for this request
          }
        }

        const isDev = process.env.NODE_ENV === "development";
        if (secretKey && !isDev) {
          const recaptchaToken = credentials?.recaptchaToken;
          writeLog(`[Auth] Token received (length: ${recaptchaToken?.length}): ${recaptchaToken ? recaptchaToken.substring(0, 30) : "empty"}...`);
          if (!recaptchaToken) {
            writeLog("[Auth] Failed: reCAPTCHA token missing");
            throw new Error("reCAPTCHA verification is required");
          }

          try {
            const verifyUrl = "https://www.google.com/recaptcha/api/siteverify";
            const queryParams = new URLSearchParams({
              secret: secretKey,
              response: recaptchaToken,
            });

            writeLog("[Auth] Sending request to google siteverify (x-www-form-urlencoded POST body)...");
            const verifyRes = await fetch(verifyUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: queryParams.toString(),
            });

            const verifyJson = await verifyRes.json();
            writeLog(`[Auth] reCAPTCHA verifyJson: ${JSON.stringify(verifyJson)}`);

            if (!verifyJson.success) {
              writeLog("[Auth] Failed: reCAPTCHA verifyJson success is false");
              throw new Error("reCAPTCHA verification failed");
            }

            if (verifyJson.score !== undefined && verifyJson.score < 0.5) {
              writeLog(`[Auth] Failed: reCAPTCHA v3 score too low: ${verifyJson.score}`);
              throw new Error("reCAPTCHA validation failed (suspicious activity detected)");
            }
          } catch (captchaErr) {
            writeLog(`[Auth] reCAPTCHA exception: ${captchaErr.message || captchaErr}`);
            throw new Error(captchaErr.message || "reCAPTCHA verification failed");
          }
        } else {
          writeLog("[Auth] Skipping reCAPTCHA verification (no secret key configured).");
        }

        try {
          const { authService } = await import("@/services/auth.service");
          writeLog(`[Auth] Authenticating against authService for: ${credentials.email}`);
          const user = await authService.authenticate(
            credentials.email,
            credentials.password,
            credentials.twoFACode,
            req.headers || {}
          );
          writeLog(`[Auth] Authentication successful for: ${credentials.email}. User ID: ${user?.id}`);
          return user;
        } catch (err) {
          writeLog(`[Auth] Admin authentication failed for: ${credentials.email}, checking User table fallback...`);
          const rawEmail = (credentials?.email || "").trim();
          const normalizedEmail = rawEmail.toLowerCase();
          const frontendUser = await prisma.user.findFirst({
            where: {
              OR: [{ email: normalizedEmail }, { email: rawEmail }],
              isActive: true,
            }
          });
          if (frontendUser) {
            let authenticated = false;
            if (frontendUser.passwordHash) {
              try { authenticated = await bcrypt.compare(credentials.password, frontendUser.passwordHash); } catch { /* ignore */ }
            }
            if (!authenticated && frontendUser.legacyPasswordHash) {
              const sha256 = crypto.createHash("sha256").update(credentials.password).digest("hex");
              if (sha256 === frontendUser.legacyPasswordHash) authenticated = true;
            }
            if (authenticated) {
              writeLog(`[Auth] Frontend user authenticated via fallback for: ${frontendUser.email}`);
              return {
                id: String(frontendUser.id),
                email: frontendUser.email,
                name: frontendUser.name,
                globalRole: frontendUser.globalRole || "VISITOR"
              };
            }
          }
          throw new Error(err.message || "Invalid credentials");
        }
      },
    }),
  ],

  cookies: {
    sessionToken: {
      name: getDashboardSessionCookieName(),
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isDashboardAuthCookieSecure(),
      },
    },
    csrfToken: {
      name: getDashboardCsrfCookieName(),
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isDashboardAuthCookieSecure(),
      },
    },
    callbackUrl: {
      name: getDashboardCallbackUrlCookieName(),
      options: {
        sameSite: "lax",
        path: "/",
        secure: isDashboardAuthCookieSecure(),
      },
    },
    pkceCodeVerifier: {
      name: getDashboardPkceCookieName(),
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isDashboardAuthCookieSecure(),
        maxAge: 900,
      },
    },
    state: {
      name: getDashboardStateCookieName(),
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isDashboardAuthCookieSecure(),
        maxAge: 900,
      },
    },
    nonce: {
      name: getDashboardNonceCookieName(),
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isDashboardAuthCookieSecure(),
      },
    },
  },

  callbacks: {
    async jwt({ token, user }) {
      const now = Date.now();
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.globalRole = user.globalRole;
        token.lastActivity = now;
      }

      // Dynamic session timeout verification from database with caching
      try {
        if (!cachedTimeoutMs || now - lastTimeoutFetch > 60000) {
          const activeSite = await prisma.site.findFirst({ where: { isActive: true } });
          if (activeSite) {
            const settings = await prisma.globalSettings.findUnique({
              where: { siteId: activeSite.id },
              select: { securityControls: true },
            });
            const timeoutMinutes = settings?.securityControls?.sessionTimeoutMinutes || 30;
            cachedTimeoutMs = timeoutMinutes * 60 * 1000;
            lastTimeoutFetch = now;
          }
        }

        const timeoutMs = cachedTimeoutMs || 30 * 60 * 1000;

        const isDev = process.env.NODE_ENV === "development";
        if (!isDev && token.lastActivity && now - token.lastActivity > timeoutMs) {
          token.error = "SessionExpired";
        } else {
          token.lastActivity = now;
        }
      } catch (err) {
        console.error("JWT Session timeout verification error:", err);
      }

      return token;
    },

    async session({ session, token }) {
      if (token.error === "SessionExpired") {
        session.error = "SessionExpired";
        session.user = null;
        return session;
      }

      session.user = {
        id: token.id,
        email: token.email,
        name: token.name,
        globalRole: token.globalRole,
      };

      return session;
    },

    async redirect({ url, baseUrl }) {
      // Allow any callback URL that is provided, preserving the dynamic host (ngrok)
      // This prevents NextAuth from forcing a redirect back to localhost
      if (url.startsWith("/")) {
        return new URL(url, baseUrl).toString();
      }
      return url;
    },
  },

  pages: {
    signIn: "/dashboard/login",
    error: "/dashboard/login",
  },

  useSecureCookies: isDashboardAuthCookieSecure(),
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
};
