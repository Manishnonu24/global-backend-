/**
 * GET  /api/novu/preferences          — get current user's notification preferences
 * PUT  /api/novu/preferences          — update a specific channel preference
 *
 * Authorization: Any authenticated user (reads/writes their own preferences)
 *
 * GET Response:
 *   { preferences: [{ workflow: { id, name }, channels: [{ type, enabled }] }] }
 *
 * PUT Request body:
 *   { "workflowId": "service-booked", "channel": "email", "enabled": false }
 *
 * PUT Response:
 *   { success: true }
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import {
  getNovuPreferences,
  updateNovuPreferences,
  syncNovuSubscriber,
} from "@/lib/novu-subscriber-sync";
import { handleApiError, apiSuccess } from "@/core/errors";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const siteId = process.env.NEXT_PUBLIC_SITE_ID || "AHP";
    const preferences = await getNovuPreferences(siteId, session.user.id);

    return NextResponse.json(apiSuccess({ preferences: preferences || [] }));
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { workflowId, channel, enabled } = body;

    if (!workflowId || !channel || typeof enabled !== "boolean") {
      return NextResponse.json(
        { error: "workflowId, channel, and enabled (boolean) are required" },
        { status: 400 }
      );
    }

    const validChannels = ["email", "push", "in_app", "sms", "chat"];
    if (!validChannels.includes(channel)) {
      return NextResponse.json(
        { error: `Invalid channel. Must be one of: ${validChannels.join(", ")}` },
        { status: 400 }
      );
    }

    const siteId = process.env.NEXT_PUBLIC_SITE_ID || "AHP";

    // Ensure subscriber exists in Novu before updating preferences
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, name: true, globalRole: true },
    });
    if (user) {
      await syncNovuSubscriber(siteId, user);
    }

    const result = await updateNovuPreferences(siteId, session.user.id, workflowId, {
      [channel]: enabled,
    });

    return NextResponse.json(apiSuccess({ success: true, result }));
  } catch (err) {
    return handleApiError(err);
  }
}
