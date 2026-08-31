/**
 * GET /api/cron/service-reminders
 *
 * Cron job that fires 24-hour reminder notifications to leads whose
 * serviceInterest/notes suggest an upcoming appointment or deadline.
 *
 * This route is designed to be called by:
 *   - Vercel Cron (add to vercel.json)
 *   - An external cron service (cron-job.org, GitHub Actions, etc.)
 *   - A BullMQ scheduled job
 *
 * Security: Requires the CRON_SECRET header to match process.env.CRON_SECRET.
 * If CRON_SECRET is not set, the route is only accessible in development.
 *
 * Vercel cron config (add to vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/service-reminders",
 *     "schedule": "0 8 * * *"
 *   }]
 * }
 *
 * The route looks for leads:
 *   - Status: "confirmed" (admin has confirmed the booking)
 *   - Created within the last 30 days (configurable)
 *   - Not yet "won" / "converted" / "cancelled"
 *
 * NOTE: Since the current app has no scheduledAt field on Lead, the cron
 * targets "confirmed" leads that were created ~24h ago and have not yet
 * been closed. Extend Lead with a scheduledAt field in Prisma to get
 * precise appointment-based reminders.
 */

import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { triggerServiceReminder } from "@/lib/novu-service-events";

import { verifyCronSecret } from "@/lib/cronAuth";

export const dynamic = "force-dynamic";

export async function GET(req) {
  // ── Security check ────────────────────────────────────────────────────────
  const authError = verifyCronSecret(req);
  if (authError) return authError;

  // ── Find leads to remind ──────────────────────────────────────────────────
  const siteId = process.env.NEXT_PUBLIC_SITE_ID || process.env.SITE_ID || "AHP";

  // Target window: leads confirmed 20-28 hours ago
  // (gives a ~24h reminder with an 8h execution window to account for cron drift)
  const windowStart = new Date(Date.now() - 28 * 60 * 60 * 1000);
  const windowEnd   = new Date(Date.now() - 20 * 60 * 60 * 1000);

  const leads = await prisma.lead.findMany({
    where: {
      siteId,
      status: "confirmed",
      updatedAt: {
        gte: windowStart,
        lte: windowEnd,
      },
      deletedAt: null,
    },
    take: 50, // Safety cap — process at most 50 per run
  });

  if (leads.length === 0) {
    return NextResponse.json({
      success: true,
      reminded: 0,
      message: "No leads in the reminder window.",
    });
  }

  // ── Fire reminders ────────────────────────────────────────────────────────
  const results = await Promise.allSettled(
    leads.map(async (lead) => {
      // Attempt to find the matching service for a richer notification
      const service = lead.serviceInterest
        ? await prisma.service.findFirst({
            where: {
              siteId,
              title: { contains: lead.serviceInterest.substring(0, 30) },
              deletedAt: null,
            },
            select: { id: true, title: true, description: true, price: true },
          })
        : null;

      return triggerServiceReminder(siteId, lead, service, 24);
    })
  );

  const reminded  = results.filter((r) => r.status === "fulfilled" && r.value).length;
  const skipped   = results.filter((r) => r.status === "fulfilled" && !r.value).length;
  const errored   = results.filter((r) => r.status === "rejected").length;

  console.log(`[Cron] service-reminders | site=${siteId} reminded=${reminded} skipped=${skipped} errored=${errored}`);

  return NextResponse.json({
    success: true,
    reminded,
    skipped,
    errored,
    total: leads.length,
    ranAt: new Date().toISOString(),
  });
}
