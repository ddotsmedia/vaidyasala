import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 py-12">
      <h1 className="text-2xl font-semibold">Terms of use</h1>
      <p className="text-text-dim leading-[1.8]">
        Vaidyasala provides health education content for general information only. It is not medical
        advice, diagnosis, or treatment. Use of this site is at your own discretion.
      </p>
      <p className="text-text-dim leading-[1.8]">
        Video content is sourced from the linked YouTube channel and remains the property of its
        creators. Article summaries are generated from that content and reviewed by our editors.
      </p>
    </div>
  );
}
