import type { Metadata } from "next";
import Link from "next/link";
import { getWatchlist } from "@/lib/watchlist";
import { VideoGrid } from "@/components/home/video-grid";

// Private to one viewer, so it must never be indexed or cached at the edge.
export const metadata: Metadata = { title: "Saved videos", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Saved videos (§6.1) — the read side of the bookmark in ReactionBar. */
export default async function WatchlistPage() {
  const videos = await getWatchlist();

  if (videos.length === 0) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">Saved videos</h1>
        <p className="text-text-dim text-sm">
          Tap Save on any video and it will wait for you here. Saving works without an
          account — your list lives on this device until you sign in.
        </p>
        <Link href="/latest" className="text-brand text-sm hover:underline">
          Browse the latest videos →
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 py-8">
      <h1 className="text-2xl font-semibold">Saved videos</h1>
      <VideoGrid videos={videos} />
    </div>
  );
}
