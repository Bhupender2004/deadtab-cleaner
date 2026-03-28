const fs = require('fs');
const path = require('path');

const srcDir = path.join('C:\\Users\\Bhupender Yadav\\Desktop\\dead tab cleaner\\deadtab-cleaner\\frontend\\src');

const replacements = [
  // Backgrounds
  { regex: /bg-navy-950/g, replacement: 'bg-transparent' },
  { regex: /bg-navy-900\/50/g, replacement: 'bg-white/50' },
  { regex: /bg-navy-900\/40/g, replacement: 'bg-white/40' },
  { regex: /bg-navy-900/g, replacement: 'bg-white/80' },
  { regex: /bg-navy-800/g, replacement: 'bg-slate-100' },
  { regex: /bg-\[\#1a233a\]/g, replacement: 'bg-slate-100' },
  
  // Text colors
  { regex: /text-slate-200/g, replacement: 'text-slate-800' },
  { regex: /text-slate-300/g, replacement: 'text-slate-700' },
  { regex: /text-slate-400/g, replacement: 'text-slate-500' },
  { regex: /text-slate-500/g, replacement: 'text-slate-400' },
  // Border colors
  { regex: /border-slate-700/g, replacement: 'border-slate-200' },
  { regex: /border-slate-800/g, replacement: 'border-slate-300' },
];

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      let modified = false;
      for (const rule of replacements) {
        if (rule.regex.test(content)) {
          content = content.replace(rule.regex, rule.replacement);
          modified = true;
        }
      }
      
      if (modified) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDirectory(srcDir);
console.log('Done!');
