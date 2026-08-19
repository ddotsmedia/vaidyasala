import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getVideoBySlug, publishedSlugs } from "@/lib/video";
import { safeStaticParams } from "@/lib/static-params";
import { WatchExperience } from "@/components/video/watch-experience";
import { MedicalDisclaimer } from "@/components/seo/medical-disclaimer";
import {
  JsonLd,
  pageMetadata,
  videoObjectLd,
  faqPageLd,
  medicalWebPageLd,
  breadcrumbLd,
} from "@/lib/seo";

// ISR: statically generated, revalidated on publish (§11) + full JSON-LD/OG (§7).
// 1h background window; publish/edit still busts it immediately via revalidateTag,
// so the longer window costs freshness only for view-count drift.
export const revalidate = 3600;
export const dynamicParams = true;

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  return safeStaticParams(
    async () => (await publishedSlugs()).map((slug) => ({ slug })),
    "watch",
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const video = await getVideoBySlug(slug);
  if (!video) return { title: "Not found" };
  return pageMetadata({
    title: video.titleMl,
    description: video.summaryMl ?? video.description,
    path: `/watch/${video.slug}`,
    // The YouTube thumbnail, not /api/og — that route serves SVG, which no
    // social crawler renders, so the card came through with no image at all.
    // This is a real 1280x720 JPEG and shows the actual frame.
    ogImage: video.thumbnailUrl,
    type: "video.other",
    publishedTime: video.publishedAt,
    video: { embedUrl: `https://www.youtube-nocookie.com/embed/${video.youtubeId}` },
  });
}

export default async function WatchPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const video = await getVideoBySlug(slug);
  if (!video) notFound();

  const crumbs = [
    { name: "Home", path: "/" },
    ...(video.topic ? [{ name: video.topic.nameMl, path: `/topics/${video.topic.slug}` }] : []),
    { name: video.titleMl, path: `/watch/${video.slug}` },
  ];

  return (
    // pb-28 on mobile clears the fixed subscribe bar; lg drops it since the bar
    // moves into the sidebar there.
    <article className="py-6 pb-28 lg:pb-6">
      <JsonLd
        data={[
          videoObjectLd({
            slug: video.slug,
            youtubeId: video.youtubeId,
            titleMl: video.titleMl,
            titleEn: video.titleEn,
            description: video.summaryMl ?? video.description,
            thumbnailUrl: video.thumbnailUrl,
            durationSec: video.durationSec,
            publishedAt: video.publishedAt,
            viewCount: video.viewCount,
            transcript: video.transcriptText,
            chapters: video.chapters,
          }),
          ...(video.faqs.length
            ? [faqPageLd(video.faqs.map((f) => ({ questionMl: f.questionMl, answerMl: f.answerMl })))]
            : []),
          medicalWebPageLd({
            name: video.titleMl,
            path: `/watch/${video.slug}`,
            description: video.summaryMl ?? video.description,
            lastReviewed: video.updatedAt,
            speakable: true,
          }),
          breadcrumbLd(crumbs),
        ]}
      />
      <WatchExperience data={video} />
      <MedicalDisclaimer lastReviewed={video.updatedAt} className="mt-8" />
    </article>
  );
}
