require("dotenv/config");

const bcrypt = require("bcryptjs");
const { PrismaClient } = require("../src/generated/prisma");
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function main() {
  console.log("🌱 Seeding database...");

  const DEFAULT_SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || process.env.SITE_ID || "AHP";

  // 1. Ensure default Site exists
  await prisma.site.upsert({
    where: { id: DEFAULT_SITE_ID },
    update: {
      isActive: true,
    },
    create: {
      id: DEFAULT_SITE_ID,
      name: "A Health Place",
      isActive: true,
    },
  });
  console.log(`✅ Default site '${DEFAULT_SITE_ID}' created/updated.`);

  // 2. Ensure GlobalSettings exists for the site
  const MAIN_NAVIGATION = [
    { label: "Home", url: "/", type: "internal", children: [] },
    { label: "Recipes", url: "/recipes", type: "internal", children: [] },
    { label: "Publications", url: "/publication", type: "internal", children: [] },
    { label: "Blogs", url: "/blogs", type: "internal", children: [] },
    { label: "Services", url: "/services", type: "internal", children: [] },
    {
      label: "About",
      url: "#",
      type: "internal",
      children: [
        { label: "About Us", url: "/about", type: "internal" },
        { label: "Contact", url: "/contact", type: "internal" },
      ],
    },
  ];
  const FOOTER_NAVIGATION = [
    { label: "Home", url: "/", type: "internal" },
    { label: "Recipes", url: "/recipes", type: "internal" },
    { label: "Publications", url: "/publication", type: "internal" },
    { label: "Blogs", url: "/blogs", type: "internal" },
    { label: "Services", url: "/services", type: "internal" },
  ];

  await prisma.globalsettings.upsert({
    where: { siteId: DEFAULT_SITE_ID },
    update: {},
    create: {
      siteId: DEFAULT_SITE_ID,
      navigation: {
        main: MAIN_NAVIGATION,
        footer: FOOTER_NAVIGATION,
      },
    },
  });

  // 3. Create Default Admin User
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@ahealthplace.com";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "Admin123!";

  let superAdminUser = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!superAdminUser) {
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    superAdminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: hashedPassword,
        globalRole: "SUPERADMIN",
        isActive: true,
        name: "AHP Admin",
      },
    });
    console.log(`✅ Default Super Admin account created: ${adminEmail} (password: ${adminPassword})`);
  } else {
    console.log(`ℹ️ Admin account '${adminEmail}' already exists. Preserved.`);
  }

  // 4. Assign Super Admin to default site
  if (superAdminUser) {
    await prisma.siteuser.upsert({
      where: {
        siteId_userId: {
          siteId: DEFAULT_SITE_ID,
          userId: superAdminUser.id,
        },
      },
      update: {
        role: "ADMIN",
      },
      create: {
        siteId: DEFAULT_SITE_ID,
        userId: superAdminUser.id,
        role: "ADMIN",
      },
    });
    console.log(`✅ Site assignment verified for user '${superAdminUser.email}'.`);
  }

  // 5. Ensure Default Pages exist (RECIPES, HOME, BLOG)
  const defaultPages = [
    { slug: "/recipes", title: "Recipes", pageType: "CODE_TEMPLATE" },
    { slug: "/", title: "Home", pageType: "CODE_TEMPLATE" },
    { slug: "/blogs", title: "Blogs", pageType: "CODE_TEMPLATE" },
  ];

  for (const p of defaultPages) {
    const existing = await prisma.page.findFirst({
      where: { siteId: DEFAULT_SITE_ID, slug: p.slug },
    });

    if (!existing) {
      await prisma.page.create({
        data: {
          siteId: DEFAULT_SITE_ID,
          slug: p.slug,
          title: p.title,
          pageType: p.pageType,
          status: "PUBLISHED",
        },
      });
      console.log(`✅ Page '${p.title}' created.`);
    }
  }

  // 6. Ensure Tags & Allergens
  const tagQuick = await prisma.recipetag.upsert({
    where: { name: "Quick & Easy" },
    update: {},
    create: { id: "tag_quick", name: "Quick & Easy" },
  });

  const tagBreakfast = await prisma.recipetag.upsert({
    where: { name: "Breakfast" },
    update: {},
    create: { id: "tag_breakfast", name: "Breakfast" },
  });

  const tagHighProtein = await prisma.recipetag.upsert({
    where: { name: "High Protein" },
    update: {},
    create: { id: "tag_high_protein", name: "High Protein" },
  });

  const allergenGluten = await prisma.recipeallergen.upsert({
    where: { name: "Gluten" },
    update: {},
    create: { id: "allergen_gluten", name: "Gluten" },
  });

  const allergenDairy = await prisma.recipeallergen.upsert({
    where: { name: "Dairy" },
    update: {},
    create: { id: "allergen_dairy", name: "Dairy" },
  });

  // 7. Seed Sample Recipes
  const existingRecipesCount = await prisma.recipe.count();
  if (existingRecipesCount === 0 && superAdminUser) {
    await prisma.recipe.create({
      data: {
        id: "recipe_avocado_toast",
        siteId: DEFAULT_SITE_ID,
        title: "Avocado Toast with Poached Egg",
        description: "Creamy smashed avocado on toasted sourdough topped with a warm poached egg and chilli flakes.",
        ingredients: JSON.stringify([
          "2 slices sourdough bread",
          "1 ripe avocado",
          "2 fresh eggs",
          "1 tbsp lemon juice",
          "Salt and black pepper to taste",
          "Chilli flakes for garnish"
        ]),
        steps: JSON.stringify([
          "Toast sourdough slices until golden brown.",
          "Mash avocado with lemon juice, salt, and pepper.",
          "Bring water with vinegar to a simmer and poach eggs for 3 minutes.",
          "Spread mashed avocado over toast, top with poached eggs, and sprinkle chilli flakes."
        ]),
        cookingTime: 15,
        calories: 340,
        difficulty: "Easy",
        imageUrl: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800",
        status: "APPROVED",
        contributorId: superAdminUser.id,
        protein: 14,
        carbs: 32,
        fat: 18,
        fiber: 7,
        sugar: 2,
        tags: {
          connect: [{ id: tagQuick.id }, { id: tagBreakfast.id }]
        },
        allergens: {
          connect: [{ id: allergenGluten.id }]
        }
      }
    });

    await prisma.recipe.create({
      data: {
        id: "recipe_smoothie_bowl",
        siteId: DEFAULT_SITE_ID,
        title: "Berry Protein Smoothie Bowl",
        description: "Thick, nutrient-dense smoothie bowl loaded with wild berries, plant protein, chia seeds, and granola.",
        ingredients: JSON.stringify([
          "1 cup frozen mixed berries",
          "1 frozen banana",
          "1 scoop vanilla protein powder",
          "1/2 cup almond milk",
          "Chia seeds, sliced almonds, and fresh blueberries for topping"
        ]),
        steps: JSON.stringify([
          "Blend frozen berries, banana, protein powder, and almond milk until smooth and thick.",
          "Pour into a chilled bowl.",
          "Arrange chia seeds, sliced almonds, and fresh blueberries on top."
        ]),
        cookingTime: 10,
        calories: 380,
        difficulty: "Easy",
        imageUrl: "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=800",
        status: "APPROVED",
        contributorId: superAdminUser.id,
        protein: 26,
        carbs: 48,
        fat: 9,
        fiber: 11,
        sugar: 18,
        tags: {
          connect: [{ id: tagBreakfast.id }, { id: tagHighProtein.id }]
        },
        allergens: {
          connect: []
        }
      }
    });
    console.log("✅ Sample recipes seeded.");
  }

  console.log(`\n🎉 Seeding complete for '${DEFAULT_SITE_ID}' site.`);
  console.log(`   Admin Login Credentials:`);
  console.log(`   Email:    ${adminEmail}`);
  console.log(`   Password: ${adminPassword}`);
}

main()
  .catch((error) => {
    console.error("❌ Seed error:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
