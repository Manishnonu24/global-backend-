import { getPageContent } from "./pageContent";
import { getDefaultSiteId } from "./siteResolver";

/**
 * Loads template content from the database, deep-merged over defaults,
 * and validated against an optional Zod schema.
 * Never throws an error; always falls back to defaults on failure or DB downtime.
 *
 * @param {Object} options
 * @param {string} [options.siteId] - The site ID (defaults to getDefaultSiteId())
 * @param {string} options.templateKey - The route slug / template key (e.g. "/", "/about")
 * @param {Object} options.defaults - Default content object
 * @param {import("zod").ZodType} [options.schema] - Optional Zod schema for validation
 * @returns {Promise<Object>} Validated content object
 */
export async function getTemplateContent({
  siteId,
  templateKey,
  defaults = {},
  schema,
}) {
  const resolvedSiteId = siteId || getDefaultSiteId();

  try {
    const rawContent = await getPageContent(
      resolvedSiteId,
      templateKey,
      defaults,
    );

    if (schema && typeof schema.safeParse === "function") {
      const parsed = schema.safeParse(rawContent);
      if (parsed.success) {
        return parsed.data;
      }

      console.warn(
        `[getTemplateContent] Schema validation failed for "${templateKey}". Falling back to defaults.`,
        parsed.error.issues || parsed.error.errors,
      );

      // Validate defaults as fallback
      const defParsed = schema.safeParse(defaults);
      return defParsed.success ? defParsed.data : defaults;
    }

    return rawContent;
  } catch (error) {
    console.error(
      `[getTemplateContent] Error loading template content for "${templateKey}":`,
      error,
    );
    return defaults; // Guaranteed safe fallback
  }
}
