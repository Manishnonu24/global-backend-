import { PrismaClient } from "../src/generated/prisma/index.js";
import Typesense from "typesense";
import {
  isPostSearchable, mapPostToSearchDocument,
  isPageSearchable, mapPageToSearchDocument,
  isRecipeSearchable, mapRecipeToSearchDocument,
  isServiceSearchable, mapServiceToSearchDocument,
  isMagazineSearchable, mapMagazineToSearchDocument,
  isQuizSearchable, mapQuizToSearchDocument,
} from "../src/lib/search/documentMappers.js";
import { CONTENT_COLLECTION_SCHEMA } from "../src/lib/search/collectionSchema.js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const prisma = new PrismaClient();
const ALIAS_NAME = "content";

const client = new Typesense.Client({
  nodes: [
    {
      host: process.env.TYPESENSE_HOST || "localhost",
      port: Number(process.env.TYPESENSE_PORT || 8108),
      protocol: process.env.TYPESENSE_PROTOCOL || "http",
    },
  ],
  apiKey: process.env.TYPESENSE_ADMIN_API_KEY || "",
  connectionTimeoutSeconds: 5,
});

async function checkHealth() {
  console.log("Checking Typesense health...");
  try {
    const health = await client.health.retrieve();
    if (!health || !health.ok) {
      throw new Error("Typesense is not healthy");
    }
    console.log("Typesense is reachable and healthy.");
  } catch (error) {
    throw new Error(`Health check failed: ${error.message}. Please verify TYPESENSE_HOST, TYPESENSE_PORT, and TYPESENSE_ADMIN_API_KEY.`);
  }
}

async function createCollection(collectionName) {
  console.log(`Creating collection ${collectionName}...`);
  const schema = {
    ...CONTENT_COLLECTION_SCHEMA,
    name: collectionName,
  };
  await client.collections().create(schema);
  console.log(`Collection ${collectionName} created successfully.`);
}

async function bulkImport(collectionName, documents, typeName) {
  if (documents.length === 0) {
    console.log(`No searchable ${typeName} to import.`);
    return 0;
  }
  
  console.log(`Importing ${documents.length} ${typeName}...`);
  try {
    const importResults = await client.collections(collectionName).documents().import(documents, { action: "upsert" });
    
    // Validate import results
    const failedItems = importResults.filter(result => !result.success);
    if (failedItems.length > 0) {
      console.error(`Failed to import some ${typeName}:`, failedItems);
      throw new Error(`Failed to import ${failedItems.length} ${typeName}.`);
    }
    
    return documents.length;
  } catch (error) {
    console.error(`Bulk import failed for ${typeName}:`, error);
    throw error;
  }
}

async function switchAlias(aliasName, collectionName) {
  console.log(`Updating alias ${aliasName} -> ${collectionName}`);
  await client.aliases().upsert(aliasName, { collection_name: collectionName });
  console.log(`Alias ${aliasName} updated successfully.`);
}

async function deleteOldCollections(aliasName, currentCollectionName) {
  try {
    const collections = await client.collections().retrieve();
    for (const collection of collections) {
      // Assuming our collections start with the alias name, e.g., 'content_'
      if (collection.name.startsWith(`${aliasName}_`) && collection.name !== currentCollectionName) {
        console.log(`Deleting old collection: ${collection.name}...`);
        await client.collections(collection.name).delete();
      }
    }
  } catch (error) {
    console.error("Failed to cleanup old collections:", error.message);
  }
}

async function main() {
  if (!process.env.TYPESENSE_ADMIN_API_KEY) {
    console.error("Error: TYPESENSE_ADMIN_API_KEY is missing.");
    process.exit(1);
  }

  try {
    // 1. Health check
    await checkHealth();

    // 2. Create physical collection with timestamp
    const timestamp = Date.now();
    const newCollectionName = `${ALIAS_NAME}_${timestamp}`;
    await createCollection(newCollectionName);

    let totalImported = 0;

    // 3. Index Posts
    console.log("\nIndexing Posts...");
    const posts = await prisma.post.findMany({ include: { categories: true, tags: true, featuredImage: true } });
    const postDocs = posts.filter(isPostSearchable).map(mapPostToSearchDocument).filter(Boolean);
    totalImported += await bulkImport(newCollectionName, postDocs, "Posts");

    // 4. Index Pages
    console.log("\nIndexing Pages...");
    const pages = await prisma.page.findMany({ include: { sections: true } });
    const pageDocs = pages.filter(isPageSearchable).map(mapPageToSearchDocument).filter(Boolean);
    totalImported += await bulkImport(newCollectionName, pageDocs, "Pages");

    // 5. Index Recipes
    if (prisma.recipe) {
      console.log("\nIndexing Recipes...");
      const recipes = await prisma.recipe.findMany({ include: { tags: true } });
      const recipeDocs = recipes.filter(isRecipeSearchable).map(mapRecipeToSearchDocument).filter(Boolean);
      totalImported += await bulkImport(newCollectionName, recipeDocs, "Recipes");
    } else {
      console.log("\nSkipping Recipes (model not in Prisma client)...");
    }

    // 6. Index Services
    if (prisma.service) {
      console.log("\nIndexing Services...");
      const services = await prisma.service.findMany({ include: { featuredImage: true } });
      const serviceDocs = services.filter(isServiceSearchable).map(mapServiceToSearchDocument).filter(Boolean);
      totalImported += await bulkImport(newCollectionName, serviceDocs, "Services");
    } else {
      console.log("\nSkipping Services (model not in Prisma client)...");
    }

    // 7. Index Magazines
    if (prisma.magazine) {
      console.log("\nIndexing Magazines...");
      const magazines = await prisma.magazine.findMany();
      const magazineDocs = magazines.filter(isMagazineSearchable).map(mapMagazineToSearchDocument).filter(Boolean);
      totalImported += await bulkImport(newCollectionName, magazineDocs, "Magazines");
    } else {
      console.log("\nSkipping Magazines (model not in Prisma client)...");
    }

    // 8. Index Quizzes
    if (prisma.quizType) {
      console.log("\nIndexing Quizzes...");
      const quizzes = await prisma.quizType.findMany();
      const quizDocs = quizzes.filter(isQuizSearchable).map(mapQuizToSearchDocument).filter(Boolean);
      totalImported += await bulkImport(newCollectionName, quizDocs, "Quizzes");
    } else {
      console.log("\nSkipping Quizzes (model not in Prisma client)...");
    }

    console.log(`\nImported ${totalImported} documents in total.`);

    // 9. Update Alias
    await switchAlias(ALIAS_NAME, newCollectionName);

    // 10. (Optional) Cleanup old collections
    await deleteOldCollections(ALIAS_NAME, newCollectionName);

    console.log("\nDone");
  } catch (error) {
    console.error("\nReindex failed:", error.message);
    process.exit(1);
  }
}

main().finally(async () => {
  await prisma.$disconnect();
});
