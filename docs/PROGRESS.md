# PROGRESS — Vaidyasala

## Current phase
Phase 2 — Ingest & AI Pipeline COMPLETE (2A ✓ · 2B ✓ · 2C ✓ · 2D ✓) → next Phase 3A

## Done
- ✓ Phase 0 + Phase 1 (1A-1D) — CI green
- ✓ 2A AI abstractions · 2B worker/queues/ingest · 2C AI chain (all §8.2 steps + og-image)
- ✓ 2D Admin + Auth (§6.5, §13, §4 Tier-3, §10):
  - Better Auth (email+password, Prisma adapter, Profile-create hook) + /api/auth/[...all]
    + client; scripts/create-admin.ts (admin@vaidyasala.live seeded, password-hashed)
  - authorize(minRole) single RBAC layer (lib/authz) used by admin pages + API routes;
    ingest endpoint now EDITOR-gated (real session, stub removed)
  - admin queue API: GET list + SSE stream (/queue/stream) + POST /:jobId/retry
  - publish/hide server actions (status flip + AuditLog + updateTag fan-out stub §9.2)
  - (admin) shell (noindex) + /login + dashboard (ingest form) + /admin/queue (live
    QueueBoard SSE + retry) + /admin/videos (status-filter table) + /admin/videos/[id]
    (transcript word-diff, enrichment cards, FAQs, chapters, article MDX preview, PUBLISH)
- ✓ Exit checks: typecheck ✓, lint ✓, tests green (core 37, worker 15 + 1 integration),
    web build ✓ (all admin routes compile), admin login created against dev DB.
    Interactive browser login→publish e2e not run in this headless session (verified by
    build + auth-stack-against-DB + typecheck; Playwright e2e lands with 3D).

## Next step
Phase 3A — /watch/[slug]: ISR + revalidateTag('video:{id}'), hero + facade VideoPlayer
(thumbnail→IFrame on interaction, play/25/50/75/complete events), SummaryCard, StickyPlayer,
ChapterList, TranscriptView (virtualized, ML/EN), KeyTakeaways, FaqAccordion, RelatedRail,
WatchNextCard, ShareSheet, SubscribeCTA@75%, AudioModeBar; POST /api/v1/events; keyboard (§5.5).

## Blockers
- AI/ASR keys (ANTHROPIC/SARVAM/EMBED) absent → pipeline runs on fixtures; live BLOCKED.
- yt-dlp/ffmpeg + YOUTUBE_API_KEY absent → live YouTube ingest smoke BLOCKED.
- MEILI_MASTER_KEY unwired → index-search maps docs, skips upsert until Phase 4.
- 2FA (twoFactor) deferred to Phase 6 (better-auth pinned ~1.2.x for zod3 compat).
- R2 prod creds absent → dev MinIO. Dev ports 55432/56379/57700/59000. typedRoutes off till 3B.
