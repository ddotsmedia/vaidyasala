-- DropIndex
DROP INDEX "Article_embedding_hnsw";

-- DropIndex
DROP INDEX "TranscriptSegmentVector_embedding_hnsw";

-- DropIndex
DROP INDEX "Video_embedding_hnsw";

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);
