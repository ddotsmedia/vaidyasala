"use client";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Funnel,
  FunnelChart,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DayPoint, JourneyStage, TopicPerf } from "@/lib/admin/analytics";

/**
 * Chart island for /admin/analytics (§7.6).
 *
 * Every series is aggregated on the server and passed in as props — this file
 * holds no data of its own, so a chart can never show a number the database
 * does not. Recharts needs the DOM, hence "use client"; the page around it
 * stays a server component.
 */

// Blue → teal, matching the site's brand ramp. Concrete hex because recharts
// paints into SVG and cannot read Tailwind classes.
const BLUE = "#3b82f6";
const TEAL = "#14b8a6";
const FUNNEL_COLORS = ["#3b82f6", "#0ea5e9", "#06b6d4", "#14b8a6", "#10b981"];

const AXIS = { stroke: "currentColor", fontSize: 11, tickLine: false } as const;

/** Chart wrapper: title, fixed height, and an honest empty state. */
function Panel({
  title,
  hint,
  empty,
  children,
}: {
  title: string;
  hint?: string;
  empty: boolean;
  children: React.ReactElement;
}) {
  return (
    <section className="border-border bg-surface flex flex-col gap-2 rounded-xl border p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-text-dim text-xs font-semibold uppercase tracking-wide">{title}</h2>
        {hint ? <span className="text-text-dim text-xs">{hint}</span> : null}
      </div>
      {empty ? (
        // Say so rather than drawing an axis around nothing — an empty chart
        // reads as "zero activity", which is not the same as "no data yet".
        <p className="text-text-dim grid h-56 place-items-center text-sm">No data yet.</p>
      ) : (
        <div className="text-text-dim h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {children}
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

/** YYYY-MM-DD → "12 Aug", for axis ticks. */
const shortDay = (iso: string): string => {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${d.getUTCDate()} ${d.toLocaleString("en", { month: "short", timeZone: "UTC" })}`;
};

const tooltipStyle = {
  contentStyle: {
    background: "var(--color-surface, #111)",
    border: "1px solid var(--color-border, #333)",
    borderRadius: 8,
    fontSize: 12,
  },
} as const;

export function AnalyticsCharts({
  watchTime,
  ingest,
  topics,
  journey,
}: {
  watchTime: DayPoint[];
  ingest: DayPoint[];
  topics: TopicPerf[];
  journey: JourneyStage[];
}) {
  const hasWatch = watchTime.some((p) => p.value > 0);
  const hasIngest = ingest.some((p) => p.value > 0);
  const hasJourney = journey.some((s) => s.count > 0);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Watch-time" hint="last 30 days, hours" empty={!hasWatch}>
        <LineChart data={watchTime} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.15} />
          <XAxis dataKey="date" tickFormatter={shortDay} minTickGap={24} {...AXIS} />
          <YAxis {...AXIS} />
          <Tooltip
            {...tooltipStyle}
            labelFormatter={(l: unknown) => shortDay(String(l))}
            formatter={(v: unknown) => [`${Number(v).toFixed(1)} h`, "Watch-time"] as [string, string]}
          />
          <Line type="monotone" dataKey="value" stroke={BLUE} strokeWidth={2} dot={false} />
        </LineChart>
      </Panel>

      <Panel title="Ingest throughput" hint="last 60 days, videos/day" empty={!hasIngest}>
        <AreaChart data={ingest} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="ingestFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={TEAL} stopOpacity={0.35} />
              <stop offset="100%" stopColor={TEAL} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.15} />
          <XAxis dataKey="date" tickFormatter={shortDay} minTickGap={28} {...AXIS} />
          <YAxis allowDecimals={false} {...AXIS} />
          <Tooltip
            {...tooltipStyle}
            labelFormatter={(l: unknown) => shortDay(String(l))}
            formatter={(v: unknown) => [`${Number(v)}`, "Videos"] as [string, string]}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={TEAL}
            strokeWidth={2}
            fill="url(#ingestFill)"
          />
        </AreaChart>
      </Panel>

      <Panel title="Topic performance" hint="avg watch-time, minutes" empty={topics.length === 0}>
        <BarChart data={topics} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.15} />
          <XAxis dataKey="topic" interval={0} height={48} angle={-25} textAnchor="end" {...AXIS} />
          <YAxis {...AXIS} />
          <Tooltip
            {...tooltipStyle}
            // Watch count comes from the label, looked up in the same array the
            // chart was given — simpler than reaching into the tooltip payload,
            // and keeps both formatters on the one-argument signature.
            labelFormatter={(l: unknown) => {
              const name = String(l);
              const row = topics.find((t) => t.topic === name);
              return row ? `${name} · ${row.watches} watches` : name;
            }}
            formatter={(v: unknown) => [`${Number(v)} min`, "Average"] as [string, string]}
          />
          <Bar dataKey="avgMinutes" fill={TEAL} radius={[4, 4, 0, 0]} />
        </BarChart>
      </Panel>

      <Panel title="User journey" hint="visitors → subscribe" empty={!hasJourney}>
        <FunnelChart margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
          <Tooltip {...tooltipStyle} formatter={(v: unknown) => [`${Number(v)}`, "Events"] as [string, string]} />
          <Funnel dataKey="count" data={journey} isAnimationActive={false}>
            {journey.map((s, i) => (
              <Cell key={s.stage} fill={FUNNEL_COLORS[i % FUNNEL_COLORS.length]} />
            ))}
            <LabelList
              position="right"
              dataKey="stage"
              fill="currentColor"
              stroke="none"
              fontSize={11}
            />
          </Funnel>
        </FunnelChart>
      </Panel>
    </div>
  );
}
