// Node.js script to build the complete HS_Design_Quotation.html
const fs = require('fs');
const path = 'D:\\OpenClaw_Home\\.openclaw\\workspace\\projects\\hs-design-landing\\HS_Design_Quotation.html';

let html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>HS Design — Staff Quotation Tool</title>
<style>
:root{--green:#5a9e8f;--green-dark:#2d5a47;--green-light:#e8f4f1;--gold:#c9a84c;--gray-50:#f9fafb;--gray-100:#f3f4f6;--gray-200:#e5e7eb;--gray-300:#d1d5db;--gray-500:#6b7280;--gray-700:#374151;--gray-900:#111827;--red:#dc2626;--blue:#2563eb;--radius:8px;}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Arial,sans-serif;background:#f0f2f5;color:var(--gray-900);min-height:100vh}
#gate{position:fixed;inset:0;z-index:9999;background:linear-gradient(135deg,#1a3a2d,#5a9e8f);display:flex;align-items:center;justify-content:center}
.g-box{background:#fff;border-radius:16px;padding:44px 40px;width:360px;text-align:center;box-shadow:0 24px 64px rgba(0,0,0,.25)}
.g-box .emoji{font-size:36px;margin-bottom:12px}
.g-box h2{font-size:20px;font-weight:700;color:var(--green-dark);margin-bottom:6px}
.g-box p{font-size:13px;color:var(--gray-500);margin-bottom:24px}
.g-box input{width:100%;padding:13px 16px;border:2px solid var(--gray-200);border-radius:8px;font-size:16px;outline:none;transition:border .2s;text-align:center;letter-spacing:3px}
.g-box input:focus{border-color:var(--green)}
.g-btn{width:100%;margin-top:14px;padding:14px;background:var(--green);color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;transition:background .2s}
.g-btn:hover{background:var(--green-dark)}
.g-err{color:var(--red);font-size:13px;margin-top:12px;display:none}
.app{display:none;flex-direction:column;min-height:100vh}
.tb{background:#fff;border-bottom:1.5px solid var(--gray-200);padding:12px 24px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100}
.tb-brand{display:flex;align-items:center;gap:10px}
.tb-logo{width:30px;height:30px;background:var(--green);border-radius:7px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:13px}
.tb h1{font-size:15px;font-weight:700}
.tb span{font-size:12px;color:var(--gray-500)}
.tb-actions{display:flex;align-items:center;gap:8px}
.ss{font-size:12px;color:var(--gray-500);min-width:90px;text-align:right}
.btn{padding:8px 16px;border-radius:7px;font-size:13px;font-weight:600;cursor:pointer;border:none;transition:all .2s;display:inline-flex;align-items:center;gap:6px}
.btn-p{background:var(--green);color:#fff}.btn-p:hover{background:var(--green-dark)}
.btn-g{background:transparent;border:1.5px solid var(--gray-300);color:var(--gray-700)}.btn-g:hover{border-color:var(--green);color:var(--green)}
.btn-gold{background:var(--gold);color:#fff}.btn-gold:hover{background:#8a6f2e}
.btn-r{background:transparent;border:1.5px solid #fca5a5;color:var(--red)}.btn-r:hover{background:#fef2f2}
.btn-s{background:#f59e0b;color:#fff}.btn-s:hover{background:#d97706}
.btn-sm{padding:5px 10px;font-size:12px}
.btn:disabled{opacity:.5;cursor:not-allowed}
.body{display:grid;grid-template-columns:280px 1fr;flex:1;height:calc(100vh - 57px)}
.sidebar{background:#fff;border-right:1.5px solid var(--gray-200);display:flex;flex-direction:column;overflow:hidden}
.sh{padding:14px 16px;border-bottom:1px solid var(--gray-200);display:flex;justify-content:space-between;align-items:center}
.sh h3{font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:var(--gray-500);font-weight:700}
.ql{flex:1;overflow-y:auto;padding:10px}
.qc{border:1.5px solid var(--gray-200);border-radius:var(--radius);padding:13px;margin-bottom:8px;cursor:pointer;transition:all .2s}
.qc:hover{border-color:var(--green-light);box-shadow:0 2px 8px rgba(90,158,143,.1)}
.qc.active{border-color:var(--green);background:var(--green-light)}
.qc-t{font-weight:600;font-size:13px;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.qc-p{font-size:11px;color:var(--gray-500);margin-bottom:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.qc-b{display:flex;justify-content:space-between;align-items:center}
.qc-tot{font-size:13px;font-weight:700;color:var(--green)}
.bdg{padding:2px 7px;border-radius:12px;font-size:10px;font-weight:700;text-transform:uppercase}
.bdg-dr{background:var(--gray-200);color:var(--gray-700)}
.bdg-se{background:#dbeafe;color:#1d4ed8}
.bdg-pa{background:#dcfce7;color:#166534}
.el{text-align:center;padding:40px 16px;color:var(--gray-500)}
.el .e{font-size:30px;margin-bottom:10px}
.main{flex:1;overflow-y:auto;padding:24px;background:#f0f2f5}
.mi{max-width:720px;margin:0 auto}
.welcome{background:#fff;border:1.5px solid var(--gray-200);border-radius:var(--radius);padding:48px;text-align:center}
.welcome h2{font-size:17px;color:var(--gray-700);margin-bottom:8px}
.welcome p{font-size:13px;color:var(--gray-500)}
.card{background:#fff;border:1.5px solid var(--gray-200);border-radius:var(--radius);padding:20px;margin-bottom:16px}
.card-h{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:var(--gray-500);margin-bottom:16px;display:flex;align-items:center;gap:8px}
.card-h::after{content:'';flex:1;height:1px;background:var(--gray-200)}
.meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.f{display:flex;flex-direction:column;gap:4px}
.f label{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.7px;color:var(--gray-500)}
.f input,.f select,.f textarea{outline:none;font-family:inherit;background:#fff;width:100%}
.f input,.f select{padding:9px 12px;border:1.5px solid var(--gray-200);border-radius:7px;font-size:14px;transition:border .2s}
.f input:focus,.f select:focus{border-color:var(--green)}
.f textarea{padding:9px 12px;border:1.5px solid var(--gray-200);border-radius:7px;font-size:13px;resize:vertical;line-height:1.6}
.fl{grid-column:1/-1}
.items-hdr{display:grid;grid-template-columns:26px 2fr 70px 60px 80px 80px 36px;gap:5px;padding:0 4px 8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--gray-500);align-items:center}
.item{background:#fff;border:1.5px solid var(--gray-200);border-radius:var(--radius);margin-bottom:8px;overflow:hidden}
.item-main{display:grid;grid-template-columns:26px 2fr 70px 60px 80px 80px 36px;gap:5px;padding:10px 8px;align-items:center}
.item-main input,.item-main select{padding:7px 9px;border:1.5px solid var(--gray-200);border-radius:6px;font-size:13px;outline:none;transition:border .2s;width:100%;font-family:inherit}
.item-main input:focus,.item-main select:focus{border-color:var(--green)}
.item-main input[readonly]{background:var(--gray-50);color:var(--gray-700)}
.cost-in{background:#fff8e6!important;border-color:#fcd34d!important}
.sell-in{background:var(--green-light)!important;border-color:var(--green)!important;font-weight:700}
.del{border:1.5px solid #fca5a5;color:var(--red);cursor:pointer;border-radius:6px;width:32px;height:34px;display:flex;align-items:center;justify-content:center;font-size:15px;background:none;transition:all .2s;flex-shrink:0}
.del:hover{background:#fef2f2}
.exp-h{background:var(--gray-50);padding:8px 10px;cursor:pointer;font-size:12px;color:var(--gray-500);display:flex;align-items:center;gap:6px;border-top:1px solid var(--gray-200)}
.exp-h:hover{background:var(--gray-100)}
.exp-h .tog{margin-left:auto;font-size:14px}
.cb{padding:10px 12px 12px;background:#fffbf0;border-top:1px solid #fcd34d;display:none}
.cb.open{display:block}
.csub{display:grid;grid-template-columns:1fr 90px 36px;gap:5px;margin-bottom:6px}
.csub input{padding:6px 8px;border:1.5px solid #fcd34d;border-radius:5px;font-size:12px;outline:none;font-family:inherit;width:100%}
.csub input:focus{border-color:var(--gold)}
.csub-row{display:flex;align-items:center;gap:4px;font-size:12px;color:var(--gold);font-weight:600;padding:4px 0 8px}
.csub-row span{color:var(--gray-500);font-weight:400}
.mk{font-size:11px;font-weight:700;padding:2px 8px;border-radius:10px}
.mk-g{background:#dcfce7;color:#166534}
.mk-r{background:#fef2f2;color:var(--red)}
.mk-y{background:#fef3c7;color:#92400e}
.totbox{background:var(--green-light);border:1.5px solid rgba(90,158,143,.25);border-radius:var(--radius);padding:16px 20px;display:flex;flex-direction:column;gap:8px;margin-bottom:16px}
.trow{display:flex;justify-content:space-between;align-items:center;font-size:14px}
.trow .lbl{color:var(--gray-600)}
.trow .val{font-weight:600;font-family:monospace}
.trow.gd{padding-top:12px;margin-top:4px;border-top:2px solid var(--green);font-size:16px;color:var(--green-dark)}
.trow.gd .val{font-size:18px}
.trow.cr{font-size:13px;color:var(--gray-500)}
.terms-row{display:grid;grid-template-columns:1fr 36px;gap:6px;margin-bottom:6px;align-items:center}
.terms-row input{padding:8px 11px;border:1.5px solid var(--gray-200);border-radius:6px;font-size:13px;outline:none;font-family:inherit;width:100%;transition:border .2s}
.terms-row input:focus{border-color:var(--green)}
.notes-box{background:#fffbeb;border:1.5px solid #fcd34d;border-radius:var(--radius);padding:14px 16px}
.notes-box h4{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#92400e;margin-bottom:10px}
.no-items{text-align:center;padding:20px;color:var(--gray-400);font-size:13px;border:2px dashed var(--gray-200);border-radius:var(--radius);margin-bottom:12px;display:none}
.mo{display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9000;align-items:center;justify-content:center}
.mo.open{display:flex}
.mo-in{background:#fff;border-radius:14px;width:92%;max-width:820px;max-height:92vh;overflow:auto;display:flex;flex-direction:column}
.mo-hdr{padding:18px 24px;border-bottom:1px solid var(--gray-200);display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;background:#fff;z-index:1}
.mo-hdr h3{font-size:15px;font-weight:700}
.mo-body{padding:28px}
.qp{font-family:'Segoe UI',Arial,sans-serif;font-size:13px;color:#1a1a1a;max-width:720px;margin:0 auto}
.qp-hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px}
.qp-logo h2{font-size:18px;font-weight:700;color:#5a9e8f}
.qp-logo p{font-size:11px;color:#6b7280;line-height:1.8}
.qp-ref{text-align:right}
.qp-ref h3{font-size:15px;font-weight:700;margin-bottom:6px;color:var(--gray-900)}
.qp-ref p{font-size:12px;color:#6b7280;line-height:1.9}
.qp-ci{background:#f0faf7;border-left:3px solid #5a9e8f;border-radius:0 8px 8px 0;padding:12px 16px;margin-bottom:20px}
.qp-ci h4{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#5a9e8f;margin-bottom:8px}
.qp-ci p{font-size:13px;font-weight:600;margin-bottom:2px}
.qp-ci span{font-size:12px;color:#6b7280}
.qp-table{width:100%;border-collapse:collapse;margin-bottom:16px}
.qp-table th{background:#2d5a47;color:#fff;padding:10px 12px;text-align:left;font-size:11px;font-weight:600}
.qp-table td{padding:9px 12px;border-bottom:1px solid #e8e8e8;font-size:12px}
.qp-table .r{text-align:right}
.qp-totals{margin-top:8px;display:flex;justify-content:flex-end}
.qp-tbox{width:250px;border:1px solid #e8e8e8;border-radius:8px;overflow:hidden}
.qp-tr{display:flex;justify-content:space-between;padding:8px 14px;font-size:13px;border-bottom:1px solid #e8e8e8}
.qp-tr.gd{background:#f0faf7;font-weight:700;font-size:15px;color:#2d5a47}
.qp-terms{margin-top:20px;background:#fafafa;border-radius:8px;padding:14px 18px}
.qp-terms h4{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#2d5a47;margin-bottom:10px}
.qp-terms li{margin-bottom:4px;font-size:12px;color:#6b7280}
.qp-footer{margin-top:28px;text-align:center;font-size:11px;color:#9a9ab0;padding-top:14px;border-top:1px solid #e8e8e8}
</style>
</head>
<body>
<div id="gate">
  <div class="g-box">
    <div class="emoji">🏢</div>
    <h2>HS Design Staff Portal</h2>
    <p>Internal quotation tool — password required</p>
    <input class="gate-input" type="password" id="pass" placeholder="Password" onkeydown="if(event.key==='Enter')chkGate()">
    <button class="g-btn" onclick="chkGate()">Enter</button>
    <div class="g-err" id="gerr">Incorrect password</div>
  </div>
</div>
<div class="app" id="app">
  <div class="tb">
    <div class="tb-brand"><div class="tb-logo">HS</div><div><h1>Quotation Tool</h1><span>HS Design Internal</span></div></div>
    <div class="tb-actions"><span class="ss" id="ss">—</span>
      <button class="btn btn-g" onclick="saveQuote()">💾 Save</button>
      <button class="btn btn-gold" onclick="openPDF()">📄 Export PDF</button>
    </div>
  </div>
  <div class="body">
    <div class="sidebar">
      <div class="sh"><h3>Quotations</h3><button class="btn btn-p btn-sm" onclick="newQuote()">+ New</button></div>
      <div class="ql" id="ql"><div class="el"><div class="e">📋</div><p>Loading...</p></div></div>
    </div>
    <div class="main">
      <div class="mi">
        <div id="welcome"><div class="welcome"><h2>Select a quotation or create a new one</h2><p>Click <strong>+ New</strong> in the sidebar to start</p></div></div>
        <div id="editor" style="display:none">
          <div class="card">
            <div class="card-h">Client Information</div>
            <div class="meta-grid">
              <div class="f"><label>Client Name</label><input id="f-name" placeholder="e.g. Mr Ahmad / Company Name" oninput="dirty()"></div>
              <div class="f"><label>Quotation No</label><input id="f-qno" placeholder="QUO-HS-001" oninput="dirty()"></div>
              <div class="f fl"><label>Client Address</label><input id="f-addr" placeholder="Full billing address" oninput="dirty()"></div>
              <div class="f fl"><label>Project Address</label><input id="f-proj" placeholder="Site address for this project" oninput="dirty()"></div>
              <div class="f"><label>Date</label><input type="date" id="f-date" oninput="dirty()"></div>
              <div class="f"><label>Status</label><select id="f-status" onchange="dirty()"><option value="Draft">Draft</option><option value="Sent">Sent</option><option value="Paid">Paid</option></select></div>
            </div>
          </div>
          <div class="card">
            <div class="card-h">Line Items <span style="font-weight:400;text-transform:none;letter-spacing:0;font-size:11px;color:var(--gray-400)">— Cost breakdown hidden in client PDF</span></div>
            <div class="items-hdr"><span>#</span><span>Description</span><span>Unit</span><span>Qty</span><span>Cost (RM)</span><span>Sell (RM)</span><span></span></div>
            <div id="items-container"></div>
            <div class="no-items" id="no-items">No items — click "+ Add Item" below</div>
            <button class="btn btn-g btn-sm" onclick="addItem()" style="margin-top:4px">+ Add Item</button>
          </div>
          <div class="card">
            <div class="card-h">Summary</div>
            <div class="totbox">
              <div class="trow cr"><span class="lbl">Total Cost (Internal)</span><span class="val" id="tot-cost">RM 0.00</span></div>
              <div class="trow"><span class="lbl">Markup</span><span class="val" id="tot-mk">—</span></div>
              <div class="trow gd"><span class="lbl">Grand Total (Client)</span><span class="val" id="tot-sell">RM 0.00</span></div>
            </div>
          </div>
          <div class="card">
            <div class="card-h">Payment Terms</div>
            <div id="terms-container"></div>
            <button class="btn btn-g btn-sm" onclick="addTerm()" style="margin-top:4px">+ Add Term</button>
          </div>
          <div class="card notes-box">
            <h4>🔒 Internal Notes (Hidden from PDF)</h4>
            <textarea id="f-notes" rows="3" placeholder="e.g. Remember to add transport cost, markup notes..." oninput="dirty()" style="width:100%;border:1.5px solid #fcd34d;border-radius:7px;padding:9px 12px;font-size:13px;font-family:inherit;resize:vertical;outline:none"></textarea>
          </div>
          <div style="display:flex;gap:10px;margin-top:8px">
            <button class="btn btn-r" onclick="delQuote()">🗑 Delete</button>
            <button class="btn btn-s" onclick="duplicateQuote()">📋 Duplicate</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
<div class="mo" id="pdfmo">
  <div class="mo-in">
    <div class="mo-hdr"><h3>📄 PDF Preview — Client Version (Cost Hidden)</h3>
      <div style="display:flex;gap:8px"><button class="btn btn-p" onclick="printPDF()">🖨 Print / Save PDF</button><button class="btn btn-g" onclick="closePDF()">Close</button></div>
    </div>
    <div class="mo-body" id="pdfbody"></div>
  </div>
</div>
<script>
const NK='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';
const DB='329538249e7e804bb295f34904902b1a';
const PASSE='HSHSHS';
const NH={'Authorization':'Bearer '+NK,'Notion-Version':'2022-06-28','Content-Type':'application/json'};
const UNITS=['nos','set','m','m²','lot','box','lump sum','day','trip','ft','ft²','hour'];
let quotes=[];
let activeId=null;
let isDirty=false;
let autoSaveT=null;
let _items=[]; // working copy of items in editor

function chkGate(){if(document.getElementById('pass').value===PASSE){document.getElementById('gate').style.display='none';document.getElementById('app').style.display='flex';document.getElementById('app').style.flexDirection='column';loadQuotes();}else{document.getElementById('gerr').style.display='block';}}

async function loadQuotes(){setSS('Loading...');try{const r=await fetch('https://api.notion.com/v1/databases/'+DB+'/query',{method:'POST',headers:NH,body:JSON.stringify({sorts:[{property:'Date',direction:'descending'}],page_size:50})});const d=await r.json();quotes=(d.results||[]).map(p=>{const g=k=>{const v=p.properties[k];if(!v)return'';if(v.type==='title')return v.title?.[0]?.plain_text||'';if(v.type==='rich_text')return v.rich_text?.[0]?.plain_text||'';if(v.type==='date')return v.date?.start||'';if(v.type==='select')return v.select?.name||'';if(v.type==='status')return v.status?.name||'';return'';};let items=[],terms=[],notes='',qno='',addr='';try{const j=JSON.parse(g('Notes')||'{}');items=j.items||[];terms=j.terms||[];notes=j.notes||'';qno=j.qno||'';addr=j.addr||'';}catch(e){}return {id:p.id,name:g('Name'),project:g('Project'),date:g('Date'),status:g('Status')||'Draft',qno,addr,items,terms,notes};});renderList();setSS(quotes.length?'Loaded '+quotes.length+' quotes':'No quotes yet');}catch(e){setSS('Offline');renderList();}}

function setSS(m){document.getElementById('ss').textContent=m;}

function renderList(){const el=document.getElementById('ql');if(!quotes.length){el.innerHTML='<div class="el"><div class="e">📋</div><p>No quotations yet</p></div>';return;}el.innerHTML=quotes.map(q=>{const tot=q.items.reduce((s,it)=>s+(parseFloat(it.sell)||0)*(parseFloat(it.qty)||0),0);const bdg=q.status==='Sent'?'bdg-se':q.status==='Paid'?'bdg-pa':'bdg-dr';return '<div class="qc '+(q.id===activeId?'active':'')+'" onclick="openQ(\''+q.id+'\')"><div class="qc-t">'+esc(q.name||'Unnamed')+'</div><div class="qc-p">'+esc(q.project||'—')+'</div><div class="qc-b"><span class="qc-tot">RM '+fmt(tot)+'</span><span class="bdg '+bdg+'">'+q.status+'</span></div></div>';}).join('');}

function openQ(id){if(isDirty&&!confirm('Unsaved changes. Discard?'))return;activeId=id;const q=quotes.find(x=>x.id===id);if(!q)return;_items=JSON.parse(JSON.stringify(q.items));document.getElementById('welcome').style.display='none';document.getElementById('editor').style.display='block';document.getElementById('f-name').value=q.name||'';document.getElementById('f-qno').value=q.qno||'';document.getElementById('f-addr').value=q.addr||'';document.getElementById('f-proj').value=q.project||'';document.getElementById('f-date').value=q.date||'';document.getElementById('f-status').value=q.status||'Draft';document.getElementById('f-notes').value=q.notes||'';renderItems();renderTerms(q.terms||[]);recalc();isDirty=false;setSS('Loaded');renderList();}

function newQuote(){if(isDirty&&!confirm('Unsaved changes. Discard?'))return;activeId='__new__';_items=[makeItem()];document.getElementById('welcome').style.display='none';document.getElementById('editor').style.display='block';document.getElementById('f-name').value='';document.getElementById('f-qno').value='QUO-HS-'+String(quotes.length+1).padStart(3,'0');document.getElementById('f-addr').value='';document.getElementById('f-proj').value='';document.getElementById('f-date').value=ISO();document.getElementById('f-status').value='Draft';document.getElementById('f-notes').value='';renderItems();renderTerms(['50% deposit upon confirmation','40% upon work commencement','10% upon completion']);recalc();isDirty=false;setSS('New quotation');renderList();}

function makeItem(){return {desc:'',unit:'nos',qty:1,costItems:[{desc:'',amt:0}],sell:0};}

function ISO(){return new Date().toISOString().slice(0,10);}

function fmt(n){return parseFloat(n||0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g,',');}
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

// ITEMS RENDERING
function renderItems(){const c=document.getElementById('items-container');document.getElementById('no-items').style.display=_items.length?'none':'block';c.innerHTML='';_items.forEach((it,i)=>c.appendChild(buildItemRow(it,i)));recalc();}

function buildItemRow(it,i){const el=document.createElement('div');el.className='item';const ct=(it.costItems||[]).reduce((s,c)=>s+(parseFloat(c.amt)||0),0);const mk=ct>0&&it.sell>0?((it.sell-ct)/ct*100):0;const mkCls=mk>=30?'mk-g':mk>=15?'mk-y':'mk-r';const ctStr=ct>0?'<span style="font-size:11px;color:var(--gold)">RM '+fmt(ct)+'</span>':'';const mkStr=mk>0?'<span class="mk '+mkCls+'">+'+fmt(mk)+'% markup</span>':'';const ciRows=(it.costItems||[]).map((ci,cii)=>'<div class="csub"><input type="text" placeholder="e.g. Wire 100m" value="'+esc(ci.desc)+'" oninput="syncCi('+i+','+cii+',this)"><input type="number" min="0" placeholder="RM" value="'+(ci.amt||'')+'" oninput="syncCi('+i+','+cii+',this)"><button class="del" style="font-size:13px" onclick="remCi('+i+','+cii+',this)">×</button></div>').join('');el.innerHTML='<div class="item-main"><span style="font-size:13px;color:var(--gray-400);text-align:center;font-weight:600">'+(i+1)+'</span><input type="text" placeholder="e.g. Supply & install lighting point" value="'+esc(it.desc)+'" oninput="syncMain('+i+',this)"><select onchange="syncMain('+i+',this)">'+UNITS.map(u=>'<option value="'+u+'" '+(it.unit===u?'selected':'')+'>'+u+'</option>').join('')+'</select><input type="number" min="0" placeholder="1" value="'+it.qty+'" oninput="syncMain('+i+',this)" style="text-align:center"><input type="number" class="cost-in" min="0" placeholder="0.00" value="'+(ct>0?fmt(ct):'')+'" readonly title="Total cost — click 🔽 to edit"><input type="number" class="sell-in" min="0" placeholder="0.00" value="'+(it.sell?fmt(it.sell):'')+'" oninput="syncMain('+i+',this)"><button class="del" onclick="remItem('+i+')">×</button></div><div class="exp-h" onclick="toggleCost(this)">💰 Cost breakdown (internal) '+ctStr+' '+mkStr+'<span class="tog">▶</span></div><div class="cb">'+ciRows+'<button class="btn btn-g btn-sm" onclick="addCi('+i+',this)">+ Add cost item</button><div class="csub-row">Total cost: <span>RM '+fmt(ct)+'</span></div></div>';return el;}

function toggleCost(el){const cb=el.nextElementSibling;cb.classList.toggle('open');el.querySelector('.tog').textContent=cb.classList.contains('open')?'▼':'▶';}

function addItem(){_items.push(makeItem());renderItems();isDirty=true;dirty();}

function remItem(i){_items.splice(i,1);renderItems();isDirty=true;dirty();}

function syncMain(i,inp){const row=inp.closest('.item');const sel=row.querySelectorAll('input,select');_items[i].desc=sel[1].value;_items[i].unit=sel[2].value;_items[i].qty=parseFloat(sel[3].value)||0;_items[i].sell=parseFloat(sel[5].value)||0;recalc();isDirty=true;dirty();}

function addCi(i,btn){_items[i].costItems.push({desc:'',amt:0});const row=btn.closest('.cb');const ciRows=row.querySelectorAll('.csub');const newRow=document.createElement('div');newRow.className='csub';newRow.innerHTML='<input type="text" placeholder="e.g. Wire 100m" value="" oninput="syncCi('+i+','+ciRows.length+',this)"><input type="number" min="0" placeholder="RM" value="" oninput="syncCi('+i+','+ciRows.length+',this)"><button class="del" style="font-size:13px" onclick="remCi('+i+','+ciRows.length+',this)">×</button>';row.insertBefore(newRow,btn);recalc();isDirty=true;dirty();}

function remCi(i,cii,btn){_items[i].costItems.splice(cii,1);btn.closest('.csub').remove();recalc();isDirty=true;dirty();}

function syncCi(i,cii,inp){const row=inp.closest('.csub');const inputs=row.querySelectorAll('input');_items[i].costItems[cii].desc=inputs[0].value;_items[i].costItems[cii].amt=parseFloat(inputs