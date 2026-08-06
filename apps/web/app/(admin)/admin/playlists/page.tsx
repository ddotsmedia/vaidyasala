import type { Metadata } from "next";
import { Badge, Button } from "@vaidyasala/ui";
import { prisma } from "@vaidyasala/db";
import { createPlaylist } from "./actions";
import { DeletePlaylistButton } from "@/components/admin/playlist-actions";

export const metadata: Metadata = { title: "Playlists" };
export const dynamic = "force-dynamic";

/** /admin/playlists — playlist CRUD (§4 Tier 3). */
export default async function PlaylistsPage() {
  const playlists = await prisma.playlist.findMany({
    orderBy: { titleMl: "asc" },
    include: { _count: { select: { items: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Playlists</h1>

      <form action={createPlaylist} className="border-border flex items-end gap-3 rounded-lg border p-4">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="text-text-dim text-xs">Title (Malayalam)</span>
          <input name="titleMl" required className="border-border bg-surface rounded-md border px-3 py-1.5" />
        </label>
        <Button type="submit" variant="brand" size="sm">
          Add playlist
        </Button>
      </form>

      <ul className="flex flex-col gap-2">
        {playlists.map((p) => (
          <li
            key={p.id}
            className="border-border flex items-center justify-between rounded-md border px-3 py-2 text-sm"
          >
            <span className="flex items-center gap-2">
              <span className="font-ml" lang="ml">
                {p.titleMl}
              </span>
              <Badge>{p._count.items} videos</Badge>
            </span>
            <DeletePlaylistButton id={p.id} />
          </li>
        ))}
      </ul>
    </div>
  );
}
