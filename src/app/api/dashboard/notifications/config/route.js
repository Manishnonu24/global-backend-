import { NextResponse } from "next/server";
import { checkSitePermission } from "@/lib/apiAuth";
import { notificationService } from "@/services/notification.service";
import { handleApiError, apiSuccess } from "@/core/errors";
import { z } from "zod";

const ChannelConfigSchema = z.object({
  email: z.boolean().default(true),
  dashboard: z.boolean().default(true),
});

const NotificationsConfigSchema = z.object({
  newLead: ChannelConfigSchema,
  failedForm: ChannelConfigSchema,
  blogAlert: ChannelConfigSchema,
});

export async function GET(req) {
  const auth = await checkSitePermission(req, "ADMIN");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const config = await notificationService.getNotificationConfig(auth.siteId);
    return NextResponse.json(apiSuccess({ config }));
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
    const parsed = NotificationsConfigSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.issues || parsed.error.errors }, { status: 400 });
    }

    await notificationService.updateNotificationConfig(auth.siteId, parsed.data);
    return NextResponse.json(apiSuccess({ config: parsed.data }));
  } catch (err) {
    return handleApiError(err);
  }
}
