/**
 * @fileoverview Shared types for the Import parser adapter interface.
 *
 * All parsers implement the same contract:
 *   parse(input: string | Buffer, options?: ParseOptions): AsyncGenerator<RawRecord>
 *
 * @typedef {Object} RawRecord
 * @property {number} rawIndex  - 0-based position within the file (row/statement number)
 * @property {Record<string, any>} data - flat key→value map of the parsed row
 *
 * @typedef {Object} ParseOptions
 * @property {number} [maxRows=50000]   - hard cap on rows yielded (configurable via env)
 * @property {number} [previewRows=50]  - how many rows to yield in preview mode
 * @property {boolean} [preview=false]  - if true, stop after previewRows
 * @property {string}  [hint]           - optional table/type hint (e.g. from SQL CREATE TABLE)
 *
 * @typedef {Object} ParseResult
 * @property {string}  format    - "csv" | "json" | "xml" | "sql"
 * @property {number}  total     - total rows parsed
 * @property {RawRecord[]} rows  - parsed rows (truncated in preview mode)
 */

export const SUPPORTED_FORMATS = ["csv", "json", "xml", "sql"];

export const IMPORT_MAX_ROWS = parseInt(process.env.IMPORT_MAX_ROWS || "50000", 10);
export const IMPORT_MAX_FILE_SIZE_MB = parseInt(
  process.env.IMPORT_MAX_FILE_SIZE_MB || "10",
  10
);
export const IMPORT_CHUNK_SIZE = parseInt(process.env.IMPORT_CHUNK_SIZE || "100", 10);
export const IMPORT_CONFIDENCE_THRESHOLD = 0.7;
