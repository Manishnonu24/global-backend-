/**
 * XML import parser adapter (server-side, Node-compatible).
 * Uses `fast-xml-parser` — no browser APIs.
 *
 * Flattens nested XML tags to dot-notation keys:
 *   <magazine><meta><category>Health</category></meta></magazine>
 *   → { "meta.category": "Health" }
 *
 * Supports:
 *   - Root element with repeated child elements (most common export format)
 *   - WordPress WXR export (<channel><item>...</item></channel>)
 *   - Generic <records><record>...</record></records> patterns
 */
import { IMPORT_MAX_ROWS } from "./types.js";

/**
 * Dynamically import fast-xml-parser (ESM/CJS compatible).
 * @returns {Promise<{XMLParser: new(opts: object) => any}>}
 */
async function getFxp() {
  const mod = await import("fast-xml-parser");
  return mod;
}

/**
 * Unwrap fast-xml-parser text/CDATA node primitives to clean strings.
 */
function unwrapXmlNode(val) {
  if (val === null || val === undefined) return "";
  if (typeof val !== "object") return val;

  if (Array.isArray(val)) {
    return val.map(unwrapXmlNode);
  }

  // Preserve domain attribute for WXR category / post_tag elements
  const domain = val["@_domain"] ?? val.domain;
  const textContent = val["#text"] ?? val["cdata"] ?? val["__cdata"];

  if (domain !== undefined && domain !== null) {
    return {
      domain: String(unwrapXmlNode(domain)).trim(),
      name: String(unwrapXmlNode(textContent ?? val.name ?? val.title ?? "")).trim(),
      nicename: String(unwrapXmlNode(val["@_nicename"] ?? val.nicename ?? "")).trim(),
    };
  }

  if (textContent !== undefined && textContent !== null && typeof textContent !== "object") {
    return String(textContent).trim();
  }

  const unwrapped = {};
  for (const [k, v] of Object.entries(val)) {
    unwrapped[k] = unwrapXmlNode(v);
  }
  return unwrapped;
}

/**
 * Flatten a nested object to dot-notation keys.
 * e.g. { meta: { category: "Health" } } → { "meta.category": "Health" }
 *
 * @param {Record<string, any>} obj
 * @param {string} [prefix]
 * @returns {Record<string, any>}
 */
function flattenObject(obj, prefix = "") {
  const result = {};
  const cleaned = unwrapXmlNode(obj);

  if (typeof cleaned !== "object" || cleaned === null) {
    if (prefix) result[prefix] = cleaned;
    return result;
  }

  for (const [key, val] of Object.entries(cleaned)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (val !== null && typeof val === "object" && !Array.isArray(val)) {
      Object.assign(result, flattenObject(val, fullKey));
    } else {
      result[fullKey] = val;
    }
  }
  return result;
}

/**
 * Read a wp:postmeta value by key from a WXR <item>.
 */
function getWxrPostMeta(item, key) {
  let list = item["wp:postmeta"] || item.postmeta;
  if (!list) return null;
  if (!Array.isArray(list)) list = [list];
  for (const pm of list) {
    const k = unwrapXmlNode(pm["wp:meta_key"] ?? pm.meta_key ?? "");
    if (String(k) === key) {
      const v = pm["wp:meta_value"] ?? pm.meta_value ?? "";
      return unwrapXmlNode(v);
    }
  }
  return null;
}

/**
 * Parse a WordPress "3D FlipBook" (post_type=3d-flip-book) item into a flat
 * row already shaped for the Magazine model. The plugin stores the cover
 * image and PDF as serialized PHP inside postmeta (3dfb_thumbnail /
 * 3dfb_data) rather than as plain WXR fields, so we decode those directly.
 *
 * `__targetModel` is a signal consumed by classify.js — it skips all
 * guesswork and routes this row straight to Magazine.
 */
function parseFlipBookItem(item, attachmentMap) {
  const title = unwrapXmlNode(item.title || "");
  const postId = String(unwrapXmlNode(item["wp:post_id"] || item.post_id || ""));
  const slug = unwrapXmlNode(item["wp:post_name"] || item.post_name || "");
  const pubDate = unwrapXmlNode(item["wp:post_date"] || item.pubDate || "");

  let category = "Magazine";
  const catNode = item.category;
  if (catNode) {
    const cats = Array.isArray(catNode) ? catNode : [catNode];
    const flipCat = cats.find((c) => (c && (c["@_domain"] || c.domain)) === "3d-flip-book-category") || cats[0];
    if (flipCat) {
      const unwrapped = unwrapXmlNode(flipCat);
      category = typeof unwrapped === "object" ? (unwrapped.name || unwrapped.nicename || "Magazine") : String(unwrapped || "Magazine");
    }
  }

  // Cover image: 3dfb_thumbnail meta = serialized PHP { post_ID: "<attachment id>" }
  let coverImage = "";
  const thumbMeta = getWxrPostMeta(item, "3dfb_thumbnail");
  if (thumbMeta) {
    const str = String(thumbMeta).replace(/\\"/g, '"');
    const m = /post_ID";s:\d+:"(\d+)"/i.exec(str) || /post_ID";i:(\d+)/i.exec(str);
    if (m) coverImage = attachmentMap.get(m[1]) || "";
  }
  if (!coverImage) {
    const thumbId = getWxrPostMeta(item, "_thumbnail_id");
    if (thumbId) coverImage = attachmentMap.get(String(thumbId)) || "";
  }

  // PDF file + page count: 3dfb_data meta = serialized PHP { guid: "<pdf url>", pdf_pages: "<n>" }
  let pdfUrl = "";
  let pdfPages = "";
  const dataMeta = getWxrPostMeta(item, "3dfb_data");
  if (dataMeta) {
    const str = String(dataMeta).replace(/\\"/g, '"').replace(/\\\//g, '/');
    const guidMatch = /guid";s:\d+:"([^"]+)"/i.exec(str) || /(https?:\/\/[^\s"',}\\]+\.pdf)/i.exec(str);
    if (guidMatch) pdfUrl = guidMatch[1];
    const pagesMatch = /pdf_pages";s:\d+:"(\d+)"/i.exec(str) || /pdf_pages";i:(\d+)/i.exec(str);
    if (pagesMatch) pdfPages = pagesMatch[1];
  }
  if (pdfUrl) pdfUrl = pdfUrl.replace(/\\/g, "").trim();

  if (!String(title).trim() && !pdfUrl) return null;

  let dateIso = "";
  const d = new Date(pubDate);
  if (!isNaN(d.getTime())) dateIso = d.toISOString().slice(0, 10);

  return {
    __targetModel: "Magazine",
    title: String(title).trim(),
    slug: String(slug).trim(),
    coverImage,
    description: pdfPages
      ? `${title} issue — ${pdfPages} pages`
      : `${title} issue`,
    magazineId: `ahp-${postId}`,
    category: String(category).trim(),
    date: dateIso,
    link: pdfUrl,
    magCloudLink: pdfUrl,
  };
}

/**
 * Async generator that yields RawRecord from an XML string.
 *
 * @param {string} xmlText
 * @param {import('./types.js').ParseOptions} [options]
 * @yields {import('./types.js').RawRecord}
 */
export async function* parseXml(xmlText, options = {}) {
  const { maxRows = IMPORT_MAX_ROWS, preview = false, previewRows = 50 } = options;
  const limit = preview ? previewRows : maxRows;

  const { XMLParser } = await getFxp();

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    parseTagValue: true,
    parseAttributeValue: true,
    trimValues: true,
  });

  let parsed;
  try {
    parsed = parser.parse(xmlText);
  } catch (err) {
    throw new Error(`XML parse error: ${err.message}`);
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("XML produced no parseable structure.");
  }

  // Get root element (skip ?xml declaration etc.)
  const rootKey = Object.keys(parsed).find((k) => !k.startsWith("?") && k !== "#text");
  if (!rootKey) throw new Error("Could not find XML root element.");

  const root = parsed[rootKey];

  // Handle WordPress WXR format: root.channel.item[]
  let rowSource = null;
  let rowIndex = 0;

  if (root && typeof root === "object") {
    // Try WXR: channel.item
    if (root.channel) {
      const channel = root.channel;
      const items = Array.isArray(channel.item) ? channel.item : channel.item ? [channel.item] : [];

      // 1-Pass: Map attachment ID → attachment URL
      const attachmentMap = new Map();
      for (const item of items) {
        const postType = String(item["wp:post_type"] || item.post_type || "").toLowerCase();
        const postId = String(item["wp:post_id"] || item.post_id || "");
        let attachmentUrl = unwrapXmlNode(item["wp:attachment_url"] || item.attachment_url || item.guid || "");
        if (typeof attachmentUrl === "object") attachmentUrl = attachmentUrl["#text"] || "";
        if (postId && attachmentUrl && (postType === "attachment" || String(attachmentUrl).startsWith("http"))) {
          attachmentMap.set(postId, String(attachmentUrl).trim());
        }
      }

      // 2-Pass: Process genuine post items
      for (const item of items) {
        if (rowIndex >= limit) break;

        let rawPostType = item["wp:post_type"] ?? item.post_type ?? item["wp_post_type"] ?? item["wp.post_type"] ?? item["@_post_type"];
        const postType = String(unwrapXmlNode(rawPostType) || "").trim().toLowerCase();

        // Custom post type from the "3D FlipBook" plugin → route to Magazine
        if (postType === "3d-flip-book") {
          const magazineRow = parseFlipBookItem(item, attachmentMap);
          if (magazineRow) {
            yield { rawIndex: rowIndex, data: magazineRow };
            rowIndex++;
          }
          continue;
        }

        // Filter out non-blog post WXR items (attachment, nav_menu_item, revision, custom_css, wp_block, page)
        if (postType && !["post", "blog", "article", "news"].includes(postType)) {
          continue;
        }

        const flat = flattenObject(item);

        // Check for non-empty title or content
        const titleStr = unwrapXmlNode(item.title || item["post_title"] || flat.title || flat["post_title"] || "");
        const contentStr = unwrapXmlNode(item["content:encoded"] || item.content || flat["content:encoded"] || flat.content || "");
        const excerptStr = unwrapXmlNode(item["excerpt:encoded"] || item.excerpt || flat["excerpt:encoded"] || flat.excerpt || "");

        if (!String(titleStr).trim() && !String(contentStr).trim() && !String(excerptStr).trim()) {
          continue;
        }

        // Check _thumbnail_id in postmeta array
        let featuredImageUrl = "";
        let postmetaArr = item["wp:postmeta"] || item.postmeta;
        if (postmetaArr) {
          if (!Array.isArray(postmetaArr)) postmetaArr = [postmetaArr];
          for (const pm of postmetaArr) {
            const key = String(pm["wp:meta_key"] || pm.meta_key || "");
            const val = String(pm["wp:meta_value"] || pm.meta_value || "");
            if (key === "_thumbnail_id" && val && attachmentMap.has(val)) {
              featuredImageUrl = attachmentMap.get(val);
              break;
            }
          }
        }

        if (featuredImageUrl) {
          flat["ogImage"] = featuredImageUrl;
          flat["featured_image"] = featuredImageUrl;
          flat["image"] = featuredImageUrl;
          flat["wp:attachment_url"] = featuredImageUrl;
        }

        yield { rawIndex: rowIndex, data: flat };
        rowIndex++;
      }
      return;
    }

    // Standard: root has repeated child elements
    // Find the first key whose value is an array or an object (first record group)
    const childKeys = Object.keys(root);

    // If root itself is an array of objects
    if (Array.isArray(root)) {
      for (const item of root) {
        if (rowIndex >= limit) break;
        if (item && typeof item === "object") {
          yield { rawIndex: rowIndex, data: flattenObject(item) };
          rowIndex++;
        }
      }
      return;
    }

    // Find the first child key that holds an array (the record container)
    for (const key of childKeys) {
      const child = root[key];
      if (Array.isArray(child)) {
        rowSource = child;
        break;
      }
      // Single item (not array) — wrap
      if (child && typeof child === "object" && !Array.isArray(child)) {
        rowSource = [child];
        break;
      }
    }

    if (!rowSource) {
      // Root itself might be a single record
      yield { rawIndex: 0, data: flattenObject(root) };
      return;
    }

    for (const item of rowSource) {
      if (rowIndex >= limit) break;
      if (item && typeof item === "object") {
        yield { rawIndex: rowIndex, data: flattenObject(item) };
        rowIndex++;
      }
    }
  }
}

/**
 * Collect all rows from parseXml into an array.
 * @param {string} xmlText
 * @param {import('./types.js').ParseOptions} [options]
 * @returns {Promise<import('./types.js').RawRecord[]>}
 */
export async function parseXmlToArray(xmlText, options = {}) {
  const rows = [];
  for await (const record of parseXml(xmlText, options)) {
    rows.push(record);
  }
  return rows;
}
