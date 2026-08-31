import { BaseRepository } from "@/core/repository";

export class FaqRepository extends BaseRepository {
  constructor() {
    super("faq");
  }
}

export const faqRepository = new FaqRepository();
