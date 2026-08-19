import { SITE, isoDuration, absoluteUrl } from "@/lib/seo";

/**
 * Video schema (§7 VideoObject) for rich snippets in Google Search.
 * Renders as <script type="application/ld+json"> for SEO.
 */
export interface VideoSchemaProps {
  title: string;
  description: string | null;
  youtubeId: string;
  durationSec: number;
  publishedAt?: Date | null;
  videoSlug: string;
}

export function VideoSchema({
  title,
  description,
  youtubeId,
  durationSec,
  publishedAt,
  videoSlug,
}: VideoSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: title,
    description: description ?? `Learn about this topic with ${SITE.name}`,
    thumbnailUrl: [
      `https://i.ytimg.com/vi/${youtubeId}/mqdefault.jpg`,
      `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`,
      `https://i.ytimg.com/vi/${youtubeId}/maxresdefault.jpg`,
    ],
    uploadDate: publishedAt ? new Date(publishedAt).toISOString() : new Date().toISOString(),
    duration: isoDuration(durationSec),
    contentUrl: `https://www.youtube.com/embed/${youtubeId}`,
    embedUrl: `https://www.youtube.com/embed/${youtubeId}`,
    // BLOCKED: creator name would require joining User table in videos query.
    // Current VideoData doesn't include creator info. Can be added when
    // user/creator relationship is defined.
  };

  return (
    <script
      type="application/ld+json"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
