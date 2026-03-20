const fs = require('fs');
const path = 'D:\\OpenClaw_Home\\.openclaw\\workspace\\projects\\hs-design-landing\\index.html';

let html = fs.readFileSync(path, 'utf8');

// Find the nav-right section and inject after WhatsApp Us anchor
const anchor = 'WhatsApp Us</a>';
const idx = html.indexOf(anchor);
console.log('Anchor found at:', idx);
const btn = `
      <a href="HS_Design_Quotation.html" target="_blank" style="display:inline-flex;align-items:center;padding:14px 20px;border-radius:8px;font-size:14px;font-weight:600;color:#5a9e8f;border:2px solid #e0ebe8;text-decoration:none;transition:all .2s;margin-right:12px;" onmouseover="this.style.background='#e6f4f1';this.style.borderColor='#5a9e8f'" onmouseout="this.style.background='transparent';this.style.borderColor='#e0ebe8'">报价工具 ↗</a>`;

const inj = idx !== -1 ? idx + anchor.length : -1;
console.log('Injection point:', inj);

if (inj === -1) {
  // Try plain ASCII anchor
  const alt = 'href="#contact" class="btn btn-outline"';
  const altIdx = html.indexOf(alt);
  console.log('Alt anchor:', altIdx);
  process.exit(1);
}

const newHtml = html.slice(0, inj) + btn + html.slice(inj);
fs.writeFileSync(path, newHtml, 'utf8');
console.log('Written!');
