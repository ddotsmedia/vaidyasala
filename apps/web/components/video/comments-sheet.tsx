"use client";
import { useEffect, useRef, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { CommentSection } from "./comment-section";

/**
 * Comments as a bottom sheet on mobile, inline from `md` up.
 *
 * Built on <dialog> so focus trapping, Escape, and inertness of the page behind
 * come from the platform rather than from hand-rolled key handlers. The inline
 * desktop copy and the sheet are the same CommentSection, mounted once each —
 * only one is ever visible at a given breakpoint.
 */
export function CommentsSheet({ videoId }: { videoId: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  // Body scroll lock while the sheet is up, or the page scrolls behind it on iOS.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      {/* Mobile trigger */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="border-border bg-surface focus-visible:outline-focus flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border px-4 focus-visible:outline-2 md:hidden"
      >
        <MessageCircle className="size-5" aria-hidden />
        <span>Comments</span>
      </button>

      <dialog
        ref={ref}
        onClose={() => setOpen(false)}
        // Clicking the backdrop (the dialog element itself, outside the panel).
        onClick={(e) => {
          if (e.target === ref.current) setOpen(false);
        }}
        className="bg-transparent p-0 backdrop:bg-black/50 md:hidden"
      >
        <div className="bg-bg fixed inset-x-0 bottom-0 flex max-h-[85dvh] flex-col rounded-t-2xl">
          <div className="border-border flex items-center justify-between border-b px-4 py-3">
            <h2 className="text-base font-semibold">Comments</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close comments"
              className="focus-visible:outline-focus grid size-11 place-items-center rounded-full focus-visible:outline-2"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <div className="overflow-y-auto overscroll-contain px-4 pb-8 pt-4">
            {/* Only mount the list once the sheet is opened — no fetch on a page
                view where the reader never asks for comments. */}
            {open ? <CommentSection videoId={videoId} /> : null}
          </div>
        </div>
      </dialog>

      {/* Desktop: plain inline section, no sheet involved. */}
      <div className="hidden md:block">
        <CommentSection videoId={videoId} />
      </div>
    </>
  );
}
