# PROGRESS — Vaidyasala

## Current phase
Phase 6 complete. **Phase 7 (deploy) has never run** — the stack has never
started on the VPS. All feature work below is committed but unobservable.

## Done
- ✓ Phases 0–6: foundation/CI, ingest + AI pipeline, public core + SEO + perf,
  search (4A/4B + 2D/2E), engagement loop, admin + ops.
- ✓ Analytics & monitoring: Sarvam ASR (batch path), Haiku default tier,
  Mixpanel behind first-party events, Sentry web + worker. See MONITORING.md.
- ✓ Page gaps 2A–2E: watch, home (fixed home rendering dynamic — ISR was inert),
  topic hubs, search filters/sort. 4A: recharts panels on /admin/analytics.
- ✓ Docker: both images build and run — web 117 MB serving /api/health, worker
  `ready · workers=3 · pipelineStages=10`.
- ✓ Showcase phases 1/2/5, scoped to what an embedded-YouTube site can do:
  - Player (046c5a3): speed, theater, fullscreen, full YouTube key map,
    per-device persisted volume/mute/speed. 11 unit tests.
  - Grid (d5fc713): 5th column at 2xl, VideoGrid.Skeleton + loading.tsx.
  - Watchlist (a373813): /watchlist over existing VideoReaction.bookmarked.
- ✓ Checks: typecheck ✓ · lint ✓ · unit 30 ✓ · web build ✓ (/watchlist ƒ,
  /latest + /trending still ○ static).

## Next step
`ssh root@194.164.151.202`, then docs/BACKFILL-RUNBOOK.md (verified) —
import 503 videos, publish, revalidate. Nothing else changes what users see.
⚠ `pnpm search:reindex` on deploy for the 2D filterable/sortable attributes.

## Blockers
- **Deploy:** ssh denied by the agent permission layer every attempt;
  ENABLE_DEPLOY / VPS_* secrets unset. Nothing has ever touched the server.
- **DEPLOY_DIR ambiguous:** /opt/vaidyasala (CLAUDE.md) vs /opt/vaidhyasala
  (task prompts) vs /opt/lsn (memory). Needs one answer before deploying.
- **YouTube API key exposed** in a chat log — rotate before use.
- **Disk 91% → 84%** on a box with 17 live projects. `docker image prune`
  (dangling only) is safe; `docker system prune` is forbidden (LAW 6).
- TLS cert must be issued before the nginx vhost is enabled.
- VPS_USER=root gives Actions full control of the shared box — use a deploy key.
- Not buildable as specified (REVIEW-NOTES §2): HLS/DASH, bitrate ladders,
  frame extraction, custom scrubber, quality selector. No media is self-hosted.
