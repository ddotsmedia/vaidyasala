"use client";

import * as React from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Button, SearchOmnibox, SubscribeCTA, type SearchGroup } from "@vaidyasala/ui";
import { ThemeSwitcher } from "./theme-switcher";

const CHANNEL_URL = "https://www.youtube.com/@vaidyasala";

/**
 * Persistent top bar (§1.4): logo · search (⌘K) · Topics · Latest · Subscribe
 * (always visible, never scrolls away). Search is UI-only until Phase 4.
 */
export function TopBar() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Wired to Meilisearch in Phase 4; empty groups keep the shell honest for now.
  const groups: SearchGroup[] = [];

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
        <Link href="/" className="text-lg font-semibold tracking-tight text-text">
          Vaidyasala
        </Link>

        <button
          type="button"
          onClick={() => setOpen(true)}
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
            onClick={() => setOpen(true)}
            aria-label="Search"
            className="rounded-md p-2 text-text-dim hover:text-text sm:hidden"
          >
            <Search className="size-4" />
          </button>
          <ThemeSwitcher />
          <SubscribeCTA channelUrl={CHANNEL_URL} variant="inline" className="ml-1" />
        </nav>
      </div>

      <SearchOmnibox
        open={open}
        onOpenChange={setOpen}
        query={query}
        onQueryChange={setQuery}
        groups={groups}
      />
    </header>
  );
}
