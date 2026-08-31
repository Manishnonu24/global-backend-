import { NextResponse } from "next/server";
import { checkSitePermission } from "@/lib/apiAuth";
import { handleApiError, apiSuccess } from "@/core/errors";
import { webhookService } from "@/services/webhook.service";
import prisma from "@/lib/prisma";

/**
 * GET /api/dashboard/webhooks
 * List all webhook subscriptions for the site.
 */
export async function GET(req) {
  try {
    const auth = await checkSitePermission(req, "ADMIN");
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const subscriptions = await prisma.webhookSubscription.findMany({
      where: { siteId: auth.siteId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        url: true,
        events: true,
        isActive: true,
        failCount: true,
        lastError: true,
        createdAt: true,
        // Never return the secret
      },
    });

    return NextResponse.json(apiSuccess({ subscriptions }));
  } catch (err) {
    return handleApiError(err);
  }
}

/**
 * POST /api/dashboard/webhooks
 * Register a new webhook subscription.
 *
 * Body: { name, url, events: string[] }
 *
 * Events (content change events you can subscribe to):
 *   page.created, page.updated, page.deleted
 *   post.created, post.updated, post.deleted, post.published
 *   service.created, service.updated, service.deleted
 *   global_settings.updated, navigation.updated
 *   testimonial.created, testimonial.updated, testimonial.deleted
 *   faq.created, faq.updated, faq.deleted
 *   team_member.created, team_member.updated, team_member.deleted
 *   legal_page.updated
 */
export async function POST(req) {
  try {
    const auth = await checkSitePermission(req, "ADMIN");
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const { name, url, events } = body;

    if (!name || !url || !events?.length) {
      return NextResponse.json(
        { error: "name, url, and at least one event type are required" },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ error: "url must be a valid URL" }, { status: 400 });
    }

    const secret = webhookService.generateSecret();

    const subscription = await prisma.webhookSubscription.create({
      data: {
        siteId: auth.siteId,
        name,
        url,
        events,
        secret,
        isActive: true,
        userId: auth.user?.id || null,
      },
      select: {
        id: true,
        name: true,
        url: true,
        events: true,
        isActive: true,
        secret: true, // Return secret ONCE at creation — user must save it
        createdAt: true,
      },
    });

    return NextResponse.json(
      apiSuccess({
        subscription,
        message: "⚠️ Save the secret now — it will not be shown again.",
      }),
      { status: 201 }
    );
  } catch (err) {
    return handleApiError(err);
  }
}
