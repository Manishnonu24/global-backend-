import prisma from "@/lib/prisma";
import { NotFoundError } from "@/core/errors";
import { logAction } from "@/lib/audit";

export class VersionService {
  /**
   * Save a new version snapshot for any entity type.
   */
  async save(siteId, entityType, entityId, data, userId = null) {
    // Get the latest version number for this entity
    const latest = await prisma.contentVersion.findFirst({
      where: { siteId, entityType, entityId },
      orderBy: { version: "desc" },
      select: { version: true },
    });

    const nextVersion = latest ? latest.version + 1 : 1;

    return prisma.contentVersion.create({
      data: {
        siteId,
        entityType,
        entityId,
        version: nextVersion,
        data,
        createdBy: userId,
      },
    });
  }

  /**
   * Save a full page snapshot (metadata, sections, templateContent)
   */
  async savePageSnapshot(siteId, pageId, userId = null) {
    const page = await prisma.page.findFirst({
      where: { id: pageId, siteId },
    });
    if (!page) return null;

    const sections = await prisma.section.findMany({
      where: { pageId, siteId, isDeleted: false },
      orderBy: { order: "asc" },
    });

    const snapshotData = {
      page: {
        title: page.title,
        slug: page.slug,
        seoTitle: page.seoTitle,
        seoDescription: page.seoDescription,
        canonicalUrl: page.canonicalUrl,
        ogImage: page.ogImage,
        jsonLd: page.jsonLd,
        status: page.status,
        pageType: page.pageType,
        isHardcoded: page.isHardcoded,
      },
      sections: sections.map((s) => ({
        type: s.type,
        name: s.name,
        content: s.content || {},
        order: s.order,
        isVisible: s.isVisible !== false,
      })),
      templateContent: null,
    };

    return this.save(siteId, "PAGE", pageId, snapshotData, userId);
  }

  /**
   * List all versions for an entity, newest first.
   */
  async list(siteId, entityType, entityId) {
    return prisma.contentVersion.findMany({
      where: { siteId, entityType, entityId },
      orderBy: { version: "desc" },
      select: {
        id: true,
        version: true,
        createdBy: true,
        createdAt: true,
      },
    });
  }

  /**
   * Get a specific version by ID.
   */
  async getById(siteId, versionId) {
    const version = await prisma.contentVersion.findFirst({
      where: { id: versionId, siteId },
    });
    if (!version) {
      throw new NotFoundError("Content version");
    }
    return version;
  }

  /**
   * Restore an entity to a previous version.
   * Returns the version data so the caller can apply it.
   */
  async getVersionData(siteId, entityType, entityId, versionId) {
    const version = await prisma.contentVersion.findFirst({
      where: { id: versionId, siteId, entityType, entityId },
    });
    if (!version) {
      throw new NotFoundError("Content version");
    }
    return version.data;
  }

  /**
   * Restore a page to a previous version (metadata, sections, templateContent)
   * and force status to DRAFT.
   */
  async restorePageVersion(siteId, pageId, versionId, userId = null) {
    const versionData = await this.getVersionData(siteId, "PAGE", pageId, versionId);

    const isFullSnapshot = versionData && typeof versionData === "object" && versionData.page && typeof versionData.page === "object";
    const pageMetadata = isFullSnapshot ? versionData.page : (versionData || {});
    const sectionsData = isFullSnapshot && Array.isArray(versionData.sections) ? versionData.sections : null;
    const templateData = isFullSnapshot ? versionData.templateContent : null;

    const {
      id: _id,
      siteId: _siteId,
      createdAt,
      updatedAt,
      deletedAt,
      publishedAt,
      publishedBy,
      publishedSnapshot,
      sections: _sec,
      faqs,
      syncedRoutes,
      status: _oldStatus,
      ...restorableMeta
    } = pageMetadata;

    const currentPage = await prisma.page.findFirst({
      where: { id: pageId, siteId },
    });

    if (restorableMeta.slug && restorableMeta.slug !== currentPage?.slug) {
      const existing = await prisma.page.findFirst({
        where: { siteId, slug: restorableMeta.slug, id: { not: pageId } },
      });
      if (existing) {
        delete restorableMeta.slug;
      }
    }

    const updatePayload = {
      ...restorableMeta,
      status: "DRAFT",
      publishedAt: null,
      publishedBy: null,
    };

    const updatedPage = await prisma.page.update({
      where: { id: pageId },
      data: updatePayload,
    });

    if (sectionsData !== null) {
      await prisma.section.updateMany({
        where: { pageId, siteId, isDeleted: false },
        data: { isDeleted: true },
      });

      for (let i = 0; i < sectionsData.length; i++) {
        const s = sectionsData[i];
        await prisma.section.create({
          data: {
            siteId,
            pageId,
            type: s.type || "TEXT_BLOCK",
            name: s.name || `${s.type || "Section"}`,
            content: s.content || {},
            order: s.order !== undefined ? s.order : i,
            isVisible: s.isVisible !== undefined ? s.isVisible : true,
            isDeleted: false,
          },
        });
      }
    }

    // templateData (PageContent) is no longer supported
    try { await logAction(siteId, userId, "PAGE_VERSION_RESTORE", { pageId, versionId }); } catch (e) { console.error("Audit log failed (version restore):", e); }
    try { await this.savePageSnapshot(siteId, pageId, userId); } catch (e) { console.error("Snapshot save failed after restore:", e); }

    return updatedPage;
  }

  /**
   * Compare two versions and return their data for diffing.
   */
  async compare(siteId, versionId1, versionId2) {
    const [v1, v2] = await Promise.all([
      prisma.contentVersion.findFirst({ where: { id: versionId1, siteId } }),
      prisma.contentVersion.findFirst({ where: { id: versionId2, siteId } }),
    ]);

    if (!v1 || !v2) {
      throw new NotFoundError("One or both versions not found");
    }

    return {
      from: { version: v1.version, data: v1.data, createdAt: v1.createdAt },
      to: { version: v2.version, data: v2.data, createdAt: v2.createdAt },
    };
  }
}

export const versionService = new VersionService();
