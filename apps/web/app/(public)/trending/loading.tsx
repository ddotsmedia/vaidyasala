import { VideoGrid } from "@/components/home/video-grid";

/** Loading twin for /trending — same heading and grid shape as the page (§3D). */
export default function TrendingLoading() {
  return (
    <div className="flex flex-col gap-6 py-8">
      <h1 className="text-2xl font-semibold">Trending this week</h1>
      <VideoGrid.Skeleton count={24} />
    </div>
  );
}
