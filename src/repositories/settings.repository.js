import { BaseRepository } from "@/core/repository";
import prisma from "@/lib/prisma";

export class SettingsRepository extends BaseRepository {
  constructor() {
    super("globalsettings");
  }

  async findBySiteId(siteId) {
    return this.db.findUnique({
      where: { siteId }
    });
  }

  async upsertSettings(siteId, data) {
    return this.db.upsert({
      where: { siteId },
      update: data,
      create: {
        siteId,
        ...data
      }
    });
  }
}

export const settingsRepository = new SettingsRepository();
