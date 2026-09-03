"use client";
import { useEffect, useRef } from "react";
import Image from "next/image";
import { Play } from "lucide-react";
import { FUNNEL_EVENTS, emitEvent } from "@/lib/analytics/events";
import { trackPause, trackPlay, trackSeek } from "@/lib/analytics";
import {
  beginStreamSession,
  endStreamSession,
  markBufferingEnd,
  markBufferingStart,
  markFirstFrame,
} from "@/lib/monitoring/video-performance";
import { readPrefs } from "@/lib/player-prefs";
import { usePlayer } from "./player-context";
import { loadYouTubeApi, type YTPlayer } from "./youtube";
import { PlyrPlayer } from "@/components/PlyrPlayer";

export interface VideoPlayerProps {
  youtubeId: string;
  videoId: string;
  title: string;
  thumbnailUrl: string;
  startSec?: number;
}

/**
 * Facade YouTube player (§4, §6.1). Renders a thumbnail + play button (keeps LCP
 * clean); on first interaction it injects the IFrame API player and emits the
 * funnel events play / progress 25·50·75 / complete.
 */
export function VideoPlayer({ youtubeId, videoId, title, thumbnailUrl, startSec }: VideoPlayerProps) {
  const player = usePlayer();
  const { activated, activate, __registerControls, __registerShell, __update, __takePendingSeek } =
    player;
  const mountRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const ytRef = useRef<YTPlayer | null>(null);
  const fired = useRef<Set<string>>(new Set());
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // The element the Fullscreen API acts on — registered once, independent of
  // activation so `F` works before the iframe exists.
  useEffect(() => {
    __registerShell(shellRef.current);
    return () => __registerShell(null);
  }, [__registerShell]);

  useEffect(() => {
    if (!activated) return;

    // Clock starts at activation, not at player-ready — the API script fetch is
    // part of what the viewer waits through.
    beginStreamSession(videoId);

    // BLOCKED: Plyr player initialization for YouTube videos.
    // Plyr handles YouTube embed directly, but we lose granular tracking
    // (progress points, seek tracking) that the YouTube API provided.
    // To restore full analytics, we'd need to:
    // 1. Access Plyr's internal HTML5 video player API
    // 2. Hook into play/pause/seek events via Plyr's event system
    // 3. Integrate with player-context controls
    __registerControls({
      seekTo: (sec) => {
        // Plyr seekTo would be triggered via the player instance
        // but we don't have direct access here with the current setup
      },
      play: () => {
        // Trigger play via Plyr events
      },
      pause: () => {
        // Trigger pause via Plyr events
      },
      adjustVolume: () => {
        // Adjust via Plyr
      },
      toggleMute: () => {
        // Toggle mute via Plyr
      },
      setRate: () => {
        // Set rate via Plyr
      },
    });

    __update({ isReady: true });
    if (!fired.current.has("play")) {
      fired.current.add("play");
      trackPlay(videoId);
    }

    return () => {
      endStreamSession();
    };
  }, [activated, videoId, __registerControls, __update]);

  return (
    <div
      ref={shellRef}
      className="bg-surface relative aspect-video w-full overflow-hidden rounded-xl"
    >
      {activated ? (
        <div ref={mountRef} className="size-full">
          <PlyrPlayer youtubeId={youtubeId} title={title} />
        </div>
      ) : (
        <button
          type="button"
          onClick={activate}
          className="group focus-visible:outline-focus absolute inset-0 size-full focus-visible:outline-2"
          aria-label={`Play: ${title}`}
        >
          <Image
            src={thumbnailUrl}
            alt={`${title} - Ayurvedic health education`}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 720px"
            className="object-cover"
          />
          <span className="absolute inset-0 grid place-items-center bg-black/20 transition-colors group-hover:bg-black/30">
            <span className="bg-cta text-cta-fg grid size-16 place-items-center rounded-full shadow-3 transition-transform group-hover:scale-105">
              <Play className="size-7 translate-x-0.5 fill-current" />
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
