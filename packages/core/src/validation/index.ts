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
  props: z.record(z.string(), z.unknown()).optional(),
});
export type AnalyticsEventInput = z.infer<typeof analyticsEventSchema>;

export * from "./ai";
