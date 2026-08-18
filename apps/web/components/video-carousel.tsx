"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { VideoCard, type VideoCardData } from "@vaidyasala/ui";
import { CARD_SIZES } from "@/lib/thumbnail";
import type { Route } from "next";

export interface VideoCarouselProps {
  title: string;
  videos: VideoCardData[];
  /** Optional "View all →" destination shown next to the title. */
  viewAllHref?: Route;
  viewAllLabel?: string;
  emptyLabel?: string;
  /** Malayalam subtitle under the title (topic rails use this). */
  subtitleMl?: string;
}

/**
 * Reusable horizontal carousel.
 *
 * Scrolling is native overflow with CSS scroll-snap — that gives momentum,
 * accessibility and RTL for free, and costs no JS on mobile where it is the only
 * interaction. The arrow buttons are a desktop affordance layered on top: they
 * are `hidden` under md and only appear when there is actually somewhere to
 * scroll, so they never sit there greyed out and confusing.
 */
export function VideoCarousel({
  title,
  videos,
  viewAllHref,
  viewAllLabel = "View all",
  emptyLabel = "Nothing here yet.",
  subtitleMl,
}: VideoCarouselProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const sync = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    // 1px slack: sub-pixel widths mean scrollLeft rarely hits the exact end.
    setCanLeft(el.scrollLeft > 1);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    sync();
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [sync, videos.length]);

  const nudge = (dir: 1 | -1): void => {
    const el = scroller.current;
    if (!el) return;
    // Move by ~85% of the viewport so the edge card stays partly visible and the
    // reader keeps their place.
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex min-w-0 items-baseline gap-2">
          <h2 className="text-lg font-semibold">{title}</h2>
          {subtitleMl ? (
            <span className="font-ml text-text-dim truncate text-sm leading-[1.7]" lang="ml">
              {subtitleMl}
            </span>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {viewAllHref ? (
            <Link href={viewAllHref} className="text-brand text-sm hover:underline">
              {viewAllLabel} →
            </Link>
          ) : null}
          {canLeft || canRight ? (
            <div className="ml-2 hidden items-center gap-1 md:flex">
              <ArrowButton dir="left" disabled={!canLeft} onClick={() => nudge(-1)} />
              <ArrowButton dir="right" disabled={!canRight} onClick={() => nudge(1)} />
            </div>
          ) : null}
        </div>
      </div>

      {videos.length === 0 ? (
        <p className="text-text-dim text-sm">{emptyLabel}</p>
      ) : (
        <div
          ref={scroller}
          onScroll={sync}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2"
        >
          {videos.map((v) => (
            <div key={v.slug} className="w-40 shrink-0 snap-start sm:w-56 lg:w-64">
              <Link href={`/watch/${v.slug}`} className="block">
                <VideoCard video={v} size="md" imageSizes={CARD_SIZES.md} />
              </Link>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ArrowButton({
  dir,
  disabled,
  onClick,
}: {
  dir: "left" | "right";
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = dir === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === "left" ? "Scroll left" : "Scroll right"}
      className="border-border bg-surface focus-visible:outline-focus grid size-9 place-items-center rounded-full border transition-opacity focus-visible:outline-2 disabled:opacity-30"
    >
      <Icon className="size-4" aria-hidden />
    </button>
  );
}
