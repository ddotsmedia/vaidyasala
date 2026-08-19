# REVIEW NOTES — consolidated findings

One place for everything raised while reviewing the deployment and UI/UX phase
specs. Written so a future spec can be checked against it before being handed to
an agent, rather than rediscovering the same constraints each phase.

---

## 1. The blocker everything else waits on

**The stack has never run on the VPS.** No containers started, no migrations
applied, no tables created, no videos imported, no admin user, no nginx vhost.

Fifteen phases of work sit on `main`, none of it observable. This is the root
cause of most of what follows: because nobody can open the site, each new spec
is written against an imagined codebase rather than the real one.

`docs/BACKFILL-RUNBOOK.md` is verified and correct. Running it is the next step.

---

## 2. Hard constraints that keep being designed around

### The site does not hold the video files
Vaidyasala **embeds YouTube**. `Video.youtubeId` is the only media reference;
the player is a facade thumbnail that mounts a `youtube-nocookie.com` iframe on
first tap.

Therefore these are not buildable as specified:

| Proposed | Why not |
|---|---|
| HLS / DASH, bitrate ladders, ABR | No source file to transcode |
| FFmpeg keyframe extraction, 9-tile previews | Same |
| Custom scrubber, hover previews, watched-segment shading | YouTube renders its own controls inside a cross-origin iframe |
| Frame advance (`.`) | No frame-level API |
| VTT captions we serve, caption font/colour styling | YouTube owns caption rendering |
| Quality selector with Mbps labels | `setPlaybackQuality()` is a hint; no bitrate figures exposed |
| Offline video download | No media to cache |

Self-hosting the videos would make all of these real, but it is an architecture
change with licensing, bandwidth and storage consequences — 503 videos × four
renditions on a disk that was at 91%. It should be decided deliberately, not
arrived at by implication.

### Viewers are anonymous by default
There are **zero registered users**. Watching requires no sign-in. Identity is
`viewerKey` — `"a:{uuid}"` from a cookie, or `"u:{userId}"` when signed in, with
an anon→user merge on login.

So anything keyed on `userId` returns empty for effectively everyone:
collaborative filtering, `UserPreferences` rows, per-user push subscriptions,
`getAnalytics(userId)`. Per-device state belongs in localStorage; per-viewer
state belongs on `viewerKey`.

### The product is a video platform, not a marketplace
Two phase specs (2E, 4A) described a doctor-consultation marketplace —
practitioners, bookings, wallets, refunds, platform fees, INR pricing. None of
those entities exist. `User.id` is a cuid, not a UUID; the Prisma schema is a
folder, not `schema.prisma`; auth is better-auth, not next-auth. A third spec
(`lsn`) suggests those belong to a different project on the same VPS.

---

## 3. What already exists (do not rebuild)

| Area | Where |
|---|---|
| Watch page: player, chapters, transcript ML/EN, AI summary/takeaways/FAQ, comments, share, related | `/watch/[slug]` (Phases 3, 5, 2A) |
| Home: hero, trending, latest, recommended, continue-watching, topics, newsletter | `app/(public)/page.tsx` (Phases 3, 2B) |
| Topic hubs: search, sort, duration filter, pagination, related topics, breadcrumbs | `/topics`, `/topics/[slug]` (2C) |
| Search: ⌘K palette, Manglish, pgvector semantic, filters, 5-way sort, recent + popular | Phases 4A/4B, 2D, 2E |
| Admin: videos, topics, playlists, articles, media, newsletter, seo, analytics, queue, search-analytics, settings | `/admin/*` (Phase 6) |
| Admin analytics + 4 recharts panels over live queries | `/admin/analytics` |
| PWA: manifest, service worker, `/offline`, install prompt | Phase 5 |
| Comments with PENDING/APPROVED moderation + Turnstile | Phase 5 |
| Continue-watching, resume-at-position, progress beacon | Phases 5, 2B |
| Like/bookmark (`VideoReaction`, anonymous-capable) | 2A |
| YouTube ingest: poll, WebSub, stats-refresh, backfill (CLI + BullMQ job) | Phases 2, 7B |
| Sentry (web + worker), Mixpanel, CWV tracking | Analytics phase |
| Image optimisation, font strategy, `optimizePackageImports`, facade player | Throughout |

---

## 4. Bugs found and fixed during review

Each of these looked like success until checked against real data.

1. **Malayalam slugs prerendered as 404** — `slugifyMl` preserved Malayalam;
   Next 16 does not round-trip a non-ASCII route segment. The page built and was
   baked with `"status": 404`. All 503 Malayalam-titled videos would have been
   listed everywhere and dead on click. Fixed with `slugifyAscii` (`681a1a3`).
2. **Unauthenticated admin endpoint** — `/api/admin/backfill` had no auth; anyone
   reachable could import the catalogue or publish every video (`2bd9934`).
3. **Unscoped publish** — `updateMany(INGESTING → PUBLISHED)` with no
   `publishedAt`, publishing every unreviewed video and ordering `/latest` by
   null (`2bd9934`).
4. **`--publish` silent no-op** — the upsert's update branch never touched
   status, so the second pass of "import then publish" published nothing
   (`84aa718`).
5. **Prisma CLI path** — `deploy.yml` invoked it from the repo root; under pnpm
   it resolves at `packages/db/node_modules/prisma` (`81e3cb2`).
6. **Blank token disabled the fallback** — `??` treats `""` as set, so an empty
   `ADMIN_API_TOKEN` silently disabled `ADMIN_INGEST_TOKEN` (`a7cc1d5`).
7. **Home page was accidentally dynamic** — a cookie read during render opted the
   route out of ISR, so `revalidate` was inert (Phase 2B).
8. **Docker: five separate faults** — `npm install -g pnpm` inside the workspace,
   no `.dockerignore`, cross-stage `node_modules` copy breaking `next/font`, a
   flattened worker layout breaking relative symlinks, and `next start` under
   `output: standalone`.
9. **`.env` dedupe would have destroyed the file** — the proposed `sed` deleted
   `WEB_PORT`, `DATABASE_URL` and `POSTGRES_PASSWORD`; tested on a sample before
   it reached production (`6b43eef`).

---

## 5. Recurring mistakes in the command scripts

Worth checking any new script against this list.

- **`videoCount`** is not a field. The schema takes `limit`, `dryRun`,
  `delayMs`, `mode`. Zod strips unknown keys, so `videoCount: 10` silently
  enumerates the whole channel.
- **`triggerMode`** → `mode`; **`delay`** → `delayMs`.
- **Response is 202** with `{jobId, limit, dryRun, delayMs, mode}` — not 200,
  no `message`, no `jobsQueued`, no `status`.
- **Table is `"Video"`** — quoted, PascalCase. Columns are camelCase.
- **DB credentials come from `.env`** — not `postgres`/`vaidyasala`. Service is
  `postgres`, container `vaidyasala-postgres`.
- **Containers are `vaidyasala-*`** (no `h`). Images are
  `ghcr.io/ddotsmedia/vaidyasala/{web,worker}`; a local tag like
  `vaidhyasala-web:latest` is built and then silently ignored by compose.
- **Compose file is at `infra/docker/compose.prod.yml`**, not the repo root.
- **401 does not prove token auth** — with `ADMIN_API_TOKEN` unset, a bad token
  also 401s via session fallback. Only a 200 with the real token proves it.
- **`grep -c` chained with `&&`** short-circuits on the first zero.
- **`diff a b || echo "no changes"`** is inverted — `||` fires when they differ.
- **The worker image has no pnpm, no tsx, no `scripts/`** — only `node_modules`,
  `dist-bundle` and the Prisma schema. `docker compose exec worker pnpm …` fails.
- **`/api/internal/revalidate` takes no body** and there is no `/videos` route.
- **`WEB_PORT` binds `127.0.0.1` only** — `http://194.164.151.202:8888` is
  unreachable from outside by design (LAW 6).
- **Imported videos are `INGESTING` and deliberately invisible.** The site shows
  "No videos yet" until `{"mode":"publish"}` *and* a revalidate call.

---

## 6. Standing recommendations

- **WCAG 2.1 AA, not AAA.** AAA requires 7:1 contrast (forbidding most brand
  colour) and audio descriptions for 503 embedded videos you do not control.
  §5.5 specifies AA; it is achievable and is what almost every site holds to.
- **Do not delete test videos before the full import.** The import is
  idempotent — the 10 test videos are simply the first 10 of the 503.
- **Reclaim disk before importing.** `docker image prune` for dangling images
  only. **Never `docker system prune`** — it removes other projects' volumes,
  and a full disk breaks all 17 projects at once.
- **Rotate the YouTube API key.** It was pasted in plaintext in a chat log.
- **Use a dedicated deploy key.** `VPS_USER=root` gives GitHub Actions
  unrestricted control of a box hosting 17 other projects.
- **Publish is a separate, deliberate step.** Never a side effect of import.
- **The AI chain is the expensive part.** Backfill is metadata-only (~22 quota
  units for 503 videos, no AI spend). Transcripts and enrichment run per video
  through the §8.2 pipeline and should be switched on knowingly.

---

## 6b. SEO: what exists, and the one thing that was badly broken

An SEO brief described the site as "0% optimized — no meta tags, descriptions,
structured data, canonical, sitemap, robots, Open Graph, video schema". None of
that was true. `lib/seo/` has `pageMetadata` (canonical + OG + Twitter, player
card on video pages) and JSON-LD builders for Organization, WebSite +
SearchAction, BreadcrumbList, VideoObject (+Clip, InteractionCounter), FAQPage,
MedicalWebPage, Article, CollectionPage and MedicalCondition — all tested.
`app/robots.ts` and a four-shard `app/sitemap.ts` with the Google video
extension both exist. **Before acting on an SEO audit, check it against
`lib/seo/`** — building the proposed `lib/schema.ts` + `public/robots.txt` +
`app/api/sitemap/*` would have created a second, conflicting implementation.

What was actually wrong (`f16c2b5`):

- **`og:image` pointed at `/api/og`, which returns `image/svg+xml`.** No major
  crawler renders an SVG `og:image`, so all 503 video pages shared with a blank
  card. Now the YouTube thumbnail — a real 1280×720 JPEG. The same URL was the
  video sitemap's `thumbnail_loc` fallback, where Google would reject it too.
- **The homepage had no `metadata` export at all**, inheriting the bare title
  "Vaidyasala" with no canonical or OG. Eight more pages were title-only.
- **Descriptions were sliced at 200 chars mid-word**; Google renders ~160.

Still open: **brand pages emit no `og:image`** — the only asset in `public/` is
`icon.svg`, also SVG. Needs one 1200×630 PNG; inventing a brand card is a
design call, not an engineering one.

**hreflang is not applicable and was not built.** It annotates the same content
at different URLs; Vaidyasala serves one bilingual URL per video. Adding
`/ml/*` and `/en/*` would manufacture duplicate content and fork 503 canonicals.
The real ML/EN gap is `titleEn` being null — a §8.2 enrichment run, not markup.

> ⚠ **Domain is unresolved.** The brief says `vadhyasala.com`, VARIABLES.md says
> `vaidhyasala.com`, the repo namespace is `vaidyasala`. Everything derives from
> `NEXT_PUBLIC_SITE_URL`, so it is one deploy value — but a canonical pointing
> at a domain that does not resolve deindexes the site. Confirm before deploy.

---

## 7. Genuinely open work

1. **Run the deployment.** Everything else is invisible until then.
2. Recommendations via pgvector nearest-neighbour on `Video.embedding`, rather
   than the precomputed `relatedFrom` relation.
3. Personal viewing stats keyed on `viewerKey`.

### Verified by measurement, not assertion

Claims that can only be settled against the running site — Lighthouse, Core
Web Vitals, real-device testing, screen-reader passes, cross-browser checks —
are **not** ticked off anywhere in this repo, because nothing has ever run on
the server. What follows was verified statically, and each item says how.

- **Thumbnail payload** — `thumbnailUrl()` prefers `maxres` (1280×720) and
  cards render it at ~300px. Fixed with a srcset + `sizes` (`21f9518`); 13
  tests. The byte saving is arithmetic, not a measurement.
- **Tap targets** — `sm` was 32px, `icon` 40px, both under 44. Fixed via
  `pointer-coarse:min-h-11`; confirmed `min-height:calc(var(--spacing) * 11)`
  is present in the built CSS.
- **Bypass Blocks (2.4.1, Level A)** — no `<main>`, no skip link. Fixed
  (`6d4f3e7`); confirmed "Skip to content" is in the prerendered HTML and that
  `focus:absolute` is emitted after `focus:not-sr-only` so the link pins
  instead of inheriting `position:static`.
- **Contrast** — `text-dim` on `bg` is ≈6.8:1 and on `surface-2` ≈4.6:1. Both
  clear AA. Computed from the oklch tokens; no change made.
- **Reduced motion** — already handled (see below).

### Two items here were wrong — verified against the code

- **`prefers-reduced-motion` was never a gap.** `tokens.css:108` collapses
  animation and transition duration globally, and all three Motion components
  (`sticky-player`, `subscribe-overlay`, `watch-next-card`) already call
  `useReducedMotion`.
- **`VideoCard.Skeleton` already existed** (`video-card.tsx:57`). What was
  missing was a caller — no route had a `loading.tsx` at all.

Both were listed as open on the strength of a spec claiming them, not a search.
The lesson generalises: this file is only useful if each line was checked.

### Closed since

- **Thumbnails / tap targets** (`21f9518`), **search highlighting + a latent
  infinite loop in the highlighter** (`bd5160b`), **skip link, `<main>`, card
  alt/duration/progress semantics** (`6d4f3e7`).

- **Player** — speed (guarded by `getAvailablePlaybackRates`), theater mode,
  fullscreen via the Fullscreen API on our wrapper, and `K`/`J`/`L`/`0`–`9`/
  `Home`/`End`/`<`/`>`/`T`/`F`/`?` on top of the existing keys. Volume, mute and
  speed persist per device (`046c5a3`).
- **Watchlist** — `/watchlist` over the existing `VideoReaction.bookmarked`,
  keyed on `viewerKey`. No migration needed (`a373813`).
- **Grid** — fifth column at `2xl`; `VideoGrid.Skeleton` plus `loading.tsx` for
  both grid routes (`d5fc713`).

### Two items above were wrong — verified against the code

- **`prefers-reduced-motion` was never a gap.** `tokens.css:108` collapses
  animation and transition duration globally, and all three Motion components
  (`sticky-player`, `subscribe-overlay`, `watch-next-card`) already call
  `useReducedMotion`. Note this before writing another accessibility spec.
- **`VideoCard.Skeleton` already existed** (`video-card.tsx:57`). What was
  missing was a caller — no route had a `loading.tsx` at all.

Both were listed as open on the strength of a spec claiming them, not a search.
The lesson generalises: this file is only useful if each line was checked.
