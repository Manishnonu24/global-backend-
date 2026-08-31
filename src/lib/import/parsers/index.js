/**
 * Format detection and parser registry.
 * Detects file format via MIME type sniffing + content inspection,
 * then returns the appropriate parser adapter.
 */
import { parseCsv, parseCsvToArray } from "./csv.js";
import { parseJson, parseJsonToArray } from "./json.js";
import { parseXml, parseXmlToArray } from "./xml.js";
import { parseSql, parseSqlToArray } from "./sql.js";
import { IMPORT_MAX_FILE_SIZE_MB } from "./types.js";

/**
 * Detect the format of a file from its MIME type and/or content.
 *
 * @param {Object} params
 * @param {string} [params.mimeType]  - MIME type from Content-Type header or File.type
 * @param {string} [params.fileName]  - file name (used as fallback via extension)
 * @param {string} [params.content]   - first ~512 bytes of the file content (for sniffing)
 * @returns {"csv"|"json"|"xml"|"sql"|null}
 */
export function detectFormat({ mimeType = "", fileName = "", content = "" }) {
  const mime = mimeType.toLowerCase();
  const name = fileName.toLowerCase();
  const head = content.trim().slice(0, 512);

  // 1. MIME type hints
  if (mime.includes("csv") || mime === "text/comma-separated-values") return "csv";
  if (mime.includes("json") || mime === "application/json") return "json";
  if (mime.includes("xml") || mime === "application/xml" || mime === "text/xml") return "xml";
  if (mime === "application/sql" || mime === "application/x-sql" || mime === "text/x-sql") return "sql";

  // 2. Extension hints
  if (name.endsWith(".csv")) return "csv";
  if (name.endsWith(".json") || name.endsWith(".ndjson") || name.endsWith(".jsonl")) return "json";
  if (name.endsWith(".xml")) return "xml";
  if (name.endsWith(".sql")) return "sql";

  // 3. Content sniffing
  if (head.startsWith("[") || head.startsWith("{")) return "json";
  if (head.startsWith("<?xml") || head.startsWith("<")) return "xml";
  if (/^(INSERT|CREATE|DROP|ALTER|--)/im.test(head)) return "sql";
  // CSV heuristic: first line has multiple commas and no < or { characters
  const firstLine = head.split(/\r?\n/)[0] || "";
  if (firstLine.split(",").length >= 2 && !firstLine.includes("<") && !firstLine.startsWith("{")) {
    return "csv";
  }

  return null;
}

/**
 * Validate file size against the configured limit.
 * @param {number} sizeBytes
 * @throws {Error} if file exceeds the limit
 */
export function assertFileSize(sizeBytes) {
  const maxBytes = IMPORT_MAX_FILE_SIZE_MB * 1024 * 1024;
  if (sizeBytes > maxBytes) {
    throw new Error(
      `File too large: ${(sizeBytes / 1024 / 1024).toFixed(1)} MB (max ${IMPORT_MAX_FILE_SIZE_MB} MB)`
    );
  }
}

/**
 * Get the streaming async generator parser for a detected format.
 * @param {"csv"|"json"|"xml"|"sql"} format
 * @returns {function(string, import('./types.js').ParseOptions): AsyncGenerator<import('./types.js').RawRecord>}
 */
export function getStreamParser(format) {
  switch (format) {
    case "csv":  return parseCsv;
    case "json": return parseJson;
    case "xml":  return parseXml;
    case "sql":  return parseSql;
    default: throw new Error(`Unsupported format: ${format}`);
  }
}

/**
 * Get the array (collect-all) parser for a detected format.
 * @param {"csv"|"json"|"xml"|"sql"} format
 * @returns {function(string, import('./types.js').ParseOptions): Promise<import('./types.js').RawRecord[]>}
 */
export function getArrayParser(format) {
  switch (format) {
    case "csv":  return parseCsvToArray;
    case "json": return parseJsonToArray;
    case "xml":  return parseXmlToArray;
    case "sql":  return parseSqlToArray;
    default: throw new Error(`Unsupported format: ${format}`);
  }
}

/**
 * Parse a file buffer/text into an array of RawRecords, auto-detecting format.
 *
 * @param {Object} params
 * @param {string}  params.content   - file text content
 * @param {string}  [params.mimeType]
 * @param {string}  [params.fileName]
 * @param {import('./types.js').ParseOptions} [params.options]
 * @returns {Promise<{format: string, rows: import('./types.js').RawRecord[]}>}
 */
export async function parseFile({ content, mimeType, fileName, options = {} }) {
  const format = detectFormat({ mimeType, fileName, content });
  if (!format) {
    throw new Error(
      "Could not detect file format. Please use .csv, .json, .xml, or .sql files."
    );
  }
  const parse = getArrayParser(format);
  const rows = await parse(content, options);
  return { format, rows };
}
