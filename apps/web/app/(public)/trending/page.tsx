import type { Metadata } from "next";
import { getTrending } from "@/lib/feeds";
import { VideoGrid } from "@/components/home/video-grid";

export const metadata: Metadata = { title: "Trending" };
export const revalidate = 120;

/** Engagement-ranked over the last 7 days (§1.1). */
export default async function TrendingPage() {
  const videos = await getTrending(24, 7);
  return (
    <div className="flex flex-col gap-6 py-8">
      <h1 className="text-2xl font-semibold">Trending this week</h1>
      <VideoGrid videos={videos} />
    </div>
  );
}
