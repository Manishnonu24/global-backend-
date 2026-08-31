import { BaseRepository } from "@/core/repository";

export class TwoFactorRepository extends BaseRepository {
  constructor() {
    super("twofactor");
  }

  async findByUserId(userId) {
    return this.db.findUnique({
      where: { userId },
    });
  }

  async upsertSecret(userId, secret) {
    return this.db.upsert({
      where: { userId },
      update: { secret },
      create: { userId, secret },
    });
  }

  async deleteSecret(userId) {
    return this.db.delete({
      where: { userId },
    });
  }
}

export const twoFactorRepository = new TwoFactorRepository();
