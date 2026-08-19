-- AlterTable: Add English metadata to Video
ALTER TABLE "Video" ADD COLUMN "titleEnAuto" VARCHAR;

-- Create index for keyword search
CREATE INDEX IF NOT EXISTS "idx_video_title_en_auto" ON "Video"("titleEnAuto");
