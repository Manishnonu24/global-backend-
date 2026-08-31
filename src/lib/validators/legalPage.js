import { z } from "zod";

export const LegalPageValidationSchema = z.object({
  title: z.string({
    required_error: "Title is required",
  }).min(1, "Title must be at least 1 character long").max(255, "Title must be under 255 characters"),
  content: z.string({
    required_error: "Content is required",
  }).min(1, "Content must be at least 1 character long"),
  contentJson: z.string().optional().nullable(),
  type: z.enum(["privacy", "terms", "cookies", "disclaimer", "refund"], {
    errorMap: () => ({ message: "Type must be one of: privacy, terms, cookies, disclaimer, refund" })
  }),
  published: z.boolean().optional(),
});
