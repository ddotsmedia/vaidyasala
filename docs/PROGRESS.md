# PROGRESS — Vaidyasala

## Current phase
Phase 3 — Public Core (3A ✓ · 3B ✓ · next 3C)

## Done
- ✓ Phase 0-1 (foundation, CI) · Phase 2 (2A-2D) · 3A Video page /watch/[slug]
- ✓ 3B Home + hubs + articles + feeds (§1.1 order, §1.3, §6.1):
  - Home (§1.1 order): Featured/Trending/Latest + Continue & Recommended Suspense
    islands (§11 streamed), Popular topics, Latest articles, Subscribe, Newsletter
  - lib/feeds (getFeatured/Trending[7d AnalyticsEvent]/Latest/PopularTopics/
    LatestArticles); components/home (VideoGrid, LinkedRail, islands, NewsletterForm)
  - /topics + /topics/[slug] (hub: hero, videos by TopicVideo.score, articles, FAQs,
    playlists, AyurConnect x-link); /articles/[slug] (next-mdx-remote, source-video
    card above fold); /playlists + /playlists/[slug]; /latest; /trending (7d window);
    /subscribe; /newsletter; /about /privacy /terms trust pages
  - Newsletter double opt-in via Resend (lib/newsletter, fixture mode if key absent) +
    POST /api/v1/newsletter/subscribe & GET /confirm; validation schemas in core
  - §1.3 publish-time inbound-link rule (≥3: relatedEdge + topicVideo + article) in
    worker quality-gate; seed extended with playlists + articles
  - typedRoutes re-enabled (next.config); Route typing on watch-next-card/video.ts
- ✓ Exit checks: typecheck ✓, lint ✓, web build ✓ (all 3B routes SSG/static-prerender
    from seed: home, /topics[/slug], /articles/[slug], /playlists[/slug], /latest,
    /trending, /subscribe, trust pages; home streams islands).

## Next step
Phase 3C — SEO machinery: lib/seo/jsonld builders (§7.1 stacks), wire into every page's
generateMetadata + JSON-LD; sitemap.ts (sharded + video ext), robots.ts, rss.xml,
Redirect→middleware 301, canonical (?t= strip); worker seo-ping.ts (IndexNow + sitemap
ping) + §9.2 publish fan-out; disclaimer/reviewed-by block on medical pages (§7.3).

## Blockers
- AI/ASR/YouTube/R2/Meili keys absent → fixtures + MinIO; live runs BLOCKED.
- 2FA deferred to Phase 6. RESEND key absent → newsletter in fixture mode (logs confirm URL).
- Chapter-seek/transcript-sync/watch-next not exercised headless (real YT) — Playwright e2e in 3D.
- Dev ports 55432/56379/57700/59000. Dev docker stack must be up for build (needs DB).
