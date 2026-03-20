const fs = require('fs');
const path = 'D:\\OpenClaw_Home\\.openclaw\\workspace\\projects\\hs-design-landing\\index.html';
let html = fs.readFileSync(path, 'utf8');

// Inject button after WhatsApp咨询 anchor
const anchor = 'WhatsApp咨询</a>';
const idx = html.indexOf(anchor);
if (idx === -1) {
  console.log('NOT FOUND');
  process.exit(1);
}
const btn = '<a href="HS_Design_Quotation.html" target="_blank" style="display:inline-flex;align-items:center;padding:14px 20px;border-radius:8px;font-size:14px;font-weight:600;color:#5a9e8f;border:2px solid #e0ebe8;text-decoration:none;margin-right:12px;">报价工具</a>';
const pos = idx + anchor.length;
const newHtml = html.slice(0, pos) + btn + html.slice(pos);
fs.writeFileSync(path, newHtml);
console.log('Done at', pos);
