import { describe, expect, it, vi } from "vitest";
import { SarvamClient, type SarvamProgress } from "./client";

const ref = { bucket: "media", key: "audio/abc.m4a" };
const resolveUrl = async (): Promise<string> => "https://cdn.test/audio/abc.m4a";
const noSleep = async (): Promise<void> => {};

function jsonRes(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

describe("SarvamClient", () => {
  it("uses the sync endpoint for short audio and maps timestamps", async () => {
    const urls: string[] = [];
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      urls.push(String(url));
      return jsonRes({
        transcript: "രോഗം",
        segments: [{ start: 0.4, end: 2.6, text: " രോഗം " }],
        duration_seconds: 12,
      });
    });
    const client = new SarvamClient({
      apiKey: "k",
      resolveUrl,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleepImpl: noSleep,
    });

    const { result, cost } = await client.transcribe(ref, { durationSec: 12 });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(urls[0]).toContain("/speech-to-text");
    expect(urls[0]).not.toContain("-job");
    expect(result.asrProvider).toBe("sarvam");
    // Segment bounds widen to whole seconds, and text is trimmed.
    expect(result.segments).toEqual([{ startSec: 0, endSec: 3, textMl: "രോഗം" }]);
    expect(cost.usd).toBeGreaterThan(0);
  });

  it("switches to the batch job API past the duration threshold and polls to completion", async () => {
    const states = ["queued", "running", "completed"];
    let poll = 0;
    const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const u = String(url);
      if (init?.method === "POST") return jsonRes({ job_id: "job-1", job_state: "queued" });
      const state = states[Math.min(poll++, states.length - 1)];
      expect(u).toContain("/speech-to-text-job/job-1");
      return jsonRes(
        state === "completed"
          ? {
              job_state: "completed",
              output: {
                transcript: "പനി",
                timestamps: [{ start_time_seconds: 1, end_time_seconds: 4, transcript: "പനി" }],
                duration_seconds: 900,
              },
            }
          : { job_state: state },
      );
    });

    const seen: SarvamProgress[] = [];
    const client = new SarvamClient({
      apiKey: "k",
      resolveUrl,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleepImpl: noSleep,
      jobThresholdSec: 300,
    });

    const { result } = await client.transcribe(ref, {
      durationSec: 900,
      onProgress: (p) => seen.push(p),
    });

    expect(result.segments).toEqual([{ startSec: 1, endSec: 4, textMl: "പനി" }]);
    // The alternate `timestamps` + `transcript` field names must map too.
    expect(result.rawMl).toBe("പനി");

    expect(seen.map((p) => p.phase)).toEqual(
      expect.arrayContaining(["resolving", "submitted", "transcribing", "done"]),
    );
    expect(seen.at(-1)).toMatchObject({ phase: "done", ratio: 1 });
    // Progress never claims completion before the job actually finishes.
    const midway = seen.filter((p) => p.phase === "transcribing");
    expect(midway.every((p) => p.ratio < 1)).toBe(true);
    expect(seen.find((p) => p.phase === "submitted")?.jobId).toBe("job-1");
  });

  it("throws with the provider's reason when a job fails", async () => {
    const fetchImpl = vi.fn(async (_url: string | URL | Request, init?: RequestInit) =>
      init?.method === "POST"
        ? jsonRes({ job_id: "job-2" })
        : jsonRes({ job_state: "failed", error_message: "audio unreadable" }),
    );
    const client = new SarvamClient({
      apiKey: "k",
      resolveUrl,
      fetchImpl: fetchImpl as unknown as typeof fetch,
      sleepImpl: noSleep,
    });

    await expect(client.transcribe(ref, { mode: "job" })).rejects.toThrow(/audio unreadable/);
  });

  it("refuses to run without an API key", async () => {
    const client = new SarvamClient({ apiKey: undefined, resolveUrl, sleepImpl: noSleep });
    // Guard against a stray key in the ambient env making this a false pass.
    if (client.configured) return;
    await expect(client.transcribe(ref)).rejects.toThrow(/SARVAM_API_KEY missing/);
  });
});
