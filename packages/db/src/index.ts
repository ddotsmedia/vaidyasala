import { PrismaClient } from "@prisma/client";
import { withBuildGuard } from "./build-guard";

/**
 * Typed Prisma client, instantiated once per process and reused across hot
 * reloads in dev. Import `prisma` from here in web (server) and worker code.
 *
 * During `next build` only, reads degrade to empty when the database is
 * unreachable so the image can be built without one (see ./build-guard).
 * Outside the build phase this is the plain client.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  withBuildGuard(
    new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    }),
  );

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export { isBuildPhase } from "./build-guard";
export * from "@prisma/client";
