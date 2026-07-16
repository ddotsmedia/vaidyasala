import Link from "next/link";
import { prisma } from "@vaidyasala/db";
import { IngestForm } from "@/components/admin/ingest-form";

export const dynamic = "force-dynamic";

async function counts() {
  const [total, processing, draft, published] = await Promise.all([
    prisma.video.count(),
    prisma.video.count({ where: { status: { in: ["INGESTING", "PROCESSING"] } } }),
    prisma.video.count({ where: { status: "DRAFT" } }),
    prisma.video.count({ where: { status: "PUBLISHED" } }),
  ]);
  return { total, processing, draft, published };
}

export default async function AdminDashboard() {
  const c = await counts();
  const tiles = [
    { label: "Total videos", value: c.total },
    { label: "Processing", value: c.processing },
    { label: "Draft (review)", value: c.draft },
    { label: "Published", value: c.published },
  ];
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h1 className="text-xl font-semibold">Ingest a video</h1>
        <IngestForm />
      </section>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="border-border bg-surface rounded-lg border p-4">
            <div className="text-2xl font-semibold">{t.value}</div>
            <div className="text-text-dim text-sm">{t.label}</div>
          </div>
        ))}
      </section>

      <div className="flex gap-4 text-sm">
        <Link href="/admin/queue" className="text-brand hover:underline">
          → Queue board
        </Link>
        <Link href="/admin/videos?status=DRAFT" className="text-brand hover:underline">
          → Review drafts
        </Link>
      </div>
    </div>
  );
}
