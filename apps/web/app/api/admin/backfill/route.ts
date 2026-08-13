import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import {
  BACKFILL_JOB_NAME,
  backfillJobSchema,
  type BackfillJobData,
} from "@vaidyasala/core/queue";
import { authorize } from "@/lib/authz";
import { backfillQueue } from "@/lib/queue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Two ways in, because this endpoint has two callers:
 *   · an ADMIN session cookie, for the admin UI;
 *   · a bearer token, for curl/CI — a browser session cannot be scripted.
 *
 * The token is opt-in: with ADMIN_API_TOKEN unset (falling back to
 * ADMIN_INGEST_TOKEN, which deployments already have), only the session path
 * works. It is never a default-open door.
 */
async function authorizeRequest(
  req: Request,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  // Truthiness, not `??`: a present-but-empty ADMIN_API_TOKEN (what a
  // mis-quoted `echo "ADMIN_API_TOKEN=$(openssl rand -hex 16)"` writes when the
  // substitution happens on the wrong side of an ssh quote) is "" — not nullish
  // — and would silently disable the ADMIN_INGEST_TOKEN fallback.
  const expected = firstNonEmpty(process.env.ADMIN_API_TOKEN, process.env.ADMIN_INGEST_TOKEN);
  const provided =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    req.headers.get("x-admin-token") ??
    "";

  if (expected && provided && constantTimeEquals(provided, expected)) return { ok: true };

  const authz = await authorize("ADMIN");
  if (authz.ok) return { ok: true };
  const reason = authz.reason ?? "unauthenticated";
  return {
    ok: false,
    status: reason === "unauthenticated" ? 401 : 403,
    error: reason,
  };
}

/** First value that is set and not blank. A blank secret is not a secret. */
function firstNonEmpty(...values: (string | undefined)[]): string | undefined {
  for (const v of values) {
    const trimmed = v?.trim();
    if (trimmed) return trimmed;
  }
  return undefined;
}

/** Compare without leaking length or position through timing. */
function constantTimeEquals(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/**
 * Admin control for the channel backfill (§7B step 2).
 *
 * ADMIN-gated (session cookie, or ADMIN_API_TOKEN for scripted access). Without
 * auth an unauthenticated POST could import the whole catalogue or publish every
 * unreviewed video — the queue name and body shape are in the repo, so the
 * endpoint would be trivially guessable.
 *
 * The job contract lives in @vaidyasala/core/queue, NOT in apps/worker: web and
 * worker are separate deployables with no dependency edge between them, and a
 * cross-app import breaks the web build.
 */

/** GET — queue depth and recent jobs, for the admin UI. */
export async function GET(req: Request): Promise<Response> {
  const auth = await authorizeRequest(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const [active, delayed, waiting, completed, failed] = await Promise.all([
      backfillQueue.getActiveCount(),
      backfillQueue.getDelayedCount(),
      backfillQueue.getWaitingCount(),
      backfillQueue.getCompletedCount(),
      backfillQueue.getFailedCount(),
    ]);

    const jobs = await backfillQueue.getJobs(["active", "waiting", "completed", "failed"], 0, 9);
    const recentJobs = await Promise.all(
      // getState() is async — awaiting it matters, or every job serialises as {}.
      jobs.map(async (job) => ({
        id: job.id,
        state: await job.getState(),
        data: job.data as BackfillJobData,
        progress: job.progress,
        attemptsMade: job.attemptsMade,
        failedReason: job.failedReason,
        finishedOn: job.finishedOn,
        timestamp: job.timestamp,
      })),
    );

    return NextResponse.json(
      { queue: { active, delayed, waiting, completed, failed }, recentJobs },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (err) {
    console.error("[backfill-api] GET failed:", err);
    return NextResponse.json({ error: "queue unavailable" }, { status: 503 });
  }
}

/** POST — queue an import or a publish pass. */
export async function POST(req: Request): Promise<Response> {
  const auth = await authorizeRequest(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    json = {};
  }
  const parsed = backfillJobSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid body", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    // One catalogue-wide pass at a time; a second would double every write.
    const [active, waiting] = await Promise.all([
      backfillQueue.getActiveCount(),
      backfillQueue.getWaitingCount(),
    ]);
    if (active + waiting > 0) {
      return NextResponse.json(
        { error: "a backfill is already queued or running" },
        { status: 409 },
      );
    }

    const job = await backfillQueue.add(BACKFILL_JOB_NAME, parsed.data, {
      attempts: 2,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: { age: 86_400, count: 20 },
      removeOnFail: { age: 604_800 },
    });

    return NextResponse.json(
      { jobId: job.id, ...parsed.data },
      { status: 202, headers: { "cache-control": "no-store" } },
    );
  } catch (err) {
    console.error("[backfill-api] POST failed:", err);
    return NextResponse.json({ error: "could not queue job" }, { status: 503 });
  }
}
