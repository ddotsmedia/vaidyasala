import { VideoGrid } from "@/components/home/video-grid";

/**
 * Shown while the RSC payload for /latest streams in on client navigation.
 * Mirrors the page's own heading and grid so the swap to real content moves
 * nothing (§3D — the app shows twins, never spinners).
 */
export default function LatestLoading() {
  return (
    <div className="flex flex-col gap-6 py-8">
      <h1 className="text-2xl font-semibold">Latest videos</h1>
      <VideoGrid.Skeleton count={24} />
    </div>
  );
}
