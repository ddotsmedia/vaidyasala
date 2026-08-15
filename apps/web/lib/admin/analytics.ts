import "server-only";
import { prisma } from "@vaidyasala/db";
import { FUNNEL_EVENTS } from "@vaidyasala/core/validation";

export interface FunnelStage {
  key: string;
  label: string;
  count: number;
}

/** Funnel view→play→75%→subscribe-click (§6.1). "view" ≈ any funnel signal start. */
export async function getFunnel(): Promise<FunnelStage[]> {
  const grouped = await prisma.analyticsEvent.groupBy({ by: ["name"], _count: { name: true } });
  const byName = new Map(grouped.map((g) => [g.name, g._count.name]));
  const play = byName.get(FUNNEL_EVENTS.play) ?? 0;
  const p75 = byName.get(FUNNEL_EVENTS.progress75) ?? 0;
  const sub = byName.get(FUNNEL_EVENTS.subscribeClick) ?? 0;
  return [
    { key: "play", label: "Played", count: play },
    { key: "p75", label: "Watched 75%", count: p75 },
    { key: "sub", label: "Subscribe clicks", count: sub },
  ];
}

export interface LeaderRow {
  slug: string;
  titleMl: string;
  plays: number;
}

/** Video leaderboard by play count (§7.6). */
export async function getLeaderboard(limit = 10): Promise<LeaderRow[]> {
  const grouped = await prisma.analyticsEvent.groupBy({
    by: ["videoId"],
    where: { name: FUNNEL_EVENTS.play, videoId: { not: null } },
    _count: { videoId: true },
    orderBy: { _count: { videoId: "desc" } },
    take: limit,
  });
  const ids = grouped.map((g) => g.videoId!).filter(Boolean);
  const videos = await prisma.video.findMany({
    where: { id: { in: ids } },
    select: { id: true, slug: true, titleMl: true },
  });
  const vmap = new Map(videos.map((v) => [v.id, v]));
  return grouped
    .map((g): LeaderRow | null => {
      const v = vmap.get(g.videoId!);
      return v ? { slug: v.slug, titleMl: v.titleMl, plays: g._count.videoId } : null;
    })
    .filter((x): x is LeaderRow => x !== null);
}

export interface CostRow {
  slug: string;
  titleMl: string;
  costUsd: number;
}

/** AI cost per video from Job.costUsd (§7.6/§8.1), plus the grand total. */
export async function getAiCost(limit = 10): Promise<{ total: number; rows: CostRow[] }> {
  const totalAgg = await prisma.job.aggregate({ _sum: { costUsd: true } });
  const grouped = await prisma.job.groupBy({
    by: ["videoId"],
    where: { videoId: { not: null }, costUsd: { not: null } },
    _sum: { costUsd: true },
    orderBy: { _sum: { costUsd: "desc" } },
    take: limit,
  });
  const ids = grouped.map((g) => g.videoId!).filter(Boolean);
  const videos = await prisma.video.findMany({
    where: { id: { in: ids } },
    select: { id: true, slug: true, titleMl: true },
  });
  const vmap = new Map(videos.map((v) => [v.id, v]));
  const rows = grouped
    .map((g): CostRow | null => {
      const v = vmap.get(g.videoId!);
      return v ? { slug: v.slug, titleMl: v.titleMl, costUsd: Number(g._sum.costUsd ?? 0) } : null;
    })
    .filter((x): x is CostRow => x !== null);
  return { total: Number(totalAgg._sum.costUsd ?? 0), rows };
}

// ── Time series for the charts (§7.6) ──────────────────────────────────────
//
// Aggregation happens here, on the server, in SQL. Prisma's groupBy cannot
// bucket by day, so these use $queryRaw with date_trunc — the same tagged-
// template style already used for pgvector queries, so values stay parameterised.
//
// Each series is zero-filled across the whole window: a day with no activity is
// a real 0, and a line chart that silently skips those days misrepresents a gap
// as a flat segment.

export interface DayPoint {
  /** ISO date, YYYY-MM-DD. */
  date: string;
  value: number;
}

/** Zero-fill so every day in the window appears, even with no rows. */
function fillDays(rows: { day: Date; value: number }[], days: number): DayPoint[] {
  const byDay = new Map(rows.map((r) => [r.day.toISOString().slice(0, 10), r.value]));
  const out: DayPoint[] = [];
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  for (let i = 0; i < days; i += 1) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    out.push({ date: key, value: byDay.get(key) ?? 0 });
  }
  return out;
}

/**
 * Watch-time per day, in hours (§7.6). Sums WatchProgress.positionSec for rows
 * touched that day — positionSec is the furthest point reached, so this is
 * "watch time represented in the table", not a replay-weighted total.
 */
export async function getWatchTimeSeries(days = 30): Promise<DayPoint[]> {
  const rows = await prisma.$queryRaw<{ day: Date; seconds: bigint | null }[]>`
    SELECT date_trunc('day', "updatedAt") AS day, SUM("positionSec")::bigint AS seconds
    FROM "WatchProgress"
    WHERE "updatedAt" >= NOW() - (${days}::int * INTERVAL '1 day')
    GROUP BY 1 ORDER BY 1
  `;
  return fillDays(
    rows.map((r) => ({ day: r.day, value: Number(r.seconds ?? 0) / 3600 })),
    days,
  );
}

/** Videos ingested per day (§9.2) — throughput of the import pipeline. */
export async function getIngestSeries(days = 60): Promise<DayPoint[]> {
  const rows = await prisma.$queryRaw<{ day: Date; count: bigint }[]>`
    SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::bigint AS count
    FROM "Video"
    WHERE "createdAt" >= NOW() - (${days}::int * INTERVAL '1 day')
    GROUP BY 1 ORDER BY 1
  `;
  return fillDays(
    rows.map((r) => ({ day: r.day, value: Number(r.count) })),
    days,
  );
}

export interface TopicPerf {
  topic: string;
  /** Mean furthest position across watches of videos in this topic, minutes. */
  avgMinutes: number;
  watches: number;
}

/**
 * Average watch-time per topic (§7.6). Joined through Video.primaryTopicId, so
 * a video with no primary topic is excluded rather than bucketed as "unknown" —
 * it has no topic to attribute the time to.
 */
export async function getTopicPerformance(limit = 8): Promise<TopicPerf[]> {
  const rows = await prisma.$queryRaw<
    { topic: string; avg_seconds: number | null; watches: bigint }[]
  >`
    SELECT t."nameEn" AS topic,
           AVG(w."positionSec")::float AS avg_seconds,
           COUNT(*)::bigint AS watches
    FROM "WatchProgress" w
    JOIN "Video" v ON v.id = w."videoId"
    JOIN "Topic" t ON t.id = v."primaryTopicId"
    GROUP BY t."nameEn"
    HAVING COUNT(*) > 0
    ORDER BY AVG(w."positionSec") DESC
    LIMIT ${limit}
  `;
  return rows.map((r) => ({
    topic: r.topic,
    avgMinutes: Number(((r.avg_seconds ?? 0) / 60).toFixed(1)),
    watches: Number(r.watches),
  }));
}

export interface JourneyStage {
  stage: string;
  count: number;
}

/**
 * Visitors → searches → result clicks → plays → subscribe clicks (§6.1).
 *
 * "Visitors" is distinct viewerKey across all funnel events — the closest real
 * figure available, since page views are only sent to Mixpanel and never land
 * in AnalyticsEvent. Kept separate from getFunnel() so the existing table
 * render is untouched.
 */
export async function getJourneyFunnel(): Promise<JourneyStage[]> {
  const [visitors, grouped] = await Promise.all([
    prisma.analyticsEvent.findMany({
      where: { viewerKey: { not: null } },
      distinct: ["viewerKey"],
      select: { viewerKey: true },
    }),
    prisma.analyticsEvent.groupBy({ by: ["name"], _count: { name: true } }),
  ]);
  const n = (name: string): number =>
    grouped.find((g) => g.name === name)?._count.name ?? 0;

  return [
    { stage: "Visitors", count: visitors.length },
    { stage: "Searches", count: n(FUNNEL_EVENTS.search) },
    { stage: "Result clicks", count: n(FUNNEL_EVENTS.searchResultClick) },
    { stage: "Plays", count: n(FUNNEL_EVENTS.play) },
    { stage: "Subscribes", count: n(FUNNEL_EVENTS.subscribeClick) },
  ];
}
