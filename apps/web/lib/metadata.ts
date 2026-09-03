import type { Metadata } from "next";

export interface VideoMetadataInput {
  slug: string;
  titleEn?: string;
  titleMl?: string;
  description?: string;
  thumbnailUrl: string;
  youtubeId: string;
  publishedAt?: Date | string | null;
}

export function generateVideoMetadata(video: VideoMetadataInput, siteUrl: string): Metadata {
  const title = video.titleEn || video.titleMl || "Video";
  const description = video.description ? video.description.substring(0, 160) : "Watch this health video on Vaidyasala";
  const url = `${siteUrl}/watch/${video.slug}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "video.other",
      url,
      images: [
        {
          url: video.thumbnailUrl,
          width: 1280,
          height: 720,
          alt: title,
        },
      ],
      videos: [
        {
          url: `https://www.youtube.com/embed/${video.youtubeId}`,
          type: "text/html",
          width: 1280,
          height: 720,
        },
      ],
      ...(video.publishedAt && typeof video.publishedAt === "string"
        ? { publishedTime: video.publishedAt }
        : video.publishedAt instanceof Date
          ? { publishedTime: video.publishedAt }
          : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [video.thumbnailUrl],
    },
  };
}
