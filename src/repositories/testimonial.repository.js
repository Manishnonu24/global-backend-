import { BaseRepository } from "@/core/repository";

export class TestimonialRepository extends BaseRepository {
  constructor() {
    super("testimonial");
  }
}

export const testimonialRepository = new TestimonialRepository();
