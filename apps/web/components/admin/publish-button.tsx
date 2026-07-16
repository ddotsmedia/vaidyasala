"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@vaidyasala/ui";
import { publishVideo, hideVideo, type ActionResult } from "@/app/(admin)/admin/videos/[id]/actions";

/** Publish / hide controls wired to the server actions (§6.5). */
export function PublishControls({ videoId, status }: { videoId: string; status: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const run = (fn: () => Promise<ActionResult>): void => {
    setMsg(null);
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        setMsg("Saved");
        router.refresh();
      } else {
        setMsg(`Error: ${res.error}`);
      }
    });
  };

  return (
    <div className="flex items-center gap-3">
      {status !== "PUBLISHED" ? (
        <Button variant="cta" disabled={pending} onClick={() => run(() => publishVideo(videoId))}>
          {pending ? "Working…" : "Publish"}
        </Button>
      ) : (
        <Button variant="outline" disabled={pending} onClick={() => run(() => hideVideo(videoId))}>
          {pending ? "Working…" : "Hide"}
        </Button>
      )}
      {msg ? <span className="text-text-dim text-sm">{msg}</span> : null}
    </div>
  );
}
