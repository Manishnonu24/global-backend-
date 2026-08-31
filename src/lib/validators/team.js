import { z } from "zod";

export const TeamMemberValidationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  role: z.string().min(1, "Role is required"),
  photo: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  socialLinks: z.record(z.string()).nullable().optional(),
  sortOrder: z.number().int().default(0),
});
