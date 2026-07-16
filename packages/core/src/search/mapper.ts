/**
 * Meilisearch document mapper (§14). The index CONFIG (weights, synonyms, typo
 * tolerance) lands in Phase 4; this is the pure Video→document projection the
 * `index-search` job upserts. Searchable fields ordered by §14 weight:
 * title > keywords > summary > chapters > transcript.
 */

export interface VideoSearchSource {
  id: string;
  slug: string;
  titleMl: string;
  titleEn?: string | null;
  status: string;
  durationSec: number;
  publishedAt?: Date | null;
  primaryTopic?: { slug: string; nameMl: string; nameEn: string } | null;
  summaryMl?: string | null;
  summaryEn?: string | null;
  keywords?: { termMl: string; termEn?: string | null }[];
  chapters?: { titleMl: string; titleEn?: string | null }[];
  faqs?: { questionMl: string }[];
  /** Corrected Malayalam transcript, chunked for the transcript field. */
  transcriptMl?: string | null;
}

export interface VideoSearchDoc {
  id: string;
  slug: string;
  titleMl: string;
  titleEn: string;
  status: string;
  durationSec: number;
  publishedAt: number | null;
  topicSlug: string | null;
  topicNames: string[];
  keywords: string[];
  summary: string;
  chapters: string[];
  faqs: string[];
  transcript: string[];
}

/** Split transcript into ~1k-char chunks for the (lowest-weight) transcript field. */
function chunkTranscript(text: string, size = 1000): string[] {
  const out: string[] = [];
  for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size));
  return out;
}

export function buildVideoSearchDoc(v: VideoSearchSource): VideoSearchDoc {
  return {
    id: v.id,
    slug: v.slug,
    titleMl: v.titleMl,
    titleEn: v.titleEn ?? "",
    status: v.status,
    durationSec: v.durationSec,
    publishedAt: v.publishedAt ? v.publishedAt.getTime() : null,
    topicSlug: v.primaryTopic?.slug ?? null,
    topicNames: v.primaryTopic ? [v.primaryTopic.nameMl, v.primaryTopic.nameEn] : [],
    keywords: (v.keywords ?? []).flatMap((k) => [k.termMl, k.termEn].filter(Boolean) as string[]),
    summary: [v.summaryMl, v.summaryEn].filter(Boolean).join(" — "),
    chapters: (v.chapters ?? []).flatMap(
      (c) => [c.titleMl, c.titleEn].filter(Boolean) as string[],
    ),
    faqs: (v.faqs ?? []).map((f) => f.questionMl),
    transcript: v.transcriptMl ? chunkTranscript(v.transcriptMl) : [],
  };
}
