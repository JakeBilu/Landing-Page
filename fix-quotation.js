const fs = require('fs');

// Fix Landing Page staff button - change "👤 员工入口" to just "👤" (keep it minimal)
const h = fs.readFileSync('D:\\OpenClaw_Home\\.openclaw\\workspace\\projects\\hs-design-landing\\index.html', 'utf8');
const old = '👤 员工入口';
const i = h.indexOf(old);
console.log('Landing page button:', i !== -1 ? 'FOUND' : 'NOT FOUND - already clean');
if (i !== -1) {
  const n = h.slice(0,i) + '👤' + h.slice(i+old.length);
  fs.writeFileSync('D:\\OpenClaw_Home\\workspace\\projects\\hs-design-landing\\index.html', n);
  console.log('Fixed!');
}

// Disable WhatsApp in openclaw.json
const ojson = 'D:\\OpenClaw_Home\\.openclaw\\openclaw.json';
const oj = fs.readFileSync(ojson, 'utf8');

const whatsappON = '"whatsapp": {', whatsappOFF = '"whatsapp": { "enabled": false,';

// Check current WhatsApp setting first
const wEcho = oj.indexOf('"whatsapp"');
console.log('WhatsApp config at', wEcho, oj.slice(wEcho, wEcho+40));

// Find whatsapp enabled: in openclaw.json
const wOn = '"whatsapp": { "enabled": true';
if (oj.indexOf(wOn) !== -1) {
  const n2 = oj.replace('"whatsapp": {', '"whatsapp": { "enabled": false');
  fs.writeFileSync(ojson, n2);
  console.log('WhatsApp DISABLED');
} else {
  console.log('WhatsApp already disabled or unknown state');
  console.log(oj.slice(wEcho, wEcho+30));
}
