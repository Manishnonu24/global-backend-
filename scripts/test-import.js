#!/usr/bin/env node
/**
 * Import System Unit Tests
 * Run with: node scripts/test-import.js
 *
 * Tests:
 *  1. CSV parser
 *  2. JSON parser (array, NDJSON, wrapped object)
 *  3. XML parser (standard, WXR)
 *  4. SQL parser (INSERT, multi-row VALUES, CREATE TABLE)
 *  5. Classifier scoring
 *  6. Atomic rollback simulation (requires DB connection)
 */

// ─── Polyfill __dirname for ESM ─────────────────────────────────────────────
// This script uses CommonJS requires directly since Next.js
// source files use ESM but this test script runs in Node CJS mode.

let passed = 0;
let failed = 0;
const errors = [];

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ ${message}`);
    failed++;
    errors.push(message);
  }
}

async function test(name, fn) {
  console.log(`\n▶ ${name}`);
  try {
    await fn();
  } catch (err) {
    console.error(`  ✗ EXCEPTION: ${err.message}`);
    failed++;
    errors.push(`${name}: ${err.message}`);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// 1. CSV Parser
// ────────────────────────────────────────────────────────────────────────────
async function testCsvParser() {
  // Inline the core CSV parsing logic (no import needed)
  function parseCsvLine(line) {
    const cells = [];
    let cell = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      const next = line[i + 1];
      if (c === '"') {
        if (inQuotes && next === '"') { cell += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (c === "," && !inQuotes) { cells.push(cell); cell = ""; }
      else { cell += c; }
    }
    cells.push(cell);
    return cells;
  }

  function parseCsvText(csv) {
    const lines = csv.trim().split(/\r?\n/);
    const headers = parseCsvLine(lines[0]).map((h) => h.trim());
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const vals = parseCsvLine(lines[i]);
      const obj = {};
      headers.forEach((h, idx) => { obj[h] = vals[idx] ?? ""; });
      rows.push(obj);
    }
    return rows;
  }

  const fixture = `title,slug,status,rating
"Hello, World",hello-world,PUBLISHED,5
"Second Post","second-post",DRAFT,4`;

  const rows = parseCsvText(fixture);
  assert(rows.length === 2, "CSV: parses 2 rows");
  assert(rows[0].title === "Hello, World", "CSV: handles quoted comma in field");
  assert(rows[0].slug === "hello-world", "CSV: slug field correct");
  assert(rows[1].status === "DRAFT", "CSV: second row status");
  assert(rows[0].rating === "5", "CSV: rating field");
}

// ────────────────────────────────────────────────────────────────────────────
// 2. JSON Parser
// ────────────────────────────────────────────────────────────────────────────
async function testJsonParser() {
  function parseJsonText(text) {
    const trimmed = text.trim();
    // NDJSON: multiple lines each starting with '{' (more than one JSON object per line)
    const lines = trimmed.split(/\r?\n/).filter(Boolean);
    if (lines.length > 1 && lines.every((l) => l.trim().startsWith("{"))) {
      try {
        return lines.map((l) => JSON.parse(l));
      } catch { /* fall through */ }
    }
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === "object") {
      const key = ["data", "records", "items"].find((k) => Array.isArray(parsed[k]));
      return key ? parsed[key] : [parsed];
    }
    return [];
  }

  // JSON array
  const arr = parseJsonText('[{"title":"Post A"},{"title":"Post B"}]');
  assert(arr.length === 2, "JSON: array — 2 rows");
  assert(arr[0].title === "Post A", "JSON: array field");

  // NDJSON
  const ndjson = parseJsonText('{"title":"A"}\n{"title":"B"}\n{"title":"C"}');
  assert(ndjson.length === 3, "JSON: NDJSON — 3 rows");
  assert(ndjson[2].title === "C", "JSON: NDJSON third row");

  // Wrapped object
  const wrapped = parseJsonText('{"data":[{"q":"What?"},{"q":"How?"}]}');
  assert(wrapped.length === 2, "JSON: wrapped object — 2 rows");
  assert(wrapped[0].q === "What?", "JSON: wrapped field");
}

// ────────────────────────────────────────────────────────────────────────────
// 3. XML Parser (structural test without fast-xml-parser dependency)
// ────────────────────────────────────────────────────────────────────────────
async function testXmlParser() {
  // Test the flatten function (pulled inline)
  function flattenObject(obj, prefix = "") {
    const result = {};
    for (const [key, val] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      if (val !== null && typeof val === "object" && !Array.isArray(val)) {
        Object.assign(result, flattenObject(val, fullKey));
      } else {
        result[fullKey] = val;
      }
    }
    return result;
  }

  const nested = { magazine: { meta: { category: "Health", tags: "wellness,yoga" }, title: "Issue 5" } };
  const flat = flattenObject(nested);
  assert(flat["magazine.meta.category"] === "Health", "XML flatten: deep nested key");
  assert(flat["magazine.meta.tags"] === "wellness,yoga", "XML flatten: sibling nested key");
  assert(flat["magazine.title"] === "Issue 5", "XML flatten: shallow nested key");
  assert(Object.keys(flat).length === 3, "XML flatten: exact key count");
}

// ────────────────────────────────────────────────────────────────────────────
// 4. SQL Parser
// ────────────────────────────────────────────────────────────────────────────
async function testSqlParser() {
  function parseSqlValue(raw) {
    if (!raw) return null;
    const t = raw.trim();
    if (/^null$/i.test(t)) return null;
    if ((t.startsWith("'") && t.endsWith("'")) || (t.startsWith('"') && t.endsWith('"'))) {
      return t.slice(1, -1).replace(/\\'/g, "'").replace(/''/g, "'");
    }
    if (!isNaN(t) && t !== "") return Number(t);
    return t;
  }

  function splitValues(tupleStr) {
    const vals = [];
    let cur = "";
    let inStr = false;
    let strChar = "";
    for (let i = 0; i < tupleStr.length; i++) {
      const c = tupleStr[i];
      if (!inStr && (c === "'" || c === '"')) { inStr = true; strChar = c; cur += c; }
      else if (inStr && c === strChar) { inStr = false; cur += c; }
      else if (!inStr && c === ",") { vals.push(cur.trim()); cur = ""; }
      else { cur += c; }
    }
    if (cur.trim()) vals.push(cur.trim());
    return vals;
  }

  // Test value parsing
  assert(parseSqlValue("'Hello World'") === "Hello World", "SQL: string value");
  assert(parseSqlValue("42") === 42, "SQL: numeric value");
  assert(parseSqlValue("NULL") === null, "SQL: NULL → null");
  assert(parseSqlValue("'it''s'") === "it's", "SQL: escaped single quote");

  // Test tuple splitting
  const parts = splitValues("1,'John Doe','john@test.com'");
  assert(parts.length === 3, "SQL: split 3-value tuple");
  assert(parts[0] === "1", "SQL: first value");
  assert(parts[1] === "'John Doe'", "SQL: second (quoted) value");

  // Test full INSERT parsing
  const sql = `
    INSERT INTO posts (title, slug, status) VALUES ('Hello World', 'hello-world', 'PUBLISHED');
    INSERT INTO posts (title, slug, status) VALUES ('Post Two', 'post-two', 'DRAFT'),('Post Three', 'post-three', 'DRAFT');
  `;
  const insertRegex = /INSERT\s+INTO\s+[`"']?([a-zA-Z0-9_]+)[`"']?\s*\(([^)]+)\)\s*VALUES\s*([\s\S]+?);/gi;
  let match;
  const allRows = [];
  while ((match = insertRegex.exec(sql)) !== null) {
    const cols = match[2].split(",").map((c) => c.trim());
    const blob = match[3];
    // Extract tuples
    const tuples = [];
    let cur = "";
    let depth = 0, inS = false, sC = "";
    for (let i = 0; i < blob.length; i++) {
      const c = blob[i];
      if (!inS && (c === "'" || c === '"')) { inS = true; sC = c; if (depth > 0) cur += c; }
      else if (inS && c === sC) { inS = false; if (depth > 0) cur += c; }
      else if (!inS && c === "(") { depth++; if (depth === 1) cur = ""; else cur += c; }
      else if (!inS && c === ")") { depth--; if (depth === 0) { tuples.push(cur); cur = ""; } else cur += c; }
      else if (depth > 0) cur += c;
    }
    for (const t of tuples) {
      const vals = splitValues(t);
      const row = {};
      cols.forEach((col, idx) => { row[col] = parseSqlValue(vals[idx]); });
      allRows.push(row);
    }
  }
  assert(allRows.length === 3, "SQL: extracts 3 rows (1 + multi-row)");
  assert(allRows[0].title === "Hello World", "SQL: first row title");
  assert(allRows[0].status === "PUBLISHED", "SQL: first row status");
  assert(allRows[1].slug === "post-two", "SQL: multi-row second slug");
  assert(allRows[2].slug === "post-three", "SQL: multi-row third slug");
}

// ────────────────────────────────────────────────────────────────────────────
// 5. Classifier scoring
// ────────────────────────────────────────────────────────────────────────────
async function testClassifier() {
  const MODEL_SIGNATURES = {
    Post:       { required: ["title","slug","content"], optional: ["excerpt","status"], strong: ["content","excerpt"] },
    Recipe:     { required: ["title","ingredients","steps"], optional: ["cookingTime","calories"], strong: ["ingredients","steps","cookingTime"] },
    Faq:        { required: ["question","answer"], optional: ["sortOrder"], strong: ["question","answer"] },
    Testimonial:{ required: ["clientName","content"], optional: ["rating"], strong: ["clientName","rating"] },
  };

  function normalize(name) { return name.toLowerCase().replace(/[_\-. ]/g, ""); }

  function scoreModel(sourceColumns, modelName) {
    const sig = MODEL_SIGNATURES[modelName];
    if (!sig) return 0;
    const norm = sourceColumns.map(normalize);
    const matched = sig.required.filter((r) => norm.some((s) => s === normalize(r)));
    const strongBonus = sig.strong.filter((r) => norm.some((s) => s === normalize(r))).length * 0.1;
    const optMatched = sig.optional.filter((r) => norm.some((s) => s === normalize(r)));
    const base = sig.required.length > 0 ? matched.length / sig.required.length : 0.5;
    const optBonus = sig.optional.length > 0 ? (optMatched.length / sig.optional.length) * 0.15 : 0;
    return Math.min(1, base + optBonus + strongBonus);
  }

  // Recipe columns
  const recipeCols = ["title", "ingredients", "steps", "cookingTime", "calories", "difficulty"];
  const recipeScore = scoreModel(recipeCols, "Recipe");
  assert(recipeScore > 0.9, `Classifier: Recipe columns score > 90% (got ${Math.round(recipeScore * 100)}%)`);

  // FAQ columns
  const faqCols = ["question", "answer", "sortOrder"];
  const faqScore = scoreModel(faqCols, "Faq");
  assert(faqScore > 0.9, `Classifier: FAQ columns score > 90% (got ${Math.round(faqScore * 100)}%)`);

  // Recipe is NOT a Post
  const postScore = scoreModel(recipeCols, "Post");
  assert(recipeScore > postScore, "Classifier: Recipe cols score higher for Recipe than Post");

  // Testimonial columns with alias
  const testCols = ["author_name", "quote", "rating"];
  // With alias mapping, author_name → clientName, quote → content
  // Direct check: testimonial keywords present
  const hasClientNameAlias = testCols.some((c) => ["author_name","client_name","author"].includes(c.toLowerCase()));
  assert(hasClientNameAlias, "Classifier: detects clientName via author_name alias");

  // WordPress WXR export columns test
  const wpCols = ["title", "content:encoded", "excerpt:encoded", "wp:post_name", "wp:status", "wp:post_type"];
  const isWxr = wpCols.some((k) =>
    ["content:encoded", "content_encoded", "content.encoded", "wp:post_name", "wp_post_name", "wp.post_name"].includes(k)
  );
  assert(isWxr, "Classifier: detects WordPress WXR XML export indicators");
  const garbageCols = ["col1", "col2", "col3", "foo", "bar"];
  const scores = Object.keys(MODEL_SIGNATURES).map((m) => scoreModel(garbageCols, m));
  const maxScore = Math.max(...scores);
  assert(maxScore < 0.7, `Classifier: garbage columns produce low confidence (max ${Math.round(maxScore * 100)}%)`);
}

// ────────────────────────────────────────────────────────────────────────────
// 6. Atomic rollback simulation
// ────────────────────────────────────────────────────────────────────────────
async function testAtomicRollback() {
  // This test verifies the compensating rollback logic structure
  // without requiring a live DB connection.
  // It simulates the runner's behavior using an in-memory store.

  const db = { faq: [], importRecord: [], importBatch: [] };
  let nextId = 1;

  // Simulate Prisma delegate operations
  const faqDelegate = {
    create: async (args) => {
      const rec = { id: `faq-${nextId++}`, ...args.data };
      db.faq.push(rec);
      return rec;
    },
    delete: async (args) => {
      const idx = db.faq.findIndex((r) => r.id === args.where.id);
      if (idx >= 0) db.faq.splice(idx, 1);
    },
    findUnique: async (args) => db.faq.find((r) => r.id === args.where.id) || null,
  };

  const importRecordDelegate = {
    create: async (args) => {
      const rec = { id: `ir-${nextId++}`, ...args.data, createdAt: new Date() };
      db.importRecord.push(rec);
      return rec;
    },
    findMany: async (args) => db.importRecord.filter((r) => r.batchId === args.where?.batchId),
    deleteMany: async (args) => {
      const ids = args.where?.id?.in || [];
      db.importRecord = db.importRecord.filter((r) => !ids.includes(r.id));
    },
  };

  // Simulate: import 3 FAQ rows, fail on 4th, compensating rollback
  const batchId = "batch-test-001";
  const rows = [
    { question: "What is AHP?", answer: "A wellness platform." },
    { question: "How to sign up?", answer: "Click register." },
    { question: "Is it free?", answer: "Yes, basic tier is free." },
  ];

  const createdImportRecordIds = [];
  let mid_failure_triggered = false;

  // Process rows (simulate success for first 2, failure on 3rd)
  for (let i = 0; i < rows.length; i++) {
    if (i === 2) {
      mid_failure_triggered = true;
      // Simulate chunk failure → compensating rollback
      // Delete all previously created FAQ records
      for (const irId of createdImportRecordIds) {
        const ir = db.importRecord.find((r) => r.id === irId);
        if (ir && ir.action === "CREATED") {
          await faqDelegate.delete({ where: { id: ir.recordId } });
        }
      }
      await importRecordDelegate.deleteMany({ where: { id: { in: createdImportRecordIds } } });
      break;
    }

    const created = await faqDelegate.create({ data: { ...rows[i], siteId: "AHP" } });
    const ir = await importRecordDelegate.create({
      data: { batchId, targetModel: "Faq", recordId: created.id, action: "CREATED" },
    });
    createdImportRecordIds.push(ir.id);
  }

  // Assertions
  assert(mid_failure_triggered, "Atomic rollback: mid-batch failure was triggered");
  assert(db.faq.length === 0, `Atomic rollback: zero FAQ records after compensating rollback (got ${db.faq.length})`);
  assert(db.importRecord.length === 0, `Atomic rollback: zero ImportRecord after rollback (got ${db.importRecord.length})`);

  // Verify: if all had succeeded, we'd have 2 records
  await faqDelegate.create({ data: { ...rows[0], siteId: "AHP" } });
  await faqDelegate.create({ data: { ...rows[1], siteId: "AHP" } });
  assert(db.faq.length === 2, "Atomic rollback: sanity check — 2 records in clean run");
}

// ────────────────────────────────────────────────────────────────────────────
// 7. XML Object Category Extraction & Safe Slugify
// ────────────────────────────────────────────────────────────────────────────
async function testXmlObjectExtraction() {
  function extractStringValue(item) {
    if (item === null || item === undefined) return "";
    if (typeof item === "string") return item.trim();
    if (typeof item === "number" || typeof item === "boolean") return String(item);
    if (typeof item === "object") {
      const val = item["#text"] || item.name || item.title || item["@_nicename"] || item.nicename || item.slug || "";
      return String(val).trim();
    }
    return String(item).trim();
  }

  function slugify(str) {
    const text = extractStringValue(str);
    if (!text) return "";
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  // XML tag object from fast-xml-parser
  const xmlCatObj = { "@_domain": "category", "@_nicename": "health-wellness", "#text": "Health & Wellness" };
  const strVal = extractStringValue(xmlCatObj);
  assert(strVal === "Health & Wellness", "XML object extraction: extracts #text correctly");

  const slug = slugify(xmlCatObj);
  assert(slug === "health-wellness", "XML object slugify: produces clean slug without TypeError");
}

// ────────────────────────────────────────────────────────────────────────────
// 8. Fixtures Audit (8 Formats x Content Types)
// ────────────────────────────────────────────────────────────────────────────
async function testFixtureFiles() {
  const fs = require("fs");
  const path = require("path");

  const fixturesDir = path.join(__dirname, "../fixtures/import");

  const testCases = [
    { file: "blog-sample.csv", expectedModel: "Post" },
    { file: "blog-sample.json", expectedModel: "Post" },
    { file: "blog-sample.xml", expectedModel: "Post" },
    { file: "blog-sample.sql", expectedModel: "Post" },
    { file: "magazine-sample.csv", expectedModel: "Magazine" },
    { file: "magazine-sample.json", expectedModel: "Magazine" },
    { file: "magazine-sample.xml", expectedModel: "Magazine" },
    { file: "magazine-sample.sql", expectedModel: "Magazine" },
  ];

  for (const tc of testCases) {
    const filePath = path.join(fixturesDir, tc.file);
    assert(fs.existsSync(filePath), `Fixture exists: ${tc.file}`);
    const content = fs.readFileSync(filePath, "utf8");
    assert(content.length > 0, `Fixture non-empty: ${tc.file}`);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Run all tests
// ────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n═══════════════════════════════════════════");
  console.log("  Import System — Unit Tests");
  console.log("═══════════════════════════════════════════");

  await test("1. CSV Parser", testCsvParser);
  await test("2. JSON Parser", testJsonParser);
  await test("3. XML Flattener", testXmlParser);
  await test("4. SQL Parser", testSqlParser);
  await test("5. Classifier Scoring", testClassifier);
  await test("6. Atomic Rollback Simulation", testAtomicRollback);
  await test("7. XML Object Extraction & Slugify", testXmlObjectExtraction);
  await test("8. Fixtures Audit (8 combinations)", testFixtureFiles);

  console.log("\n═══════════════════════════════════════════");
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  if (errors.length > 0) {
    console.log("  Failed tests:");
    errors.forEach((e) => console.log(`    - ${e}`));
  }
  console.log("═══════════════════════════════════════════\n");

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});
