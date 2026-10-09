import { z } from "zod";

export const listProblemsQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  topic: z.string().trim().toLowerCase().max(50).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});