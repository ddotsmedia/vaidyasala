import { Suspense } from "react";
import Link from "next/link";
import { VideoCard, TopicChip } from "@vaidyasala/ui";
import {
  getFeatured,
  getTrending,
  getLatest,
  getPopularTopics,
  getLatestArticles,
} from "@/lib/feeds";
import { VideoGrid, LinkedRail } from "@/components/home/video-grid";
import { NewsletterForm } from "@/components/home/newsletter-form";
import { ContinueIsland, RecommendedIsland, RailSkeleton } from "@/components/home/islands";
import { SubscribeCTA } from "@vaidyasala/ui";
import { JsonLd, websiteLd, organizationLd } from "@/lib/seo";

export const revalidate = 300;

const CHANNEL_URL = "https://www.youtube.com/@vaidyasala?sub_confirmation=1";

/** Home (§1.1 order): static shell + streamed personalization islands (§11). */
export default async function HomePage() {
  const [featured, trending, latest, topics, articles] = await Promise.all([
    getFeatured(),
    getTrending(8),
    getLatest(8),
    getPopularTopics(8),
    getLatestArticles(4),
  ]);

  return (
    <div className="flex flex-col gap-12 py-8">
      <JsonLd data={[websiteLd(), organizationLd()]} />
      {/* Featured */}
      {featured ? (
        <section className="flex flex-col gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Featured</h1>
          <Link href={`/watch/${featured.slug}`} className="block max-w-3xl">
            <VideoCard video={featured} size="lg" />
          </Link>
        </section>
      ) : (
        <section className="py-16">
          <h1 className="text-2xl font-semibold">No videos yet</h1>
          <p className="text-text-dim mt-2 text-sm">Content will appear once videos are published.</p>
        </section>
      )}

      {/* Trending */}
      <LinkedRail title="Trending this week" videos={trending} />

      {/* Latest */}
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Latest</h2>
          <Link href="/latest" className="text-brand text-sm hover:underline">
            View all →
          </Link>
        </div>
        <VideoGrid videos={latest} />
      </section>

      {/* Continue [island] */}
      <Suspense fallback={<RailSkeleton />}>
        <ContinueIsland />
      </Suspense>

      {/* Recommended [island] */}
      <Suspense fallback={<RailSkeleton />}>
        <RecommendedIsland />
      </Suspense>

      {/* Popular topics */}
      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Popular topics</h2>
          <Link href="/topics" className="text-brand text-sm hover:underline">
            All topics →
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          {topics.map((t) => (
            <Link key={t.slug} href={`/topics/${t.slug}`}>
              <TopicChip topic={{ slug: t.slug, nameMl: t.nameMl, nameEn: t.nameEn }} />
            </Link>
          ))}
        </div>
      </section>

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
