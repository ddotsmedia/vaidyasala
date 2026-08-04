/**
 * Single source of truth for every Zod schema (§3). API routes, worker jobs,
 * and forms share these contracts. AI-output + DTO schemas land in Phase 2A.
 */
import { z } from "zod";

/** Cursor pagination envelope used across all feed APIs (§13). */
export const cursorPageSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type CursorPage = z.infer<typeof cursorPageSchema>;

/** Funnel analytics event ingest (§13 POST /api/v1/events). */
export const analyticsEventSchema = z.object({
  name: z.string().min(1).max(64),
  videoId: z.string().max(64).optional(),
  props: z.record(z.string(), z.unknown()).optional(),
});
export type AnalyticsEventInput = z.infer<typeof analyticsEventSchema>;

/** Newsletter double opt-in (§13 POST /api/v1/newsletter/subscribe). */
export const newsletterSubscribeSchema = z.object({
  email: z.string().email().max(254),
});
export type NewsletterSubscribeInput = z.infer<typeof newsletterSubscribeSchema>;

/** Canonical funnel event names (§6.1 money flow). */
export const FUNNEL_EVENTS = {
  play: "play",
  progress25: "progress_25",
  progress50: "progress_50",
  progress75: "progress_75",
  complete: "complete",
  chainPlay: "chain_play",
  chapterSeek: "chapter_seek",
  subscribeClick: "subscribe_click",
  share: "share",
} as const;
export type FunnelEvent = (typeof FUNNEL_EVENTS)[keyof typeof FUNNEL_EVENTS];

/** Public search query (§13/§14 GET /api/v1/search). */
export const searchQuerySchema = z.object({
  q: z.string().trim().min(1).max(120),
  limit: z.coerce.number().int().min(1).max(10).default(5),
});
export type SearchQueryInput = z.infer<typeof searchQuerySchema>;

/** AI answer request (§6.4/§14 POST /api/v1/ai/answer). */
export const aiAnswerSchema = z.object({
  question: z.string().trim().min(3).max(300),
});
export type AiAnswerInput = z.infer<typeof aiAnswerSchema>;

export * from "./ai";
