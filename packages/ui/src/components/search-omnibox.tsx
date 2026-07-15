"use client";

import * as React from "react";
import { Mic } from "lucide-react";
import { cn } from "../lib/cn";
import { Dialog, DialogContent } from "../primitives/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../primitives/command";
import { Badge } from "../primitives/badge";
import type { SearchGroup } from "./types";

export type ScriptHint = "malayalam" | "latin" | "manglish";

export interface SearchOmniboxProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  query: string;
  onQueryChange: (q: string) => void;
  groups: SearchGroup[];
  loading?: boolean;
  scriptHint?: ScriptHint;
  onSelect?: (href: string) => void;
  onVoice?: () => void;
}

/**
 * ⌘K command palette (§4). UI-only shell — instant Meilisearch results,
 * grouping, script auto-detect indicator, and voice are wired in Phase 4.
 */
export function SearchOmnibox({
  open,
  onOpenChange,
  query,
  onQueryChange,
  groups,
  loading = false,
  scriptHint,
  onSelect,
  onVoice,
}: SearchOmniboxProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0">
        <Command shouldFilter={false}>
          <div className="relative">
            <CommandInput
              value={query}
              onValueChange={onQueryChange}
              placeholder="Search videos, topics, FAQs…"
            />
            <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2">
              {scriptHint && (
                <Badge variant="outline" className="uppercase">
                  {scriptHint}
                </Badge>
              )}
              <button
                type="button"
                onClick={onVoice}
                aria-label="Voice search"
                className="text-text-dim hover:text-text"
              >
                <Mic className="size-4" />
              </button>
            </div>
          </div>
          <CommandList>
            {loading ? (
              <div className="space-y-2 p-3" aria-hidden>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className={cn("h-9 animate-pulse rounded bg-surface-2")} />
                ))}
              </div>
            ) : groups.length === 0 ? (
              <CommandEmpty>No results{query ? ` for “${query}”` : ""}.</CommandEmpty>
            ) : (
              groups.map((group) => (
                <CommandGroup key={group.heading} heading={group.heading}>
                  {group.items.map((item) => (
                    <CommandItem key={item.id} value={item.id} onSelect={() => onSelect?.(item.href)}>
                      <span className="flex flex-col">
                        <span className="text-text">{item.label}</span>
                        {item.sublabel && <span className="text-xs text-text-dim">{item.sublabel}</span>}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
