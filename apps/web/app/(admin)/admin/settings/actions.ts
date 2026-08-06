"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@vaidyasala/db";
import { authorize } from "@/lib/authz";
import { setSetting, SETTING_KEYS } from "@/lib/settings";

export async function setTrustedAutoPublish(enabled: boolean): Promise<{ ok: boolean; error?: string }> {
  const authz = await authorize("ADMIN");
  if (!authz.ok) return { ok: false, error: authz.reason };
  await setSetting(SETTING_KEYS.trustedAutoPublish, enabled);
  await prisma.auditLog.create({
    data: {
      actorId: authz.ctx!.userId,
      action: "settings.trusted_auto_publish",
      target: SETTING_KEYS.trustedAutoPublish,
      meta: { enabled },
    },
  });
  revalidatePath("/admin/settings");
  return { ok: true };
}
