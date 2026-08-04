"use client";
import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { Play } from "lucide-react";

interface Citation {
  videoId: string;
  videoSlug: string;
  startSec: number;
  label: string;
}
interface Topic {
  slug: string;
  nameMl: string;
}

/**
 * AI-answer panel (§6.4/§14): streams a retrieval-grounded answer from
 * /api/v1/ai/answer and renders each citation as a playable timestamp chip
 * (→ /watch/{slug}?t={sec}). Below threshold it shows an honest no-answer with
 * nearest topic hubs — the answer is always sold as a video.
 */
export function AnswerPanel({ question }: { question: string }) {
  const [text, setText] = React.useState("");
  const [citations, setCitations] = React.useState<Citation[]>([]);
  const [topics, setTopics] = React.useState<Topic[]>([]);
  const [state, setState] = React.useState<"loading" | "answer" | "no_answer" | "error">("loading");

  React.useEffect(() => {
    const ctrl = new AbortController();
    setText("");
    setCitations([]);
    setTopics([]);
    setState("loading");

    (async () => {
      try {
        const res = await fetch("/api/v1/ai/answer", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ question }),
          signal: ctrl.signal,
        });
        if (!res.ok || !res.body) {
          setState("error");
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        let answered = false;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const chunks = buf.split("\n\n");
          buf = chunks.pop() ?? "";
          for (const chunk of chunks) {
            const line = chunk.replace(/^data: /, "").trim();
            if (!line) continue;
            const ev = JSON.parse(line) as {
              type: string;
              text?: string;
              citations?: Citation[];
              topics?: Topic[];
            };
            if (ev.type === "token" && ev.text) {
              answered = true;
              setState("answer");
              setText((t) => t + ev.text);
            } else if (ev.type === "citations" && ev.citations) {
              setCitations(ev.citations);
            } else if (ev.type === "no_answer") {
              setTopics(ev.topics ?? []);
              setState("no_answer");
            } else if (ev.type === "error") {
              setState("error");
            }
          }
        }
        if (!answered) setState((s) => (s === "loading" ? "no_answer" : s));
      } catch {
        if (!ctrl.signal.aborted) setState("error");
      }
    })();

    return () => ctrl.abort();
  }, [question]);

  if (state === "error") return null;

  return (
    <section
      data-speakable
      className="border-brand/30 bg-brand/5 flex flex-col gap-3 rounded-xl border p-5"
      aria-label="AI answer"
    >
      <h2 className="text-brand text-xs font-semibold uppercase tracking-wide">AI answer</h2>

      {state === "loading" ? (
        <div className="bg-surface-2 h-4 w-2/3 animate-pulse rounded" />
      ) : state === "no_answer" ? (
        <div className="flex flex-col gap-3">
          <p className="text-text-dim text-sm">
            No confident answer yet — this question is logged so we can make a video on it.
          </p>
          {topics.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {topics.map((t) => (
                <Link
                  key={t.slug}
                  href={`/topics/${t.slug}` as Route}
                  className="bg-surface-2 hover:text-text text-text-dim font-ml rounded-sm px-2.5 py-1 text-xs"
                  lang="ml"
                >
                  {t.nameMl}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <>
          <p lang="ml" className="font-ml text-base leading-[1.8]">
            {text}
          </p>
          {citations.length > 0 ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-text-dim text-xs">Sources — tap to play at the moment:</span>
              <div className="flex flex-wrap gap-2">
                {citations.map((c, i) => (
                  <Link
                    key={`${c.videoId}-${c.startSec}-${i}`}
                    href={`/watch/${c.videoSlug}?t=${c.startSec}` as Route}
                    className="bg-cta/10 text-cta hover:bg-cta/20 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs"
                  >
                    <Play className="size-3 fill-current" />
                    <span className="font-ml" lang="ml">
                      {c.label}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
