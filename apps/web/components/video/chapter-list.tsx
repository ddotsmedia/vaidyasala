"use client";
import { formatDuration } from "@vaidyasala/ui";
import { FUNNEL_EVENTS, emitEvent } from "@/lib/analytics/events";
import { usePlayer } from "./player-context";
import type { WatchChapter } from "@/lib/video";

/** ChapterList (§4): click seeks the player; the active chapter syncs to playhead. */
export function ChapterList({
  chapters,
  videoId,
}: {
  chapters: WatchChapter[];
  videoId: string;
}) {
  const { currentTime, seekTo } = usePlayer();
  if (chapters.length === 0) return null;

  const activeIndex = chapters.reduce(
    (acc, c, i) => (currentTime >= c.startSec ? i : acc),
    0,
  );

  return (
    <section className="flex flex-col gap-2" aria-label="Chapters">
      <h2 className="text-lg font-semibold">Chapters</h2>
      <ol className="flex flex-col gap-1">
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
