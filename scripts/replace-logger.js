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
  
  if (content.includes('console.error(')) {
    // 1. Ensure logger import exists
    if (!content.includes('import { logger }')) {
      // Find the last import statement or the beginning of the file
      const importMatches = [...content.matchAll(/^import .*?;?\n/gm)];
      if (importMatches.length > 0) {
        const lastMatch = importMatches[importMatches.length - 1];
        const insertPos = lastMatch.index + lastMatch[0].length;
        content = content.substring(0, insertPos) + "import { logger } from \"@/lib/logger\";\n" + content.substring(insertPos);
      } else {
        content = "import { logger } from \"@/lib/logger\";\n" + content;
      }
    }

    // 2. Ensure crypto is imported if we are going to use randomUUID
    if (!content.includes('import crypto')) {
      const importMatches = [...content.matchAll(/^import .*?;?\n/gm)];
      if (importMatches.length > 0) {
        const lastMatch = importMatches[importMatches.length - 1];
        const insertPos = lastMatch.index + lastMatch[0].length;
        content = content.substring(0, insertPos) + "import crypto from \"crypto\";\n" + content.substring(insertPos);
      } else {
        content = "import crypto from \"crypto\";\n" + content;
      }
    }

    // 3. Find the request object variable name in export async function (GET|POST|PUT|DELETE|PATCH)(request)
    const exportRegex = /export\s+(?:async\s+)?function\s+(GET|POST|PUT|DELETE|PATCH)\s*\(\s*([^,\)]+)/g;
    let match;
    let functionReqVars = {}; // Map of method -> req var name
    
    while ((match = exportRegex.exec(content)) !== null) {
      functionReqVars[match[1]] = match[2].trim();
    }

    // 4. Replace console.error
    // This is tricky using regex, let's try a simple replacement for the standard format:
    // console.error("message", error); or console.error("message:", err);
    // We will do a generic replacement of console.error(msg, err) 
    // -> logger.error({ err, requestId }, msg)
    
    content = content.replace(/catch\s*\(\s*([a-zA-Z0-9_]+)\s*\)\s*\{/g, (match, errVar, offset) => {
      // Inject requestId definition at the start of the catch block
      // But wait, the request object might not be named 'request'.
      // We can try to grab the first argument of the nearest function, but for simplicity:
      // Let's assume request is named req or request, or we can just use a try block for headers
      return match + `\n    const _reqId = (typeof request !== 'undefined' ? request : (typeof req !== 'undefined' ? req : { headers: { get: () => null } })).headers?.get?.('x-request-id') || crypto.randomUUID();`;
    });

    content = content.replace(/console\.error\(\s*(["'`].*?["'`])\s*,\s*([a-zA-Z0-9_]+)\s*\)/g, 'logger.error({ err: $2, requestId: _reqId }, $1)');
    
    if (content !== originalContent) {
      fs.writeFileSync(file, content, 'utf8');
      modifiedCount++;
      console.log("Modified", file);
    }
  }
});

console.log(`Modified ${modifiedCount} files.`);
