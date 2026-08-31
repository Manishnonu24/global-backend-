import { z } from "zod";

export const TestimonialValidationSchema = z.object({
  clientName: z.string().min(1, "Client name is required"),
  clientImage: z.string().nullable().optional(),
  rating: z.number().int().min(1).max(5).default(5),
  content: z.string().min(1, "Testimonial content is required"),
  showHide: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});
