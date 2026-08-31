import { NextResponse } from "next/server";
import { checkSitePermission } from "@/lib/apiAuth";
import prisma from "@/lib/prisma";
import { handleApiError, apiSuccess, ValidationError } from "@/core/errors";

export async function GET(req) {
  const auth = await checkSitePermission(req, "EDITOR");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const siteId = auth.siteId;
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "overview"; // overview, traffic, crm
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    let start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    let end = new Date();

    if (startDateParam) start = new Date(startDateParam);
    if (endDateParam) end = new Date(endDateParam);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new ValidationError("Invalid start or end date");
    }

    const where = {
      siteId,
      createdAt: {
        gte: start,
        lte: end,
      },
    };

    if (type === "traffic") {
      const logs = await prisma.visitorLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json(apiSuccess({ reportType: "traffic", start, end, data: logs }));
    }

    if (type === "crm") {
      const leads = await prisma.lead.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });
      const subscribers = await prisma.subscriber.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });
      const submissions = await prisma.contactFormSubmission.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json(
        apiSuccess({
          reportType: "crm",
          start,
          end,
          data: {
            leads,
            subscribers,
            submissions,
          },
        })
      );
    }

    // Default overview report
    const [pageViewsCount, uniqueCount, leadCount, subCount] = await Promise.all([
      prisma.visitorLog.count({ where }),
      prisma.visitorLog.groupBy({
        by: ["visitorId"],
        where,
      }).then((res) => res.length),
      prisma.lead.count({ where }),
      prisma.subscriber.count({ where }),
    ]);

    return NextResponse.json(
      apiSuccess({
        reportType: "overview",
        start,
        end,
        data: {
          totalPageViews: pageViewsCount,
          uniqueVisitors: uniqueCount,
          crmLeads: leadCount,
          crmSubscribers: subCount,
        },
      })
    );
  } catch (err) {
    return handleApiError(err);
  }
}
