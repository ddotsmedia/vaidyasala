"use client";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { SubscribeCTA } from "@vaidyasala/ui";
import { FUNNEL_EVENTS, emitEvent } from "@/lib/analytics/events";
import { usePlayer } from "./player-context";

/**
 * SubscribeCTA overlay that fades in at 75% watched (§6.1 — "earn it"). Not
 * before. Emits subscribe_click.
 */
export function SubscribeOverlay({
  channelUrl,
  subscriberCount,
  videoId,
}: {
  channelUrl: string;
  subscriberCount?: number;
  videoId: string;
}) {
  const { reached75 } = usePlayer();
  const reduce = useReducedMotion();

  return (
    <AnimatePresence>
      {reached75 ? (
        <motion.div
          initial={{ opacity: 0, y: reduce ? 0 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0.15 : 0.3 }}
        >
          <SubscribeCTA
            variant="banner"
            channelUrl={channelUrl}
            subscriberCount={subscriberCount}
            onSubscribeClick={() => emitEvent(FUNNEL_EVENTS.subscribeClick, videoId)}
          />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
