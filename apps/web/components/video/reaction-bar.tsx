"use client";
import { useEffect, useState, useTransition } from "react";
import { Heart, Bookmark } from "lucide-react";
import { trackProductEvent } from "@/lib/analytics";

interface ReactionState {
  liked: boolean;
  bookmarked: boolean;
}

/**
 * Like + bookmark (§6.3). Fixed to the bottom-right on mobile where it stays in
 * thumb reach, and inline within the content column from `sm` up.
 *
 * Optimistic: the icon flips immediately and rolls back only if the write fails.
 * A reaction is not worth making someone wait on a round trip, and the failure
 * case is rare enough that a silent revert is the honest UI.
 */
export function ReactionBar({ videoId }: { videoId: string }) {
  const [state, setState] = useState<ReactionState>({ liked: false, bookmarked: false });
  const [loaded, setLoaded] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    let alive = true;
    fetch(`/api/videos/${encodeURIComponent(videoId)}/reaction`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: ReactionState | null) => {
        if (alive && d) setState({ liked: Boolean(d.liked), bookmarked: Boolean(d.bookmarked) });
      })
      .catch(() => {})
      .finally(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, [videoId]);

  function toggle(field: keyof ReactionState): void {
    const next = !state[field];
    const prev = state;
    setState({ ...state, [field]: next });
    trackProductEvent(field === "liked" ? "video_like" : "video_bookmark", {
      video_id: videoId,
      value: next,
    });
    startTransition(() => {
      void fetch(`/api/videos/${encodeURIComponent(videoId)}/reaction`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ [field]: next }),
      })
        .then((r) => {
          if (!r.ok) setState(prev);
        })
        .catch(() => setState(prev));
    });
  }

  return (
    <div
      className={
        // Thumb-reachable on phones, part of the action row on larger screens.
        "fixed bottom-20 right-4 z-30 flex flex-col gap-2 sm:static sm:z-auto sm:flex-row sm:gap-3"
      }
    >
      <ReactionButton
        label={state.liked ? "Remove like" : "Like this video"}
        pressed={state.liked}
        disabled={!loaded}
        onClick={() => toggle("liked")}
        activeClass="border-cta text-cta"
      >
        <Heart className={`size-5 ${state.liked ? "fill-current" : ""}`} aria-hidden />
        <span className="hidden sm:inline">Like</span>
      </ReactionButton>

      <ReactionButton
        label={state.bookmarked ? "Remove bookmark" : "Save for later"}
        pressed={state.bookmarked}
        disabled={!loaded}
        onClick={() => toggle("bookmarked")}
        activeClass="border-brand text-brand"
      >
        <Bookmark className={`size-5 ${state.bookmarked ? "fill-current" : ""}`} aria-hidden />
        <span className="hidden sm:inline">Save</span>
      </ReactionButton>
    </div>
  );
}

function ReactionButton({
  label,
  pressed,
  disabled,
  onClick,
  activeClass,
  children,
}: {
  label: string;
  pressed: boolean;
  disabled: boolean;
  onClick: () => void;
  activeClass: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed}
      aria-label={label}
      className={`bg-surface focus-visible:outline-focus flex size-12 items-center justify-center gap-2 rounded-full border shadow-2 transition-colors focus-visible:outline-2 disabled:opacity-50 sm:h-11 sm:w-auto sm:rounded-md sm:px-4 sm:shadow-none ${
        pressed ? activeClass : "border-border text-text-dim"
      }`}
    >
      {children}
    </button>
  );
}
