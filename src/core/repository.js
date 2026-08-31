import prisma from "@/lib/prisma";

export class BaseRepository {
  constructor(modelName) {
    if (!modelName || !prisma[modelName]) {
      throw new Error(`Invalid model name: ${modelName}`);
    }
    this.modelName = modelName;
    this.db = prisma[modelName];
    this.isSiteScoped = [
      "page",
      "post",
      "service",
      "section",
      "testimonial",
      "faq",
      "teamMember",
      "legalPage",
      "redirect",
      "visitorLog",
      "contactFormSubmission",
      "lead",
      "apiKey",
      "media",
      "mediaFolder",
      "globalsettings",
      "webhookEvent",
      "webhookSubscription",
      "siteUser",
      "auditLog",
    ].some((m) => m.toLowerCase() === modelName.toLowerCase());
  }

  applySoftDelete(where) {
    const hasSoftDelete = [
      "site",
      "user",
      "siteUser",
      "media",
      "mediaFolder",
      "page",
      "section",
      "globalsettings",
      "webhookSubscription",
      "category",
      "tag",
      "post",
      "service",
      "testimonial",
      "faq",
      "teamMember",
      "legalPage",
      "redirect",
      "contactFormSubmission",
      "lead",
      "apiKey",
    ].some((m) => m.toLowerCase() === this.modelName.toLowerCase());

    if (hasSoftDelete) {
      return { deletedAt: null, ...where };
    }
    return where;
  }

  async findMany(siteId, options = {}) {
    const where = (this.isSiteScoped && siteId !== null && siteId !== undefined)
      ? { siteId, ...options.where }
      : { ...options.where };
    return this.db.findMany({
      ...options,
      where: this.applySoftDelete(where),
    });
  }

  async findUnique(siteId, id, options = {}) {
    const where = (this.isSiteScoped && siteId !== null && siteId !== undefined)
      ? { id, siteId, ...options.where }
      : { id, ...options.where };
    if (!this.isSiteScoped) {
      return this.db.findFirst({
        ...options,
        where: this.applySoftDelete({ id }),
      });
    }
    return this.db.findFirst({
      ...options,
      where: this.applySoftDelete(where),
    });
  }

  async findFirst(siteId, options = {}) {
    const where = (this.isSiteScoped && siteId !== null && siteId !== undefined)
      ? { siteId, ...options.where }
      : { ...options.where };
    return this.db.findFirst({
      ...options,
      where: this.applySoftDelete(where),
    });
  }

  async create(siteId, data, options = {}) {
    const createData = (this.isSiteScoped && siteId !== null && siteId !== undefined)
      ? { ...data, siteId }
      : data;
    return this.db.create({
      ...options,
      data: createData,
    });
  }

  async update(siteId, id, data, options = {}) {
    if (this.isSiteScoped) {
      const record = await this.findUnique(siteId, id);
      if (!record) {
        throw new Error(`Record not found or access denied in ${this.modelName}: ${id}`);
      }
    }
    return this.db.update({
      ...options,
      where: { id },
      data,
    });
  }

  async delete(siteId, id, options = {}) {
    if (this.isSiteScoped) {
      const record = await this.findUnique(siteId, id);
      if (!record) {
        throw new Error(`Record not found or access denied in ${this.modelName}: ${id}`);
      }
    }

    const hasSoftDelete = [
      "site",
      "user",
      "siteUser",
      "media",
      "mediaFolder",
      "page",
      "section",
      "globalsettings",
      "webhookSubscription",
      "category",
      "tag",
      "post",
      "service",
      "testimonial",
      "faq",
      "teamMember",
      "legalPage",
      "redirect",
      "contactFormSubmission",
      "lead",
      "apiKey",
    ].includes(this.modelName);

    if (hasSoftDelete) {
      return this.db.update({
        ...options,
        where: { id },
        data: { deletedAt: new Date() },
      });
    }

    return this.db.delete({
      ...options,
      where: { id },
    });
  }

  async hardDelete(siteId, id, options = {}) {
    if (this.isSiteScoped) {
      const record = await this.findUnique(siteId, id);
      if (!record) {
        throw new Error(`Record not found or access denied in ${this.modelName}: ${id}`);
      }
    }
    return this.db.delete({
      ...options,
      where: { id },
    });
  }

  async count(siteId, whereClause = {}) {
    const where = (this.isSiteScoped && siteId !== null && siteId !== undefined)
      ? { siteId, ...whereClause }
      : whereClause;
    return this.db.count({
      where: this.applySoftDelete(where),
    });
  }
}
