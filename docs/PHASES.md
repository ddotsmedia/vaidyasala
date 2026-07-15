# PART 4 — THE PHASE PROMPTS

> Paste each block into a **fresh** Claude Code session, in order. Each is self-contained.
> Standard header on every prompt keeps sessions disciplined; standard footer forces the terse report.

---

## PHASE 0 — Kickoff (repo + state files) — ~5 min

```text
Follow CLAUDE.md laws strictly. Autopilot: zero questions.
Read: docs/VARIABLES.md only. Do NOT read docs/ARCHITECTURE.md this session.

TASK — initialize the repository:
1. git init (branch main), .gitignore (node, next, .env*, docker volumes, .turbo),
   .editorconfig, .nvmrc (22).
2. Create docs/PROGRESS.md (phase: 0, nothing done yet) and docs/DECISIONS.md (empty list).
3. Create empty monorepo skeleton: pnpm-workspace.yaml (apps/*, packages/*),
   root package.json with scripts: dev, build, lint, typecheck, test, db:migrate, db:seed.
4. Commit: "chore: repo kickoff". If GITHUB_REPO is filled in VARIABLES, add remote and push.

EXIT CHECKS: git log shows 1 commit; pnpm-workspace.yaml valid.
REPORT: file list + check results only.
```

---

## PHASE 1 — Foundation

### 1A — Monorepo + tooling + Docker dev env

```text
Follow CLAUDE.md laws strictly. Autopilot: zero questions.
Read: docs/PROGRESS.md + ARCHITECTURE §3 (folder structure), §12 (docker).

TASK:
1. Scaffold per §3: apps/web (Next.js 16, TS strict, App Router, Tailwind v4),
   apps/worker (Node TS, BullMQ skeleton with main.ts + empty queues/jobs dirs),
   packages/db, packages/core, packages/ui, packages/config (shared eslint/tsconfig/
   tailwind preset). Wire workspace deps. Import rules from §3 (core never imports React).
2. infra/docker: compose.dev.yml with postgres 17 (pgvector image), redis 7,
   meilisearch — healthchecks, named volumes, internal network. .env.example with all
   keys from docs/VARIABLES.md "EXTERNAL SERVICES".
3. Root scripts work end-to-end; add turbo (or pnpm -r) task pipeline.
4. Commit per step.

EXIT CHECKS: docker compose -f infra/docker/compose.dev.yml up -d → all healthy;
pnpm typecheck && pnpm lint pass; apps/web builds (pnpm --filter web build).
REPORT: paths + check results + blockers only.
```

### 1B — Database schema + migrations + seed

```text
Follow CLAUDE.md laws strictly. Autopilot: zero questions.
Read: docs/PROGRESS.md + ARCHITECTURE §2 (entire database schema section).

TASK:
1. packages/db: implement the FULL Prisma schema from §2 (multi-file schema:
   content.prisma, discovery.prisma, engagement.prisma, ops.prisma, auth via Better
   Auth generator). Include all enums, relations, pgvector Unsupported columns,
   indexes exactly as specified. Add the partial/HNSW indexes §2 needs via a raw SQL
   migration (pgvector extension, HNSW on segment vectors).
2. Migration runs clean against the dev compose postgres.
3. Seed script: 3 topics, 2 playlists, 5 fake videos with transcripts/chapters/faqs/
   enrichment (realistic Malayalam sample text), 1 admin user.
4. Export typed prisma client from packages/db. Commit per step.

EXIT CHECKS: pnpm db:migrate clean on fresh volume; pnpm db:seed succeeds;
pnpm typecheck passes.
REPORT: paths + check results + blockers only.
```

### 1C — Design system + UI primitives

```text
Follow CLAUDE.md laws strictly. Autopilot: zero questions.
Read: docs/PROGRESS.md + ARCHITECTURE §4 (component library), §5 (design system).

TASK:
1. packages/ui: Tailwind v4 @theme tokens exactly per §5.2 (dark default, light via
   [data-theme=light], high-contrast third mapping). Fonts per §5.3: Anek Malayalam
   Variable + Inter Variable, subset+preload strategy, fallback metrics (zero CLS).
2. Install shadcn/ui primitives listed in §4 Tier 1, restyled with tokens.
3. Build Tier-2 shells (typed props, all states incl. Skeleton twins, no data
   wiring yet): VideoCard, SubscribeCTA, TopicChip, SearchOmnibox (UI only),
   RelatedRail, NewsletterInline, ShareSheet.
4. apps/web: root layout with shell (top bar per §1.4, footer), theme switcher,
   reduced-motion handling, /styleguide dev-only page rendering every component in
   all states (this page is the visual test — keep it).
5. Commit per step.

EXIT CHECKS: pnpm --filter web build passes; /styleguide renders all components;
typecheck + lint pass.
REPORT: paths + check results + blockers only.
```

### 1D — CI

```text
Follow CLAUDE.md laws strictly. Autopilot: zero questions.
Read: docs/PROGRESS.md + ARCHITECTURE §11 (CI/CD block only).

TASK:
1. .github/workflows/ci.yml per §11 PR pipeline: pnpm cache, lint, typecheck,
   unit (vitest — add config + 2 sample tests in packages/core), build.
   Playwright + Lighthouse budgets: add as separate job, continue-on-error for now
   (flip to blocking in Phase 3).
2. .github/workflows/deploy.yml SKELETON only (build+push GHCR on main) — actual
   VPS deploy lands in Phase 7.
3. Commit.

EXIT CHECKS: `act` not required — validate YAML, and if remote exists, push and
confirm CI green.
REPORT: paths + check results + blockers only.
```

---

## PHASE 2 — Ingest & AI Pipeline

### 2A — Core abstractions (AI providers + validation)

```text
Follow CLAUDE.md laws strictly. Autopilot: zero questions.
Read: docs/PROGRESS.md + ARCHITECTURE §8.1, §8.2, §2 (Transcript/Enrichment models only).

TASK:
1. packages/core/ai: AsrProvider, LlmProvider, EmbedProvider interfaces per §8.1.
   Implementations: sarvam.ts, whisper.ts, claude.ts (Anthropic SDK, structured JSON
   outputs w/ Zod parse + 2-retry repair), embed.ts. Cost calculation per call.
   Circuit breaker + rate limiter (simple token bucket) shared by all providers.
2. packages/core/validation: Zod schemas for every AI output shape (AsrResult,
   CorrectionResult, EnrichmentResult, ArticleDraft, ChapterSet) + API DTOs used later.
3. Prompt templates as code (packages/core/ai/prompts/): correct-ml, translate,
   chapterize, enrich, article — with the medical-glossary injection point and the
   hallucination rules from §8.2 baked into the templates.
4. Unit tests with mocked providers (no real API calls in tests). Commit per step.

EXIT CHECKS: vitest green; typecheck; NO real API calls anywhere in tests.
REPORT: paths + check results + blockers only.
```

### 2B — Worker, queues, ingest job

```text
Follow CLAUDE.md laws strictly. Autopilot: zero questions.
Read: docs/PROGRESS.md + ARCHITECTURE §9 (automation), §3 (worker folder), §2 (Job model).

TASK:
1. apps/worker: BullMQ setup — one flow per video (parent + children per §8.2 order),
   queue defs, exponential backoff ×5, DLQ, Job table mirroring (§2) on every state
   change, idempotency keys {kind}:{videoId}:{contentHash}.
2. Jobs: ingest.ts (YouTube Data API metadata, thumbnails→R2 via S3 SDK, chapters
   from description, captions if present; yt-dlp audio extract→R2), stats-refresh.ts,
   cron scheduler (15-min poll fallback per §9.1).
3. apps/web: POST /api/webhooks/youtube (WebSub verify + HMAC per §9.1) and
   POST /api/v1/admin/videos/ingest (Zod, RBAC stub for now) — both enqueue.
4. Local run path: `pnpm --filter worker dev` processes a real public YouTube URL
   end-to-end through INGEST (use any public video for the smoke test).
5. Commit per step.

EXIT CHECKS: smoke: ingest one real YouTube URL → Video row INGESTING→PROCESSING,
audio + thumbs in R2 (or local MinIO fallback if R2 creds absent — decide per LAW 1
and record in DECISIONS). typecheck + tests green.
REPORT: paths + check results + blockers only.
```

### 2C — The AI chain (ASR → quality gate)

```text
Follow CLAUDE.md laws strictly. Autopilot: zero questions.
Read: docs/PROGRESS.md + ARCHITECTURE §8.2 (all 10 steps), §8.3.

TASK:
1. Implement jobs asr.ts, correct.ts (chunked 3k tokens, overlap, diff-guard >40%
   ⇒ flag), translate.ts (segment-aligned), chapterize.ts (skip if YT chapters),
   enrich.ts (single structured call → Enrichment row), article.ts (MDX draft +
   claim-to-segment verification pass), embed.ts (video + per-segment vectors),
   link.ts (TopicVideo scores + RelatedEdge graph per §2 formula), index-search.ts
   (Meilisearch upsert — index config comes in Phase 4, write the doc mapper now),
   quality-gate.ts (composite → Video.qualityScore, DRAFT flagging), og-image.ts
   (Satori render → R2).
2. Wire into the 2B flow in §8.2 order. Every job idempotent + resumable.
3. If SARVAM/ANTHROPIC keys absent in .env: implement + test against recorded
   fixtures, mark live-run BLOCKED, continue (LAW 1).
4. Commit per job.

EXIT CHECKS: full chain runs on the smoke video (live if keys present, fixtures if
not) → Transcript, Enrichment, Article, Chapters, vectors, RelatedEdges all persisted;
vitest green; typecheck.
REPORT: paths + check results + blockers only.
```

### 2D — Minimal admin: queue board + draft review

```text
Follow CLAUDE.md laws strictly. Autopilot: zero questions.
Read: docs/PROGRESS.md + ARCHITECTURE §6.5, §13 (admin routes), §4 Tier 3.

TASK:
1. Better Auth setup (packages + /api/auth/[...all]), Profile model wiring, RBAC
   middleware + authorize() helper per §10 — seed admin login.
2. (admin)/admin: layout (noindex), /admin/queue (QueueBoard: live job states via
   SSE, retry/DLQ actions), /admin/videos (DataTable: status filter),
   /admin/videos/[id] (draft review: transcript diff raw vs corrected, enrichment
   cards, article preview, PUBLISH button → status flip + revalidateTag fan-out stub).
3. Commit per step.

EXIT CHECKS: login → ingest URL from UI → watch chain complete → publish a draft;
non-admin gets 403; typecheck + lint.
REPORT: paths + check results + blockers only.
```

---

## PHASE 3 — Public Core

### 3A — Video page (the atomic unit)

```text
Follow CLAUDE.md laws strictly. Autopilot: zero questions.
Read: docs/PROGRESS.md + ARCHITECTURE §1.2, §6.1, §4 Tier 2 (player components), §5.4.

TASK:
1. /watch/[slug]: ISR + revalidateTag('video:{id}'), hero layout per §6.1 (title,
   facade VideoPlayer — thumbnail first, IFrame API on interaction, event emission
   play/25/50/75/complete), SummaryCard above fold.
2. StickyPlayer (dock on scroll, spring per §5.4), ChapterList (seek + active sync),
   TranscriptView (virtualized, playhead sync, ML/EN toggle, reading mode),
   KeyTakeaways, FaqAccordion (timestamp seek chips), RelatedRail (from RelatedEdge),
   WatchNextCard (end-of-video 8s countdown), ShareSheet (WhatsApp-first + UTM),
   SubscribeCTA at 75% event, AudioModeBar (Web Speech API).
3. Analytics: POST /api/v1/events + AnalyticsEvent writes for all funnel events.
4. Keyboard controls per §5.5. Commit per step.

EXIT CHECKS: seeded video renders complete; chapters seek; transcript syncs;
events land in DB; typecheck + lint + build.
REPORT: paths + check results + blockers only.
```

### 3B — Home, topic hubs, articles, feeds

```text
Follow CLAUDE.md laws strictly. Autopilot: zero questions.
Read: docs/PROGRESS.md + ARCHITECTURE §1.1, §1.3, §6.1 (home order).

TASK:
1. Home per §1.1 section order (Featured, Trending, Latest, Continue [Suspense
   island], Recommended [island], Popular topics, Latest articles, Subscribe,
   Newsletter). Static shell + streamed personalization per §11 rendering strategy.
2. /topics + /topics/[slug] (hub: hero video, all videos by TopicVideo.score,
   articles, FAQs, playlist links, AyurConnect cross-link). /articles/[slug] (MDX
   render, source-video card above fold, in-body links from link job).
   /playlists/[slug], /latest, /trending (7-day AnalyticsEvent window), /subscribe,
   /newsletter (double opt-in via Resend — fixture mode if key absent), trust pages.
3. Internal-link rule from §1.3: publish-time check ≥3 inbound links (implement in
   quality-gate).
4. Commit per step.

EXIT CHECKS: all routes render from seed data; home streams islands; build passes.
REPORT: paths + check results + blockers only.
```

### 3C — SEO machinery

```text
Follow CLAUDE.md laws strictly. Autopilot: zero questions.
Read: docs/PROGRESS.md + ARCHITECTURE §7 (entire SEO section).

TASK:
1. lib/seo: jsonld.ts builders for every schema stack in §7.1 table (VideoObject
   +Clip hasPart, FAQPage, MedicalWebPage, CollectionPage+ItemList, WebSite+
   SearchAction, Organization, BreadcrumbList, speakable). Wire into every page's
   generateMetadata + JSON-LD script tags.
2. sitemap.ts sharded + video sitemap extension; robots.ts; rss.xml full-content;
   Redirect table → middleware 301; canonical rules (?t= stripped).
3. Worker seo-ping.ts (IndexNow + Google sitemap ping on publish fan-out) and the
   publish fan-out itself per §9.2 (revalidate, sitemap, RSS, og-image, edges).
4. Disclaimer + reviewed-by block component on all medical pages (§7.3).
5. Commit per step.

EXIT CHECKS: JSON-LD on every page type validates (use schema-dts types at compile
time + a vitest structural test); sitemap + RSS respond; 301s work.
REPORT: paths + check results + blockers only.
```

### 3D — Performance gate

```text
Follow CLAUDE.md laws strictly. Autopilot: zero questions.
Read: docs/PROGRESS.md + ARCHITECTURE §11 (budgets), §5.3 (font loading).

TASK:
1. Audit + fix: image pipeline (next/image, R2 loader, blur placeholders), font
   subsetting/preload, JS budget ≤170KB gz on /watch (analyze bundle, dynamic-import
   heavy client components), zero-CLS check, PPR/streaming config.
2. Lighthouse CI (.lighthouserc) with §11 budgets; flip the CI job from
   continue-on-error to blocking. Playwright e2e: home→watch→chapter-seek→
   watch-next happy path, keyboard nav, search-open.
3. Commit per step.

EXIT CHECKS: lhci against local prod build: perf ≥95, LCP ≤1.8s, CLS ≤0.05 on
/watch + home; e2e green; CI fully blocking now.
REPORT: paths + numbers + blockers only.
```

---

## PHASE 4 — Search

### 4A — Meilisearch + omnibox

```text
Follow CLAUDE.md laws strictly. Autopilot: zero questions.
Read: docs/PROGRESS.md + ARCHITECTURE §14 (lexical block), §2 (SynonymMapping, SearchQueryLog).

TASK:
1. packages/core/search: index configs (videos/articles/topics/faqs per §14 weights,
   transcript chunking), reindex script (infra/scripts/reindex.ts), synonym sync from
   approved SynonymMapping rows.
2. GET /api/v1/search (Zod, rate-limited, SearchQueryLog write w/ script detection).
3. SearchOmnibox wiring: ⌘K, grouped instant results (<50ms), keyboard nav,
   voice input (Web Speech ml-IN), /search page for deep links.
4. Commit per step.

EXIT CHECKS: seed queries in Malayalam + English return correct grouped results;
query log rows written; reindex script rebuilds from empty.
REPORT: paths + check results + blockers only.
```

### 4B — Manglish + semantic + AI answers

```text
Follow CLAUDE.md laws strictly. Autopilot: zero questions.
Read: docs/PROGRESS.md + ARCHITECTURE §14 (manglish, semantic, AI answer blocks), §6.4.

TASK:
1. packages/core/search/manglish: script classifier + rule-based Mozhi/ISO-15919
   transliterator (top-k candidates) + SynonymMapping lookup; unit tests with 30
   real manglish health queries (write the fixture list yourself: prameham, thairoid,
   kolestrol, sugar kurakkan, mudi kozhichil, etc.).
2. Semantic layer: pgvector segment search (HNSW, cosine), trigger rules (zero/weak
   lexical, question-shaped), RRF hybrid merge.
3. POST /api/v1/ai/answer per §6.4/§14: embed → top-12 → rerank → threshold gate →
   Claude composes FROM SEGMENTS ONLY with [videoId,startSec] citations → SSE stream;
   below threshold → honest no-answer + nearest topics + gap log. UI: answer panel
   in search with playable timestamp chips.
4. Admin /admin/search-analytics: top queries, zero-result report (content-gap
   list), synonym approval queue.
5. Commit per step.

EXIT CHECKS: "prameham" finds diabetes content; question query returns cited
answer from fixtures/live; zero-result query logged + visible in admin; tests green.
REPORT: paths + check results + blockers only.
```

---

## PHASE 5 — Engagement Loop

```text
Follow CLAUDE.md laws strictly. Autopilot: zero questions.
Read: docs/PROGRESS.md + ARCHITECTURE §6.1–6.3, §2 (WatchProgress, viewerKey), §13 (progress/continue/comments/newsletter routes).

TASK:
1. WatchProgress: anonymous viewerKey cookie ("a:{uuid}"), POST /api/v1/progress
   (beacon), merge-on-login re-key, /continue page + ContinueWatchingRail on home
   and watch pages; resume-at-position in player.
2. Watch-next auto-advance wiring (RelatedEdge top pick, cancellable countdown).
3. SubscribeCTA final wiring: all 4 variants, live subscriber count (stats cron),
   sub_confirmation UTM links, click events. /subscribe conversion page.
4. Comments: authed POST, PENDING default, /admin/comments moderation queue,
   Turnstile. Newsletter: weekly assembly job (newsletter-assemble.ts →
   NewsletterIssue draft → admin approve → Resend batch send), unsubscribe route.
5. PWA: manifest.ts, service worker (offline shell + last 10 visited pages),
   install prompt (subtle, after 2nd visit).
6. Commit per step.

EXIT CHECKS: anonymous continue-watching survives reload; login merges progress;
auto-advance fires; comment flow end-to-end; newsletter draft assembles from seed
enrichments; PWA installable (lighthouse PWA pass); e2e updated + green.
REPORT: paths + check results + blockers only.
```

---

## PHASE 6 — Full Admin & Ops

```text
Follow CLAUDE.md laws strictly. Autopilot: zero questions.
Read: docs/PROGRESS.md + ARCHITECTURE §7.6, §9.3, §10 (monitoring/backups), §4 Tier 3.

TASK:
1. Admin completion: /admin/articles (MDX editor + regenerate w/ EnrichmentDiff),
   /admin/topics + /admin/playlists CRUD, /admin/media (R2 browser), /admin/settings
   (trusted-mode auto-publish toggle §8.3), /admin/newsletter (issue list + approve).
2. SEO dashboard: seo-pull.ts (GSC + CrUX APIs → SeoSnapshot), /admin/seo
   (per-URL trends, CWV, SiteHealthIssue list), link-crawl.ts nightly,
   search-consistency.ts nightly.
3. Funnel analytics: /admin/analytics — funnel chart (view→play→75%→sub-click),
   video leaderboard, AI cost per video (Job.costUsd rollup).
4. AuditLog writes on every admin mutation; 2FA (TOTP) enforcement for EDITOR/ADMIN.
5. infra/scripts/backup.sh (pg_dump + WAL→R2, encrypted) + restore.sh + docs
   in script headers; observability compose profile (prometheus, grafana, loki,
   uptime-kuma) with basic dashboards + alert rules from §10.
6. Commit per step.

EXIT CHECKS: every admin section functional against seed data; 2FA gates admin;
backup.sh + restore.sh round-trip on dev compose; typecheck/lint/e2e green.
REPORT: paths + check results + blockers only.
```

---

## PHASE 7 — Deploy & Launch (⚠️ SHARED VPS — 10 live sites. LAW 6 governs everything here.)

### 7-PRE — Read-only server audit (run FIRST; nothing is written to the server)

```text
Follow CLAUDE.md laws strictly, especially LAW 6. Autopilot: zero questions.
Read: docs/VARIABLES.md. SSH: VPS_USER@VPS_IP.

TASK — STRICTLY READ-ONLY audit (no file writes, no docker create/run, no installs):
1. Inventory: `docker ps -a --format ...`, `docker compose ls`, `docker network ls`,
   `docker volume ls`, `docker stats --no-stream`, `ss -tlnp`, `df -h`, `free -m`,
   `nproc`, `ls -la /opt /srv /var/www /etc/nginx/sites-enabled 2>/dev/null`,
   `systemctl list-units --type=service --state=running | head -40`, crontab -l.
2. Identify: (a) the existing reverse proxy (nginx host-level? traefik? caddy?
   nginx-proxy-manager container? per-site containers on 80/443?) and exactly HOW
   existing sites get TLS + vhosts; (b) every LISTEN port; (c) free RAM/disk/CPU
   headroom; (d) whether /opt/vaidyasala is free; (e) docker + compose versions.
3. Write findings to docs/SERVER-AUDIT.md (local repo, committed): full port table,
   proxy type + integration recipe for adding vaidyasala.live, chosen WEB_PORT
   (a verified-free 127.0.0.1 high port), RAM budget for our stack (≤40% of free),
   and a GO/NO-GO line. If NO-GO (e.g. <2GB free RAM or no safe proxy integration
   path), list exactly what the human must decide — and STOP Phase 7 there.
4. Update docs/VARIABLES.md: WEB_PORT + EXISTING_PROXY. Commit.

EXIT CHECKS: SERVER-AUDIT.md complete; zero write operations were run on the server
(the shell history you produced contains only read commands).
REPORT: GO/NO-GO + WEB_PORT + proxy type + RAM budget. Nothing else.
```

### 7A — Production stack (deploy ALONGSIDE the 10 live sites)

```text
Follow CLAUDE.md laws strictly, especially LAW 6. Autopilot: zero questions.
Read: docs/PROGRESS.md + docs/SERVER-AUDIT.md + docs/VARIABLES.md + ARCHITECTURE §10–§12.
PRECONDITION: SERVER-AUDIT.md says GO. Otherwise stop immediately.

TASK:
1. infra/docker/compose.prod.yml adapted from §12 to shared-server reality:
   project name `vaidyasala`; containers `vaidyasala-*`; own network `vaidyasala-net`;
   NO caddy service of our own; web binds 127.0.0.1:${WEB_PORT} ONLY; postgres/
   redis/meilisearch/worker: internal network only, zero host ports; healthchecks;
   per-service memory/cpu limits within the audit's RAM budget; restart:
   unless-stopped. Everything lives under /opt/vaidyasala (compose, .env, volumes
   as named vaidyasala_* volumes, backups/).
2. Proxy integration per the audit's recipe — ONE new vhost/router for
   vaidyasala.live → 127.0.0.1:${WEB_PORT}: e.g. one new file in
   /etc/nginx/sites-available + symlink + `nginx -t` + reload (only if test passes),
   or one traefik label set on OUR containers, or documented NPM steps. Include
   security headers + CSP from §10 at our vhost level. NEVER edit existing vhosts,
   never restart the proxy service, never touch other sites' certs.
3. infra/scripts/setup-vaidyasala.sh (idempotent, scoped): mkdir /opt/vaidyasala
   tree, upload compose + env template — touches NOTHING outside /opt/vaidyasala
   except the single proxy vhost from step 2.
4. Finish .github/workflows/deploy.yml per §11 adapted: build→GHCR→ssh→
   `docker compose -p vaidyasala pull`→`prisma migrate deploy`→rolling restart of
   vaidyasala services ONLY (never `docker restart` anything else)→smoke check on
   127.0.0.1:${WEB_PORT}→auto-rollback of OUR images only.
5. Production .env.production.example. Fill /opt/vaidyasala/.env on the server from
   locally provided values (never committed). Commit per step.

EXIT CHECKS: `docker ps` shows all 10 pre-existing site containers with UNCHANGED
uptime/status (compare against SERVER-AUDIT.md snapshot — this is the #1 check);
vaidyasala stack healthy; https://vaidyasala.live serves through the existing proxy;
`ss -tlnp` diff vs audit shows exactly ONE new listener (127.0.0.1:${WEB_PORT});
deploy workflow green including rollback path.
REPORT: paths + check results (incl. the live-sites uptime diff) + blockers only.
```

### 7B — Go-live

```text
Follow CLAUDE.md laws strictly. Autopilot: zero questions.
Read: docs/PROGRESS.md + ARCHITECTURE §9.1, §16 phase 7 row.

TASK:
1. Cloudflare via API where possible (else output exact manual steps as a numbered
   copy-paste block at the end): DNS A record vaidyasala.live → 194.164.151.202
   (proxied), SSL full-strict, WAF + rate-limit rules per §10, R2 buckets + tokens,
   Turnstile keys, cache rules for ISR pages. NOTE (LAW 6): §10's server-firewall
   origin lock is SKIPPED on this shared VPS — no iptables/ufw changes; instead
   verify our vhost only accepts the vaidyasala.live Host header, and list the
   optional Cloudflare-IP allowlist as a MANUAL step for the human.
2. Backfill: throttled ingest of the FULL existing channel catalog (respect YT
   quota — batch with resume; runs over hours unattended). Monitor via /admin/queue.
3. WebSub subscription to the channel + lease-renewal cron; stats cron on.
4. GSC: verify domain, submit sitemaps; IndexNow key file; confirm rich-result
   eligibility on 3 sample URLs (validator).
5. Baseline snapshot: record Lighthouse scores + CWV + queue costs into
   docs/LAUNCH-BASELINE.md. Enable uptime alerts.
6. Commit per step.

EXIT CHECKS: full catalog visible as drafts/published; webhook fires on a new
upload; sitemaps accepted in GSC; alerts firing to configured channel.
REPORT: paths + check results + REMAINING MANUAL STEPS list.
```

---


# APPENDIX A — LAW 7 (RUN AUTOPILOT execution loop)

Append the block below to CLAUDE.md. It defines what "RUN AUTOPILOT per LAW 7" means:
a continuous, self-driven pass through the phase prompts in this file with zero human
turns, governed by all prior laws.

```markdown
## LAW 7 — RUN AUTOPILOT (execute the phase pipeline end-to-end)
- "RUN AUTOPILOT" = execute docs/PHASES.md phases IN ORDER, starting at the "Next step"
  recorded in docs/PROGRESS.md, without pausing for the human between phases or steps.
- For each phase block: read ONLY the §sections its header names (LAW 2), do every
  numbered task, satisfy its EXIT CHECKS (fix failures, don't just report them — LAW 4),
  commit per numbered step (LAW 3), then advance to the next block automatically.
- At every phase boundary overwrite docs/PROGRESS.md (current phase, done ✓ list, next
  step, blockers) and commit before starting the next phase.
- Resolve all ambiguity via LAW 1's order; log autopilot choices to docs/DECISIONS.md.
- A blocked step (missing secret/dependency) is stubbed behind `// BLOCKED:`, listed in
  PROGRESS.md blockers, and does NOT halt the run — continue with everything else (LAW 1).
- STOP the autopilot run only at: (a) the end of Phase 6, OR (b) the start of Phase 7,
  which is a human-gated SHARED-VPS deploy governed by LAW 6 and must never run except
  from an explicit deploy prompt. On reaching either boundary, write PROGRESS.md and the
  terse final report, then finish.
- The run is idempotent and resumable: re-invoking RUN AUTOPILOT continues from
  PROGRESS.md's "Next step" without redoing committed work.
```
