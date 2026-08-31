import { NextResponse } from "next/server";
import { checkSitePermission } from "@/lib/apiAuth";
import { settingsService } from "@/services/settings.service";
import { handleApiError, apiSuccess } from "@/core/errors";

export async function GET(req) {
  const auth = await checkSitePermission(req, "ADMIN");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const ctaConfig = await settingsService.getSettingsField(auth.siteId, "ctaConfig");
    return NextResponse.json(apiSuccess({ ctaConfig }));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req) {
  const auth = await checkSitePermission(req, "ADMIN");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const ctaConfig = body.ctaConfig;

    const result = await settingsService.updateSettingsField(
      auth.siteId,
      "ctaConfig",
      ctaConfig,
      auth.user.id
    );

    return NextResponse.json(apiSuccess({ ctaConfig: result }));
  } catch (err) {
    return handleApiError(err);
  }
}

