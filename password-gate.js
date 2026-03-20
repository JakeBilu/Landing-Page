const fs = require('fs');
const path = 'D:\\OpenClaw_Home\\.openclaw\\workspace\\projects\\hs-design-landing\\HS_Design_Quotation.html';

let html = fs.readFileSync(path, 'utf8');

// Check if password gate already exists
if (html.indexOf('staff-password-gate') !== -1) {
  console.log('Already has password gate');
  process.exit(0);
}

// Find the closing </head> position
const headEnd = html.indexOf('</head>');
console.log('</head> at:', headEnd);

// Inject password gate CSS
const css = `
<style>
#staff-gate {
  position:fixed;inset:0;z-index:9999;background:#e8f5f0;
  display:flex;align-items:center;justify-content:center;min-height:100vh}
#staff-gate .gate-box {
  background:#fff;border:2px solid #5a9e8f;border-radius:16px;
  padding:40px 48px;max-width:400px;width:90%;text-align:center;
  box-shadow:0 8px 32px rgba(90,158,143,0.15)}
#staff-gate h2 {font-size:22px;font-weight:700;color:#5a9e8f;margin:0 0 8px}
#staff-gate p {font-size:13px;color:#6b7280;margin:0 0 24px}
#staff-gate input[type=password] {
  width:100%;padding:14px 16px;border:2px solid #e0ebe8;border-radius:8px;
  font-size:16px;outline:none;transition:border-color .2s;margin-bottom:16px}
#staff-gate input[type=password]:focus {border-color:#5a9e8f}
#staff-gate .btn {
  width:100%;padding:14px;background:#5a9e8f;color:#fff;border:none;
  border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;transition:background .2s}
#staff-gate .btn:hover {background:#3d6b4a}
#staff-gate .error {color:#dc2626;font-size:12px;margin-top:12px;display:none}
</style>
`;

// Inject CSS before </head>
html = html.slice(0, headEnd) + css + html.slice(headEnd);

// Find body tag and inject gate after <body>
const bodyTag = html.indexOf('<body');
console.log('<body at:', bodyTag);
const bodyOpenEnd = html.indexOf('>', bodyTag);
console.log('body> at:', bodyOpenEnd + 1);

// Inject gate HTML right after <body>
const gate = `
<div id="staff-gate"><div class="gate-box">
  <h2>👋 员工入口</h2>
  <p>输入密码继续</p>
  <input type="password" id="staff-pass" placeholder="输入密码" onkeydown="if(event.key==='Enter')checkPass()">
  <button class="btn" onclick="checkPass()">继续 →</button>
  <div class="error" id="pass-error">密码错误</div>
</div></div>
<script>
function checkPass(){
  var v=document.getElementById('staff-pass').value;
  if(v==='HSHSHS'){
    document.getElementById('staff-gate').style.display='none';
  } else {
    document.getElementById('pass-error').style.display='block';
  }
}
document.getElementById('staff-pass').focus();
</script>
`;

html = html.slice(0, bodyOpenEnd+1) + gate + html.slice(bodyOpenEnd+1);
fs.writeFileSync(path, html);
console.log('Done. Gate added.');

// Push git
const {execSync} = require('child_process');
try {
  execSync('git add HS_Design_Quotation.html', {cwd:'D:\\OpenClaw_Home\\.openclaw\\workspace\\projects\\hs-design-landing'});
  const c = 'Update staff gate: HSHSHS';
  execSync('git commit -m "', null, 'D:\\OpenClaw_Home\\.openclaw\\workspace\\projects\\hs-design-landing');

} catch(e) {}
console.log('Committed');
