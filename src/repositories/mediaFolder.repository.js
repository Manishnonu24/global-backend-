import { BaseRepository } from "@/core/repository";

export class MediaFolderRepository extends BaseRepository {
  constructor() {
    super("mediafolder");
  }

  async findSubfolders(siteId, parentId = null) {
    return this.findMany(siteId, {
      where: { parentId: parentId === "root" ? null : parentId },
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { media: true }
        }
      }
    });
  }
}

export const mediaFolderRepository = new MediaFolderRepository();
