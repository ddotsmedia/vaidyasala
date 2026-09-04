import "server-only";
import { env } from "./env";

let deepgram: any = null;

function getDeepgram(): any {
  if (!deepgram && env.DEEPGRAM_API_KEY) {
    const { Deepgram } = require("@deepgram/sdk");
    deepgram = new Deepgram({ apiKey: env.DEEPGRAM_API_KEY });
  }
  return deepgram;
}

export interface TranscriptionResult {
  transcript: string;
  confidence: number;
  words: Array<{
    word: string;
    start: number;
    end: number;
    confidence: number;
    punctuated_word?: string;
  }>;
}

/**
 * Transcribe a YouTube video using Deepgram.
 * Uses the public YouTube URL, Deepgram handles fetching the audio.
 */
export async function transcribeYoutubeVideo(youtubeId: string): Promise<TranscriptionResult> {
  if (!env.DEEPGRAM_API_KEY) {
    // BLOCKED: Deepgram API key not set
    console.warn("[deepgram] DEEPGRAM_API_KEY not configured, skipping transcription");
    return {
      transcript: "",
      confidence: 0,
      words: [],
    };
  }

  try {
    const videoUrl = `https://www.youtube.com/watch?v=${youtubeId}`;
    const dg = getDeepgram();

    const response = await dg.listen.preRecorded.transcribeUrl(
      { url: videoUrl },
      {
        model: "nova-3",
        language: "en",
        smart_format: true,
        punctuate: true,
        paragraphs: true,
        filler_words: false,
      } as any
    );

    const alternative = response.results?.results?.[0]?.alternatives?.[0];

    if (!alternative) {
      throw new Error("No transcription alternative found");
    }

    return {
      transcript: alternative.transcript || "",
      confidence: alternative.confidence || 0,
      words: (alternative.words || []).map((w: any) => ({
        word: w.word,
        start: w.start,
        end: w.end,
        confidence: w.confidence,
        punctuated_word: w.punctuated_word || w.word,
      })),
    };
  } catch (error) {
    console.error(`[deepgram] Transcription failed for ${youtubeId}:`, error);
    throw error;
  }
}

/**
 * Generate WebVTT subtitle file from word timings.
 * Format: HH:MM:SS.mmm --> HH:MM:SS.mmm\ntext
 */
export function generateVTT(words: TranscriptionResult["words"]): string {
  let vtt = "WEBVTT\n\n";

  words.forEach((word) => {
    const start = formatTime(word.start);
    const end = formatTime(word.end);
    vtt += `${start} --> ${end}\n${word.punctuated_word}\n\n`;
  });

  return vtt;
}

/**
 * Format seconds to WebVTT time format: HH:MM:SS.mmm
 */
function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${ms.toString().padStart(3, "0")}`;
}

/**
 * Extract full transcript text from words.
 */
export function extractTranscript(words: TranscriptionResult["words"]): string {
  return words.map((w) => w.punctuated_word).join(" ");
}
