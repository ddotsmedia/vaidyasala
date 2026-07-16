import { authorize } from "@/lib/authz";
import { getJobSnapshot } from "@/lib/admin/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/v1/admin/queue/stream — SSE live job states for the QueueBoard (§13,
 * §6.5). Polls the Job mirror every 2s and pushes a snapshot. EDITOR+.
 */
export async function GET(req: Request): Promise<Response> {
  const authz = await authorize("EDITOR");
  if (!authz.ok) {
    return new Response(authz.reason, {
      status: authz.reason === "unauthenticated" ? 401 : 403,
    });
  }

  const encoder = new TextEncoder();
  let timer: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    async start(controller) {
      const push = async (): Promise<void> => {
        try {
          const jobs = await getJobSnapshot();
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(jobs)}\n\n`));
        } catch {
          // transient DB hiccup — keep the stream alive, next tick retries.
        }
      };
      await push();
      timer = setInterval(() => void push(), 2000);
      req.signal.addEventListener("abort", () => {
        if (timer) clearInterval(timer);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      });
    },
    cancel() {
      if (timer) clearInterval(timer);
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}
