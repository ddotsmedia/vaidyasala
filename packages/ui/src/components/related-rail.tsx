import * as React from "react";
import { cn } from "../lib/cn";
import { VideoCard } from "./video-card";
import type { VideoCardData } from "./types";

export interface RelatedRailProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  videos: VideoCardData[];
  renderItem?: (video: VideoCardData) => React.ReactNode;
  emptyLabel?: string;
}

/** Netflix-style horizontal rail (§4). Handles empty + loading (Skeleton). */
export function RelatedRail({
  title,
  videos,
  renderItem,
  emptyLabel = "Nothing here yet.",
  className,
  ...props
}: RelatedRailProps) {
  return (
    <section className={cn("flex flex-col gap-3", className)} {...props}>
      <h2 className="text-lg font-semibold text-text">{title}</h2>
      {videos.length === 0 ? (
        <p className="text-sm text-text-dim">{emptyLabel}</p>
      ) : (
        <div className="flex snap-x gap-4 overflow-x-auto pb-2">
          {videos.map((v) => (
            <div key={v.slug} className="snap-start shrink-0">
              {renderItem ? renderItem(v) : <VideoCard video={v} size="md" />}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

RelatedRail.Skeleton = function RelatedRailSkeleton({ count = 4 }: { count?: number }) {
  return (
    <section className="flex flex-col gap-3" aria-hidden>
      <div className="h-6 w-40 animate-pulse rounded bg-surface-2" />
      <div className="flex gap-4 overflow-hidden pb-2">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="shrink-0">
            <VideoCard.Skeleton size="md" />
          </div>
        ))}
      </div>
    </section>
  );
};
