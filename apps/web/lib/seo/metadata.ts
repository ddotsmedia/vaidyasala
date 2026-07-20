import "server-only";
import type { Metadata } from "next";
import { SITE, absoluteUrl } from "./site";

/** OG image URL for a video (branded card rendered by /api/og, §7.1). */
export function ogImageUrl(videoId: string): string {
  return absoluteUrl(`/api/og/${videoId}`);
}

export interface PageMetaInput {
  title: string;
  description?: string | null;
  path: string;
  ogImage?: string;
  type?: "website" | "article" | "video.other";
  publishedTime?: string | null;
  video?: { embedUrl: string; width?: number; height?: number };
}

/**
 * Shared metadata builder: canonical + OpenGraph + Twitter card (§7.1 "All").
 * Video pages get a Twitter `player` card; everything else `summary_large_image`.
 */
export function pageMetadata(input: PageMetaInput): Metadata {
  const url = absoluteUrl(input.path);
  const description = input.description?.slice(0, 200) ?? SITE.description;
  const images = input.ogImage ? [{ url: input.ogImage, width: 1200, height: 630 }] : undefined;
  return {
    title: input.title,
    description,
    alternates: { canonical: input.path },
    openGraph: {
      title: input.title,
      description,
      url,
      siteName: SITE.name,
      locale: SITE.locale,
      type: input.type ?? "website",
      publishedTime: input.publishedTime ?? undefined,
      images,
    },
    twitter: input.video
      ? {
          card: "player",
          title: input.title,
          description,
          images,
          players: [
            {
              playerUrl: input.video.embedUrl,
              streamUrl: input.video.embedUrl,
              width: input.video.width ?? 1280,
              height: input.video.height ?? 720,
            },
          ],
        }
      : {
          card: "summary_large_image",
          title: input.title,
          description,
          images,
        },
  };
}
