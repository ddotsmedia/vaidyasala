import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";

/** Better Auth catch-all handler (§13 /api/auth/[...all]). */
export const { GET, POST } = toNextJsHandler(auth);
