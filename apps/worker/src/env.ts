import { z } from "zod";

/** Worker runtime env, validated once at boot (LAW 4: every input crosses Zod). */
const envSchema = z.object({
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
  DATABASE_URL: z.string().url().optional(),
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(32).default(4),
});

export const env = envSchema.parse({
  REDIS_URL: process.env.REDIS_URL,
  DATABASE_URL: process.env.DATABASE_URL,
  WORKER_CONCURRENCY: process.env.WORKER_CONCURRENCY,
});
