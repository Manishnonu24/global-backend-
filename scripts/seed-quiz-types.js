/**
 * Seed script — inserts the 5 default quiz types into the DB.
 * Run with: node scripts/seed-quiz-types.js
 */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const TYPES = [
  {
    slug: "general-wellness",
    title: "General Wellness Quiz",
    subtitle: "Evaluate your overall health habits",
    description: "A quick assessment to evaluate your daily physical activity, hydration consistency, and overall lifestyle balance.",
    category: "Wellness",
    categoryColor: "#0f7c85",
    imageUrl: "/images/holistic.png",
    icon: "✨",
    estimatedMinutes: 4,
    difficulty: "Beginner",
    sortOrder: 0,
  },
  {
    slug: "sleep-quality",
    title: "Sleep Quality Assessment",
    subtitle: "Discover how well you're truly sleeping",
    description: "Assess your sleep hygiene, duration patterns, and overnight recovery quality with this clinically informed questionnaire.",
    category: "Sleep",
    categoryColor: "#1fb9fb",
    imageUrl: "/images/hero_sleep.png",
    icon: "🌙",
    estimatedMinutes: 5,
    difficulty: "Beginner",
    sortOrder: 1,
  },
  {
    slug: "stress-burnout",
    title: "Stress & Burnout Check",
    subtitle: "Measure your stress resilience",
    description: "Evaluate your daily stress patterns, emotional resilience, and risk of burnout with this evidence-based assessment.",
    category: "Mental Health",
    categoryColor: "#8e44ad",
    imageUrl: "/images/disease.png",
    icon: "🧠",
    estimatedMinutes: 6,
    difficulty: "Intermediate",
    sortOrder: 2,
  },
  {
    slug: "nutrition-gut",
    title: "Nutrition & Gut Health Quiz",
    subtitle: "How healthy is your gut?",
    description: "Assess the quality of your diet, your gut microbiome health indicators, and how your food choices impact your long-term wellness.",
    category: "Nutrition",
    categoryColor: "#f39c12",
    imageUrl: "/images/ayurveda.png",
    icon: "🥗",
    estimatedMinutes: 5,
    difficulty: "Beginner",
    sortOrder: 3,
  },
  {
    slug: "dosha-body-type",
    title: "Ayurvedic Dosha Discovery",
    subtitle: "Find your Vata, Pitta, or Kapha type",
    description: "Discover your Ayurvedic constitution (Vata, Pitta, or Kapha) and receive personalised lifestyle and dietary recommendations.",
    category: "Ayurveda",
    categoryColor: "#27ae60",
    imageUrl: "/images/physical_health.png",
    icon: "🌿",
    estimatedMinutes: 7,
    difficulty: "Intermediate",
    sortOrder: 4,
  },
];

async function main() {
  console.log("Seeding quiz types...");
  let created = 0;
  let skipped = 0;

  for (const t of TYPES) {
    const existing = await prisma.quizType.findUnique({ where: { slug: t.slug } });
    if (existing) {
      console.log(`  ⏭  Skipping "${t.title}" (already exists)`);
      skipped++;
    } else {
      await prisma.quizType.create({ data: t });
      console.log(`  ✅ Created "${t.title}"`);
      created++;
    }
  }

  console.log(`\nDone. ${created} created, ${skipped} skipped.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
