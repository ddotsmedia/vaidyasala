import { z } from "zod";

/** Web runtime env, validated at module load (LAW 4). */
const envSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().url().optional(),
  REDIS_URL: z.string().url().default("redis://localhost:56379"),

  // WebSub/PubSubHubbub (§9.1): GET verify token + POST HMAC secret.
  WEBSUB_VERIFY_TOKEN: z.string().optional(),
  WEBSUB_SECRET: z.string().optional(),

  // RBAC stub for the admin ingest endpoint until Better Auth lands (2D).
  ADMIN_INGEST_TOKEN: z.string().optional(),
});

export const env = envSchema.parse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL,
  WEBSUB_VERIFY_TOKEN: process.env.WEBSUB_VERIFY_TOKEN,
  WEBSUB_SECRET: process.env.WEBSUB_SECRET,
  ADMIN_INGEST_TOKEN: process.env.ADMIN_INGEST_TOKEN,
});
