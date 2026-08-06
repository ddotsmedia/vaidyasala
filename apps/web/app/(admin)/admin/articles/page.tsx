import type { Metadata, Route } from "next";
import Link from "next/link";
import { Badge } from "@vaidyasala/ui";
import { prisma } from "@vaidyasala/db";

export const metadata: Metadata = { title: "Articles" };
export const dynamic = "force-dynamic";

/** /admin/articles — SEO satellite articles list (§4 Tier 3). */
export default async function ArticlesPage() {
  const articles = await prisma.article.findMany({
    orderBy: { updatedAt: "desc" },
    select: { id: true, slug: true, titleMl: true, status: true, readingMin: true, updatedAt: true },
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Articles</h1>
      {articles.length === 0 ? (
        <p className="text-text-dim text-sm">No articles yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {articles.map((a) => (
            <li key={a.id}>
              <Link
                href={`/admin/articles/${a.id}` as Route}
                className="border-border hover:bg-surface flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <span className="font-ml truncate" lang="ml">
                  {a.titleMl}
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-text-dim text-xs">{a.readingMin} min</span>
                  <Badge variant={a.status === "PUBLISHED" ? "brand" : "outline"}>{a.status}</Badge>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
