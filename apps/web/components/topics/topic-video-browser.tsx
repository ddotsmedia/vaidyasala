"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { VideoCard } from "@vaidyasala/ui";
import { CARD_SIZES } from "@/lib/thumbnail";
import type { TopicVideoItem } from "@/lib/feeds";
import {
  browse,
  DURATIONS,
  DURATION_LABEL,
  SORTS,
  SORT_LABEL,
  type DurationFilter,
  type Sort,
} from "@/lib/topic-browse";

/**
 * Sort / duration filter / pagination for a topic's videos.
 *
 * The whole list is handed down from the server render, so switching sort or
 * page is instant with no network round trip — that is the "fast category
 * switching" requirement, and it also keeps the topic page statically rendered
 * (reading searchParams on the server would opt the route out of ISR).
 *
 * The API route exists for programmatic callers. If a topic ever grows past a
 * few hundred videos, this should switch to fetching pages from it instead of
 * receiving the full list.
 */
export function TopicVideoBrowser({ videos }: { videos: TopicVideoItem[] }) {
  const [sort, setSort] = useState<Sort>("latest");
  const [duration, setDuration] = useState<DurationFilter>("all");
  const [page, setPage] = useState(1);

  const result = useMemo(
    () => browse(videos, { sort, duration, page }),
    [videos, sort, duration, page],
  );

  if (videos.length === 0) {
    return <p className="text-text-dim text-sm">No videos in this topic yet.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-text-dim">Sort</span>
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as Sort);
              setPage(1);
            }}
            className="border-border bg-surface focus-visible:outline-focus min-h-11 rounded-md border px-3 focus-visible:outline-2"
          >
            {SORTS.map((s) => (
              <option key={s} value={s}>
                {SORT_LABEL[s]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm">
          <span className="text-text-dim">Length</span>
          <select
            value={duration}
            onChange={(e) => {
              setDuration(e.target.value as DurationFilter);
              setPage(1);
            }}
            className="border-border bg-surface focus-visible:outline-focus min-h-11 rounded-md border px-3 focus-visible:outline-2"
          >
            {DURATIONS.map((d) => (
              <option key={d} value={d}>
                {DURATION_LABEL[d]}
              </option>
            ))}
          </select>
        </label>

        <span aria-live="polite" className="text-text-dim ml-auto text-sm tabular-nums">
          {result.total} {result.total === 1 ? "video" : "videos"}
        </span>
      </div>

      {result.total === 0 ? (
        <p className="text-text-dim text-sm">
          No videos match that length. Try “{DURATION_LABEL.all}”.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {result.items.map((v) => (
            <li key={v.slug}>
              <Link href={`/watch/${v.slug}`} className="block">
                <VideoCard video={v} size="lg" imageSizes={CARD_SIZES.lg} />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {result.pageCount > 1 ? (
        <nav aria-label="Pagination" className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={result.page <= 1}
            className="border-border focus-visible:outline-focus min-h-11 rounded-md border px-4 text-sm focus-visible:outline-2 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-text-dim text-sm tabular-nums">
            Page {result.page} of {result.pageCount}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(result.pageCount, p + 1))}
            disabled={result.page >= result.pageCount}
            className="border-border focus-visible:outline-focus min-h-11 rounded-md border px-4 text-sm focus-visible:outline-2 disabled:opacity-40"
          >
            Next
          </button>
        </nav>
      ) : null}
    </div>
  );
}
