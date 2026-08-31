/**
 * GET /api/admin/import/history
 *
 * Lists all ImportBatch records for the current siteId,
 * ordered by createdAt descending.
 *
 * Query params:
 *   - site_id
 *   - page (default: 1)
 *   - limit (default: 20, max: 100)
 */
import { NextResponse } from "next/server";
import { checkSitePermission } from "@/lib/apiAuth";
import prisma from "@/lib/prisma";

export async function GET(req) {
  const auth = await checkSitePermission(req, "EDITOR");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { siteId } = auth;

  const { searchParams } = new URL(req.url);
  const allParam = searchParams.get("all") === "true";
  const rawLimit = searchParams.get("limit");
  const limit = allParam ? 1000 : Math.min(1000, Math.max(1, parseInt(rawLimit || "500", 10)));
  const page = allParam ? 1 : Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const skip = (page - 1) * limit;

  const [batches, total] = await Promise.all([
    prisma.importBatch.findMany({
      where: { siteId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        sourceType: true,
        targetModel: true,
        fileName: true,
        status: true,
        totalRows: true,
        successRows: true,
        failedRows: true,
        createdBy: true,
        createdAt: true,
        completedAt: true,
        rolledBackAt: true,
        errorLog: true,
        _count: { select: { records: true } },
      },
    }),
    prisma.importBatch.count({ where: { siteId } }),
  ]);

  // Add rollback eligibility flag
  const ROLLBACK_ELIGIBLE = ["COMPLETED", "FAILED"];
  const enriched = batches.map((b) => ({
    ...b,
    canRollback: ROLLBACK_ELIGIBLE.includes(b.status) && !b.rolledBackAt,
  }));

  return NextResponse.json({
    batches: enriched,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}

export async function DELETE(req) {
  const auth = await checkSitePermission(req, "EDITOR");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { siteId } = auth;

  try {
    // Delete all records and batches for this site
    await prisma.$transaction([
      prisma.importRecord.deleteMany({
        where: { batch: { siteId } },
      }),
      prisma.importBatch.deleteMany({
        where: { siteId },
      }),
    ]);

    return NextResponse.json({ success: true, message: "Import history cleared successfully." });
  } catch (err) {
    return NextResponse.json({ error: `Failed to clear history: ${err.message}` }, { status: 500 });
  }
}
