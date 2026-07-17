"use client";
import { useEffect, useState } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Button } from "@vaidyasala/ui";
import { FUNNEL_EVENTS, emitEvent } from "@/lib/analytics/events";
import { usePlayer } from "./player-context";

export interface WatchNextItem {
  slug: string;
  titleMl: string;
  thumbnailUrl: string;
  watchHref: Route;
}

/** WatchNextCard (§6.1): on video end, an 8s cancellable countdown → next video. */
export function WatchNextCard({ next, videoId }: { next: WatchNextItem | null; videoId: string }) {
  const { ended } = usePlayer();
  const router = useRouter();
  const reduce = useReducedMotion();
  const [count, setCount] = useState(8);
  const [cancelled, setCancelled] = useState(false);

  const active = ended && next && !cancelled;

  useEffect(() => {
    if (!active) return;
    if (count <= 0) {
      emitEvent(FUNNEL_EVENTS.chainPlay, videoId, { to: next!.slug });
      router.push(next!.watchHref);
      return;
    }
    const t = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [active, count, next, router, videoId]);

  return (
    <AnimatePresence>
      {active ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0.15 : 0.25 }}
          className="absolute inset-0 z-20 grid place-items-center bg-black/70 p-4 text-center"
        >
          <div className="flex max-w-sm flex-col items-center gap-3">
            <p className="text-sm text-white/80">Up next in {count}s</p>
            <div className="relative aspect-video w-56 overflow-hidden rounded-lg">
              <Image src={next!.thumbnailUrl} alt="" fill sizes="224px" className="object-cover" />
            </div>
            <p className="font-ml font-medium text-white" lang="ml">
              {next!.titleMl}
            </p>
            <div className="flex gap-2">
              <Button
                variant="cta"
                onClick={() => {
                  emitEvent(FUNNEL_EVENTS.chainPlay, videoId, { to: next!.slug });
                  router.push(next!.watchHref);
                }}
              >
                Play now
              </Button>
              <Button variant="outline" onClick={() => setCancelled(true)}>
                Cancel
              </Button>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
