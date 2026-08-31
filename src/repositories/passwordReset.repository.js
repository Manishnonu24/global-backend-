import { BaseRepository } from "@/core/repository";

export class PasswordResetRepository extends BaseRepository {
  constructor() {
    super("passwordreset");
  }

  async findActiveToken(token) {
    return this.db.findUnique({
      where: { token },
    });
  }

  async createToken(userId, token, expiresAt) {
    return this.db.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });
  }

  async markAsUsed(id) {
    return this.db.update({
      where: { id },
      data: { used: true },
    });
  }
}

export const passwordResetRepository = new PasswordResetRepository();
