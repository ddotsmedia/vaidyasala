/**
 * Zod schemas for every AI output shape (§8.1/§8.2). One contract shared by the
 * worker jobs that produce them and the DB writers that persist them. Every AI
 * call parses its output through one of these (with repair-retry, see ai/json).
 */
import { z } from "zod";

/** A time-aligned transcript segment (Malayalam, optional English). */
export const transcriptSegmentSchema = z.object({
  startSec: z.number().int().nonnegative(),
  endSec: z.number().int().nonnegative(),
  textMl: z.string(),
  textEn: z.string().optional(),
});
export type TranscriptSegment = z.infer<typeof transcriptSegmentSchema>;

/** Step 1 — ASR output. */
export const asrResultSchema = z.object({
  segments: z.array(transcriptSegmentSchema).min(1),
  rawMl: z.string(),
  asrProvider: z.enum(["sarvam", "whisper", "youtube-captions"]),
  qualityScore: z.number().min(0).max(1).optional(),
});
export type AsrResult = z.infer<typeof asrResultSchema>;

/** Step 2 — Malayalam correction. `changedRatio` drives the >40% diff-guard. */
export const correctionResultSchema = z.object({
  correctedMl: z.string(),
  changedRatio: z.number().min(0).max(1),
  flaggedForReview: z.boolean(),
  notes: z.string().optional(),
});
export type CorrectionResult = z.infer<typeof correctionResultSchema>;

/** Step 3 — segment-aligned English translation. */
export const translationResultSchema = z.object({
  english: z.string(),
  segments: z
    .array(z.object({ startSec: z.number().int().nonnegative(), textEn: z.string() }))
    .min(1),
});
export type TranslationResult = z.infer<typeof translationResultSchema>;

/** Step 4 — chapter set. */
export const chapterSetSchema = z.object({
  chapters: z
    .array(
      z.object({
        startSec: z.number().int().nonnegative(),
        titleMl: z.string().min(1),
        titleEn: z.string().optional(),
      }),
    )
    .min(1),
});
export type ChapterSet = z.infer<typeof chapterSetSchema>;

/** Step 5 — enrichment (one structured call → one Enrichment row). */
export const enrichmentResultSchema = z.object({
  summaryMl: z.string(),
  summaryEn: z.string(),
  keyTakeaways: z.array(z.object({ ml: z.string(), en: z.string() })).min(1),
  faqs: z
    .array(
      z.object({
        questionMl: z.string(),
        answerMl: z.string(),
        questionEn: z.string().optional(),
        answerEn: z.string().optional(),
        timestampSec: z.number().int().nonnegative().optional(),
      }),
    )
    .default([]),
  keywords: z
    .array(
      z.object({
        termMl: z.string(),
        termEn: z.string().optional(),
        kind: z.enum(["disease", "symptom", "medicine", "generic"]),
      }),
    )
    .default([]),
  seoTitle: z.string(),
  seoDescription: z.string(),
  socialSnippets: z.object({
    instagram: z.string(),
    whatsapp: z.string(),
    facebook: z.string(),
    x: z.string(),
  }),
  newsletterMd: z.string(),
});
export type EnrichmentResult = z.infer<typeof enrichmentResultSchema>;

/** Step 6 — long-form article draft (MDX). Each claim maps to a source segment. */
export const articleDraftSchema = z.object({
  titleMl: z.string().min(1),
  bodyMl: z.string().min(1),
  bodyEn: z.string().optional(),
  readingMin: z.number().int().positive(),
  claims: z
    .array(
      z.object({
        text: z.string(),
        segmentStartSec: z.number().int().nonnegative().nullable(),
      }),
    )
    .default([]),
});
export type ArticleDraft = z.infer<typeof articleDraftSchema>;
