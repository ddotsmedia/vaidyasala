import Link from "next/link";
import { RelatedRail } from "@vaidyasala/ui";
import { getRecommended } from "@/lib/feeds";
import { LinkedRail } from "./video-grid";

/**
 * Continue-watching island (§1.1). Personalization streams in via Suspense —
 * WatchProgress lands in Phase 5, so signed-out shows the empty state.
 */
export async function ContinueIsland() {
  // Placeholder until WatchProgress (Phase 5): no device/user progress yet.
  const items: never[] = [];
  if (items.length === 0) {
    return (
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Continue watching</h2>
        <p className="text-text-dim text-sm">
          Start a video and it will resume here.{" "}
          <Link href="/latest" className="text-brand hover:underline">
            Browse latest →
          </Link>
        </p>
      </section>
    );
  }
  return null;
}

/** Recommended island (§1.1) — streamed personalization (quality-ranked for now). */
export async function RecommendedIsland() {
  const videos = await getRecommended(8);
  return <LinkedRail title="Recommended for you" videos={videos} />;
}

export function RailSkeleton() {
  return <RelatedRail.Skeleton count={4} />;
}
