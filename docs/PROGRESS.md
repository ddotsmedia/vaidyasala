# PROGRESS — Vaidyasala

## Current phase
Phase 2 — Ingest & AI Pipeline (2A ✓ · next 2B)

## Done
- ✓ Phase 0 + preflight + Phase 1 (1A-1D) COMPLETE — CI green (run #1 success)
  - monorepo (config/core/db/ui + web/worker), Prisma schema + pgvector/HNSW + seed,
    design system + shell + /styleguide, CI/deploy workflows, vitest + playwright + lhci
- ✓ 2A Core AI abstractions (§8.1/§8.2):
  - packages/core/ai: AsrProvider/LlmProvider/EmbedProvider interfaces
  - providers: claude.ts (Anthropic SDK, Sonnet-5 workhorse / Haiku-4.5 cheap),
    sarvam.ts, whisper.ts, embed.ts (fetch-based, injectable for tests)
  - TokenBucket rate limiter, CircuitBreaker, cost accounting, completeJson (Zod + 2-retry repair)
  - packages/core/validation/ai.ts: Asr/Correction/Translation/ChapterSet/Enrichment/ArticleDraft schemas
  - prompts/ (correct-ml, translate, chapterize, enrich, article) + glossary injection + hallucination rules
  - 12 AI unit tests, all with mocked/injected providers — ZERO real API calls
- ✓ Exit checks: vitest green (19 tests), typecheck ✓, lint ✓

## Next step
Phase 2B — apps/worker BullMQ flow (parent + children per §8.2), ingest.ts (YouTube Data API,
thumbnails→R2, yt-dlp audio), Job-table mirroring, webhook + admin ingest endpoints, smoke one real URL.

## Blockers
- AI/ASR keys (ANTHROPIC/SARVAM/WHISPER/EMBED) absent → providers throw at runtime; jobs run
  against fixtures in 2C, live-run BLOCKED per LAW 1. Tests unaffected (injected fakes).
- R2 creds absent → 2B decides MinIO local fallback vs BLOCKED, record in DECISIONS.
- Dev host ports 55432/56379/57700. typedRoutes off until Phase 3B.
