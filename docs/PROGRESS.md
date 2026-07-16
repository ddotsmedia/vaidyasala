# PROGRESS — Vaidyasala

## Current phase
Phase 3 — Public Core (3A ✓ · next 3B)

## Done
- ✓ Phase 0-1 (foundation, CI) · Phase 2 (2A-2D: AI abstractions, worker/ingest, AI chain, admin+auth)
- ✓ 3A Video page /watch/[slug] (§1.2, §6.1, §4 Tier-2, §5.4/5.5):
  - lib/video getVideoBySlug (published + transcript/enrichment/chapters/faqs/related view-model);
    ISR revalidate=300 + generateStaticParams(publishedSlugs); generateMetadata + canonical
  - PlayerProvider context + YouTube IFrame loader + facade VideoPlayer (thumbnail→iframe on
    interaction, emits play/25/50/75/complete); shared seek/playhead across components
  - ChapterList (seek + active sync), TranscriptView (playhead sync, ML/EN, reading mode),
    FaqAccordion (timestamp seek chips), KeyTakeaways, SummaryCard, StickyPlayer (dock bar,
    spring §5.4), WatchNextCard (8s countdown → chain_play), SubscribeOverlay (@75%),
    AudioModeBar (Web Speech ml-IN), ShareSheet (WhatsApp+UTM), RelatedRail
  - keyboard controls §5.5 (space/←/→/↑/↓/m); POST /api/v1/events + anon viewerKey cookie
- ✓ Exit checks: typecheck ✓, lint ✓, web build ✓ (/watch SSG-prerenders 5 seeded videos),
    watch page 200 live, event write verified in DB (anon viewerKey). Chapter-seek/transcript-
    sync are live-YouTube interactions (verified by build/construction; Playwright e2e in 3D).

## Next step
Phase 3B — Home (§1.1 section order: Featured/Trending/Latest/Continue[island]/Recommended
[island]/Popular topics/Latest articles/Subscribe/Newsletter), /topics + /topics/[slug],
/articles/[slug] (MDX), /playlists/[slug], /latest, /trending, /subscribe, /newsletter
(double opt-in via Resend, fixture mode if key absent), trust pages; re-enable typedRoutes.

## Blockers
- AI/ASR/YouTube/R2/Meili keys absent → fixtures + MinIO; live runs BLOCKED.
- 2FA deferred to Phase 6 (better-auth ~1.2.x for zod3). RESEND key absent → 3B newsletter fixture mode.
- Chapter-seek/transcript-sync/watch-next not exercised headless (need real YT playback) — Playwright e2e lands in 3D.
- Dev ports 55432/56379/57700/59000. typedRoutes off until 3B.
