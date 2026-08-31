import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.resolve(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.js') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const apiDir = path.resolve('./src/app/api');
const files = walk(apiDir);

let modifiedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  
  if (content.includes('logger.error(')) {
    // 1. Ensure Sentry import exists
    if (!content.includes('import * as Sentry')) {
      const importMatches = [...content.matchAll(/^import .*?;?\n/gm)];
      if (importMatches.length > 0) {
        const lastMatch = importMatches[importMatches.length - 1];
        const insertPos = lastMatch.index + lastMatch[0].length;
        content = content.substring(0, insertPos) + "import * as Sentry from \"@sentry/nextjs\";\n" + content.substring(insertPos);
      } else {
        content = "import * as Sentry from \"@sentry/nextjs\";\n" + content;
      }
    }

    // 2. Inject Sentry.captureException BEFORE logger.error, capturing the same error var and _reqId
    // Match: logger.error({ err: errorVar, requestId: _reqIdVar }
    content = content.replace(/logger\.error\(\{\s*err:\s*([a-zA-Z0-9_]+),\s*requestId:\s*([a-zA-Z0-9_]+)\s*\}/g, (match, errVar, reqIdVar) => {
      return `Sentry.captureException(${errVar}, { tags: { requestId: ${reqIdVar} } });\n    ${match}`;
    });
    
    if (content !== originalContent) {
      fs.writeFileSync(file, content, 'utf8');
      modifiedCount++;
      console.log("Modified", file);
    }
  }
});

console.log(`Modified ${modifiedCount} files for Sentry injection.`);
