/**
 * Atomic import runner + rollback engine.
 *
 * Import execution:
 *  - Processes records in configurable chunks (IMPORT_CHUNK_SIZE)
 *  - Each chunk is wrapped in a prisma.$transaction
 *  - Before updating an existing record, snapshots previousData
 *  - On chunk failure: compensating rollback deletes all previously
 *    created records and restores all updated records in this batch
 *  - On full success: marks ImportBatch.status = COMPLETED
 *
 * Rollback execution:
 *  - Reads all ImportRecord for a batchId (most recent first)
 *  - CREATED → hard delete (or soft delete where model has deletedAt)
 *  - UPDATED → restores previousData back onto the record
 *  - Wrapped in a single prisma.$transaction (rollback is also atomic)
 */
import prisma from "@/lib/prisma";
import { logAction } from "@/lib/audit";
import { IMPORT_CHUNK_SIZE } from "./parsers/types.js";
import {
  applyMapping,
  autoCreateRelations,
  buildPrismaData,
  validateRow,
} from "./mapping.js";

// Models that support soft delete (have a deletedAt field)
const SOFT_DELETE_MODELS = [
  "Post", "Service", "Testimonial", "Faq", "TeamMember",
  "Page", "LegalPage", "Category", "Tag",
];

// ---------------------------------------------------------------------------
// Prisma model accessor (dynamic, keyed by model name)
// ---------------------------------------------------------------------------

/**
 * Get the Prisma delegate for a given model name.
 * @param {string} modelName
 * @param {Object} [tx] - optional transaction client
 * @returns {any}
 */
function getDelegate(modelName, tx) {
  const client = tx || prisma;
  const key = modelName.charAt(0).toLowerCase() + modelName.slice(1);
  const delegate = client[key];
  if (!delegate) throw new Error(`Unknown model: ${modelName}`);
  return delegate;
}

const INT_ID_MODELS = [
  "Magazine", "Category", "Tag", "Recipe", "Service",
  "Testimonial", "Faq", "TeamMember",
];

/**
 * Coerce recordId to the correct type for Prisma queries (Int vs String cuid).
 */
function parseModelId(modelName, id) {
  if (id === null || id === undefined) return id;
  if (INT_ID_MODELS.includes(modelName)) {
    const num = Number(id);
    return isNaN(num) ? id : num;
  }
  return String(id);
}

/**
 * Snapshot an existing record's current state for rollback.
 * @param {string} modelName
 * @param {string} recordId
 * @param {Object} [tx]
 * @returns {Promise<Record<string,any>|null>}
 */
async function snapshotRecord(modelName, recordId, tx) {
  try {
    const delegate = getDelegate(modelName, tx);
    const targetId = parseModelId(modelName, recordId);
    const record = await delegate.findUnique({ where: { id: targetId } });
    return record || null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Upsert logic per model (create or update if slug/unique key exists)
// ---------------------------------------------------------------------------

/**
 * Create or update a record for the given model.
 * Returns { id, action: "CREATED"|"UPDATED", previousData }
 *
 * @param {string} targetModel
 * @param {string} siteId
 * @param {Record<string,any>} createData
 * @param {Object} tx - prisma transaction client
 */
async function upsertRecord(targetModel, siteId, createData, tx) {
  const delegate = getDelegate(targetModel, tx);

  // Determine the unique key to check for existing records (ignore deletedAt to find soft-deleted matches)
  let existing = null;

  try {
    if (["Post", "Service", "Page", "Magazine"].includes(targetModel)) {
      const slugVal = createData.slug ? String(createData.slug).trim() : null;
      const titleVal = createData.title ? String(createData.title).trim() : null;

      if (targetModel === "Magazine") {
        existing = await delegate.findFirst({
          where: {
            OR: [
              slugVal ? { slug: slugVal } : null,
              titleVal ? { title: titleVal } : null,
            ].filter(Boolean),
          },
        });
      } else {
        existing = await delegate.findFirst({
          where: {
            siteId,
            OR: [
              slugVal ? { slug: slugVal } : null,
              titleVal ? { title: titleVal } : null,
            ].filter(Boolean),
          },
        });
      }
    } else if (createData.question && targetModel === "Faq") {
      existing = await delegate.findFirst({
        where: { siteId, question: createData.question },
      });
    } else if (createData.clientName && targetModel === "Testimonial") {
      existing = await delegate.findFirst({
        where: { siteId, clientName: createData.clientName },
      });
    } else if (createData.name && targetModel === "TeamMember") {
      existing = await delegate.findFirst({
        where: { siteId, name: createData.name },
      });
    } else if (createData.type && targetModel === "LegalPage") {
      existing = await delegate.findFirst({
        where: { siteId, type: createData.type },
      });
    } else if (createData.name && ["Category", "Tag"].includes(targetModel)) {
      existing = await delegate.findFirst({
        where: { siteId, name: createData.name },
      });
    }
  } catch {
    existing = null;
  }

  if (existing) {
    // UPDATE path — snapshot first
    const previousData = { ...existing };
    // Strip relation connect syntax from updateData
    const updatePayload = Object.fromEntries(
      Object.entries(createData).filter(([k]) => {
        const v = createData[k];
        // Keep only scalar fields and Prisma relation objects for update
        return (
          v === null ||
          typeof v !== "object" ||
          Array.isArray(v) ||
          (v && (v.connect !== undefined || v.set !== undefined || v.disconnect !== undefined))
        );
      })
    );

    // Preserve existing record's slug to prevent updating to a colliding slug
    if (existing.slug) {
      delete updatePayload.slug;
    }

    // Un-delete if record was previously soft-deleted
    if (existing.deletedAt !== undefined && existing.deletedAt !== null) {
      updatePayload.deletedAt = null;
    }

    try {
      await delegate.update({
        where: { id: existing.id },
        data: updatePayload,
      });
    } catch (updateError) {
      if (updateError?.code === "P2002" || String(updateError?.message).includes("Unique constraint")) {
        delete updatePayload.slug;
        await delegate.update({
          where: { id: existing.id },
          data: updatePayload,
        });
      } else {
        throw updateError;
      }
    }
    return { id: String(existing.id), action: "UPDATED", previousData };
  } else {
    // CREATE path — ensure slug is unique if present
    if (createData.slug && ["Post", "Service", "Page", "Magazine", "Category", "Tag"].includes(targetModel)) {
      let slugCandidate = createData.slug;
      let suffix = 1;
      while (true) {
        let collision = null;
        try {
          collision = targetModel === "Magazine"
            ? await delegate.findUnique({ where: { slug: slugCandidate } })
            : await delegate.findFirst({ where: { siteId, slug: slugCandidate } });
        } catch {
          collision = null;
        }
        if (!collision) break;
        suffix++;
        slugCandidate = `${createData.slug}-${suffix}`;
      }
      createData.slug = slugCandidate;
    }

    try {
      const created = await delegate.create({ data: createData });
      return { id: String(created.id), action: "CREATED", previousData: null };
    } catch (createError) {
      // If unique constraint failed on siteId_slug, find the colliding record or append unique timestamp
      if (createError?.code === "P2002" || String(createError?.message).includes("Unique constraint")) {
        let colliding = null;
        try {
          colliding = targetModel === "Magazine"
            ? await delegate.findFirst({ where: { slug: createData.slug } })
            : await delegate.findFirst({ where: { siteId, slug: createData.slug } });
        } catch {}

        if (colliding) {
          const previousData = { ...colliding };
          const updatePayload = Object.fromEntries(
            Object.entries(createData).filter(([k]) => {
              const v = createData[k];
              return (
                v === null ||
                typeof v !== "object" ||
                Array.isArray(v) ||
                (v && (v.connect !== undefined || v.set !== undefined || v.disconnect !== undefined))
              );
            })
          );
          if (colliding.deletedAt !== undefined) updatePayload.deletedAt = null;

          await delegate.update({
            where: { id: colliding.id },
            data: updatePayload,
          });
          return { id: String(colliding.id), action: "UPDATED", previousData };
        }

        // Retry with unique timestamp suffix
        createData.slug = `${createData.slug}-${Date.now().toString(36)}`;
        const created = await delegate.create({ data: createData });
        return { id: String(created.id), action: "CREATED", previousData: null };
      }
      throw createError;
    }
  }
}

// ---------------------------------------------------------------------------
// DRY RUN
// ---------------------------------------------------------------------------

/**
 * Dry-run: validates all rows without writing to the database.
 *
 * @param {Object} params
 * @param {import('./parsers/types.js').RawRecord[]} params.records
 * @param {string} params.targetModel
 * @param {string} params.siteId
 * @param {Record<string,string>} params.fieldMap
 * @param {string} [params.defaultContributorId] - for Recipe imports
 * @param {string} [params.defaultCategory]
 * @returns {Promise<{
 *   totalRows: number,
 *   validRows: number,
 *   errors: Array<{rowIndex: number, errors: string[]}>
 * }>}
 */
export async function dryRun({ records, targetModel, siteId, fieldMap, defaultContributorId, defaultCategory }) {
  const errors = [];
  let validRows = 0;

  for (const record of records) {
    const mapped = applyMapping(record.data, fieldMap);
    if (targetModel === "Recipe" && defaultContributorId) {
      mapped.contributorId = defaultContributorId;
    }
    const withRelations = await autoCreateRelations(siteId, targetModel, mapped, null, defaultCategory, true);
    const { createData } = buildPrismaData(targetModel, siteId, withRelations);
    const rowErrors = validateRow(targetModel, createData);
    if (rowErrors.length === 0) {
      validRows++;
    } else {
      errors.push({ rowIndex: record.rawIndex, errors: rowErrors });
    }
  }

  return { totalRows: records.length, validRows, errors };
}

// ---------------------------------------------------------------------------
// LIVE IMPORT
// ---------------------------------------------------------------------------

/**
 * Run an atomic import for a batch.
 * Creates ImportRecord entries for each row processed.
 * Uses chunked transactions with compensating rollback on failure.
 *
 * @param {Object} params
 * @param {string} params.batchId
 * @param {string} params.siteId
 * @param {import('./parsers/types.js').RawRecord[]} params.records
 * @param {string} params.targetModel
 * @param {Record<string,string>} params.fieldMap
 * @param {string} [params.userId]
 * @param {string} [params.defaultContributorId]
 * @param {string} [params.defaultCategory]
 * @returns {Promise<{
 *   status: string,
 *   successRows: number,
 *   failedRows: number,
 *   errorLog: Array<{rowIndex: number, errors: string[]}>
 * }>}
 */
export async function runImport({
  batchId,
  siteId,
  records,
  targetModel,
  fieldMap,
  userId,
  defaultContributorId,
  defaultCategory,
}) {
  const allErrors = [];
  let successRows = 0;
  let failedRows = 0;
  // Track all ImportRecord IDs created so far (for compensating rollback)
  const importRecordIds = [];
  // Update batch status to RUNNING
  await prisma.importBatch.update({
    where: { id: batchId },
    data: { status: "RUNNING" },
  });

  // Process heavy media models (Magazine, Post) in small chunks of 5 to allow 16MB+ PDF downloads without transaction timeouts
  const chunkSize = targetModel === "Magazine" ? 5 : targetModel === "Post" ? 10 : Math.min(IMPORT_CHUNK_SIZE, 25);
  const chunks = [];
  for (let i = 0; i < records.length; i += chunkSize) {
    chunks.push(records.slice(i, i + chunkSize));
  }

  for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
    const chunk = chunks[chunkIdx];

    try {
      // Process the chunk in a transaction
      const chunkResults = await prisma.$transaction(
        async (tx) => {
          const results = [];
          for (const record of chunk) {
            // Map fields
            const mapped = applyMapping(record.data, fieldMap);
            if (targetModel === "Recipe" && defaultContributorId) {
              mapped.contributorId = defaultContributorId;
            }

            // Auto-create relations (tags, categories) — needs the tx client
            const withRelations = await autoCreateRelations(siteId, targetModel, mapped, tx, defaultCategory);
            const { createData } = buildPrismaData(targetModel, siteId, withRelations);

            // Validate
            const rowErrors = validateRow(targetModel, createData);
            if (rowErrors.length > 0) {
              results.push({
                success: false,
                rowIndex: record.rawIndex,
                errors: rowErrors,
              });
              continue;
            }

            // Upsert
            const { id, action, previousData } = await upsertRecord(
              targetModel,
              siteId,
              createData,
              tx
            );

            // Record the import record (within tx)
            const importRecord = await tx.importRecord.create({
              data: {
                batchId,
                targetModel,
                recordId: String(id),
                action,
                previousData: previousData ? JSON.parse(JSON.stringify(previousData)) : null,
              },
            });

            results.push({
              success: true,
              rowIndex: record.rawIndex,
              importRecordId: importRecord.id,
              recordId: id,
              action,
            });
          }
          return results;
        },
        { timeout: 300000 } // 300s per chunk for media downloads
      );

      // Tally results
      for (const r of chunkResults) {
        if (r.success) {
          successRows++;
          importRecordIds.push(r.importRecordId);
        } else {
          failedRows++;
          allErrors.push({ rowIndex: r.rowIndex, errors: r.errors });
        }
      }
    } catch (chunkError) {
      // Chunk-level failure — compensating rollback
      console.error(`Import chunk ${chunkIdx} failed:`, chunkError);

      // Update batch status and bail
      const errorLog = [
        ...allErrors,
        { rowIndex: -1, errors: [`Chunk ${chunkIdx} transaction failed: ${chunkError.message}`] },
      ];

      await runCompensatingRollback(importRecordIds, targetModel);

      await prisma.importBatch.update({
        where: { id: batchId },
        data: {
          status: "FAILED",
          failedRows: records.length,
          successRows: 0,
          errorLog,
          completedAt: new Date(),
        },
      });

      if (userId) {
        await logAction(siteId, userId, "IMPORT_FAILED", {
          batchId,
          targetModel,
          error: chunkError.message,
        }).catch(() => {});
      }

      return { status: "FAILED", successRows: 0, failedRows: records.length, errorLog };
    }
  }

  // All chunks succeeded — mark complete
  await prisma.importBatch.update({
    where: { id: batchId },
    data: {
      status: "COMPLETED",
      successRows,
      failedRows,
      errorLog: allErrors.length > 0 ? allErrors : null,
      completedAt: new Date(),
    },
  });

  if (userId) {
    await logAction(siteId, userId, "IMPORT_COMPLETED", {
      batchId,
      targetModel,
      successRows,
      failedRows,
    }).catch(() => {});
  }

  return { status: "COMPLETED", successRows, failedRows, errorLog: allErrors };
}

// ---------------------------------------------------------------------------
// Compensating rollback (called on chunk failure mid-import)
// ---------------------------------------------------------------------------

/**
 * Delete all ImportRecords and their associated content records
 * that were created in a failed import.
 *
 * @param {string[]} importRecordIds
 * @param {string} targetModel
 */
async function runCompensatingRollback(importRecordIds, targetModel) {
  if (importRecordIds.length === 0) return;

  try {
    const importRecords = await prisma.importRecord.findMany({
      where: { id: { in: importRecordIds } },
      orderBy: { createdAt: "desc" },
    });

    await prisma.$transaction(async (tx) => {
      for (const ir of importRecords) {
        if (ir.action === "CREATED") {
          await softOrHardDelete(ir.targetModel, ir.recordId, tx);
        } else if (ir.action === "UPDATED" && ir.previousData) {
          await restoreRecord(ir.targetModel, ir.recordId, ir.previousData, tx);
        }
      }
      // Remove the import records themselves
      await tx.importRecord.deleteMany({ where: { id: { in: importRecordIds } } });
    });
  } catch (rollbackErr) {
    console.error("Compensating rollback failed:", rollbackErr);
    // Log but don't throw — the original error is more important
  }
}

// ---------------------------------------------------------------------------
// ROLLBACK an entire batch
// ---------------------------------------------------------------------------

/**
 * Rollback an entire import batch.
 * CREATED records are deleted; UPDATED records are restored.
 * The whole rollback is wrapped in a single transaction.
 *
 * @param {string} batchId
 * @param {string} siteId
 * @param {string} [userId]
 * @returns {Promise<{ rolledBack: number }>}
 */
export async function rollbackBatch(batchId, siteId, userId) {
  const batch = await prisma.importBatch.findUnique({
    where: { id: batchId },
    include: {
      records: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!batch) throw new Error("Import batch not found.");
  if (batch.siteId !== siteId) throw new Error("Batch does not belong to this site.");
  if (batch.status === "ROLLED_BACK") throw new Error("Batch has already been rolled back.");
  if (batch.status === "RUNNING") throw new Error("Cannot roll back a batch that is still running.");

  const records = batch.records;
  let rolledBack = 0;

  await prisma.$transaction(
    async (tx) => {
      for (const ir of records) {
        if (ir.action === "CREATED") {
          await softOrHardDelete(ir.targetModel, ir.recordId, tx);
        } else if (ir.action === "UPDATED" && ir.previousData) {
          await restoreRecord(ir.targetModel, ir.recordId, ir.previousData, tx);
        }
        rolledBack++;
      }

      await tx.importBatch.update({
        where: { id: batchId },
        data: {
          status: "ROLLED_BACK",
          rolledBackAt: new Date(),
        },
      });
    },
    { timeout: 60000 }
  );

  if (userId) {
    await logAction(siteId, userId, "IMPORT_ROLLED_BACK", {
      batchId,
      targetModel: batch.targetModel,
      rolledBack,
    }).catch(() => {});
  }

  return { rolledBack };
}

// ---------------------------------------------------------------------------
// Helpers: soft/hard delete and restore
// ---------------------------------------------------------------------------

/**
 * Delete a record — soft delete if the model supports it, hard delete otherwise.
 * @param {string} modelName
 * @param {string} recordId
 * @param {Object} tx
 */
async function softOrHardDelete(modelName, recordId, tx) {
  const delegate = getDelegate(modelName, tx);
  const targetId = parseModelId(modelName, recordId);
  try {
    if (SOFT_DELETE_MODELS.includes(modelName)) {
      await delegate.update({
        where: { id: targetId },
        data: { deletedAt: new Date() },
      });
    } else {
      await delegate.delete({ where: { id: targetId } });
    }
  } catch (err) {
    // Record may have already been deleted — safe to ignore
    if (!err.message?.includes("Record to update not found") &&
        !err.message?.includes("Record to delete not found")) {
      throw err;
    }
  }
}

/**
 * Restore a record to its previousData snapshot.
 * @param {string} modelName
 * @param {string} recordId
 * @param {Record<string,any>} previousData
 * @param {Object} tx
 */
async function restoreRecord(modelName, recordId, previousData, tx) {
  const delegate = getDelegate(modelName, tx);
  const targetId = parseModelId(modelName, recordId);
  // Strip auto-managed fields that Prisma handles
  const { id, createdAt, updatedAt, ...restorable } = previousData;
  try {
    await delegate.update({
      where: { id: targetId },
      data: restorable,
    });
  } catch (err) {
    if (!err.message?.includes("Record to update not found")) {
      throw err;
    }
  }
}
