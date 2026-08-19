import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { NewsletterForm } from "@/components/home/newsletter-form";

export const metadata: Metadata = pageMetadata({
  title: "Weekly newsletter",
  description:
    "A weekly Malayalam digest of new health videos and the questions they answer. One email, no spam.",
  path: "/newsletter",
});

export default async function NewsletterPage({
  searchParams,
}: {
  searchParams: Promise<{ confirmed?: string; error?: string }>;
}) {
  const { confirmed, error } = await searchParams;
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 py-16">
      <h1 className="text-2xl font-semibold">Weekly newsletter</h1>
      <p className="text-text-dim text-sm">
        A weekly digest of new Malayalam health videos, delivered every Tuesday. Double opt-in — we
        only email after you confirm.
      </p>
      {confirmed ? (
        <p className="bg-brand/15 text-brand rounded-md px-4 py-3 text-sm">
          Subscription confirmed — welcome aboard!
        </p>
      ) : error ? (
        <p className="rounded-md bg-red-500/10 px-4 py-3 text-sm text-red-500">
          That confirmation link is invalid or expired. Please subscribe again.
        </p>
      ) : null}
      <NewsletterForm />
    </div>
  );
}
