const fs = require('fs');
const html = fs.readFileSync('D:\\OpenClaw_Home\\.openclaw\\workspace\\projects\\hs-design-landing\\index.html', 'utf8');
const idx = html.indexOf('nav-right">');
console.log('nav-right tag at:', idx);
console.log(html.slice(idx, idx+300));
