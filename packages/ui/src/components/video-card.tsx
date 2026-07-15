import * as React from "react";
import { cn } from "../lib/cn";
import { Badge } from "../primitives/badge";
import { TopicChip } from "./topic-chip";
import { formatDuration, type VideoCardData, type VideoCardSize } from "./types";

export interface VideoCardProps extends React.HTMLAttributes<HTMLDivElement> {
  video: VideoCardData;
  size?: VideoCardSize;
}

const sizeMap: Record<VideoCardSize, string> = {
  sm: "w-44",
  md: "w-72",
  lg: "w-full",
};

/**
 * The workhorse card (§4). Thumbnail with blur-up, duration badge, optional
 * progress bar, topic chip. UI-only — wrap in a link at the call site.
 */
export function VideoCard({ video, size = "md", className, ...props }: VideoCardProps) {
  const progressPct = video.progress ? Math.round(Math.min(1, Math.max(0, video.progress)) * 100) : 0;
  return (
    <div className={cn("group flex flex-col gap-2", sizeMap[size], className)} {...props}>
      <div className="relative aspect-video overflow-hidden rounded-md bg-surface-2">
        {/* UI package is framework-agnostic; apps compose with next/image where needed. */}
        <img
          src={video.thumbnailUrl}
          alt={video.titleEn ?? video.titleMl}
          loading="lazy"
          className="size-full object-cover transition-transform duration-[var(--dur-base)] group-hover:scale-105"
          style={video.blurDataUrl ? { backgroundImage: `url(${video.blurDataUrl})`, backgroundSize: "cover" } : undefined}
        />
        <Badge variant="default" className="absolute bottom-1.5 right-1.5 bg-black/75 text-white">
          {formatDuration(video.durationSec)}
        </Badge>
        {progressPct > 0 && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-black/40">
            <div className="h-full bg-cta" style={{ width: `${progressPct}%` }} />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <h3
          lang="ml"
          className="font-ml line-clamp-2 text-sm font-medium leading-[var(--leading-ml)] text-text"
        >
          {video.titleMl}
        </h3>
        {video.topic && <TopicChip topic={video.topic} />}
      </div>
    </div>
  );
}

VideoCard.Skeleton = function VideoCardSkeleton({ size = "md" }: { size?: VideoCardSize }) {
  return (
    <div className={cn("flex flex-col gap-2", sizeMap[size])} aria-hidden>
      <div className="aspect-video animate-pulse rounded-md bg-surface-2" />
      <div className="h-4 w-11/12 animate-pulse rounded bg-surface-2" />
      <div className="h-4 w-2/3 animate-pulse rounded bg-surface-2" />
    </div>
  );
};
