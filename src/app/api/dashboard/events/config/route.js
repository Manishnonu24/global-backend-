import { NextResponse } from "next/server";
import { checkSitePermission } from "@/lib/apiAuth";
import { settingsService } from "@/services/settings.service";
import { apiSuccess, handleApiError } from "@/core/errors";

export async function GET(req) {
  try {
    const auth = await checkSitePermission(req, "EDITOR");
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const websiteSettings = await settingsService.getSettingsField(auth.siteId, "websiteSettings");
    const config = websiteSettings?.communityConfig || null;
    return NextResponse.json(apiSuccess({ communityConfig: config }));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req) {
  try {
    const auth = await checkSitePermission(req, "EDITOR");
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await req.json();
    const existingSettings = (await settingsService.getSettingsField(auth.siteId, "websiteSettings")) || {};

    const updatedWebsiteSettings = {
      ...existingSettings,
      communityConfig: body,
    };

    await settingsService.updateSettingsField(auth.siteId, "websiteSettings", updatedWebsiteSettings, auth.user?.id);

    return NextResponse.json(apiSuccess({ message: "Community section config updated successfully" }));
  } catch (err) {
    return handleApiError(err);
  }
}
