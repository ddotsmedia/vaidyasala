import { createHash } from "node:crypto";

/** Short stable content hash for idempotency keys ({kind}:{videoId}:{hash}). */
export function contentHash(...parts: (string | number)[]): string {
  return createHash("sha1").update(parts.join("|")).digest("hex").slice(0, 12);
}
