import { z } from "zod";

/** Web runtime env, validated at module load (LAW 4). */
const envSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().url().optional(),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),

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
  EMAIL_FROM: z.string().default("Vaidyasala <newsletter@vaidhyasala.com>"),

  // Meilisearch (§14). Absent master key ⇒ search returns empty (still logged).
  MEILI_URL: z.string().url().default("http://localhost:7700"),
  MEILI_MASTER_KEY: z.string().optional(),

  // AI answer (§6.4/§14). Absent ⇒ fixture mode: embeddings skipped (lexical
  // retrieval) and answers are extractive from retrieved segments.
  ANTHROPIC_API_KEY: z.string().optional(),
  EMBED_API_KEY: z.string().optional(),

  // Monitoring + analytics (§7.6/§10). All optional: absent ⇒ that sink is inert.
  // NOTE: the NEXT_PUBLIC_* values are also read as literal `process.env.X` in
  // lib/analytics and lib/monitoring — Next only inlines literal references into
  // the client bundle, so those call sites cannot go through this object.
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_SENTRY_ENV: z.string().optional(),
  NEXT_PUBLIC_MIXPANEL_TOKEN: z.string().optional(),
  SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).optional(),
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
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  EMBED_API_KEY: process.env.EMBED_API_KEY,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  NEXT_PUBLIC_SENTRY_ENV: process.env.NEXT_PUBLIC_SENTRY_ENV,
  NEXT_PUBLIC_MIXPANEL_TOKEN: process.env.NEXT_PUBLIC_MIXPANEL_TOKEN,
  SENTRY_TRACES_SAMPLE_RATE: process.env.SENTRY_TRACES_SAMPLE_RATE,
});
