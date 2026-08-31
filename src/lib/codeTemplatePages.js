import prisma from "@/lib/prisma";
import { TEMPLATE_REGISTRY, getTemplateSlotDefinitions } from "@/components/cms/templateRegistry";
import { getAllowedSlotFields } from "@/lib/templateSlotFields";
import { getContractRegions } from "@/content-contracts/pageContracts";

export const CODE_TEMPLATE_PAGES = {
  HOME: { title: "Home", slug: "/" },
  ABOUT: { title: "About", slug: "/about" },
  CONTACT: { title: "Contact", slug: "/contact" },
  SERVICES: { title: "Services", slug: "/services" },
  BLOGS: { title: "Blogs", slug: "/blogs" },
  PUBLICATION: { title: "Publication", slug: "/publication" },
  QUIZZES: { title: "Quizzes", slug: "/quizzes" },
  RECIPES: { title: "Recipes", slug: "/recipes" },
  INFO: { title: "Info Hub", slug: "/info" },
};

function scoreContentMatch(legacyContent, newAllowedFields) {
  if (!newAllowedFields || newAllowedFields.length === 0) return 0;
  let matches = 0;
  for (const field of newAllowedFields) {
    if (legacyContent[field.key] !== undefined && legacyContent[field.key] !== "") {
      matches++;
    }
  }
  return matches;
}

export async function ensureCodeTemplatePage({ siteId, templateKey }) {
  if (!siteId) throw new Error("siteId is required");
  
  const templateDef = CODE_TEMPLATE_PAGES[templateKey];
  if (!templateDef) {
    throw new Error(`Unknown templateKey: ${templateKey}`);
  }

  const expectedSlug = templateDef.slug;

  const existingBySlug = await prisma.page.findUnique({
    where: { siteId_slug: { siteId, slug: expectedSlug } }
  });

  const existingByKey = await prisma.page.findFirst({
    where: { siteId, templateKey }
  });

  if (existingBySlug && existingByKey && existingBySlug.id !== existingByKey.id) {
    throw new Error(`Conflict: Found multiple pages for template ${templateKey}. Slug page ID: ${existingBySlug.id}, Key page ID: ${existingByKey.id}`);
  }

  const pageToUpdate = existingBySlug || existingByKey;
  let finalPageId;

  if (pageToUpdate) {
    if (pageToUpdate.deletedAt != null) {
      return { status: "deleted", page: pageToUpdate, createdSlots: [], migratedSections: [], existingSlots: [], ambiguousSections: [], invalidSections: [] };
    }

    const updatedPage = await prisma.page.update({
      where: { id: pageToUpdate.id },
      data: {
        pageType: "CODE_TEMPLATE",
        templateKey,
        sourceRoute: expectedSlug,
        isDiscovered: true,
        isManagedBySync: true,
        isHardcoded: true,
      }
    });
    finalPageId = updatedPage.id;
  } else {
    const newPage = await prisma.page.create({
      data: {
        siteId,
        title: templateDef.title,
        slug: expectedSlug,
        pageType: "CODE_TEMPLATE",
        templateKey,
        sourceRoute: expectedSlug,
        status: "PUBLISHED",
        isEnabled: true,
        isDiscovered: true,
        isManagedBySync: true,
        isHardcoded: true,
        publishedAt: new Date(),
      }
    });
    finalPageId = newPage.id;
  }

  const existingSections = await prisma.section.findMany({
    where: { pageId: finalPageId, isDeleted: false }
  });

  const createdSlots = [];
  const existingSlots = [];
  const migratedSections = [];
  const ambiguousSections = [];
  const invalidSections = [];

  const slotDefs = getTemplateSlotDefinitions(templateKey);
  const knownRegions = new Set(slotDefs.map(s => s.key));

  // Determine which regions are already properly populated
  const populatedRegions = new Set();
  for (const s of existingSections) {
    if (knownRegions.has(s.regionKey)) {
      populatedRegions.add(s.regionKey);
      existingSlots.push(s);
    }
  }

  // Find legacy sections that need migration
  const legacySections = existingSections.filter(s => !knownRegions.has(s.regionKey));

  for (const legacy of legacySections) {
    // Find all possible destination regions based on allowedBlocks type
    const possibleRegions = slotDefs.filter(sd => {
      if (populatedRegions.has(sd.key)) return false; // Never overwrite populated
      const templateRegionDef = TEMPLATE_REGISTRY[templateKey].regions[sd.key];
      return templateRegionDef && templateRegionDef.allowedBlocks.includes(legacy.type);
    });

    if (possibleRegions.length === 0) {
      invalidSections.push(legacy);
      continue;
    }

    if (possibleRegions.length === 1) {
      const target = possibleRegions[0];
      await prisma.section.update({
        where: { id: legacy.id },
        data: { regionKey: target.key }
      });
      migratedSections.push({ ...legacy, newRegionKey: target.key });
      populatedRegions.add(target.key);
      continue;
    }

    // Multiple possible destinations, score them by content field overlap
    let bestScore = -1;
    let bestTargets = [];

    for (const target of possibleRegions) {
      const allowedFields = getAllowedSlotFields(templateKey, target.key);
      const score = scoreContentMatch(legacy.content || {}, allowedFields);
      if (score > bestScore) {
        bestScore = score;
        bestTargets = [target];
      } else if (score === bestScore) {
        bestTargets.push(target);
      }
    }

    if (bestTargets.length === 1) {
      const target = bestTargets[0];
      await prisma.section.update({
        where: { id: legacy.id },
        data: { regionKey: target.key }
      });
      migratedSections.push({ ...legacy, newRegionKey: target.key });
      populatedRegions.add(target.key);
    } else {
      ambiguousSections.push(legacy);
    }
  }

  // Generate completely missing required sections
  for (const slot of slotDefs) {
    if (!populatedRegions.has(slot.key)) {
      if (slot.source !== "PAGE_SECTION") continue;

      const allowedFields = getAllowedSlotFields(templateKey, slot.key);
      const slotContent = {};
      
      if (allowedFields) {
        for (const field of allowedFields) {
          slotContent[field.key] = field.defaultValue !== undefined ? structuredClone(field.defaultValue) : "";
        }
      }

      const created = await prisma.section.create({
        data: {
          siteId,
          pageId: finalPageId,
          regionKey: slot.key,
          type: slot.type,
          name: `${slot.label}`,
          content: slotContent,
          order: existingSections.length + createdSlots.length,
          isVisible: true,
          isDeleted: false,
        },
      });
      createdSlots.push(created);
      populatedRegions.add(slot.key);
    }
  }

  // Apply legacy field migrations to all sections in known regions
  const allCurrentSections = await prisma.section.findMany({
    where: { pageId: finalPageId, isDeleted: false }
  });
  const migrationsToApply = [];
  function hasVal(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key) && obj[key] !== null && obj[key] !== undefined;
  }

  function migrateCanonicalField(content, fieldDef) {
    let changed = false;
    if (!hasVal(content, fieldDef.key)) {
      for (const alias of fieldDef.legacyAliases || []) {
        if (hasVal(content, alias)) {
          content[fieldDef.key] = content[alias];
          changed = true;
          break;
        }
      }
    }
    return changed;
  }

  function migrateObjectListField(content, fieldDef) {
    let changed = false;
    if (hasVal(content, fieldDef.key) && Array.isArray(content[fieldDef.key])) {
      const items = content[fieldDef.key];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item || typeof item !== 'object') continue;
        for (const subField of fieldDef.itemFields || []) {
          if (!hasVal(item, subField.key)) {
            for (const alias of subField.legacyAliases || []) {
              if (hasVal(item, alias)) {
                item[subField.key] = item[alias];
                changed = true;
                break;
              }
            }
          }
        }
      }
    }
    return changed;
  }

  for (const s of allCurrentSections) {
    let changed = false;
    const c = structuredClone(s.content || {});
    const regions = getContractRegions(templateKey);
    const regionDef = regions ? regions[s.regionKey] : null;
    let addedCanonicalFields = [];

    if (regionDef && regionDef.fields) {
      for (const field of regionDef.fields) {
        if (field.type === 'object-list') {
          if (migrateObjectListField(c, field)) {
            changed = true;
            addedCanonicalFields.push(field.key);
          }
        } else {
          if (migrateCanonicalField(c, field)) {
            changed = true;
            addedCanonicalFields.push(field.key);
          }
        }
      }
    }
    
    // HOME hero title lines to title (special case)
    if (templateKey === "HOME" && s.regionKey === "hero") {
      if (!hasVal(c, 'title') && (hasVal(c, 'titleLine1') || hasVal(c, 'titleLine2'))) {
        c.title = [c.titleLine1, c.titleLine2].filter(Boolean).join("\n");
        changed = true;
        addedCanonicalFields.push('title (from lines)');
      }
    }
    
    // ABOUT cta <br> normalization (special case)
    if (templateKey === "ABOUT" && s.regionKey === "cta") {
      if (hasVal(c, 'title') && typeof c.title === 'string' && c.title.match(/<br\s*\/?>/gi)) {
        c.title = c.title.replace(/<br\s*\/?>/gi, "\n");
        changed = true;
        addedCanonicalFields.push('title (br normalized)');
      }
    }
    
    if (changed) {
      console.log(`[Migration] Page ${finalPageId} Section ${s.id} (${s.regionKey}) Added canonical fields: ${addedCanonicalFields.join(', ')}`);
      migrationsToApply.push(prisma.section.update({
        where: { id: s.id },
        data: { content: c }
      }));
    }
  }
  
  if (migrationsToApply.length > 0) {
    await prisma.$transaction(migrationsToApply);
  }

  let finalPage = await prisma.page.findUnique({
    where: { id: finalPageId },
    include: {
      sections: {
        where: { isDeleted: false },
        orderBy: { order: "asc" },
      },
    },
  });

  if (
    finalPage.status === "PUBLISHED" &&
    !finalPage.publishedSnapshot
  ) {
    try {
      const { pageService } = await import("@/services/page.service");
      const snapshot = await pageService.generateSnapshot(
        siteId,
        finalPageId
      );

      await prisma.page.update({
        where: { id: finalPageId },
        data: { publishedSnapshot: snapshot },
      });

      finalPage = await prisma.page.findUnique({
        where: { id: finalPageId },
        include: {
          sections: {
            where: { isDeleted: false },
            orderBy: { order: "asc" },
          },
        },
      });
    } catch (snapshotErr) {
      console.error("[ensureCodeTemplatePage] Snapshot generation failed (non-fatal):", snapshotErr);
    }
  }

  return { 
    status: "active", 
    page: finalPage, 
    createdSlots, 
    migratedSections, 
    existingSlots, 
    ambiguousSections, 
    invalidSections 
  };
}
