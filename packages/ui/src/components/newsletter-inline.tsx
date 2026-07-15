"use client";

import * as React from "react";
import { cn } from "../lib/cn";
import { Button } from "../primitives/button";
import { Input } from "../primitives/input";

export type NewsletterState = "idle" | "submitting" | "success" | "error";

export interface NewsletterInlineProps {
  onSubmit?: (email: string) => void;
  state?: NewsletterState;
  className?: string;
}

/** One-field capture, double opt-in (§4). All states designed (no spinner-only). */
export function NewsletterInline({ onSubmit, state = "idle", className }: NewsletterInlineProps) {
  const [email, setEmail] = React.useState("");

  if (state === "success") {
    return (
      <p className={cn("rounded-md bg-brand/15 px-4 py-3 text-sm text-brand", className)}>
        Almost there — check your inbox to confirm your subscription.
      </p>
    );
  }

  return (
    <form
      className={cn("flex flex-col gap-2", className)}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.(email);
      }}
    >
      <div className="flex gap-2">
        <Input
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-label="Email address"
          disabled={state === "submitting"}
        />
        <Button type="submit" variant="brand" disabled={state === "submitting"}>
          {state === "submitting" ? "Joining…" : "Join"}
        </Button>
      </div>
      {state === "error" && (
        <p className="text-xs text-cta">Something went wrong. Please try again.</p>
      )}
    </form>
  );
}

NewsletterInline.Skeleton = function NewsletterInlineSkeleton() {
  return <div className="h-10 w-full animate-pulse rounded-md bg-surface-2" aria-hidden />;
};
