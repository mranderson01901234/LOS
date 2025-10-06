import fs from 'fs';
import path from 'path';

function fixTemplateLiterals(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix common template literal corruption patterns
  const fixes = [
    // Fix corrupted template literals with missing backticks
    [/\`([^`]*?)\$\{([^}]*?)\`/g, '`$1${$2}`'],
    // Fix unterminated template literals
    [/\`([^`]*?)\$\{([^}]*?)\`\)\.trim\(\);/g, '`$1${$2}`).trim();'],
    // Fix malformed console statements
    [/console\.error\(\`([^`]*?)\$\{([^}]*?)\`\)/g, 'console.error(`$1${$2}`)'],
    [/console\.log\(\`([^`]*?)\$\{([^}]*?)\`\)/g, 'console.log(`$1${$2}`)'],
    [/console\.warn\(\`([^`]*?)\$\{([^}]*?)\`\)/g, 'console.warn(`$1${$2}`)'],
    // Fix missing semicolons after template literals
    [/\`([^`]*?)\$\{([^}]*?)\`\)\s*$/gm, '`$1${$2}`);'],
  ];
  
  fixes.forEach(([pattern, replacement]) => {
    content = content.replace(pattern, replacement);
  });
  
  fs.writeFileSync(filePath, content);
  console.log(`Fixed template literals in ${filePath}`);
}

function fixAllFiles(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      fixAllFiles(filePath);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      try {
        fixTemplateLiterals(filePath);
      } catch (error) {
        console.error(`Error fixing ${filePath}:`, error.message);
      }
    }
  });
}

// Fix all TypeScript files
fixAllFiles('./src');
console.log('Template literal fixes complete');
