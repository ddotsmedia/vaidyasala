"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@vaidyasala/db";
import { content } from "@vaidyasala/core";
import { authorize } from "@/lib/authz";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function createPlaylist(form: FormData): Promise<void> {
  const authz = await authorize("EDITOR");
  if (!authz.ok) return;
  const titleMl = String(form.get("titleMl") ?? "").trim();
  if (!titleMl) return;
  const slug = (content.slugifyMl(titleMl) || `playlist-${Date.now()}`).slice(0, 60);
  await prisma.playlist.create({ data: { slug, titleMl } });
  await prisma.auditLog.create({
    data: { actorId: authz.ctx!.userId, action: "playlist.create", target: slug, meta: {} },
  });
  revalidatePath("/admin/playlists");
}

export async function deletePlaylist(id: string): Promise<ActionResult> {
  const authz = await authorize("ADMIN");
  if (!authz.ok) return { ok: false, error: authz.reason };
  await prisma.playlist.delete({ where: { id } });
  await prisma.auditLog.create({
    data: { actorId: authz.ctx!.userId, action: "playlist.delete", target: id, meta: {} },
  });
  revalidatePath("/admin/playlists");
  return { ok: true };
}
