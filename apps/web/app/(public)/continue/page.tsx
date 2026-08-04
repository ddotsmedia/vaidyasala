import type { Metadata } from "next";
import Link from "next/link";
import { getContinueWatching } from "@/lib/progress";
import { ContinueWatchingRail } from "@/components/home/continue-rail";

export const metadata: Metadata = { title: "Continue watching", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Continue watching (§6.1/§6.3): the viewer's in-progress videos, resume-linked. */
export default async function ContinuePage() {
  const items = await getContinueWatching(24);

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">Continue watching</h1>
        <p className="text-text-dim text-sm">
          Videos you start will resume here. Nothing to resume yet.
        </p>
        <Link href="/latest" className="text-brand text-sm hover:underline">
          Browse the latest videos →
        </Link>
      </div>
    );
  }

  return (
    <div className="py-8">
      <ContinueWatchingRail title="Continue watching" />
    </div>
  );
}
