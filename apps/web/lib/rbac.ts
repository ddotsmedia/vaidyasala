import { env } from "./env";

export interface AuthzResult {
  ok: boolean;
  reason?: string;
}

/**
 * RBAC stub for admin endpoints. Real enforcement (Better Auth + Profile.role +
 * a single authorize() layer, §10) lands in Phase 2D. For now: a bearer token
 * (ADMIN_INGEST_TOKEN) gates the route; if unset, allow only in non-production.
 */
export function authorizeAdmin(req: Request): AuthzResult {
  const token = env.ADMIN_INGEST_TOKEN;
  const header = req.headers.get("authorization") ?? "";
  if (token) {
    return header === `Bearer ${token}`
      ? { ok: true }
      : { ok: false, reason: "invalid or missing bearer token" };
  }
  if (process.env.NODE_ENV === "production") {
    return { ok: false, reason: "ADMIN_INGEST_TOKEN not configured" };
  }
  return { ok: true };
}
