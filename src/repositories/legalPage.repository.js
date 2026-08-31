import { BaseRepository } from "@/core/repository";

export class LegalPageRepository extends BaseRepository {
  constructor() {
    super("legalpage");
  }

  async findByType(siteId, type) {
    // Uses findFirst to leverage the soft-delete filter automatically applied in BaseRepository
    return this.findFirst(siteId, {
      where: { type }
    });
  }

  async findPublishedByType(siteId, type) {
    // Only returns the page if it is published (for public-facing routes)
    return this.findFirst(siteId, {
      where: { type, published: true }
    });
  }

  async upsertLegalPage(siteId, type, data) {
    // Check if it already exists (including soft-deleted ones)
    const existing = await this.db.findFirst({
      where: { siteId, type }
    });

    if (existing) {
      return this.db.update({
        where: { id: existing.id },
        data: {
          title: data.title,
          content: data.content,
          contentJson: data.contentJson,
          published: data.published ?? existing.published,
          lastUpdated: new Date(),
          deletedAt: null // Restore if it was soft-deleted
        }
      });
    }

    return this.db.create({
      data: {
        siteId,
        type,
        title: data.title,
        content: data.content,
        contentJson: data.contentJson,
        published: data.published ?? false,
        lastUpdated: new Date()
      }
    });
  }
}

export const legalPageRepository = new LegalPageRepository();

