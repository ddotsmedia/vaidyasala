# Vaidyasala — Master Architecture Document

**AI-Powered Malayalam Video Discovery Platform for YouTube Growth**

Version 1.0 · July 2026 · Status: Awaiting approval

---

## 0. Executive Summary

Vaidyasala is not a website. It is a **YouTube growth engine** disguised as the best Malayalam health video platform ever built.

Every architectural decision in this document is evaluated against one funnel:

```
Google Search → Landing Page → Watch Video → Watch Next → Subscribe → Return
```

**What it is:** Netflix-grade video discovery + Wikipedia-grade topic depth + Google-grade search + an AI assistant that never hallucinates — all pointed at one YouTube channel.

**What it is not:** A blog. A CMS. A hospital site. A duplicate of AyurConnect (doctors, diseases DB, medicines DB, hospitals stay out of scope — Vaidyasala *links* to them, never rebuilds them).

**North-star metrics (in priority order):**

1. YouTube watch-time originating from the site (tracked via UTM + YouTube Analytics API)
2. Subscribers attributed to site CTAs (`?sub_confirmation=1` click-throughs)
3. Video plays per session (target ≥ 2.0)
4. Returning visitor rate (target ≥ 35%)
5. Google organic impressions on video pages (Search Console API)

**Confirmed decisions (from stakeholder):** Self-hosted VPS + Docker behind Cloudflare · Managed AI APIs (Claude for text, Sarvam/Whisper-class API for Malayalam ASR) · Growing-channel scale (hundreds of videos, ~500k monthly visits headroom) · Single master architecture doc.

**Stack (latest stable, July 2026):** Next.js 16 (App Router, RSC, PPR) · React 19 · TypeScript 5 (strict) · Tailwind CSS v4 · shadcn/ui · Motion · Prisma ORM · PostgreSQL 17 + pgvector · Redis 7 · Meilisearch 1.x · Better Auth · Zod · TanStack Query v5 · BullMQ · Docker Compose · Cloudflare (CDN/WAF/R2) · GitHub Actions · Resend (transactional + newsletter email, React Email templates).

---

## 1. Information Architecture

### 1.1 Principle: every URL is a watch-time asset

The site has exactly **six primary content surfaces** (home, video, topic index/hub, article, playlist, search) plus a small set of discovery feeds and conversion pages. Anything that doesn't drive the funnel is cut.

```
vaidyasala.com/
│
├── /                              Home — personalized video discovery
├── /watch/[slug]                  Video page (the atomic unit of the platform)
├── /topics                        Topic hub index
├── /topics/[slug]                 Topic Hub (e.g. /topics/diabetes)
├── /articles/[slug]               AI-generated article (SEO satellite of a video)
├── /search                        Universal search (also ?q= deep-linkable)
│
├── /playlists/[slug]              Curated binge sequences (mirrors YT playlists)
├── /latest                        Chronological firehose (crawl freshness signal)
├── /trending                      Engagement-ranked (7-day window)
├── /continue                      Continue watching (signed-in / device-local)
│
├── /subscribe                     Dedicated conversion page (all CTAs funnel here)
├── /newsletter                    Email capture → drives return visits
├── /about, /privacy, /terms       Trust pages (E-E-A-T signals)
│
└── /admin/*                       Admin panel (noindex, auth-gated)
```

### 1.2 URL grammar

| Pattern | Example | Notes |
|---|---|---|
| `/watch/{slug}` | `/watch/thyroid-ayurveda-chikitsa` | Transliterated Malayalam slug, ASCII, ≤ 60 chars, immutable after publish (redirects table handles renames) |
| `/watch/{slug}?t=312` | deep link to timestamp | Maps to chapter index; canonical stays clean |
| `/topics/{slug}` | `/topics/diabetes` | English disease slug (search volume) + Malayalam title on page |
| `/articles/{slug}` | `/articles/thyroid-lakshanangal` | Article canonical points to itself; links video prominently |

**Slug policy:** English/transliterated slugs (Google indexes them reliably, users can share them verbally), Malayalam titles and content on-page. Every renamed slug creates a `Redirect` row → 301 at the edge.

### 1.3 Internal-link topology (the SEO circulatory system)

```
                    ┌──────────────┐
        ┌──────────▶│  Topic Hub    │◀──────────┐
        │           └──────┬───────┘           │
        │                  │ links all          │
        │                  ▼                    │
   ┌────┴─────┐     ┌──────────────┐     ┌─────┴─────┐
   │ Article   │◀───▶│  Video Page  │◀───▶│ Playlist  │
   └────┬─────┘     └──────┬───────┘     └───────────┘
        │                  │
        └────── related ───┘  (AI-scored edges, stored in DB, max 8/page)
```

Rules: every video page links to exactly one primary Topic Hub (breadcrumb), up to 8 related videos (embedding similarity + co-watch), 1 companion article. Every article links back to its source video above the fold. Hubs link everything they contain. No orphan pages — the automation pipeline (§9) fails a publish if a page would have < 3 inbound internal links.

### 1.4 Navigation model

Persistent top bar: logo · search (⌘K, expands full-screen on mobile) · Topics · Latest · **Subscribe button (always visible, YouTube-red, never scrolls away)**. Footer: topic index, playlists, newsletter, trust pages. No mega-menus, no sidebars on content pages — nothing competes with the player.

---

## 2. Database Schema

PostgreSQL 17 + `pgvector` extension. Prisma ORM with multi-file schema. Key models below (field lists trimmed to what matters architecturally; timestamps `createdAt`/`updatedAt` on everything).

```prisma
// ───────────────────────── ENUMS ─────────────────────────

enum VideoStatus   { INGESTING PROCESSING DRAFT PUBLISHED HIDDEN }
enum ArticleStatus { DRAFT PUBLISHED HIDDEN }
enum TopicKind     { CONDITION TREATMENT LIFESTYLE HERB GENERAL }
enum Role          { VIEWER EDITOR ADMIN }
enum CommentStatus { PENDING APPROVED REJECTED SPAM }

// ───────────────────────── CONTENT CORE ─────────────────────────

model Video {
  id              String       @id @default(cuid())
  youtubeId       String       @unique
  slug            String       @unique
  status          VideoStatus  @default(INGESTING)   // INGESTING → PROCESSING → DRAFT → PUBLISHED → HIDDEN
  titleMl         String                              // Malayalam title
  titleEn         String?                             // English/transliterated
  description     String?      @db.Text
  durationSec     Int
  publishedAt     DateTime?                           // site publish (≠ YT publish)
  ytPublishedAt   DateTime
  thumbnails      Json                                // {default, hq, maxres} → mirrored to R2
  stats           Json                                // {views, likes, comments} — refreshed by cron
  primaryTopicId  String?
  primaryTopic    Topic?       @relation("primary", fields: [primaryTopicId], references: [id])
  topics          TopicVideo[]
  chapters        Chapter[]
  transcript      Transcript?
  enrichment      Enrichment?
  article         Article?
  faqs            Faq[]
  keywords        Keyword[]
  playlistItems   PlaylistItem[]
  relatedFrom     RelatedEdge[] @relation("from")
  relatedTo       RelatedEdge[] @relation("to")
  qualityScore    Float?                              // §8.2 step-10 composite gate score
  embedding       Unsupported("vector(1024)")?        // title+summary embedding
  @@index([status, publishedAt(sort: Desc)])
}

model Chapter {              // timestamp index, from YT chapters or AI segmentation
  id        String @id @default(cuid())
  videoId   String
  video     Video  @relation(fields: [videoId], references: [id], onDelete: Cascade)
  startSec  Int
  titleMl   String
  titleEn   String?
  @@unique([videoId, startSec])
}

model Transcript {
  id             String  @id @default(cuid())
  videoId        String  @unique
  video          Video   @relation(fields: [videoId], references: [id], onDelete: Cascade)
  rawMl          String  @db.Text        // ASR output
  correctedMl    String? @db.Text        // AI-corrected Malayalam
  english        String? @db.Text        // AI translation
  segments       Json                    // [{startSec, endSec, textMl, textEn}]
  asrProvider    String                  // "sarvam" | "whisper" | "youtube-captions"
  qualityScore   Float?                  // AI self-assessment 0–1; < 0.7 flags human review
}

model TranscriptSegmentVector {          // per-segment embeddings for semantic search + AI answers
  id        String @id @default(cuid())
  videoId   String
  startSec  Int
  endSec    Int
  textMl    String @db.Text
  embedding Unsupported("vector(1024)")
  @@index([videoId])
}

model Enrichment {           // everything AI generates per video, versioned as one unit
  id             String  @id @default(cuid())
  videoId        String  @unique
  video          Video   @relation(fields: [videoId], references: [id], onDelete: Cascade)
  summaryMl      String? @db.Text
  summaryEn      String? @db.Text
  keyTakeaways   Json                    // [{ml, en}]
  socialSnippets Json                    // {instagram, whatsapp, facebook, x}
  newsletterMd   String? @db.Text
  seoTitle       String?
  seoDescription String?
  modelVersion   String                  // e.g. "claude-sonnet-4.5" — enables re-runs
  generatedAt    DateTime
}

model Article {              // SEO satellite; long-form derived from transcript
  id          String        @id @default(cuid())
  videoId     String?       @unique
  video       Video?        @relation(fields: [videoId], references: [id])
  slug        String        @unique
  status      ArticleStatus @default(DRAFT)
  titleMl     String
  bodyMl      String        @db.Text     // MDX
  bodyEn      String?       @db.Text
  readingMin  Int
  embedding   Unsupported("vector(1024)")?
}

model Faq {
  id        String  @id @default(cuid())
  videoId   String
  video     Video   @relation(fields: [videoId], references: [id], onDelete: Cascade)
  questionMl String
  answerMl   String @db.Text
  questionEn String?
  answerEn   String? @db.Text
  timestampSec Int?                      // "answered at 5:12 in the video"
  order     Int
}

// ───────────────────────── DISCOVERY GRAPH ─────────────────────────

model Topic {                // Topic Hubs — the site's pillar pages
  id          String       @id @default(cuid())
  slug        String       @unique
  nameMl      String
  nameEn      String
  kind        TopicKind
  heroVideoId String?
  descriptionMl String?    @db.Text
  synonyms    Json                       // ["പ്രമേഹം","prameham","diabetes","sugar"] → seeds search dictionary
  videos      TopicVideo[]
  primaryFor  Video[]      @relation("primary")
  parentId    String?                    // shallow hierarchy, max depth 2
  ayurconnectUrl String?                 // cross-link, never duplicate
}

model TopicVideo {
  topicId  String
  topic    Topic  @relation(fields: [topicId], references: [id], onDelete: Cascade)
  videoId  String
  video    Video  @relation(fields: [videoId], references: [id], onDelete: Cascade)
  score    Float                         // AI relevance 0–1; hub ordering
  @@id([topicId, videoId])
}

model RelatedEdge {          // precomputed "watch next" graph
  fromId   String
  from     Video  @relation("from", fields: [fromId], references: [id], onDelete: Cascade)
  toId     String
  to       Video  @relation("to", fields: [toId], references: [id], onDelete: Cascade)
  score    Float                         // 0.6·embedding + 0.25·co-topic + 0.15·co-watch
  reason   String                        // "same-topic" | "semantic" | "co-watch" — explainable
  @@id([fromId, toId])
}

model Keyword {
  id       String @id @default(cuid())
  videoId  String
  video    Video  @relation(fields: [videoId], references: [id], onDelete: Cascade)
  termMl   String
  termEn   String?
  kind     String                        // "disease" | "symptom" | "medicine" | "generic"
}

model SynonymMapping {       // the manglish/synonym dictionary (§14) — admin-curated, learned from queries
  id        String  @id @default(cuid())
  variant   String  @unique               // "prameham", "sugar", "diabetics"
  canonical String                        // "പ്രമേഹം"
  source    String                        // "seed" | "query-log-suggested" | "manual"
  approved  Boolean @default(false)       // only approved rows feed Meilisearch synonyms
}

model Playlist {
  id        String   @id @default(cuid())
  slug      String   @unique
  youtubePlaylistId String? @unique
  titleMl   String
  items     PlaylistItem[]
}

model PlaylistItem {
  playlistId String
  playlist   Playlist @relation(fields: [playlistId], references: [id], onDelete: Cascade)
  videoId    String
  video      Video    @relation(fields: [videoId], references: [id], onDelete: Cascade)
  order      Int
  @@id([playlistId, videoId])
}

// ───────────────────────── USERS & ENGAGEMENT ─────────────────────────
// Better Auth owns: User, Session, Account, Verification, TwoFactor tables.

model Profile {              // app-level extension of Better Auth user
  id            String  @id                 // = Better Auth user id
  role          Role    @default(VIEWER)    // VIEWER | EDITOR | ADMIN
  langPref      String  @default("ml")
  newsletterOptIn Boolean @default(false)
}

model WatchProgress {        // powers Continue Watching + co-watch signals
  id          String   @id @default(cuid())
  viewerKey   String                        // "u:{userId}" | "a:{anonId}" — single non-null identity;
                                            // avoids the Postgres NULLs-are-distinct unique-constraint trap.
                                            // On login, "a:*" rows are re-keyed to "u:*" (merge, keep furthest position).
  userId      String?                       // denormalized for joins when signed in
  videoId     String
  positionSec Int
  completed   Boolean  @default(false)
  updatedAt   DateTime @updatedAt
  @@unique([viewerKey, videoId])
  @@index([updatedAt])
}

model AnalyticsEvent {       // funnel ingest (POST /api/v1/events) — partitioned by month, 12-mo retention
  id        BigInt   @id @default(autoincrement())
  name      String                           // "play" | "chain_play" | "subscribe_click" | "search" | ...
  viewerKey String?
  videoId   String?
  props     Json
  createdAt DateTime @default(now())
  @@index([name, createdAt])
}

model Comment {
  id        String        @id @default(cuid())
  videoId   String
  userId    String
  body      String        @db.Text
  status    CommentStatus @default(PENDING) // PENDING | APPROVED | REJECTED | SPAM
  parentId  String?
}

model NewsletterSubscriber {
  id         String   @id @default(cuid())
  email      String   @unique
  status     String   @default("pending")   // double opt-in
  token      String   @unique
}

model NewsletterIssue {      // weekly digest lifecycle: assembled → editor-approved → sent
  id        String   @id @default(cuid())
  subjectMl String
  bodyMd    String   @db.Text                // assembled from Enrichment.newsletterMd sections
  status    String   @default("draft")       // draft | approved | sent
  sentAt    DateTime?
  stats     Json?                            // opens/clicks from ESP webhook
}

// ───────────────────────── OPERATIONS ─────────────────────────

model Job {                  // mirror of BullMQ state for the admin queue UI
  id        String    @id @default(cuid())
  kind      String                          // ingest | asr | correct | translate | chapterize | enrich |
                                            // article | embed | link | index-search | quality-gate |
                                            // og-image | seo-ping | seo-pull | stats-refresh |
                                            // link-crawl | search-consistency | newsletter-assemble
  videoId   String?
  status    String                          // queued | active | done | failed
  attempts  Int       @default(0)
  error     String?   @db.Text
  costUsd   Decimal?  @db.Decimal(10,4)     // AI spend tracking per job
}

model Redirect {
  from String @id
  to   String
  code Int    @default(301)
}

model SiteHealthIssue {      // nightly crawler output: broken links + schema validation failures (§7.6)
  id        String   @id @default(cuid())
  path      String
  kind      String                          // "broken-link" | "schema-invalid" | "orphan-page"
  detail    Json                            // target URL, validator error, etc.
  resolved  Boolean  @default(false)
  createdAt DateTime @default(now())
  @@index([resolved, kind])
}

model SearchQueryLog {       // fuels "no results" fixes + content ideas for the channel
  id        String   @id @default(cuid())
  query     String
  script    String                          // "malayalam" | "latin" | "manglish"
  results   Int
  clickedVideoId String?
  createdAt DateTime @default(now())
  @@index([createdAt])
}

model AuditLog {
  id       String   @id @default(cuid())
  actorId  String
  action   String                           // "video.publish", "comment.reject", ...
  target   String
  meta     Json
  createdAt DateTime @default(now())
}

model SeoSnapshot {          // daily GSC/CWV pull per URL for the admin SEO dashboard
  id        String   @id @default(cuid())
  path      String
  date      DateTime @db.Date
  impressions Int
  clicks    Int
  position  Float
  cwv       Json?
  @@unique([path, date])
}
```

**Design notes**

- **Bilingual by column, not by table** (`titleMl`/`titleEn`): Malayalam is primary, English is derived. A future locale (§15) adds a `Localization` satellite table without touching the core — this is the pragmatic middle path for a 2-language reality with a multi-language future.
- **`Enrichment` is one row, versioned by `modelVersion`**: when a better model ships, re-run enrichment for all videos with a single queue command and diff before republishing.
- **Vectors live in Postgres (pgvector), lexical index lives in Meilisearch.** One source of truth (Postgres); Meilisearch is a disposable projection rebuilt from it at any time.
- **Anonymous-first engagement:** `WatchProgress.viewerKey` ("a:{deviceUUID}" from a cookie) means Continue Watching works with zero signup friction; on login, anonymous rows are re-keyed to the user (keeping the furthest position per video).
- **`SearchQueryLog` is a growth weapon:** queries with 0 results = next video ideas for the channel, surfaced in the admin dashboard.

---

## 3. Folder Structure

Single repo, pnpm workspaces monorepo — one deployable web app + one worker + shared packages. Supports future apps (§15) without a rewrite.

```
vaidyasala/
├── apps/
│   ├── web/                          # Next.js 16 (App Router)
│   │   ├── app/
│   │   │   ├── (public)/             # route group: public site
│   │   │   │   ├── page.tsx                  # Home
│   │   │   │   ├── watch/[slug]/page.tsx
│   │   │   │   ├── topics/[slug]/page.tsx
│   │   │   │   ├── articles/[slug]/page.tsx
│   │   │   │   ├── topics/page.tsx           # hub index
│   │   │   │   ├── playlists/[slug]/page.tsx
│   │   │   │   ├── search/page.tsx
│   │   │   │   ├── latest/ trending/ continue/ subscribe/ newsletter/
│   │   │   │   ├── about/ privacy/ terms/    # trust pages
│   │   │   ├── (admin)/admin/        # auth-gated layout, noindex
│   │   │   │   ├── videos/ articles/ topics/ playlists/ queue/
│   │   │   │   ├── search-analytics/ seo/ media/ comments/
│   │   │   │   ├── newsletter/ settings/
│   │   │   ├── api/                  # route handlers (§13)
│   │   │   │   ├── v1/[...]/route.ts
│   │   │   │   ├── webhooks/youtube/route.ts
│   │   │   │   └── auth/[...all]/route.ts    # Better Auth
│   │   │   ├── api/og/[videoId]/route.tsx    # per-video OG image renderer (ImageResponse)
│   │   │   ├── sitemap.ts  robots.ts  rss.xml/route.ts
│   │   │   ├── manifest.ts           # PWA
│   │   │   └── layout.tsx  globals.css
│   │   ├── components/               # app-specific compositions
│   │   │   ├── video/  search/  topics/  home/  admin/  shell/
│   │   ├── lib/
│   │   │   ├── seo/                  # jsonld.ts, meta.ts, breadcrumbs.ts
│   │   │   ├── youtube/              # oEmbed, IFrame API wrapper, UTM builder
│   │   │   ├── analytics/            # funnel events
│   │   │   └── cache.ts  flags.ts
│   │   └── e2e/                      # Playwright
│   │
│   └── worker/                       # BullMQ consumers (Node, no Next.js)
│       ├── src/
│       │   ├── queues/               # queue definitions + cron schedulers
│       │   ├── jobs/                 # pipeline: ingest.ts, asr.ts, correct.ts, translate.ts,
│       │   │                         #   chapterize.ts, enrich.ts, article.ts, embed.ts,
│       │   │                         #   link.ts, index-search.ts, quality-gate.ts, og-image.ts
│       │   │                         # ops:      seo-ping.ts, seo-pull.ts (GSC/CrUX), stats-refresh.ts,
│       │   │                         #   link-crawl.ts, search-consistency.ts, newsletter-assemble.ts
│       │   └── main.ts
│
├── packages/
│   ├── db/                           # Prisma schema (multi-file), client, migrations, seed
│   ├── core/                         # domain logic shared by web+worker
│   │   ├── ai/                       # provider-agnostic AI clients (§8): asr/, llm/, embed/
│   │   ├── search/                   # Meilisearch index config, query builder, manglish/
│   │   ├── content/                  # slugify-ml, chapters, related-scoring
│   │   └── validation/               # every Zod schema (single source of truth)
│   ├── ui/                           # design system (§4–5): shadcn/ui base + tokens
│   └── config/                       # eslint, tsconfig, tailwind preset (shared)
│
├── infra/
│   ├── docker/                       # Dockerfiles (web, worker), compose files (§12)
│   ├── caddy/                        # reverse proxy config
│   └── scripts/                      # backup.sh, restore.sh, reindex.ts
│
├── .github/workflows/                # ci.yml, deploy.yml, nightly.yml
└── docs/                             # this document, ADRs (decision log)
```

**Rules:** `packages/core` never imports React. `apps/worker` never imports from `apps/web`. All Zod schemas live in `packages/core/validation` and are shared by API routes, worker jobs, and forms — one contract everywhere.

---

## 4. Component Library

`packages/ui` = shadcn/ui primitives (owned, in-repo) + Vaidyasala compositions. Everything typed, everything with loading/empty/error states designed up front.

**Tier 1 — Primitives (shadcn/ui, restyled with tokens):** Button, Input, Dialog, Sheet, DropdownMenu, Tabs, Tooltip, Toast, Badge, Avatar, Skeleton, ScrollArea, Command (⌘K).

**Tier 2 — Platform components (the product):**

| Component | Role in funnel |
|---|---|
| `VideoCard` | The workhorse. Thumbnail (R2, blur-up), duration badge, progress bar if partially watched, topic chip. 3 sizes. |
| `VideoPlayer` | YouTube IFrame API wrapper. Facade pattern: renders thumbnail + play button, injects iframe on interaction (LCP stays clean). Emits play/25/50/75/complete events. |
| `StickyPlayer` | Player docks to corner mini-player on scroll — user reads transcript, video keeps playing. Watch-time keeper. |
| `ChapterList` | Timestamp index; click → seeks player; active chapter highlights as video plays. |
| `TranscriptView` | Virtualized, segment-synced to playhead, ML/EN toggle, reading mode (article typography), per-segment share links. |
| `SummaryCard` / `KeyTakeaways` / `FaqAccordion` | AI-content blocks; FAQ items with `timestampSec` render a "▶ 5:12" seek chip. |
| `RelatedRail` / `WatchNextCard` | Netflix-style horizontal rail; WatchNext shows auto-advance countdown overlay at video end. |
| `ContinueWatchingRail` | Resumes at saved position. Home + video page. |
| `SubscribeCTA` | The single most important component. Variants: inline, banner, post-video overlay, floating. Live subscriber count. All clicks tracked. |
| `SearchOmnibox` | ⌘K command palette: instant Meilisearch results grouped by Videos/Topics/Articles/FAQ, keyboard-first, voice input button, script auto-detect indicator. |
| `TopicChip` / `TopicHeader` | Hub navigation atoms. |
| `AudioModeBar` | TTS playback of summary/article (Web Speech API first, provider TTS later). |
| `ShareSheet` | WhatsApp-first (Kerala reality), then copy/X/Facebook; shares carry UTM. |
| `NewsletterInline` | One-field capture, double opt-in. |

**Tier 3 — Admin components:** `DataTable` (TanStack Table), `QueueBoard` (job pipeline kanban), `EnrichmentDiff` (AI regeneration side-by-side diff), `SeoScoreCard`, `AnalyticsChart`, `MediaGrid`, `CommentModQueue`.

Every Tier-2 component ships with a Skeleton twin (`VideoCard.Skeleton` etc.) — the app never shows a spinner (§6, UX).

---

## 5. UI Design System

### 5.1 Feel

Dark-first (video platform norm), content-forward, one accent color used almost exclusively for the Subscribe action so it stays the most clickable thing on every page.

### 5.2 Tokens (Tailwind v4 `@theme`, CSS custom properties)

```css
@theme {
  /* Color — dark first */
  --color-bg:          oklch(0.14 0.01 80);      /* near-black, warm */
  --color-surface:     oklch(0.19 0.01 80);
  --color-surface-2:   oklch(0.24 0.01 80);
  --color-text:        oklch(0.95 0.005 80);
  --color-text-dim:    oklch(0.70 0.01 80);
  --color-brand:       oklch(0.62 0.15 145);     /* ayurvedic deep green */
  --color-brand-warm:  oklch(0.75 0.12 75);      /* turmeric — highlights only */
  --color-cta:         oklch(0.58 0.22 27);      /* subscribe red — CTA ONLY */
  --color-focus:       oklch(0.70 0.15 145);

  /* Typography */
  --font-sans:  "Inter Variable", system-ui;
  --font-ml:    "Anek Malayalam Variable", "Noto Sans Malayalam", sans-serif;
  --font-serif-ml: "Noto Serif Malayalam", serif;   /* reading mode */

  /* Scale: 1.250 ratio; Malayalam gets +8% size & 1.7 line-height at same step */
  --text-xs … --text-5xl;
  --leading-ml: 1.75;

  /* Space: 4px grid. Radius: 8/12/16. Shadows: 3 elevations, subtle. */

  /* Motion */
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --dur-fast: 150ms;  --dur-base: 250ms;  --dur-slow: 400ms;
}
```

Light theme = same tokens re-mapped under `[data-theme=light]`. Both default themes hit the AAA 7:1 body-text contrast target (§5.5); an optional third high-contrast mapping goes further still (pure black/white, no dim text) for low-vision users.

### 5.3 Malayalam typography rules (non-negotiable)

Malayalam script is taller and denser than Latin. Rules: `--font-ml` with `1.7–1.8` line-height everywhere Malayalam renders; minimum 17px body on mobile; never letter-space Malayalam; variable fonts subset + preloaded (WOFF2, `unicode-range` split so Latin pages don't pay the Malayalam font cost); `font-display: swap` with size-adjusted fallback metrics to kill CLS.

### 5.4 Motion language (Motion library)

Purposeful only: shared-element thumbnail → player expansion on navigation; rails stagger-fade in (60ms stagger, once); sticky-player dock/undock spring (`stiffness 300, damping 30`); page transitions 250ms fade-through. `prefers-reduced-motion` collapses everything to opacity ≤ 150ms.

### 5.5 Accessibility (WCAG AAA targets)

7:1 contrast for body text in both themes (token pairs validated in CI with axe + custom contrast test); full keyboard nav (player included — space/←/→/↑/↓/c/m per YouTube conventions); focus visible always; screen-reader-first transcript (it *is* the accessible alternative to video); font scaling to 200% without breakage (rem everywhere); `lang="ml"` on Malayalam nodes so screen readers pick Malayalam voices; reduced-motion + high-contrast themes.

---

## 6. User Flows

### 6.1 The money flow: Google → Subscriber

```
Google result (Video schema rich result w/ thumbnail)
  → /watch/thyroid-ayurveda-chikitsa            [LCP < 1.8s, facade player]
  → Hero: title(ml) + player + summary card visible without scroll
  → User plays (event: play)                    [engagement clock starts]
  → Chapters + synced transcript keep user on page
  → 75% watched → SubscribeCTA overlay fades in  [not before — earn it]
  → Video ends → WatchNext auto-advance card (8s countdown, cancellable)
  → 2nd video plays (event: chain_play)
  → Exit intent / scroll-past-end → NewsletterInline
```

### 6.2 Search flow

`⌘K or tap search → type in any script (ml/latin/manglish) → instant grouped results (<50ms) → no results? → AI semantic fallback over transcript vectors → still nothing? → log query (admin sees content gap) + show nearest topics`

### 6.3 Return flow

`Newsletter (weekly digest, Tue 7pm IST) or PWA push → /continue → resume at 14:32 → finish → next video`

### 6.4 AI-answer flow (§14): question-shaped query → semantic search over transcript segments → answer composed ONLY from retrieved segments with video + timestamp citations → every citation is a play button. No sources → "no answer yet" + related topics. The AI never answers from model knowledge — retrieval or refusal.

### 6.5 Admin flow: paste YouTube URL (or webhook auto-detects upload) → pipeline runs (§9) → editor reviews draft (transcript diff, enrichment, article) → one-click publish → automatic sitemap/IndexNow/RSS/newsletter-queue fan-out.

---

## 7. SEO Strategy

Goal: own Malayalam health-video search — both classic SERP and AI-answer surfaces (Google AI Overviews cite pages with clean structure and speakable markup).

### 7.1 Structured data (per page type, JSON-LD, auto-generated by `lib/seo`)

| Page | Schema stack |
|---|---|
| Video page | `VideoObject` (with `hasPart` → `Clip` per chapter for key-moments rich results, `transcript`, `embedUrl`, `duration`, `interactionStatistic`) + `FAQPage` + `BreadcrumbList` + `MedicalWebPage` (careful, advisory-level claims only) + `SpeakableSpecification` (summary paragraphs) |
| Article | `Article` + `MedicalWebPage` + `BreadcrumbList` + `speakable` |
| Topic hub | `CollectionPage` + `ItemList` (videos) + `MedicalCondition` (where kind=CONDITION) + `BreadcrumbList` |
| Home | `WebSite` + `SearchAction` (sitelinks searchbox) + `Organization` (logo, `sameAs` → YouTube channel) |
| All | `OpenGraph` (custom OG image per video: thumbnail + Malayalam title overlay — rendered by the `og-image` worker job at publish via Satori/ImageResponse, cached to R2, served from `/api/og/[videoId]`) + Twitter Card `player` |

### 7.2 Indexing machinery (all automatic, zero manual steps)

- `sitemap.ts` → sharded sitemaps (`/sitemaps/videos-1.xml`, `articles`, `topics`) + Google **video sitemap** extension with `<video:video>` tags.
- **IndexNow** ping (Bing/Yandex) + Google sitemap re-ping on every publish/update — fired by the `seo-ping` worker job.
- RSS (`/rss.xml`) full-content feed; also consumed by the newsletter builder.
- Canonicals: video page is canonical for its content; article is canonical for its expansion; `?t=` params canonicalized away.
- `Redirect` table enforced at middleware level (301) — zero link-rot.

### 7.3 E-E-A-T for health content

`/about` establishes the channel's practitioner credentials; every medical page renders a reviewed-by line + "educational, not medical advice" disclaimer block; `MedicalWebPage.lastReviewed` kept honest; outbound authority links (to AyurConnect's doctor/disease pages — the two products reinforce each other's authority instead of competing).

### 7.4 Internal-linking AI

The `link` worker job maintains the `RelatedEdge` graph (§2) and injects contextual in-body links into articles: candidate anchor phrases are matched against `Topic.synonyms` and video keywords, scored by embedding similarity, capped at 6 per article, and never inside headings. Re-runs when new content publishes, so old pages continuously gain links to new videos (freshness flows backwards).

### 7.5 Bilingual SEO

Malayalam pages target Malayalam-script queries (large and underserved); the English transcript/summary sections make the same page rank for English queries ("thyroid ayurveda treatment") — one URL, dual-language capture, no hreflang complexity until true multi-locale (§15).

### 7.6 Measurement

Nightly worker pulls Search Console API + CrUX into `SeoSnapshot`; admin SEO dashboard shows per-URL impressions/clicks/position trends, CWV status, broken links (nightly crawler), and schema validation failures. Search-with-zero-results report doubles as a **video topic idea generator** for the channel.

---

## 8. AI Pipeline

### 8.1 Provider abstraction

All AI behind interfaces in `packages/core/ai` — providers are config, not code:

```ts
interface AsrProvider   { transcribe(audio: R2Ref, lang: "ml"): Promise<AsrResult> }     // Sarvam Saarika (primary) | Whisper large-v3 API (fallback) | YT captions (seed)
interface LlmProvider   { complete(task: PromptTask): Promise<LlmResult> }               // Claude Sonnet (workhorse) | Claude Haiku (cheap tasks: keywords, snippets)
interface EmbedProvider { embed(texts: string[]): Promise<number[][]> }                  // multilingual-e5-large-class hosted API, 1024-dim
```

Every call: Zod-validated JSON output (retry w/ repair prompt on parse failure, max 2), token + cost logged to `Job.costUsd`, `modelVersion` stamped on results, per-provider rate-limit + circuit breaker.

### 8.2 Per-video AI chain (each step = separate idempotent BullMQ job)

```
audio (yt-dlp → R2, m4a)
  1. ASR            → Transcript.rawMl + segments            [Sarvam; YT captions used as alignment hint if present]
  2. CORRECT        → Transcript.correctedMl                 [Claude: fix ASR errors, medical-term glossary injected in prompt,
                                                              chunked 3k tokens w/ overlap, diff-guard: >40% change ⇒ flag review]
  3. TRANSLATE      → Transcript.english                     [Claude, segment-aligned so EN transcript stays clickable]
  4. CHAPTERIZE     → Chapter[]                              [skip if YT chapters exist; else topic-shift segmentation]
  5. ENRICH         → Enrichment (summary ml+en, takeaways,  [one structured Claude call, JSON schema output]
                       FAQs w/ timestamps, keywords, SEO meta,
                       social snippets, newsletter section)
  6. ARTICLE        → Article draft (MDX)                    [transcript → long-form; headings target search queries;
                                                              hallucination guard: every claim must trace to a transcript segment]
  7. EMBED          → video embedding + per-segment vectors  [batch]
  8. LINK           → TopicVideo scores + RelatedEdge graph + article in-body links
  9. INDEX          → Meilisearch documents
 10. QUALITY GATE   → composite score; < threshold ⇒ stays DRAFT flagged, else DRAFT ready-to-publish
```

**Hallucination policy (hard rule):** generation tasks are *transformations of the transcript*, never open-ended. Prompts forbid external medical claims; the article job runs a verification pass that maps each paragraph to source segments and strips unmapped claims. The public AI search (§14) is retrieval-only.

**Cost envelope (order of magnitude, per 20-min video):** ASR ~$0.20–0.40 · LLM chain ~$0.30–0.60 · embeddings <$0.01 → **≈ $1/video**; a 300-video backfill ≈ $300 one-time. Tracked per job in admin.

### 8.3 Human-in-the-loop

Nothing auto-publishes by default. Pipeline output lands as DRAFT with quality scores; editor reviews in admin (transcript diff view, enrichment cards) and publishes. A per-channel "trusted mode" toggle can enable auto-publish later once correction quality is proven.

---

## 9. Automation Pipeline

### 9.1 Ingestion triggers

1. **YouTube push (primary):** WebSub/PubSubHubbub subscription to the channel feed → `POST /api/webhooks/youtube` → verify → enqueue `ingest`. New upload becomes a processing draft within minutes.
2. **Polling fallback:** worker cron every 15 min compares uploads playlist via YouTube Data API (webhook lease renewals can fail — never rely on push alone).
3. **Manual:** paste URL in admin (also used for backfilling the existing catalog, throttled to respect API quotas).

### 9.2 End-to-end flow

```
trigger → INGEST (metadata, thumbnails→R2, chapters, captions-if-any, audio→R2)
        → AI chain §8.2 (BullMQ flow: parent job w/ children, per-step retry
          exponential backoff ×5, failures park in DLQ visible in admin QueueBoard)
        → DRAFT ready → editor publish
        → on publish (transactional fan-out):
             revalidateTag(video/topic/home) → sitemap regen → IndexNow + Google ping
             → RSS regen → newsletter section queued → social snippets ready-to-copy
             → OG image rendered → related-edge refresh for affected videos
```

### 9.3 Scheduled jobs (worker cron)

| Cadence | Job |
|---|---|
| 15 min | YT poll fallback; queue health |
| hourly | video stats refresh (views/likes → `Video.stats`, staleness-tiered to respect quota) |
| nightly | GSC + CrUX pull → `SeoSnapshot`; broken-link + schema crawl → `SiteHealthIssue`; Meilisearch consistency check; `pg_dump` full backup → R2 (WAL archiving runs continuously — same strategy as §10); R2 lifecycle cleanup |
| weekly | newsletter assembly (`Enrichment.newsletterMd` sections → `NewsletterIssue` draft → editor approves → send via Resend); related-graph full recompute |
| monthly | scripted backup **restore drill** (§10) |

Idempotency everywhere: jobs keyed `{kind}:{videoId}:{contentHash}` — re-running a completed step is a no-op unless inputs changed.

---

## 10. Security Plan

**Edge (Cloudflare):** WAF managed rules + rate-limit rules (search: 30 req/min/IP; auth: 10; comments: 5); Bot Fight Mode; origin locked to Cloudflare IPs (firewall) + authenticated origin pulls (mTLS); DNSSEC; Turnstile on signup/comments/newsletter.

**App:** Better Auth with 2FA (TOTP) mandatory for EDITOR/ADMIN roles; short-lived sessions + rotation; RBAC enforced in a single `authorize()` layer used by both pages and API routes (defense against route-handler drift); every input Zod-parsed at the boundary; Prisma (parameterized) — no raw SQL except vetted pgvector queries via `$queryRaw` tagged templates; strict CSP (nonce-based, `frame-src youtube-nocookie.com`), HSTS preload, COOP/CORP; secured webhooks (HMAC verification); admin panel additionally IP-allowlistable via Cloudflare Access (zero-trust) — auth before the request even reaches origin.

**Data:** encrypted at rest (LUKS volume) + in transit (TLS 1.3 end-to-end); secrets via Docker secrets (never env-committed); PII minimal by design (email + optional name only — no health data collected from users, deliberately); GDPR-grade delete cascades; `AuditLog` on every admin mutation; backups: nightly `pg_dump` + WAL archiving to R2 (encrypted, 30-day retention), **monthly restore drill scripted** (`infra/scripts/restore.sh`) — a backup that's never been restored is a hope, not a backup.

**Monitoring:** Sentry (web+worker), Uptime Kuma (self-hosted probes), Grafana+Prometheus+Loki stack (compose profile), alerting to email/Telegram: queue depth, error rate, CWV regression, disk, cert expiry, failed logins.

---

## 11. Deployment Architecture

```
                         ┌──────────────────────────────┐
   Users ──────────────▶ │  CLOUDFLARE                   │
                         │  DNS · CDN · WAF · TLS ·      │
                         │  Turnstile · R2 (media) ·     │
                         │  Access (admin zero-trust)    │
                         └──────────────┬───────────────┘
                                        │ authenticated origin pull
                         ┌──────────────▼───────────────┐
                         │  VPS (Hetzner AX/CPX, EU or   │
                         │  Mumbai-proximate; Ubuntu LTS)│
                         │                               │
                         │  Caddy (reverse proxy, http3) │
                         │   ├─ web (Next.js, ×2)        │
                         │   ├─ worker (BullMQ, ×1,      │
                         │   │          scalable to ×N)  │
                         │   ├─ postgres 17 + pgvector   │
                         │   ├─ redis 7 (cache + queues) │
                         │   └─ meilisearch              │
                         └──────────────┬───────────────┘
                                        │
              ┌─────────────┬───────────┼──────────────────────┬─────────────┐
        R2 (backups)  YouTube APIs   AI APIs (Claude,     Resend (email)  GSC/CrUX APIs
                                     Sarvam, embeddings)
```

**Rendering strategy (the performance core):** public pages are **ISR** — video/topic/article pages statically generated, revalidated by tag on publish (`revalidateTag('video:{id}')`), so Cloudflare + Next cache serve virtually all traffic statically; personalization (Continue Watching, Recommended) streams in via Suspense from small dynamic islands — static shell, personal filling. Search hits Meilisearch directly (it *is* the cache). Result: origin CPU stays flat as traffic grows; a traffic spike is Cloudflare's problem, not the VPS's.

**CI/CD (GitHub Actions):**

```
PR:    lint → typecheck → unit (Vitest) → build → Playwright e2e → Lighthouse CI budget gate
main:  build multi-stage images → push GHCR → SSH deploy: compose pull +
       prisma migrate deploy + rolling restart (web ×2 behind Caddy ⇒ zero-downtime)
       → smoke check → auto-rollback to previous image tag on failure
nightly: dependency audit, backup verification, broken-link crawl
```

Lighthouse CI budgets enforced in PR gate: perf ≥ 95, LCP ≤ 1.8s, CLS ≤ 0.05, JS ≤ 170KB gz on video page — performance is a test, not an aspiration.

---

## 12. Docker Architecture

Multi-stage images: `deps → build (standalone output) → runner (node:22-slim, non-root, read-only fs)`. Web image ≈ 150MB; worker similar + `yt-dlp`/`ffmpeg` layer.

```yaml
# infra/docker/compose.prod.yml (shape)
services:
  caddy:        { ports: ["443:443"], profiles: [core] }
  web:          { image: ghcr.io/…/web:${TAG}, deploy: {replicas: 2},
                  depends_on: [postgres, redis, meilisearch], internal only }
  worker:       { image: ghcr.io/…/worker:${TAG}, deploy: {replicas: ${WORKER_REPLICAS:-1}} }  # scale-out is a var, not a redeploy
  postgres:     { image: pgvector/pgvector:pg17, volumes: [pgdata], internal }
  redis:        { image: redis:7-alpine, appendonly yes, internal }
  meilisearch:  { image: getmeili/meilisearch:v1.x, volumes: [meili], internal }
  # profiles: [observability] → prometheus, grafana, loki, uptime-kuma
```

Two networks (`edge`: caddy+web; `internal`: everything else — DB/Redis/Meili never exposed); healthchecks on every service gate the rolling restart; resource limits per service; `compose.dev.yml` mirrors prod (same Postgres/Redis/Meili versions) so dev = prod minus TLS. Single `docker compose --profile core up` brings up the platform; observability is an opt-in profile on the same host until scale demands separation (§15).

---

## 13. API Design

**Internal-first:** Server Components read the DB directly through `packages/core` service functions (no self-HTTP). Route handlers exist for client interactivity, webhooks, and future apps — all under `/api/v1`, all Zod-validated, all typed end-to-end (schemas shared from `packages/core/validation`; TanStack Query on the client).

```
Public (rate-limited, cached):
  GET  /api/v1/search?q=&script=auto&type=video|article|topic|faq   # Meilisearch proxy + logging
  POST /api/v1/ai/answer          {question} → {answer, citations:[{videoId,startSec}]}   # retrieval-only, streamed (SSE)
  GET  /api/v1/videos/:slug/related
  GET  /api/v1/videos?topic=&cursor=          # infinite scroll feeds
  POST /api/v1/progress           {videoId, positionSec}            # beacon-friendly
  GET  /api/v1/continue
  POST /api/v1/newsletter/subscribe · GET /confirm?token=
  POST /api/v1/comments  · GET /api/v1/videos/:slug/comments
  POST /api/v1/events             {name, props}                     # funnel analytics ingest

Auth:      /api/auth/[...all]                                       # Better Auth
Webhooks:  POST /api/webhooks/youtube (WebSub, HMAC-verified)

Admin (RBAC EDITOR+, audited):
  POST /api/v1/admin/videos/ingest         {youtubeUrl}
  POST /api/v1/admin/videos/:id/publish | /regenerate {steps:[...]}
  GET  /api/v1/admin/queue · POST /api/v1/admin/queue/:jobId/retry
  GET  /api/v1/admin/analytics/search | /seo | /funnel
  CRUD /api/v1/admin/topics · /articles · /playlists · /comments/:id/moderate
```

Conventions: cursor pagination everywhere (`{items, nextCursor}`); errors as RFC 9457 problem-details; idempotency keys on mutating admin endpoints; SSE for AI answer streaming and queue live-updates. Versioning by URL (`/v1`) — future native apps (§15) consume the same surface.

---

## 14. Search Architecture

Two engines, one box, clear division of labor:

**Lexical (Meilisearch)** — the instant layer (<50ms):

- Indexes: `videos` (title ml+en, summary, keywords, topic names, chapter titles, FAQ questions, *transcript text chunked*), `articles`, `topics`, `faqs`.
- Searchable attributes weighted: title > keywords > summary > chapters > transcript.
- **Script handling — the differentiator:** query classifier detects Malayalam script / Latin / Manglish. Malayalam → direct. English → direct (EN fields + synonyms). **Manglish → transliteration layer** (`packages/core/search/manglish`): rule-based Mozhi/ISO-15919-style mapping generates top-k Malayalam candidates (`"prameham"→"പ്രമേഹം"`) + the `SynonymMapping` table (§2) — seeded from `Topic.synonyms`, grown from `SearchQueryLog`, admin-approved rows synced into Meilisearch's synonym config. The dictionary learns from real users.
- Typo tolerance on; voice input via Web Speech API (`ml-IN`) feeding the same box.

**Semantic (pgvector)** — the depth layer:

- Per-segment transcript embeddings (`TranscriptSegmentVector`, HNSW index, cosine).
- Triggers: zero/weak lexical results, or question-shaped query ("എങ്ങനെ", "why", "?").
- Hybrid mode: RRF-merge lexical + vector when both fire.

**AI Answer mode (`/api/v1/ai/answer`)** — retrieval-augmented, never generative-from-nothing:

```
question → embed → top-12 segments (pgvector) → rerank → threshold gate
  → pass: Claude composes answer FROM SEGMENTS ONLY, cites [videoId, startSec] per claim
          → UI renders citations as playable timestamp chips  ← every answer sells a video
  → fail: honest "no answer yet" + nearest topic hubs + query logged as content gap
```

Indexing: `index-search` job upserts on publish; nightly consistency sweep; Meilisearch fully rebuildable from Postgres (`infra/scripts/reindex.ts`) — search index is cattle, not a pet.

---

## 15. Future Scalability Plan

**Architecture seams already in place** (why nothing needs a rewrite):

| Future need | Seam that absorbs it |
|---|---|
| Native mobile / Smart TV apps | `/api/v1` versioned surface + Better Auth token sessions; apps are new consumers, zero backend change. TV = the same Netflix-style rails, new client. |
| Podcast platform | Audio already extracted to R2 per video; add an `PodcastFeed` projection + RSS w/ `<enclosure>` — a worker job, not a system. |
| Voice assistant / AI health assistant | The retrieval-only answer API *is* the assistant backend; add channels (WhatsApp bot is the Kerala-relevant first move). |
| Multi-language / international | Localization satellite tables (§2 note), locale-scoped routes (`/en/…`), hreflang emission in `lib/seo` — schema anticipated it. |
| Wearables | Out of content scope; the API surface + auth model is where any integration would land. |
| Multiple channels / creators | `Video.channelId` migration + tenancy column; admin already role-based. |

**Scale ladder (only climb when metrics demand):**

1. **Now (1 VPS):** ISR + Cloudflare absorbs read traffic; Postgres tuned (shared_buffers, HNSW `ef_search`); good to ~500k visits/mo with headroom.
2. **Step 2:** move Postgres to a second host or managed PG; add worker replicas (BullMQ scales horizontally by design); Redis stays.
3. **Step 3:** web replicas ×N behind Cloudflare load balancing; read replica for feeds; Meilisearch on its own node.
4. **Step 4 (if global):** multi-region read paths via Cloudflare; R2 already global; consider Workers for edge personalization.

**Data longevity:** every AI artifact carries `modelVersion` → whole-catalog regeneration is one queue command when models improve (the 2027 model rewrites 2026's summaries overnight, and the diff view shows what changed). Postgres is the single source of truth; search index, caches, and CDN are all disposable projections. That property — one truth, many rebuildable views — is what keeps this platform modern in 2035.

---

## 16. Build Roadmap (post-approval)

| Phase | Scope | Exit criterion |
|---|---|---|
| 1. Foundation | Monorepo, Docker dev env, Prisma schema + migrations, design tokens, UI primitives, CI | `compose up` → styled shell renders |
| 2. Ingest & pipeline | YouTube ingest, worker + queues, ASR→enrich chain, admin queue board | Paste URL → reviewed draft w/ full AI artifacts |
| 3. Public core | Video page (player, chapters, transcript, FAQs, related), topic hubs, home, ISR + SEO machinery | Lighthouse ≥ 95 on real content; rich-result validation passes |
| 4. Search | Meilisearch + manglish layer + omnibox; semantic + AI answers | All three scripts return right results; AI answers cite timestamps |
| 5. Engagement | Continue watching, watch-next autoplay, subscribe CTAs, newsletter, comments, PWA | Funnel events flowing end-to-end |
| 6. Admin & ops | Full admin panel, SEO dashboard, analytics, moderation, backups + restore drill, observability | Editor runs the platform without a developer |
| 7. Launch | Backfill catalog, DNS cutover, GSC submission, monitoring baselines | First organic Google → watch → subscribe conversion measured |

---

*End of architecture document. Awaiting approval — reply with changes or "approved" to begin Phase 1.*
