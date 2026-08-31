import { BaseService } from "@/core/service";
import { settingsRepository } from "@/repositories/settings.repository";
import { ValidationError } from "@/core/errors";
import { CtaConfigSchema } from "@/lib/validators/cta";
import { EventBus } from "@/core/events";
import { logAction } from "@/lib/audit";
import prisma from "@/lib/prisma";
import { getRedisClient } from "@/lib/redis";

const CACHE_TTL_SECONDS = 300; // 5 minutes

async function getCachedSettings(cacheKey) {
  const redis = getRedisClient();
  if (!redis) return null;

  try {
    const cached = await redis.get(cacheKey);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

async function setCachedSettings(cacheKey, settings) {
  const redis = getRedisClient();
  if (!redis || !settings) return;

  try {
    await redis.set(cacheKey, JSON.stringify(settings), "EX", CACHE_TTL_SECONDS);
  } catch {
    // Cache writes are optional.
  }
}

async function invalidateCachedSettings(siteId) {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    await redis.del(`settings:${siteId}`);
  } catch {
    // Cache deletes are optional.
  }
}

async function triggerFrontendRevalidation(siteId) {
  try {
    const [site, settings, frontendProject] = await Promise.all([
      prisma.site.findUnique({
        where: { id: siteId },
        select: { integrationKey: true },
      }),
      prisma.globalSettings.findUnique({
        where: { siteId },
        select: { websiteSettings: true },
      }),
      prisma.frontendProject.findFirst({
        where: { siteId, isActive: true },
        orderBy: { updatedAt: "desc" },
        select: { baseUrl: true },
      }),
    ]);

    const frontendUrl = (
      settings?.websiteSettings?.domain ||
      frontendProject?.baseUrl ||
      process.env.FRONTEND_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3001"
    ).replace(/\/+$/, "");

    const secret = site?.integrationKey || process.env.CMS_INTEGRATION_KEY;
    if (!secret) {
      console.warn(
        `Skipping frontend revalidation for ${siteId}: integration key is not configured.`,
      );
      return;
    }

    await fetch(`${frontendUrl}/api/revalidate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        siteId,
        secret,
      }),
    });
  } catch (error) {
    console.error("Failed to ping frontend revalidation webhook:", error);
  }
}
export class SettingsService extends BaseService {
  constructor() {
    super(settingsRepository);
  }

  async getSettingsField(siteId, fieldName) {
    const cacheKey = `settings:${siteId}`;
    let settings = await getCachedSettings(cacheKey);

    if (!settings) {
      settings = await settingsRepository.findBySiteId(siteId);
      await setCachedSettings(cacheKey, settings);
    }
    
    return settings?.[fieldName] || null;
  }

  async updateSettingsField(siteId, fieldName, data, userId = null) {
    // Validate if it is ctaConfig
    if (fieldName === "ctaConfig" && data) {
      const parsed = CtaConfigSchema.safeParse(data);
      if (!parsed.success) {
        throw new ValidationError(parsed.error.issues || parsed.error.errors);
      }
      data = parsed.data;
    }

    let payloadData = data;
    if (fieldName === "footer" || fieldName === "header") {
      const existing = await settingsRepository.findBySiteId(siteId);
      payloadData = {
        ...(existing?.[fieldName] || {}),
        ...data,
      };
    }

    const updated = await settingsRepository.upsertSettings(siteId, {
      [fieldName]: payloadData,
    });

    if (userId) {
      try {
        await logAction(
          siteId,
          userId,
          `SETTINGS_${fieldName.toUpperCase()}_UPDATE`,
          {
            siteId,
          },
        );
      } catch (err) {
        console.error(`Audit log failed for setting ${fieldName} update:`, err);
      }
    }

    await invalidateCachedSettings(siteId);

    EventBus.emit("settings.updated", {
      siteId,
      userId,
      fieldName,
      data: updated,
    });

    // Ping frontend to revalidate cached settings
    if (["header", "footer", "websiteSettings", "ctaConfig", "compliance", "scripts"].includes(fieldName)) {
      try {
        const { revalidateTag } = await import("next/cache");
        revalidateTag("layout");
      } catch (e) {
        // ignore if not running in next.js context
      }
      triggerFrontendRevalidation(siteId);
    }

    return updated[fieldName];
  }

  async updateGlobalSettings(siteId, data, userId = null) {
    // Validate CTA config if provided
    if (data.ctaConfig) {
      const parsed = CtaConfigSchema.safeParse(data.ctaConfig);
      if (!parsed.success) {
        throw new ValidationError(parsed.error.issues || parsed.error.errors);
      }
      data.ctaConfig = parsed.data;
    }

    const existing = await settingsRepository.findBySiteId(siteId);

    const updatePayload = {
      header:
        data.header !== undefined
          ? { ...(existing?.header || {}), ...data.header }
          : undefined,
      footer:
        data.footer !== undefined
          ? { ...(existing?.footer || {}), ...data.footer }
          : undefined,
      analytics: data.analytics !== undefined ? data.analytics : undefined,
      scripts: data.scripts !== undefined ? data.scripts : undefined,
      ctaConfig: data.ctaConfig !== undefined ? data.ctaConfig : undefined,
      contactDetails:
        data.contactDetails !== undefined ? data.contactDetails : undefined,
    };

    // Filter undefined keys
    Object.keys(updatePayload).forEach((key) => {
      if (updatePayload[key] === undefined) {
        delete updatePayload[key];
      }
    });

    const result = await settingsRepository.upsertSettings(
      siteId,
      updatePayload,
    );

    if (userId) {
      try {
        await logAction(siteId, userId, "GLOBAL_SETTINGS_UPDATED", { siteId });
      } catch (err) {
        console.error("Audit log failed for global settings update:", err);
      }
    }

    await invalidateCachedSettings(siteId);

    EventBus.emit("settings.global.updated", { siteId, userId, data: result });

    // Ping frontend to revalidate cached settings
    try {
      const { revalidateTag } = await import("next/cache");
      revalidateTag("layout");
    } catch (e) {
      // ignore
    }
    triggerFrontendRevalidation(siteId);

    return result;
  }
}

export const settingsService = new SettingsService();
