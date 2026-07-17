import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Continue watching", robots: { index: false } };

/**
 * Continue watching (§1.1). Powered by WatchProgress in Phase 5 — until then this
 * is the empty state (anonymous device-local progress arrives with the beacon).
 */
export default function ContinuePage() {
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
