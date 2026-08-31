const { PrismaClient } = require('./src/generated/prisma');
const prisma = new PrismaClient();

async function main() {
  const postCount = await prisma.post.count();
  const recipeCount = await prisma.recipe.count();
  console.log("Posts:", postCount);
  console.log("Recipes:", recipeCount);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
