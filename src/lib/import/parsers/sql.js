/**
 * SQL import parser adapter.
 *
 * Safely parses SQL dump files by extracting structure from:
 *   - CREATE TABLE statements → column names/types
 *   - INSERT INTO ... VALUES (...) statements → data rows
 *
 * SAFETY: Never executes any SQL. Only extracts structured data
 * which is then inserted via Prisma ORM.
 *
 * Supports:
 *   - Standard INSERT INTO `table` (col1, col2) VALUES (v1, v2);
 *   - Multi-row VALUES: INSERT INTO `t` (a) VALUES (1),(2),(3);
 *   - Single-quoted and double-quoted string values
 *   - NULL literals → null
 *   - Escaped quotes inside strings (\' or '')
 *   - Comments (-- line comments, /* block comments *\/)
 */
import { IMPORT_MAX_ROWS } from "./types.js";

/**
 * Strip SQL comments from raw SQL text.
 * @param {string} sql
 * @returns {string}
 */
function stripComments(sql) {
  // Remove /* ... */ block comments
  let result = sql.replace(/\/\*[\s\S]*?\*\//g, " ");
  // Remove -- line comments
  result = result.replace(/--[^\n]*/g, "");
  return result;
}

/**
 * Parse a single SQL value token (unescapes quotes, handles NULL, numbers).
 * @param {string} raw
 * @returns {any}
 */
function parseSqlValue(raw) {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (/^null$/i.test(trimmed)) return null;
  // Quoted string
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    const inner = trimmed.slice(1, -1)
      .replace(/\\'/g, "'")
      .replace(/''/g, "'")
      .replace(/\\"/g, '"')
      .replace(/""/g, '"')
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\r")
      .replace(/\\t/g, "\t")
      .replace(/\\\\/g, "\\");
    // Try JSON objects/arrays
    const t = inner.trim();
    if ((t.startsWith("{") && t.endsWith("}")) || (t.startsWith("[") && t.endsWith("]"))) {
      try { return JSON.parse(t); } catch { /* fall through */ }
    }
    return inner;
  }
  // Numeric
  if (!isNaN(trimmed) && trimmed !== "") {
    return Number(trimmed);
  }
  // Boolean-ish
  if (/^true$/i.test(trimmed)) return true;
  if (/^false$/i.test(trimmed)) return false;
  return trimmed;
}

/**
 * Split a VALUES tuple string into individual value tokens,
 * respecting quoted strings, nested parens, and escape sequences.
 * @param {string} tupleStr - the content inside (...) of a VALUES clause
 * @returns {string[]}
 */
function splitTupleValues(tupleStr) {
  const values = [];
  let current = "";
  let inString = false;
  let quoteChar = "";
  let depth = 0;

  for (let i = 0; i < tupleStr.length; i++) {
    const c = tupleStr[i];
    const prev = tupleStr[i - 1];

    if (!inString && (c === "'" || c === '"')) {
      inString = true;
      quoteChar = c;
      current += c;
    } else if (inString && c === quoteChar) {
      // Check for escaped quote: \' or ''
      if (prev === "\\" || tupleStr[i + 1] === quoteChar) {
        current += c;
        if (tupleStr[i + 1] === quoteChar) {
          current += tupleStr[i + 1];
          i++;
        }
      } else {
        inString = false;
        current += c;
      }
    } else if (!inString && c === "(") {
      depth++;
      current += c;
    } else if (!inString && c === ")") {
      depth--;
      current += c;
    } else if (!inString && c === "," && depth === 0) {
      values.push(current.trim());
      current = "";
    } else {
      current += c;
    }
  }
  if (current.trim()) values.push(current.trim());
  return values;
}



/**
 * Extract tuple content strings from a VALUES clause like: (1,'foo'),(2,'bar')
 * Returns array of inner content strings (without outer parens).
 * @param {string} valuesBlob
 * @returns {string[]}
 */
function extractValueTuples(valuesBlob) {
  const tuples = [];
  let current = "";
  let inStr = false;
  let strChar = "";
  let depth = 0;

  for (let i = 0; i < valuesBlob.length; i++) {
    const c = valuesBlob[i];
    const nextC = valuesBlob[i + 1];

    if (!inStr && (c === "'" || c === '"')) {
      inStr = true;
      strChar = c;
      if (depth > 0) current += c;
      continue;
    }

    if (inStr) {
      if (c === strChar) {
        if (nextC === strChar) {
          // Escaped: '' or ""
          if (depth > 0) current += c + nextC;
          i++;
          continue;
        }
        inStr = false;
        if (depth > 0) current += c;
        continue;
      }
      if (depth > 0) current += c;
      continue;
    }

    // Not in string
    if (c === "(") {
      depth++;
      if (depth === 1) {
        current = "";
      } else {
        current += c;
      }
    } else if (c === ")") {
      depth--;
      if (depth === 0) {
        tuples.push(current);
        current = "";
      } else {
        current += c;
      }
    } else if (c === "," && depth === 0) {
      // separator between tuples — ignore
    } else {
      if (depth > 0) current += c;
    }
  }

  return tuples;
}

/**
 * @typedef {Object} SqlTableDef
 * @property {string} tableName
 * @property {string[]} columns
 */

/**
 * Extract CREATE TABLE column names from SQL.
 * @param {string} sql
 * @returns {Record<string, string[]>} - map of tableName → columns[]
 */
function parseCreateTable(sql) {
  const result = {};
  const createRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"']?([a-zA-Z0-9_]+)[`"']?\s*\(([^;]+)\)/gis;
  let m;
  while ((m = createRegex.exec(sql)) !== null) {
    const tableName = m[1].toLowerCase();
    const body = m[2];
    const cols = [];
    const colLines = body.split(",");
    for (const line of colLines) {
      const trimmed = line.trim();
      // Skip constraints, keys, indexes
      if (/^(PRIMARY|UNIQUE|KEY|INDEX|CONSTRAINT|CHECK|FOREIGN)/i.test(trimmed)) continue;
      const colMatch = trimmed.match(/^[`"']?([a-zA-Z0-9_]+)[`"']?\s+/);
      if (colMatch) cols.push(colMatch[1]);
    }
    result[tableName] = cols;
  }
  return result;
}

/**
 * Async generator that yields RawRecord from a SQL dump string.
 *
 * @param {string} sqlText
 * @param {import('./types.js').ParseOptions} [options]
 * @yields {import('./types.js').RawRecord}
 */
export async function* parseSql(sqlText, options = {}) {
  const { maxRows = IMPORT_MAX_ROWS, preview = false, previewRows = 50 } = options;
  const limit = preview ? previewRows : maxRows;

  const cleaned = stripComments(sqlText);

  // First pass: collect CREATE TABLE definitions for column names
  const tableDefs = parseCreateTable(cleaned);

  // Second pass: extract INSERT statements
  const insertRegex =
    /INSERT\s+(?:IGNORE\s+)?INTO\s+[`"']?([a-zA-Z0-9_-]+)[`"']?\s*(?:\(([^)]+)\))?\s*VALUES\s*([\s\S]+?);/gi;

  let globalRowIndex = 0;
  let match;

  while ((match = insertRegex.exec(cleaned)) !== null) {
    const rawTable = match[1].toLowerCase();
    const colsFromInsert = match[2]
      ? match[2].split(",").map((c) => c.trim().replace(/[`"']/g, ""))
      : null;
    const valuesBlob = match[3];

    // Resolve columns: prefer explicit INSERT columns, fall back to CREATE TABLE
    const cols = colsFromInsert || tableDefs[rawTable] || null;
    if (!cols) continue; // Can't map without column names

    const tuples = extractValueTuples(valuesBlob);

    for (const tupleStr of tuples) {
      if (globalRowIndex >= limit) return;
      const rawVals = splitTupleValues(tupleStr);
      const data = {};
      cols.forEach((col, idx) => {
        data[col] = parseSqlValue(rawVals[idx]);
      });
      // Attach detected table name as a hint
      data["__tableName"] = rawTable;
      yield { rawIndex: globalRowIndex, data };
      globalRowIndex++;
    }
  }
}

/**
 * Collect all rows from parseSql into an array.
 * @param {string} sqlText
 * @param {import('./types.js').ParseOptions} [options]
 * @returns {Promise<import('./types.js').RawRecord[]>}
 */
export async function parseSqlToArray(sqlText, options = {}) {
  const rows = [];
  for await (const record of parseSql(sqlText, options)) {
    rows.push(record);
  }
  return rows;
}
