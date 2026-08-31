const { PrismaClient } = require("../../src/generated/prisma");

function parseMySqlUrl(urlStr) {
  try {
    const parsed = new URL(urlStr);
    const host = (parsed.hostname || "127.0.0.1").toLowerCase();
    const port = parsed.port || "3306";
    const dbName = decodeURIComponent((parsed.pathname || "").replace(/^\//, "")).toLowerCase();
    return { host, port, dbName, raw: urlStr };
  } catch (err) {
    throw new Error(`Invalid Database URL format: ${err.message}`);
  }
}

async function resetDisposableDb() {
  const testDbUrlStr = process.env.TEST_DATABASE_URL;
  const runOptIn = process.env.RUN_MIGRATION_INTEGRATION_TESTS;

  if (!testDbUrlStr || runOptIn !== "true") {
    throw new Error(
      "Destructive reset aborted: TEST_DATABASE_URL and RUN_MIGRATION_INTEGRATION_TESTS=true must be explicitly set."
    );
  }

  const testParsed = parseMySqlUrl(testDbUrlStr);

  // 1. Positive disposable-name validation on the DATABASE NAME itself
  const safeKeywords = ["test", "disposable", "migration_test"];
  const isSafeName = safeKeywords.some((kw) => testParsed.dbName.includes(kw));
  if (!isSafeName) {
    throw new Error(
      `Destructive reset aborted: Database name '${testParsed.dbName}' must contain 'test', 'disposable', or 'migration_test'.`
    );
  }

  // Unsafe database keywords on database name
  const unsafeKeywords = ["ahpfinal", "production", "prod", "live", "defaultdb"];
  for (const kw of unsafeKeywords) {
    if (testParsed.dbName.includes(kw)) {
      throw new Error(`Destructive reset aborted: Database name '${testParsed.dbName}' contains forbidden keyword '${kw}'.`);
    }
  }

  // 2. Parse DATABASE_URL if set and compare host, port, dbName
  const defaultDbUrlStr = process.env.DATABASE_URL;
  if (defaultDbUrlStr) {
    const defaultParsed = parseMySqlUrl(defaultDbUrlStr);
    const hostMatch = testParsed.host === defaultParsed.host ||
      (testParsed.host === "localhost" && defaultParsed.host === "127.0.0.1") ||
      (testParsed.host === "127.0.0.1" && defaultParsed.host === "localhost");
    const portMatch = testParsed.port === defaultParsed.port;
    const dbMatch = testParsed.dbName === defaultParsed.dbName;

    if (hostMatch && portMatch && dbMatch) {
      throw new Error(
        `Destructive reset aborted: TEST_DATABASE_URL resolves to the same host/port/database ('${testParsed.dbName}') as DATABASE_URL.`
      );
    }
  }

  // Derive root URL to execute CREATE/DROP database statement safely
  const urlObj = new URL(testDbUrlStr);
  const dbName = testParsed.dbName;
  urlObj.pathname = "/mysql";

  const rootPrisma = new PrismaClient({
    datasources: { db: { url: urlObj.toString() } },
  });

  try {
    await rootPrisma.$executeRawUnsafe(`DROP DATABASE IF EXISTS \`${dbName}\`;`);
    await rootPrisma.$executeRawUnsafe(`CREATE DATABASE \`${dbName}\`;`);
    await rootPrisma.$executeRawUnsafe(`DROP DATABASE IF EXISTS \`${dbName}_shadow\`;`);
    await rootPrisma.$executeRawUnsafe(`CREATE DATABASE \`${dbName}_shadow\`;`);
    console.log(`✅ Successfully reset disposable test database '${dbName}' and shadow database '${dbName}_shadow'`);
  } catch (err) {
    console.error(`❌ Failed resetting disposable test database '${dbName}':`, err.message);
    throw err;
  } finally {
    await rootPrisma.$disconnect();
  }
}

if (require.main === module) {
  resetDisposableDb().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = { resetDisposableDb };
