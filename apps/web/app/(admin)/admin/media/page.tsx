import type { Metadata } from "next";
import { prisma } from "@vaidyasala/db";
import { thumbnailUrl } from "@/lib/video";

export const metadata: Metadata = { title: "Media" };
export const dynamic = "force-dynamic";

/**
 * /admin/media — media browser (§4 Tier 3). Lists the thumbnails referenced by
 * content (mirrored to R2 on ingest). Raw R2 object browsing needs bucket creds
 * (BLOCKED in dev); this content-referenced view is always available.
 */
export default async function MediaPage() {
  const videos = await prisma.video.findMany({
    orderBy: { updatedAt: "desc" },
    select: { id: true, slug: true, titleMl: true, youtubeId: true, thumbnails: true },
    take: 60,
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Media</h1>
      <p className="text-text-dim text-sm">
        Thumbnails mirrored from ingest. {videos.length} items.
      </p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {videos.map((v) => (
          <figure key={v.id} className="flex flex-col gap-1">
            {/* Admin-only grid; next/image optimization is unnecessary here. */}
            <img
              src={thumbnailUrl(v.youtubeId, v.thumbnails)}
              alt=""
              loading="lazy"
              className="aspect-video w-full rounded-md object-cover"
            />
            <figcaption className="font-ml text-text-dim truncate text-xs" lang="ml">
              {v.titleMl}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
