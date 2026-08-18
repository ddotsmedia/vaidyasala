import * as React from "react";
import { cn } from "../lib/cn";
import { splitMatches } from "../lib/highlight";

export interface HighlightedTextProps {
  text: string;
  /** The viewer's query. Blank, or unmatched, renders `text` untouched. */
  query: string;
  /** Extra classes for each <mark>. */
  markClassName?: string;
}

/**
 * Render `text` with occurrences of `query` wrapped in <mark>.
 *
 * <mark> rather than a styled span: it carries the "relevant to the current
 * activity" semantic, so the match survives a high-contrast theme and is
 * conveyed by assistive tech instead of by colour alone (WCAG 1.4.1).
 */
export function HighlightedText({ text, query, markClassName }: HighlightedTextProps) {
  const runs = splitMatches(text, query);
  if (runs.length === 1 && !runs[0]!.match) return <>{text}</>;

  return (
    <>
      {runs.map((run, i) =>
        run.match ? (
          <mark
            // Runs are positional and the list is rebuilt whenever the query
            // changes, so the index is a stable key here.
            key={i}
            className={cn("bg-brand/20 text-text rounded-sm px-0.5", markClassName)}
          >
            {run.text}
          </mark>
        ) : (
          <React.Fragment key={i}>{run.text}</React.Fragment>
        ),
      )}
    </>
  );
}
