import { NextResponse } from "next/server";
import { checkSitePermission } from "@/lib/apiAuth";
import { settingsService } from "@/services/settings.service";
import { handleApiError, apiSuccess } from "@/core/errors";
import { z } from "zod";

const Custom404Schema = z.object({
  enabled: z.boolean().default(true),
  title: z.string().min(1).default("Page Not Found"),
  description: z.string().default("Oops! The page you are looking for does not exist."),
  buttonText: z.string().default("Go Home"),
  buttonLink: z.string().default("/"),
  redirectOn404: z.boolean().default(false),
  redirectUrl: z.string().default("/"),
  redirectDelay: z.number().int().min(0).default(5)
});

export async function GET(req) {
  const auth = await checkSitePermission(req, "EDITOR");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const websiteSettings = await settingsService.getSettingsField(auth.siteId, "websiteSettings") || {};
    const custom404 = websiteSettings.custom404 || {
      enabled: true,
      title: "Page Not Found",
      description: "Oops! The page you are looking for does not exist.",
      buttonText: "Go Home",
      buttonLink: "/",
      redirectOn404: false,
      redirectUrl: "/",
      redirectDelay: 5
    };

    return NextResponse.json(apiSuccess({ custom404 }));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req) {
  const auth = await checkSitePermission(req, "EDITOR");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const parsed = Custom404Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.issues || parsed.error.errors }, { status: 400 });
    }

    const websiteSettings = await settingsService.getSettingsField(auth.siteId, "websiteSettings") || {};
    const updatedWebsiteSettings = {
      ...websiteSettings,
      custom404: parsed.data
    };

    const result = await settingsService.updateSettingsField(
      auth.siteId,
      "websiteSettings",
      updatedWebsiteSettings,
      auth.user.id
    );

    return NextResponse.json(apiSuccess({ custom404: result?.custom404 || parsed.data }));
  } catch (err) {
    return handleApiError(err);
  }
}
