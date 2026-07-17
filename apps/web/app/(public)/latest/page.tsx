import type { Metadata } from "next";
import { getLatest } from "@/lib/feeds";
import { VideoGrid } from "@/components/home/video-grid";

export const metadata: Metadata = { title: "Latest" };
export const revalidate = 120;

export default async function LatestPage() {
  const videos = await getLatest(24);
  return (
    <div className="flex flex-col gap-6 py-8">
      <h1 className="text-2xl font-semibold">Latest videos</h1>
      <VideoGrid videos={videos} />
    </div>
  );
}
