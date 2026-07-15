import * as React from "react";
import { cn } from "../lib/cn";
import type { TopicRef } from "./types";

export interface TopicChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  topic: TopicRef;
  active?: boolean;
}

/** Hub navigation atom. Render inside a link at the call site. */
export function TopicChip({ topic, active = false, className, ...props }: TopicChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-2.5 py-1 text-xs font-medium transition-colors",
        active ? "bg-brand text-bg" : "bg-surface-2 text-text-dim hover:text-text",
        className,
      )}
      {...props}
    >
      <span lang="ml" className="font-ml">
        {topic.nameMl}
      </span>
    </span>
  );
}

TopicChip.Skeleton = function TopicChipSkeleton() {
  return <span className="inline-block h-6 w-16 animate-pulse rounded-sm bg-surface-2" aria-hidden />;
};
