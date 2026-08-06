# PROGRESS — Vaidyasala

## Current phase
Phase 7 — Deploy & Launch. **STALLED at 7-PRE. Nothing is deployed. The server was
never contacted.** 7A artifacts authored offline and committed; 7B is manual.

## Done
- ✓ Phase 0-6 complete (foundation/CI, ingest+AI pipeline, public core+SEO+perf,
  search 4A+4B, engagement loop, admin+ops).
- ✓ Domain propagation (bd299a7): vaidhyasala.com now in env defaults, seed/admin
  emails, OG-image footer, newsletter From, worker fallbacks, PHASES.md + CLAUDE.md.
- ✓ VPS credentials recorded (14c9005): VPS_USER=root,
  VPS_SSH_KEY=C:\Users\Owner\.ssh\id_ed25519 (id_rsa does not exist on this machine).
  **Neither has ever authenticated — no login has succeeded.**
- ✗ 7-PRE audit — NOT RUN. `ssh root@194.164.151.202` is denied by the agent
  permission layer. docs/SERVER-AUDIT.md is a NO-GO stub holding the exact
  read-only command block; every field in it is UNKNOWN by design, not filled
  with guesses (a wrong WEB_PORT collides with one of the 10 live sites).
- ✓ 7A artifacts, offline only (fb04593):
  - infra/docker/Dockerfile.web (deps→build→standalone runner, non-root, healthcheck)
  - infra/docker/Dockerfile.worker (esbuild bundle + yt-dlp/ffmpeg layer)
  - apps/worker: `build:bundle` via esbuild; `start` now runs dist-bundle/main.js.
    Fixes a real pre-existing break — @vaidyasala/core and @vaidyasala/db export raw
    .ts, so the old `node dist/main.js` could not resolve them. @anthropic-ai/sdk and
    @prisma/client promoted to direct worker deps.
  - infra/docker/compose.prod.yml — LAW 6 shape: only web publishes a port and only
    on 127.0.0.1; WEB_PORT required with no default; memory limits per service.
  - infra/scripts/setup-vaidyasala.sh — writes only under /opt/vaidyasala, starts
    nothing, and aborts before any write if WEB_PORT is not free at run time.
  - .github/workflows/deploy.yml — build_only dispatch; migrate → rolling restart of
    our services by name → smoke → rollback; diffs non-vaidyasala `docker ps`
    before/after and fails if anything else changed.
  - .env.production.example, docs/GO-LIVE-MANUAL.md (proxy recipes per proxy type,
    Cloudflare steps, remaining-manual-steps table).
- ✓ Checks: typecheck ✓ · lint ✓ (dist-bundle/ added to base eslint ignores) ·
  deploy.yml + compose.prod.yml parse as valid YAML ✓ · setup script `bash -n` ✓ and
  its missing-WEB_PORT guard fires ✓ · worker bundle boots ("[worker] boot", then
  Redis ECONNREFUSED as expected) ✓.

## Next step
Clear the 7-PRE blocker, then re-run Phase 7 from the audit. Order in
docs/GO-LIVE-MANUAL.md: audit → GitHub secrets + `build_only` image proof →
provision /opt/vaidyasala → stack up → proxy vhost → Cloudflare → backfill.

## Blockers
- **7-PRE (hard):** ssh to the VPS is denied by the agent permission layer. Allowlist
  it, or have a human run the read-only block in SERVER-AUDIT.md and paste it back.
  Until then WEB_PORT, EXISTING_PROXY and the RAM budget are all unknown.
- **Dockerfiles UNVERIFIED:** no working Docker daemon locally (npipe not found), so
  neither image has ever been built. Prove them with the `build_only` dispatch before
  ENABLE_DEPLOY is set. Expect first-run fixes.
- **Deploy secrets not set:** VPS_HOST / VPS_USER / VPS_SSH_KEY and ENABLE_DEPLOY
  need a repo admin.
- **§10 origin firewall lock skipped** on this shared box (no ufw/iptables per LAW 6);
  Host-header-only vhost is the compensating control. Human decision, logged.
- AI/ASR/YouTube/R2/INDEXNOW/RESEND/ANTHROPIC/EMBED/Turnstile/GSC keys still absent →
  fixture/MinIO mode; live sends + seo-pull remain BLOCKED.
- Local Lighthouse trace bug (perf/LCP NaN); CI Linux measures fine.
