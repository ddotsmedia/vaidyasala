import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import {
  isQuestionShaped,
  isSearchSort,
  isSearchDuration,
  isSearchDateRange,
} from "@vaidyasala/core/search";
import { searchClient, searchWithManglish } from "@/lib/search";
import { getFallbackTopics } from "@/lib/search-suggest";
import { AnswerPanel } from "@/components/search/answer-panel";
import { SearchFilters } from "@/components/search/search-filters";

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
  searchParams: Promise<{
    q?: string;
    sort?: string;
    duration?: string;
    date?: string;
  }>;
}) {
  const { q, sort, duration, date } = await searchParams;
  const query = (q ?? "").trim();

  // Unknown values fall back to the default rather than 400ing — a hand-edited
  // URL should still return results.
  const filters = {
    sort: isSearchSort(sort) ? sort : "relevance",
    duration: isSearchDuration(duration) ? duration : "any",
    date: isSearchDateRange(date) ? date : "any",
  } as const;

  const results =
    query && searchClient ? await searchWithManglish(query, 10, filters) : null;
  const fallbackTopics = results && results.total === 0 ? await getFallbackTopics() : [];

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

      {query ? <SearchFilters /> : null}

      {query && isQuestionShaped(query) ? <AnswerPanel question={query} /> : null}

      {results && results.total === 0 ? (
        <div className="border-border flex flex-col gap-4 rounded-xl border p-6">
          <div>
            <p className="font-medium">No results for “{query}”.</p>
            <p className="text-text-dim mt-1 text-sm">
              Try a different spelling, or start from one of these topics.
            </p>
          </div>
          {fallbackTopics.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {fallbackTopics.map((t) => (
                <li key={t.slug}>
                  <Link
                    href={`/topics/${t.slug}` as Route}
                    className="border-border hover:bg-surface focus-visible:outline-focus flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm focus-visible:outline-2"
                  >
                    <span className="font-ml" lang="ml">
                      {t.nameMl}
                    </span>
                    <span className="text-text-dim text-xs tabular-nums">{t.videoCount}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Link href="/topics" className="text-brand text-sm hover:underline">
              Browse all topics →
            </Link>
          )}
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
