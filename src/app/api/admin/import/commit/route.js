/**
 * POST /api/admin/import/commit
 *
 * Executes the atomic import for a file.
 * Creates an ImportBatch record, runs the import, and returns the batch summary.
 *
 * Expects multipart/form-data with:
 *   - file: the uploaded file
 *   - targetModel: confirmed model (from preview or user override)
 *   - fieldMap: JSON string of { sourceCol: prismaField } mapping
 *   - defaultContributorId (optional): for Recipe imports
 *
 * Query params:
 *   - site_id
 */
import { NextResponse } from "next/server";
import { checkSitePermission, getAuthUserOrDevBypass } from "@/lib/apiAuth";
import { parseFile, detectFormat, assertFileSize } from "@/lib/import/parsers";
import { IMPORT_MAX_ROWS } from "@/lib/import/parsers/types";
import { runImport } from "@/lib/import/runner";
import prisma from "@/lib/prisma";

export const maxDuration = 300; // 5 minutes for large files

export async function POST(req) {
  const auth = await checkSitePermission(req, "EDITOR");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { siteId } = auth;

  const user = await getAuthUserOrDevBypass();
  const userId = user?.id || null;

  let formData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const file = formData.get("file");
  const targetModel = formData.get("targetModel");
  const fieldMapRaw = formData.get("fieldMap");
  const defaultContributorId = formData.get("defaultContributorId") || null;
  const defaultCategory = formData.get("defaultCategory") || null;

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!targetModel) {
    return NextResponse.json({ error: "targetModel is required" }, { status: 400 });
  }
  if (!fieldMapRaw) {
    return NextResponse.json({ error: "fieldMap is required" }, { status: 400 });
  }

  let fieldMap;
  try {
    fieldMap = JSON.parse(fieldMapRaw);
  } catch {
    return NextResponse.json({ error: "fieldMap must be valid JSON" }, { status: 400 });
  }

  try {
    assertFileSize(file.size);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 413 });
  }

  const content = await file.text();
  const mimeType = file.type || "";
  const fileName = file.name || "";

  const detectedFormat = detectFormat({ mimeType, fileName, content: content.slice(0, 512) });
  if (!detectedFormat) {
    return NextResponse.json({ error: "Unsupported file format" }, { status: 422 });
  }

  // Parse all rows
  let rows;
  try {
    const result = await parseFile({
      content,
      mimeType,
      fileName,
      options: { maxRows: IMPORT_MAX_ROWS },
    });
    rows = result.rows;
  } catch (err) {
    return NextResponse.json({ error: `Parse error: ${err.message}` }, { status: 422 });
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: "File contains no parseable records" }, { status: 422 });
  }

  // Create ImportBatch record
  const batch = await prisma.importBatch.create({
    data: {
      siteId,
      sourceType: detectedFormat,
      targetModel,
      fileName,
      status: "PENDING",
      totalRows: rows.length,
      createdBy: userId,
    },
  });

  // Run the import
  try {
    const result = await runImport({
      batchId: batch.id,
      siteId,
      records: rows,
      targetModel,
      fieldMap,
      userId,
      defaultContributorId,
      defaultCategory,
    });

    // Return the final batch state
    const finalBatch = await prisma.importBatch.findUnique({
      where: { id: batch.id },
    });

    // Trigger Next.js route revalidation across homepage, blogs listing, and sitemap
    try {
      const { revalidatePath } = await import("next/cache");
      revalidatePath("/", "layout");
      revalidatePath("/blogs");
      revalidatePath("/sitemap.xml");
    } catch {}

    return NextResponse.json({
      batchId: batch.id,
      status: result.status,
      totalRows: rows.length,
      successRows: result.successRows,
      failedRows: result.failedRows,
      errorLog: result.errorLog,
      batch: finalBatch,
    });
  } catch (err) {
    // Unexpected error — mark batch as failed
    await prisma.importBatch.update({
      where: { id: batch.id },
      data: {
        status: "FAILED",
        errorLog: [{ error: err.message }],
        completedAt: new Date(),
      },
    }).catch(() => {});

    return NextResponse.json({
      error: `Import failed: ${err.message}`,
      batchId: batch.id,
    }, { status: 500 });
  }
}
