import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@vaidyasala/db";
import { env } from "./env";

/**
 * Better Auth server (§10). Email+password sessions. A databaseHook creates the
 * app-level Profile (role VIEWER) whenever a User is created, so RBAC has a row
 * to read. Role lives on Profile, not on the Better Auth user. The TwoFactor
 * table exists in the schema; the TOTP plugin + EDITOR/ADMIN enforcement lands
 * in Phase 6 (§10) — omitted here to keep the 2D surface minimal.
 */
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  emailAndPassword: { enabled: true },
  session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await prisma.profile.upsert({
            where: { id: user.id },
            update: {},
            create: { id: user.id, role: "VIEWER", langPref: "ml" },
          });
        },
      },
    },
  },
  // TOTP 2FA (§10) is enforced in the admin layout via a self-contained TOTP
  // enrollment (lib/totp) rather than the Better Auth plugin (version-skew types).
  // nextCookies() must be last so Set-Cookie propagates from server actions.
  plugins: [nextCookies()],
});
