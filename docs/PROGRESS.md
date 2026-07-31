# PROGRESS — Vaidyasala

## Current phase
Phase 4 — Search (4A ✓ · next 4B)

## Done
- ✓ Phase 0-3 complete (foundation/CI, ingest+AI pipeline, public core+SEO+perf, all CI green)
- ✓ 4A Meilisearch + omnibox (§14 lexical, §2 SynonymMapping/SearchQueryLog):
  - packages/core/search: config.ts (§14 index settings — searchable weights title>keywords>
    summary>chapters>transcript, filterable/sortable), article/topic/faq mappers, classifyScript
    (malayalam/latin/manglish), client.ts SearchClient (ensureIndexes/upsert*/clearAll/
    syncSynonyms/multi-search grouped) — server-only via ./search/client subpath
  - infra/scripts/reindex.ts (root `pnpm search:reindex`): rebuild all 4 indexes from Postgres +
    apply settings + sync approved SynonymMapping → verified rebuilds from empty
  - worker jobs/index-search + meili port refactored onto the shared SearchClient
  - GET /api/v1/search (Zod searchQuerySchema, in-memory rate-limit 30/10s, grouped results,
    SearchQueryLog write w/ script detection); graceful empty when Meili unconfigured
  - SearchController (debounced fetch, voice ml-IN, keyboard nav) wired into TopBar omnibox;
    /search deep-link page (noindex)
- ✓ Exit checks: typecheck ✓ lint ✓ test ✓ (58 tests); reindex from empty ✓; ML "തൈറോയ്ഡ്"
    + EN "diabetes" return grouped Videos/Articles/Topics/FAQs; synonym "sugar"→diabetes;
    zero-result logged; SearchQueryLog rows written w/ correct script.

## Next step
Phase 4B — Manglish + semantic + AI answers (§14 manglish/semantic/AI-answer, §6.4):
core/search/manglish (Mozhi/ISO-15919 transliterator + top-k + SynonymMapping lookup, 30-query
fixture); pgvector segment search (HNSW cosine) + RRF hybrid trigger rules; POST /api/v1/ai/answer
(embed→top-12→rerank→threshold gate→Claude cites [videoId,startSec]→SSE, else honest no-answer +
gap log); admin /admin/search-analytics (top queries, zero-result report, synonym approval queue).

## Blockers
- AI/ASR/YouTube/R2/INDEXNOW/RESEND keys absent → fixtures/MinIO/fixture-mode; live BLOCKED.
  4B AI-answer runs against fixtures (no ANTHROPIC/EMBED keys); live composition BLOCKED.
- Docker Desktop daemon is UNSTABLE here (flaps every few min) — restart + `docker compose up -d`
  as needed; dev Meili key = devMasterKeyChangeMe0000000000000000.
- Build/search need env exported (BOM in .env): DATABASE_URL=postgresql://vaidyasala:vaidyasala@
  localhost:55432/vaidyasala?schema=public, MEILI_URL=http://localhost:57700, MEILI_MASTER_KEY=…
  Kill stale `next start` on :3000 before restarting (EADDRINUSE binds silently to old env).
- 2FA deferred to Phase 6. Local Lighthouse trace bug (perf/LCP NaN); CI Linux measures fine.
