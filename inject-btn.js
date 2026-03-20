const fs = require('fs');
const h = fs.readFileSync('D:\\OpenClaw_Home\\.openclaw\\workspace\\projects\\hs-design-landing\\index.html', 'utf8');
const needle = 'WhatsApp 咨询</a>';
const pos = h.indexOf(needle);
if (pos === -1) { console.log('NOT FOUND'); process.exit(1); }
const btn = '<a href="HS_Design_Quotation.html" target="_blank" style="display:inline-flex;align-items:center;padding:14px 20px;border-radius:8px;font-size:14px;font-weight:600;color:#5a9e8f;border:2px solid #e0ebe8;text-decoration:none;margin-right:12px;">报价工具</a>';
const np = pos + needle.length;
const nh = h.slice(0, np) + btn + h.slice(np);
fs.writeFileSync('D:\\OpenClaw_Home\\.openclaw\\workspace\\projects\\hs-design-landing\\index.html', nh);
console.log('Done at', np);
