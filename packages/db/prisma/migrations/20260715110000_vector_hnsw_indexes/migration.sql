-- HNSW indexes for pgvector cosine similarity (§2, §8.2, §14).
-- Prisma cannot express indexes on Unsupported("vector") columns, so they are
-- created here by hand. Cosine distance (vector_cosine_ops) matches the
-- normalized-embedding retrieval used by semantic search and AI answers.

-- Per-segment vectors: the hot path for semantic search + AI answer retrieval.
CREATE INDEX IF NOT EXISTS "TranscriptSegmentVector_embedding_hnsw"
  ON "TranscriptSegmentVector"
  USING hnsw ("embedding" vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Video-level embedding (title+summary) for related/"more like this".
CREATE INDEX IF NOT EXISTS "Video_embedding_hnsw"
  ON "Video"
  USING hnsw ("embedding" vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Article embedding for cross-surface semantic recall.
CREATE INDEX IF NOT EXISTS "Article_embedding_hnsw"
  ON "Article"
  USING hnsw ("embedding" vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
