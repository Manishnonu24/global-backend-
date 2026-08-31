// src/lib/pageCapabilities.js
/**
 * Centralised capability matrix for page types.
 * The matrix is derived from the page object, not just pageType.
 * It respects `supportsCmsSections`, `isDynamic`, and `isHardcoded` metadata.
 *
 * isHardcoded is informational only — it does NOT grant or restrict editing.
 */
import { isDynamicRoutePattern, resolvePagePreviewPath } from "./routeClassification";

/**
 * Compute capabilities for a given page.
 *
 * Policies:
 *   SYSTEM (source-managed routes) – no edit capabilities, preview always allowed.
 *   CODE_TEMPLATE – content and SEO editing allowed; structure, title, slug, template key forbidden.
 *   CMS_BUILT – edit capabilities depend on `supportsCmsSections` flag (true by default).
 */
export function getPageCapabilities(page) {
  const { pageType, supportsCmsSections = true, isDynamic = false } = page || {};
  const slug = page?.slug || page?.sourceRoute;
  const isDynamicPattern = isDynamicRoutePattern(slug);

  const base = {
    SYSTEM: {
      canEditSeo: false,
      canEditMetadata: false,
      canEditContent: false,
      canAddSections: false,
      canDeleteSections: false,
      canReorderSections: false,
      canHideSections: false,
      canDuplicateSections: false,
      canPublish: false,
      canDisable: false,
      canSoftDelete: false,
      canEditSlug: false,
      canPreview: resolvePagePreviewPath(page) !== null,
      canConfigurePreview: isDynamic === true,
    },
    // CODE_TEMPLATE: content and SEO editing allowed — structural, title, slug, template changes forbidden
    CODE_TEMPLATE: {
      canEditSeo: true,        // SEO fields (seoTitle, seoDescription, canonicalUrl, ogImage, jsonLd) are editable
      canEditMetadata: false,   // title, templateKey are fixed for code templates
      canEditContent: true,     // section content is editable
      canAddSections: false,    // section order is fixed by the template
      canDeleteSections: false,
      canReorderSections: false,
      canHideSections: false,
      canDuplicateSections: false,
      canEditRawJson: false,
      canPublish: true,         // can publish content & SEO changes
      canDisable: false,        // template pages are always on
      canSoftDelete: false,
      canEditSlug: false,       // slugs are fixed for code templates
      canPreview: resolvePagePreviewPath(page) !== null,
      canConfigurePreview: false,
    },
    CMS_BUILT: {
      canEditSeo: true,
      canEditMetadata: true,
      canEditContent: supportsCmsSections !== false,
      canAddSections: supportsCmsSections !== false,
      canDeleteSections: supportsCmsSections !== false,
      canReorderSections: supportsCmsSections !== false,
      canHideSections: supportsCmsSections !== false,
      canDuplicateSections: supportsCmsSections !== false,
      canPublish: true,
      canDisable: true,
      canSoftDelete: true,
      canEditSlug: true,
      canPreview: resolvePagePreviewPath(page) !== null,
      canConfigurePreview: isDynamic === true,
    },
  };

  // Unknown types fail safely (no edit capabilities)
  const caps = base[pageType] || {
    canEditSeo: false,
    canEditMetadata: false,
    canEditContent: false,
    canAddSections: false,
    canDeleteSections: false,
    canReorderSections: false,
    canHideSections: false,
    canDuplicateSections: false,
    canPublish: false,
    canDisable: false,
    canSoftDelete: false,
    canEditSlug: false,
    canPreview: resolvePagePreviewPath(page) !== null,
    canConfigurePreview: false,
  };

  // Dynamic route patterns cannot be previewed or edited directly in the page editor
  if (isDynamicPattern) {
    return {
      ...caps,
      canEditSeo: false,
      canEditMetadata: false,
      canEditContent: false,
      canAddSections: false,
      canDeleteSections: false,
      canReorderSections: false,
      canHideSections: false,
      canDuplicateSections: false,
      canPublish: false,
      canDisable: false,
      canSoftDelete: false,
      canEditSlug: false,
      canPreview: false,
    };
  }

  return caps;
}

/** Helper to check a single capability. */
export function can(action, page) {
  const caps = getPageCapabilities(page);
  return !!caps[action];
}

const pageCapabilities = { getPageCapabilities, can };
export default pageCapabilities;
