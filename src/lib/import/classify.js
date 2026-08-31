/**
 * Content-type classifier.
 * Inspects parsed record shape and matches it against known import targets.
 *
 * Detection priority:
 *  1. Explicit hint from the user (100% confidence)
 *  2. Table/root-tag name match against alias registry
 *  3. Fuzzy field-signature scoring (% of required fields present)
 *  4. If confidence < THRESHOLD → returns null targetModel + candidates list
 */
import { IMPORT_CONFIDENCE_THRESHOLD } from "./parsers/types.js";

// ---------------------------------------------------------------------------
// Alias registry: source table/tag names → canonical target model
// ---------------------------------------------------------------------------
export const TABLE_ALIAS_MAP = {
  // Post / Blog
  post: "Post",
  posts: "Post",
  blog: "Post",
  blogs: "Post",
  blog_posts: "Post",
  articles: "Post",
  article: "Post",
  wp_posts: "Post",
  news: "Post",
  // Magazine
  magazine: "Magazine",
  magazines: "Magazine",
  publication: "Magazine",
  // Recipe
  recipe: "Recipe",
  recipes: "Recipe",
  // Service
  service: "Service",
  services: "Service",
  // Testimonial
  testimonial: "Testimonial",
  testimonials: "Testimonial",
  review: "Testimonial",
  reviews: "Testimonial",
  // FAQ
  faq: "Faq",
  faqs: "Faq",
  faq_items: "Faq",
  // TeamMember
  team: "TeamMember",
  team_member: "TeamMember",
  team_members: "TeamMember",
  teammember: "TeamMember",
  teammembers: "TeamMember",
  staff: "TeamMember",
  // Page
  page: "Page",
  pages: "Page",
  // LegalPage
  legalpage: "LegalPage",
  legalpages: "LegalPage",
  legal_page: "LegalPage",
  legal_pages: "LegalPage",
  legal: "LegalPage",
  // Category
  category: "Category",
  categories: "Category",
  // Tag
  tag: "Tag",
  tags: "Tag",
};

// ---------------------------------------------------------------------------
// Field signatures per model
// { required: string[], optional: string[], strong: string[] }
// "strong" fields give extra weight — their presence alone is strongly
// indicative (e.g. "ingredients" only appears in Recipe).
// ---------------------------------------------------------------------------
const MODEL_SIGNATURES = {
  Post: {
    required: ["title", "slug", "content"],
    optional: ["excerpt", "status", "publishedAt", "authorId", "seoTitle", "seoDescription"],
    strong: ["content", "excerpt"],
    nameAliases: [
      "headline", "post_title", "body", "post_content", "post_name",
      "content:encoded", "content_encoded", "content.encoded",
      "excerpt:encoded", "excerpt_encoded", "excerpt.encoded",
      "wp:post_name", "wp_post_name", "wp.post_name",
      "wp:post_date", "wp_post_date", "wp.post_date",
      "wp:status", "wp_status", "wp.status",
      "dc:creator", "dc_creator", "dc.creator"
    ],
  },
  Magazine: {
    required: ["title", "slug"],
    optional: ["magazineId", "coverImage", "description", "tags", "category", "date", "link", "magCloudLink"],
    strong: ["magazineId", "magCloudLink", "magazine_cover_image", "cover_image", "magazine_title", "magazine_description"],
    nameAliases: ["magazine_title", "magazine_id", "magazine_cover_image", "cover_image", "magazine_description", "magazine_link", "mag_cloud_link"],
  },
  Recipe: {
    required: ["title", "ingredients", "steps"],
    optional: ["cookingTime", "calories", "difficulty", "imageUrl", "description"],
    strong: ["ingredients", "steps", "cookingTime", "calories"],
    nameAliases: ["cook_time", "cooking_time", "calorie", "instruction", "instructions"],
  },
  Service: {
    required: ["title", "description"],
    optional: ["price", "ctaButtonText", "ctaButtonLink", "slug", "status"],
    strong: ["price", "ctaButtonText"],
    nameAliases: ["service_title", "service_description"],
  },
  Testimonial: {
    required: ["clientName", "content"],
    optional: ["clientImage", "rating", "showHide", "sortOrder"],
    strong: ["clientName", "rating"],
    nameAliases: ["client_name", "author", "author_name", "quote", "review_text", "testimonial_text"],
  },
  Faq: {
    required: ["question", "answer"],
    optional: ["pageId", "sortOrder", "showHide", "schemaMarkup"],
    strong: ["question", "answer"],
    nameAliases: ["faq_question", "faq_answer", "q", "a"],
  },
  TeamMember: {
    required: ["name", "role"],
    optional: ["photo", "bio", "socialLinks", "sortOrder"],
    strong: ["role", "bio"],
    nameAliases: ["member_name", "job_title", "position", "designation"],
  },
  Page: {
    required: ["title", "slug"],
    optional: ["status", "seoTitle", "seoDescription", "jsonLd", "sections"],
    strong: ["sections", "jsonLd"],
    nameAliases: ["page_title", "page_slug"],
  },
  LegalPage: {
    required: ["type", "title", "content"],
    optional: ["published", "contentJson"],
    strong: ["type"],
    nameAliases: ["legal_type", "page_type", "document_type"],
  },
  Category: {
    required: ["name", "slug"],
    optional: ["siteId"],
    strong: [],
    nameAliases: ["category_name", "cat_name"],
  },
  Tag: {
    required: ["name", "slug"],
    optional: ["siteId"],
    strong: [],
    nameAliases: ["tag_name"],
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Normalize a field name: lowercase, strip underscores/hyphens/dots.
 * @param {string} name
 * @returns {string}
 */
function normalizeFieldName(name) {
  return name.toLowerCase().replace(/[_\-. ]/g, "");
}

/**
 * Check if a source field (normalized) matches a target field or any of its aliases.
 * @param {string} srcNormalized
 * @param {string} targetField
 * @param {string[]} [aliases]
 * @returns {boolean}
 */
function fieldMatches(srcNormalized, targetField, aliases = []) {
  const targetNorm = normalizeFieldName(targetField);
  if (srcNormalized === targetNorm) return true;
  for (const alias of aliases) {
    if (srcNormalized === normalizeFieldName(alias)) return true;
  }
  return false;
}

/**
 * Score how well a set of source column names matches a model signature.
 * @param {string[]} sourceColumns
 * @param {string} modelName
 * @returns {{ score: number, matchedRequired: string[], missingRequired: string[] }}
 */
function scoreModel(sourceColumns, modelName) {
  const sig = MODEL_SIGNATURES[modelName];
  if (!sig) return { score: 0, matchedRequired: [], missingRequired: [] };

  const normalizedSrc = sourceColumns.map(normalizeFieldName);

  const matchedRequired = [];
  const missingRequired = [];
  let strongBonus = 0;

  for (const req of sig.required) {
    const reqNorm = normalizeFieldName(req);
    const found = normalizedSrc.some((s) => fieldMatches(s, req, sig.nameAliases));
    if (found) matchedRequired.push(req);
    else missingRequired.push(req);
  }

  for (const strong of sig.strong) {
    const found = normalizedSrc.some((s) => fieldMatches(s, strong, sig.nameAliases));
    if (found) strongBonus += 0.1; // 10% per strong field
  }

  // Base score = fraction of required fields matched
  const requiredScore = sig.required.length > 0
    ? matchedRequired.length / sig.required.length
    : 0.5; // no required fields → neutral

  // Optional bonus (max 15%)
  const matchedOptional = sig.optional.filter((opt) =>
    normalizedSrc.some((s) => fieldMatches(s, opt, sig.nameAliases))
  );
  const optionalBonus = sig.optional.length > 0
    ? (matchedOptional.length / sig.optional.length) * 0.15
    : 0;

  const score = Math.min(1, requiredScore + optionalBonus + strongBonus);
  return { score, matchedRequired, missingRequired };
}

// ---------------------------------------------------------------------------
// Main classification function
// ---------------------------------------------------------------------------

/**
 * Classify a set of parsed records into the most likely target model.
 *
 * @param {Object} params
 * @param {import('./parsers/types.js').RawRecord[]} params.records - first N parsed rows
 * @param {string} [params.hint]          - user-provided model hint (e.g. "Post")
 * @param {string} [params.tableName]     - source table/tag name (from SQL/XML)
 * @param {string} [params.format]        - detected format: "csv"|"json"|"xml"|"sql"
 * @returns {{
 *   targetModel: string|null,
 *   confidence: number,
 *   candidates: Array<{model: string, score: number}>,
 *   matchedRequired: string[],
 *   missingRequired: string[],
 *   suggestedFields: Record<string, string>
 * }}
 */
export function classifyRecords({ records, hint, tableName, format }) {
  // --- Step 0: Parser-injected model override (e.g. 3D FlipBook → Magazine) ---
  const injectedModel = records[0]?.data?.__targetModel;
  if (injectedModel && MODEL_SIGNATURES[injectedModel]) {
    return {
      targetModel: injectedModel,
      confidence: 1.0,
      candidates: [{ model: injectedModel, score: 1.0 }],
      matchedRequired: MODEL_SIGNATURES[injectedModel].required,
      missingRequired: [],
      suggestedFields: {},
    };
  }

  // --- Step 1: Explicit user hint (100%) ---
  if (hint && MODEL_SIGNATURES[hint]) {
    return {
      targetModel: hint,
      confidence: 1.0,
      candidates: [{ model: hint, score: 1.0 }],
      matchedRequired: MODEL_SIGNATURES[hint].required,
      missingRequired: [],
      suggestedFields: {},
    };
  }

  // --- Step 2: Table/root-tag alias match ---
  if (tableName) {
    const normalized = tableName.toLowerCase().replace(/[^a-z0-9_]/g, "");
    const aliasMatch = TABLE_ALIAS_MAP[normalized];
    if (aliasMatch) {
      return {
        targetModel: aliasMatch,
        confidence: 0.95,
        candidates: [{ model: aliasMatch, score: 0.95 }],
        matchedRequired: MODEL_SIGNATURES[aliasMatch]?.required || [],
        missingRequired: [],
        suggestedFields: {},
      };
    }
  }

  // --- Also check __tableName injected by SQL parser ---
  const tableHint = records[0]?.data?.__tableName;
  if (tableHint) {
    const normalized = tableHint.toLowerCase().replace(/[^a-z0-9_]/g, "");
    const aliasMatch = TABLE_ALIAS_MAP[normalized];
    if (aliasMatch) {
      return {
        targetModel: aliasMatch,
        confidence: 0.9,
        candidates: [{ model: aliasMatch, score: 0.9 }],
        matchedRequired: MODEL_SIGNATURES[aliasMatch]?.required || [],
        missingRequired: [],
        suggestedFields: {},
      };
    }
  }

  // Check WordPress WXR export indicators in record data
  const sampleData = records[0]?.data || {};
  const sampleKeys = Object.keys(sampleData);
  const isWxr = sampleKeys.some((k) =>
    ["content:encoded", "content_encoded", "content.encoded", "wp:post_name", "wp_post_name", "wp.post_name"].includes(k)
  );

  if (isWxr) {
    const postTypeKey = sampleKeys.find((k) => ["wp:post_type", "wp_post_type", "wp.post_type"].includes(k));
    const wpPostType = postTypeKey ? String(sampleData[postTypeKey]).toLowerCase() : "post";

    let targetModel = "Post";
    if (wpPostType === "page") targetModel = "Page";

    return {
      targetModel,
      confidence: 1.0,
      candidates: [{ model: targetModel, score: 1.0 }],
      matchedRequired: MODEL_SIGNATURES[targetModel]?.required || [],
      missingRequired: [],
      suggestedFields: {},
    };
  }

  // Check _type / type field in records
  const typeField = records[0]?.data?._type || records[0]?.data?.type;
  if (typeField && typeof typeField === "string") {
    const normalized = typeField.toLowerCase().replace(/[^a-z]/g, "");
    const aliasMatch = TABLE_ALIAS_MAP[normalized];
    if (aliasMatch) {
      return {
        targetModel: aliasMatch,
        confidence: 0.9,
        candidates: [{ model: aliasMatch, score: 0.9 }],
        matchedRequired: MODEL_SIGNATURES[aliasMatch]?.required || [],
        missingRequired: [],
        suggestedFields: {},
      };
    }
  }

  // --- Step 3: Fuzzy field-signature scoring ---
  if (!records || records.length === 0) {
    return { targetModel: null, confidence: 0, candidates: [], matchedRequired: [], missingRequired: [], suggestedFields: {} };
  }

  // Collect all unique source columns across first few rows
  const sourceColumns = new Set();
  for (const record of records.slice(0, 10)) {
    Object.keys(record.data).forEach((k) => {
      if (k !== "__tableName") sourceColumns.add(k);
    });
  }
  const srcCols = Array.from(sourceColumns);

  const scored = Object.keys(MODEL_SIGNATURES).map((modelName) => {
    const { score, matchedRequired, missingRequired } = scoreModel(srcCols, modelName);
    return { model: modelName, score, matchedRequired, missingRequired };
  });

  scored.sort((a, b) => b.score - a.score);

  const best = scored[0];

  // --- Step 4: Confidence threshold ---
  if (best.score < IMPORT_CONFIDENCE_THRESHOLD) {
    return {
      targetModel: null,
      confidence: best.score,
      candidates: scored.slice(0, 3),
      matchedRequired: best.matchedRequired,
      missingRequired: best.missingRequired,
      suggestedFields: {},
    };
  }

  return {
    targetModel: best.model,
    confidence: best.score,
    candidates: scored.slice(0, 3),
    matchedRequired: best.matchedRequired,
    missingRequired: best.missingRequired,
    suggestedFields: {},
  };
}

export { MODEL_SIGNATURES };
