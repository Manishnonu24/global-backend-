import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkSitePermission } from "@/lib/apiAuth";
import { apiSuccess, handleApiError } from "@/core/errors";

export async function GET(req) {
  try {
    const auth = await checkSitePermission(req, "VIEWER");
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    // Fetch leads created from event reservations
    const reservations = await prisma.lead.findMany({
      where: {
        siteId: auth.siteId,
        OR: [
          { sourcePage: "Homepage Event Card" },
          { serviceInterest: { startsWith: "Event Reservation:" } }
        ]
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(apiSuccess({ reservations }));
  } catch (err) {
    return handleApiError(err);
  }
}
