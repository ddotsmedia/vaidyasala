import "server-only";
import type { Metadata } from "next";
import { SITE, absoluteUrl } from "./site";

/**
 * Google renders roughly 155–160 characters of a description before eliding it.
 * Anything past that is invisible, so the useful work is fitting the sentence,
 * not filling the field.
 */
const DESCRIPTION_MAX = 160;

/**
 * Trim a description to `DESCRIPTION_MAX` on a word boundary.
 *
 * A plain slice cuts mid-word — "Ayurvedic treatment for diges" — which reads
 * as broken in the SERP snippet. Falls back to a hard cut only when the text
 * has no space to break on inside the limit, which Malayalam compounds can do.
 */
export function clampDescription(text: string, max = DESCRIPTION_MAX): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;

  // Reserve one character for the ellipsis so the result never exceeds `max`.
  const room = max - 1;
  const cut = clean.slice(0, room);
  const lastSpace = cut.lastIndexOf(" ");
  const body = lastSpace > 0 ? cut.slice(0, lastSpace) : cut;
  return `${body.replace(/[\s,;:.–—-]+$/, "")}…`;
}

/**
 * Branded OG card rendered by /api/og (§7.1).
 *
 * ⚠ This route returns `image/svg+xml`, and no major crawler renders an SVG
 * `og:image` — Facebook, X, LinkedIn and WhatsApp all accept only JPEG, PNG,
 * GIF or WebP. Pointing `og:image` here produces a preview with no image at
 * all. Use `videoOgImage()` for anything a person can share; this stays for
 * in-product use and for the PNG pipeline noted in §7.1.
 */
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
  const raw = input.description?.trim();
  const description = clampDescription(raw && raw.length > 0 ? raw : SITE.description);
  // OG images need alt text of their own — the page's alt attributes do not
  // travel with the card into a social feed or a WhatsApp preview.
  const images = input.ogImage
    ? [{ url: input.ogImage, width: 1200, height: 630, alt: input.title }]
    : undefined;
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
