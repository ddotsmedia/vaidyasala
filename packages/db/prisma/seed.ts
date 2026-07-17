import { PrismaClient, type Prisma } from "@prisma/client";

const prisma = new PrismaClient();

/** Deterministic pseudo-embedding (1024-dim) so seeds are reproducible. */
function fakeVector(seed: number): string {
  const dims: number[] = [];
  let x = seed * 9973 + 1;
  for (let i = 0; i < 1024; i++) {
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    dims.push(Number(((x / 0x7fffffff) * 2 - 1).toFixed(5)));
  }
  return `[${dims.join(",")}]`;
}

type SeedVideo = {
  youtubeId: string;
  slug: string;
  titleMl: string;
  titleEn: string;
  durationSec: number;
  topicSlug: string;
  summaryMl: string;
  segments: { startSec: number; endSec: number; textMl: string; textEn: string }[];
  chapters: { startSec: number; titleMl: string }[];
  faqs: { questionMl: string; answerMl: string; timestampSec: number }[];
};

const TOPICS = [
  { slug: "prameham", nameMl: "പ്രമേഹം", nameEn: "Diabetes", kind: "CONDITION" as const, synonyms: ["പ്രമേഹം", "prameham", "diabetes", "sugar", "പഞ്ചസാര"] },
  { slug: "thyroid", nameMl: "തൈറോയ്ഡ്", nameEn: "Thyroid", kind: "CONDITION" as const, synonyms: ["തൈറോയ്ഡ്", "thyroid", "thairoid"] },
  { slug: "aarogya-jeevitham", nameMl: "ആരോഗ്യ ജീവിതം", nameEn: "Healthy Living", kind: "LIFESTYLE" as const, synonyms: ["ആരോഗ്യം", "arogyam", "health", "lifestyle"] },
];

const VIDEOS: SeedVideo[] = [
  {
    youtubeId: "seed_prameham_01",
    slug: "prameham-lakshanangal-chikitsa",
    titleMl: "പ്രമേഹത്തിന്റെ ലക്ഷണങ്ങളും ചികിത്സയും",
    titleEn: "Diabetes: symptoms and treatment",
    durationSec: 612,
    topicSlug: "prameham",
    summaryMl: "പ്രമേഹത്തിന്റെ പ്രധാന ലക്ഷണങ്ങൾ, രക്തത്തിലെ പഞ്ചസാര നിയന്ത്രിക്കാനുള്ള മാർഗങ്ങൾ, ഭക്ഷണക്രമം എന്നിവ വിശദമായി പ്രതിപാദിക്കുന്നു.",
    segments: [
      { startSec: 0, endSec: 90, textMl: "പ്രമേഹം എന്നാൽ രക്തത്തിലെ പഞ്ചസാരയുടെ അളവ് കൂടുന്ന അവസ്ഥയാണ്.", textEn: "Diabetes is a condition where blood sugar levels rise." },
      { startSec: 90, endSec: 300, textMl: "അമിതമായ ദാഹം, ഇടയ്ക്കിടെ മൂത്രമൊഴിക്കൽ, ക്ഷീണം എന്നിവ പ്രധാന ലക്ഷണങ്ങളാണ്.", textEn: "Excess thirst, frequent urination and fatigue are key symptoms." },
      { startSec: 300, endSec: 612, textMl: "വ്യായാമവും ശരിയായ ഭക്ഷണക്രമവും പഞ്ചസാര നിയന്ത്രിക്കാൻ സഹായിക്കും.", textEn: "Exercise and a proper diet help control sugar." },
    ],
    chapters: [
      { startSec: 0, titleMl: "പ്രമേഹം എന്നാൽ എന്ത്" },
      { startSec: 90, titleMl: "ലക്ഷണങ്ങൾ" },
      { startSec: 300, titleMl: "ചികിത്സയും ജീവിതശൈലിയും" },
    ],
    faqs: [
      { questionMl: "പ്രമേഹം പൂർണമായി മാറുമോ?", answerMl: "ടൈപ്പ് 2 പ്രമേഹം ജീവിതശൈലി മാറ്റങ്ങളിലൂടെ നിയന്ത്രിക്കാം.", timestampSec: 312 },
    ],
  },
  {
    youtubeId: "seed_thyroid_01",
    slug: "thyroid-prashnangal",
    titleMl: "തൈറോയ്ഡ് പ്രശ്നങ്ങൾ അറിയേണ്ടതെല്ലാം",
    titleEn: "Everything about thyroid problems",
    durationSec: 480,
    topicSlug: "thyroid",
    summaryMl: "ഹൈപ്പോതൈറോയിഡിസം, ഹൈപ്പർതൈറോയിഡിസം എന്നിവയുടെ വ്യത്യാസവും ലക്ഷണങ്ങളും.",
    segments: [
      { startSec: 0, endSec: 120, textMl: "തൈറോയ്ഡ് ഗ്രന്ഥി കഴുത്തിന്റെ മുൻഭാഗത്താണ് സ്ഥിതി ചെയ്യുന്നത്.", textEn: "The thyroid gland sits at the front of the neck." },
      { startSec: 120, endSec: 480, textMl: "ഭാരവർധനവ്, ക്ഷീണം, മുടികൊഴിച്ചിൽ എന്നിവ ഹൈപ്പോതൈറോയിഡിസത്തിന്റെ ലക്ഷണങ്ങളാണ്.", textEn: "Weight gain, fatigue and hair fall are signs of hypothyroidism." },
    ],
    chapters: [
      { startSec: 0, titleMl: "തൈറോയ്ഡ് ഗ്രന്ഥി" },
      { startSec: 120, titleMl: "ലക്ഷണങ്ങൾ" },
    ],
    faqs: [
      { questionMl: "തൈറോയ്ഡ് പരിശോധന എപ്പോൾ വേണം?", answerMl: "ക്ഷീണവും ഭാരവ്യത്യാസവും തുടർച്ചയായി ഉണ്ടെങ്കിൽ TSH പരിശോധന നടത്തുക.", timestampSec: 130 },
    ],
  },
  {
    youtubeId: "seed_cholesterol_01",
    slug: "kolesterol-kurakkan",
    titleMl: "കൊളസ്ട്രോൾ കുറയ്ക്കാൻ എളുപ്പവഴികൾ",
    titleEn: "Easy ways to reduce cholesterol",
    durationSec: 540,
    topicSlug: "aarogya-jeevitham",
    summaryMl: "ഭക്ഷണത്തിലൂടെയും വ്യായാമത്തിലൂടെയും കൊളസ്ട്രോൾ നിയന്ത്രിക്കാനുള്ള പ്രായോഗിക മാർഗങ്ങൾ.",
    segments: [
      { startSec: 0, endSec: 150, textMl: "എൽഡിഎൽ ആണ് ദോഷകരമായ കൊളസ്ട്രോൾ.", textEn: "LDL is the harmful cholesterol." },
      { startSec: 150, endSec: 540, textMl: "നാരുകൾ അടങ്ങിയ ഭക്ഷണം കൊളസ്ട്രോൾ കുറയ്ക്കും.", textEn: "Fibre-rich food lowers cholesterol." },
    ],
    chapters: [
      { startSec: 0, titleMl: "കൊളസ്ട്രോൾ തരങ്ങൾ" },
      { startSec: 150, titleMl: "ഭക്ഷണക്രമം" },
    ],
    faqs: [
      { questionMl: "മുട്ട കഴിക്കാമോ?", answerMl: "മിതമായ അളവിൽ മുട്ട കഴിക്കുന്നത് കുഴപ്പമില്ല.", timestampSec: 200 },
    ],
  },
  {
    youtubeId: "seed_hairfall_01",
    slug: "mudi-kozhichil-parihaaram",
    titleMl: "മുടികൊഴിച്ചിൽ പരിഹാരം",
    titleEn: "Remedies for hair fall",
    durationSec: 360,
    topicSlug: "aarogya-jeevitham",
    summaryMl: "മുടികൊഴിച്ചിലിന്റെ കാരണങ്ങളും പോഷകാഹാരത്തിലൂടെയുള്ള പരിഹാരവും.",
    segments: [
      { startSec: 0, endSec: 120, textMl: "പോഷകക്കുറവാണ് മുടികൊഴിച്ചിലിന്റെ പ്രധാന കാരണം.", textEn: "Nutrient deficiency is a major cause of hair fall." },
      { startSec: 120, endSec: 360, textMl: "പ്രോട്ടീനും ഇരുമ്പും അടങ്ങിയ ഭക്ഷണം സഹായിക്കും.", textEn: "Protein and iron-rich food helps." },
    ],
    chapters: [
      { startSec: 0, titleMl: "കാരണങ്ങൾ" },
      { startSec: 120, titleMl: "പരിഹാരം" },
    ],
    faqs: [
      { questionMl: "എണ്ണ തേക്കുന്നത് ഗുണം ചെയ്യുമോ?", answerMl: "തലയോട്ടിയിലെ രക്തചംക്രമണം മെച്ചപ്പെടുത്താൻ എണ്ണ മസാജ് സഹായിക്കും.", timestampSec: 130 },
    ],
  },
  {
    youtubeId: "seed_bp_01",
    slug: "rakthasammardham-niyanthranam",
    titleMl: "രക്തസമ്മർദ്ദം നിയന്ത്രിക്കാം",
    titleEn: "Controlling blood pressure",
    durationSec: 420,
    topicSlug: "aarogya-jeevitham",
    summaryMl: "ഉയർന്ന രക്തസമ്മർദ്ദത്തിന്റെ അപകടങ്ങളും ഉപ്പ് കുറയ്ക്കുന്നതിന്റെ പ്രാധാന്യവും.",
    segments: [
      { startSec: 0, endSec: 140, textMl: "ഉയർന്ന രക്തസമ്മർദ്ദം നിശ്ശബ്ദ കൊലയാളിയാണ്.", textEn: "High blood pressure is a silent killer." },
      { startSec: 140, endSec: 420, textMl: "ഉപ്പ് കുറയ്ക്കുന്നത് രക്തസമ്മർദ്ദം നിയന്ത്രിക്കാൻ സഹായിക്കും.", textEn: "Cutting salt helps control blood pressure." },
    ],
    chapters: [
      { startSec: 0, titleMl: "അപകടങ്ങൾ" },
      { startSec: 140, titleMl: "നിയന്ത്രണ മാർഗങ്ങൾ" },
    ],
    faqs: [
      { questionMl: "ദിവസവും എത്ര ഉപ്പ് ആകാം?", answerMl: "ദിവസം 5 ഗ്രാമിൽ താഴെ ഉപ്പ് മാത്രം ഉപയോഗിക്കുക.", timestampSec: 150 },
    ],
  },
];

async function main(): Promise<void> {
  // 1 admin user (+ profile). Better Auth credential wiring lands in Phase 2D.
  const admin = await prisma.user.upsert({
    where: { email: "admin@vaidyasala.live" },
    update: {},
    create: {
      id: "seed-admin",
      name: "Vaidyasala Admin",
      email: "admin@vaidyasala.live",
      emailVerified: true,
    },
  });
  await prisma.profile.upsert({
    where: { id: admin.id },
    update: { role: "ADMIN" },
    create: { id: admin.id, role: "ADMIN", langPref: "ml" },
  });

  // Topics
  for (const t of TOPICS) {
    await prisma.topic.upsert({
      where: { slug: t.slug },
      update: { nameMl: t.nameMl, nameEn: t.nameEn, kind: t.kind, synonyms: t.synonyms },
      create: {
        slug: t.slug,
        nameMl: t.nameMl,
        nameEn: t.nameEn,
        kind: t.kind,
        synonyms: t.synonyms as Prisma.InputJsonValue,
      },
    });

    // Seed the synonym dictionary from topic synonyms (approved).
    for (const variant of t.synonyms) {
      await prisma.synonymMapping.upsert({
        where: { variant: variant.toLowerCase() },
        update: {},
        create: { variant: variant.toLowerCase(), canonical: t.nameMl, source: "seed", approved: true },
      });
    }
  }

  // Videos + children
  let vecSeed = 1;
  for (const v of VIDEOS) {
    const topic = await prisma.topic.findUniqueOrThrow({ where: { slug: v.topicSlug } });
    const video = await prisma.video.upsert({
      where: { youtubeId: v.youtubeId },
      update: {},
      create: {
        youtubeId: v.youtubeId,
        slug: v.slug,
        status: "PUBLISHED",
        titleMl: v.titleMl,
        titleEn: v.titleEn,
        durationSec: v.durationSec,
        publishedAt: new Date("2026-06-01T00:00:00Z"),
        ytPublishedAt: new Date("2026-05-20T00:00:00Z"),
        thumbnails: { default: `https://i.ytimg.com/vi/${v.youtubeId}/default.jpg` },
        stats: { views: 1000 * vecSeed, likes: 50 * vecSeed, comments: 5 * vecSeed },
        primaryTopicId: topic.id,
        qualityScore: 0.86,
      },
    });

    await prisma.topicVideo.upsert({
      where: { topicId_videoId: { topicId: topic.id, videoId: video.id } },
      update: { score: 0.9 },
      create: { topicId: topic.id, videoId: video.id, score: 0.9 },
    });

    await prisma.transcript.upsert({
      where: { videoId: video.id },
      update: {},
      create: {
        videoId: video.id,
        rawMl: v.segments.map((s) => s.textMl).join(" "),
        correctedMl: v.segments.map((s) => s.textMl).join(" "),
        english: v.segments.map((s) => s.textEn).join(" "),
        segments: v.segments as unknown as Prisma.InputJsonValue,
        asrProvider: "sarvam",
        qualityScore: 0.9,
      },
    });

    await prisma.enrichment.upsert({
      where: { videoId: video.id },
      update: {},
      create: {
        videoId: video.id,
        summaryMl: v.summaryMl,
        summaryEn: v.titleEn,
        keyTakeaways: [{ ml: v.segments[0]?.textMl ?? "", en: v.segments[0]?.textEn ?? "" }] as Prisma.InputJsonValue,
        socialSnippets: { whatsapp: v.titleMl, instagram: v.titleMl } as Prisma.InputJsonValue,
        newsletterMd: `## ${v.titleMl}\n\n${v.summaryMl}`,
        seoTitle: v.titleMl,
        seoDescription: v.summaryMl.slice(0, 150),
        modelVersion: "claude-sonnet-4.5",
        generatedAt: new Date("2026-06-01T00:00:00Z"),
      },
    });

    // Chapters
    for (const c of v.chapters) {
      await prisma.chapter.upsert({
        where: { videoId_startSec: { videoId: video.id, startSec: c.startSec } },
        update: { titleMl: c.titleMl },
        create: { videoId: video.id, startSec: c.startSec, titleMl: c.titleMl },
      });
    }

    // FAQs
    let order = 0;
    for (const f of v.faqs) {
      await prisma.faq.create({
        data: {
          videoId: video.id,
          questionMl: f.questionMl,
          answerMl: f.answerMl,
          timestampSec: f.timestampSec,
          order: order++,
        },
      });
    }

    // Per-segment vectors (raw SQL — Unsupported vector column).
    await prisma.$executeRaw`DELETE FROM "TranscriptSegmentVector" WHERE "videoId" = ${video.id}`;
    for (const s of v.segments) {
      const vec = fakeVector(vecSeed++);
      await prisma.$executeRaw`
        INSERT INTO "TranscriptSegmentVector" ("id", "videoId", "startSec", "endSec", "textMl", "embedding")
        VALUES (gen_random_uuid()::text, ${video.id}, ${s.startSec}, ${s.endSec}, ${s.textMl}, ${vec}::vector)
      `;
    }

    // Video-level embedding.
    await prisma.$executeRaw`UPDATE "Video" SET "embedding" = ${fakeVector(vecSeed++)}::vector WHERE "id" = ${video.id}`;
  }

  // Articles (SEO satellites) + related-edge graph over the seeded videos.
  const allVideos = await prisma.video.findMany({ select: { id: true, slug: true, titleMl: true } });
  for (const v of allVideos) {
    await prisma.article.upsert({
      where: { videoId: v.id },
      update: {},
      create: {
        videoId: v.id,
        slug: `${v.slug}-lekhanam`,
        status: "PUBLISHED",
        titleMl: `${v.titleMl} — വിശദമായി`,
        bodyMl: `## ${v.titleMl}\n\nഈ ലേഖനം വീഡിയോയിലെ പ്രധാന വിവരങ്ങൾ സംഗ്രഹിക്കുന്നു.\n\n- ലക്ഷണങ്ങൾ തിരിച്ചറിയുക\n- ശരിയായ ചികിത്സ\n- ജീവിതശൈലി മാറ്റങ്ങൾ\n\nകൂടുതൽ അറിയാൻ വീഡിയോ കാണുക.`,
        readingMin: 3,
      },
    });
  }
  // Related edges: fully-connected among seeded videos (both directions).
  for (const a of allVideos) {
    for (const b of allVideos) {
      if (a.id === b.id) continue;
      await prisma.relatedEdge.upsert({
        where: { fromId_toId: { fromId: a.id, toId: b.id } },
        update: {},
        create: { fromId: a.id, toId: b.id, score: 0.7, reason: "semantic" },
      });
    }
  }

  // Playlists
  const playlists = [
    { slug: "prameham-series", titleMl: "പ്രമേഹ പരമ്പര", videoSlugs: ["prameham-lakshanangal-chikitsa"] },
    { slug: "jeevithashaili", titleMl: "ജീവിതശൈലി രോഗങ്ങൾ", videoSlugs: ["kolesterol-kurakkan", "rakthasammardham-niyanthranam"] },
  ];
  for (const p of playlists) {
    const playlist = await prisma.playlist.upsert({
      where: { slug: p.slug },
      update: {},
      create: { slug: p.slug, titleMl: p.titleMl },
    });
    let order = 0;
    for (const vs of p.videoSlugs) {
      const vid = await prisma.video.findUniqueOrThrow({ where: { slug: vs } });
      await prisma.playlistItem.upsert({
        where: { playlistId_videoId: { playlistId: playlist.id, videoId: vid.id } },
        update: { order },
        create: { playlistId: playlist.id, videoId: vid.id, order: order++ },
      });
    }
  }

  const counts = {
    videos: await prisma.video.count(),
    topics: await prisma.topic.count(),
    playlists: await prisma.playlist.count(),
    articles: await prisma.article.count(),
    relatedEdges: await prisma.relatedEdge.count(),
    segvectors: await prisma.transcriptSegmentVector.count(),
  };
  console.log("[seed] done", counts);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err: unknown) => {
    console.error("[seed] failed", err);
    await prisma.$disconnect();
    process.exit(1);
  });
