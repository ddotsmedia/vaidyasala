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
