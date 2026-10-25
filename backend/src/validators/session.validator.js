import { z } from "zod";

export const createSessionSchema = z.object({
  problem: z.string().trim().min(1, "Choose a problem"),
  visibility: z.enum(["private", "public"]),
});

export const nextSessionSchema = z.object({
  problem: z.string().trim().min(1, "Choose a problem"),
});

export const listPublicQuerySchema = z.object({
  problem: z.string().trim().max(120).optional(),
  status: z.enum(["waiting", "active"]).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});