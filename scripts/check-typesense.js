import Typesense from "typesense";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

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

async function main() {
  try {
    const health = await client.health.retrieve();
    console.log("Typesense Health:", health);

    const collections = await client.collections().retrieve();
    console.log("Collections:", collections.map(c => c.name));

    try {
      const contentCollection = await client.collections("content").retrieve();
      console.log(`Content collection documents count: ${contentCollection.num_documents}`);
    } catch (e) {
      console.log("Content collection not found.");
    }

  } catch (error) {
    console.error("Typesense connection failed:", error.message);
    process.exit(1);
  }
}

main();
