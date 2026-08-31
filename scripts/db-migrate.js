const { execSync } = require('child_process');

function main() {
  console.log('=== PRISMA DATABASE MIGRATION RUNNER ===');
  console.log('Executing: npx prisma migrate deploy --schema=prisma/schema.prisma');

  try {
    execSync('npx prisma migrate deploy --schema=prisma/schema.prisma', { stdio: 'inherit' });
    console.log('✅ Migrations applied successfully.');
  } catch (err) {
    console.error('\n❌ Migration deployment failed!');
    console.error(`Command exited with status code: ${err.status || 1}`);
    process.exit(err.status || 1);
  }
}

main();
