import { BaseRepository } from "@/core/repository";

export class SectionRepository extends BaseRepository {
  constructor() {
    super("section");
  }
}

export const sectionRepository = new SectionRepository();
