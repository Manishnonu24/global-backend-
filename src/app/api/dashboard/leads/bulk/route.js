import { NextResponse } from "next/server";
import { checkSitePermission } from "@/lib/apiAuth";
import { handleApiError, apiSuccess } from "@/core/errors";
import prisma from "@/lib/prisma";

const VALID_STATUSES = ["new", "contacted", "qualified", "won", "closed", "lost"];

export async function POST(req) {
  try {
    const auth = await checkSitePermission(req, "EDITOR");
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { ids, status } = await req.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids must be a non-empty array" }, { status: 400 });
    }

    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: `status must be one of: ${VALID_STATUSES.join(", ")}` }, { status: 400 });
    }

    const result = await prisma.lead.updateMany({
      where: {
        id: { in: ids },
        siteId: auth.siteId,
        deletedAt: null,
      },
      data: { status },
    });

    return NextResponse.json(apiSuccess({ updated: result.count }));
  } catch (err) {
    return handleApiError(err);
  }
}
