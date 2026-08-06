# PROGRESS — Vaidyasala

## Current phase
Phase 6 — Full Admin & Ops ✓ COMPLETE · autopilot STOP boundary (LAW 7) · next: Phase 7 (human-gated SHARED-VPS deploy — deploy prompt only)

## Done
- ✓ Phase 0-5 complete (foundation/CI, ingest+AI pipeline, public core+SEO+perf, search 4A+4B, engagement loop)
- ✓ Phase 6 Full Admin & Ops (§7.6, §9.3, §10, §4 Tier 3):
  - Admin nav + sections: /admin/settings (trusted-mode auto-publish toggle §8.3, lib/settings),
    /admin/topics + /admin/playlists CRUD, /admin/articles (MDX editor + status), /admin/media
    (R2/MinIO browser), /admin/newsletter (issue list + approve), /admin/seo, /admin/analytics.
    Every mutation writes AuditLog. Form-actions used in <form action> return Promise<void>;
    update/delete siblings return ActionResult.
  - 2FA (§10): self-contained RFC 6238 TOTP (lib/totp) — enroll at /2fa (secret+backup codes →
    verify 6-digit → user.twoFactorEnabled). Admin layout gates EDITOR/ADMIN → redirect /2fa
    (ADMIN_2FA_ENFORCE=false bypass for CI/e2e). better-auth twoFactor plugin dropped (type skew).
  - Analytics (lib/admin/analytics): funnel (play→75%→sub-click), video leaderboard, AI cost per
    video (Job.costUsd rollup).
  - Ops nightly (worker jobs/nightly.ts + cron): seo-pull (BLOCKED, no GSC/CrUX creds — stubbed),
    link-crawl (HEAD-probe sitemap → SiteHealthIssue), search-consistency (DB vs Meili doc-count
    drift → SiteHealthIssue). Weekly newsletter assemble (Mon 06:00). OPS_JOBS + main.ts registered.
  - infra/scripts/backup.sh (pg_dump | gzip -9, optional gpg + R2, 30-snapshot retention) +
    restore.sh (drill into scratch db, verify row counts, drop). observability compose profile
    (prometheus/grafana/loki/uptime-kuma, 127.0.0.1-only) + alerts.yml.
- ✓ Exit checks: typecheck ✓ · lint ✓ · e2e ✓ (5 passed) · web+worker build ✓ ·
    backup.sh+restore.sh round-trip on dev compose ✓ (Video 5/Topic 3/TranscriptSegmentVector 11) ·
    Setting migration applied ✓ · newsletter draft assembles ✓ · observability yaml valid ✓ ·
    2FA gate redirects unenrolled admin → /2fa ✓.

## Next step
Phase 7 — SHARED-VPS deploy (194.164.151.202, 10 live sites). HUMAN-GATED per LAW 6 + LAW 7:
runs ONLY from an explicit deploy prompt. Autopilot STOPS here. First Phase-7 task is a
read-only server audit (SERVER-AUDIT.md) with zero write ops.

## Blockers
- AI/ASR/YouTube/R2/INDEXNOW/RESEND/ANTHROPIC/EMBED/Turnstile/GSC keys absent → fixtures/MinIO/
  fixture-mode; live sends + external pulls (seo-pull) BLOCKED (LAW 1).
- Docker daemon UNSTABLE here (flaps); dev Meili key=devMasterKeyChangeMe0000000000000000. Kill
  stale `next start` on :3000 before restart. .env auto-rewritten wrong by linter — export creds.
- Local Lighthouse trace bug (perf/LCP NaN); CI Linux measures fine.
- `next start` warns under output:standalone (use node .next/standalone/server.js in prod) — Phase 7.
