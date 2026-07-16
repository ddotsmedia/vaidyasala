import { z } from "zod";

/** Worker runtime env, validated once at boot (LAW 4: every input crosses Zod). */
const envSchema = z.object({
  REDIS_URL: z.string().url().default("redis://localhost:56379"),
  DATABASE_URL: z.string().url().optional(),
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(32).default(4),

  // Object storage (Cloudflare R2 in prod, MinIO in dev — S3-compatible, §12).
  // Absent creds ⇒ storage disabled; ingest skips media upload and marks BLOCKED.
  S3_ENDPOINT: z.string().url().optional(),
  S3_REGION: z.string().default("auto"),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_BUCKET_MEDIA: z.string().default("vaidyasala-media"),
  S3_FORCE_PATH_STYLE: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  S3_PUBLIC_BASE_URL: z.string().url().optional(),

  // YouTube Data API (metadata/stats/poll). Absent ⇒ yt-dlp metadata fallback
  // (no key needed) for ingest; stats-refresh + poll cron are BLOCKED.
  YOUTUBE_API_KEY: z.string().optional(),
  YOUTUBE_CHANNEL_ID: z.string().optional(),

  // External binaries for audio extraction. Absent ⇒ audio step BLOCKED.
  YT_DLP_PATH: z.string().default("yt-dlp"),

  // Meilisearch (index config in Phase 4). Absent master key ⇒ index-search skips.
  MEILI_URL: z.string().url().default("http://localhost:57700"),
  MEILI_MASTER_KEY: z.string().optional(),

  // AI keys (Phase 2C). Absent ⇒ pipeline runs on fixtures, live BLOCKED (LAW 1).
  ANTHROPIC_API_KEY: z.string().optional(),
  SARVAM_API_KEY: z.string().optional(),
  EMBED_API_KEY: z.string().optional(),
});

export const env = envSchema.parse(process.env);
export type WorkerEnv = z.infer<typeof envSchema>;
