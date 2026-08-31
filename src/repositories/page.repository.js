import { BaseRepository } from "@/core/repository";

export class PageRepository extends BaseRepository {
  constructor() {
    super("page");
  }

  async findBySlug(siteId, slug) {
    let s = (slug || "/").trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-\/]/g, '').replace(/-+/g, '-').replace(/\/+/g, '/');
    if (!s.startsWith("/")) s = "/" + s;
    const normalized = s === "/" ? "/" : s.replace(/\/$/, "");
    const withoutSlash = normalized === "/" ? "" : normalized.substring(1);

    return this.findFirst(siteId, {
      where: {
        slug: { in: [normalized, withoutSlash] }
      },
      include: { sections: { where: { isDeleted: false }, orderBy: { order: "asc" } } },
      orderBy: [{ status: "desc" }, { createdAt: "asc" }],
    });
  }
}

export const pageRepository = new PageRepository();
