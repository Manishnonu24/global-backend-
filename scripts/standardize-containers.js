const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

function standardizeContainers() {
  const dirs = ['./src/components', './src/app'];
  let count = 0;

  dirs.forEach(dir => {
    walkDir(dir, function(filePath) {
      if (!filePath.endsWith('.js') && !filePath.endsWith('.jsx')) return;

      const content = fs.readFileSync(filePath, 'utf8');
      
      // We want to replace things like:
      // className="container"
      // className="container mx-auto px-4"
      // className="container max-w-[800px] mx-auto px-4 text-center"
      // className="container relative z-10 mx-auto px-6 md:px-10"
      // className="container mx-auto my-10 px-6"
      // with a standardized prefix: className="container mx-auto px-4 md:px-10 ..."
      
      let newContent = content;
      
      // Strategy: match className="..." blocks that contain the word container
      newContent = newContent.replace(/className=(['"{`])([^'"{`]*?\bcontainer\b[^'"{`]*?)\1/g, (match, quote, classStr) => {
        // If it's something like "header-container" but not "container", ignore
        const words = classStr.split(/\s+/);
        if (!words.includes('container')) return match;

        // Filter out old sizing/spacing classes
        const filteredWords = words.filter(w => {
            return w !== 'container' && 
                   w !== 'mx-auto' && 
                   !w.match(/^px-\d+$/) && 
                   !w.match(/^(sm|md|lg|xl|2xl):px-\d+$/) &&
                   !w.match(/^max-w-/);
        });

        // Reconstruct with standard
        const standardClasses = ['container', 'mx-auto', 'px-4', 'md:px-10'];
        const finalClasses = [...standardClasses, ...filteredWords].join(' ');
        
        return `className=${quote}${finalClasses}${quote}`;
      });

      if (newContent !== content) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        count++;
        console.log(`Updated ${filePath}`);
      }
    });
  });
  
  console.log(`Updated ${count} files.`);
}

standardizeContainers();
