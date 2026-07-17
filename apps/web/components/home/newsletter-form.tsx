"use client";
import { useState } from "react";
import { NewsletterInline, type NewsletterState } from "@vaidyasala/ui";

/** Client wrapper: NewsletterInline → POST /api/v1/newsletter/subscribe (double opt-in). */
export function NewsletterForm() {
  const [state, setState] = useState<NewsletterState>("idle");
  return (
    <NewsletterInline
      state={state}
      onSubmit={async (email) => {
        setState("submitting");
        try {
          const res = await fetch("/api/v1/newsletter/subscribe", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ email }),
          });
          setState(res.ok ? "success" : "error");
        } catch {
          setState("error");
        }
      }}
    />
  );
}
