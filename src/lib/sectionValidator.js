// src/lib/sectionValidator.js
import { ValidationError } from "@/core/errors";
import { getPageCapabilities } from "@/lib/pageCapabilities";
import { TEMPLATE_REGISTRY } from "@/components/cms/templateRegistry";
import { canonicalize } from "@/lib/sectionCanonicalizer";
import { sectionSchemas } from "@/components/cms/sectionRegistry";

export function validateSectionMutation({ operation, page, section, updateData, currentCount, regionKey, allSections = [] }) {
  const capabilities = getPageCapabilities(page);
  
  if (operation === 'add') {
    if (!capabilities.canAddSections) throw new ValidationError("Cannot add sections to this page type");
  } else if (operation === 'update') {
    if (!capabilities.canEditContent) throw new ValidationError("Cannot edit sections on this page type");
    if (page.pageType === "CODE_TEMPLATE") {
      if (updateData?.type !== undefined && updateData.type !== section?.type) {
        throw new ValidationError("Cannot change section type on CODE_TEMPLATE pages");
      }
      if (updateData?.regionKey !== undefined && updateData.regionKey !== section?.regionKey) {
        throw new ValidationError("Cannot change section region on CODE_TEMPLATE pages");
      }
      if (updateData?.order !== undefined && updateData.order !== section?.order) {
        throw new ValidationError("Cannot change section order on CODE_TEMPLATE pages");
      }
      if (updateData?.isDeleted !== undefined && updateData.isDeleted !== section?.isDeleted) {
        throw new ValidationError("Cannot soft-delete sections on CODE_TEMPLATE pages");
      }
    }
  } else if (operation === 'delete') {
    if (!capabilities.canDeleteSections) throw new ValidationError("Cannot delete sections from this page type");
  } else if (operation === 'reorder') {
    if (!capabilities.canReorderSections) throw new ValidationError("Cannot reorder sections on this page type");
  }

  const templateKey = page.templateKey || (page.pageType === "CMS_BUILT" ? "GENERAL" : null);
  const template = TEMPLATE_REGISTRY[templateKey];
  if (!template) throw new ValidationError(`Unknown templateKey '${templateKey}'`);

  const activeRegion = regionKey || section?.regionKey || updateData?.regionKey || "main";
  const regionConfig = template.regions[activeRegion];
  if (!regionConfig) throw new ValidationError(`Region '${activeRegion}' is not defined for template`);

  if (operation === 'add' || (operation === 'update' && updateData?.type)) {
    const type = updateData?.type || section?.type;
    if (!regionConfig.allowedBlocks.includes(type)) {
      throw new ValidationError(`Block type '${type}' is not allowed in region '${activeRegion}'`);
    }
  }

  if (operation === 'add' && regionConfig.maxItems !== undefined && regionConfig.maxItems !== null) {
    if (currentCount >= regionConfig.maxItems) {
      throw new ValidationError(`Region '${activeRegion}' has reached its maximum block limit of ${regionConfig.maxItems}`);
    }
  }

  if (operation === 'delete' && regionConfig.minItems !== undefined && regionConfig.minItems !== null) {
    if (currentCount <= regionConfig.minItems) {
      throw new ValidationError(`Region '${activeRegion}' must have at least ${regionConfig.minItems} blocks`);
    }
  }

  if (operation === 'delete') {
    if (regionConfig.deletable === false) throw new ValidationError(`Blocks in region '${activeRegion}' cannot be deleted`);
  }

  if (operation === 'update' && updateData?.isVisible !== undefined) {
    if (!capabilities.canHideSections) throw new ValidationError("Cannot change section visibility on this page type");
    if (regionConfig.hideable === false && updateData.isVisible === false) throw new ValidationError(`Blocks in region '${activeRegion}' cannot be hidden`);
  }

  if (operation === 'reorder') {
    if (regionConfig.reorderable === false) throw new ValidationError(`Blocks in region '${activeRegion}' cannot be reordered`);
  }

  return true;
}

export function validateAndCanonicalizeContent(type, content) {
  if (!content) return content;
  const canonicalized = canonicalize(type, content);
  const schema = sectionSchemas[type];
  if (schema) {
    schema.parse(canonicalized);
  }
  return canonicalized;
}
