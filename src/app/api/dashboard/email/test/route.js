import { logger } from "@/lib/logger";
import crypto from "crypto";
import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { checkSitePermission } from "@/lib/apiAuth";
import { emailService } from "@/services/email.service";
import { apiSuccess } from "@/core/errors";
import { getRequestId } from "@/lib/observability/requestContext";


export async function POST(req) {
  const auth = await checkSitePermission(req, "ADMIN");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const result = await emailService.testConnection(auth.siteId);

    // If a recipient email is provided, also send a test email
    if (body?.sendTestEmail) {
      const recipient = body.recipientEmail || auth.user.email;
      await emailService.sendTestEmail(auth.siteId, recipient);
      return NextResponse.json(
        apiSuccess({
          connection: result.message,
          testEmail: `Test email sent to ${recipient}`,
        }),
      );
    }

    return NextResponse.json(apiSuccess(result));
  } catch (err) {
    const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));
    Sentry.captureException(err, { tags: { requestId: _reqId } });
    logger.error({ err: err, requestId: _reqId }, "Email test error:");
    return NextResponse.json(
      {
        success: false,
        error: "Connection test failed",
        code: err.code,
        message: err.message,
      },
      { status: err.status || 500 },
    );
  }
}
