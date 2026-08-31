import { pageRepository } from "@/repositories/page.repository";
import { getPageCapabilities } from "@/lib/pageCapabilities";
import { sectionRepository } from "@/repositories/section.repository";
import { BaseService } from "@/core/service";
import { AppError, NotFoundError, ValidationError } from "@/core/errors";
import { versionService } from "@/services/version.service";
import { sectionSchemas } from "@/components/cms/sectionRegistry";
import { logAction } from "@/lib/audit";
import { validateSectionMutation, validateAndCanonicalizeContent } from "@/lib/sectionValidator";
import { validateContractContent } from "@/content-contracts/pageContracts";

const RESERVED_SLUGS = [
  // Next.js standard/special routes
  "api",
  "login",
  "preview",
  "_next",
  "favicon.ico",
  "sitemap.xml",
  "robots.txt",
  "index",
  "home",
  // Admin dashboard routes
  "backup",
  "blogs",
  "compliance",
  "cta",
  "dashboard",
  "dev",
  "email",
  "faq",
  "footer",
  "header",
  "leads",
  "legal",
  "media",
  "navigation",
  "notifications",
  "pages",
  "performance",
  "redirects",
  "security",
  "services",
  "settings",
  "team",
  "testimonials",
  "users",
  "visitors",
];

export class PageService extends BaseService {
  constructor() {
    super(pageRepository);
  }

  async getPageWithSections(siteId, slug) {
    const page = await pageRepository.findBySlug(siteId, slug);
    return page || null;
  }

  normalizeSlug(slug) {
    if (!slug) return "/";
    let s = slug.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-\/]/g, '').replace(/-+/g, '-').replace(/\/+/g, '/');
    if (!s.startsWith("/")) s = "/" + s;
    return s === "/" ? "/" : s.replace(/\/$/, "");
  }

  async addSection(siteId, pageId, sectionData) {
    const {
      type,
      content = {},
      name,
      order,
      regionKey = "main",
    } = sectionData;

    const page = await pageRepository.findUnique(siteId, pageId);
    if (!page) {
      throw new NotFoundError("Page");
    }
    const sections = await sectionRepository.findMany(siteId, {
      where: { pageId, regionKey, isDeleted: false },
    });
    
    validateSectionMutation({
      operation: 'add',
      page,
      updateData: sectionData,
      currentCount: sections.length,
      regionKey,
    });

    const canonicalContent = validateAndCanonicalizeContent(type, content);

    let sectionOrder = order;
    if (sectionOrder === undefined) {
      const latestSection = await sectionRepository.findMany(siteId, {
        where: { pageId, regionKey, isDeleted: false },
        orderBy: { order: "desc" },
        take: 1,
      });
      sectionOrder = latestSection.length > 0 ? latestSection[0].order + 1 : 0;
    }

    const section = await sectionRepository.create(siteId, {
      pageId,
      siteId,
      type,
      content: canonicalContent,
      regionKey,
      name: name || `${type} Section`,
      order: sectionOrder,
    });
    try { await logAction(siteId, null, "PAGE_SECTION_ADD", { pageId, type, regionKey }); } catch (e) { console.error("Audit log failed (section add):", e); }
    try { await versionService.savePageSnapshot(siteId, pageId, null); } catch (e) { console.error("Snapshot save failed (addSection):", e); }
    return section;
  }

  async updateSection(siteId, pageId, sectionId, sectionData) {
    const section = await sectionRepository.findUnique(siteId, sectionId);
    if (!section || section.isDeleted) {
      throw new NotFoundError("Section");
    }

    if (section.pageId !== pageId) {
      throw new ValidationError("Section does not belong to the specified page");
    }

    const page = await pageRepository.findUnique(siteId, pageId);
    if (!page) {
      throw new NotFoundError("Section parent page not found");
    }
    const activeRegion = sectionData.regionKey || section.regionKey;
    const existingSections = await sectionRepository.findMany(siteId, {
      where: { pageId, regionKey: activeRegion, isDeleted: false },
    });

    validateSectionMutation({
      operation: 'update',
      page,
      section,
      updateData: sectionData,
      currentCount: existingSections.length,
    });

    if (sectionData.type !== undefined && sectionData.type !== section.type) {
      throw new ValidationError("Section type cannot be mutated after creation");
    }

    const effectiveType = section.type;
    let canonicalContent = sectionData.content;
    if (sectionData.content !== undefined) {
      if (page.pageType === "CODE_TEMPLATE") {
        const slotKey = sectionData.regionKey || section.regionKey;
        const templateKey = page.templateKey;
        const validation = validateContractContent(templateKey, slotKey, sectionData.content);
        
        if (validation.unknownRegion) {
          throw new AppError(`Unknown region '${slotKey}' for template '${templateKey}'`, "INVALID_SECTION_REGION", 400);
        }
        
        if (!validation.valid) {
          throw new AppError("Request contains unknown or invalid fields", "INVALID_SECTION_CONTENT", 400, { 
            unknownFields: validation.unknownFields, 
            invalidFields: validation.invalidFields 
          });
        }
        
        // Merge validated canonical fields into existing content (preserving legacy)
        canonicalContent = { ...section.content, ...sectionData.content };
      } else {
        canonicalContent = validateAndCanonicalizeContent(effectiveType, sectionData.content);
      }
    }

    const updateData = {};
    if (sectionData.content !== undefined) updateData.content = canonicalContent;
    if (sectionData.name !== undefined) updateData.name = sectionData.name;
    if (sectionData.isVisible !== undefined) updateData.isVisible = sectionData.isVisible;
    if (sectionData.regionKey !== undefined) updateData.regionKey = sectionData.regionKey;

    const updated = await sectionRepository.update(siteId, sectionId, updateData);
    try { await logAction(siteId, null, "PAGE_SECTION_UPDATE", { sectionId, pageId }); } catch (e) { console.error("Audit log failed (section update):", e); }
    try { await versionService.savePageSnapshot(siteId, pageId, null); } catch (e) { console.error("Snapshot save failed (updateSection):", e); }
    return updated;
  }

  async reorderSections(siteId, pageId, regionKey, orderedIds) {
    const page = await pageRepository.findUnique(siteId, pageId);
    if (!page) {
      throw new NotFoundError("Page");
    }
    const { canReorderSections } = getPageCapabilities(page);
    if (!canReorderSections) {
      throw new ValidationError("Cannot reorder sections on this page type");
    }

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      throw new ValidationError("orderedIds array is required");
    }

    if (!regionKey) {
      throw new ValidationError("regionKey is required");
    }

    const { prisma } = await import("@/lib/prisma");

    const existingSections = await prisma.section.findMany({
      where: { siteId, pageId, regionKey, isDeleted: false },
    });
    
    const validIds = new Set(existingSections.map(s => s.id));
    const providedIds = new Set(orderedIds);

    if (validIds.size !== providedIds.size || [...validIds].some(id => !providedIds.has(id))) {
      throw new ValidationError("orderedIds array must contain exactly the set of active section IDs for this page and region without duplicates or foreign IDs");
    }

    validateSectionMutation({
      operation: 'reorder',
      page,
      regionKey,
    });

    const updates = orderedIds.map((id, index) => {
      return prisma.section.update({
        where: { id, siteId, pageId, regionKey },
        data: { order: index },
      });
    });

    await prisma.$transaction(updates);

    try { await logAction(siteId, null, "PAGE_SECTION_REORDER", { pageId, regionKey }); } catch (e) { console.error("Audit log failed (section reorder):", e); }
    try { await versionService.savePageSnapshot(siteId, pageId, null); } catch (e) { console.error("Snapshot save failed (reorderSections):", e); }
    return { success: true };
  }



  async deleteSection(siteId, pageId, sectionId) {
    const section = await sectionRepository.findUnique(siteId, sectionId);
    if (!section || section.isDeleted) {
      throw new NotFoundError("Section");
    }

    if (section.pageId !== pageId) {
      throw new ValidationError("Section does not belong to the specified page");
    }

    if (siteId !== null && siteId !== undefined) {
      const page = await pageRepository.findUnique(siteId, pageId);
      if (!page) {
        throw new NotFoundError("Section parent page not found");
      }
      
      const existingSections = await sectionRepository.findMany(siteId, {
        where: { pageId, regionKey: section.regionKey, isDeleted: false },
      });

      validateSectionMutation({
        operation: 'delete',
        page,
        section,
        currentCount: existingSections.length,
      });
    }

    const deleted = await sectionRepository.update(siteId, sectionId, { isDeleted: true });
    try { await logAction(siteId, null, "PAGE_SECTION_DELETE", { sectionId }); } catch (e) { console.error("Audit log failed (section delete):", e); }
    try { await versionService.savePageSnapshot(siteId, section.pageId, null); } catch (e) { console.error("Snapshot save failed (deleteSection):", e); }
    return deleted;
  }

  async generateSnapshot(siteId, pageId, overrides = {}) {
    const page = await pageRepository.findFirst(siteId, {
      where: { id: pageId },
      include: {
        sections: {
          where: { isDeleted: false },
          orderBy: { order: "asc" },
        },
      },
    });
    if (!page) return null;

    const merged = { ...page, ...overrides };
    const templateKey = merged.templateKey || (merged.pageType === "CMS_BUILT" ? "GENERAL" : null);

    if (templateKey) {
      const { TEMPLATE_REGISTRY } = await import("@/components/cms/templateRegistry");
      const template = TEMPLATE_REGISTRY[templateKey];
      if (template) {
        // Validate minItems for required regions
        for (const [rKey, rConfig] of Object.entries(template.regions)) {
          if (rConfig.minItems && rConfig.minItems > 0) {
            const count = (page.sections || []).filter(s => s.regionKey === rKey).length;
            if (count < rConfig.minItems) {
              throw new ValidationError(`Cannot publish: Region '${rKey}' requires at least ${rConfig.minItems} blocks, but has ${count}.`);
            }
          }
        }
      }
    }

    return {
      title: merged.title,
      slug: merged.slug,
      templateKey: merged.templateKey,
      seoTitle: merged.seoTitle,
      seoKeywords: merged.seoKeywords,
      seoDescription: merged.seoDescription,
      canonicalUrl: merged.canonicalUrl,
      ogImage: merged.ogImage,
      jsonLd: merged.jsonLd,
      sections: (page.sections || []).map((s) => ({
        id: s.id,
        type: s.type,
        name: s.name,
        content: s.content || {},
        order: s.order,
        regionKey: s.regionKey,
        isVisible: s.isVisible !== false && s.showHide !== false && s.showHide !== 0,
      })),
    };
  }

  async publishPage(siteId, pageId, isPublished) {
    const page = await pageRepository.findUnique(siteId, pageId);
    if (!page) {
      throw new NotFoundError("Page");
    }

    const updatePayload = {
      status: isPublished ? "PUBLISHED" : "DRAFT",
      publishedAt: isPublished ? new Date() : null,
    };

    if (isPublished) {
      updatePayload.publishedSnapshot = await this.generateSnapshot(siteId, pageId);
    }

    const updated = await pageRepository.update(siteId, pageId, updatePayload);
    try { await logAction(siteId, null, "PAGE_PUBLISH", { pageId, isPublished }); } catch (e) { console.error("Audit log failed (page publish):", e); }
    return updated;
  }

  async update(siteId, id, data, userId = null, options = {}) {
    const current = await this.repository.findUnique(siteId, id);
    if (!current) {
      throw new NotFoundError("Page");
    }

    const updateData = { ...data };

    if (updateData.seoTitle && typeof updateData.seoTitle === "string" && updateData.seoTitle.length > 190) {
      updateData.seoTitle = updateData.seoTitle.slice(0, 187) + "...";
    }
    if (updateData.seoDescription && typeof updateData.seoDescription === "string" && updateData.seoDescription.length > 190) {
      updateData.seoDescription = updateData.seoDescription.slice(0, 187) + "...";
    }

    const capabilities = getPageCapabilities(current);
    
    // Check if slug is being updated
    if (data.slug && data.slug !== current.slug && !capabilities.canEditSlug) {
      throw new ValidationError("Cannot edit slug on this page type");
    }

    // Check if page identity (title, templateKey) is being updated
    const identityFields = ['title', 'templateKey'];
    const isUpdatingIdentity = identityFields.some(field => data[field] !== undefined && data[field] !== current[field]);
    if (isUpdatingIdentity && !capabilities.canEditMetadata) {
      throw new ValidationError("Cannot edit page identity on this page type");
    }

    // Check if SEO fields are being updated
    const seoFields = ['seoTitle', 'seoKeywords', 'seoDescription', 'canonicalUrl', 'ogImage', 'jsonLd'];
    const isUpdatingSeo = seoFields.some(field => data[field] !== undefined && data[field] !== current[field]);
    if (isUpdatingSeo && !capabilities.canEditSeo) {
      throw new ValidationError("Cannot edit SEO on this page type");
    }

    // Check if status is being updated (publish/unpublish)
    if (data.status && data.status !== current.status && !capabilities.canPublish) {
      throw new ValidationError("Cannot change publish status on this page type");
    }

    // Check if isEnabled is being updated
    if (data.isEnabled !== undefined && data.isEnabled !== current.isEnabled && !capabilities.canDisable) {
      throw new ValidationError("Cannot disable/enable this page type");
    }

    if (data.slug) {
      const cleanSlug = this.normalizeSlug(data.slug);
      if (RESERVED_SLUGS.includes(cleanSlug.replace(/^\//, '').toLowerCase())) {
        throw new ValidationError(
          `The slug "${data.slug}" is reserved for system use.`,
        );
      }

      // Check if slug is used by another page in this site
      const existing = await pageRepository.findFirst(siteId, {
        where: {
          slug: { in: [cleanSlug, `/${cleanSlug}`] },
          id: { not: id },
        },
      });
      if (existing) {
        throw new ValidationError(
          `The slug "${data.slug}" is already in use by another page.`,
        );
      }
      updateData.slug = cleanSlug;
    }

    if (data.status === "PUBLISHED") {
      if (current.status !== "PUBLISHED") {
        updateData.publishedAt = new Date();
        updateData.publishedBy = userId;
      }
      updateData.publishedSnapshot = await this.generateSnapshot(siteId, id, updateData);
    } else if (data.status === "DRAFT" && current.status !== "DRAFT") {
      updateData.publishedAt = null;
      updateData.publishedBy = null;
    }
    const updated = await super.update(siteId, id, updateData, userId, options);

    // Save version snapshot
    try {
      await versionService.savePageSnapshot(siteId, id, userId);
    } catch (err) {
      console.error("Failed to save page version:", err);
    }

    return updated;
  }

  async create(siteId, data, userId = null, options = {}) {
    const baseSlug =
      (data.slug && this.normalizeSlug(data.slug)) ||
      this.normalizeSlug(data.title || "page");
    const slug = await this.generateUniqueSlug(siteId, baseSlug);

    if (data.seoTitle && typeof data.seoTitle === "string" && data.seoTitle.length > 190) {
      data.seoTitle = data.seoTitle.slice(0, 187) + "...";
    }
    if (data.seoDescription && typeof data.seoDescription === "string" && data.seoDescription.length > 190) {
      data.seoDescription = data.seoDescription.slice(0, 187) + "...";
    }

    const pageData = {
      ...data,
      slug,
    };

    const created = await super.create(siteId, pageData, userId, options);

    // Save initial version snapshot
    try {
      await versionService.savePageSnapshot(siteId, created.id, userId);
    } catch (err) {
      console.error("Failed to save initial page version:", err);
    }

    return created;
  }

  slugify(text = "") {
    return this.normalizeSlug(text);
  }

  async generateUniqueSlug(siteId, baseSlug) {
    let candidate = baseSlug;
    let i = 0;
    while (
      RESERVED_SLUGS.includes(candidate.toLowerCase()) ||
      (await pageRepository.findFirst(siteId, {
        where: { slug: { in: [candidate, `/${candidate}`] } },
      }))
    ) {
      i += 1;
      candidate = `${baseSlug}-${i}`;
    }
    return candidate;
  }
}

export const pageService = new PageService();
