const fs = require('fs');
const path = require('path');

function removeConsoleLogs(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      removeConsoleLogs(filePath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      let content = fs.readFileSync(filePath, 'utf8');
      const original = content;
      
      // Remove console.log statements (keep console.error and console.warn)
      content = content.replace(/\s*console\.log\([^)]*\);?\s*/g, '');
      
      if (content !== original) {
        fs.writeFileSync(filePath, content);
        console.log(`Cleaned: ${filePath}`);
      }
    }
  });
}

console.log('Starting console.log cleanup...');
removeConsoleLogs('./src');
console.log('Console.log cleanup complete!');
