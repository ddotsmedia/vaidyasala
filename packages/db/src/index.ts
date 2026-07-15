import { PrismaClient } from "@prisma/client";

/**
 * Typed Prisma client, instantiated once per process and reused across hot
 * reloads in dev. Import `prisma` from here in web (server) and worker code.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export * from "@prisma/client";
