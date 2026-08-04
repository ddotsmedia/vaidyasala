/**
 * Semantic-layer helpers (§14): question detection, the hybrid trigger rule, and
 * Reciprocal Rank Fusion for merging lexical + vector result lists. Pure so they
 * unit-test without pgvector/Meili; the actual vector query + retrieval live in
 * the web app where Prisma is available.
 */

const ML_QUESTION_WORDS =
  /(എങ്ങനെ|എന്ത്|എന്തുകൊണ്ട്|എവിടെ|എപ്പോൾ|ആര്|ഏത്|ഉണ്ടോ|ആകുമോ|വേണോ|കഴിയുമോ)/;
const EN_QUESTION_WORDS = /\b(how|why|what|when|where|which|who|can|should|is|does|do|are)\b/i;

/** Is the query question-shaped? (§14 semantic trigger.) */
export function isQuestionShaped(query: string): boolean {
  const q = query.trim();
  if (q.endsWith("?")) return true;
  if (ML_QUESTION_WORDS.test(q)) return true;
  // English question word only counts when the query is multi-word (avoids
  // treating a bare keyword like "is" nonsense; questions are phrases).
  return EN_QUESTION_WORDS.test(q) && q.split(/\s+/).length >= 3;
}

/**
 * Trigger the semantic/hybrid layer when lexical is weak or the query is a
 * question (§14). `lexicalCount` is how many lexical hits the instant layer got.
 */
export function shouldRunSemantic(query: string, lexicalCount: number): boolean {
  return lexicalCount < 3 || isQuestionShaped(query);
}

export interface RankedRef {
  id: string;
  rank: number; // 1-based position in its own list
}

/**
 * Reciprocal Rank Fusion (§14 hybrid merge). Merges any number of ranked lists
 * into one score per id: score = Σ 1/(k + rank). Higher is better. `k`=60 is the
 * standard damping constant.
 */
export function rrfMerge(lists: RankedRef[][], k = 60): { id: string; score: number }[] {
  const scores = new Map<string, number>();
  for (const list of lists) {
    for (const { id, rank } of list) {
      scores.set(id, (scores.get(id) ?? 0) + 1 / (k + rank));
    }
  }
  return [...scores.entries()]
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score);
}

/** Minimum fused score for the AI-answer gate to compose rather than refuse (§14). */
export const ANSWER_MIN_SCORE = 0.01;
