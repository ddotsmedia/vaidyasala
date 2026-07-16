import "server-only";
import { headers } from "next/headers";
import { prisma, type Role } from "@vaidyasala/db";
import { auth } from "./auth";

const RANK: Record<Role, number> = { VIEWER: 0, EDITOR: 1, ADMIN: 2 };

export interface AuthContext {
  userId: string;
  email: string;
  name: string;
  role: Role;
}

/** Current session + app role, or null if signed out. */
export async function getAuthContext(): Promise<AuthContext | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const profile = await prisma.profile.findUnique({ where: { id: session.user.id } });
  return {
    userId: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: profile?.role ?? "VIEWER",
  };
}

export interface AuthzResult {
  ok: boolean;
  ctx: AuthContext | null;
  /** "unauthenticated" (no session) vs "forbidden" (insufficient role). */
  reason?: "unauthenticated" | "forbidden";
}

/**
 * The single authorize() layer used by BOTH admin pages and API routes (§10 —
 * defense against route-handler drift). Returns the context on success.
 */
export async function authorize(minRole: Role): Promise<AuthzResult> {
  const ctx = await getAuthContext();
  if (!ctx) return { ok: false, ctx: null, reason: "unauthenticated" };
  if (RANK[ctx.role] < RANK[minRole]) return { ok: false, ctx, reason: "forbidden" };
  return { ok: true, ctx };
}
