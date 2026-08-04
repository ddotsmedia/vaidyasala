import { validation } from "@vaidyasala/core";
import { classifyScript } from "@vaidyasala/core/search";
import { prisma } from "@vaidyasala/db";
import { composeAnswer, nearestTopics, retrieveSegments } from "@/lib/answer";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/v1/ai/answer (§6.4/§14) — retrieval-only, streamed (SSE). Composes an
 * answer FROM RETRIEVED TRANSCRIPT SEGMENTS ONLY, each citation a playable
 * [videoId,startSec] chip. Below threshold → honest no-answer + nearest topics,
 * and the question is logged as a content gap. Never answers from model memory.
 */
export async function POST(req: Request): Promise<Response> {
  if (!rateLimit(`answer:${clientIp(req)}`, 10, 10_000)) {
    return new Response(JSON.stringify({ error: "rate_limited" }), { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid JSON" }), { status: 400 });
  }
  const parsed = validation.aiAnswerSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "validation", issues: parsed.error.flatten() }), {
      status: 422,
    });
  }
  const { question } = parsed.data;
  const script = classifyScript(question);

  // All async work happens up front; the stream only replays the events. This
  // avoids the eager-close race that fails to pipe when the handler finishes
  // before the response body is attached.
  const segments = await retrieveSegments(question);
  const events: unknown[] = [];

  if (segments.length === 0) {
    const topics = await nearestTopics(question);
    events.push({ type: "no_answer", topics });
    await prisma.searchQueryLog
      .create({ data: { query: question, script, results: 0 } })
      .catch(() => {});
  } else {
    const { answer, citations } = await composeAnswer(question, segments);
    for (const word of answer.split(/(\s+)/)) {
      if (word) events.push({ type: "token", text: word });
    }
    events.push({ type: "citations", citations });
    await prisma.searchQueryLog
      .create({ data: { query: question, script, results: citations.length } })
      .catch(() => {});
  }
  events.push({ type: "done" });

  const encoder = new TextEncoder();
  let i = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (i >= events.length) {
        controller.close();
        return;
      }
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(events[i++])}\n\n`));
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-store, no-transform",
    },
  });
}
