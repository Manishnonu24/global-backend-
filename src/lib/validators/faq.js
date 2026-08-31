import { z } from "zod";

export const FaqValidationSchema = z.object({
  question: z.string().min(1, "Question is required"),
  answer: z.string().min(1, "Answer is required"),
  pageId: z.string().nullable().optional(),
  sortOrder: z.number().int().default(0),
  showHide: z.boolean().default(true),
  schemaMarkup: z.boolean().default(false),
});
