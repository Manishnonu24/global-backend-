/**
 * POST /api/admin/import/preview
 *
 * Dry-run: parse + classify + map a file without writing to the DB.
 * Returns detected format, confidence score, field map, sample rows,
 * and per-row validation errors.
 *
 * Expects multipart/form-data with:
 *   - file: the uploaded file
 *   - hint (optional): target model override e.g. "Post"
 *   - defaultContributorId (optional): for Recipe imports
 *
 * Query params:
 *   - site_id: the site to scope to
 */
import { NextResponse } from "next/server";
import { checkSitePermission } from "@/lib/apiAuth";
import { parseFile, detectFormat, assertFileSize } from "@/lib/import/parsers";
import { classifyRecords } from "@/lib/import/classify";
import { buildFieldMap, applyMapping, buildPrismaData, validateRow } from "@/lib/import/mapping";
import { dryRun } from "@/lib/import/runner";

export const maxDuration = 60;

export async function POST(req) {
  // Auth
  const auth = await checkSitePermission(req, "EDITOR");
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { siteId } = auth;

  let formData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const file = formData.get("file");
  const hint = formData.get("hint") || null;
  const defaultContributorId = formData.get("defaultContributorId") || null;
  const defaultCategory = formData.get("defaultCategory") || null;
  const fieldMapOverride = formData.get("fieldMap") ? JSON.parse(formData.get("fieldMap")) : null;

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  try {
    assertFileSize(file.size);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 413 });
  }

  const content = await file.text();
  const mimeType = file.type || "";
  const fileName = file.name || "";

  // Detect format
  const detectedFormat = detectFormat({ mimeType, fileName, content: content.slice(0, 512) });
  if (!detectedFormat) {
    return NextResponse.json({
      error: "Unsupported file format. Use .csv, .json, .xml, or .sql"
    }, { status: 422 });
  }

  // Parse preview rows (first 50)
  let rows;
  try {
    const result = await parseFile({
      content,
      mimeType,
      fileName,
      options: { preview: true, previewRows: 50 },
    });
    rows = result.rows;
  } catch (err) {
    return NextResponse.json({ error: `Parse error: ${err.message}` }, { status: 422 });
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: "File is empty or contains no parseable records" }, { status: 422 });
  }

  // Classify
  const classification = classifyRecords({
    records: rows,
    hint: hint || undefined,
    format: detectedFormat,
  });

  const targetModel = classification.targetModel;

  // If classification failed, return candidates and ask user to pick
  if (!targetModel) {
    return NextResponse.json({
      format: detectedFormat,
      targetModel: null,
      confidence: classification.confidence,
      candidates: classification.candidates,
      requiresUserInput: true,
      sampleRows: rows.slice(0, 5).map((r) => r.data),
      sourceColumns: Object.keys(rows[0]?.data || {}),
      message: "Could not determine content type with sufficient confidence. Please select manually.",
    });
  }

  // Build field map
  const sourceColumns = Object.keys(rows[0]?.data || {}).filter((k) => k !== "__tableName");
  const { mapped, unmapped, missing } = buildFieldMap(targetModel, sourceColumns);
  const fieldMap = fieldMapOverride || mapped;

  // Dry-run validation (all preview rows)
  const validation = await dryRun({
    records: rows,
    targetModel,
    siteId,
    fieldMap,
    defaultContributorId,
  });

  // Sample rows with mapping applied
  const sampleRows = rows.slice(0, 10).map((r) => {
    const mapped = applyMapping(r.data, fieldMap);
    const { createData } = buildPrismaData(targetModel, siteId, mapped);
    return createData;
  });

  return NextResponse.json({
    format: detectedFormat,
    targetModel,
    confidence: classification.confidence,
    candidates: classification.candidates,
    fieldMap,
    sourceColumns,
    unmappedColumns: unmapped,
    missingRequiredFields: missing,
    sampleRows,
    previewValidation: {
      totalRows: validation.totalRows,
      validRows: validation.validRows,
      errors: validation.errors.slice(0, 20),
    },
    requiresUserInput: false,
  });
}
