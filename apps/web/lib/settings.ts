import "server-only";
import { prisma } from "@vaidyasala/db";

/** Typed operator settings (§8.3). Stored in the Setting key/value table. */
export const SETTING_KEYS = {
  trustedAutoPublish: "trusted_auto_publish",
} as const;

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await prisma.setting.findUnique({ where: { key } });
  return row ? (row.value as T) : fallback;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await prisma.setting.upsert({
    where: { key },
    create: { key, value: value as never },
    update: { value: value as never },
  });
}

/** Trusted mode (§8.3): when on, the pipeline may auto-publish passing drafts. */
export async function isTrustedAutoPublish(): Promise<boolean> {
  return getSetting<boolean>(SETTING_KEYS.trustedAutoPublish, false);
}
