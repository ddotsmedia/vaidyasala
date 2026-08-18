import { VideoGrid } from "@/components/home/video-grid";

/**
 * Loading twin for /watchlist. This route is force-dynamic, so unlike the ISR
 * grids it really does hit the database on every visit — the skeleton is the
 * normal first paint here, not an edge case.
 */
export default function WatchlistLoading() {
  return (
    <div className="flex flex-col gap-6 py-8">
      <h1 className="text-2xl font-semibold">Saved videos</h1>
      <VideoGrid.Skeleton count={12} />
    </div>
  );
}
