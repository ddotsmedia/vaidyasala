import type { PrismaClient } from "@vaidyasala/db";

/** Serialize a JS number[] to a pgvector literal `[a,b,c]`. */
export function toVectorLiteral(v: number[]): string {
  return `[${v.join(",")}]`;
}

export interface SegmentVectorInput {
  startSec: number;
  endSec: number;
  textMl: string;
}

/**
 * Replace a video's per-segment vectors (§8.2 step 7). Raw SQL because the
 * `embedding` column is a pgvector `Unsupported` type Prisma can't type.
 * Idempotent: deletes existing rows for the video first.
 */
export async function writeSegmentVectors(
  prisma: PrismaClient,
  videoId: string,
  segments: SegmentVectorInput[],
  vectors: number[][],
): Promise<number> {
  await prisma.$executeRaw`DELETE FROM "TranscriptSegmentVector" WHERE "videoId" = ${videoId}`;
  let n = 0;
  for (let i = 0; i < segments.length; i++) {
    const s = segments[i]!;
    const vec = vectors[i];
    if (!vec) continue;
    const lit = toVectorLiteral(vec);
    await prisma.$executeRaw`
      INSERT INTO "TranscriptSegmentVector" ("id", "videoId", "startSec", "endSec", "textMl", "embedding")
      VALUES (gen_random_uuid()::text, ${videoId}, ${s.startSec}, ${s.endSec}, ${s.textMl}, ${lit}::vector)`;
    n++;
  }
  return n;
}

/** Set the video-level embedding (title+summary). */
export async function writeVideoEmbedding(
  prisma: PrismaClient,
  videoId: string,
  vector: number[],
): Promise<void> {
  const lit = toVectorLiteral(vector);
  await prisma.$executeRaw`UPDATE "Video" SET "embedding" = ${lit}::vector WHERE "id" = ${videoId}`;
}

/** Cosine-nearest videos to a given video by embedding (HNSW `<=>`). */
export async function nearestVideos(
  prisma: PrismaClient,
  videoId: string,
  limit: number,
): Promise<{ id: string; similarity: number }[]> {
  const rows = await prisma.$queryRaw<{ id: string; similarity: number }[]>`
    SELECT v."id",
           1 - (v."embedding" <=> (SELECT "embedding" FROM "Video" WHERE "id" = ${videoId})) AS "similarity"
    FROM "Video" v
    WHERE v."id" <> ${videoId}
      AND v."embedding" IS NOT NULL
      AND v."status" IN ('DRAFT', 'PUBLISHED')
    ORDER BY v."embedding" <=> (SELECT "embedding" FROM "Video" WHERE "id" = ${videoId})
    LIMIT ${limit}`;
  return rows.map((r) => ({ id: r.id, similarity: Number(r.similarity) }));
}
