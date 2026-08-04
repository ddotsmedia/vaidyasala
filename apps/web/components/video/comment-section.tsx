"use client";
import * as React from "react";
import Link from "next/link";
import { Button } from "@vaidyasala/ui";

interface CommentView {
  id: string;
  body: string;
  author: string;
  createdAt: string;
}

type SubmitState = "idle" | "sending" | "pending" | "auth" | "error";

/**
 * Comments (§13): lists APPROVED comments and lets signed-in viewers submit
 * (held PENDING for moderation). Client-fetched so /watch stays static. Turnstile
 * is wired when NEXT_PUBLIC_TURNSTILE_SITE_KEY is set (skipped in dev).
 */
export function CommentSection({ videoId }: { videoId: string }) {
  const [comments, setComments] = React.useState<CommentView[]>([]);
  const [body, setBody] = React.useState("");
  const [state, setState] = React.useState<SubmitState>("idle");

  const load = React.useCallback(() => {
    fetch(`/api/v1/comments?videoId=${encodeURIComponent(videoId)}`)
      .then((r) => (r.ok ? r.json() : { comments: [] }))
      .then((d: { comments?: CommentView[] }) => setComments(d.comments ?? []))
      .catch(() => {});
  }, [videoId]);

  React.useEffect(() => load(), [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (body.trim().length < 2) return;
    setState("sending");
    const res = await fetch("/api/v1/comments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ videoId, body: body.trim() }),
    }).catch(() => null);
    if (!res) return setState("error");
    if (res.status === 401) return setState("auth");
    if (!res.ok) return setState("error");
    setBody("");
    setState("pending");
  }

  return (
    <section className="flex flex-col gap-4" aria-label="Comments">
      <h2 className="text-lg font-semibold">Comments</h2>

      <form onSubmit={submit} className="flex flex-col gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a comment…"
          rows={3}
          maxLength={2000}
          className="border-border bg-surface focus-visible:outline-focus rounded-md border px-3 py-2 text-sm focus-visible:outline-2"
        />
        <div className="flex items-center gap-3">
          <Button type="submit" variant="brand" size="sm" disabled={state === "sending"}>
            {state === "sending" ? "Posting…" : "Post comment"}
          </Button>
          {state === "pending" ? (
            <span className="text-text-dim text-xs">Thanks — your comment is awaiting moderation.</span>
          ) : null}
          {state === "auth" ? (
            <span className="text-text-dim text-xs">
              <Link href="/login" className="text-brand hover:underline">
                Sign in
              </Link>{" "}
              to comment.
            </span>
          ) : null}
          {state === "error" ? (
            <span className="text-cta text-xs">Something went wrong. Try again.</span>
          ) : null}
        </div>
      </form>

      {comments.length === 0 ? (
        <p className="text-text-dim text-sm">No comments yet — be the first.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {comments.map((c) => (
            <li key={c.id} className="border-border rounded-md border p-3">
              <p className="text-text-dim text-xs font-medium">{c.author}</p>
              <p lang="ml" className="font-ml mt-1 text-sm leading-[1.7]">
                {c.body}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
