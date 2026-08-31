import Credentials from "next-auth/providers/credentials";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import {
  getFrontendSessionCookieName,
  getFrontendCsrfCookieName,
  getFrontendCallbackUrlCookieName,
  getFrontendPkceCookieName,
  getFrontendStateCookieName,
  getFrontendNonceCookieName,
  isFrontendAuthCookieSecure,
} from "./frontendAuthCookie";

export const frontendAuthOptions = {
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

        const rawEmail = (credentials?.email || "").trim();
        const normalizedEmail = rawEmail.toLowerCase();
        writeLog(`[Frontend Auth] Attempt started. Email: ${rawEmail}`);

        if (!rawEmail || !credentials?.password) {
          writeLog("[Frontend Auth] Failed: Email or password missing");
          throw new Error("Email and password required");
        }

        try {
          // Query User table for accounts (VISITOR or general users)
          const frontendUser = await prisma.user.findFirst({
            where: {
              OR: [
                { email: normalizedEmail },
                { email: rawEmail },
              ],
              isActive: true,
            }
          });

          if (frontendUser) {
            let authenticated = false;

            // 1. Try bcrypt (new accounts or already upgraded)
            if (frontendUser.passwordHash) {
              try {
                authenticated = await bcrypt.compare(credentials.password, frontendUser.passwordHash);
              } catch { /* bad hash format - fall through to legacy check */ }
            }

            // 2. Fall back to legacy SHA-256 hash (migrated accounts)
            if (!authenticated && frontendUser.legacyPasswordHash) {
              const sha256 = crypto.createHash("sha256").update(credentials.password).digest("hex");
              if (sha256 === frontendUser.legacyPasswordHash) {
                authenticated = true;
                // Transparently upgrade to bcrypt and clear legacy hash
                try {
                  const newHash = await bcrypt.hash(credentials.password, 10);
                  await prisma.user.update({
                    where: { id: frontendUser.id },
                    data: { passwordHash: newHash, legacyPasswordHash: null },
                  });
                  writeLog(`[Frontend Auth] Upgraded password hash to bcrypt for: ${frontendUser.email}`);
                } catch (upgradeErr) {
                  writeLog(`[Frontend Auth] Failed to upgrade password hash: ${upgradeErr.message}`);
                }
              }
            }

            if (authenticated) {
              writeLog(`[Frontend Auth] Frontend user authenticated successfully: ${frontendUser.email}`);
              return {
                id: String(frontendUser.id),
                email: frontendUser.email,
                name: frontendUser.name,
                globalRole: frontendUser.globalRole || "VISITOR"
              };
            }
          }
        } catch (frontendErr) {
          writeLog(`[Frontend Auth] Frontend authentication error: ${frontendErr.message}`);
        }

        writeLog(`[Frontend Auth] All authentication methods failed for: ${rawEmail}`);
        throw new Error("Invalid credentials");
      },
    }),
  ],

  cookies: {
    sessionToken: {
      name: getFrontendSessionCookieName(),
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isFrontendAuthCookieSecure(),
      },
    },
    csrfToken: {
      name: getFrontendCsrfCookieName(),
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isFrontendAuthCookieSecure(),
      },
    },
    callbackUrl: {
      name: getFrontendCallbackUrlCookieName(),
      options: {
        sameSite: "lax",
        path: "/",
        secure: isFrontendAuthCookieSecure(),
      },
    },
    pkceCodeVerifier: {
      name: getFrontendPkceCookieName(),
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isFrontendAuthCookieSecure(),
        maxAge: 900,
      },
    },
    state: {
      name: getFrontendStateCookieName(),
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isFrontendAuthCookieSecure(),
        maxAge: 900,
      },
    },
    nonce: {
      name: getFrontendNonceCookieName(),
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isFrontendAuthCookieSecure(),
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
        token.globalRole = user.globalRole || "USER";
        token.lastActivity = now;
      }

      // Simple static timeout for frontend users (e.g. 24 hours)
      const timeoutMs = 24 * 60 * 60 * 1000;

      if (token.lastActivity && now - token.lastActivity > timeoutMs) {
        token.error = "SessionExpired";
      } else {
        token.lastActivity = now;
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
      if (url.startsWith("/")) {
        return new URL(url, baseUrl).toString();
      }
      return url;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  useSecureCookies: isFrontendAuthCookieSecure(),
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
};
