import type { Metadata } from "next";
import { Badge } from "@vaidyasala/ui";
import { prisma } from "@vaidyasala/db";
import { CommentActions } from "@/components/admin/comment-actions";

export const metadata: Metadata = { title: "Comments" };
export const dynamic = "force-dynamic";

/** /admin/comments (§13) — moderation queue. Pending first, then recent decisions. */
export default async function CommentsPage() {
  const pending = await prisma.comment.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    take: 100,
  });
  const videoIds = [...new Set(pending.map((c) => c.videoId))];
  const userIds = [...new Set(pending.map((c) => c.userId))];
  const [videos, users] = await Promise.all([
    prisma.video.findMany({ where: { id: { in: videoIds } }, select: { id: true, slug: true, titleMl: true } }),
    prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } }),
  ]);
  const vmap = new Map(videos.map((v) => [v.id, v]));
  const umap = new Map(users.map((u) => [u.id, u.name]));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">Comments</h1>
        <Badge variant={pending.length ? "cta" : "default"}>{pending.length} pending</Badge>
      </div>

      {pending.length === 0 ? (
        <p className="text-text-dim text-sm">Nothing awaiting moderation. 🎉</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {pending.map((c) => (
            <li key={c.id} className="border-border flex flex-col gap-2 rounded-md border p-4">
              <div className="text-text-dim flex items-center justify-between text-xs">
                <span>{umap.get(c.userId) ?? "Anonymous"}</span>
                <span className="font-ml" lang="ml">
                  {vmap.get(c.videoId)?.titleMl ?? c.videoId}
                </span>
              </div>
              <p lang="ml" className="font-ml text-sm leading-[1.7]">
                {c.body}
              </p>
              <CommentActions id={c.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
