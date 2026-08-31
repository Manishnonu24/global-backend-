import { logger } from "@/lib/logger";
import crypto from "crypto";
import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { checkSitePermission } from "@/lib/apiAuth";
import { apiSuccess } from "@/core/errors";
import { emailService } from "@/services/email.service";
import { getRequestId } from "@/lib/observability/requestContext";


export async function POST(req) {
  const auth = await checkSitePermission(req, "ADMIN");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    // Test the connection using emailService which handles both SMTP and Resend
    const connectionResult = await emailService.testConnection(auth.siteId);

    // Send a test email to the authenticated user
    const testResult = await emailService.sendTestEmail(
      auth.siteId,
      auth.user.email,
    );

    return NextResponse.json(
      apiSuccess({
        message: testResult.message,
        connection: connectionResult,
      }),
    );
  } catch (err) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
    Sentry.captureException(err, { tags: { requestId: _reqId } });
    logger.error({ err: err, requestId: _reqId }, "Email Test Error:");

    // Log failure
    try {
      await emailService.logEmailFailure(auth.siteId, err.message, {
        context: "connection-test",
        to: auth.user.email,
      });
    } catch (logErr) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
      Sentry.captureException(logErr, { tags: { requestId: _reqId } });
    logger.error({ err: logErr, requestId: _reqId }, "Failed to save email fail log to DB:");
    }

    return NextResponse.json(
      {
        success: false,
        error: "Email connection failed",
        code: err.code,
        message: err.message,
      },
      { status: err.status || 500 },
    );
  }
}
