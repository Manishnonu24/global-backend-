import { BaseRepository } from "@/core/repository";

export class MediaRepository extends BaseRepository {
  constructor() {
    super("media");
  }

  async findByFolder(siteId, folderId = null, { take = 60, skip = 0 } = {}) {
    return this.findMany(siteId, {
      where: { folderId: folderId === "root" ? null : folderId },
      orderBy: { createdAt: "desc" },
      take,
      skip,
    });
  }

  async countByFolder(siteId, folderId = null) {
    return this.count(siteId, { folderId: folderId === "root" ? null : folderId });
  }
}

export const mediaRepository = new MediaRepository();
