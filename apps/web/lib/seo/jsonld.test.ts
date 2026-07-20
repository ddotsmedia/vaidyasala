import { describe, expect, it } from "vitest";
import {
  articleLd,
  breadcrumbLd,
  collectionPageLd,
  faqPageLd,
  medicalConditionLd,
  medicalWebPageLd,
  organizationLd,
  videoObjectLd,
  websiteLd,
} from "./jsonld";

/** Every graph must carry @context + @type (schema-dts enforces shape at compile time). */
function assertGraph(graph: unknown, type: string) {
  const g = graph as Record<string, unknown>;
  expect(g["@context"]).toBe("https://schema.org");
  expect(g["@type"]).toBe(type);
}

describe("JSON-LD builders (§7.1)", () => {
  it("organization + website + search action", () => {
    assertGraph(organizationLd(), "Organization");
    const site = websiteLd();
    assertGraph(site, "WebSite");
    const action = site.potentialAction as Record<string, unknown>;
    expect(action["@type"]).toBe("SearchAction");
    expect(String((action.target as Record<string, unknown>).urlTemplate)).toContain(
      "search_term_string",
    );
  });

  it("breadcrumb positions are 1-indexed and absolute", () => {
    const bc = breadcrumbLd([
      { name: "Home", path: "/" },
      { name: "Topics", path: "/topics" },
    ]);
    assertGraph(bc, "BreadcrumbList");
    const items = bc.itemListElement as unknown as { position: number; item: string }[];
    expect(items[0]!.position).toBe(1);
    expect(items[1]!.position).toBe(2);
    expect(items[0]!.item).toMatch(/^https?:\/\//);
  });

  it("VideoObject includes ISO duration and a Clip per chapter", () => {
    const v = videoObjectLd({
      slug: "demo",
      youtubeId: "abcdefghijk",
      titleMl: "ടെസ്റ്റ്",
      titleEn: "Test",
      description: "d",
      thumbnailUrl: "https://x/y.jpg",
      durationSec: 612,
      publishedAt: "2026-06-01T00:00:00.000Z",
      viewCount: 100,
      chapters: [
        { startSec: 0, titleMl: "A" },
        { startSec: 90, titleMl: "B" },
      ],
    });
    assertGraph(v, "VideoObject");
    expect(v.duration).toBe("PT10M12S");
    const parts = v.hasPart as { "@type": string; startOffset: number; endOffset: number }[];
    expect(parts).toHaveLength(2);
    expect(parts[0]!["@type"]).toBe("Clip");
    expect(parts[0]!.endOffset).toBe(90); // next chapter start
    expect(parts[1]!.endOffset).toBe(612); // last → duration
    expect((v.interactionStatistic as Record<string, unknown>).userInteractionCount).toBe(100);
  });

  it("FAQPage maps each faq to a Question/Answer", () => {
    const faq = faqPageLd([{ questionMl: "q?", answerMl: "a." }]);
    assertGraph(faq, "FAQPage");
    const entities = faq.mainEntity as { "@type": string; acceptedAnswer: { text: string } }[];
    expect(entities[0]!["@type"]).toBe("Question");
    expect(entities[0]!.acceptedAnswer.text).toBe("a.");
  });

  it("MedicalWebPage carries reviewer + audience; speakable is opt-in", () => {
    const m = medicalWebPageLd({ name: "n", path: "/watch/x", lastReviewed: "2026-06-01", speakable: true });
    assertGraph(m, "MedicalWebPage");
    expect((m.audience as Record<string, unknown>)["@type"]).toBe("MedicalAudience");
    expect(m.reviewedBy).toBeTruthy();
    expect(m.speakable).toBeTruthy();
    const noSpeak = medicalWebPageLd({ name: "n", path: "/watch/x" });
    expect(noSpeak.speakable).toBeUndefined();
  });

  it("Article + CollectionPage/ItemList + MedicalCondition", () => {
    assertGraph(articleLd({ slug: "a", titleMl: "ലേഖനം", publishedAt: "2026-06-01" }), "Article");
    const coll = collectionPageLd({
      name: "Diabetes",
      path: "/topics/prameham",
      items: [{ slug: "v1", titleMl: "t1" }],
    });
    assertGraph(coll, "CollectionPage");
    const list = coll.mainEntity as { "@type": string; itemListElement: unknown[] };
    expect(list["@type"]).toBe("ItemList");
    expect(list.itemListElement).toHaveLength(1);
    assertGraph(medicalConditionLd("പ്രമേഹം", "Diabetes"), "MedicalCondition");
  });
});
