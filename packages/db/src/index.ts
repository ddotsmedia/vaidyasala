/**
 * Typed Prisma client, exported once for web + worker. The full multi-file
 * schema (content/discovery/engagement/ops/auth) and the generated client land
 * in Phase 1B; until `prisma generate` has run this module intentionally holds
 * only the connection helper shape.
 */

// BLOCKED: @prisma/client is not generated until Phase 1B runs `prisma migrate`
// against the dev compose Postgres. Consumers should import `prisma` from here
// once 1B lands.
export const DB_PACKAGE = "@vaidyasala/db" as const;
