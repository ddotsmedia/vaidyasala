"use client";
import * as React from "react";
import { Button } from "@vaidyasala/ui";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * PWA glue (§5, Phase 5): registers the service worker and shows a subtle
 * install prompt — only after the 2nd visit, and never again once installed or
 * dismissed. Renders nothing until the browser fires beforeinstallprompt.
 */
export function Pwa() {
  const [deferred, setDeferred] = React.useState<BeforeInstallPromptEvent | null>(null);

  React.useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    let visits = 0;
    try {
      visits = Number(localStorage.getItem("vaid_visits") ?? "0") + 1;
      localStorage.setItem("vaid_visits", String(visits));
    } catch {
      /* storage blocked — install prompt simply won't show */
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      let dismissed = false;
      try {
        dismissed = localStorage.getItem("vaid_install_dismissed") === "1";
      } catch {
        /* ignore */
      }
      if (visits >= 2 && !dismissed) setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem("vaid_install_dismissed", "1");
    } catch {
      /* ignore */
    }
    setDeferred(null);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice.catch(() => {});
    setDeferred(null);
  };

  if (!deferred) return null;

  return (
    <div className="border-border bg-surface fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full border px-4 py-2 shadow-3">
      <span className="text-sm">Install Vaidyasala for quick access</span>
      <Button size="sm" variant="brand" onClick={install}>
        Install
      </Button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="text-text-dim hover:text-text text-sm"
      >
        ✕
      </button>
    </div>
  );
}
