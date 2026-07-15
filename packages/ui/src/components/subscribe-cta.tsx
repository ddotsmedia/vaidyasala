"use client";

import * as React from "react";
import { Youtube } from "lucide-react";
import { cn } from "../lib/cn";
import { Button } from "../primitives/button";

export type SubscribeVariant = "inline" | "banner" | "overlay" | "floating";

export interface SubscribeCTAProps {
  channelUrl: string;
  subscriberCount?: number;
  variant?: SubscribeVariant;
  onSubscribeClick?: () => void;
  className?: string;
}

function formatCount(n?: number): string | null {
  if (n == null) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/**
 * The single most important component (§4). One accent color (cta) used almost
 * exclusively here so it stays the most clickable thing on the page (§5.1).
 */
export function SubscribeCTA({
  channelUrl,
  subscriberCount,
  variant = "inline",
  onSubscribeClick,
  className,
}: SubscribeCTAProps) {
  const count = formatCount(subscriberCount);
  const wrap: Record<SubscribeVariant, string> = {
    inline: "inline-flex items-center gap-3",
    banner: "flex w-full items-center justify-between gap-4 rounded-lg bg-surface p-4",
    overlay: "flex flex-col items-center gap-3 rounded-lg bg-surface/95 p-6 text-center backdrop-blur",
    floating: "fixed bottom-4 right-4 z-40 flex items-center gap-3 rounded-full bg-surface p-2 pr-4 shadow-3",
  };
  return (
    <div className={cn(wrap[variant], className)}>
      {variant === "banner" && (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-text">Vaidyasala YouTube</span>
          {count && <span className="text-xs text-text-dim">{count} subscribers</span>}
        </div>
      )}
      <Button asChild variant="cta" size={variant === "floating" ? "md" : "lg"}>
        <a href={channelUrl} target="_blank" rel="noopener noreferrer" onClick={onSubscribeClick}>
          <Youtube className="size-4" />
          Subscribe
          {variant !== "banner" && count && <span className="opacity-80">· {count}</span>}
        </a>
      </Button>
    </div>
  );
}

SubscribeCTA.Skeleton = function SubscribeCTASkeleton() {
  return <div className="h-12 w-40 animate-pulse rounded-md bg-surface-2" aria-hidden />;
};
