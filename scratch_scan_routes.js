const fs = require('fs');
const path = require('path');

const APP_DIR = path.join(__dirname, 'src', 'app');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      if (f === 'page.js' || f === 'page.jsx') {
        callback(dirPath);
      }
    }
  });
}

const routes = [];

walkDir(APP_DIR, (filePath) => {
  const relPath = path.relative(APP_DIR, filePath);
  // Get the route path (e.g. /dashboard/pages)
  let routePath = '/' + path.dirname(relPath).replace(/\\/g, '/');
  if (routePath === '/.') routePath = '/';

  const content = fs.readFileSync(filePath, 'utf-8');

  let type = 'CODE_TEMPLATE'; // Default

  // Determine Type
  if (routePath.startsWith('/dashboard') || routePath.startsWith('/crm')) {
    type = 'ADMIN';
  } else if (routePath.startsWith('/api')) {
    type = 'SYSTEM';
  } else if (routePath === '/preview' || routePath.startsWith('/login') || routePath === '/forgot-password' || routePath === '/reset-password' || routePath === '/account' || routePath === '/maintenance' || routePath === '/pilot' || routePath.startsWith('/services/private')) {
    type = 'SYSTEM';
  } else {
    // Check if it's a CMS built page (uses PageRenderer or gets content entirely from CMS dynamically)
    if (content.includes('PageRenderer') || routePath === '/[...slug]') {
      type = 'CMS_BUILT';
    } 
    // Check if it's a detail page
    else if (routePath.includes('[slug]') || routePath.includes('[id]') || routePath.includes('[type]')) {
      type = 'ENTITY_DETAIL';
    }
    // Check if it's a list page
    else if (routePath === '/blogs' || routePath === '/recipes' || routePath === '/quizzes' || routePath === '/services' || routePath === '/magazine' || routePath === '/publication') {
      type = 'ENTITY_LIST';
    }
  }

  // Analyze Public Routes for hardcoded content
  let usesTemplateContent = content.includes('getTemplateContent');
  let usesPrismaPage = content.includes('prisma.page');
  let hasHardcodedText = false; 
  
  const jsxTextMatch = content.match(/>([^<{]+)</g);
  if (jsxTextMatch) {
    const texts = jsxTextMatch.map(t => t.replace(/[><]/g, '').trim()).filter(t => t.length > 5);
    if (texts.length > 3) hasHardcodedText = true;
  }

  routes.push({
    route: routePath,
    type,
    file: relPath,
    usesTemplateContent,
    usesPrismaPage,
    hasHardcodedText
  });
});

console.log(JSON.stringify(routes, null, 2));
