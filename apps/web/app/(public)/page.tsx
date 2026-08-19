import { Suspense } from "react";
import Link from "next/link";
import type { Metadata, Route } from "next";
import {
  getFeaturedHero,
  getTrending,
  getLatest,
  getPopularTopics,
  getTopicRails,
  getLatestArticles,
} from "@/lib/feeds";
import { NewsletterForm } from "@/components/home/newsletter-form";
import { HeroSection } from "@/components/HeroSection";
import { RecommendedIsland, RailSkeleton } from "@/components/home/islands";
import { ContinueWatchingClient } from "@/components/home/continue-client";
import { VideoCarousel } from "@/components/video-carousel";
import { CategoryGrid } from "@/components/category-grid";
import { SubscribeCTA } from "@vaidyasala/ui";
import { JsonLd, websiteLd, organizationLd, pageMetadata } from "@/lib/seo";

export const revalidate = 1800;

/**
 * The homepage had no metadata export at all, so it inherited the root
 * default — the bare word "Vaidyasala", no canonical and no OG image — on the
 * single most linked-to page of the site. `title.absolute` bypasses the
 * "%s · Vaidyasala" template, which would otherwise duplicate the brand.
 */
export const metadata: Metadata = {
  ...pageMetadata({
    title: "Vaidyasala — Malayalam health videos, searchable by question",
    description:
      "Search 500+ Malayalam Ayurveda and health videos by what you actually want to know. AI summaries, chapters and transcripts for every video.",
    path: "/",
  }),
  title: { absolute: "Vaidyasala — Malayalam health videos, searchable by question" },
};

const CHANNEL_URL = "https://www.youtube.com/@vaidyasala?sub_confirmation=1";

/** Home (§1.1 order): static shell + streamed personalization islands (§11). */
export default async function HomePage() {
  const [featured, trending, latest, topics, topicRails, articles] = await Promise.all([
    getFeaturedHero(),
    getTrending(12),
    getLatest(12),
    getPopularTopics(8),
    getTopicRails(4),
    getLatestArticles(4),
  ]);

  return (
    <div className="flex flex-col gap-12 py-8">
      <JsonLd data={[websiteLd(), organizationLd()]} />
      {/* Featured hero */}
      {featured ? (
        <HeroSection video={featured} />
      ) : (
        <section className="py-16">
          <h1 className="text-2xl font-semibold">No videos yet</h1>
          <p className="text-text-dim mt-2 text-sm">Content will appear once videos are published.</p>
        </section>
      )}

      {/* Trending */}
      <VideoCarousel title="Trending this week" videos={trending} viewAllHref="/trending" />

      {/* Latest */}
      <VideoCarousel title="Latest" videos={latest} viewAllHref="/latest" />

      {/* Continue watching — fetched after hydration so the page stays static
          and ISR/CDN-cacheable. See continue-client.tsx. */}
      <ContinueWatchingClient />

      {/* Recommended [island] — no viewer cookie, so it renders on the server. */}
      <Suspense fallback={<RailSkeleton />}>
        <RecommendedIsland />
      </Suspense>

      {/* Health topics */}
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Browse by topic</h2>
          <Link href="/topics" className="text-brand text-sm hover:underline">
            All topics →
          </Link>
        </div>
        <CategoryGrid topics={topics} />
      </section>

      {/* One rail per major topic. Skipped entirely when the catalogue is too
          small for any topic to clear the minimum. */}
      {topicRails.map((rail) => (
        <VideoCarousel
          key={rail.slug}
          title={rail.nameEn}
          subtitleMl={rail.nameMl}
          videos={rail.videos}
          viewAllHref={`/topics/${rail.slug}` as Route}
        />
      ))}

      {/* Latest articles */}
      {articles.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Latest articles</h2>
          <ul className="flex flex-col gap-2">
            {articles.map((a) => (
              <li key={a.slug}>
                <Link
                  href={`/articles/${a.slug}`}
                  className="border-border hover:bg-surface flex items-center justify-between rounded-lg border p-3"
                >
                  <span className="font-ml" lang="ml">
                    {a.titleMl}
                  </span>
                  <span className="text-text-dim text-xs">{a.readingMin} min</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Subscribe */}
      <section className="border-border bg-surface flex flex-col items-center gap-3 rounded-xl border p-8 text-center">
        <h2 className="text-lg font-semibold">Enjoying Vaidyasala?</h2>
        <p className="text-text-dim text-sm">Subscribe on YouTube for new Malayalam health videos.</p>
        <SubscribeCTA channelUrl={CHANNEL_URL} variant="inline" />
      </section>

      {/* Newsletter */}
      <section className="flex max-w-xl flex-col gap-3">
        <h2 className="text-lg font-semibold">Weekly newsletter</h2>
        <p className="text-text-dim text-sm">A weekly digest of new health videos, every Tuesday.</p>
        <NewsletterForm />
      </section>
    </div>
  );
}
