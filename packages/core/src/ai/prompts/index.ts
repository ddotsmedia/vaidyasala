/**
 * Prompt templates as code (§8.2). Each builder returns a PromptTask with the
 * hallucination rules and glossary injection point baked in. Kept pure and
 * deterministic so they can be unit-tested without any API calls.
 */
import type { PromptTask } from "../types";
import type { TranscriptSegment } from "../../validation/ai";
import { HALLUCINATION_RULES, renderGlossary, type GlossaryEntry } from "./glossary";

function segmentsBlock(segments: TranscriptSegment[]): string {
  return segments.map((s) => `[${s.startSec}-${s.endSec}] ${s.textMl}`).join("\n");
}

/** Step 2 — correct ASR Malayalam. Chunk upstream (3k tokens, overlap) in the job. */
export function correctMlPrompt(
  rawMl: string,
  glossary?: GlossaryEntry[],
): PromptTask {
  return {
    kind: "correct",
    tier: "workhorse",
    system: `You correct Malayalam ASR transcripts of health videos. Fix recognition errors, punctuation, and medical-term spelling ONLY. Do not paraphrase or add content.\n\nGLOSSARY:\n${renderGlossary(glossary)}\n\n${HALLUCINATION_RULES}`,
    user: `Correct the following Malayalam transcript. Return JSON: {"correctedMl": string, "changedRatio": number (0-1 fraction of tokens changed), "flaggedForReview": boolean (true if changedRatio > 0.4)}.\n\nTRANSCRIPT:\n${rawMl}`,
  };
}

/** Step 3 — segment-aligned English translation. */
export function translatePrompt(segments: TranscriptSegment[]): PromptTask {
  return {
    kind: "translate",
    tier: "workhorse",
    system: `You translate Malayalam health-video transcripts to clear English, segment by segment so timestamps stay clickable.\n\n${HALLUCINATION_RULES}`,
    user: `Translate each segment. Return JSON: {"english": string (full translation), "segments": [{"startSec": number, "textEn": string}]}.\n\nSEGMENTS:\n${segmentsBlock(segments)}`,
  };
}

/** Step 4 — chapterize (only when YT chapters are absent). */
export function chapterizePrompt(segments: TranscriptSegment[]): PromptTask {
  return {
    kind: "chapterize",
    tier: "cheap",
    system: `You segment a health video into 3-8 chapters at topic shifts. Titles are short Malayalam phrases.\n\n${HALLUCINATION_RULES}`,
    user: `Return JSON: {"chapters": [{"startSec": number, "titleMl": string, "titleEn": string}]}. Base chapter boundaries only on the segments below.\n\nSEGMENTS:\n${segmentsBlock(segments)}`,
  };
}

/** Step 5 — one structured enrichment call. */
export function enrichPrompt(
  correctedMl: string,
  glossary?: GlossaryEntry[],
): PromptTask {
  return {
    kind: "enrich",
    tier: "workhorse",
    system: `You produce structured metadata for a Malayalam health video from its corrected transcript.\n\nGLOSSARY:\n${renderGlossary(glossary)}\n\n${HALLUCINATION_RULES}`,
    user: `Return JSON matching this shape: {"summaryMl": string, "summaryEn": string, "keyTakeaways": [{"ml": string, "en": string}], "faqs": [{"questionMl": string, "answerMl": string, "timestampSec"?: number}], "keywords": [{"termMl": string, "termEn"?: string, "kind": "disease"|"symptom"|"medicine"|"generic"}], "seoTitle": string, "seoDescription": string, "socialSnippets": {"instagram": string, "whatsapp": string, "facebook": string, "x": string}, "newsletterMd": string}.\n\nTRANSCRIPT:\n${correctedMl}`,
  };
}

/** Step 6 — long-form article with claim→segment verification. */
export function articlePrompt(segments: TranscriptSegment[]): PromptTask {
  return {
    kind: "article",
    tier: "workhorse",
    system: `You write an SEO-oriented long-form MDX article derived strictly from the transcript. Headings target search queries. Every factual claim must trace to a transcript segment.\n\n${HALLUCINATION_RULES}`,
    user: `Return JSON: {"titleMl": string, "bodyMl": string (MDX), "readingMin": number, "claims": [{"text": string, "segmentStartSec": number|null}]}. For each claim, set segmentStartSec to the startSec of the supporting segment, or null if unsupported (unsupported claims must not appear in bodyMl).\n\nSEGMENTS:\n${segmentsBlock(segments)}`,
  };
}

export { HALLUCINATION_RULES, renderGlossary, SEED_GLOSSARY } from "./glossary";
export type { GlossaryEntry } from "./glossary";
