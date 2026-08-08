-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "featuredAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Video_featuredAt_idx" ON "Video"("featuredAt" DESC);
