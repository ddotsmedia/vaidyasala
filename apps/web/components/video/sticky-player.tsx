"use client";
import { useEffect, useState, type RefObject } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Pause, Play, ChevronUp } from "lucide-react";
import { usePlayer } from "./player-context";

/**
 * StickyPlayer (§4, §5.4): when the hero player scrolls out of view during
 * playback, dock a compact control bar (spring stiffness 300 / damping 30). The
 * video keeps playing in the hero (watch-time keeper). Visual mini-player
 * (iframe reparent) is a Phase 3D polish item — see DECISIONS.
 */
export function StickyPlayer({
  title,
  heroRef,
}: {
  title: string;
  heroRef: RefObject<HTMLDivElement | null>;
}) {
  const { activated, isPlaying, play, pause } = usePlayer();
  const [heroVisible, setHeroVisible] = useState(true);
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setHeroVisible(entry?.isIntersecting ?? true), {
      threshold: 0.1,
    });
    io.observe(el);
    return () => io.disconnect();
  }, [heroRef]);

  const show = activated && !heroVisible;

  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          initial={reduce ? { opacity: 0 } : { y: 80, opacity: 0 }}
          animate={reduce ? { opacity: 1 } : { y: 0, opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { y: 80, opacity: 0 }}
          transition={reduce ? { duration: 0.15 } : { type: "spring", stiffness: 300, damping: 30 }}
          className="border-border bg-surface/95 fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur"
        >
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2">
            <button
              type="button"
              onClick={() => (isPlaying ? pause() : play())}
              className="bg-cta text-cta-fg grid size-9 shrink-0 place-items-center rounded-full"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="size-4" /> : <Play className="size-4 translate-x-px" />}
            </button>
            <span className="font-ml min-w-0 flex-1 truncate text-sm" lang="ml">
              {title}
            </span>
            <button
              type="button"
              onClick={() => heroRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="text-text-dim hover:text-text flex items-center gap-1 text-sm"
            >
              <ChevronUp className="size-4" /> Video
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
