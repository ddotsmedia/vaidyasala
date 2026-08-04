"use client";
import * as React from "react";
import { Button } from "@vaidyasala/ui";
import { moderateComment } from "@/app/(admin)/admin/comments/actions";

/** Approve / reject / spam buttons for the moderation queue (§13). */
export function CommentActions({ id }: { id: string }) {
  const [pending, start] = React.useTransition();
  return (
    <div className="flex gap-2">
      <Button size="sm" variant="brand" disabled={pending} onClick={() => start(() => void moderateComment(id, "APPROVED"))}>
        Approve
      </Button>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => start(() => void moderateComment(id, "REJECTED"))}>
        Reject
      </Button>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => start(() => void moderateComment(id, "SPAM"))}>
        Spam
      </Button>
    </div>
  );
}
