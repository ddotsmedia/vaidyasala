# DECISIONS — Vaidyasala

Autopilot decisions log (LAW 1). Format: `- [date] [choice] because [reason]`.
- [2026-07-15] Authored LAW 7 + docs/PHASES.md Appendix A myself because no vaidyasala-PHASES*.md existed in Downloads and the prompt pack had no Appendix A; extracted phase prompts from PART 4 of the prompt pack and defined RUN AUTOPILOT as a sequential, resumable phase loop stopping before the human-gated Phase 7.
- [2026-07-15] docs/ARCHITECTURE.md sourced from Downloads/vaidyasala-architecture_2.md (latest of 3 identical copies) because Phase 1A onward requires it and LAW 5 forbids later modification.
- [2026-07-15] Dev compose host ports set to 55432/56379/57700 (pg/redis/meili) because 6379 and likely 5432 were already allocated on the local machine; bound to 127.0.0.1 only.
- [2026-07-15] Workspace packages consumed as TypeScript source (exports point at ./src, web transpilePackages, worker via tsx/tsc) instead of a per-package build step because it removes build ordering complexity for an internal monorepo.
- [2026-07-15] ioredis pinned via pnpm-workspace overrides + BullMQ given plain ConnectionOptions (not a shared Redis instance) because bullmq bundled a second ioredis version causing type-identity conflicts.
