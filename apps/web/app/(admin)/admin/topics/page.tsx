import type { Metadata } from "next";
import { Badge, Button } from "@vaidyasala/ui";
import { prisma } from "@vaidyasala/db";
import { createTopic } from "./actions";
import { DeleteTopicButton } from "@/components/admin/topic-actions";

export const metadata: Metadata = { title: "Topics" };
export const dynamic = "force-dynamic";

/** /admin/topics — topic hub CRUD (§4 Tier 3). */
export default async function TopicsPage() {
  const topics = await prisma.topic.findMany({
    orderBy: { nameEn: "asc" },
    include: { _count: { select: { videos: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Topics</h1>

      <form action={createTopic} className="border-border flex flex-wrap items-end gap-3 rounded-lg border p-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-text-dim text-xs">Malayalam name</span>
          <input name="nameMl" required className="border-border bg-surface rounded-md border px-3 py-1.5" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-text-dim text-xs">English name</span>
          <input name="nameEn" required className="border-border bg-surface rounded-md border px-3 py-1.5" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-text-dim text-xs">Kind</span>
          <select name="kind" className="border-border bg-surface rounded-md border px-3 py-1.5">
            {["CONDITION", "TREATMENT", "LIFESTYLE", "HERB", "GENERAL"].map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" variant="brand" size="sm">
          Add topic
        </Button>
      </form>

      <ul className="flex flex-col gap-2">
        {topics.map((t) => (
          <li
            key={t.id}
            className="border-border flex items-center justify-between rounded-md border px-3 py-2 text-sm"
          >
            <span className="flex items-center gap-2">
              <span className="font-ml" lang="ml">
                {t.nameMl}
              </span>
              <span className="text-text-dim">({t.nameEn})</span>
              <Badge variant="outline">{t.kind}</Badge>
              <Badge>{t._count.videos} videos</Badge>
            </span>
            <DeleteTopicButton id={t.id} disabled={t._count.videos > 0} />
          </li>
        ))}
      </ul>
    </div>
  );
}
