import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";

// Auth is per-request by definition — sessions, cookies, OAuth callbacks. Never
// let this be statically analysed or cached at build time.
export const dynamic = "force-dynamic";

/** Better Auth catch-all handler (§13 /api/auth/[...all]). */
export const { GET, POST } = toNextJsHandler(auth);
