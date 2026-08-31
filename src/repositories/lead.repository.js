import { BaseRepository } from "@/core/repository";

export class LeadRepository extends BaseRepository {
  constructor() {
    super("lead");
  }
}

export const leadRepository = new LeadRepository();
