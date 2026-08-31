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
    const errorLogs = await prisma.systemErrorLog.findMany({
      where: { siteId: auth.siteId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json(apiSuccess({ errorLogs }));
  } catch (err) {
    return NextResponse.json(
      { error: "Internal Server Error", message: err.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req) {
  const auth = await checkSitePermission(req, "ADMIN");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const logId = searchParams.get("id");

    if (logId) {
      await prisma.systemErrorLog.delete({
        where: { id: logId, siteId: auth.siteId },
      });
      return NextResponse.json(apiSuccess({ message: "Error log entry deleted successfully" }));
    } else {
      await prisma.systemErrorLog.deleteMany({
        where: { siteId: auth.siteId },
      });
      return NextResponse.json(apiSuccess({ message: "System error logs cleared successfully" }));
    }
  } catch (err) {
    return NextResponse.json(
      { error: "Internal Server Error", message: err.message },
      { status: 500 }
    );
  }
}
