"use client";

import { useEffect, useRef, useState } from "react";
import "plyr/dist/plyr.css";

// Dynamically import Plyr to handle module export compatibility
const PlyrClass = typeof window !== "undefined" ? require("plyr") : null;

interface PlyrPlayerProps {
  youtubeId: string;
  videoId?: string;
  title?: string;
}

interface SubtitleData {
  vtt: string;
  language: string;
}

export function PlyrPlayer({ youtubeId, videoId, title }: PlyrPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [subtitleData, setSubtitleData] = useState<SubtitleData | null>(null);

  // Fetch subtitles if videoId is provided
  useEffect(() => {
    if (!videoId) return;

    const fetchSubtitles = async () => {
      try {
        const response = await fetch(`/api/subtitles/${videoId}`);
        if (response.ok) {
          const data = await response.json();
          setSubtitleData(data);
        } else {
          // Start transcription job if subtitles don't exist
          await fetch(`/api/subtitles/${videoId}`, { method: "POST" });
        }
      } catch (error) {
        console.error("Failed to fetch subtitles:", error);
      }
    };

    fetchSubtitles();
  }, [videoId]);

  useEffect(() => {
    if (!containerRef.current) return;

    const options: any = {
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
    };

    // Add subtitle track if available
    if (subtitleData?.vtt) {
      const subtitleBlob = new Blob([subtitleData.vtt], { type: "text/vtt" });
      const subtitleUrl = URL.createObjectURL(subtitleBlob);
      options.tracks = [
        {
          kind: "captions",
          src: subtitleUrl,
          srclang: subtitleData.language || "en",
          label: "English",
        },
      ];
    }

    // Initialize Plyr player
    playerRef.current = new PlyrClass(containerRef.current, options);

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
      }
    };
  }, [subtitleData, youtubeId]);

  return (
    <div className="w-full">
      <div ref={containerRef} data-plyr-provider="youtube" data-plyr-embed-id={youtubeId} />
    </div>
  );
}
