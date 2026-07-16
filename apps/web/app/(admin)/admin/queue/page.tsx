import type { Metadata } from "next";
import { getJobSnapshot } from "@/lib/admin/data";
import { QueueBoard } from "@/components/admin/queue-board";

export const metadata: Metadata = { title: "Queue" };
export const dynamic = "force-dynamic";

export default async function QueuePage() {
  const initial = await getJobSnapshot();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Job queue</h1>
      <QueueBoard initial={initial} />
    </div>
  );
}
