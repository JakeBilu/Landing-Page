const fs = require('fs');
const path = 'D:\\OpenClaw_Home\\.openclaw\\workspace\\projects\\hs-design-landing\\index.html';
let html = fs.readFileSync(path, 'utf8');

const old = 'href="#contact" class="btn btn-dark" data-zh="免费空间健康诊断" data-en="Free Health Audit">免费空间健康诊断</a>';
const rep = 'href="HS_Design_Quotation.html" target="_blank" style="display:inline-flex;align-items:center;padding:14px 20px;border-radius:8px;font-size:14px;font-weight:600;color:#5a9e8f;border:2px solid #e0ebe8;text-decoration:none;margin-right:12px;">报价工具</a>';
     + old;

if (!html.includes(old)) { console.log('NOT FOUND'); process.exit(1); }
const newHtml = html.replace(old, rep);
fs.writeFileSync(path, newHtml);
console.log('Done!');
