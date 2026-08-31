import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { apiSuccess } from "@/core/errors";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const siteId = searchParams.get("siteId");

    if (!siteId) {
      return NextResponse.json({ error: "siteId is required" }, { status: 400 });
    }

    const site = await prisma.site.findUnique({
      where: { id: siteId },
      select: { isActive: true, deletedAt: true }
    });

    if (!site || site.deletedAt) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    const settings = await prisma.globalSettings.findUnique({
      where: { siteId },
      select: { 
        websiteSettings: true,
        ctaConfig: true,
        compliance: true,
        analytics: true,
        securityControls: true,
        emailSettings: true
      }
    });

    // Expose only public recaptcha key, do not leak the secret key
    const securityControls = settings?.securityControls || {};
    const publicSecurityControls = {
      recaptchaSiteKey: securityControls.recaptchaSiteKey || null
    };

    const emailSettings = settings?.emailSettings || {};
    const oneSignalAppId = emailSettings.oneSignalAppId || null;
    const novuWorkflowId = emailSettings.novuWorkflowId || null;

    const response = NextResponse.json(apiSuccess({ 
      isActive: site.isActive,
      websiteSettings: settings?.websiteSettings || null,
      ctaConfig: settings?.ctaConfig || null,
      compliance: settings?.compliance || null,
      analytics: settings?.analytics || null,
      securityControls: publicSecurityControls,
      oneSignalAppId,
      novuWorkflowId
    }));
    response.headers.set("Cache-Control", "public, max-age=10, s-maxage=60, stale-while-revalidate=30");
    return response;
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error", message: err.message }, { status: 500 });
  }
}
