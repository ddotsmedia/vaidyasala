import { describe, expect, it } from "vitest";
import { buildVideoSearchDoc } from "./mapper";

describe("buildVideoSearchDoc", () => {
  it("projects a video into a weighted search document", () => {
    const doc = buildVideoSearchDoc({
      id: "v1",
      slug: "prameham-x",
      titleMl: "പ്രമേഹം",
      titleEn: "Diabetes",
      status: "PUBLISHED",
      durationSec: 600,
      publishedAt: new Date("2026-01-01T00:00:00Z"),
      primaryTopic: { slug: "prameham", nameMl: "പ്രമേഹം", nameEn: "Diabetes" },
      summaryMl: "സംഗ്രഹം",
      summaryEn: "summary",
      keywords: [{ termMl: "പഞ്ചസാര", termEn: "sugar" }],
      chapters: [{ titleMl: "ലക്ഷണങ്ങൾ", titleEn: "Symptoms" }],
      faqs: [{ questionMl: "പ്രമേഹം മാറുമോ?" }],
      transcriptMl: "a".repeat(2500),
    });

    expect(doc.id).toBe("v1");
    expect(doc.topicSlug).toBe("prameham");
    expect(doc.keywords).toContain("sugar");
    expect(doc.chapters).toContain("Symptoms");
    expect(doc.faqs).toHaveLength(1);
    expect(doc.transcript.length).toBe(3); // 2500 chars → 3 × 1000-char chunks
    expect(doc.publishedAt).toBeTypeOf("number");
  });

  it("handles a bare video with no enrichment", () => {
    const doc = buildVideoSearchDoc({
      id: "v2",
      slug: "x",
      titleMl: "ടൈറ്റിൽ",
      status: "DRAFT",
      durationSec: 60,
    });
    expect(doc.titleEn).toBe("");
    expect(doc.transcript).toEqual([]);
    expect(doc.publishedAt).toBeNull();
  });
});
