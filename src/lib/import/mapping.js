/**
 * Field mapping layer.
 * Maps source column/tag names → Prisma field names, handles type coercion,
 * and auto-creates missing relations (Category, Tag) scoped to siteId.
 */
import prisma from "@/lib/prisma";
import { mediaService } from "@/services/media.service";

// ---------------------------------------------------------------------------
// Per-model field alias tables
// source alias → canonical Prisma field name
// ---------------------------------------------------------------------------
const FIELD_ALIASES = {
  Post: {
    post_title: "title",
    headline: "title",
    name: "title",
    post_content: "content",
    body: "content",
    html: "content",
    "content:encoded": "content",
    content_encoded: "content",
    "content.encoded": "content",
    post_excerpt: "excerpt",
    summary: "excerpt",
    "excerpt:encoded": "excerpt",
    excerpt_encoded: "excerpt",
    "excerpt.encoded": "excerpt",
    post_name: "slug",
    post_slug: "slug",
    "wp:post_name": "slug",
    wp_post_name: "slug",
    "wp.post_name": "slug",
    post_status: "status",
    published: "status",
    "wp:status": "status",
    wp_status: "status",
    "wp.status": "status",
    published_at: "publishedAt",
    publish_date: "publishedAt",
    "wp:post_date": "publishedAt",
    wp_post_date: "publishedAt",
    "wp.post_date": "publishedAt",
    pubdate: "publishedAt",
    date: "publishedAt",
    author: "authorId",
    author_id: "authorId",
    author_name: "authorId", // will try to resolve by name
    "dc:creator": "authorId",
    dc_creator: "authorId",
    "dc.creator": "authorId",
    featured_image: "ogImage",
    image: "ogImage",
    thumbnail: "ogImage",
    seo_title: "seoTitle",
    meta_title: "seoTitle",
    seo_description: "seoDescription",
    meta_description: "seoDescription",
    canonical: "canonicalUrl",
    og_image: "ogImage",
    category: "categories",
    tag: "tags",
  },
  Magazine: {
    magazine_id: "magazineId",
    magazine_title: "title",
    magazine_description: "description",
    magazine_introduction: "introduction",
    magazine_back_image: "backImage",
    magazine_spine_image: "spineImage",
    magazine_tags: "tags",
    magazine_cover_image: "coverImage",
    cover_image: "coverImage",
    magazine_link: "link",
    magazine_date: "date",
    magazine_category: "category",
    magazine_slug: "slug",
    magcloudlink: "magCloudLink",
    mag_cloud_link: "magCloudLink",
  },
  Recipe: {
    cook_time: "cookingTime",
    cooking_time: "cookingTime",
    prep_time: "cookingTime",
    calorie: "calories",
    calorie_count: "calories",
    instruction: "steps",
    instructions: "steps",
    image: "imageUrl",
    image_url: "imageUrl",
    photo: "imageUrl",
    difficulty_level: "difficulty",
    allergen: "allergens",
  },
  Service: {
    service_title: "title",
    service_description: "description",
    service_price: "price",
    cta_text: "ctaButtonText",
    cta_link: "ctaButtonLink",
    order: "sortOrder",
    sort_order: "sortOrder",
    image: "featuredImageId",
  },
  Testimonial: {
    client_name: "clientName",
    author: "clientName",
    author_name: "clientName",
    name: "clientName",
    client_image: "clientImage",
    avatar: "clientImage",
    photo: "clientImage",
    quote: "content",
    review_text: "content",
    testimonial_text: "content",
    show_hide: "showHide",
    sort_order: "sortOrder",
    order: "sortOrder",
  },
  Faq: {
    faq_question: "question",
    q: "question",
    faq_answer: "answer",
    a: "answer",
    show_hide: "showHide",
    sort_order: "sortOrder",
    schema_markup: "schemaMarkup",
  },
  TeamMember: {
    member_name: "name",
    job_title: "role",
    position: "role",
    designation: "role",
    avatar: "photo",
    image: "photo",
    biography: "bio",
    links: "socialLinks",
    sort_order: "sortOrder",
    order: "sortOrder",
  },
  Page: {
    page_title: "title",
    page_slug: "slug",
    page_status: "status",
    seo_title: "seoTitle",
    meta_title: "seoTitle",
    seo_description: "seoDescription",
    meta_description: "seoDescription",
    og_image: "ogImage",
    canonical: "canonicalUrl",
  },
  LegalPage: {
    legal_type: "type",
    page_type: "type",
    document_type: "type",
    legal_content: "content",
    html: "content",
    body: "content",
    is_published: "published",
  },
  Category: {
    category_name: "name",
    cat_name: "name",
    category_slug: "slug",
  },
  Tag: {
    tag_name: "name",
    tag_slug: "slug",
  },
};

// ---------------------------------------------------------------------------
// Required fields per model (for validation)
// ---------------------------------------------------------------------------
export const REQUIRED_FIELDS = {
  Post: ["title", "slug"],
  Magazine: ["title", "slug"],
  Recipe: ["title", "ingredients", "steps"],
  Service: ["title"],
  Testimonial: ["clientName", "content"],
  Faq: ["question", "answer"],
  TeamMember: ["name", "role"],
  Page: ["title", "slug"],
  LegalPage: ["type", "title", "content"],
  Category: ["name", "slug"],
  Tag: ["name", "slug"],
};

// Fields that the system auto-injects and should be stripped from source data
const SYSTEM_FIELDS = ["__tableName", "__targetModel", "_type", "type", "id", "createdAt", "updatedAt"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Unescape common HTML entities e.g. &amp; → &
 * @param {any} str
 * @returns {string}
 */
export function decodeHtmlEntities(str) {
  if (!str) return "";
  const text = typeof str === "string" ? str : String(str);
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#8211;/g, "-")
    .replace(/&#8217;/g, "'")
    .trim();
}

/**
 * Safely extract a string value from a primitive or fast-xml-parser object.
 * @param {any} item
 * @returns {string}
 */
export function extractStringValue(item) {
  if (item === null || item === undefined) return "";
  if (typeof item === "string") return item.trim();
  if (typeof item === "number" || typeof item === "boolean") return String(item);
  if (typeof item === "object") {
    if (Array.isArray(item)) {
      return item.map(extractStringValue).filter(Boolean).join(" ");
    }
    const val =
      item["#text"] ??
      item["cdata"] ??
      item["__cdata"] ??
      item.text ??
      item.value ??
      item.name ??
      item.title ??
      item["@_nicename"] ??
      item.nicename ??
      item.slug ??
      "";
    if (typeof val === "object") return extractStringValue(val);
    return String(val).trim();
  }
  return String(item).trim();
}

/**
 * Slugify a string or item object.
 * @param {any} str
 * @returns {string}
 */
export function slugify(str) {
  const text = extractStringValue(str);
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ---------------------------------------------------------------------------
// Column sanitization helpers — enforces MySQL column size limits
// ---------------------------------------------------------------------------

/**
 * Strip HTML tags, collapse whitespace, and cap a string to maxLen chars.
 * Returns null if the result is empty.
 * @param {any} val
 * @param {number} maxLen
 * @returns {string|null}
 */
function stripAndTrunc(val, maxLen) {
  if (val === null || val === undefined) return null;
  let s = typeof val === "string" ? val : String(val);
  // Strip HTML tags
  if (s.includes("<")) s = s.replace(/<[^>]+>/g, " ");
  // Collapse whitespace
  s = s.replace(/\s+/g, " ").trim();
  if (!s) return null;
  return s.length > maxLen ? s.slice(0, maxLen - 3) + "..." : s;
}

/**
 * Hard-truncate a plain string (no HTML stripping) to maxLen.
 * Returns null if empty.
 * @param {any} val
 * @param {number} maxLen
 * @returns {string|null}
 */
function trunc(val, maxLen) {
  if (val === null || val === undefined) return null;
  const s = typeof val === "string" ? val.trim() : String(val).trim();
  if (!s) return null;
  return s.length > maxLen ? s.slice(0, maxLen - 3) + "..." : s;
}

/**
 * Map a source column name to the Prisma field name for a given model.
 * @param {string} sourceCol
 * @param {string} targetModel
 * @returns {string} - Prisma field name or original sourceCol if no mapping found
 */
function resolveFieldName(sourceCol, targetModel) {
  if (!sourceCol) return "";
  const str = extractStringValue(sourceCol);
  const aliases = FIELD_ALIASES[targetModel] || {};
  const cleanStr = str.toLowerCase().replace(/[^a-z0-9]/g, "");

  for (const [alias, field] of Object.entries(aliases)) {
    const cleanAlias = String(alias).toLowerCase().replace(/[^a-z0-9]/g, "");
    if (cleanAlias === cleanStr) return field;
  }

  // Fallback pattern matching for XML / exported columns
  if (targetModel === "Post" || targetModel === "Page" || targetModel === "Service") {
    if (cleanStr.includes("content") || cleanStr.includes("body")) return "content";
    if (cleanStr.includes("excerpt") || cleanStr.includes("summary") || cleanStr.includes("description")) return "excerpt";
    if (cleanStr.includes("postname") || cleanStr.includes("postslug")) return "slug";
    if (cleanStr.includes("posttitle")) return "title";
    if (cleanStr.includes("attachmenturl") || cleanStr.includes("featuredimage") || cleanStr.includes("coverimage")) return "ogImage";
  }

  return str; // pass through unchanged
}

// ---------------------------------------------------------------------------
// buildFieldMap
// ---------------------------------------------------------------------------

/**
 * Build a field mapping from source columns to Prisma model fields.
 *
 * @param {string} targetModel - e.g. "Post"
 * @param {string[]} sourceColumns - column names from the parsed file
 * @returns {{
 *   mapped: Record<string, string>,    // sourceCol → prismaField
 *   unmapped: string[],                // source cols with no mapping
 *   missing: string[],                 // required prisma fields not covered
 * }}
 */
export function buildFieldMap(targetModel, sourceColumns) {
  const mapped = {};
  const coveredPrismaFields = new Set();

  for (const srcCol of sourceColumns) {
    if (SYSTEM_FIELDS.includes(srcCol)) continue;
    const prismaField = resolveFieldName(srcCol, targetModel);
    mapped[srcCol] = prismaField;
    coveredPrismaFields.add(prismaField);
  }

  const required = REQUIRED_FIELDS[targetModel] || [];
  const missing = required.filter((f) => !coveredPrismaFields.has(f));
  const unmapped = Object.entries(mapped)
    .filter(([, v]) => v === Object.keys(mapped).find((k) => mapped[k] === v))
    .filter(([src]) => !FIELD_ALIASES[targetModel]?.[String(src).toLowerCase()])
    .map(([src]) => src)
    .filter((src) => !required.includes(mapped[src]));

  return { mapped, unmapped, missing };
}

// ---------------------------------------------------------------------------
// applyMapping
// ---------------------------------------------------------------------------

function isCategoryOrTagObject(val) {
  if (Array.isArray(val)) {
    return val.some((item) => item && typeof item === "object");
  }
  return val && typeof val === "object";
}

/**
 * Apply a field map to a raw record, producing a normalized row.
 * Strips system fields, renames keys, and strips undefined values.
 *
 * @param {Record<string, any>} rawData
 * @param {Record<string, string>} fieldMap - sourceCol → prismaField
 * @returns {Record<string, any>}
 */
export function applyMapping(rawData, fieldMap) {
  const result = {};
  for (const [srcKey, prismaKey] of Object.entries(fieldMap)) {
    if (SYSTEM_FIELDS.includes(srcKey)) continue;
    let val = rawData[srcKey];
    if (val === undefined || val === null) continue;

    if ((prismaKey === "categories" || prismaKey === "tags") && isCategoryOrTagObject(val)) {
      if (result[prismaKey] !== undefined) {
        if (Array.isArray(result[prismaKey])) {
          if (Array.isArray(val)) {
            result[prismaKey].push(...val);
          } else {
            result[prismaKey].push(val);
          }
        } else {
          result[prismaKey] = Array.isArray(val) ? [result[prismaKey], ...val] : [result[prismaKey], val];
        }
      } else {
        result[prismaKey] = val;
      }
      continue;
    }

    const extracted = extractStringValue(val);
    if (extracted !== "") {
      if (result[prismaKey] !== undefined) {
        if (Array.isArray(result[prismaKey])) {
          result[prismaKey].push(extracted);
        }
      } else {
        result[prismaKey] = extracted;
      }
    }
  }

  // Robust fallback scan: extract content, excerpt, slug, title, ogImage, & categories/tags directly from uploaded raw keys
  for (const [key, val] of Object.entries(rawData)) {
    if (SYSTEM_FIELDS.includes(key) || val === undefined || val === null) continue;

    const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    if ((cleanKey.includes("category") || cleanKey.includes("tag")) && isCategoryOrTagObject(val)) {
      const prismaKey = cleanKey.includes("tag") ? "tags" : "categories";
      if (!result[prismaKey]) {
        result[prismaKey] = val;
      }
      continue;
    }

    const extracted = extractStringValue(val);
    if (!extracted) continue;

    if (!result.content && (cleanKey.includes("content") || cleanKey.includes("encoded") || cleanKey.includes("body") || cleanKey.includes("article"))) {
      result.content = extracted;
    }
    if (!result.excerpt && (cleanKey.includes("excerpt") || cleanKey.includes("summary") || cleanKey.includes("description") || cleanKey.includes("caption"))) {
      result.excerpt = extracted;
    }
    if (!result.slug && (cleanKey.includes("wppostname") || cleanKey.includes("postslug") || cleanKey.includes("slug"))) {
      result.slug = extracted;
    }
    if (!result.ogImage && (cleanKey.includes("attachmenturl") || cleanKey.includes("featuredimage") || cleanKey.includes("coverimage") || cleanKey.includes("thumbnail"))) {
      if (extracted.startsWith("http") || extracted.startsWith("/")) {
        result.ogImage = extracted;
      }
    }
    if (!result.title && (cleanKey.includes("posttitle") || cleanKey === "title")) {
      result.title = extracted;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Auto-create relations
// ---------------------------------------------------------------------------

/**
 * For a given normalized row, auto-create Category and Tag records
 * (scoped to siteId) and replace name-based values with IDs.
 *
 * @param {string} siteId
 * @param {string} targetModel
 * @param {Record<string, any>} row  - after applyMapping
 * @param {Object} tx                - Prisma transaction client
 * @param {string} defaultCategory   - Optional default category name
 * @returns {Promise<Record<string, any>>} - row with relation IDs resolved
 */
export async function autoCreateRelations(siteId, targetModel, row, tx, defaultCategory = null, readOnly = false) {
  const result = { ...row };
  const client = tx || prisma;

  if (targetModel === "Post") {
    // Resolve authorId
    if (result.authorId) {
      try {
        const authorMatch = await client.user.findFirst({
          where: {
            OR: [
              { id: String(result.authorId) },
              { email: String(result.authorId) },
              { name: String(result.authorId) },
            ]
          },
          select: { id: true }
        });
        if (authorMatch) {
          result.authorId = authorMatch.id;
        } else {
          delete result.authorId;
        }
      } catch (e) {
        delete result.authorId;
      }
    }

    let rawCats = result.categories;
    let rawTags = result.tags;

    const catNames = [];
    const tagNames = [];

    if (defaultCategory) {
      catNames.push(defaultCategory);
    }

    const processItem = (item, defaultIsTag = false) => {
      if (!item) return;
      if (Array.isArray(item)) {
        item.forEach((i) => processItem(i, defaultIsTag));
        return;
      }
      if (typeof item === "object") {
        const domain = item["@_domain"] || item.domain || item["@_nicename"] || item.nicename;
        const name = extractStringValue(item);
        if (!name) return;
        if (domain === "post_tag" || (defaultIsTag && domain !== "category")) {
          tagNames.push(name);
        } else {
          catNames.push(name);
        }
      } else {
        const str = String(item).trim();
        if (!str) return;
        str.split(/[,;|]/).forEach((s) => {
          const trimmed = s.trim();
          if (trimmed) {
            if (defaultIsTag) {
              tagNames.push(trimmed);
            } else {
              catNames.push(trimmed);
            }
          }
        });
      }
    };

    if (rawCats) processItem(rawCats, false);
    if (rawTags) processItem(rawTags, true);

    if (catNames.length > 0) {
      const allSiteCats = await client.category.findMany({
        where: { siteId },
        select: { id: true, name: true, slug: true, deletedAt: true },
      });

      const catIds = [];
      const uniqueCatNames = [...new Set(catNames)].map(decodeHtmlEntities).filter(Boolean);

      for (const cleanName of uniqueCatNames) {
        const targetSlug = slugify(cleanName);

        // Case-insensitive in-memory match against existing site categories
        let existing = allSiteCats.find((c) => {
          const dbName = decodeHtmlEntities(c.name).toLowerCase();
          const dbSlug = String(c.slug || "").toLowerCase();
          return dbName === cleanName.toLowerCase() || (targetSlug && dbSlug === targetSlug);
        });

        if (!existing) {
          existing = await client.category.findFirst({
            where: {
              siteId,
              OR: [{ name: cleanName }, { slug: targetSlug }],
            },
            select: { id: true, name: true, slug: true, deletedAt: true },
          });
        }

        if (existing) {
          if (!readOnly && existing.deletedAt !== null) {
            await client.category.update({
              where: { id: existing.id },
              data: { deletedAt: null },
            });
          }
          catIds.push(existing.id);
        } else if (!readOnly) {
          try {
            const cat = await client.category.create({
              data: { siteId, name: cleanName, slug: targetSlug || `cat-${Date.now()}` },
              select: { id: true, name: true, slug: true, deletedAt: true },
            });
            allSiteCats.push(cat);
            catIds.push(cat.id);
          } catch (e) {
            const fallback = await client.category.findFirst({
              where: { siteId, OR: [{ name: cleanName }, { slug: targetSlug }] },
              select: { id: true },
            });
            if (fallback?.id) catIds.push(fallback.id);
          }
        } else {
          catIds.push(`preview-cat-${cleanName}`);
        }
      }
      result.categories = catIds.filter(Boolean);
    } else {
      delete result.categories;
    }

    if (tagNames.length > 0) {
      const allSiteTags = await client.tag.findMany({
        where: { siteId },
        select: { id: true, name: true, slug: true, deletedAt: true },
      });

      const tagIds = [];
      const uniqueTagNames = [...new Set(tagNames)].map(decodeHtmlEntities).filter(Boolean);

      for (const cleanName of uniqueTagNames) {
        const targetSlug = slugify(cleanName);

        let existing = allSiteTags.find((t) => {
          const dbName = decodeHtmlEntities(t.name).toLowerCase();
          const dbSlug = String(t.slug || "").toLowerCase();
          return dbName === cleanName.toLowerCase() || (targetSlug && dbSlug === targetSlug);
        });

        if (!existing) {
          existing = await client.tag.findFirst({
            where: {
              siteId,
              OR: [{ name: cleanName }, { slug: targetSlug }],
            },
            select: { id: true, name: true, slug: true, deletedAt: true },
          });
        }

        if (existing) {
          if (!readOnly && existing.deletedAt !== null) {
            await client.tag.update({
              where: { id: existing.id },
              data: { deletedAt: null },
            });
          }
          tagIds.push(existing.id);
        } else if (!readOnly) {
          try {
            const tag = await client.tag.create({
              data: { siteId, name: cleanName, slug: targetSlug || `tag-${Date.now()}` },
              select: { id: true, name: true, slug: true, deletedAt: true },
            });
            allSiteTags.push(tag);
            tagIds.push(tag.id);
          } catch (e) {
            const fallback = await client.tag.findFirst({
              where: { siteId, OR: [{ name: cleanName }, { slug: targetSlug }] },
              select: { id: true },
            });
            if (fallback?.id) tagIds.push(fallback.id);
          }
        } else {
          tagIds.push(`preview-tag-${cleanName}`);
        }
      }
      result.tags = tagIds.filter(Boolean);
    } else {
      delete result.tags;
    }

  }

  if (readOnly) return result;

  // ---------------------------------------------------------------------------
  // Generic S3 Media Re-hosting Pipeline (Images, PDFs, Videos, Audio)
  // ---------------------------------------------------------------------------
  const checkLocalDiskUrl = (fileName) => {
    try {
      const fs = require("fs");
      const path = require("path");
      const localPath = path.join(process.cwd(), "public", "uploads", `site-${siteId}`, fileName);
      if (fs.existsSync(localPath)) {
        return `/uploads/site-${siteId}/${fileName}`;
      }
    } catch { }
    return null;
  };

  const isInternalUrl = (u) => {
    if (!u || typeof u !== "string") return false;
    return (
      u.startsWith("/uploads/") ||
      u.startsWith("/api/media") ||
      u.includes("localhost:9000") ||
      u.includes("127.0.0.1:9000") ||
      u.includes("ahp-media") ||
      u.includes(".s3.") ||
      u.includes("s3.amazonaws.com")
    );
  };

  const rehostMedia = async (rawUrl, isImage = true, fallbackMime = "image/jpeg") => {
    if (!rawUrl || typeof rawUrl !== "string") return null;
    const cleanUrl = rawUrl.replace(/\\/g, "").trim();
    if (!cleanUrl) return null;

    // If URL is already re-hosted to our internal S3 or local uploads, return as-is
    if (isInternalUrl(cleanUrl)) {
      return { id: null, url: cleanUrl };
    }

    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) return null;

    try {
      const rawFileName = cleanUrl.split("/").pop()?.split("?")[0] || (isImage ? "media.jpg" : "file.pdf");
      const fileName = rawFileName.length > 100 ? rawFileName.slice(-100) : rawFileName;
      const localDiskUrl = checkLocalDiskUrl(fileName);

      // Search for existing record by URL or original filename
      let existing = await client.media.findFirst({
        where: { siteId, OR: [{ url: cleanUrl }, { originalName: fileName }], deletedAt: null },
        select: { id: true, url: true }
      });

      // If existing record already has internal S3/local URL, use it immediately
      if (existing && isInternalUrl(existing.url)) {
        return existing;
      }

      let finalS3Url = localDiskUrl;

      // Download from external website and upload to S3 bucket
      try {
        const resp = await fetch(cleanUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "*/*"
          },
          signal: AbortSignal.timeout(isImage ? 30000 : 120000)
        });

        if (resp.ok) {
          const contentType = (resp.headers.get("content-type") || "").toLowerCase();

          // Reject HTML pages (e.g. blog permalink or 404 page) from being saved as media
          if (contentType.includes("text/html") || contentType.includes("text/plain")) {
            console.warn(`[Import Media] Skipped non-media HTML URL ${cleanUrl} (${contentType})`);
            return null;
          }

          const arrayBuf = await resp.arrayBuffer();
          const buffer = Buffer.from(arrayBuf);
          const uploaded = await mediaService.uploadMedia(siteId, buffer, fileName, contentType || fallbackMime);
          if (uploaded?.url) {
            return uploaded;
          }
        }
      } catch (fetchErr) {
        console.warn(`[Import Media] Could not download external asset ${cleanUrl}:`, fetchErr.message);
      }

      return existing;
    } catch (err) {
      console.warn(`[Import Media] Re-hosting failed for ${rawUrl}:`, err.message);
      return null;
    }
  };

  const tasks = [];

  // Task 1: Main Image / Featured Image Re-hosting
  tasks.push((async () => {
    let imageSourceUrl = extractStringValue(
      result.ogImage ||
      result.featuredImage ||
      result.image ||
      result.imageUrl ||
      result.coverImage ||
      result.photo ||
      result.clientImage ||
      result.thumbnail ||
      result.attachment_url ||
      ""
    ).replace(/\\/g, "").trim();

    if (!imageSourceUrl && (result.content || result.contentJson)) {
      const bodyText = String(result.content || result.contentJson || "");
      const match = bodyText.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (match && match[1]) {
        imageSourceUrl = match[1].replace(/\\/g, "").trim();
      }
    }

    if (imageSourceUrl && client.media) {
      const mediaRecord = await rehostMedia(imageSourceUrl, true, "image/jpeg");
      if (mediaRecord) {
        result.featuredImageId = mediaRecord.id;
        if (targetModel === "Post") result.ogImage = mediaRecord.url;
        if (targetModel === "Magazine") result.coverImage = mediaRecord.url;
        if (targetModel === "Recipe") result.imageUrl = mediaRecord.url;
        if (targetModel === "Service") result.featuredImageId = mediaRecord.id;
        if (targetModel === "Testimonial") result.clientImage = mediaRecord.url;
        if (targetModel === "TeamMember") result.photo = mediaRecord.url;

        // Replace inline image URLs in HTML body content
        if (result.content || result.contentJson) {
          const storedUrl = mediaRecord.url;
          if (typeof result.content === "string") result.content = result.content.replaceAll(imageSourceUrl, storedUrl);
          if (typeof result.contentJson === "string") result.contentJson = result.contentJson.replaceAll(imageSourceUrl, storedUrl);
        }
      }
    }
  })());

  // Task 2: PDF Document Re-hosting for Magazine / Documents (Only if link is a direct PDF)
  const rawPdfCandidate = extractStringValue(result.magCloudLink || (result.pdfUrl || (result.link && result.link.toLowerCase().includes(".pdf") ? result.link : ""))).replace(/\\/g, "").trim();
  if (rawPdfCandidate && (rawPdfCandidate.startsWith("http://") || rawPdfCandidate.startsWith("https://")) && client.media) {
    tasks.push((async () => {
      const pdfRecord = await rehostMedia(rawPdfCandidate, false, "application/pdf");
      if (pdfRecord) {
        result.magCloudLink = pdfRecord.url;
        if (targetModel === "Magazine") result.pdfUrl = pdfRecord.url;
      }
    })());
  }

  // Task 3: Video / Audio Media Re-hosting
  if ((result.videoUrl || result.video_url || result.video) && client.media) {
    tasks.push((async () => {
      const videoUrl = extractStringValue(result.videoUrl || result.video_url || result.video || "").replace(/\\/g, "").trim();
      if (videoUrl && (videoUrl.startsWith("http://") || videoUrl.startsWith("https://"))) {
        const videoRecord = await rehostMedia(videoUrl, false, "video/mp4");
        if (videoRecord) {
          result.videoUrl = videoRecord.url;
        }
      }
    })());
  }

  await Promise.all(tasks);

  return result;
}

// ---------------------------------------------------------------------------
// Per-model Prisma create/update data builders
// ---------------------------------------------------------------------------

/**
 * Build Prisma create/update data for a target model from a normalized row.
 *
 * @param {string} targetModel
 * @param {string} siteId
 * @param {Record<string, any>} row - after applyMapping + autoCreateRelations
 * @returns {{ createData: Record<string,any>, updateData: Record<string,any> }}
 */
export function buildPrismaData(targetModel, siteId, row) {
  switch (targetModel) {
    case "Post": {
      // Normalize status
      let status = "DRAFT";
      if (row.status) {
        const s = String(row.status).toLowerCase();
        if (s === "publish" || s === "published") status = "PUBLISHED";
        else if (s === "future" || s === "scheduled") status = "SCHEDULED";
        else if (s === "draft") status = "DRAFT";
        else status = String(row.status).toUpperCase();
      }

      let rawContent = row.content || null;
      let contentJson = row.contentJson || null;
      let contentObj = null;

      if (typeof rawContent === "string") {
        contentJson = rawContent;
        try {
          contentObj = JSON.parse(rawContent);
        } catch {
          contentObj = rawContent.trim() ? { type: "html", version: 1, html: rawContent } : null;
        }
      } else if (rawContent && typeof rawContent === "object") {
        contentObj = rawContent;
        contentJson = JSON.stringify(rawContent);
      }

      let excerpt = row.excerpt ? String(row.excerpt).trim() : "";
      if (!excerpt && contentJson) {
        const plain = String(contentJson).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
        if (plain) {
          excerpt = plain.length > 200 ? plain.slice(0, 197) + "..." : plain;
        }
      }

      const rawTitle = row.title ? String(row.title).trim() : "";
      let title = rawTitle;
      if (!title && (excerpt || contentJson)) {
        const plainText = (excerpt || String(contentJson).replace(/<[^>]+>/g, "")).trim();
        title = plainText ? (plainText.slice(0, 60) + "...") : "";
      }

      const slug = trunc(row.slug ? slugify(row.slug) : slugify(title), 48);

      let seoTitle = (row.seoTitle || title || "").trim();
      if (seoTitle.length > 190) seoTitle = seoTitle.slice(0, 187) + "...";

      let seoDescription = (row.seoDescription || excerpt || "").trim();
      if (seoDescription.includes("<")) {
        seoDescription = seoDescription.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
      }
      if (seoDescription.length > 190) {
        seoDescription = seoDescription.slice(0, 187) + "...";
      }

      const createData = {
        siteId,
        title: trunc(title, 191),
        slug: trunc(slug, 48),
        content: contentObj,
        contentJson: contentJson,
        excerpt: excerpt || null,
        status: ["DRAFT", "PUBLISHED", "SCHEDULED"].includes(status) ? status : "DRAFT",
        publishedAt: row.publishedAt ? new Date(row.publishedAt) : (status === "PUBLISHED" ? new Date() : null),
        seoTitle: seoTitle || null,
        seoDescription: seoDescription || null,
        canonicalUrl: trunc(row.canonicalUrl, 191) || null,
        ogImage: trunc(row.ogImage, 191) || null,
        authorId: typeof row.authorId === "string" ? row.authorId : null,
        featuredImageId: row.featuredImageId || null,
        ...(Array.isArray(row.categories) && row.categories.length > 0
          ? { categories: { connect: row.categories.map((id) => ({ id })) } }
          : {}),
        ...(Array.isArray(row.tags) && row.tags.length > 0
          ? { tags: { connect: row.tags.map((id) => ({ id })) } }
          : {}),
      };
      return { createData, updateData: { ...createData } };
    }

    case "Magazine": {
      const slug = trunc(row.slug || slugify(row.title || `magazine-${Date.now()}`), 100) || `magazine-${Date.now()}`;
      const createData = {
        magazineId: trunc(String(row.magazineId || `mag-${Date.now()}`), 100) || `mag-${Date.now()}`,
        title: trunc(row.title || "Untitled", 191) || "Untitled",
        description: stripAndTrunc(row.description || "", 60000) || "No description",
        introduction: stripAndTrunc(row.introduction || null, 60000),
        backImage: trunc(row.backImage || null, 500),
        spineImage: trunc(row.spineImage || null, 500),
        tags: trunc(row.tags || "", 250) || "",
        coverImage: trunc(row.coverImage || "", 500) || "",
        link: trunc(row.link || "", 500) || "",
        magCloudLink: trunc(row.magCloudLink || "", 500) || "",
        slug,
        date: row.date ? new Date(row.date) : new Date(),
        category: trunc(row.category || "General", 100) || "General",
        status: row.status !== undefined ? Number(row.status) : 1,
      };
      return { createData, updateData: { ...createData } };
    }

    case "Recipe": {
      const createData = {
        siteId,
        title: trunc(row.title || "Untitled", 191),
        description: stripAndTrunc(row.description || null, 60000),
        ingredients: Array.isArray(row.ingredients)
          ? row.ingredients
          : [{ item: String(row.ingredients || ""), amount: "" }],
        steps: Array.isArray(row.steps)
          ? row.steps
          : [{ step: String(row.steps || ""), instruction: "" }],
        cookingTime: row.cookingTime ? Number(row.cookingTime) : null,
        calories: row.calories ? Number(row.calories) : null,
        difficulty: trunc(row.difficulty || null, 100),
        imageUrl: trunc(row.imageUrl || null, 60000),
        status: row.status || "PENDING",
        contributorId: row.contributorId,
        protein: row.protein ? Number(row.protein) : null,
        carbs: row.carbs ? Number(row.carbs) : null,
        fiber: row.fiber ? Number(row.fiber) : null,
        fat: row.fat ? Number(row.fat) : null,
        sugar: row.sugar ? Number(row.sugar) : null,
      };
      return { createData, updateData: { ...createData } };
    }

    case "Service": {
      const slug = trunc(row.slug || slugify(row.title || `service-${Date.now()}`), 100);
      const createData = {
        siteId,
        title: trunc(row.title || "Untitled", 191),
        description: stripAndTrunc(row.description || null, 60000),
        price: trunc(row.price ? String(row.price) : null, 191),
        ctaButtonText: trunc(row.ctaButtonText || null, 191),
        ctaButtonLink: trunc(row.ctaButtonLink || null, 500),
        sortOrder: Number(row.sortOrder) || 0,
        status: row.status || "DRAFT",
        slug: slug || null,
        visible: row.visible !== undefined ? Boolean(row.visible) : true,
      };
      return { createData, updateData: { ...createData } };
    }

    case "Testimonial": {
      const createData = {
        siteId,
        clientName: trunc(row.clientName || "Anonymous", 191),
        clientImage: trunc(row.clientImage || null, 500),
        content: stripAndTrunc(row.content || "", 60000),
        rating: Number(row.rating) || 5,
        showHide: row.showHide !== undefined ? Boolean(row.showHide) : true,
        sortOrder: Number(row.sortOrder) || 0,
      };
      return { createData, updateData: { ...createData } };
    }

    case "Faq": {
      const createData = {
        siteId,
        question: stripAndTrunc(row.question || "", 60000),
        answer: stripAndTrunc(row.answer || "", 60000),
        sortOrder: Number(row.sortOrder) || 0,
        showHide: row.showHide !== undefined ? Boolean(row.showHide) : true,
        schemaMarkup: Boolean(row.schemaMarkup) || false,
      };
      return { createData, updateData: { ...createData } };
    }

    case "TeamMember": {
      const createData = {
        siteId,
        name: trunc(row.name || "Unknown", 191),
        role: trunc(row.role || "Team Member", 191),
        photo: trunc(row.photo || null, 500),
        bio: stripAndTrunc(row.bio || null, 60000),
        socialLinks: row.socialLinks || null,
        sortOrder: Number(row.sortOrder) || 0,
      };
      return { createData, updateData: { ...createData } };
    }

    case "Page": {
      const slug = trunc(row.slug || slugify(row.title || `page-${Date.now()}`), 100);
      const createData = {
        siteId,
        title: trunc(row.title || "Untitled", 191),
        slug,
        status: row.status || "DRAFT",
        seoTitle: trunc(row.seoTitle || null, 190),
        seoDescription: stripAndTrunc(row.seoDescription || null, 190),
        canonicalUrl: trunc(row.canonicalUrl || null, 190),
        ogImage: trunc(row.ogImage || null, 190),
      };
      return { createData, updateData: { ...createData } };
    }

    case "LegalPage": {
      const createData = {
        siteId,
        type: trunc(row.type || "privacy_policy", 100),
        title: trunc(row.title || "Legal Page", 191),
        content: row.content || "",
        contentJson: row.contentJson || null,
        published: Boolean(row.published) || false,
        lastUpdated: new Date(),
      };
      return { createData, updateData: { ...createData } };
    }

    case "Category": {
      const slug = trunc(row.slug || slugify(row.name || `category-${Date.now()}`), 100);
      const createData = { siteId, name: trunc(row.name || "Unnamed", 100), slug };
      return { createData, updateData: {} }; // categories: upsert only
    }

    case "Tag": {
      const slug = trunc(row.slug || slugify(row.name || `tag-${Date.now()}`), 100);
      const createData = { siteId, name: trunc(row.name || "Unnamed", 100), slug };
      return { createData, updateData: {} };
    }

    default:
      return { createData: { siteId, ...row }, updateData: { siteId, ...row } };
  }
}

/**
 * Validate a normalized+built row using model-specific rules.
 * Returns array of error strings (empty = valid).
 *
 * @param {string} targetModel
 * @param {Record<string,any>} createData
 * @returns {string[]}
 */
export function validateRow(targetModel, createData) {
  const errors = [];
  const required = REQUIRED_FIELDS[targetModel] || [];
  const dataFlat = createData;

  for (const field of required) {
    const val = dataFlat[field];
    if (val === undefined || val === null || val === "") {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Model-specific validations
  if (targetModel === "Recipe" && !createData.contributorId) {
    errors.push("Recipe requires contributorId. Set a default contributor in the mapping step.");
  }
  if (targetModel === "Testimonial" && createData.rating !== undefined) {
    const r = Number(createData.rating);
    if (r < 1 || r > 5) errors.push("Rating must be between 1 and 5.");
  }

  return errors;
}
