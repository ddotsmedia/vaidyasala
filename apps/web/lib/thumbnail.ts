/**
 * Responsive `srcset` for YouTube thumbnails.
 *
 * `thumbnailUrl()` prefers `maxres` — 1280×720 — and VideoCard renders it in a
 * grid cell around 300px wide. Without a srcset every card in a 24-video grid
 * downloads a full-resolution still, which is roughly an order of magnitude
 * more bytes than the layout can use.
 *
 * Two rules keep this safe:
 *
 * 1. Only 16:9 renditions are offered. `hqdefault`/`sddefault`/`default` are
 *    4:3 with letterbox bars baked in; a srcset whose candidates differ in
 *    aspect ratio makes the browser swap between differently-framed images.
 * 2. Nothing is ever invented. `maxresdefault` only exists when the upload was
 *    at least 720p, and i.ytimg.com answers a missing one with a placeholder
 *    rather than a 404 — so we only ever narrow from the URL we were given,
 *    never widen to a size we have not been told exists. `mqdefault` is the one
 *    exception: YouTube generates it for every video.
 */

/** Pixel widths of the YouTube renditions that are genuinely 16:9. */
const WIDTHS_16_9: Record<string, number> = {
  mqdefault: 320,
  hq720: 1280,
  maxresdefault: 1280,
};

/** The rendition present for every video, used as the small candidate. */
const SMALLEST = { name: "mqdefault", width: 320 } as const;

const YT_THUMB = /^(https?:\/\/i\.ytimg\.com\/vi\/[^/]+\/)([a-z0-9_]+)\.jpg(\?.*)?$/i;

/**
 * Build a `srcset` for a YouTube thumbnail URL.
 *
 * @param url Thumbnail URL, typically from `thumbnailUrl()`.
 * @returns A srcset string, or undefined when the URL is not a recognised
 *   16:9 i.ytimg.com thumbnail — in which case the caller should render `src`
 *   alone rather than guess.
 */
export function thumbnailSrcSet(url: string): string | undefined {
  const m = YT_THUMB.exec(url);
  if (!m) return undefined;

  const [, base, name, query = ""] = m;
  const width = WIDTHS_16_9[name!.toLowerCase()];
  if (!width) return undefined;

  // Already the smallest we offer — a one-candidate srcset buys nothing.
  if (width <= SMALLEST.width) return undefined;

  return [
    `${base}${SMALLEST.name}.jpg${query} ${SMALLEST.width}w`,
    `${url} ${width}w`,
  ].join(", ");
}

/**
 * `sizes` for each VideoCard size, describing the width the card actually
 * occupies. Must track the column counts in VideoGrid — a `sizes` that
 * overstates the slot silently re-fetches the large candidate.
 */
export const CARD_SIZES = {
  sm: "176px", // w-44
  md: "288px", // w-72
  // lg fills a grid cell: 2 cols → 3 → 4 → 5 across the VideoGrid breakpoints.
  lg: "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1536px) 25vw, 20vw",
} as const;
