import { BaseRepository } from "@/core/repository";

export class ServiceRepository extends BaseRepository {
  constructor() {
    super("service");
  }

  async create(siteId, data, options = {}) {
    // Connect site via relation instead of setting siteId directly as a scalar
    const createData = {
      ...data,
      site: { connect: { id: siteId } }
    };
    return this.db.create({
      ...options,
      data: createData,
    });
  }
}

export const serviceRepository = new ServiceRepository();
