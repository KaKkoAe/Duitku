// Cek sintaks JSX untuk semua file project (bukan bundler, cuma parser)
const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');

const root = process.argv[2] || '.';
const skip = new Set(['node_modules', '.git', '.expo', 'dist', 'web-build', 'assets']);
let errors = 0;
let count = 0;

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    if (skip.has(name)) continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/\.(js|jsx)$/.test(name)) {
      count++;
      const code = fs.readFileSync(p, 'utf8');
      try {
        parser.parse(code, {
          sourceType: 'module',
          plugins: ['jsx', 'classProperties', 'objectRestSpread', 'optionalChaining', 'nullishCoalescingOperator'],
        });
      } catch (e) {
        errors++;
        console.log(`✗ ${p}: ${e.message}`);
      }
    }
  }
}
walk(root);
console.log(`\n${count} file diperiksa, ${errors} error.`);
process.exit(errors ? 1 : 0);
