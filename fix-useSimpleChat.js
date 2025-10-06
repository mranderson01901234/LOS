import fs from 'fs';

function fixUseSimpleChat() {
  const filePath = './src/hooks/useSimpleChat.ts';
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix all the malformed code patterns
  const fixes = [
    // Fix malformed function calls and statements
    [/(\w+);(\w+)/g, '$1;\n$2'],
    [/(\w+)\s*\+\s*'\.\.\.'\)\s*;?\s*$/gm, '$1;'],
    [/(\w+)\s*\+\s*'\.\.\.'\)\s*;?\s*$/gm, '$1;'],
    // Fix malformed try-catch blocks
    [/(\w+);}catch/g, '$1;\n  } catch'],
    [/(\w+);}finally/g, '$1;\n  } finally'],
    // Fix missing braces and semicolons
    [/(\w+)\s*\+\s*'\.\.\.'\)\s*;?\s*$/gm, '$1;'],
    // Fix malformed if statements
    [/(\w+)\s*\+\s*'\.\.\.'\)\s*;?\s*$/gm, '$1;'],
    // Fix malformed function declarations
    [/(\w+)\s*\+\s*'\.\.\.'\)\s*;?\s*$/gm, '$1;'],
  ];
  
  fixes.forEach(([pattern, replacement]) => {
    content = content.replace(pattern, replacement);
  });
  
  fs.writeFileSync(filePath, content);
  console.log('Fixed useSimpleChat.ts');
}

fixUseSimpleChat();
