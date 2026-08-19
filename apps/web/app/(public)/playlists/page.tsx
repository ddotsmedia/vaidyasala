import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { listPlaylists } from "@/lib/feeds";

export const metadata: Metadata = pageMetadata({
  title: "Playlists",
  description:
    "Curated sequences of Malayalam health videos, ordered so each one builds on the last.",
  path: "/playlists",
});
export const revalidate = 600;

export default async function PlaylistsPage() {
  const playlists = await listPlaylists();
  return (
    <div className="flex flex-col gap-6 py-8">
      <h1 className="text-2xl font-semibold">Playlists</h1>
      {playlists.length === 0 ? (
        <p className="text-text-dim text-sm">No playlists yet.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {playlists.map((p) => (
            <Link
              key={p.slug}
              href={`/playlists/${p.slug}`}
              className="border-border hover:bg-surface flex items-center justify-between rounded-lg border p-4"
            >
              <span className="font-ml font-medium" lang="ml">
                {p.titleMl}
              </span>
              <span className="text-text-dim text-xs">{p.count} videos</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
