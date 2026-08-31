import { BaseRepository } from "@/core/repository";

export class UserRepository extends BaseRepository {
  constructor() {
    super("user");
  }

  async findByEmail(email) {
    return this.db.findUnique({
      where: { email },
    });
  }

  async updatePassword(userId, passwordHash) {
    return this.db.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  async set2FAEnabled(userId, enabled) {
    return this.db.update({
      where: { id: userId },
      data: { twoFAEnabled: enabled },
    });
  }
}

export const userRepository = new UserRepository();
