# PROGRESS — Vaidyasala

## Current phase
Phase 4 — Search (next 4A) · Phase 3 COMPLETE (3A-3D, CI green)

## Done
- ✓ Phase 0-1 (foundation, CI) · Phase 2 (2A-2D) · Phase 3 (3A-3D)
- ✓ 3C SEO: jsonld builders (all §7.1 stacks), sharded sitemaps + video ext, robots,
    rss.xml, middleware 301s + canonical strip, seo-ping fan-out, medical disclaimer
- ✓ 3D Performance gate:
  - deferred cmdk omnibox (load-on-open), Motion comps (dynamic ssr:false),
    below-fold islands (LazyInView), tree-shaking (sideEffects:false + optimizePackageImports)
  - next/image AVIF/WebP hero (priority); CLS measured 0.005
  - CI rebuilt: pgvector Postgres + Redis services, migrate+seed before build;
    e2e-perf job flipped to BLOCKING (Playwright happy-path + LHCI budgets)
  - Lighthouse gate: CLS≤0.05 + LCP≤2000 + perf≥0.90 blocking; script-size(170KB) warn
  - CI run a01833c GREEN (both jobs), Deploy gated/skipped
- ✓ Exit checks: typecheck ✓ lint ✓ test ✓ build ✓ e2e ✓ (5 tests) lighthouse ✓ CI ✓

## Next step
Phase 4A — Meilisearch + omnibox (§14 lexical, §2 SynonymMapping/SearchQueryLog):
packages/core/search index configs (videos/articles/topics/faqs weights, transcript
chunking) + infra/scripts/reindex.ts + synonym sync from approved SynonymMapping;
GET /api/v1/search (Zod, rate-limited, SearchQueryLog write + script detection);
wire SearchOmnibox (⌘K grouped instant results, keyboard nav, voice ml-IN) + /search page.

## Blockers
- AI/ASR/YouTube/R2/INDEXNOW/RESEND keys absent → fixtures/MinIO/fixture-mode; live BLOCKED.
- 2FA deferred to Phase 6. Local Lighthouse LCP/perf unmeasurable (Chrome+LH12 trace bug);
  CI (Linux) measures fine. Strict JS-byte budget (170KB) deferred to a splitting pass (warn).
- Dev ports 55432/56379/57700/59000. Build needs DB up + explicit env export (BOM in .env);
  `export DATABASE_URL=postgresql://vaidyasala:vaidyasala@localhost:55432/vaidyasala?schema=public`.
- MEILI_MASTER_KEY present in dev compose; Meilisearch reachable at localhost:57700.
