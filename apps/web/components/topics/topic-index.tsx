"use client";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { TopicCard } from "@/lib/feeds";
import { CategoryGrid } from "@/components/category-grid";

const KIND_LABEL: Record<string, string> = {
  CONDITION: "Conditions",
  TREATMENT: "Treatments",
  LIFESTYLE: "Lifestyle",
  HERB: "Herbs",
  GENERAL: "General",
};

/**
 * Topic index with name search. Filtering happens over the full list held in
 * memory — there are tens of topics, not thousands, so a round trip per
 * keystroke would be slower and less reliable than doing it here.
 *
 * Matches Malayalam and English names plus the slug, because a reader may type
 * in either script.
 */
export function TopicIndex({ topics }: { topics: TopicCard[] }) {
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    const matched = q
      ? topics.filter((t) =>
          `${t.nameMl} ${t.nameEn} ${t.slug}`.toLocaleLowerCase().includes(q),
        )
      : topics;

    const byKind = new Map<string, TopicCard[]>();
    for (const t of matched) {
      const arr = byKind.get(t.kind) ?? [];
      arr.push(t);
      byKind.set(t.kind, arr);
    }
    return [...byKind.entries()];
  }, [topics, query]);

  const total = groups.reduce((n, [, items]) => n + items.length, 0);

  return (
    <div className="flex flex-col gap-8">
      <div className="relative max-w-md">
        <Search
          className="text-text-dim pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search topics"
          aria-label="Search topics by name"
          className="border-border bg-surface focus-visible:outline-focus font-ml min-h-12 w-full rounded-lg border pl-9 pr-3 leading-[1.7] focus-visible:outline-2"
        />
      </div>

      {total === 0 ? (
        <p className="text-text-dim text-sm" aria-live="polite">
          No topics match “{query.trim()}”.
        </p>
      ) : (
        groups.map(([kind, items]) => (
          <section key={kind} className="flex flex-col gap-3">
            <h2 className="text-text-dim text-sm font-medium uppercase tracking-wide">
              {KIND_LABEL[kind] ?? kind}
            </h2>
            {/* limit is the group size: the index shows everything, unlike the
                home page which caps the grid. */}
            <CategoryGrid topics={items} limit={items.length} showEmpty />
          </section>
        ))
      )}
    </div>
  );
}
