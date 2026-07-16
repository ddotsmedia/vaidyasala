"use client";
import { useEffect, useRef, useState } from "react";
import { Volume2, Square } from "lucide-react";

/**
 * AudioModeBar (§4): TTS playback of the summary via the Web Speech API
 * (ml-IN voice when available). Hidden when the browser has no speech synthesis.
 */
export function AudioModeBar({ text }: { text: string }) {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => window.speechSynthesis?.cancel();
  }, []);

  if (!supported || !text) return null;

  const start = (): void => {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ml-IN";
    u.rate = 0.95;
    u.onend = () => setSpeaking(false);
    utterRef.current = u;
    window.speechSynthesis.speak(u);
    setSpeaking(true);
  };
  const stop = (): void => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  return (
    <div className="border-border flex items-center gap-3 rounded-lg border p-3">
      <button
        type="button"
        onClick={speaking ? stop : start}
        className="bg-surface-2 text-text flex items-center gap-2 rounded-md px-3 py-1.5 text-sm"
      >
        {speaking ? <Square className="size-4" /> : <Volume2 className="size-4" />}
        {speaking ? "Stop" : "Listen to summary"}
      </button>
      <span className="text-text-dim text-xs">Audio mode · ml-IN</span>
    </div>
  );
}
