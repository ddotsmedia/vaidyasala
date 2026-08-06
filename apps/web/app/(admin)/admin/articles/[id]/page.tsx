import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@vaidyasala/db";
import { saveArticle } from "../actions";
import { ArticleSaveButton } from "@/components/admin/article-editor";

export const metadata: Metadata = { title: "Edit article" };
export const dynamic = "force-dynamic";

/** /admin/articles/[id] — MDX editor + status (§4 Tier 3). */
export default async function EditArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const article = await prisma.article.findUnique({ where: { id } });
  if (!article) notFound();

  const save = saveArticle.bind(null, id);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Edit article</h1>
      <form action={save} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-text-dim text-xs">Title (Malayalam)</span>
          <input
            name="titleMl"
            defaultValue={article.titleMl}
            className="border-border bg-surface font-ml rounded-md border px-3 py-2"
            lang="ml"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-text-dim text-xs">Body (MDX)</span>
          <textarea
            name="bodyMl"
            defaultValue={article.bodyMl}
            rows={20}
            className="border-border bg-surface font-ml rounded-md border px-3 py-2 text-sm leading-[1.8]"
            lang="ml"
          />
        </label>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-text-dim text-xs">Status</span>
            <select
              name="status"
              defaultValue={article.status}
              className="border-border bg-surface rounded-md border px-3 py-1.5"
            >
              {["DRAFT", "PUBLISHED", "HIDDEN"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <ArticleSaveButton />
        </div>
      </form>
    </div>
  );
}
