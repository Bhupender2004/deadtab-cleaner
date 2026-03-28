const fs = require('fs');
const path = require('path');

const srcDir = path.join('C:\\Users\\Bhupender Yadav\\Desktop\\dead tab cleaner\\deadtab-cleaner\\frontend\\src');

const replacements = [
  { regex: /text-purple-700/g, replacement: 'text-slate-700' },
  { regex: /text-purple-accent/g, replacement: 'text-slate-700' },
  { regex: /text-purple-600/g, replacement: 'text-slate-600' },
  { regex: /text-purple-light/g, replacement: 'text-slate-500' },
  { regex: /text-purple-glow/g, replacement: 'text-slate-400' },
  { regex: /text-purple-200/g, replacement: 'text-slate-200' },
  { regex: /bg-purple-accent\/20/g, replacement: 'bg-slate-300/50' },
  { regex: /bg-purple-accent/g, replacement: 'bg-slate-700' },
  { regex: /bg-purple-600/g, replacement: 'bg-slate-600' },
  { regex: /border-purple-accent\/30/g, replacement: 'border-slate-400/30' },
  { regex: /border-purple-accent\/20/g, replacement: 'border-slate-300/50' },
  { regex: /border-purple-accent/g, replacement: 'border-slate-700' },
  { regex: /ring-purple-accent\/20/g, replacement: 'ring-slate-500/20' },
  { regex: /ring-purple-accent/g, replacement: 'ring-slate-500' },
  { regex: /focus:ring-purple-accent/g, replacement: 'focus:ring-slate-500' },
  { regex: /focus:border-purple-accent/g, replacement: 'focus:border-slate-500' },
  { regex: /hover:text-purple-700/g, replacement: 'hover:text-slate-700' },
  { regex: /shadow-purple-accent\/30/g, replacement: 'shadow-slate-900/10' },
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
        console.log(`Updated to grayish-blue in ${fullPath}`);
      }
    }
  }
}

processDirectory(srcDir);
console.log('Grayish-blue switch complete!');
