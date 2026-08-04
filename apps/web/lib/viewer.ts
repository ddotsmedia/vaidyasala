import "server-only";
import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@vaidyasala/db";
import { getAuthContext } from "./authz";

export const VIEWER_COOKIE = "vaid_vk";
const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 365,
  path: "/",
};

/**
 * Re-key anonymous WatchProgress rows ("a:*") onto the signed-in user ("u:*"),
 * keeping the furthest position per video (§2). Idempotent — safe to call on any
 * authenticated request. Runs when a device that watched signed-out logs in.
 */
export async function mergeAnonProgress(anonKey: string, userId: string): Promise<void> {
  if (!anonKey.startsWith("a:")) return;
  const userKey = `u:${userId}`;
  const anonRows = await prisma.watchProgress.findMany({ where: { viewerKey: anonKey } });
  if (anonRows.length === 0) return;

  for (const row of anonRows) {
    const existing = await prisma.watchProgress.findUnique({
      where: { viewerKey_videoId: { viewerKey: userKey, videoId: row.videoId } },
    });
    if (!existing) {
      await prisma.watchProgress.update({
        where: { id: row.id },
        data: { viewerKey: userKey, userId },
      });
    } else {
      // Keep the furthest position; drop the now-duplicate anon row.
      await prisma.watchProgress.update({
        where: { id: existing.id },
        data: {
          positionSec: Math.max(existing.positionSec, row.positionSec),
          completed: existing.completed || row.completed,
          userId,
        },
      });
      await prisma.watchProgress.delete({ where: { id: row.id } });
    }
  }
}

export interface ViewerKey {
  key: string | null;
  userId: string | null;
}

/**
 * Resolve the caller's viewer identity (§2 viewerKey). Logged in → "u:{userId}"
 * (merging any anonymous progress from this device first). Anonymous → the
 * "a:{uuid}" cookie. `mutable` must be true only in Route Handlers / Server
 * Actions (they may set/merge); RSC reads pass false and never mutate cookies.
 */
export async function getViewerKey(mutable = false): Promise<ViewerKey> {
  const jar = await cookies();
  const ctx = await getAuthContext();
  const anon = jar.get(VIEWER_COOKIE)?.value;

  if (ctx) {
    if (anon?.startsWith("a:")) {
      await mergeAnonProgress(anon, ctx.userId).catch(() => {});
      if (mutable) jar.delete(VIEWER_COOKIE);
    }
    return { key: `u:${ctx.userId}`, userId: ctx.userId };
  }

  if (anon) return { key: anon, userId: null };
  if (!mutable) return { key: null, userId: null };

  const key = `a:${randomUUID()}`;
  jar.set(VIEWER_COOKIE, key, COOKIE_OPTS);
  return { key, userId: null };
}
