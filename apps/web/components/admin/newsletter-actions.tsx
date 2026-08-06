"use client";
import * as React from "react";
import { Button } from "@vaidyasala/ui";
import { approveIssue, sendIssue } from "@/app/(admin)/admin/newsletter/actions";

/** Approve → send controls for a newsletter issue (§9.3). */
export function NewsletterActions({ id, status }: { id: string; status: string }) {
  const [pending, start] = React.useTransition();
  return (
    <div className="flex gap-2">
      {status === "draft" ? (
        <Button size="sm" variant="brand" disabled={pending} onClick={() => start(() => void approveIssue(id))}>
          Approve
        </Button>
      ) : null}
      {status === "approved" ? (
        <Button size="sm" variant="cta" disabled={pending} onClick={() => start(() => void sendIssue(id))}>
          Send
        </Button>
      ) : null}
    </div>
  );
}
