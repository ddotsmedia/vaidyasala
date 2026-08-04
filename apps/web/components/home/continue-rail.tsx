import Link from "next/link";
import type { Route } from "next";
import { VideoCard } from "@vaidyasala/ui";
import { getContinueWatching } from "@/lib/progress";

/**
 * Continue-watching rail (§6.1/§6.3). Resume links carry the saved position
 * (?t=), and each card shows a progress bar. Renders nothing when there is no
 * device/user history — the caller decides the empty state.
 */
export async function ContinueWatchingRail({ title = "Continue watching" }: { title?: string }) {
  const items = await getContinueWatching(12);
  if (items.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        <Link href="/continue" className="text-brand text-sm hover:underline">
          View all →
        </Link>
      </div>
      <div className="flex snap-x gap-4 overflow-x-auto pb-2">
        {items.map((it) => (
          <Link
            key={it.slug}
            href={`/watch/${it.slug}?t=${it.positionSec}` as Route}
            className="block shrink-0 snap-start"
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
