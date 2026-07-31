"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import type { SearchGroup, ScriptHint } from "@vaidyasala/ui";
import { SearchOmniboxLazy } from "../shell/search-omnibox-lazy";

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
  onerror: () => void;
  start(): void;
}

/** Web Speech voice input (ml-IN, §14). No-op when the API is unavailable. */
function startVoice(onText: (t: string) => void): void {
  const w = window as unknown as {
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    SpeechRecognition?: new () => SpeechRecognitionLike;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!Ctor) return;
  const rec = new Ctor();
  rec.lang = "ml-IN";
  rec.interimResults = false;
  rec.onresult = (e) => {
    const text = e.results[0]?.[0]?.transcript;
    if (text) onText(text);
  };
  rec.onerror = () => {};
  rec.start();
}

/**
 * Live search controller (§14): debounced calls to /api/v1/search feed the ⌘K
 * omnibox with grouped instant results (<50ms Meili), a script-hint badge, voice
 * input, and keyboard/click navigation.
 */
export function SearchController({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [groups, setGroups] = React.useState<SearchGroup[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [scriptHint, setScriptHint] = React.useState<ScriptHint | undefined>();

  React.useEffect(() => {
    const q = query.trim();
    if (!q) {
      setGroups([]);
      setScriptHint(undefined);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/v1/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { groups?: SearchGroup[]; script?: ScriptHint } | null) => {
          if (d) {
            setGroups(d.groups ?? []);
            setScriptHint(d.script);
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 120);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  const onSelect = React.useCallback(
    (href: string) => {
      onOpenChange(false);
      router.push(href as Route);
    },
    [router, onOpenChange],
  );

  return (
    <SearchOmniboxLazy
      open={open}
      onOpenChange={onOpenChange}
      query={query}
      onQueryChange={setQuery}
      groups={groups}
      loading={loading}
      scriptHint={scriptHint}
      onSelect={onSelect}
      onVoice={() => startVoice(setQuery)}
    />
  );
}
