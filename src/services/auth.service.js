import bcrypt from "bcryptjs";
import crypto from "crypto";
import speakeasy from "speakeasy";
import { userRepository } from "@/repositories/user.repository";
import { twoFactorRepository } from "@/repositories/twoFactor.repository";
import { passwordResetRepository } from "@/repositories/passwordReset.repository";
import { BaseService } from "@/core/service";
import {
  UnauthorizedError,
  ValidationError,
  NotFoundError,
} from "@/core/errors";
import { recordLogin } from "@/lib/audit";
import { EventBus } from "@/core/events";
import prisma from "@/lib/prisma";

export class AuthService extends BaseService {
  constructor() {
    super(userRepository);
  }

  async authenticate(email, password, twoFACode, reqHeaders = {}) {
    if (!email || !password) {
      throw new ValidationError("Email and password required");
    }

    const user = await userRepository.findByEmail(email);
    if (!user || !user.isActive) {
      throw new UnauthorizedError("Invalid credentials");
    }

    const ip =
      reqHeaders["x-forwarded-for"] || reqHeaders["x-real-ip"] || "unknown";
    const agent = reqHeaders["user-agent"] || "unknown";

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      try {
        await recordLogin(user.id, ip, agent, false);
      } catch (err) {
        console.error("Failed to record failed login details:", err);
      }
      throw new UnauthorizedError("Invalid credentials");
    }

    // Check if 2FA is enabled
    if (user.twoFAEnabled) {
      if (!twoFACode) {
        throw new ValidationError("2FA_REQUIRED");
      }

      const tf = await twoFactorRepository.findByUserId(user.id);
      if (!tf) {
        throw new ValidationError("2FA not set up properly on this account");
      }

      const verified = speakeasy.totp.verify({
        secret: tf.secret.trim(),
        encoding: "base32",
        token: twoFACode.toString().trim(),
        window: 2,
      });

      if (!verified) {
        try {
          await recordLogin(user.id, ip, agent, false);
        } catch (err) {
          console.error("Failed to record failed login details:", err);
        }
        throw new ValidationError("Invalid 2FA verification code");
      }
    }

    // Record login audit history
    try {
      await recordLogin(user.id, ip, agent, true);
    } catch (err) {
      console.error("Failed to record login audit details:", err);
    }

    EventBus.emit("auth.login", { userId: user.id, email: user.email });

    return {
      id: user.id,
      email: user.email,
      globalRole: user.globalRole,
      twoFAEnabled: user.twoFAEnabled,
    };
  }

  async generate2FASecret(userId) {
    const user = await userRepository.findUnique(null, userId);
    if (!user) {
      throw new NotFoundError("User");
    }

    const secret = speakeasy.generateSecret({
      name: `${process.env.TOTP_ISSUER || "GlobalCMS"}:${user.email}`,
    });

    await twoFactorRepository.upsertSecret(userId, secret.base32);
    return { secret: secret.base32, otpauthUrl: secret.otpauth_url };
  }

  async verifyAndEnable2FA(userId, token) {
    const tf = await twoFactorRepository.findByUserId(userId);
    if (!tf) {
      throw new ValidationError("2FA not set up");
    }

    const verified = speakeasy.totp.verify({
      secret: tf.secret.trim(),
      encoding: "base32",
      token: token.toString().trim(),
      window: 2,
    });

    if (!verified) {
      throw new ValidationError("Invalid verification code");
    }

    await userRepository.set2FAEnabled(userId, true);
    EventBus.emit("auth.2fa.enabled", { userId });
    return { success: true };
  }

  async requestPasswordReset(email) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      // Return ok to prevent account enumeration
      return { success: true };
    }

    const token = crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1 hour expiration

    await passwordResetRepository.createToken(user.id, token, expiresAt);

    // Emit event so dynamic email settings from the DB can fire email without direct coupling
    EventBus.emit("auth.password_reset_requested", {
      email: user.email,
      token,
      expiresAt,
    });

    return { success: true };
  }

  async executePasswordReset(token, newPassword) {
    if (!token || !newPassword || newPassword.length < 6) {
      throw new ValidationError(
        "Valid token and password (min 6 characters) required",
      );
    }

    const pr = await passwordResetRepository.findActiveToken(token);
    if (!pr || pr.used || new Date(pr.expiresAt) < new Date()) {
      throw new ValidationError("Invalid or expired reset token");
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Transaction for atomic update and token consumption
    await prisma.$transaction([
      prisma.user.update({
        where: { id: pr.userId },
        data: { passwordHash: hashedPassword },
      }),
      prisma.passwordreset.update({
        where: { id: pr.id },
        data: { used: true },
      }),
    ]);

    EventBus.emit("auth.password_reset_completed", { userId: pr.userId });
    return { success: true };
  }

  async changePassword(userId, currentPassword, newPassword) {
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      throw new ValidationError("Valid passwords required");
    }

    const user = await userRepository.findUnique(null, userId);
    if (!user) {
      throw new NotFoundError("User");
    }

    const validCurrent = await bcrypt.compare(
      currentPassword,
      user.passwordHash,
    );
    if (!validCurrent) {
      throw new UnauthorizedError("Incorrect current password");
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await userRepository.updatePassword(userId, hashedPassword);

    EventBus.emit("auth.password_changed", { userId });
    return { success: true };
  }
}

export const authService = new AuthService();
