/**
 * Seed a working admin login (§2D). Better Auth owns the credential, so we sign
 * up through the auth API (which hashes the password) then elevate the Profile to
 * ADMIN. Idempotent: replaces any pre-existing credential-less user with the same
 * email (e.g. the db seed's placeholder admin).
 *
 * Self-contained Better Auth instance (no server-only / next-js plugins) so it
 * runs as a plain node/tsx script, outside the Next runtime.
 *
 * Run: DATABASE_URL=… BETTER_AUTH_SECRET=… pnpm --filter @vaidyasala/web admin:create
 */
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@vaidyasala/db";

const email = process.env.ADMIN_EMAIL ?? "admin@vaidhyasala.com";
const password = process.env.ADMIN_PASSWORD ?? "vaidyasala-admin";

const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: process.env.BETTER_AUTH_SECRET ?? "dev-only-insecure-secret-change-me",
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  emailAndPassword: { enabled: true },
});

async function main(): Promise<void> {
  const existing = await prisma.user.findUnique({ where: { email }, include: { accounts: true } });
  if (existing) {
    await prisma.profile.deleteMany({ where: { id: existing.id } });
    await prisma.user.delete({ where: { id: existing.id } });
  }

  await auth.api.signUpEmail({ body: { email, password, name: "Vaidyasala Admin" } });

  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  await prisma.profile.upsert({
    where: { id: user.id },
    update: { role: "ADMIN" },
    create: { id: user.id, role: "ADMIN", langPref: "ml" },
  });
  console.log(`[admin] ready: ${email}`);
  await prisma.$disconnect();
}

main().catch(async (err: unknown) => {
  console.error("[admin] failed", err);
  await prisma.$disconnect();
  process.exit(1);
});
