/**
 * src/components/cms/templateRegistry.js
 *
 * Backward-compatible re-export from the authoritative pageContracts.js.
 * The TEMPLATE_REGISTRY shape is derived from PAGE_CONTRACTS so there is one
 * source of truth. All existing import sites continue to work.
 */

import { buildTemplateRegistry, PAGE_CONTRACTS } from '@/content-contracts/pageContracts';

export const TEMPLATE_REGISTRY = (() => {
  const base = buildTemplateRegistry();

  // Add GENERAL template (CMS_BUILT free-form pages) — not driven by contracts
  base.GENERAL = {
    name: 'General CMS Page',
    version: 1,
    regions: {
      main: {
        label: 'Main Content',
        allowedBlocks: [
          'HERO',
          'TEXT_BLOCK',
          'SERVICES',
          'TEAM',
          'TESTIMONIALS',
          'FAQ',
          'CTA',
          'BLOGS',
          'CONTACT_FORM',
          'NEWSLETTER',
          'MAGAZINE_SHOWCASE',
          'BLOG_SLIDER',
        ],
        minItems: 0,
        maxItems: null,
        reorderable: true,
        deletable: true,
        hideable: true,
      },
    },
  };

  return base;
})();

/**
 * Returns an array of slot definitions for a given template key.
 * Includes source and editorLink metadata so the editor can decide
 * whether to show inputs or an informational panel.
 */
export function getTemplateSlotDefinitions(templateKey) {
  const template = TEMPLATE_REGISTRY[templateKey];
  if (!template) return [];

  return Object.entries(template.regions).map(([key, region]) => ({
    key,
    label: region.label,
    type: region.allowedBlocks?.[0] || 'TEXT_BLOCK',
    editable: region.source === 'PAGE_SECTION' || !region.source,
    required: Number(region.minItems || 0) > 0,
    source: region.source ?? 'PAGE_SECTION',
    editorLink: region.editorLink ?? null,
  }));
}
