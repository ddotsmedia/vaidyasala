import Link from "next/link";
import { VideoCard, RelatedRail, type VideoCardData } from "@vaidyasala/ui";

const linkItem = (v: VideoCardData) => (
  <Link href={`/watch/${v.slug}`} className="block">
    <VideoCard video={v} size="md" />
  </Link>
);

/** Responsive grid of linked video cards. */
export function VideoGrid({ videos }: { videos: VideoCardData[] }) {
  if (videos.length === 0) {
    return <p className="text-text-dim text-sm">Nothing here yet.</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {videos.map((v) => (
        <Link key={v.slug} href={`/watch/${v.slug}`} className="block">
          <VideoCard video={v} size="lg" />
        </Link>
      ))}
    </div>
  );
}

/** Horizontal rail of linked video cards (§4 RelatedRail with watch links). */
export function LinkedRail({
  title,
  videos,
  emptyLabel,
}: {
  title: string;
  videos: VideoCardData[];
  emptyLabel?: string;
}) {
  return <RelatedRail title={title} videos={videos} renderItem={linkItem} emptyLabel={emptyLabel} />;
}
