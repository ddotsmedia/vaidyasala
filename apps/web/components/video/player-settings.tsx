"use client";
import { useEffect, useState } from "react";
import { Check, Gauge, Keyboard, Maximize, RectangleHorizontal } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@vaidyasala/ui";
import { PLAYBACK_RATES } from "@/lib/player-prefs";
import { usePlayer } from "./player-context";

/**
 * Controls YouTube's chrome cannot give us (§4).
 *
 * Speed is a real IFrame API call; theater is our own layout; fullscreen goes
 * through the Fullscreen API on our wrapper, since the iframe is cross-origin.
 * Quality is deliberately absent — setPlaybackQuality is only a hint and
 * exposes no bitrates, so a quality menu here would lie about what it did.
 */
export function PlayerSettings() {
  const { rate, setRate, theater, toggleTheater, toggleFullscreen } = usePlayer();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" aria-label={`Playback speed, currently ${rate}×`}>
            <Gauge className="size-4" aria-hidden />
            <span className="tabular-nums">{rate}×</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Playback speed</DropdownMenuLabel>
          {PLAYBACK_RATES.map((r) => (
            <DropdownMenuItem
              key={r}
              onSelect={() => setRate(r)}
              // The menu is a listbox of mutually exclusive options; the
              // checkmark is decorative, aria-checked is what is announced.
              role="menuitemradio"
              aria-checked={r === rate}
            >
              <Check className={r === rate ? "size-4" : "size-4 opacity-0"} aria-hidden />
              <span className="tabular-nums">{r === 1 ? "Normal" : `${r}×`}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="outline"
        size="sm"
        onClick={toggleTheater}
        aria-pressed={theater}
        aria-label="Theater mode"
      >
        <RectangleHorizontal className="size-4" aria-hidden />
        Theater
      </Button>

      <Button variant="outline" size="sm" onClick={toggleFullscreen} aria-label="Fullscreen">
        <Maximize className="size-4" aria-hidden />
        Fullscreen
      </Button>

      <ShortcutsDialog />
    </div>
  );
}

/** Every shortcut `useKeyboardControls` binds — WCAG 3.3.2 wants them discoverable. */
const SHORTCUTS: { keys: string; action: string }[] = [
  { keys: "Space / K", action: "Play or pause" },
  { keys: "J / L", action: "Back or forward 10 seconds" },
  { keys: "← / →", action: "Back or forward 5 seconds" },
  { keys: "↑ / ↓", action: "Volume up or down" },
  { keys: "0–9", action: "Jump to 0%–90% of the video" },
  { keys: "Home / End", action: "Start or end" },
  { keys: "< / >", action: "Slower or faster" },
  { keys: "M", action: "Mute" },
  { keys: "T", action: "Theater mode" },
  { keys: "F", action: "Fullscreen" },
  { keys: "?", action: "This list" },
];

/** Fired by the `?` shortcut; keeps the key handler free of dialog state. */
export const SHORTCUTS_EVENT = "vs:player-shortcuts";

function ShortcutsDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onAsk = (): void => setOpen((o) => !o);
    window.addEventListener(SHORTCUTS_EVENT, onAsk);
    return () => window.removeEventListener(SHORTCUTS_EVENT, onAsk);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Keyboard shortcuts">
          <Keyboard className="size-4" aria-hidden />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
        </DialogHeader>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          {SHORTCUTS.map((s) => (
            <div key={s.keys} className="contents">
              <dt className="text-text-dim whitespace-nowrap font-mono text-xs">{s.keys}</dt>
              <dd>{s.action}</dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  );
}
