import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import { isQuestionShaped } from "@vaidyasala/core/search";
import { searchClient } from "@/lib/search";
import { AnswerPanel } from "@/components/search/answer-panel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Search",
  // Search-result pages are thin/duplicative — keep them out of the index (§7.2).
  robots: { index: false, follow: true },
};

/** /search?q= — deep-linkable results page (§14). Mirrors the ⌘K omnibox. */
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const results = query && searchClient ? await searchClient.search(query, 10) : null;

  return (
    <div className="flex flex-col gap-8 py-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Search</h1>
        {query ? (
          <p className="text-text-dim mt-1 text-sm">
            Results for <span className="text-text font-medium">“{query}”</span>
          </p>
        ) : (
          <p className="text-text-dim mt-1 text-sm">
            Type a query — try “prameham”, “thyroid”, or a Malayalam term.
          </p>
        )}
      </div>

      {query && isQuestionShaped(query) ? <AnswerPanel question={query} /> : null}

      {results && results.total === 0 ? (
        <div className="border-border rounded-xl border p-8 text-center">
          <p className="font-medium">No results for “{query}”.</p>
          <p className="text-text-dim mt-2 text-sm">
            Try a different spelling, or{" "}
            <Link href="/topics" className="text-brand hover:underline">
              browse topics
            </Link>
            .
          </p>
        </div>
      ) : null}

      {results?.groups.map((group) => (
        <section key={group.heading} className="flex flex-col gap-2">
          <h2 className="text-text-dim text-xs font-medium uppercase tracking-wide">
            {group.heading}
          </h2>
          <ul className="flex flex-col gap-1">
            {group.items.map((item) => (
              <li key={item.id}>
                <Link
                  href={item.href as Route}
                  className="border-border hover:bg-surface flex flex-col rounded-lg border p-3"
                >
                  <span className="font-ml" lang="ml">
                    {item.label}
                  </span>
                  {item.sublabel ? (
                    <span className="text-text-dim text-xs">{item.sublabel}</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
