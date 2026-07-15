# DECISIONS — Vaidyasala

Autopilot decisions log (LAW 1). Format: `- [date] [choice] because [reason]`.
- [2026-07-15] Authored LAW 7 + docs/PHASES.md Appendix A myself because no vaidyasala-PHASES*.md existed in Downloads and the prompt pack had no Appendix A; extracted phase prompts from PART 4 of the prompt pack and defined RUN AUTOPILOT as a sequential, resumable phase loop stopping before the human-gated Phase 7.
- [2026-07-15] docs/ARCHITECTURE.md sourced from Downloads/vaidyasala-architecture_2.md (latest of 3 identical copies) because Phase 1A onward requires it and LAW 5 forbids later modification.
- [2026-07-15] Dev compose host ports set to 55432/56379/57700 (pg/redis/meili) because 6379 and likely 5432 were already allocated on the local machine; bound to 127.0.0.1 only.
- [2026-07-15] Workspace packages consumed as TypeScript source (exports point at ./src, web transpilePackages, worker via tsx/tsc) instead of a per-package build step because it removes build ordering complexity for an internal monorepo.
- [2026-07-15] ioredis pinned via pnpm-workspace overrides + BullMQ given plain ConnectionOptions (not a shared Redis instance) because bullmq bundled a second ioredis version causing type-identity conflicts.
- [2026-07-15] typedRoutes disabled until Phase 3B because the nav/footer reference public routes (/topics, /latest, ...) that do not exist until Phase 3; re-enable when those pages land.
- [2026-07-15] Fonts loaded via next/font/google (Inter latin, Anek Malayalam malayalam+latin, Noto Serif Malayalam malayalam preload=false) instead of self-hosted WOFF2 because next/font auto-subsets, preloads, and emits size-adjusted fallback metrics (zero CLS) per §5.3.
- [2026-07-15] Tier-1 primitives hand-written on Radix + cmdk + sonner (not shadcn CLI) because the CLI cannot scaffold non-interactively into a workspace package; styled with @theme tokens.
- [2026-07-15] AI model tiers: workhorse=claude-sonnet-5, cheap=claude-haiku-4-5 (per §8.1 Sonnet/Haiku split, mapped to current model IDs via the claude-api reference).
- [2026-07-15] Structured AI output uses a manual completeJson(Zod + 2-retry repair) loop with providers accepting injected clients/fetch, rather than output_config.format, so the whole chain is unit-testable with mocked providers and makes zero real API calls in CI.
