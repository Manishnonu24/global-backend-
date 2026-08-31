/**
 * POST /api/admin/import/[batchId]/rollback
 *
 * Rolls back an entire import batch:
 *   - CREATED records are soft/hard deleted
 *   - UPDATED records are restored to their previousData snapshot
 *   - The entire rollback is wrapped in a single prisma.$transaction
 *
 * Requires ADMIN role (rollback is a destructive operation).
 *
 * Query params:
 *   - site_id
 */
import { NextResponse } from "next/server";
import { checkSitePermission, getAuthUserOrDevBypass } from "@/lib/apiAuth";
import { rollbackBatch } from "@/lib/import/runner";
import prisma from "@/lib/prisma";

export async function POST(req, { params }) {
  const { batchId } = await params;

  // Rollback requires ADMIN role
  const auth = await checkSitePermission(req, "ADMIN");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { siteId } = auth;

  const user = await getAuthUserOrDevBypass();
  const userId = user?.id || null;

  // Verify the batch exists and belongs to this site
  const batch = await prisma.importBatch.findUnique({
    where: { id: batchId },
    select: { id: true, siteId: true, status: true, rolledBackAt: true, targetModel: true },
  });

  if (!batch) {
    return NextResponse.json({ error: "Import batch not found" }, { status: 404 });
  }
  if (batch.siteId !== siteId) {
    return NextResponse.json({ error: "Forbidden: Batch does not belong to this site" }, { status: 403 });
  }
  if (batch.status === "ROLLED_BACK" || batch.rolledBackAt) {
    return NextResponse.json({ error: "This batch has already been rolled back" }, { status: 409 });
  }
  if (batch.status === "RUNNING") {
    return NextResponse.json({ error: "Cannot roll back a batch that is currently running" }, { status: 409 });
  }

  try {
    const result = await rollbackBatch(batchId, siteId, userId);
    return NextResponse.json({
      success: true,
      batchId,
      rolledBack: result.rolledBack,
      message: `Successfully rolled back ${result.rolledBack} records.`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Rollback failed: ${err.message}` },
      { status: 500 }
    );
  }
}
