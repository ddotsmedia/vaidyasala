import type { Takeaway } from "@/lib/video";

/** KeyTakeaways (§4): AI-extracted bullets, Malayalam-first. */
export function KeyTakeaways({ takeaways }: { takeaways: Takeaway[] }) {
  if (takeaways.length === 0) return null;
  return (
    <section className="flex flex-col gap-2" aria-label="Key takeaways">
      <h2 className="text-lg font-semibold">Key takeaways</h2>
      <ul className="flex flex-col gap-2">
        {takeaways.map((t, i) => (
          <li key={i} className="border-border flex gap-2 rounded-lg border p-3">
            <span className="text-brand" aria-hidden>
              ✓
            </span>
            <span className="font-ml leading-[1.8]" lang="ml">
              {t.ml}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
