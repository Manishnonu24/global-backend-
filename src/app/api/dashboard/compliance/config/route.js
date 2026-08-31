import { NextResponse } from "next/server";
import { checkSitePermission } from "@/lib/apiAuth";
import { complianceService } from "@/services/compliance.service";
import { handleApiError, apiSuccess } from "@/core/errors";
import { revalidateTag } from "next/cache";
import { z } from "zod";

const ComplianceConfigSchema = z.object({
  cookieConsentEnabled: z.boolean().default(true),
  cookieConsentMessage: z.string().min(1, "Message is required"),
  essentialCookiesEnabled: z.boolean().default(true),
  analyticsCookiesEnabled: z.boolean().default(true),
  marketingCookiesEnabled: z.boolean().default(true),
  bannerPosition: z.enum(["bottom", "top", "popup"]).default("bottom"),
  acceptButtonText: z.string().min(1, "Accept button text is required"),
  declineButtonText: z.string().min(1, "Decline button text is required"),
  settingsButtonText: z.string().min(1, "Settings button text is required"),
});

export async function GET(req) {
  const auth = await checkSitePermission(req, "ADMIN");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const config = await complianceService.getConsentConfig(auth.siteId);
    
    // Return standard defaults if fields are missing
    const responseConfig = {
      cookieConsentEnabled: config.cookieConsentEnabled ?? true,
      cookieConsentMessage: config.cookieConsentMessage ?? "This website uses cookies to improve your experience.",
      essentialCookiesEnabled: config.essentialCookiesEnabled ?? true,
      analyticsCookiesEnabled: config.analyticsCookiesEnabled ?? true,
      marketingCookiesEnabled: config.marketingCookiesEnabled ?? true,
      bannerPosition: config.bannerPosition ?? "bottom",
      acceptButtonText: config.acceptButtonText ?? "Accept All",
      declineButtonText: config.declineButtonText ?? "Decline",
      settingsButtonText: config.settingsButtonText ?? "Preferences",
      consentLogs: config.consentLogs || []
    };

    return NextResponse.json(apiSuccess({ config: responseConfig }));
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
    const currentConfig = await complianceService.getConsentConfig(auth.siteId);

    const parsed = ComplianceConfigSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.issues || parsed.error.errors }, { status: 400 });
    }

    const updatedConfig = {
      ...parsed.data,
      consentLogs: currentConfig.consentLogs || []
    };

    await complianceService.updateConsentConfig(auth.siteId, updatedConfig);
    revalidateTag("layout");
    return NextResponse.json(apiSuccess({ config: updatedConfig }));
  } catch (err) {
    return handleApiError(err);
  }
}
