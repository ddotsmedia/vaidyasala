# PROGRESS — Vaidyasala

## Current phase
Phase 5 — Engagement Loop ✓ COMPLETE · next: Phase 6 (Full Admin & Ops)

## Done
- ✓ Phase 0-4 complete (foundation/CI, ingest+AI pipeline, public core+SEO+perf, search 4A+4B)
- ✓ Phase 5 Engagement Loop (§6.1-6.3, §2 WatchProgress, §13):
  - WatchProgress: lib/viewer (getViewerKey "u:{id}"/"a:{uuid}" cookie + mergeAnonProgress on
    login, furthest-position), POST/GET /api/v1/progress beacon, lib/progress (getContinueWatching,
    getResumePosition); ProgressBeacon (10s + pagehide sendBeacon); resume-at-position resolved
    client-side (URL ?t= then GET) to keep /watch static
  - ContinueWatchingRail on home island + /continue page (resume-linked, progress bars)
  - Watch-next 8s cancellable auto-advance (pre-existing WatchNextCard) + SubscribeCTA variants +
    /subscribe (pre-existing) — subscribe_click at 75%, sub_confirmation UTM
  - Comments: POST /api/v1/comments (authed VIEWER+, PENDING default, Turnstile verify graceful),
    GET approved; CommentSection on watch page; /admin/comments moderation (approve/reject/spam) +
    nav; commentInputSchema
  - Newsletter: worker jobs/newsletter-assemble.ts (weekly cron Mon 06:00, §9.3) → NewsletterIssue
    draft from Enrichment.newsletterMd; GET /api/v1/newsletter/unsubscribe
  - PWA: app/manifest.ts (installable, SVG icon), public/sw.js (network-first nav + rolling 10-page
    cache + /offline), /offline page, Pwa install-prompt (after 2nd visit) mounted in root layout
- ✓ Exit checks (verified live): POST progress→204+cookie; GET resume→{positionSec:120};
    continue-watching survives reload (same cookie); comment PENDING hidden→APPROVED shown;
    POST comment unauth→401; newsletter draft assembles from seed enrichment (ML subject+watch
    links+unsubscribe); manifest/sw/offline 200; typecheck ✓ lint ✓ test ✓ (75) e2e ✓ (5).

## Next step
Phase 6 — Full Admin & Ops (§7.6, §9.3, §10, §4 Tier 3): /admin/articles (MDX editor + regenerate
w/ EnrichmentDiff), /admin/topics + /admin/playlists CRUD, /admin/media (R2 browser), /admin/settings
(trusted-mode auto-publish §8.3), /admin/newsletter (issue list + approve → Resend batch); SEO
dashboard (seo-pull GSC+CrUX → SeoSnapshot, /admin/seo, link-crawl + search-consistency nightly);
funnel analytics /admin/analytics (view→play→75%→sub-click, leaderboard, AI cost per video);
AuditLog on every admin mutation (mostly done) + 2FA (TOTP) for EDITOR/ADMIN; infra/scripts/backup.sh
+ restore.sh; observability compose profile (prometheus/grafana/loki/uptime-kuma) + alerts.

## Blockers
- AI/ASR/YouTube/R2/INDEXNOW/RESEND/ANTHROPIC/EMBED/Turnstile/GSC keys absent → fixtures/MinIO/
  fixture-mode; live sends + external pulls BLOCKED (LAW 1).
- Docker daemon UNSTABLE here (flaps); dev Meili key=devMasterKeyChangeMe0000000000000000. Kill stale
  `next start` on :3000 before restart. .env auto-rewritten wrong by linter — export explicit creds.
- Local Lighthouse trace bug (perf/LCP NaN); CI Linux measures fine. Phase 7 = human-gated VPS deploy.
