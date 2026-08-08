import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPlaylistBySlug, playlistSlugs } from "@/lib/feeds";
import { safeStaticParams } from "@/lib/static-params";
import { VideoGrid } from "@/components/home/video-grid";

export const revalidate = 600;
export const dynamicParams = true;

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  return safeStaticParams(
    async () => (await playlistSlugs()).map((slug) => ({ slug })),
    "playlists",
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const playlist = await getPlaylistBySlug(slug);
  if (!playlist) return { title: "Not found" };
  return { title: playlist.titleMl, alternates: { canonical: `/playlists/${playlist.slug}` } };
}

export default async function PlaylistPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const playlist = await getPlaylistBySlug(slug);
  if (!playlist) notFound();

  return (
    <div className="flex flex-col gap-6 py-8">
      <h1 className="font-ml text-2xl font-semibold" lang="ml">
        {playlist.titleMl}
      </h1>
      <VideoGrid videos={playlist.videos} />
    </div>
  );
}
