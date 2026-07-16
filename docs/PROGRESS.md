# PROGRESS — Vaidyasala

## Current phase
Phase 2 — Ingest & AI Pipeline (2A ✓ · 2B ✓ · 2C ✓ · next 2D)

## Done
- ✓ Phase 0 + preflight + Phase 1 (1A-1D) — CI green
- ✓ 2A Core AI abstractions (§8.1/§8.2): providers, validation schemas, prompts, repair loop
- ✓ 2B Worker/queues/ingest: shared queue contract (core/queue), S3 storage (R2/MinIO),
    YouTube metadata (Data API + yt-dlp fallback) + audio, Job mirror, FlowProducer chain,
    DLQ, cron (yt-poll/stats-refresh), web webhook + admin ingest endpoints
- ✓ 2C AI chain (§8.2 all 10 steps + og-image):
  - core: search doc mapper (§14), chunkText/changedRatio/relatedScore helpers
  - worker pgvector helpers (video + per-segment vectors, cosine NN), pipeline deps +
    provider factory (injectable), Meili upsert port
  - stages: asr, correct (chunked + >40% diff-guard), translate (segment-aligned),
    chapterize (skip if YT chapters), enrich (Enrichment+Faq+Keyword), article (MDX +
    claim→segment verify), embed, link (TopicVideo + RelatedEdge §2 formula), index-search
    (mapper + guarded Meili upsert), quality-gate (composite → Video.qualityScore, →DRAFT),
    og-image (SVG → storage). All idempotent + resumable (read/write DB).
  - registerPipelineStages() wired into worker boot → ingest now enqueues the flow
- ✓ Exit checks: typecheck ✓, lint ✓, unit tests green (core 37, worker 15 + 1 integration);
    full-chain integration test ran green vs dev Postgres — Transcript/Enrichment/Article/
    Chapters/segment-vectors/RelatedEdge + DRAFT all persisted (fixtures; live AI BLOCKED)

## Next step
Phase 2D — Better Auth + Profile/RBAC (authorize() §10), (admin) layout (noindex),
/admin/queue (QueueBoard SSE + retry/DLQ), /admin/videos (+ [id] draft review:
transcript diff, enrichment cards, article preview, PUBLISH → status flip + revalidateTag stub).

## Blockers
- AI/ASR keys (ANTHROPIC/SARVAM/EMBED) absent → pipeline runs on fixtures; live-run BLOCKED.
- yt-dlp + ffmpeg absent + no YOUTUBE_API_KEY → live YouTube ingest smoke BLOCKED (storage
  half proven vs MinIO; AI chain proven vs dev DB with fixtures).
- MEILI_MASTER_KEY not wired → index-search maps docs but skips upsert until Phase 4.
- R2 prod creds absent → dev uses MinIO. Dev ports 55432/56379/57700/59000.
- typedRoutes off until Phase 3B.
