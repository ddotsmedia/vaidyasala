"use server";
import { revalidatePath } from "next/cache";
import { updateTag } from "next/cache";
import { prisma, type ArticleStatus } from "@vaidyasala/db";
import { authorize } from "@/lib/authz";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

const STATUSES: ArticleStatus[] = ["DRAFT", "PUBLISHED", "HIDDEN"];

/** Save an article's MDX body + status (§4 Tier 3 MDX editor). */
export async function saveArticle(id: string, form: FormData): Promise<void> {
  const authz = await authorize("EDITOR");
  if (!authz.ok) return;
  const titleMl = String(form.get("titleMl") ?? "").trim();
  const bodyMl = String(form.get("bodyMl") ?? "");
  const status = String(form.get("status") ?? "DRAFT") as ArticleStatus;
  const readingMin = Math.max(1, Math.round(bodyMl.split(/\s+/).length / 200));

  const article = await prisma.article.update({
    where: { id },
    data: {
      titleMl,
      bodyMl,
      readingMin,
      status: STATUSES.includes(status) ? status : "DRAFT",
    },
  });
  await prisma.auditLog.create({
    data: { actorId: authz.ctx!.userId, action: "article.save", target: id, meta: { status } },
  });
  updateTag(`article:${article.slug}`);
  revalidatePath("/admin/articles");
  revalidatePath(`/admin/articles/${id}`);
}
