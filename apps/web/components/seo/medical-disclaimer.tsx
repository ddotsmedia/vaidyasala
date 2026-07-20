import { REVIEWER } from "@/lib/seo/site";

/**
 * E-E-A-T block for medical pages (§7.3): a reviewed-by line + an "educational,
 * not medical advice" disclaimer. Server component, rendered on every medical
 * page (watch, article, topic). `lastReviewed` mirrors MedicalWebPage.lastReviewed.
 */
export function MedicalDisclaimer({
  lastReviewed,
  className,
}: {
  lastReviewed?: string | null;
  className?: string;
}) {
  return (
    <aside
      className={`border-border bg-surface text-text-dim rounded-xl border p-4 text-sm ${className ?? ""}`}
      aria-label="Medical disclaimer"
    >
      <p>
        <span className="text-text font-medium">Reviewed by:</span> {REVIEWER.name} —{" "}
        {REVIEWER.role}
        {lastReviewed ? ` · Last reviewed ${lastReviewed.slice(0, 10)}` : ""}
      </p>
      <p className="mt-2 leading-[1.7]">
        This content is for general educational purposes only and is not a substitute for
        professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare
        provider with any questions about a medical condition.
      </p>
    </aside>
  );
}
