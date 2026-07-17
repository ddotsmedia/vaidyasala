import type { Metadata } from "next";

export const metadata: Metadata = { title: "About" };

/** Trust page — E-E-A-T signal (§1.1, §7.3). */
export default function AboutPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 py-12">
      <h1 className="text-2xl font-semibold">About Vaidyasala</h1>
      <p className="text-text-dim leading-[1.8]">
        Vaidyasala makes trusted Malayalam health videos searchable and easy to learn from. We
        transcribe, correct, translate and summarise each video with AI, then a human editor reviews
        every draft before it is published.
      </p>
      <p className="text-text-dim leading-[1.8]">
        Our content is for general education only and is not a substitute for professional medical
        advice. Always consult a qualified doctor for diagnosis and treatment.
      </p>
    </div>
  );
}
