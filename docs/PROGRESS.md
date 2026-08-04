# PROGRESS — Vaidyasala

## Current phase
Phase 4 — Search ✓ COMPLETE (4A + 4B) · next: Phase 5 (Engagement Loop)

## Done
- ✓ Phase 0-3 complete (foundation/CI, ingest+AI pipeline, public core+SEO+perf)
- ✓ 4A Meilisearch + omnibox (index config, mappers, reindex, synonym sync, GET /api/v1/search,
    SearchController + /search) — CI green
- ✓ 4B Manglish + semantic + AI answers (§14, §6.4):
  - core/search/manglish.ts: rule-based Mozhi/ISO-15919 transliterator (top-k) + resolveManglish
    (SynonymMapping-first) + 30-query health fixture; searchWithManglish fallback in the route
  - core/search/semantic.ts: isQuestionShaped, shouldRunSemantic, rrfMerge (RRF), ANSWER_MIN_SCORE
  - lib/answer.ts: retrieveSegments (lexical token-overlap over candidate videos ⊕ pgvector cosine
    when EMBED key, RRF-fused; per-content-token candidate union to beat Meili trailing-word drop);
    composeAnswer (Claude live / extractive fixture, both grounded); nearestTopics
  - POST /api/v1/ai/answer: SSE (precompute→pull, avoids pipe race), retrieval-only, cited
    [videoId,startSec], threshold gate → honest no-answer + nearest topics + gap log
  - AnswerPanel (client SSE consumer, playable timestamp chips) on /search for question-shaped q
  - admin /admin/search-analytics: top queries, content-gap (zero-result) report, synonym approval
    queue (approve/reject server actions + Meili re-sync)
  - web typecheck runs `next typegen` first (routes.d.ts fresh for new routes in CI)
- ✓ Exit checks (verified live, fixture mode): "prameham"→diabetes (3 cites); EN "how to control
    cholesterol?"→kolesterol-kurakkan (4 cites); ML "പ്രമേഹം എങ്ങനെ…?"→41 tokens/6 cites; unrelated
    "gearbox"→honest no-answer + topics; zero-result logged to SearchQueryLog + visible in admin;
    typecheck ✓ lint ✓ test ✓ (75: core 53, web 6, worker 16); reindex-from-empty ✓.

## Next step
Phase 5 — Engagement Loop (§6.1-6.3, §2 WatchProgress/viewerKey, §13): anonymous viewerKey cookie
+ POST /api/v1/progress beacon + /continue + ContinueWatchingRail + resume-at-position; watch-next
auto-advance; SubscribeCTA final wiring (4 variants, live sub count, UTM); comments (authed, PENDING,
/admin/comments moderation, Turnstile); newsletter weekly assembly job + Resend batch; PWA
(manifest, service worker offline shell, install prompt).

## Blockers
- AI/ASR/YouTube/R2/INDEXNOW/RESEND/ANTHROPIC/EMBED/Turnstile keys absent → fixtures/MinIO/
  fixture-mode; live composition + sends BLOCKED (LAW 1).
- Docker Desktop daemon UNSTABLE here (flaps every few min); dev Meili key =
  devMasterKeyChangeMe0000000000000000. Kill stale `next start` on :3000 before restart (EADDRINUSE
  silently binds old env). .env repeatedly rewritten with wrong creds by a linter — export explicit:
  DATABASE_URL=postgresql://vaidyasala:vaidyasala@localhost:55432/vaidyasala?schema=public etc.
- 2FA→Phase 6. Local Lighthouse trace bug (perf/LCP NaN); CI Linux measures fine.
