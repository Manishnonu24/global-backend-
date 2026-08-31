import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { checkSitePermission } from "@/lib/apiAuth";
import { apiSuccess } from "@/core/errors";

export async function GET(req) {
  const auth = await checkSitePermission(req, "ADMIN");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const logs = await prisma.auditLog.findMany({
      where: { siteId: auth.siteId },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { email: true, globalRole: true }
        }
      }
    });

    return NextResponse.json(apiSuccess({ auditLogs: logs }));
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error", message: err.message }, { status: 500 });
  }
}
