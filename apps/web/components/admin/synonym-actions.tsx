"use client";
import * as React from "react";
import { Button } from "@vaidyasala/ui";
import { approveSynonym, rejectSynonym } from "@/app/(admin)/admin/search-analytics/actions";

/** Approve / reject buttons for a suggested synonym (§14 approval queue). */
export function SynonymActions({ id }: { id: string }) {
  const [pending, start] = React.useTransition();
  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant="brand"
        disabled={pending}
        onClick={() => start(() => void approveSynonym(id))}
      >
        Approve
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() => start(() => void rejectSynonym(id))}
      >
        Reject
      </Button>
    </div>
  );
}
