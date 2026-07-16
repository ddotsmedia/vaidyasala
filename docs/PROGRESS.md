# PROGRESS — Vaidyasala

## Current phase
Phase 2 — Ingest & AI Pipeline (2A ✓ · 2B ✓ · next 2C)

## Done
- ✓ Phase 0 + preflight + Phase 1 (1A-1D) — CI green
- ✓ 2A Core AI abstractions (§8.1/§8.2): providers, validation schemas, prompts, repair loop, 12 tests
- ✓ 2B Worker, queues, ingest (§9, §3, §2 Job):
  - packages/core/queue: QUEUE_NAMES, PIPELINE_STAGES (§8.2 order), idempotencyKey,
    parseYouTubeId, ingestInputSchema — shared contract for web + worker (9 tests)
  - apps/worker: env (S3/YouTube/yt-dlp), S3-compatible StoragePort (R2/MinIO, auto-bucket),
    YouTube metadata fetcher (Data API + yt-dlp keyless fallback), yt-dlp audio extractor,
    Job-table mirror (runMirrored: active→done|failed), queues + JOB_OPTS (backoff ×5),
    FlowProducer pipeline chain (leaf asr→root quality-gate), DLQ, cron schedulers
    (15-min yt-poll + hourly stats-refresh), ingest/stats-refresh/yt-poll jobs (8 tests)
  - apps/web: POST /api/webhooks/youtube (WebSub GET verify + POST HMAC), POST
    /api/v1/admin/videos/ingest (Zod + RBAC stub) — both enqueue via lib/queue
  - infra: compose.dev.yml scoped MinIO (127.0.0.1:59000); .env.example updated
- ✓ Exit checks: typecheck ✓, lint ✓, tests green (36 total: core 28, worker 8);
  storage path verified live against MinIO (put + auto-create bucket)

## Next step
Phase 2C — AI chain jobs (asr, correct, translate, chapterize, enrich, article, embed,
link, index-search, quality-gate, og-image) registered into the pipeline flow via
registerPipelineStage(); resumable + idempotent; fixtures where keys absent (§8.2, §8.3).

## Blockers
- yt-dlp + ffmpeg not installed locally → audio extraction + yt-dlp metadata fallback
  live-run BLOCKED; ingest verified via injected fakes (zero real calls).
- YOUTUBE_API_KEY / YOUTUBE_CHANNEL_ID absent → Data API metadata/stats/poll live-run
  BLOCKED (jobs no-op with clear BLOCKED logs).
- Full live YouTube→ingest smoke BLOCKED (needs a metadata source: API key OR yt-dlp).
  Storage half proven against MinIO. R2 prod creds absent → dev uses MinIO fallback.
- AI/ASR keys (ANTHROPIC/SARVAM/EMBED) still absent → 2C runs on fixtures.
- Dev host ports 55432/56379/57700/59000. typedRoutes off until Phase 3B.
