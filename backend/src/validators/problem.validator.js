import { z } from "zod";
import { LANGUAGE_IDS } from "../config/languages.js";

export const listProblemsQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),
  topic: z.string().trim().toLowerCase().max(50).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  progress: z.enum(["solved", "attempted", "unsolved"]).optional(),
});

export const runCodeSchema = z.object({
  language: z.enum(LANGUAGE_IDS),
  code: z.string().min(1, "Write some code first").max(50000, "Code is too long"),
  inputs: z.array(z.string().max(10000)).min(1).max(3).optional(),
});

export const submitCodeSchema = runCodeSchema.omit({ inputs: true }).extend({
  session: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{6}$/, "Invalid room code")
    .optional(),
});