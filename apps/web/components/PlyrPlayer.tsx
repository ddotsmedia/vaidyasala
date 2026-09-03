"use client";

import { useEffect, useRef } from "react";
import Plyr from "plyr";
import "plyr/dist/plyr.css";

interface PlyrPlayerProps {
  youtubeId: string;
  title?: string;
}

export function PlyrPlayer({ youtubeId, title }: PlyrPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Plyr | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize Plyr player
    playerRef.current = new Plyr(containerRef.current, {
      controls: [
        "play-large",
        "play",
        "progress",
        "current-time",
        "mute",
        "volume",
        "captions",
        "settings",
        "pip",
        "airplay",
        "fullscreen",
      ],
      settings: ["captions", "quality", "speed"],
      quality: {
        default: 720,
        options: [360, 720, 1080],
      },
      speed: {
        selected: 1,
        options: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
      },
      captions: {
        active: true,
      },
    });

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, [youtubeId]);

  return (
    <div className="w-full">
      <div ref={containerRef} data-plyr-provider="youtube" data-plyr-embed-id={youtubeId} />
    </div>
  );
}
