/** Shared view-model shapes for Tier-2 components (UI-only; no data wiring). */

export interface TopicRef {
  slug: string;
  nameMl: string;
  nameEn?: string;
}

export interface VideoCardData {
  slug: string;
  titleMl: string;
  titleEn?: string;
  thumbnailUrl: string;
  /**
   * Optional responsive candidates for `thumbnailUrl`. Supplied by the app
   * (this package does no data wiring); absent means render `src` alone.
   */
  thumbnailSrcSet?: string;
  blurDataUrl?: string;
  durationSec: number;
  topic?: TopicRef;
  /** 0–1 watched fraction; renders a progress bar when > 0. */
  progress?: number;
}

export type VideoCardSize = "sm" | "md" | "lg";

export interface SearchGroupItem {
  id: string;
  label: string;
  href: string;
  sublabel?: string;
}

export interface SearchGroup {
  heading: string;
  items: SearchGroupItem[];
}

export function formatDuration(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return h > 0
    ? `${h}:${mm}:${String(sec).padStart(2, "0")}`
    : `${mm}:${String(sec).padStart(2, "0")}`;
}
