# PROGRESS — Vaidyasala

## Current phase
Analytics & Monitoring (Sarvam / Mixpanel / Sentry) ✓ COMPLETE, committed + pushed.
Phase 7 deploy still STALLED — not deployed, see blockers.

## Done
- ✓ Phase 0-6 complete (foundation/CI, ingest+AI pipeline, public core+SEO+perf,
  search 4A+4B, engagement loop, admin+ops).
- ✓ 7A artifacts authored offline (fb04593); 7-PRE audit output now committed (d613086):
  nginx on 80/443, 4 cores, 15Gi RAM / 8.8Gi available, **disk 91% full (18G free)**,
  ~50 ports in LISTEN. WEB_PORT/EXISTING_PROXY still to be recorded in VARIABLES.md.
- ✓ Analytics & Monitoring (289b657):
  - Sarvam: packages/core/src/sarvam/client.ts is the single implementation
    (@vaidyasala/core/sarvam); ai/providers/sarvam.ts is a thin adapter. Adds the
    batch-job path (submit→poll→collect) + progress, auto-selected past 300s audio.
    Sarvam was ALREADY primary — no Whisper was in the pipeline to replace.
  - Haiku is the default LLM tier; explicit `tier: "workhorse"` still gets Sonnet.
  - Mixpanel: apps/web/lib/analytics/ (import from @/lib/analytics). Second sink
    behind first-party /api/v1/events; lazy-imported at idle; no-op without token
    or under DNT/GPC. play/pause/seek/25-50-75/complete/subscribe_click, cohorts,
    search→click→watch→subscribe funnel. Search text never sent (query_length only).
  - Sentry (new, none existed): web instrumentation + Prisma DB spans, 5% browser /
    20% server traces, replay off, tunnelRoute /monitoring; video time-to-first-frame
    + rebuffer metrics; worker capture centralised in runMirrored(); >5% error-rate
    alerts as ratios in alerts.yml; docs/MONITORING.md for the manual UI steps.
- ✓ Checks: typecheck ✓ · lint ✓ · unit 79 ✓ · e2e 5 ✓ · web build ✓ ·
  worker bundle 82kb ✓ (after externalising @sentry/node — bundling it hit 1.5mb
  and breaks its require-hook instrumentation).

- ✓ Phase 2A watch-page gaps (e317bf6). The page already existed (Phases 3+5), so this
  filled real gaps and extended existing components rather than adding parallel ones:
  transcript search (+<mark> highlight, auto-scroll paused while searching), like/bookmark
  (VideoReaction + /api/videos/[id]/reaction, optimistic), English summary surfaced,
  view count, mobile collapse built into transcript-view/chapter-list headings, comments
  bottom sheet (<dialog>, fetches only when opened), persistent Subscribe CTA alongside
  the §6.1 75% banner, X/Twitter share, GET /api/videos/[id]/enrichment (id or slug),
  GET|POST /api/videos/[id]/watch-progress sharing one write path with the beacon, ISR 3600.
  Migration additive only (watchedPercentage default 0 + new VideoReaction table).
  Endpoints smoke-tested on the dev DB: progress monotonic, reactions toggle independently.

## Next step
Deploy is NOT done. Before any deploy: fill WEB_PORT + EXISTING_PROXY=nginx in
VARIABLES.md from the audit, then follow docs/GO-LIVE-MANUAL.md.

## Blockers
- **Deploy blocked:** ssh to the VPS is still denied by the agent permission layer,
  ENABLE_DEPLOY / VPS_* secrets are unset, and no GO decision is recorded. Nothing
  in this session touched the server.
- **Disk at 91% (18G free)** on the shared VPS. Sizing our images + volumes against
  that is a decision for a human before deploying alongside 10 live sites.
- **infra/docker/Dockerfile.web was rewritten outside this session** to a naive
  single-stage build ending in `pnpm --filter @vaidyasala/web start` — that is
  `next start`, which Next explicitly warns is wrong under `output: "standalone"`
  (the e2e run prints the warning). It also uses `--no-frozen-lockfile`. Left as
  found per instruction; needs a decision before it builds the deployed image.
- **.env.production.example is read-denied** to the agent, so the new monitoring
  keys could not be added there; they are documented in docs/MONITORING.md instead.
- Sentry/Mixpanel keys absent ⇒ both sinks inert until DSN/token are set. Alert
  rules in the Sentry UI are manual (docs/MONITORING.md).
- AI/ASR/YouTube/R2/RESEND/GSC keys still absent ⇒ fixture/MinIO mode.
- Local Lighthouse trace bug (perf/LCP NaN); CI Linux measures fine.
