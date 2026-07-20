# PROGRESS — Vaidyasala

## Current phase
Phase 3 — Public Core (3A ✓ · 3B ✓ · 3C ✓ · next 3D)

## Done
- ✓ Phase 0-1 (foundation, CI) · Phase 2 (2A-2D) · 3A video page · 3B home/hubs/articles/feeds
- ✓ 3C SEO machinery (§7):
  - lib/seo: jsonld.ts builders for every §7.1 stack (VideoObject+Clip hasPart/transcript/
    interactionStatistic, FAQPage, MedicalWebPage, Article, CollectionPage+ItemList,
    MedicalCondition, WebSite+SearchAction, Organization, BreadcrumbList, speakable),
    schema-dts typed; <JsonLd> renderer; pageMetadata (canonical+OG+Twitter player card)
  - Wired into home/watch/topic/article generateMetadata + JSON-LD (verified per page type)
  - app/sitemap.ts sharded via generateSitemaps (videos/articles/topics/pages) + Google
    video-sitemap extension (<video:video>); robots.ts lists all four shards; rss.xml
    full-content feed (content:encoded, videos+articles)
  - middleware.ts: Redirect-table 301 (via cached internal nodejs route — Prisma can't
    run on edge, fail-open) + canonical strip of ?t=/utm_*/fbclid/gclid/si → 301
  - worker jobs/seo-ping.ts (IndexNow + Google ping, fixture mode w/o INDEXNOW_KEY) wired
    into ops queue; publish fan-out (§9.2) in admin publishVideo: updateTag(video/topic/home)
    + enqueueSeoPing(video/home/topic/article URLs)
  - components/seo/medical-disclaimer.tsx (reviewed-by + not-medical-advice, §7.3)
  - apps/web vitest + 6 JSON-LD structural tests (server-only aliased)
- ✓ Exit checks: typecheck ✓ lint ✓ test ✓ (core+web+worker) build ✓;
    4 sitemap shards serve distinct content w/ video ext; robots+rss 200; Redirect 301
    and canonical 301 verified live; JSON-LD present on all 4 page types.

## Next step
Phase 3D — Performance gate: image pipeline (next/image + R2 loader + blur), font subset/
preload, JS ≤170KB gz on /watch (analyze + dynamic-import heavy client cmps), zero-CLS,
PPR/streaming; .lighthouserc budgets → flip CI e2e-perf job from continue-on-error to
blocking; Playwright e2e (home→watch→chapter-seek→watch-next, keyboard nav, search-open).

## Blockers
- AI/ASR/YouTube/R2/Meili/INDEXNOW keys absent → fixtures + MinIO; live runs BLOCKED.
- 2FA deferred to Phase 6. RESEND key absent → newsletter fixture mode.
- Dev ports 55432/56379/57700/59000. Dev docker stack must be up for build (needs DB);
  `set -a; . ./.env; set +a` before `next build` (Next loads env from apps/web, not root).
