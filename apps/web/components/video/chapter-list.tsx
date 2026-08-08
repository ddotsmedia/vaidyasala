"use client";
import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { formatDuration } from "@vaidyasala/ui";
import { FUNNEL_EVENTS, emitEvent } from "@/lib/analytics/events";
import { usePlayer } from "./player-context";
import type { WatchChapter } from "@/lib/video";

/**
 * ChapterList (§4): click seeks the player; the active chapter syncs to playhead.
 *
 * `collapsible` is for the mobile copy that sits inline in the content column —
 * the heading becomes a toggle and the list starts closed. The desktop sidebar
 * copy passes nothing and is always open.
 */
export function ChapterList({
  chapters,
  videoId,
  collapsible = false,
}: {
  chapters: WatchChapter[];
  videoId: string;
  collapsible?: boolean;
}) {
  const { currentTime, seekTo } = usePlayer();
  const [open, setOpen] = useState(false);
  const bodyId = useId();
  if (chapters.length === 0) return null;

  const activeIndex = chapters.reduce(
    (acc, c, i) => (currentTime >= c.startSec ? i : acc),
    0,
  );
  const shown = !collapsible || open;

  return (
    <section className="flex flex-col gap-2" aria-label="Chapters">
      <h2 className="text-lg font-semibold">
        {collapsible ? (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls={bodyId}
            className="focus-visible:outline-focus flex min-h-11 w-full items-center justify-between gap-2 focus-visible:outline-2"
          >
            Chapters
            <ChevronDown
              className={`text-text-dim size-5 transition-transform ${open ? "rotate-180" : ""}`}
              aria-hidden
            />
          </button>
        ) : (
          "Chapters"
        )}
      </h2>
      <ol id={bodyId} className={`${shown ? "flex" : "hidden"} flex-col gap-1`}>
        {chapters.map((c, i) => (
          <li key={c.startSec}>
            <button
              type="button"
              onClick={() => {
                seekTo(c.startSec);
                emitEvent(FUNNEL_EVENTS.chapterSeek, videoId, { startSec: c.startSec });
              }}
              aria-current={i === activeIndex}
              className={`flex w-full items-baseline gap-3 rounded-md px-3 py-2 text-left transition-colors ${
                i === activeIndex ? "bg-surface-2 text-text" : "text-text-dim hover:bg-surface"
              }`}
            >
              <span className="tabular-nums text-brand text-sm">{formatDuration(c.startSec)}</span>
              <span className="font-ml leading-[1.7]" lang="ml">
                {c.titleMl}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
