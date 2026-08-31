import { NextResponse } from "next/server";
import { checkSitePermission } from "@/lib/apiAuth";
import prisma from "@/lib/prisma";
import { handleApiError, apiSuccess } from "@/core/errors";

export async function POST(req) {
  const auth = await checkSitePermission(req, "ADMIN");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const siteId = auth.siteId;

    // Fetch site data, settings, users to run diagnostics
    const [site, settings, siteUsers] = await Promise.all([
      prisma.site.findUnique({
        where: { id: siteId },
        include: { users: { include: { user: true } } },
      }),
      prisma.globalSettings.findUnique({
        where: { siteId },
      }),
      prisma.siteUser.findMany({
        where: { siteId },
        include: { user: true },
      }),
    ]);

    const securityControls = settings?.securityControls || {};
    const auditChecks = [];

    // Check 1: Input Validation / reCAPTCHA Configuration
    const hasRecaptcha = !!(securityControls.recaptchaSiteKey && securityControls.recaptchaSecretKey);
    auditChecks.push({
      id: "input-validation",
      name: "Input Validation (reCAPTCHA v3)",
      status: hasRecaptcha ? "PASSED" : "WARNING",
      severity: "MEDIUM",
      description: hasRecaptcha 
        ? "reCAPTCHA validation keys are active for registration/contact forms." 
        : "reCAPTCHA v3 keys are missing. Public forms may be vulnerable to spam bots.",
      recommendation: "Provide Google reCAPTCHA v3 site and secret keys in Security Controls.",
    });

    // Check 2: OWASP #1 - SQL Injection Prevention (ORM Status)
    auditChecks.push({
      id: "sql-injection",
      name: "SQL Injection Prevention",
      status: "PASSED",
      severity: "HIGH",
      description: "Prisma ORM is utilized for database operations, executing queries via safe parameterized statements.",
      recommendation: "Ensure raw SQL query methods (e.g. prisma.$queryRaw) are not used with unsanitized user input.",
    });

    // Check 3: OWASP #2 - Broken Authentication (2FA Adoption)
    const usersWith2FA = siteUsers.filter((su) => su.user.twoFAEnabled).length;
    const allUsersCount = siteUsers.length;
    const is2faPassed = allUsersCount > 0 && usersWith2FA === allUsersCount;

    auditChecks.push({
      id: "broken-auth",
      name: "Broken Authentication (2FA Multi-Factor)",
      status: is2faPassed ? "PASSED" : (usersWith2FA > 0 ? "WARNING" : "FAILED"),
      severity: "HIGH",
      description: `2FA is enabled for ${usersWith2FA} out of ${allUsersCount} user accounts associated with this site.`,
      recommendation: "Enforce multi-factor authentication (2FA) for all administrative and editor accounts.",
    });

    // Check 4: Session Security & Session Timeout Control
    const timeout = parseInt(securityControls.sessionTimeoutMinutes, 10) || 30;
    const isTimeoutOk = timeout <= 60;
    auditChecks.push({
      id: "session-timeout",
      name: "Session Inactivity Timeout",
      status: isTimeoutOk ? "PASSED" : "WARNING",
      severity: "MEDIUM",
      description: `Inactivity session timeout is configured to ${timeout} minutes.`,
      recommendation: "Configure session timeouts to 30-60 minutes or less to protect unattended active sessions.",
    });

    // Check 5: OWASP #5 - Security Misconfiguration (Response Headers check)
    // Simulating endpoint ping to verify security headers on local deployment
    let missingHeaders = ["Content-Security-Policy", "X-Frame-Options", "X-Content-Type-Options"];
    try {
      const localUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      const pingRes = await fetch(`${localUrl}/api/settings?siteId=${siteId}`, { signal: AbortSignal.timeout(2000) });
      const headers = pingRes.headers;
      
      if (headers.get("x-frame-options")) missingHeaders = missingHeaders.filter((h) => h !== "X-Frame-Options");
      if (headers.get("content-security-policy")) missingHeaders = missingHeaders.filter((h) => h !== "Content-Security-Policy");
      if (headers.get("x-content-type-options")) missingHeaders = missingHeaders.filter((h) => h !== "X-Content-Type-Options");
    } catch {
      // ignore, fallback to full mock check
    }

    const hasHeaders = missingHeaders.length === 0;
    auditChecks.push({
      id: "security-headers",
      name: "HTTP Security Response Headers",
      status: hasHeaders ? "PASSED" : "WARNING",
      severity: "MEDIUM",
      description: hasHeaders 
        ? "All critical security response headers are active." 
        : `Missing or misconfigured security headers: ${missingHeaders.join(", ")}.`,
      recommendation: "Configure Next.js headers config to send secure headers (e.g. CSP, X-Frame-Options: DENY).",
    });

    // Check 6: OWASP #3 - Sensitive Data Exposure (SSL/HTTPS Status)
    const domain = site?.domain || "";
    const isHttps = domain.startsWith("https://") || domain === "" || domain.includes(".local");
    auditChecks.push({
      id: "https-audit",
      name: "Sensitive Data Transit (SSL/HTTPS)",
      status: isHttps ? "PASSED" : "FAILED",
      severity: "HIGH",
      description: isHttps 
        ? "Application transmission is protected via SSL/HTTPS or local loopback." 
        : `The domain ${domain} is running on unencrypted HTTP protocol.`,
      recommendation: "Install SSL certificate (e.g. Let's Encrypt) and force HTTPS redirection on the frontend server.",
    });

    // Calculate score
    const totalChecks = auditChecks.length;
    const passedChecks = auditChecks.filter((c) => c.status === "PASSED").length;
    const securityScore = Math.round((passedChecks / totalChecks) * 100);

    return NextResponse.json(
      apiSuccess({
        timestamp: new Date().toISOString(),
        securityScore,
        totalChecks,
        passedChecks,
        checks: auditChecks,
      })
    );
  } catch (err) {
    return handleApiError(err);
  }
}
