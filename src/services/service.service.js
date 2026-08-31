import { serviceRepository } from "@/repositories/service.repository";
import { BaseService } from "@/core/service";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

function formatServiceFromDb(service) {
  if (!service) return service;
  
  let faqs = [];
  let includes = [];
  
  if (service.faqs) {
    try {
      const parsed = typeof service.faqs === 'string' ? JSON.parse(service.faqs) : service.faqs;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        faqs = parsed.faqs || [];
        includes = parsed.includes || [];
      } else if (Array.isArray(parsed)) {
        faqs = parsed;
      }
    } catch (e) {
      console.error("Failed to parse faqs JSON:", e);
    }
  }

  return {
    ...service,
    faqs,
    includes
  };
}

function formatServiceToDb(data, isCreate = false) {
  const { faqs = [], includes = [], featuredImageId, siteId, ...rest } = data;
  
  // Package both faqs and includes into the faqs JSON column
  const dbFaqs = {
    faqs,
    includes
  };

  const payload = {
    ...rest,
    faqs: dbFaqs
  };

  // Convert featuredImageId to Prisma relation format to bypass client cache out-of-sync issues
  if (featuredImageId !== undefined) {
    if (featuredImageId) {
      payload.featuredImage = { connect: { id: featuredImageId } };
    } else {
      if (!isCreate) {
        payload.featuredImage = { disconnect: true };
      }
    }
  }

  return payload;
}

export class ServiceService extends BaseService {
  constructor() {
    super(serviceRepository);
  }

  async getServices(siteId) {
    const list = await this.getList(siteId, {
      orderBy: { sortOrder: "asc" },
      include: { featuredImage: true },
    });
    return list.map(formatServiceFromDb);
  }

  async getById(siteId, id, options = {}) {
    const record = await super.getById(siteId, id, options);
    return formatServiceFromDb(record);
  }

  async generateUniqueSlug(siteId, title, currentId = null) {
    let baseSlug = slugify(title || "service");
    if (!baseSlug) baseSlug = "service";
    
    let slug = baseSlug;
    let counter = 1;
    while (true) {
      const existing = await this.repository.db.findFirst({
        where: {
          siteId,
          slug,
          ...(currentId ? { id: { not: currentId } } : {})
        }
      });
      if (!existing) return slug;
      counter++;
      slug = `${baseSlug}-${counter}`;
    }
  }

  async create(siteId, data, userId = null, options = {}) {
    const dbPayload = formatServiceToDb(data, true);
    
    // Visibility logic
    const visibility = dbPayload.visibility || "PUBLIC";
    if (visibility === "PUBLIC") {
      dbPayload.slug = dbPayload.slug || await this.generateUniqueSlug(siteId, dbPayload.title);
      dbPayload.accessToken = null;
    } else {
      dbPayload.slug = null;
      dbPayload.accessToken = randomBytes(24).toString("hex");
    }

    const created = await super.create(siteId, dbPayload, userId, options);
    try {
      revalidatePath("/services");
      if (created.slug) revalidatePath(`/services/${created.slug}`);
    } catch (_) {}
    return formatServiceFromDb(created);
  }

  async update(siteId, id, data, userId = null, options = {}) {
    const existingService = await this.getById(siteId, id);
    if (!existingService) throw new Error("Service not found");

    const dbPayload = formatServiceToDb(data, false);
    
    // Check if visibility is changing or if slug is manually provided
    const newVisibility = dbPayload.visibility || existingService.visibility;
    const isVisibilityChanged = dbPayload.visibility && dbPayload.visibility !== existingService.visibility;

    if (newVisibility === "PUBLIC") {
      dbPayload.accessToken = null;
      if (isVisibilityChanged || (dbPayload.title && dbPayload.title !== existingService.title && !dbPayload.slug) || dbPayload.slug) {
         dbPayload.slug = dbPayload.slug || await this.generateUniqueSlug(siteId, dbPayload.title || existingService.title, id);
      } else {
         // Keep existing slug
         dbPayload.slug = existingService.slug;
      }
    } else if (newVisibility === "PRIVATE") {
      dbPayload.slug = null;
      if (isVisibilityChanged || !existingService.accessToken) {
        dbPayload.accessToken = randomBytes(24).toString("hex");
      }
    }

    const updated = await super.update(siteId, id, dbPayload, userId, options);
    try {
      revalidatePath("/services");
      if (updated.slug) revalidatePath(`/services/${updated.slug}`);
      if (existingService.slug && existingService.slug !== updated.slug) {
        revalidatePath(`/services/${existingService.slug}`);
      }
    } catch (_) {}
    return formatServiceFromDb(updated);
  }

  async regenerateToken(siteId, id, userId = null) {
    const service = await this.getById(siteId, id);
    if (!service || service.visibility !== "PRIVATE") {
      throw new Error("Invalid service or visibility type");
    }
    
    const dbPayload = {
      accessToken: randomBytes(24).toString("hex")
    };
    
    const updated = await super.update(siteId, id, dbPayload, userId);
    return formatServiceFromDb(updated);
  }
}

export const serviceService = new ServiceService();
