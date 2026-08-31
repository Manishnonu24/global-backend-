import { NextResponse } from "next/server";
import { checkSitePermission } from "@/lib/apiAuth";
import prisma from "@/lib/prisma";

function formatTriggerLabel(triggerKey, category) {
  if (!triggerKey) {
    if (category === "campaign") return "Campaign Dispatch";
    if (category === "system") return "System Alert";
    return "Transactional Email";
  }

  const map = {
    password_reset: "Password Reset",
    password_changed: "Password Changed",
    user_verification: "OTP Verification",
    otp_verification: "OTP Verification",
    newsletter_welcome: "Newsletter Welcome",
    lead_auto_reply: "Lead Auto-Reply",
    admin_lead_notification: "Admin Lead Notification",
    system_alert: "System Notification",
    test_email: "Test Email",
  };

  if (map[triggerKey]) return map[triggerKey];

  return triggerKey
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function GET(req) {
  let siteId = req.headers.get("x-site-id") || process.env.NEXT_PUBLIC_SITE_ID || "AHP";

  const auth = await checkSitePermission(req, "EDITOR");
  if (!auth.error && auth.siteId) {
    siteId = auth.siteId;
  }

  try {
    const { searchParams } = new URL(req.url);

    const q = searchParams.get("q")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "";
    const category = searchParams.get("category")?.trim() || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get("perPage") || "25", 10)));
    const skip = (page - 1) * perPage;

    const baseWhere = {};

    if (siteId) {
      baseWhere.siteId = siteId;
    }

    if (status && status !== "all") {
      baseWhere.status = status;
    }

    if (category && category !== "all") {
      baseWhere.category = category;
    }

    if (q) {
      const searchConditions = [
        { toEmail: { contains: q } },
        { toName: { contains: q } },
        { subject: { contains: q } },
        { triggerKey: { contains: q } },
        { campaign: { name: { contains: q } } },
      ];

      baseWhere.AND = [
        ...(baseWhere.AND || []),
        { OR: searchConditions }
      ];
    }

    const siteFilter = siteId ? { siteId } : {};

    const [totalCount, logs, statsCounts] = await Promise.all([
      prisma.emailLog.count({ where: baseWhere }),
      prisma.emailLog.findMany({
        where: baseWhere,
        include: {
          campaign: {
            select: { id: true, name: true, subject: true, body: true, status: true, sentAt: true },
          },
        },
        orderBy: [
          { createdAt: "desc" },
          { id: "desc" },
        ],
        skip,
        take: perPage,
      }),
      Promise.all([
        prisma.emailLog.count({ where: siteFilter }),
        prisma.emailLog.count({ where: { ...siteFilter, status: { in: ["sent", "opened", "clicked"] } } }),
        prisma.emailLog.count({ where: { ...siteFilter, status: "failed" } }),
        prisma.emailLog.count({ where: { ...siteFilter, category: "transactional" } }),
        prisma.emailLog.count({ where: { ...siteFilter, category: "campaign" } }),
        prisma.emailLog.count({ where: { ...siteFilter, category: "system" } }),
      ]),
    ]);

    const [totalSentAll, deliveredAll, failedAll, transactionalCount, campaignCount, systemCount] = statsCounts;

    const formattedLogs = logs.map((log) => ({
      id: log.id,
      category: log.category || "transactional",
      triggerKey: log.triggerKey || null,
      campaignId: log.campaignId || null,
      campaignName: log.campaign?.name || formatTriggerLabel(log.triggerKey, log.category),
      subject: log.subject || log.campaign?.subject || "(No Subject)",
      recipientEmail: log.toEmail,
      recipientName: log.toName || null,
      fromEmail: log.fromEmail || null,
      provider: log.provider || null,
      status: log.status,
      errorMessage: log.errorMessage,
      sentAt: log.sentAt || log.createdAt,
      createdAt: log.createdAt,
      bodyPreview: log.bodyPreview || (log.campaign?.body ? log.campaign.body.replace(/<[^>]*>?/gm, '').slice(0, 180) : ""),
      fullBodyHtml: log.campaign?.body || log.bodyPreview || "",
      meta: log.meta || {},
    }));

    return NextResponse.json({
      success: true,
      data: {
        logs: formattedLogs,
        pagination: {
          page,
          perPage,
          totalCount,
          totalPages: Math.ceil(totalCount / perPage) || 1,
        },
        stats: {
          totalSent: totalSentAll,
          delivered: deliveredAll,
          failed: failedAll,
          transactional: transactionalCount,
          campaign: campaignCount,
          system: systemCount,
          deliveryRate: totalSentAll > 0 ? Math.round((deliveredAll / totalSentAll) * 100) : 100,
        },
      },
    });
  } catch (error) {
    console.error("[EmailLogsAPI] Error fetching email logs:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch email logs" },
      { status: 500 }
    );
  }
}
