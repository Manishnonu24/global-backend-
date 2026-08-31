/**
 * JSON import parser adapter.
 * Supports:
 *   - JSON arrays:        [ {...}, {...}, ... ]
 *   - JSON objects:       { "records": [...] } or { "data": [...] }
 *   - NDJSON (newline-delimited JSON): one JSON object per line
 *
 * Uses streaming iteration to avoid holding the full array in memory
 * (for NDJSON). JSON array mode requires a single JSON.parse but then
 * iterates lazily via the generator.
 */
import { IMPORT_MAX_ROWS } from "./types.js";

/**
 * Async generator that yields RawRecord from a JSON string.
 *
 * @param {string} jsonText
 * @param {import('./types.js').ParseOptions} [options]
 * @yields {import('./types.js').RawRecord}
 */
export async function* parseJson(jsonText, options = {}) {
  const { maxRows = IMPORT_MAX_ROWS, preview = false, previewRows = 50 } = options;
  const limit = preview ? previewRows : maxRows;

  const trimmed = jsonText.trim();

  // ---- NDJSON: one JSON object per line ----
  if (trimmed.startsWith("{")) {
    const lines = trimmed.split(/\r?\n/);
    let rowIndex = 0;
    for (const line of lines) {
      if (!line.trim()) continue;
      if (rowIndex >= limit) break;
      let parsed;
      try {
        parsed = JSON.parse(line.trim());
      } catch {
        continue; // skip malformed lines
      }
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        yield { rawIndex: rowIndex, data: parsed };
        rowIndex++;
      }
    }
    return;
  }

  // ---- JSON Array or wrapped object ----
  let parsed;
  try {
    parsed = JSON.parse(trimmed);
  } catch (err) {
    throw new Error(`JSON parse error: ${err.message}`);
  }

  let rows;
  if (Array.isArray(parsed)) {
    rows = parsed;
  } else if (parsed && typeof parsed === "object") {
    // Look for a key that holds an array: "data", "records", "items", "rows", "results"
    const arrayKey = ["data", "records", "items", "rows", "results"].find(
      (k) => Array.isArray(parsed[k])
    );
    if (arrayKey) {
      rows = parsed[arrayKey];
    } else {
      // Single object — treat as one-row import
      rows = [parsed];
    }
  } else {
    throw new Error("JSON must be an array, an object with a data/records array, or NDJSON.");
  }

  let rowIndex = 0;
  for (const item of rows) {
    if (rowIndex >= limit) break;
    if (item && typeof item === "object" && !Array.isArray(item)) {
      yield { rawIndex: rowIndex, data: item };
      rowIndex++;
    }
  }
}

/**
 * Collect all rows from parseJson into an array.
 * @param {string} jsonText
 * @param {import('./types.js').ParseOptions} [options]
 * @returns {Promise<import('./types.js').RawRecord[]>}
 */
export async function parseJsonToArray(jsonText, options = {}) {
  const rows = [];
  for await (const record of parseJson(jsonText, options)) {
    rows.push(record);
  }
  return rows;
}
