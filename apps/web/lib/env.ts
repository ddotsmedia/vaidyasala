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

  // Better Auth (§10). Dev default secret; MUST be overridden in prod.
  BETTER_AUTH_SECRET: z.string().min(1).default("dev-only-insecure-secret-change-me"),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),

  // Email (Resend). Absent ⇒ newsletter runs in fixture mode (logs, no send).
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("Vaidyasala <newsletter@vaidyasala.live>"),

  // Meilisearch (§14). Absent master key ⇒ search returns empty (still logged).
  MEILI_URL: z.string().url().default("http://localhost:57700"),
  MEILI_MASTER_KEY: z.string().optional(),
});

export const env = envSchema.parse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL,
  WEBSUB_VERIFY_TOKEN: process.env.WEBSUB_VERIFY_TOKEN,
  WEBSUB_SECRET: process.env.WEBSUB_SECRET,
  ADMIN_INGEST_TOKEN: process.env.ADMIN_INGEST_TOKEN,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM,
  MEILI_URL: process.env.MEILI_URL,
  MEILI_MASTER_KEY: process.env.MEILI_MASTER_KEY,
});
