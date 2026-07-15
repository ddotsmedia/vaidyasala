# CLAUDE.md — Vaidyasala Universal Laws

## PROJECT
AI-powered Malayalam video discovery platform for YouTube growth.
Single source of truth: docs/ARCHITECTURE.md (§-references below point there).
Stack: Next.js 16 App Router · React 19 · TS strict · Tailwind v4 · shadcn/ui · Motion ·
Prisma · Postgres 17 + pgvector · Redis 7 · BullMQ · Meilisearch · Better Auth · Zod ·
TanStack Query · Docker Compose · pnpm monorepo (apps/web, apps/worker, packages/*).
Environment/host/domain values: docs/VARIABLES.md. Never hardcode them.

## LAW 1 — AUTOPILOT (never ask, never stop)
- NEVER ask the user questions. NEVER present options. NEVER wait for confirmation.
- Resolve every ambiguity in this order:
  1) docs/ARCHITECTURE.md → 2) docs/DECISIONS.md → 3) existing code patterns →
  4) choose the simplest maintainable option yourself and append one line to
     docs/DECISIONS.md: "- [date] [choice] because [reason]".
- If something is impossible (missing secret, broken dependency), do NOT stop the
  whole task: skip it, stub it behind a clear `// BLOCKED:` comment, list it in the
  final report, and continue with everything else.
- Complete the ENTIRE requested scope before finishing. Partial work = failed task.

## LAW 2 — TOKEN ECONOMY (spend tokens on code, not on talk)
- No preamble, no plan narration, no summaries of what you just did, no explanations
  of code. Final message = files changed (paths only) + exit-check results + blockers.
- NEVER print file contents into chat. Never echo diffs unless asked.
- Read before write, but read NARROW: search (grep/glob) first, read only matching
  files, only relevant line ranges. Never re-read files you just wrote.
- Read docs/ARCHITECTURE.md ONLY the §sections named in the current prompt.
- Prefer Edit over rewriting whole files. Batch related edits in one pass.
- Do not run dev servers, watchers, or full builds to "check" — run the single
  targeted command: `pnpm typecheck`, `pnpm lint`, or one specific test file.
- Full `pnpm build` only when a phase prompt's exit checks require it.
- No screenshots/browser verification unless the prompt says so.
- Do not regenerate lockfiles, reinstall deps, or re-run prisma generate unless
  package.json/schema actually changed.
- Do not create README files, code comments-as-essays, or any doc not requested.

## LAW 3 — SESSION PROTOCOL (state lives in files, not in context)
- Session start: read CLAUDE.md (automatic) + docs/PROGRESS.md + the §sections the
  prompt names. Nothing else until needed.
- Session end: overwrite docs/PROGRESS.md with: current phase, done ✓ list (one line
  each), next step, open blockers. Max 40 lines. Then commit.
- Commit after each numbered step in a prompt: `feat(scope): message` (conventional
  commits). Never leave uncommitted work at session end.

## LAW 4 — QUALITY FLOOR (non-negotiable, autopilot ≠ sloppy)
- TypeScript strict; no `any`; no `@ts-ignore` (use `@ts-expect-error` + reason).
- Every external input crosses a Zod schema from packages/core/validation.
- Server Components by default; "use client" only where interactivity demands.
- All UI states designed: loading (Skeleton twin), empty, error. No spinners.
- Malayalam text: font-ml class, line-height ≥1.7, lang="ml" attribute.
- Every page: metadata + JSON-LD via lib/seo helpers (§7). No inline schema.
- Exit checks for the phase MUST pass before you finish: fix, don't report failures
  you could have fixed.

## LAW 5 — SAFETY RAILS
- Never commit secrets. .env* stays gitignored; only .env.example gets committed.
- Never run destructive DB commands (drop/reset) outside dev compose.
- Never touch infra/prod or deploy unless the prompt is a deploy prompt.
- Never modify docs/ARCHITECTURE.md.
- Migrations: additive only; never edit an applied migration.

## LAW 6 — SHARED VPS (194.164.151.202 hosts 10 LIVE websites — absolute rules)
- DISCOVER BEFORE DECIDE: before ANY server action, check what exists —
  `docker ps -a`, `docker network ls`, `ss -tlnp` (ports), `ls /opt /srv /var/www`,
  `df -h`, `free -m`. Never assume a port, folder, network name, or resource is free.
- READ-ONLY toward everything that is not ours: never stop, restart, recreate,
  prune, or edit any container, volume, network, compose project, proxy config,
  cron entry, or file that is not under /opt/vaidyasala or not created by us.
  `docker system prune`, `docker network prune`, `docker volume prune` are FORBIDDEN.
- NO HOST PORTS 80/443/22 and no port already in LISTEN state. Vaidyasala web binds
  ONE free high port (WEB_PORT in VARIABLES) on 127.0.0.1 only; postgres/redis/
  meilisearch bind NO host ports at all (internal docker network only).
- NO firewall changes (ufw/iptables), NO sshd config changes, NO system package
  upgrades, NO Docker daemon config changes, NO reboots. If one seems required,
  mark BLOCKED with the exact command for the human to review — do not run it.
- Integrate with the EXISTING reverse proxy found in the audit (add one new vhost/
  router for vaidyasala.live) — never replace it, never bind our own proxy to 80/443.
  Adding our vhost file + reload (nginx -t && reload / touching NPM via its UI-API)
  is allowed ONLY after config test passes; full proxy restarts are forbidden.
- Resource ceilings so live sites never starve: set compose limits — total
  Vaidyasala stack ≤ 40% of server RAM (from the audit) and postgres
  shared_buffers sized to that; document actual numbers in DECISIONS.md.
- Unique names everywhere: compose project name `vaidyasala`, containers
  `vaidyasala-*`, network `vaidyasala-net`, volumes `vaidyasala_*` — zero chance
  of colliding with existing projects.
- Backups write only to /opt/vaidyasala/backups + R2. Never touch other backup dirs.

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
