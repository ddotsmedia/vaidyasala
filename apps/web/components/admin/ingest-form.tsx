"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, Input } from "@vaidyasala/ui";

/** Paste a YouTube URL → POST the admin ingest endpoint (§6.5). */
export function IngestForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setPending(true);
    setMsg(null);
    const res = await fetch("/api/v1/admin/videos/ingest", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url }),
    });
    setPending(false);
    if (res.ok) {
      const body = (await res.json()) as { youtubeId: string };
      setMsg(`Queued ingest for ${body.youtubeId}`);
      setUrl("");
      router.refresh();
    } else {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setMsg(`Error: ${body.error ?? res.status}`);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
      <Input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://www.youtube.com/watch?v=…"
        required
        className="sm:flex-1"
      />
      <Button type="submit" variant="cta" disabled={pending}>
        {pending ? "Queuing…" : "Ingest"}
      </Button>
      {msg ? <span className="text-text-dim self-center text-sm">{msg}</span> : null}
    </form>
  );
}
