-- AlterTable
ALTER TABLE "WatchProgress" ADD COLUMN     "watchedPercentage" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "VideoReaction" (
    "id" TEXT NOT NULL,
    "viewerKey" TEXT NOT NULL,
    "userId" TEXT,
    "videoId" TEXT NOT NULL,
    "liked" BOOLEAN NOT NULL DEFAULT false,
    "bookmarked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoReaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VideoReaction_videoId_idx" ON "VideoReaction"("videoId");

-- CreateIndex
CREATE INDEX "VideoReaction_userId_idx" ON "VideoReaction"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VideoReaction_viewerKey_videoId_key" ON "VideoReaction"("viewerKey", "videoId");
