import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const articles = [
    {
      slug: 'vata-diet-guide',
      title: 'Vata Dosha Diet: 10 Balancing Foods',
      description: 'Complete guide to foods for Vata imbalance and how to maintain balance',
      content:
        '<h2>Introduction to Vata</h2><p>Vata dosha represents air and ether elements. It governs movement, creativity, and communication. When imbalanced, it can lead to anxiety, dry skin, and digestive issues.</p><h2>Balancing Foods</h2><p>Warm, grounding foods help balance Vata. Include ghee, sesame oil, warm milk, and cooked vegetables.</p>',
      published: true,
      publishedAt: new Date(),
    },
    {
      slug: 'pitta-yoga-poses',
      title: 'Best Yoga Poses for Pitta Balance',
      description: 'Cooling yoga asanas to help balance Pitta dosha naturally',
      content:
        '<h2>Understanding Pitta</h2><p>Pitta is the fire element, responsible for digestion, metabolism, and transformation. Cooling practices help maintain equilibrium.</p><h2>Recommended Poses</h2><p>Moon salutation, child pose, and seated forward bends are excellent for cooling Pitta energy.</p>',
      published: true,
      publishedAt: new Date(),
    },
    {
      slug: 'kapha-sleep',
      title: 'Sleep Quality in Ayurveda',
      description: 'Natural remedies and practices for better sleep according to Ayurvedic principles',
      content:
        '<h2>Sleep Science in Ayurveda</h2><p>Quality sleep is fundamental to health. In Ayurveda, sleep is considered one of the three pillars of wellbeing.</p><h2>Sleep Practices</h2><p>Establish a consistent bedtime routine, avoid heavy meals before sleep, and keep your bedroom cool and dark.</p>',
      published: true,
      publishedAt: new Date(),
    },
  ];

  for (const article of articles) {
    await prisma.article.upsert({
      where: { slug: article.slug },
      update: article,
      create: article,
    });
  }

  console.log('✓ Seed data created');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
