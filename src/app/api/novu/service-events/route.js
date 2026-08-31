/**
 * POST /api/novu/service-events
 *
 * Internal endpoint to trigger service-related Novu notifications.
 * Called by admin actions: lead status update, service record update, manual trigger.
 *
 * Authorization: EDITOR or higher site role (admin-facing only)
 *
 * Request body (event-specific):
 *
 * 1. Lead status change:
 *    { "event": "lead-status-changed", "leadId": "clxyz", "oldStatus": "new", "newStatus": "confirmed" }
 *
 * 2. Service updated (notify related leads):
 *    { "event": "service-updated", "serviceId": "clxyz" }
 *
 * 3. Manual service-booked (re-trigger confirmation for a lead):
 *    { "event": "service-booked", "leadId": "clxyz" }
 *
 * 4. Test trigger:
 *    { "event": "test", "workflowId": "push-notification", "payload": { ... } }
 *
 * Response:
 *    { success: true, event: "...", result: { transactionId: "..." } }
 */

import { NextResponse } from "next/server";
import { checkSitePermission } from "@/lib/apiAuth";
import prisma from "@/lib/prisma";
import { handleApiError, apiSuccess } from "@/core/errors";
import {
  triggerServiceBooked,
  triggerLeadStatusChanged,
  triggerServiceUpdated,
} from "@/lib/novu-service-events";
import { notifyUser } from "@/lib/novu-triggers";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const auth = await checkSitePermission(req, "EDITOR");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const siteId = auth.siteId;
    const body = await req.json();
    const { event } = body;

    if (!event) {
      return NextResponse.json({ error: "event field is required" }, { status: 400 });
    }

    // ── 1. Lead status changed ─────────────────────────────────────────────
    if (event === "lead-status-changed") {
      const { leadId, oldStatus, newStatus } = body;
      if (!leadId || !newStatus) {
        return NextResponse.json(
          { error: "leadId and newStatus are required" },
          { status: 400 }
        );
      }

      const lead = await prisma.lead.findFirst({ where: { id: leadId, siteId } });
      if (!lead) {
        return NextResponse.json({ error: "Lead not found" }, { status: 404 });
      }

      const result = await triggerLeadStatusChanged(
        siteId,
        lead,
        oldStatus || lead.status,
        newStatus
      );

      return NextResponse.json(
        apiSuccess({ event, leadId, newStatus, result })
      );
    }

    // ── 2. Service updated ────────────────────────────────────────────────
    if (event === "service-updated") {
      const { serviceId } = body;
      if (!serviceId) {
        return NextResponse.json({ error: "serviceId is required" }, { status: 400 });
      }

      const service = await prisma.service.findFirst({
        where: { id: serviceId, siteId, deletedAt: null },
      });
      if (!service) {
        return NextResponse.json({ error: "Service not found" }, { status: 404 });
      }

      // Find leads related to this service by serviceInterest matching the title
      const leads = await prisma.lead.findMany({
        where: {
          siteId,
          status: { notIn: ["won", "converted", "lost", "cancelled"] },
          serviceInterest: { contains: service.title.substring(0, 30) },
        },
        take: 100,
      });

      const result = await triggerServiceUpdated(siteId, service, leads);

      return NextResponse.json(
        apiSuccess({ event, serviceId, notifiedLeads: leads.length, result })
      );
    }

    // ── 3. Service booked (manual re-trigger) ─────────────────────────────
    if (event === "service-booked") {
      const { leadId } = body;
      if (!leadId) {
        return NextResponse.json({ error: "leadId is required" }, { status: 400 });
      }

      const lead = await prisma.lead.findFirst({ where: { id: leadId, siteId } });
      if (!lead) {
        return NextResponse.json({ error: "Lead not found" }, { status: 404 });
      }

      // Try to find the matching service for richer payload
      const service = lead.serviceInterest
        ? await prisma.service.findFirst({
            where: {
              siteId,
              title: { contains: lead.serviceInterest.substring(0, 30) },
              deletedAt: null,
            },
          })
        : null;

      const result = await triggerServiceBooked(siteId, lead, service);

      return NextResponse.json(apiSuccess({ event, leadId, result }));
    }

    // ── 4. Test trigger ───────────────────────────────────────────────────
    if (event === "test") {
      const { workflowId, subscriberId, payload = {} } = body;
      if (!workflowId || !subscriberId) {
        return NextResponse.json(
          { error: "workflowId and subscriberId are required for test events" },
          { status: 400 }
        );
      }

      const result = await notifyUser(subscriberId, workflowId, payload, { siteId });
      return NextResponse.json(apiSuccess({ event: "test", workflowId, subscriberId, result }));
    }

    return NextResponse.json({ error: `Unknown event: ${event}` }, { status: 400 });
  } catch (err) {
    return handleApiError(err);
  }
}
