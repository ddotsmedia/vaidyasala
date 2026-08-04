"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@vaidyasala/db";
import { authorize } from "@/lib/authz";
import { searchClient } from "@/lib/search";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

async function resyncSynonyms(): Promise<void> {
  if (!searchClient) return;
  const rows = await prisma.synonymMapping.findMany({
    where: { approved: true },
    select: { variant: true, canonical: true },
  });
  await searchClient.syncSynonyms(rows).catch(() => {});
}

/** Approve a suggested synonym (§14): flips `approved` and re-syncs Meili. */
export async function approveSynonym(id: string): Promise<ActionResult> {
  const authz = await authorize("EDITOR");
  if (!authz.ok) return { ok: false, error: authz.reason };
  await prisma.synonymMapping.update({ where: { id }, data: { approved: true } });
  await prisma.auditLog.create({
    data: { actorId: authz.ctx!.userId, action: "synonym.approve", target: id, meta: {} },
  });
  await resyncSynonyms();
  revalidatePath("/admin/search-analytics");
  return { ok: true };
}

/** Reject (delete) a suggested synonym. */
export async function rejectSynonym(id: string): Promise<ActionResult> {
  const authz = await authorize("EDITOR");
  if (!authz.ok) return { ok: false, error: authz.reason };
  await prisma.synonymMapping.delete({ where: { id } });
  await prisma.auditLog.create({
    data: { actorId: authz.ctx!.userId, action: "synonym.reject", target: id, meta: {} },
  });
  revalidatePath("/admin/search-analytics");
  return { ok: true };
}
