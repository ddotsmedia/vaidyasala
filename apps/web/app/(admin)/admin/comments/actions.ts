"use server";
import { revalidatePath } from "next/cache";
import { prisma, type CommentStatus } from "@vaidyasala/db";
import { authorize } from "@/lib/authz";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

/** Moderate a comment (§13): APPROVED | REJECTED | SPAM. EDITOR+; audited. */
export async function moderateComment(id: string, status: CommentStatus): Promise<ActionResult> {
  const authz = await authorize("EDITOR");
  if (!authz.ok) return { ok: false, error: authz.reason };
  await prisma.comment.update({ where: { id }, data: { status } });
  await prisma.auditLog.create({
    data: {
      actorId: authz.ctx!.userId,
      action: `comment.${status.toLowerCase()}`,
      target: id,
      meta: {},
    },
  });
  revalidatePath("/admin/comments");
  return { ok: true };
}
