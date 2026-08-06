"use server";
import { randomBytes } from "node:crypto";
import { prisma } from "@vaidyasala/db";
import { authorize } from "@/lib/authz";
import { generateSecret, otpauthUri, verifyTotp } from "@/lib/totp";

/** Begin TOTP enrollment (§10): mint a secret + backup codes for the current user. */
export async function startTotpEnrollment(): Promise<
  { ok: true; uri: string; backupCodes: string[] } | { ok: false; error: string }
> {
  const authz = await authorize("EDITOR");
  if (!authz.ok) return { ok: false, error: authz.reason ?? "forbidden" };
  const userId = authz.ctx!.userId;

  const secret = generateSecret();
  const backupCodes = Array.from({ length: 8 }, () => randomBytes(4).toString("hex"));

  await prisma.twoFactor.deleteMany({ where: { userId } });
  await prisma.twoFactor.create({
    data: { id: `2fa_${userId}`, userId, secret, backupCodes: backupCodes.join(",") },
  });

  return { ok: true, uri: otpauthUri(secret, authz.ctx!.email), backupCodes };
}

/** Verify a TOTP code and enable 2FA for the current user (§10). */
export async function confirmTotp(code: string): Promise<{ ok: boolean; error?: string }> {
  const authz = await authorize("EDITOR");
  if (!authz.ok) return { ok: false, error: authz.reason };
  const userId = authz.ctx!.userId;

  const row = await prisma.twoFactor.findFirst({ where: { userId } });
  if (!row) return { ok: false, error: "start enrollment first" };
  if (!verifyTotp(row.secret, code)) return { ok: false, error: "invalid code" };

  await prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: true } });
  await prisma.auditLog.create({
    data: { actorId: userId, action: "2fa.enable", target: userId, meta: {} },
  });
  return { ok: true };
}
