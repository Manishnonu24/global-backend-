import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkSitePermission } from "@/lib/apiAuth";
import { apiSuccess } from "@/core/errors";

export async function GET(req) {
  const auth = await checkSitePermission(req, "ADMIN");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const settings = await prisma.globalSettings.findUnique({
      where: { siteId: auth.siteId },
      select: { emailSettings: true },
    });

    const emailSettings = settings?.emailSettings || {};
    const sanitized = {
      ...emailSettings,
      password: emailSettings.password ? "********" : null,
      resendApiKey: emailSettings.resendApiKey ? "********" : null,
      sendgridApiKey: emailSettings.sendgridApiKey ? "********" : null,
      oneSignalRestKey: emailSettings.oneSignalRestKey ? "********" : null,
      novuApiKey: emailSettings.novuApiKey ? "********" : null,
    };

    return NextResponse.json(apiSuccess({ emailSettings: sanitized }));
  } catch (err) {
    return NextResponse.json(
      { error: "Internal Server Error", message: err.message },
      { status: 500 },
    );
  }
}

export async function PUT(req) {
  const auth = await checkSitePermission(req, "ADMIN");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const {
      provider,
      host,
      port,
      username,
      password,
      formEmail,
      resendApiKey,
      sendgridApiKey,
      autoReplyTemplate,
      adminAlerts,
      prAlerts,
      oneSignalAppId,
      oneSignalRestKey,
      novuWorkflowId,
      novuApiKey,
    } = body;

    const settings = await prisma.globalSettings.findUnique({
      where: { siteId: auth.siteId },
      select: { emailSettings: true },
    });

    const currentEmailSettings = settings?.emailSettings || {};

    const updatedEmailSettings = {
      provider:
        provider !== undefined
          ? provider
          : currentEmailSettings.provider || "resend",
      host: host !== undefined ? host : currentEmailSettings.host,
      port: port !== undefined ? port : currentEmailSettings.port,
      username:
        username !== undefined ? username : currentEmailSettings.username,
      password:
        password !== undefined && password !== "********"
          ? password
          : currentEmailSettings.password,
      formEmail:
        formEmail !== undefined ? formEmail : currentEmailSettings.formEmail,
      resendApiKey:
        resendApiKey !== undefined && resendApiKey !== "********"
          ? resendApiKey
          : currentEmailSettings.resendApiKey,
      sendgridApiKey:
        sendgridApiKey !== undefined && sendgridApiKey !== "********"
          ? sendgridApiKey
          : currentEmailSettings.sendgridApiKey,
      oneSignalAppId:
        oneSignalAppId !== undefined
          ? oneSignalAppId
          : currentEmailSettings.oneSignalAppId,
      oneSignalRestKey:
        oneSignalRestKey !== undefined && oneSignalRestKey !== "********"
          ? oneSignalRestKey
          : currentEmailSettings.oneSignalRestKey,
      novuWorkflowId:
        novuWorkflowId !== undefined
          ? novuWorkflowId
          : currentEmailSettings.novuWorkflowId,
      novuApiKey:
        novuApiKey !== undefined && novuApiKey !== "********"
          ? novuApiKey
          : currentEmailSettings.novuApiKey,
      autoReplyTemplate:
        autoReplyTemplate !== undefined
          ? autoReplyTemplate
          : currentEmailSettings.autoReplyTemplate,
      adminAlerts:
        adminAlerts !== undefined
          ? adminAlerts
          : currentEmailSettings.adminAlerts,
      prAlerts:
        prAlerts !== undefined
          ? prAlerts
          : currentEmailSettings.prAlerts,
      failedLogs: currentEmailSettings.failedLogs || [],
    };

    const updated = await prisma.globalSettings.upsert({
      where: { siteId: auth.siteId },
      update: { emailSettings: updatedEmailSettings },
      create: { siteId: auth.siteId, emailSettings: updatedEmailSettings },
    });

    const sanitized = {
      ...updated.emailSettings,
      password: updated.emailSettings.password ? "********" : null,
      resendApiKey: updated.emailSettings.resendApiKey ? "********" : null,
      sendgridApiKey: updated.emailSettings.sendgridApiKey ? "********" : null,
      oneSignalRestKey: updated.emailSettings.oneSignalRestKey ? "********" : null,
      novuApiKey: updated.emailSettings.novuApiKey ? "********" : null,
    };

    return NextResponse.json(apiSuccess({ emailSettings: sanitized }));
  } catch (err) {
    return NextResponse.json(
      { error: "Internal Server Error", message: err.message },
      { status: 500 },
    );
  }
}
