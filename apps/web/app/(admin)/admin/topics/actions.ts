"use server";
import { revalidatePath } from "next/cache";
import { prisma, type TopicKind } from "@vaidyasala/db";
import { content } from "@vaidyasala/core";
import { authorize } from "@/lib/authz";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

const KINDS: TopicKind[] = ["CONDITION", "TREATMENT", "LIFESTYLE", "HERB", "GENERAL"];

export async function createTopic(form: FormData): Promise<void> {
  const authz = await authorize("EDITOR");
  if (!authz.ok) return;
  const nameMl = String(form.get("nameMl") ?? "").trim();
  const nameEn = String(form.get("nameEn") ?? "").trim();
  const kind = String(form.get("kind") ?? "GENERAL") as TopicKind;
  if (!nameMl || !nameEn) return;
  const slug = content.slugifyMl(nameEn) || content.slugifyMl(nameMl);
  await prisma.topic.create({
    data: { slug, nameMl, nameEn, kind: KINDS.includes(kind) ? kind : "GENERAL", synonyms: [] },
  });
  await prisma.auditLog.create({
    data: { actorId: authz.ctx!.userId, action: "topic.create", target: slug, meta: {} },
  });
  revalidatePath("/admin/topics");
}

export async function updateTopic(id: string, form: FormData): Promise<ActionResult> {
  const authz = await authorize("EDITOR");
  if (!authz.ok) return { ok: false, error: authz.reason };
  const nameMl = String(form.get("nameMl") ?? "").trim();
  const nameEn = String(form.get("nameEn") ?? "").trim();
  const kind = String(form.get("kind") ?? "GENERAL") as TopicKind;
  await prisma.topic.update({
    where: { id },
    data: { nameMl, nameEn, kind: KINDS.includes(kind) ? kind : "GENERAL" },
  });
  await prisma.auditLog.create({
    data: { actorId: authz.ctx!.userId, action: "topic.update", target: id, meta: {} },
  });
  revalidatePath("/admin/topics");
  return { ok: true };
}

export async function deleteTopic(id: string): Promise<ActionResult> {
  const authz = await authorize("ADMIN");
  if (!authz.ok) return { ok: false, error: authz.reason };
  await prisma.topic.delete({ where: { id } });
  await prisma.auditLog.create({
    data: { actorId: authz.ctx!.userId, action: "topic.delete", target: id, meta: {} },
  });
  revalidatePath("/admin/topics");
  return { ok: true };
}
