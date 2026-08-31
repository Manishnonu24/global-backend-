const fs = require('fs');
const path = require('path');

const searchRegex = /(headless cms|global cms|cms admin|cms dashboard|cms site|content management system|\bCMS\b)/gi;

function searchDir(dir, results) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === 'node_modules' || file === '.next' || file === '.git' || file === 'public' || file.startsWith('.')) continue;
    
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchDir(fullPath, results);
    } else if (stat.isFile() && (fullPath.endsWith('.js') || fullPath.endsWith('.jsx') || fullPath.endsWith('.css') || fullPath.endsWith('.md'))) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (searchRegex.test(line)) {
          results.push({
            file: fullPath,
            lineNum: i + 1,
            lineContent: line.trim()
          });
        }
      }
    }
  }
}

const results = [];
searchDir(path.join(__dirname, 'src'), results);
searchDir(path.join(__dirname, 'docs'), results);
searchDir(path.join(__dirname, 'tests'), results);

fs.writeFileSync('C:\\Users\\udayv\\.gemini\\antigravity-ide\\brain\\9e69b3d7-c7ca-4aa1-b798-ec42d3eff2bb\\scratch\\fast_cms_audit_final.json', JSON.stringify(results, null, 2));
console.log(`Found ${results.length} matches.`);
