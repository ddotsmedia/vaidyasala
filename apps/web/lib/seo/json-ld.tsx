import type { Thing, WithContext } from "schema-dts";

/**
 * Renders one or more JSON-LD graphs as <script type="application/ld+json">.
 * The single choke-point for structured data on every page (§7.1) — no page
 * hand-writes a <script> tag.
 */
export function JsonLd({ data }: { data: WithContext<Thing> | WithContext<Thing>[] }) {
  const graphs = Array.isArray(data) ? data : [data];
  return (
    <>
      {graphs.map((g, i) => (
        <script
          key={i}
          type="application/ld+json"
          // Structured data is server-built from typed builders; safe to inline.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(g) }}
        />
      ))}
    </>
  );
}
