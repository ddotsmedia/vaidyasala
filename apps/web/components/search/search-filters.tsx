"use client";
import { useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";

const SORTS: { value: string; label: string }[] = [
  { value: "relevance", label: "Relevance" },
  { value: "date", label: "Newest" },
  { value: "views", label: "Most viewed" },
];

const DURATIONS: { value: string; label: string }[] = [
  { value: "any", label: "Any length" },
  { value: "short", label: "Under 10 min" },
  { value: "medium", label: "10–30 min" },
  { value: "long", label: "Over 30 min" },
];

const DATES: { value: string; label: string }[] = [
  { value: "any", label: "Any time" },
  { value: "week", label: "Past week" },
  { value: "month", label: "Past month" },
  { value: "year", label: "Past year" },
];

/**
 * Filter + sort controls for /search.
 *
 * State lives in the URL, not in React: a filtered result set is worth sharing
 * and worth having in history, and the page is already `force-dynamic` so there
 * is no ISR to protect here (unlike the topic hubs).
 */
export function SearchFilters() {
  const router = useRouter();
  const params = useSearchParams();

  const set = (key: string, value: string): void => {
    const next = new URLSearchParams(params.toString());
    if (value === "any" || value === "relevance") next.delete(key);
    else next.set(key, value);
    router.replace(`/search?${next.toString()}` as Route, { scroll: false });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        label="Sort"
        value={params.get("sort") ?? "relevance"}
        options={SORTS}
        onChange={(v) => set("sort", v)}
      />
      <Select
        label="Length"
        value={params.get("duration") ?? "any"}
        options={DURATIONS}
        onChange={(v) => set("duration", v)}
      />
      <Select
        label="Published"
        value={params.get("date") ?? "any"}
        options={DATES}
        onChange={(v) => set("date", v)}
      />
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-text-dim">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border-border bg-surface focus-visible:outline-focus min-h-11 rounded-md border px-3 focus-visible:outline-2"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
