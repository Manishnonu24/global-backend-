const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function updateInsideIssue() {
  console.log("📝 Updating inside_issue data in MySQL database...");

  const magazines = await prisma.$queryRawUnsafe(`SELECT idMagazines, magazine_title, inside_issue FROM magazines`);

  for (const mag of magazines) {
    let hasInside = false;
    if (mag.inside_issue) {
      try {
        const parsed = typeof mag.inside_issue === "string" ? JSON.parse(mag.inside_issue) : mag.inside_issue;
        if (Array.isArray(parsed) && parsed.length > 0) hasInside = true;
      } catch (_) {}
    }

    if (!hasInside) {
      const sampleArticles = [
        {
          icon: "🏥",
          color: "bg-[#e8f5f6]",
          title: "When Is the Right Time to Consider Hospice Care?",
          desc: "Compassionate guidance and essential answers for families.",
        },
        {
          icon: "💤",
          color: "bg-[#eff4fe]",
          title: "The Link Between Sleep & Men's Health",
          desc: "How restorative sleep impacts testosterone, heart health, and mental focus.",
        },
        {
          icon: "🏃",
          color: "bg-[#eef8ef]",
          title: "Exercise & Stress Reduction",
          desc: "Clinically proven workouts to lower cortisol and elevate daily mood.",
        },
        {
          icon: "👨‍👩‍👧‍👦",
          color: "bg-[#fcf1f1]",
          title: "Family Support in Chronic Illness",
          desc: "The positive impact of loved ones on long-term treatment outcomes.",
        },
        {
          icon: "🥗",
          color: "bg-[#fff9ed]",
          title: "Ayurvedic Diet & Gut Health",
          desc: "Natural nutrition strategies to optimize digestion and vitality.",
        },
      ];

      await prisma.$executeRawUnsafe(
        `UPDATE magazines SET inside_issue = ? WHERE idMagazines = ?`,
        JSON.stringify(sampleArticles),
        mag.idMagazines
      );

      console.log(`✅ Saved backend inside_issue JSON for Magazine ID ${mag.idMagazines} (${mag.magazine_title})`);
    }
  }

  console.log("✨ All database magazines updated successfully in MySQL!");
}

updateInsideIssue()
  .catch((err) => console.error("❌ Update failed:", err))
  .finally(() => prisma.$disconnect());
