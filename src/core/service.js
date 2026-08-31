import { logAction } from "@/lib/audit";
import { EventBus } from "./events";
import { ValidationError, NotFoundError } from "./errors";

export class BaseService {
  constructor(repository, validatorSchema = null) {
    this.repository = repository;
    this.validatorSchema = validatorSchema;
  }

  async validate(data) {
    if (this.validatorSchema) {
      const parsed = this.validatorSchema.safeParse(data);
      if (!parsed.success) {
        throw new ValidationError(parsed.error.issues || parsed.error.errors);
      }
      return parsed.data;
    }
    return data;
  }

  async getList(siteId, options = {}) {
    return this.repository.findMany(siteId, options);
  }

  async getById(siteId, id, options = {}) {
    const record = await this.repository.findUnique(siteId, id, options);
    if (!record) {
      throw new NotFoundError(this.repository.modelName);
    }
    return record;
  }

  async create(siteId, data, userId = null, options = {}) {
    const validatedData = await this.validate(data);
    const created = await this.repository.create(siteId, validatedData, options);

    // Audit Logging
    if (userId) {
      try {
        await logAction(siteId, userId, `${this.repository.modelName.toUpperCase()}_CREATE`, {
          id: created.id,
        });
      } catch (err) {
        console.error("Audit log failed for create action:", err);
      }
    }

    // Emit Event
    EventBus.emit(`${this.repository.modelName}.created`, { siteId, userId, data: created });

    return created;
  }

  async update(siteId, id, data, userId = null, options = {}) {
    const validatedData = await this.validate(data);
    const updated = await this.repository.update(siteId, id, validatedData, options);

    // Audit Logging
    if (userId) {
      try {
        await logAction(siteId, userId, `${this.repository.modelName.toUpperCase()}_UPDATE`, {
          id,
        });
      } catch (err) {
        console.error("Audit log failed for update action:", err);
      }
    }

    // Emit Event
    EventBus.emit(`${this.repository.modelName}.updated`, { siteId, userId, data: updated });

    return updated;
  }

  async delete(siteId, id, userId = null, options = {}) {
    const deleted = await this.repository.delete(siteId, id, options);

    // Audit Logging
    if (userId) {
      try {
        await logAction(siteId, userId, `${this.repository.modelName.toUpperCase()}_DELETE`, {
          id,
        });
      } catch (err) {
        console.error("Audit log failed for delete action:", err);
      }
    }

    // Emit Event
    EventBus.emit(`${this.repository.modelName}.deleted`, { siteId, userId, data: deleted });

    return deleted;
  }
}
