"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { VideoCard } from "@vaidyasala/ui";

interface ContinueItem {
  slug: string;
  titleMl: string;
  titleEn: string | null;
  thumbnailUrl: string;
  durationSec: number;
  positionSec: number;
  progress: number;
}

/**
 * Continue-watching rail, fetched after hydration.
 *
 * Client-side on purpose: this is the only personalized thing on the home page,
 * and reading the viewer cookie during render would make the whole route
 * dynamic — losing ISR and the CDN cache that the mobile load budget depends on.
 * The static shell ships instantly; this fills in a moment later.
 *
 * Renders nothing until there is something to show, so it never reserves space
 * for a rail most visitors will not have.
 */
export function ContinueWatchingClient() {
  const [items, setItems] = useState<ContinueItem[] | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/v1/continue")
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d: { items?: ContinueItem[] }) => {
        if (alive) setItems(d.items ?? []);
      })
      .catch(() => alive && setItems([]));
    return () => {
      alive = false;
    };
  }, []);

  if (!items || items.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Continue watching</h2>
        <Link href="/continue" className="text-brand text-sm hover:underline">
          View all →
        </Link>
      </div>
      <div className="flex snap-x gap-4 overflow-x-auto pb-2">
        {items.map((it) => (
          <Link
            key={it.slug}
            href={`/watch/${it.slug}?t=${it.positionSec}` as Route}
            className="block w-40 shrink-0 snap-start sm:w-56 lg:w-64"
          >
            <VideoCard
              video={{
                slug: it.slug,
                titleMl: it.titleMl,
                titleEn: it.titleEn ?? undefined,
                thumbnailUrl: it.thumbnailUrl,
                durationSec: it.durationSec,
                progress: it.progress,
              }}
              size="md"
            />
          </Link>
        ))}
      </div>
    </section>
  );
}
