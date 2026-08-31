import mysql from 'mysql2/promise';
import 'dotenv/config';

function parseDbUrl(url) {
  const u = new URL(url.replace(/^mysql:\/\//, 'http://'));
  return {
    host: u.hostname,
    port: parseInt(u.port || '3306', 10),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ''),
    ssl: url.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
  };
}

async function runExplains() {
  const conn = await mysql.createConnection(parseDbUrl(process.env.DATABASE_URL));
  console.log('=== RUNNING EXPLAIN ON OPTIMIZED QUERIES ===\n');

  const queries = [
    {
      name: '1. Post Blog Listing Query',
      sql: `EXPLAIN SELECT id, title, slug, publishedAt, createdAt FROM post WHERE siteId = 'AHP' AND status = 'PUBLISHED' AND deletedAt IS NULL AND (publishedAt IS NULL OR publishedAt <= NOW()) ORDER BY publishedAt DESC, createdAt DESC LIMIT 5`
    },
    {
      name: '2. Page Dashboard Listing / Sitemap Query',
      sql: `EXPLAIN SELECT id, slug, updatedAt FROM page WHERE siteId = 'AHP' AND deletedAt IS NULL ORDER BY updatedAt DESC LIMIT 20`
    },
    {
      name: '3. Recipe Public Listing Query',
      sql: `EXPLAIN SELECT id, title, createdAt FROM recipe WHERE siteId = 'AHP' AND status = 'APPROVED' ORDER BY createdAt DESC LIMIT 10`
    },
    {
      name: '4. Notification Alert Polling Query',
      sql: `EXPLAIN SELECT id, title, message, createdAt FROM notificationalert WHERE siteId = 'AHP' ORDER BY createdAt DESC LIMIT 50`
    },
    {
      name: '5. Notification Alert Unread Count Query',
      sql: `EXPLAIN SELECT COUNT(*) FROM notificationalert WHERE siteId = 'AHP' AND isRead = 0`
    },
    {
      name: '6. Comment Public Article Fetch Query',
      sql: `EXPLAIN SELECT id, authorName, content, createdAt FROM comment WHERE siteId = 'AHP' AND postId = 'test-post' AND status = 'approved' ORDER BY createdAt DESC`
    },
    {
      name: '7. Service Public Listing Query',
      sql: `EXPLAIN SELECT id, title, sortOrder FROM service WHERE siteId = 'AHP' AND status = 'ACTIVE' AND visible = 1 AND deletedAt IS NULL ORDER BY sortOrder ASC`
    }
  ];

  for (const q of queries) {
    console.log(`=== ${q.name} ===`);
    const [rows] = await conn.execute(q.sql);
    for (const r of rows) {
      console.log(`  Table: ${r.table}`);
      console.log(`  Type: ${r.type}`);
      console.log(`  Key Used: ${r.key}`);
      console.log(`  Key Len: ${r.key_len}`);
      console.log(`  Ref: ${r.ref}`);
      console.log(`  Rows Examined: ${r.rows}`);
      console.log(`  Extra: ${r.Extra}`);
      console.log(`  Possible Keys: ${r.possible_keys}`);
    }
    console.log('');
  }

  await conn.end();
}

runExplains().catch(err => {
  console.error('EXPLAIN failed:', err);
  process.exit(1);
});
