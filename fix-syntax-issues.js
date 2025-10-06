import fs from 'fs';
import path from 'path';

function fixSyntaxIssues(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let fixed = false;
  
  // Fix common syntax issues
  const fixes = [
    // Fix missing semicolons after statements
    [/(\w+)\s*\+\s*'\.\.\.'\)\s*;?\s*$/gm, '$1;'],
    // Fix malformed function calls
    [/(\w+)\s*\+\s*'\.\.\.'\)\s*;?\s*$/gm, '$1;'],
    // Fix missing line breaks between statements
    [/(\w+);(\w+)/g, '$1;\n$2'],
    // Fix malformed try-catch blocks
    [/(\w+);}catch/g, '$1;\n  } catch'],
    [/(\w+);}finally/g, '$1;\n  } finally'],
    // Fix missing braces
    [/(\w+)\s*\+\s*'\.\.\.'\)\s*;?\s*$/gm, '$1;'],
    // Fix malformed console statements
    [/console\.(\w+)\(\`([^`]*?)\$\{([^}]*?)\`\)/g, 'console.$1(`$2${$3}`)'],
    // Fix unterminated strings
    [/(\w+)\s*\+\s*'\.\.\.'\)\s*;?\s*$/gm, '$1;'],
    // Fix missing semicolons
    [/(\w+)\s*\+\s*'\.\.\.'\)\s*;?\s*$/gm, '$1;'],
  ];
  
  fixes.forEach(([pattern, replacement]) => {
    const newContent = content.replace(pattern, replacement);
    if (newContent !== content) {
      content = newContent;
      fixed = true;
    }
  });
  
  if (fixed) {
    fs.writeFileSync(filePath, content);
    console.log(`Fixed syntax issues in ${filePath}`);
  }
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
        fixSyntaxIssues(filePath);
      } catch (error) {
        console.error(`Error fixing ${filePath}:`, error.message);
      }
    }
  });
}

// Fix all TypeScript files
fixAllFiles('./src');
console.log('Syntax fixes complete');
