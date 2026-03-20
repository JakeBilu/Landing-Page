
// Append the rest of the HTML file
const fs = require('fs');
const path = 'D:\\OpenClaw_Home\\.openclaw\\workspace\\projects\\hs-design-landing\\HS_Design_Quotation.html';

const tail = `" value="${it.cost||0}" oninput="recalc();markDirty()">
    <input type="number" placeholder="Sell" min="0" value="${it.sell||0}" oninput="recalc();markDirty()">
    <button class="del-btn" onclick="this.closest('.item-row').remove();recalc();markDirty()">×</button>
  `;
  row.innerHTML += '';
  tbody.appendChild(row);
}

function getItems(){
  return Array.from(document.querySelectorAll('.item-row')).map(row => {
    const inputs = row.querySelectorAll('input,select');
    return {
      desc: inputs[0].value,
      unit: inputs[1].value,
      qty: parseFloat(inputs[2].value)||0,
      cost: parseFloat(inputs[3].value)||0,
      sell: parseFloat(inputs[4].value)||0,
    };
  });
}

function calcTotal(items){ return (items||[]).reduce((s,it)=>s+(parseFloat(it.sell)||0)*(parseFloat(it.qty)||0),0); }
function calcCost(items){ return (items||[]).reduce((s,it)=>s+(parseFloat(it.cost)||0)*(parseFloat(it.qty)||0),0); }

function recalc(){
  const items = getItems();
  const total = calcTotal(items);
  const cost = calcCost(items);
  document.getElementById('t-cost').textContent = 'RM ' + fmtNum(cost);
  document.getElementById('t-total').textContent = 'RM ' + fmtNum(total);
  document.getElementById('t-profit').textContent = 'RM ' + fmtNum(total - cost);
}

// --- TERMS ---
function renderTerms(terms){
  const el = document.getElementById('terms-body');
  el.innerHTML = '';
  terms.forEach((t,i) => addTermRow(t));
}

function addTerm(){
  addTermRow('');
  markDirty();
}

function addTermRow(text){
  const el = document.getElementById('terms-body');
  const row = document.createElement('div');
  row.className = 'terms-row';
  row.innerHTML = \`<input type="text" placeholder="e.g. 50% deposit upon confirmation" value="\${esc(text)}" oninput="markDirty()">
    <button class="del-btn btn-sm" onclick="this.closest('.terms-row').remove();markDirty()">×</button>\`;
  el.appendChild(row);
}

function getTerms(){
  return Array.from(document.querySelectorAll('.terms-row input')).map(i=>i.value).filter(v=>v.trim());
}

// --- SAVE ---
function markDirty(){
  dirty = true;
  setSaveStatus('Unsaved...');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveQuote, 3000);
}

function setSaveStatus(msg){ document.getElementById('save-status').textContent = msg; }

async function saveQuote(){
  const name = document.getElementById('f-name').value || 'Unnamed';
  const project = document.getElementById('f-project').value;
  const date = document.getElementById('f-date').value;
  const status = document.getElementById('f-status').value;
  const qno = document.getElementById('f-qno').value;
  const notes = document.getElementById('f-notes').value;
  const items = getItems();
  const terms = getTerms();

  // Pack items/terms/notes into the Notes rich_text field as JSON
  const payload = JSON.stringify({items, terms, qno, notes});

  const body = {
    parent: {database_id: DB_ID},
    properties: {
      Name: {title: [{text:{content: name}}]},
      Project: {rich_text: [{text:{content: project}}]},
      Date: date ? {date:{start:date}} : {date: null},
      Status: {status: {name: status}},
      Notes: {rich_text: [{text:{content: payload.slice(0,2000)}}]}
    }
  };

  setSaveStatus('Saving...');
  try {
    let res, data;
    if (activeId && activeId !== '__new__'){
      res = await fetch('https://api.notion.com/v1/pages/'+activeId, {method:'PATCH', headers:nHeaders, body:JSON.stringify({properties:body.properties})});
      data = await res.json();
      if (data.object === 'error'){
        setSaveStatus('Save error: '+data.message);
        return;
      }
      const idx = quotes.findIndex(q=>q.id===activeId);
      if(idx!==-1) quotes[idx] = {...quotes[idx], name, project, date, status, qno, items, terms, notes};
    } else {
      res = await fetch('https://api.notion.com/v1/pages', {method:'POST', headers:nHeaders, body:JSON.stringify(body)});
      data = await res.json();
      if (data.object === 'error'){
        setSaveStatus('Save error: '+data.message);
        return;
      }
      activeId = data.id;
      quotes.unshift({id:data.id, name, project, date, status, qno, items, terms, notes});
    }
    dirty = false;
    setSaveStatus('Saved ✓');
    renderList();
  } catch(e){
    setSaveStatus('Network error');
  }
}

// --- DELETE ---
async function deleteQuote(){
  if (!activeId || activeId==='__new__') { alert('Nothing to delete'); return; }
  if (!confirm('Delete this quotation?')) return;
  try {
    await fetch('https://api.notion.com/v1/pages/'+activeId,{method:'PATCH',headers:nHeaders,body:JSON.stringify({archived:true})});
  } catch(e){}
  quotes = quotes.filter(q=>q.id!==activeId);
  activeId = null;
  dirty = false;
  document.getElementById('welcome-state').style.display = 'block';
  document.getElementById('editor-form').style.display = 'none';
  renderList();
  setSaveStatus('Deleted');
}

// --- PDF ---
function openPDF(){
  const name = document.getElementById('f-name').value || 'Client';
  const project = document.getElementById('f-project').value;
  const date = document.getElementById('f-date').value;
  const qno = document.getElementById('f-qno').value;
  const items = getItems();
  const terms = getTerms();
  const total = calcTotal(items);

  let rows = items.map((it,i) => \`<tr>
    <td>\${i+1}</td>
    <td>\${esc(it.desc)}</td>
    <td>\${esc(it.unit)}</td>
    <td class="num">\${it.qty}</td>
    <td class="num">RM \${fmtNum(it.sell)}</td>
    <td class="num">RM \${fmtNum(it.sell*it.qty)}</td>
  </tr>\`).join('');

  let termList = terms.map(t=>\`<li>\${esc(t)}</li>\`).join('');

  const html = \`<div class="quo-print">
    <div class="quo-header">
      <div class="quo-logo-area">
        <h2>Health Space Interior</h2>
        <p>HS Design (202603001610)</p>
        <p>24-1, Jalan Rosmerah 2/17, Taman Johor Jaya</p>
        <p>81100 Johor Bahru, Johor</p>
        <p>011-1688 0145 | hsdesign.biz</p>
      </div>
      <div class="quo-ref-area">
        <h3>QUOTATION</h3>
        <p>Ref: \${esc(qno)}</p>
        <p>Date: \${date}</p>
      </div>
    </div>
    <div class="quo-client">
      <h4>Prepared For</h4>
      <p>\${esc(name)}</p>
      <span>\${esc(project)}</span>
    </div>
    <table class="quo-table">
      <thead>
        <tr>
          <th style="width:30px">#</th>
          <th>Description</th>
          <th style="width:60px">Unit</th>
          <th class="num" style="width:50px">Qty</th>
          <th class="num" style="width:80px">Unit Price</th>
          <th class="num" style="width:80px">Amount</th>
        </tr>
      </thead>
      <tbody>\${rows}</tbody>
    </table>
    <div class="quo-totals">
      <div class="quo-totals-box">
        <div class="quo-tot-row grand">
          <span>Grand Total</span>
          <span>RM \${fmtNum(total)}</span>
        </div>
      </div>
    </div>
    \${terms.length ? \`<div class="quo-terms"><h4>Payment Terms</h4><ul>\${termList}</ul></div>\` : ''}
    <div class="quo-footer">
      Thank you for choosing Health Space Interior<br>
      This quotation is valid for 30 days.
    </div>
  </div>\`;

  document.getElementById('pdf-body').innerHTML = html;
  document.getElementById('pdf-modal').classList.add('open');
}

function closePDF(){ document.getElementById('pdf-modal').classList.remove('open'); }

function printPDF(){
  const content = document.getElementById('pdf-body').innerHTML;
  const win = window.open('','_blank');
  win.document.write(\`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Quotation</title><style>
  body{font-family:'Segoe UI',Arial,sans-serif;padding:30px;color:#1a1a1a;max-width:700px;margin:0 auto}
  .quo-header{display:flex;justify-content:space-between;margin-bottom:24px}
  .quo-logo-area h2{font-size:16px;font-weight:700;color:#5a9e8f}
  .quo-logo-area p,.quo-ref-area p{font-size:11px;color:#6b6b8a;line-height:1.7}
  .quo-ref-area{text-align:right}.quo-ref-area h3{font-size:14px;font-weight:700}
  .quo-client{background:#f4f9f7;border-radius:6px;padding:12px 16px;margin-bottom:18px;border-left:3px solid #5a9e8f}
  .quo-client h4{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#5a9e8f;margin-bottom:6px}
  .quo-client p{font-size:13px;font-weight:600}.quo-client span{font-size:12px;color:#6b6b8a}
  table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:12px}
  th{background:#2d5a47;color:#fff;padding:9px 10px;text-align:left}
  td{padding:8px 10px;border-bottom:1px solid #e8e8e8}
  .num{text-align:right}
  .quo-totals{display:flex;justify-content:flex-end;margin-bottom:16px}
  .quo-totals-box{width:240px;border:1px solid #e8e8e8;border-radius:6px;overflow:hidden}
  .quo-tot-row{display:flex;justify-content:space-between;padding:7px 12px;font-size:13px;border-bottom:1px solid #e8e8e8}
  .quo-tot-row.grand{background:#f4f9f7;font-weight:700;color:#2d5a47}
  .quo-terms{background:#fafafa;border-radius:6px;padding:12px 16px;font-size:12px;color:#6b6b8a}
  .quo-terms h4{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#2d5a47;margin-bottom:8px}
  .quo-terms li{margin-bottom:3px}
  .quo-footer{margin-top:24px;text-align:center;font-size:11px;color:#9a9ab0;border-top:1px solid #e8e8e8;padding-top:12px}
  @media print{body{padding:20px}}
  </style></head><body>\`+content+\`</body></html>\`);
  win.document.close();
  setTimeout(()=>win.print(),500);
}

// --- UTILS ---
function fmtNum(n){ return parseFloat(n||0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g,','); }
function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// Init
document.getElementById('gate-pass').focus();
`;

fs.appendFileSync(path, tail, 'utf8');
console.log('Done!');
