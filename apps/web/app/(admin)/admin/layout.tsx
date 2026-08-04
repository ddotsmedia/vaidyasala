import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { authorize } from "@/lib/authz";
import { SignOutButton } from "@/components/admin/sign-out-button";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin · Vaidyasala" },
  robots: { index: false, follow: false },
};

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/queue", label: "Queue" },
  { href: "/admin/videos", label: "Videos" },
  { href: "/admin/search-analytics", label: "Search" },
] as const;

/** Admin shell (§13). Gated by the single authorize() layer (§10); noindex. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const authz = await authorize("EDITOR");
  if (authz.reason === "unauthenticated") redirect("/login");
  if (!authz.ok) {
    return (
      <main className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-xl font-semibold">403 — Forbidden</h1>
        <p className="text-text-dim mt-2 text-sm">
          Signed in as {authz.ctx?.email} ({authz.ctx?.role}). Editor access required.
        </p>
      </main>
    );
  }

  return (
    <div className="min-h-dvh">
      <header className="border-border bg-surface flex items-center justify-between border-b px-4 py-3">
        <nav className="flex items-center gap-4">
          <span className="font-semibold">Vaidyasala Admin</span>
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="text-text-dim hover:text-text text-sm">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-text-dim">{authz.ctx?.email}</span>
          <SignOutButton />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
