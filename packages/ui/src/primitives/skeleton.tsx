import * as React from "react";
import { cn } from "../lib/cn";

/** Base shimmer block. The app never shows a spinner (§6) — compose these. */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-md bg-surface-2", className)}
      {...props}
    />
  );
}
