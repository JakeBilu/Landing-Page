const fs = require("fs");
const wp = "D:\\OpenClaw_Home\\.openclaw\\openclaw.json";
const hp = "D:\\OpenClaw_Home\\.openclaw\\workspace\\projects\\hs-design-landing\\index.html";
const oj = fs.readFileSync(wp, "utf8");
const hl = fs.readFileSync(hp, "utf8");

// 1. Landing page: change button
const old = "👤 员工入口</a>";
const i = hl.indexOf(old);
if (i === -1) { console.log("Button already clean or different text"); }
else {
  const n2 = hl.replace(old, "</a>");
  fs.writeFileSync(hp, n2);
  console.log("Landing page fixed");
}

// 2. Disable WhatsApp - just set enabled:false in openclaw.json channels.whatsapp
const w = '"whatsapp"';
const wi = oj.indexOf(w);
if (wi === -1) { console.log("WhatsApp key not found"); }
else {
  const on = '"enabled": true';
  const off = '"enabled": false';
  const ni = oj.indexOf(on, wi);
  if (ni === -1) { console.log("WhatsApp already disabled or pattern not matched"); }
  else {
    const nj = oj.replace(on, off);
    fs.writeFileSync(wp, nj);
    console.log("WhatsApp DISABLED");
  }
}
