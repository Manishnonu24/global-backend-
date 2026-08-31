const fs = require('fs');
const path = require('path');

const targetString = "const _reqId = (typeof request !== 'undefined' ? request : (typeof req !== 'undefined' ? req : { headers: { get: () => null } })).headers?.get?.('x-request-id') || crypto.randomUUID();";
const replacement = 'const _reqId = getRequestId(typeof request !== "undefined" ? request : (typeof req !== "undefined" ? req : {}));';
const importStatement = 'import { getRequestId } from "@/lib/observability/requestContext";\n';

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.js') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes(targetString)) {
        content = content.replaceAll(targetString, replacement);
        if (!content.includes('import { getRequestId }')) {
          const importMatches = [...content.matchAll(/^import .*;/gm)];
          if (importMatches.length > 0) {
            const lastMatch = importMatches[importMatches.length - 1];
            const insertPos = lastMatch.index + lastMatch[0].length + 1;
            content = content.slice(0, insertPos) + importStatement + content.slice(insertPos);
          } else {
            content = importStatement + content;
          }
        }
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Updated: ' + fullPath);
      }
    }
  }
}

processDirectory(path.join(process.cwd(), 'src/app/api'));
