const fs = require('fs');
let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

// Find all @@unique([ ... ]) and @@index([ ... ]) arrays
const regex = /@@(?:unique|index)\(\[([^\]]+)\]\)/g;
let match;
const fieldsToShrink = new Set();

while ((match = regex.exec(schema)) !== null) {
  const fields = match[1].split(',').map(f => f.trim().replace(/"/g, ''));
  // If the index has more than 1 field, we need to shrink them
  if (fields.length > 1) {
    fields.forEach(f => fieldsToShrink.add(f));
  }
}

// Now replace those specific fields to have @db.VarChar(80) if they are String without a db map yet
// Wait, to be safe we'll just replace 'String' with 'String @db.VarChar(80)' for the specific field names.
for (const field of fieldsToShrink) {
  // Regex looks for: fieldName String [anything but @db.VarChar]
  const fieldRegex = new RegExp(`^(\\s+${field}\\s+)String(\\s*.*)$`, 'gm');
  schema = schema.replace(fieldRegex, (m, p1, p2) => {
    // If it already has VarChar(100) or something, replace it
    if (p2.includes('@db.VarChar')) {
      return p1 + 'String' + p2.replace(/@db\.VarChar\(\d+\)/g, '@db.VarChar(80)');
    } else if (p2.includes('@db.Text') || p2.includes('@db.LongText')) {
      // Don't shrink text fields, although they shouldn't be in unique constraints
      return m;
    } else {
      return p1 + 'String' + p2 + ' @db.VarChar(80)';
    }
  });
}

// Also make sure single field @unique Strings aren't > 250 chars
const singleUniqueRegex = /^(\s+\w+\s+)String(\??\s+.*@unique.*)$/gm;
schema = schema.replace(singleUniqueRegex, (m, p1, p2) => {
  if (p2.includes('@db.VarChar')) {
     return p1 + 'String' + p2.replace(/@db\.VarChar\(\d+\)/g, '@db.VarChar(191)'); // 191 is max for utf8mb4 with 767 limit, but 250 for 1000 limit.
  }
  return p1 + 'String' + p2 + ' @db.VarChar(191)';
});

fs.writeFileSync('prisma/schema.prisma', schema, 'utf8');
console.log('Fixed composite unique lengths for WAMP!');
