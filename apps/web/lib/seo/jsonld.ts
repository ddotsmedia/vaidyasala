import "server-only";
import type {
  Article,
  BreadcrumbList,
  CollectionPage,
  FAQPage,
  ItemList,
  MedicalCondition,
  MedicalWebPage,
  Organization,
  VideoObject,
  WebSite,
  WithContext,
} from "schema-dts";
import { SITE, REVIEWER, absoluteUrl, isoDuration } from "./site";

/**
 * JSON-LD builders (§7.1). Every stack in the §7.1 table is produced here and
 * only here — pages import these + render via <JsonLd> (no inline schema, LAW 4).
 * schema-dts gives us compile-time structural validation of every graph.
 */

const SPEAKABLE = {
  "@type": "SpeakableSpecification" as const,
  cssSelector: ["[data-speakable]"],
};

// ── Home: WebSite + SearchAction + Organization ──

export function organizationLd(): WithContext<Organization> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": absoluteUrl("/#organization"),
    name: SITE.name,
    alternateName: SITE.nameMl,
    url: SITE.url,
    logo: absoluteUrl("/icon.png"),
    sameAs: [SITE.youtube],
  };
}

export function websiteLd(): WithContext<WebSite> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": absoluteUrl("/#website"),
    url: SITE.url,
    name: SITE.name,
    inLanguage: "ml",
    publisher: { "@id": absoluteUrl("/#organization") },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: absoluteUrl("/search?q={search_term_string}"),
      },
      // schema.org query-input is a string literal, not a typed prop.
      "query-input": "required name=search_term_string",
    } as WebSite["potentialAction"],
  };
}

// ── Shared: BreadcrumbList ──

export interface Crumb {
  name: string;
  path: string;
}

export function breadcrumbLd(crumbs: Crumb[]): WithContext<BreadcrumbList> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: absoluteUrl(c.path),
    })),
  };
}

// ── Video page: VideoObject (+Clip hasPart, transcript, interactionStatistic) ──

export interface VideoLdInput {
  slug: string;
  youtubeId: string;
  titleMl: string;
  titleEn: string | null;
  description: string | null;
  thumbnailUrl: string;
  durationSec: number;
  publishedAt: string | null;
  viewCount?: number;
  transcript?: string | null;
  chapters: { startSec: number; titleMl: string }[];
}

export function videoObjectLd(v: VideoLdInput): WithContext<VideoObject> {
  const pageUrl = absoluteUrl(`/watch/${v.slug}`);
  const hasPart = v.chapters.map((c, i) => {
    const end = v.chapters[i + 1]?.startSec ?? v.durationSec;
    return {
      "@type": "Clip" as const,
      name: c.titleMl,
      startOffset: c.startSec,
      endOffset: end,
      url: `${pageUrl}?t=${c.startSec}`,
    };
  });
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    "@id": `${pageUrl}#video`,
    name: v.titleMl,
    alternateName: v.titleEn ?? undefined,
    description: v.description ?? v.titleMl,
    thumbnailUrl: v.thumbnailUrl,
    uploadDate: v.publishedAt ?? undefined,
    duration: isoDuration(v.durationSec),
    contentUrl: `https://www.youtube.com/watch?v=${v.youtubeId}`,
    embedUrl: `https://www.youtube-nocookie.com/embed/${v.youtubeId}`,
    inLanguage: "ml",
    ...(v.transcript ? { transcript: v.transcript } : {}),
    ...(hasPart.length ? { hasPart } : {}),
    ...(typeof v.viewCount === "number"
      ? {
          interactionStatistic: {
            "@type": "InteractionCounter",
            interactionType: { "@type": "WatchAction" },
            userInteractionCount: v.viewCount,
          },
        }
      : {}),
  };
}

// ── FAQPage ──

export interface FaqLd {
  questionMl: string;
  answerMl: string;
}

export function faqPageLd(faqs: FaqLd[]): WithContext<FAQPage> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.questionMl,
      acceptedAnswer: { "@type": "Answer", text: f.answerMl },
    })),
  };
}

// ── MedicalWebPage (advisory-level only, §7.1/§7.3) ──

export interface MedicalPageLdInput {
  name: string;
  path: string;
  description?: string | null;
  lastReviewed?: string | null;
  speakable?: boolean;
}

export function medicalWebPageLd(input: MedicalPageLdInput): WithContext<MedicalWebPage> {
  return {
    "@context": "https://schema.org",
    "@type": "MedicalWebPage",
    "@id": `${absoluteUrl(input.path)}#medical`,
    name: input.name,
    description: input.description ?? undefined,
    url: absoluteUrl(input.path),
    inLanguage: "ml",
    audience: { "@type": "MedicalAudience", audienceType: "Patient" },
    lastReviewed: input.lastReviewed ?? undefined,
    reviewedBy: { "@type": "Organization", name: REVIEWER.name },
    publisher: { "@id": absoluteUrl("/#organization") },
    ...(input.speakable ? { speakable: SPEAKABLE } : {}),
  };
}

// ── Article ──

export interface ArticleLdInput {
  slug: string;
  titleMl: string;
  publishedAt?: string | null;
  updatedAt?: string | null;
}

export function articleLd(a: ArticleLdInput): WithContext<Article> {
  const url = absoluteUrl(`/articles/${a.slug}`);
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${url}#article`,
    headline: a.titleMl,
    inLanguage: "ml",
    mainEntityOfPage: url,
    datePublished: a.publishedAt ?? undefined,
    dateModified: a.updatedAt ?? a.publishedAt ?? undefined,
    author: { "@id": absoluteUrl("/#organization") },
    publisher: { "@id": absoluteUrl("/#organization") },
    speakable: SPEAKABLE,
  };
}

// ── Topic hub: CollectionPage + ItemList (+ MedicalCondition when CONDITION) ──

export interface CollectionLdInput {
  name: string;
  path: string;
  description?: string | null;
  items: { slug: string; titleMl: string }[];
}

export function collectionPageLd(input: CollectionLdInput): WithContext<CollectionPage> {
  const itemList: ItemList = {
    "@type": "ItemList",
    itemListElement: input.items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: absoluteUrl(`/watch/${it.slug}`),
      name: it.titleMl,
    })),
  };
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${absoluteUrl(input.path)}#collection`,
    name: input.name,
    description: input.description ?? undefined,
    url: absoluteUrl(input.path),
    inLanguage: "ml",
    isPartOf: { "@id": absoluteUrl("/#website") },
    mainEntity: itemList,
  };
}

export function medicalConditionLd(nameMl: string, nameEn: string): WithContext<MedicalCondition> {
  return {
    "@context": "https://schema.org",
    "@type": "MedicalCondition",
    name: nameEn,
    alternateName: nameMl,
  };
}
