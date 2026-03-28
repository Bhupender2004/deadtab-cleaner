const fs = require('fs');
const path = require('path');

const srcDir = path.join('C:\\Users\\Bhupender Yadav\\Desktop\\dead tab cleaner\\deadtab-cleaner\\frontend\\src');

const replacements = [
  { regex: /hover:text-white/g, replacement: 'hover:text-purple-700' },
  { regex: /text-white/g, replacement: 'text-slate-900' },
  { regex: /text-slate-400/g, replacement: 'text-slate-600' },
  { regex: /text-purple-light/g, replacement: 'text-purple-700' },
  { regex: /hover:text-red-400/g, replacement: 'hover:text-red-600' },
  { regex: /text-slate-300/g, replacement: 'text-slate-700' },
  { regex: /text-slate-200/g, replacement: 'text-slate-800' },
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
        console.log(`Updated typography in ${fullPath}`);
      }
    }
  }
}

processDirectory(srcDir);
console.log('Contrast fix complete!');
