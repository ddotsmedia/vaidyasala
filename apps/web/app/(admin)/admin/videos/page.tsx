import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@vaidyasala/ui";
import { type VideoStatus } from "@vaidyasala/db";
import { getVideos } from "@/lib/admin/data";

export const metadata: Metadata = { title: "Videos" };
export const dynamic = "force-dynamic";

const STATUSES: (VideoStatus | "ALL")[] = [
  "ALL",
  "INGESTING",
  "PROCESSING",
  "DRAFT",
  "PUBLISHED",
  "HIDDEN",
];

export default async function VideosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const active = STATUSES.includes(status as VideoStatus) ? (status as VideoStatus) : undefined;
  const videos = await getVideos(active);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Videos</h1>

      <nav className="flex flex-wrap gap-2 text-sm">
        {STATUSES.map((s) => {
          const isActive = s === "ALL" ? !active : active === s;
          const href = s === "ALL" ? "/admin/videos" : `/admin/videos?status=${s}`;
          return (
            <Link
              key={s}
              href={href}
              className={`rounded-md border px-3 py-1 ${
                isActive ? "border-brand text-brand" : "border-border text-text-dim"
              }`}
            >
              {s}
            </Link>
          );
        })}
      </nav>

      {videos.length === 0 ? (
        <p className="text-text-dim text-sm">No videos for this filter.</p>
      ) : (
        <div className="border-border overflow-x-auto rounded-lg border">
          <table className="w-full text-left text-sm">
            <thead className="border-border bg-surface border-b">
              <tr>
                <th className="p-3">Title</th>
                <th className="p-3">Topic</th>
                <th className="p-3">Status</th>
                <th className="p-3">Quality</th>
                <th className="p-3">Updated</th>
              </tr>
            </thead>
            <tbody>
              {videos.map((v) => (
                <tr key={v.id} className="border-border border-b last:border-0">
                  <td className="p-3">
                    <Link href={`/admin/videos/${v.id}`} className="text-brand hover:underline">
                      {v.titleMl}
                    </Link>
                  </td>
                  <td className="text-text-dim p-3">{v.primaryTopic?.nameMl ?? "—"}</td>
                  <td className="p-3">
                    <Badge variant="outline">{v.status}</Badge>
                  </td>
                  <td className="text-text-dim p-3">
                    {v.qualityScore !== null ? v.qualityScore.toFixed(2) : "—"}
                  </td>
                  <td className="text-text-dim p-3">
                    {v.updatedAt.toISOString().slice(0, 10)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
