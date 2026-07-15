# PROGRESS — Vaidyasala

## Current phase
Phase 1 — Foundation ✓ COMPLETE · next: Phase 2A

## Done
- ✓ Phase 0 kickoff + preflight (ARCHITECTURE, PHASES, LAW 7, remote pushed, Docker up)
- ✓ 1A monorepo: config/core/db/ui packages + web (Next 16) + worker; docker dev stack healthy
- ✓ 1B Prisma schema (§2) multi-file + pgvector/HNSW migration + seed (5 videos) + typed client
- ✓ 1C design system: @theme tokens (dark/light/hc), fonts (next/font), Tier-1 primitives,
      Tier-2 components (all w/ Skeleton twins), app shell (top bar + footer), /styleguide
- ✓ 1D CI: .github/workflows/ci.yml (lint→typecheck→unit→build; e2e+lhci non-blocking),
      deploy.yml skeleton (GHCR build+push, gated ENABLE_DEPLOY), Vitest tests, Playwright smoke,
      .lighthouserc.json budgets
- ✓ Exit checks: pnpm lint/typecheck/test/build all green; docker stack healthy; fresh-vol migrate

## Next step
Phase 2A — Core AI abstractions (§8.1/§8.2): AsrProvider/LlmProvider/EmbedProvider interfaces,
sarvam/whisper/claude/embed impls (Zod-parsed, circuit breaker, rate limiter), validation schemas,
prompt templates, unit tests with mocked providers (no real API calls).

## Blockers
- Dev host ports: 55432 (pg) / 56379 (redis) / 57700 (meili). See DECISIONS.
- AI provider keys (ANTHROPIC/SARVAM/EMBED) absent → Phase 2 impls test against fixtures, live BLOCKED.
