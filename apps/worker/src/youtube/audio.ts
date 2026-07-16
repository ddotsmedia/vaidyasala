import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { env } from "../env";

const execFileAsync = promisify(execFile);

export interface ExtractedAudio {
  bytes: Uint8Array;
  contentType: string;
}

/** Extracts m4a audio for a video (yt-dlp + ffmpeg). Injectable for tests. */
export interface AudioExtractor {
  extract(youtubeId: string): Promise<ExtractedAudio>;
}

/**
 * Real extractor: `yt-dlp -x --audio-format m4a`. Requires yt-dlp + ffmpeg on
 * PATH; a missing binary surfaces a clearly-marked BLOCKED error (§2B: absent ⇒
 * audio step skipped, ingest continues).
 */
export function createAudioExtractor(
  ytDlpPath: string = env.YT_DLP_PATH,
  exec: typeof execFileAsync = execFileAsync,
): AudioExtractor {
  return {
    async extract(youtubeId: string): Promise<ExtractedAudio> {
      const dir = await mkdtemp(join(tmpdir(), "vaidyasala-audio-"));
      const out = join(dir, `${youtubeId}.m4a`);
      try {
        await exec(
          ytDlpPath,
          [
            "-f",
            "bestaudio[ext=m4a]/bestaudio/best",
            "-x",
            "--audio-format",
            "m4a",
            "--no-warnings",
            "-o",
            out,
            `https://www.youtube.com/watch?v=${youtubeId}`,
          ],
          { maxBuffer: 16 * 1024 * 1024 },
        );
        const bytes = await readFile(out);
        return { bytes, contentType: "audio/mp4" };
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "ENOENT") {
          // BLOCKED: yt-dlp/ffmpeg not installed — install to enable audio extraction.
          throw new Error("audio extraction unavailable: yt-dlp not found on PATH");
        }
        throw err;
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
  };
}
