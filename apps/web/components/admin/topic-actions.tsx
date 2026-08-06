"use client";
import * as React from "react";
import { Button } from "@vaidyasala/ui";
import { deleteTopic } from "@/app/(admin)/admin/topics/actions";

/** Delete a topic (blocked while it still has videos). */
export function DeleteTopicButton({ id, disabled }: { id: string; disabled?: boolean }) {
  const [pending, start] = React.useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending || disabled}
      title={disabled ? "Reassign its videos first" : undefined}
      onClick={() => start(() => void deleteTopic(id))}
    >
      Delete
    </Button>
  );
}
