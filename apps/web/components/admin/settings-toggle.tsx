"use client";
import * as React from "react";
import { Button } from "@vaidyasala/ui";
import { setTrustedAutoPublish } from "@/app/(admin)/admin/settings/actions";

/** Trusted-mode auto-publish toggle (§8.3). */
export function TrustedModeToggle({ enabled }: { enabled: boolean }) {
  const [on, setOn] = React.useState(enabled);
  const [pending, start] = React.useTransition();
  const toggle = () =>
    start(async () => {
      const next = !on;
      const res = await setTrustedAutoPublish(next);
      if (res.ok) setOn(next);
    });
  return (
    <div className="border-border flex items-center justify-between rounded-lg border p-4">
      <div>
        <p className="font-medium">Trusted mode — auto-publish</p>
        <p className="text-text-dim text-sm">
          When on, drafts that pass the quality gate publish automatically (§8.3). Off by default —
          an editor reviews every draft.
        </p>
      </div>
      <Button variant={on ? "cta" : "outline"} disabled={pending} onClick={toggle}>
        {on ? "On" : "Off"}
      </Button>
    </div>
  );
}
