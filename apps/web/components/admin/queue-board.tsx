"use client";
import { useEffect, useState } from "react";
import { Badge, Button } from "@vaidyasala/ui";
import type { JobRow } from "@/lib/admin/data";

const COLUMNS = ["queued", "active", "done", "failed"] as const;
type Column = (typeof COLUMNS)[number];

const BADGE: Record<Column, "default" | "brand" | "outline"> = {
  queued: "outline",
  active: "brand",
  done: "default",
  failed: "outline",
};

/** Live QueueBoard (§4 Tier-3, §6.5): SSE-driven job columns + retry action. */
export function QueueBoard({ initial }: { initial: JobRow[] }) {
  const [jobs, setJobs] = useState<JobRow[]>(initial);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const es = new EventSource("/api/v1/admin/queue/stream");
    es.onopen = () => setConnected(true);
    es.onmessage = (e) => {
      try {
        setJobs(JSON.parse(e.data) as JobRow[]);
      } catch {
        /* ignore malformed frame */
      }
    };
    es.onerror = () => setConnected(false);
    return () => es.close();
  }, []);

  async function retry(job: JobRow): Promise<void> {
    await fetch(`/api/v1/admin/queue/${encodeURIComponent(job.id)}/retry`, { method: "POST" });
  }

  const byColumn = (col: Column): JobRow[] => jobs.filter((j) => j.status === col);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-sm">
        <span
          className={`inline-block size-2 rounded-full ${connected ? "bg-brand" : "bg-border"}`}
          aria-hidden
        />
        <span className="text-text-dim">{connected ? "Live" : "Reconnecting…"}</span>
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {COLUMNS.map((col) => {
          const items = byColumn(col);
          return (
            <div key={col} className="border-border bg-surface rounded-lg border p-3">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold capitalize">{col}</h2>
                <Badge variant={BADGE[col]}>{items.length}</Badge>
              </div>
              <ul className="flex flex-col gap-2">
                {items.length === 0 ? (
                  <li className="text-text-dim text-xs">No jobs</li>
                ) : (
                  items.map((j) => (
                    <li key={j.id} className="border-border rounded-md border p-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{j.kind}</span>
                        {j.attempts > 0 ? (
                          <span className="text-text-dim">×{j.attempts}</span>
                        ) : null}
                      </div>
                      {j.videoId ? (
                        <div className="text-text-dim truncate">{j.videoId}</div>
                      ) : null}
                      {j.error ? (
                        <div className="mt-1 truncate text-red-500" title={j.error}>
                          {j.error}
                        </div>
                      ) : null}
                      {col === "failed" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => void retry(j)}
                        >
                          Retry
                        </Button>
                      ) : null}
                    </li>
                  ))
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
