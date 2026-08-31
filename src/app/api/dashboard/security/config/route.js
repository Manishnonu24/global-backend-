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
      select: { securityControls: true }
    });

    const controls = settings?.securityControls || {};
    // Sanitize secret keys
    const sanitized = {
      ...controls,
      recaptchaSecretKey: controls.recaptchaSecretKey ? "********" : null
    };

    return NextResponse.json(apiSuccess({ securityControls: sanitized }));
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error", message: err.message }, { status: 500 });
  }
}

export async function PUT(req) {
  const auth = await checkSitePermission(req, "ADMIN");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const { recaptchaSiteKey, recaptchaSecretKey, rateLimitRps, sessionTimeoutMinutes, ipBlocklist } = body;

    const settings = await prisma.globalSettings.findUnique({
      where: { siteId: auth.siteId },
      select: { securityControls: true }
    });

    const currentControls = settings?.securityControls || {};
    const updatedControls = {
      recaptchaSiteKey: recaptchaSiteKey !== undefined ? recaptchaSiteKey : currentControls.recaptchaSiteKey,
      // If secret key is "********", keep existing
      recaptchaSecretKey: (recaptchaSecretKey !== undefined && recaptchaSecretKey !== "********") ? recaptchaSecretKey : currentControls.recaptchaSecretKey,
      rateLimitRps: rateLimitRps !== undefined ? rateLimitRps : currentControls.rateLimitRps,
      sessionTimeoutMinutes: sessionTimeoutMinutes !== undefined ? sessionTimeoutMinutes : currentControls.sessionTimeoutMinutes,
      ipBlocklist: ipBlocklist !== undefined ? ipBlocklist : currentControls.ipBlocklist || []
    };

    const updated = await prisma.globalSettings.upsert({
      where: { siteId: auth.siteId },
      update: { securityControls: updatedControls },
      create: { siteId: auth.siteId, securityControls: updatedControls }
    });

    const sanitized = {
      ...updated.securityControls,
      recaptchaSecretKey: updated.securityControls.recaptchaSecretKey ? "********" : null
    };

    return NextResponse.json(apiSuccess({ securityControls: sanitized }));
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error", message: err.message }, { status: 500 });
  }
}
