import Link from "next/link";
import { VideoCard, RelatedRail, type VideoCardData } from "@vaidyasala/ui";

const linkItem = (v: VideoCardData) => (
  <Link href={`/watch/${v.slug}`} className="block">
    <VideoCard video={v} size="md" />
  </Link>
);

/**
 * Column count by breakpoint. Fixed steps rather than `auto-fit/minmax`,
 * because Malayalam titles set their own width: at a fluid minimum the last
 * row stretches and the two-line clamp lands mid-word. Capped at 5 on the
 * widest screens — a sixth column pushes card width below the point where a
 * typical title still fits two lines.
 */
const GRID_COLS = "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5";

/** Responsive grid of linked video cards. */
export function VideoGrid({ videos }: { videos: VideoCardData[] }) {
  if (videos.length === 0) {
    return <p className="text-text-dim text-sm">Nothing here yet.</p>;
  }
  return (
    <div className={`grid gap-4 ${GRID_COLS}`}>
      {videos.map((v) => (
        <Link key={v.slug} href={`/watch/${v.slug}`} className="block">
          <VideoCard video={v} size="lg" />
        </Link>
      ))}
    </div>
  );
}

/**
 * Loading twin for VideoGrid (§3D, LAW 4: no spinners). Same column classes as
 * the real grid, so the skeleton occupies the layout the content will — the
 * point of a twin is that nothing moves when it is replaced.
 */
VideoGrid.Skeleton = function VideoGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className={`grid gap-4 ${GRID_COLS}`} aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <VideoCard.Skeleton key={i} size="lg" />
      ))}
    </div>
  );
};

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
