import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getVideoBySlug, publishedSlugs } from "@/lib/video";
import { WatchExperience } from "@/components/video/watch-experience";

// ISR: statically generated, revalidated on publish (§11). Full tag-based
// revalidation + JSON-LD/SEO machinery land in Phase 3C.
export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const slugs = await publishedSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const video = await getVideoBySlug(slug);
  if (!video) return { title: "Not found" };
  return {
    title: video.titleMl,
    description: video.summaryMl?.slice(0, 155) ?? undefined,
    alternates: { canonical: `/watch/${video.slug}` },
    openGraph: {
      title: video.titleMl,
      description: video.summaryMl?.slice(0, 155) ?? undefined,
      type: "video.other",
    },
  };
}

export default async function WatchPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const video = await getVideoBySlug(slug);
  if (!video) notFound();

  return (
    <article className="py-6">
      <WatchExperience data={video} />
    </article>
  );
}
