import { NextResponse } from "next/server";
import { getAuthUserOrDevBypass } from "@/lib/apiAuth";
import { userHasSiteRole } from "@/lib/siteAuth";
import { settingsService } from "@/services/settings.service";
import { handleApiError, apiSuccess } from "@/core/errors";
import { z } from "zod";

const SettingsSchema = z.object({
  siteId: z.string().min(1),
  header: z.any().optional(),
  footer: z.any().optional(),
  analytics: z.any().optional(),
  scripts: z.any().optional(),
  ctaConfig: z.any().optional(),
  contactDetails: z.any().optional(),
});

export async function POST(request) {
  try {
    const user = await getAuthUserOrDevBypass();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = SettingsSchema.parse(body);

    const hasAccess = await userHasSiteRole(user, data.siteId, "ADMIN");
    if (!hasAccess) {
      return NextResponse.json({ error: "Forbidden: Insufficient permissions" }, { status: 403 });
    }

    const result = await settingsService.updateGlobalSettings(
      data.siteId,
      data,
      user.id
    );

    return NextResponse.json({ ok: true, settings: result }, { status: 200 });
  } catch (err) {
    return handleApiError(err);
  }
}

