import { PrismaClient } from "../src/generated/prisma/index.js";
import { quizzes } from "../src/data/quizzes.js";

const prisma = new PrismaClient();

async function syncQuizTypes() {
  console.log("🔍 Syncing static quiz definitions into QuizType table...");

  for (let i = 0; i < quizzes.length; i++) {
    const q = quizzes[i];
    await prisma.quizType.upsert({
      where: { slug: q.slug },
      update: {
        title: q.title,
        subtitle: q.subtitle || null,
        description: q.description || "",
        category: q.category || "Wellness",
        categoryColor: q.categoryColor || "#0f7c85",
        imageUrl: q.img || null,
        icon: q.icon || "✨",
        estimatedMinutes: q.estimatedMinutes || 5,
        difficulty: q.difficulty || "Beginner",
        sortOrder: i,
      },
      create: {
        slug: q.slug,
        title: q.title,
        subtitle: q.subtitle || null,
        description: q.description || "",
        category: q.category || "Wellness",
        categoryColor: q.categoryColor || "#0f7c85",
        imageUrl: q.img || null,
        icon: q.icon || "✨",
        estimatedMinutes: q.estimatedMinutes || 5,
        difficulty: q.difficulty || "Beginner",
        sortOrder: i,
        isActive: true,
      },
    });
    console.log(`  ✓ Synced QuizType: ${q.slug}`);
  }

  console.log("✅ QuizType sync complete!");
}

syncQuizTypes()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
