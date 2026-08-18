"use client";

import * as React from "react";
import Link from "next/link";
import { Bookmark, Search } from "lucide-react";
import { Button, SubscribeCTA } from "@vaidyasala/ui";
import { ThemeSwitcher } from "./theme-switcher";
import { SearchController } from "../search/search-controller";

const CHANNEL_URL = "https://www.youtube.com/@vaidyasala";

/**
 * Persistent top bar (§1.4): logo · search (⌘K) · Topics · Latest · Subscribe
 * (always visible, never scrolls away). Search is UI-only until Phase 4.
 */
export function TopBar() {
  const [open, setOpen] = React.useState(false);
  const [everOpened, setEverOpened] = React.useState(false);

  const openSearch = React.useCallback(() => {
    setEverOpened(true);
    setOpen(true);
  }, []);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setEverOpened(true);
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
        <Link href="/" className="text-lg font-semibold tracking-tight text-text">
          Vaidyasala
        </Link>

        <button
          type="button"
          onClick={openSearch}
          className="ml-2 hidden h-9 flex-1 items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm text-text-dim sm:flex"
        >
          <Search className="size-4" />
          Search…
          <kbd className="ml-auto rounded bg-surface-2 px-1.5 text-xs">⌘K</kbd>
        </button>

        <nav className="ml-auto flex items-center gap-1">
          <Button asChild variant="ghost" size="sm">
            <Link href="/topics">Topics</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/latest">Latest</Link>
          </Button>
          <button
            type="button"
            onClick={openSearch}
            aria-label="Search"
            className="rounded-md p-2 text-text-dim hover:text-text sm:hidden"
          >
            <Search className="size-4" />
          </button>
          {/* Icon-only: the label would push the nav past the ⌘K field on
              narrow screens, and the destination is named on arrival. */}
          <Button asChild variant="ghost" size="sm" aria-label="Saved videos">
            <Link href="/watchlist">
              <Bookmark className="size-4" />
            </Link>
          </Button>
          <ThemeSwitcher />
          <SubscribeCTA channelUrl={CHANNEL_URL} variant="inline" className="ml-1" />
        </nav>
      </div>

      {everOpened ? <SearchController open={open} onOpenChange={setOpen} /> : null}
    </header>
  );
}
