import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 py-12">
      <h1 className="text-2xl font-semibold">Privacy policy</h1>
      <p className="text-text-dim leading-[1.8]">
        We collect the minimum needed to run the service: an anonymous device key to power Continue
        Watching, and — only if you subscribe to the newsletter — your email address. We do not
        collect health data about you.
      </p>
      <p className="text-text-dim leading-[1.8]">
        You can unsubscribe from the newsletter at any time. Contact us to request deletion of your
        data.
      </p>
    </div>
  );
}
