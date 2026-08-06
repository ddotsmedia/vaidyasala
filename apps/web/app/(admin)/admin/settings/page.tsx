import type { Metadata } from "next";
import { isTrustedAutoPublish } from "@/lib/settings";
import { TrustedModeToggle } from "@/components/admin/settings-toggle";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

/** /admin/settings (§8.3) — operator toggles. */
export default async function SettingsPage() {
  const trusted = await isTrustedAutoPublish();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Settings</h1>
      <TrustedModeToggle enabled={trusted} />
    </div>
  );
}
