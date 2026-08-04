import { RelatedRail } from "@vaidyasala/ui";
import { getRecommended } from "@/lib/feeds";
import { getContinueWatching } from "@/lib/progress";
import { LinkedRail } from "./video-grid";
import { ContinueWatchingRail } from "./continue-rail";

/**
 * Continue-watching island (§1.1/§6.3). Personalization streams in via Suspense;
 * renders nothing when the viewer has no in-progress videos (§11 static shell).
 */
export async function ContinueIsland() {
  const items = await getContinueWatching(1);
  if (items.length === 0) return null;
  return <ContinueWatchingRail />;
}

/** Recommended island (§1.1) — streamed personalization (quality-ranked for now). */
export async function RecommendedIsland() {
  const videos = await getRecommended(8);
  return <LinkedRail title="Recommended for you" videos={videos} />;
}

export function RailSkeleton() {
  return <RelatedRail.Skeleton count={4} />;
}
