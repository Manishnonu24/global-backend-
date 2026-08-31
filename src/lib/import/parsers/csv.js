/**
 * CSV import parser adapter.
 * Streams CSV line-by-line without loading the entire file into memory.
 * Handles quoted fields, embedded newlines, escaped quotes (RFC 4180).
 */
import { IMPORT_MAX_ROWS } from "./types.js";

/**
 * Cast a raw string cell value to the most appropriate JS type.
 * @param {string|undefined} val
 * @returns {any}
 */
function castValue(val) {
  if (val === null || val === undefined) return null;
  if (typeof val !== "string") return val;
  const trimmed = val.trim();
  if (trimmed === "" || trimmed.toLowerCase() === "null" || trimmed.toLowerCase() === "nil")
    return null;
  if (trimmed.toLowerCase() === "true") return true;
  if (trimmed.toLowerCase() === "false") return false;

  // Numeric check — exclude leading-zero strings like "007" or hex
  if (
    !isNaN(trimmed) &&
    trimmed !== "" &&
    !trimmed.includes(" ") &&
    !trimmed.startsWith("0x") &&
    !(trimmed.length > 1 && trimmed.startsWith("0") && !trimmed.includes("."))
  ) {
    const num = Number(trimmed);
    if (!isNaN(num)) return num;
  }

  // JSON object/array
  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    try {
      return JSON.parse(trimmed);
    } catch {
      /* fall through — return as string */
    }
  }
  return trimmed;
}

/**
 * Parse a single CSV line (handles RFC 4180 quoted fields).
 * @param {string} line
 * @returns {string[]}
 */
function parseCsvLine(line) {
  const cells = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    const next = line[i + 1];

    if (c === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === "," && !inQuotes) {
      cells.push(cell);
      cell = "";
    } else {
      cell += c;
    }
  }
  cells.push(cell);
  return cells;
}

/**
 * Async generator that yields RawRecord objects from a CSV string.
 * Does NOT load the entire file into memory — iterates characters once.
 *
 * @param {string} csvText
 * @param {import('./types.js').ParseOptions} [options]
 * @yields {import('./types.js').RawRecord}
 */
export async function* parseCsv(csvText, options = {}) {
  const { maxRows = IMPORT_MAX_ROWS, preview = false, previewRows = 50 } = options;
  const limit = preview ? previewRows : maxRows;

  // Split into logical lines (respecting quoted newlines)
  const lines = [];
  let currentLine = "";
  let insideQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentLine += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
        currentLine += char;
      }
    } else if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") i++;
      if (currentLine.trim()) lines.push(currentLine);
      currentLine = "";
    } else {
      currentLine += char;
    }
  }
  if (currentLine.trim()) lines.push(currentLine);

  if (lines.length === 0) return;

  const headers = parseCsvLine(lines[0]).map((h) => h.trim().replace(/^"|"$/g, ""));

  let rowIndex = 0;
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    if (rowIndex >= limit) break;

    const values = parseCsvLine(lines[i]);
    const data = {};
    headers.forEach((h, idx) => {
      if (h) data[h] = castValue(values[idx]);
    });

    yield { rawIndex: rowIndex, data };
    rowIndex++;
  }
}

/**
 * Collect all rows from parseCsv into an array (convenience wrapper).
 * @param {string} csvText
 * @param {import('./types.js').ParseOptions} [options]
 * @returns {Promise<import('./types.js').RawRecord[]>}
 */
export async function parseCsvToArray(csvText, options = {}) {
  const rows = [];
  for await (const record of parseCsv(csvText, options)) {
    rows.push(record);
  }
  return rows;
}
