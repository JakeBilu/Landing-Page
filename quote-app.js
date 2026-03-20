// ─── CONFIG ─────────────────────────────────────────────────────────────────
// API calls go through Netlify proxy (no API key in browser)
// Proxy: netlify/functions/notion-proxy
// ─── STATE ────────────────────────────────────────────────────────────────────
const DB = '329538249e7e804bb295f34904902b1a';
const PASS = 'HSHSHS';
const PROXY = '/.netlify/functions/notion-proxy';
const UNITS = ['nos', 'set', 'm', 'm²', 'lot', 'box', 'lump sum', 'day', 'trip', 'ft', 'ft²', 'hour'];

let quotes = [];
let activeId = null;
let isDirty = false;
let autoSaveTimer = null;
let _items = [];
let _terms = [];

// ─── UTILS ───────────────────────────────────────────────────────────────────
const ISO = () => new Date().toISOString().slice(0, 10);
const fmt = n => parseFloat(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function setSS(m) { document.getElementById('ss').textContent = m; }

function dirty() {
  isDirty = true;
  setSS('Unsaved...');
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(saveQuote, 3000);
}

// ─── GATE ─────────────────────────────────────────────────────────────────────
function chkGate() {
  if (document.getElementById('pass').value === PASS) {
    document.getElementById('gate').style.display = 'none';
    const app = document.getElementById('app');
    app.style.display = 'flex';
    app.style.flexDirection = 'column';
    loadQuotes();
  } else {
    document.getElementById('gerr').textContent = 'Incorrect password';
    document.getElementById('gerr').style.display = 'block';
  }
}

// ─── NOTION API ───────────────────────────────────────────────────────────────
async function loadQuotes() {
  setSS('Loading...');
  try {
    const r = await fetch(PROXY + '/v1/databases/' + DB + '/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sorts: [{ property: 'Date', direction: 'descending' }],
        page_size: 50
      })
    });
    const d = await r.json();
    if (d.object === 'error') {
      setSS('Notion error: ' + (d.message || 'check API key'));
      quotes = [];
    } else {
      quotes = (d.results || []).map(parsePage);
      setSS(quotes.length ? `Loaded ${quotes.length} quotes` : 'No quotes yet — create one!');
    }
    renderList();
  } catch (e) {
    setSS('Offline — cannot reach Notion');
    quotes = [];
    renderList();
  }
}

function parsePage(p) {
  const g = k => {
    const v = p.properties[k];
    if (!v) return '';
    if (v.type === 'title') return v.title?.[0]?.plain_text || '';
    if (v.type === 'rich_text') return v.rich_text?.[0]?.plain_text || '';
    if (v.type === 'date') return v.date?.start || '';
    if (v.type === 'select') return v.select?.name || '';
    if (v.type === 'status') return v.status?.name || '';
    return '';
  };
  let items = [], terms = [], notes = '', qno = '', addr = '';
  try {
    const j = JSON.parse(g('Notes') || '{}');
    items = j.items || [];
    terms = j.terms || [];
    notes = j.notes || '';
    qno = j.qno || '';
    addr = j.addr || '';
  } catch (e) { /* ignore */ }
  return {
    id: p.id,
    name: g('Name'),
    project: g('Project'),
    date: g('Date'),
    status: g('Status') || 'Draft',
    qno, addr, items, terms, notes
  };
}

// ─── LIST ─────────────────────────────────────────────────────────────────────
function renderList() {
  const el = document.getElementById('ql');
  if (!quotes.length) {
    el.innerHTML = '<div class="el"><div class="e">📋</div><p>No quotations yet</p></div>';
    return;
  }
  el.innerHTML = quotes.map(q => {
    const tot = (q.items || []).reduce((s, it) => s + (parseFloat(it.sell) || 0) * (parseFloat(it.qty) || 0), 0);
    const bdg = q.status === 'Sent' ? 'bdg-se' : q.status === 'Paid' ? 'bdg-pa' : 'bdg-dr';
    return `<div class="qc ${q.id === activeId ? 'active' : ''}" onclick="openQ('${q.id}')">
      <div class="qc-t">${esc(q.name) || 'Unnamed'}</div>
      <div class="qc-p">${esc(q.project) || '—'}</div>
      <div class="qc-b">
        <span class="qc-tot">RM ${fmt(tot)}</span>
        <span class="bdg ${bdg}">${q.status}</span>
      </div>
    </div>`;
  }).join('');
}

// ─── OPEN / NEW ──────────────────────────────────────────────────────────────
function openQ(id) {
  if (isDirty && !confirm('Unsaved changes. Discard?')) return;
  activeId = id;
  const q = quotes.find(x => x.id === id);
  if (!q) return;
  _items = JSON.parse(JSON.stringify(q.items || []));
  _terms = JSON.parse(JSON.stringify(q.terms || []));
  document.getElementById('welcome').style.display = 'none';
  document.getElementById('editor').style.display = 'block';
  document.getElementById('f-name').value = q.name || '';
  document.getElementById('f-qno').value = q.qno || '';
  document.getElementById('f-addr').value = q.addr || '';
  document.getElementById('f-proj').value = q.project || '';
  document.getElementById('f-date').value = q.date || '';
  document.getElementById('f-status').value = q.status || 'Draft';
  document.getElementById('f-notes').value = q.notes || '';
  renderItems();
  renderTerms();
  recalc();
  isDirty = false;
  setSS('Loaded — edit freely');
  renderList();
}

function newQuote() {
  if (isDirty && !confirm('Unsaved changes. Discard?')) return;
  activeId = '__new__';
  _items = [makeItem()];
  _terms = ['50% deposit upon confirmation', '40% upon work commencement', '10% upon completion'];
  document.getElementById('welcome').style.display = 'none';
  document.getElementById('editor').style.display = 'block';
  document.getElementById('f-name').value = '';
  document.getElementById('f-qno').value = 'QUO-HS-' + String(quotes.length + 1).padStart(3, '0');
  document.getElementById('f-addr').value = '';
  document.getElementById('f-proj').value = '';
  document.getElementById('f-date').value = ISO();
  document.getElementById('f-status').value = 'Draft';
  document.getElementById('f-notes').value = '';
  renderItems();
  renderTerms();
  recalc();
  isDirty = false;
  setSS('New quotation — start filling in');
  renderList();
}

function makeItem() {
  return { desc: '', unit: 'nos', qty: 1, costItems: [{ desc: '', amt: 0 }], sell: 0 };
}

// ─── ITEMS ───────────────────────────────────────────────────────────────────
function renderItems() {
  const c = document.getElementById('items-container');
  document.getElementById('no-items').style.display = _items.length ? 'none' : 'block';
  c.innerHTML = '';
  _items.forEach((it, i) => c.appendChild(buildItemRow(it, i)));
  recalc();
}

function buildItemRow(it, i) {
  const el = document.createElement('div');
  el.className = 'item';
  const ct = (it.costItems || []).reduce((s, c) => s + (parseFloat(c.amt) || 0), 0);
  const mk = ct > 0 && it.sell > 0 ? ((it.sell - ct) / ct * 100) : 0;
  const mkCls = mk >= 30 ? 'mk-g' : mk >= 15 ? 'mk-y' : 'mk-r';
  const ctStr = ct > 0 ? `RM ${fmt(ct)}` : '—';
  const mkStr = mk > 0 ? `<span class="mk ${mkCls}">+${fmt(mk)}% markup</span>` : '';
  const ciRows = (it.costItems || []).map((ci, cii) => `
    <div class="csub">
      <input type="text" placeholder="e.g. Wire 100m @ RM0.80/m" value="${esc(ci.desc)}" oninput="syncCi(${i},${cii},this)">
      <input type="number" min="0" placeholder="RM" value="${ci.amt || ''}" oninput="syncCi(${i},${cii},this)">
      <button class="del" style="font-size:13px" onclick="remCi(${i},${cii},this)">×</button>
    </div>`).join('');
  el.innerHTML = `
    <div class="item-main">
      <span style="font-size:13px;color:var(--gray-400);text-align:center;font-weight:600">${i + 1}</span>
      <input type="text" placeholder="e.g. Supply & install lighting point" value="${esc(it.desc)}" oninput="syncMain(${i},this)">
      <select onchange="syncMain(${i},this)">${UNITS.map(u => `<option value="${u}" ${it.unit === u ? 'selected' : ''}>${u}</option>`).join('')}</select>
      <input type="number" min="0" placeholder="1" value="${it.qty}" oninput="syncMain(${i},this)" style="text-align:center">
      <input type="number" class="cost-in" min="0" placeholder="0.00" value="${ct > 0 ? fmt(ct) : ''}" readonly title="Click Cost breakdown below to edit">
      <input type="number" class="sell-in" min="0" placeholder="0.00" value="${it.sell ? fmt(it.sell) : ''}" oninput="syncMain(${i},this)">
      <button class="del" onclick="remItem(${i})">×</button>
    </div>
    <div class="exp-h" onclick="toggleCost(this)">
      💰 Cost breakdown (internal) <span style="font-size:11px;color:var(--gold)">${ctStr}</span>
      ${mkStr}
      <span class="tog">▶</span>
    </div>
    <div class="cb">${ciRows}
      <button class="btn btn-g btn-sm" onclick="addCi(${i},this)" style="margin-top:4px">+ Add cost line</button>
      <div class="csub-row">Subtotal cost: <span>RM ${fmt(ct)}</span></div>
    </div>`;
  return el;
}

function toggleCost(el) {
  const cb = el.nextElementSibling;
  cb.classList.toggle('open');
  el.querySelector('.tog').textContent = cb.classList.contains('open') ? '▼' : '▶';
}

function addItem() { _items.push(makeItem()); renderItems(); dirty(); }
function remItem(i) { _items.splice(i, 1); renderItems(); dirty(); }

function syncMain(i, inp) {
  const row = inp.closest('.item');
  const sel = row.querySelectorAll('input,select');
  _items[i].desc = sel[1].value;
  _items[i].unit = sel[2].value;
  _items[i].qty = parseFloat(sel[3].value) || 0;
  _items[i].sell = parseFloat(sel[5].value) || 0;
  const ct = (_items[i].costItems || []).reduce((s, c) => s + (parseFloat(c.amt) || 0), 0);
  sel[4].value = ct > 0 ? fmt(ct) : '';
  recalc();
  dirty();
}

function addCi(i, btn) {
  _items[i].costItems.push({ desc: '', amt: 0 });
  const row = btn.closest('.cb');
  const ciRows = row.querySelectorAll('.csub');
  const newRow = document.createElement('div');
  newRow.className = 'csub';
  newRow.innerHTML = `<input type="text" placeholder="e.g. Wire 100m" value="" oninput="syncCi(${i},${ciRows.length},this)"><input type="number" min="0" placeholder="RM" value="" oninput="syncCi(${i},${ciRows.length},this)"><button class="del" style="font-size:13px" onclick="remCi(${i},${ciRows.length},this)">×</button>`;
  row.insertBefore(newRow, btn);
  dirty();
}

function remCi(i, cii, btn) {
  _items[i].costItems.splice(cii, 1);
  btn.closest('.csub').remove();
  recalc();
  dirty();
}

function syncCi(i, cii, inp) {
  const row = inp.closest('.csub');
  const inputs = row.querySelectorAll('input');
  _items[i].costItems[cii].desc = inputs[0].value;
  _items[i].costItems[cii].amt = parseFloat(inputs[1].value) || 0;
  const ct = (_items[i].costItems || []).reduce((s, c) => s + (parseFloat(c.amt) || 0), 0);
  const itemRow = row.closest('.item');
  const costIn = itemRow.querySelector('.cost-in');
  if (costIn) costIn.value = ct > 0 ? fmt(ct) : '';
  const subRow = itemRow.querySelector('.csub-row span');
  if (subRow) subRow.textContent = 'RM ' + fmt(ct);
  recalc();
  dirty();
}

// ─── TERMS ───────────────────────────────────────────────────────────────────
function renderTerms() {
  const c = document.getElementById('terms-container');
  c.innerHTML = '';
  _terms.forEach((t, i) => {
    const row = document.createElement('div');
    row.className = 'terms-row';
    row.innerHTML = `<input type="text" placeholder="e.g. 50% deposit upon confirmation" value="${esc(t)}" oninput="syncTerm(${i},this)"><button class="del" onclick="remTerm(${i})">×</button>`;
    c.appendChild(row);
  });
}

function addTerm() { _terms.push(''); renderTerms(); dirty(); }
function remTerm(i) { _terms.splice(i, 1); renderTerms(); dirty(); }
function syncTerm(i, inp) { _terms[i] = inp.value; dirty(); }

// ─── RECALC ──────────────────────────────────────────────────────────────────
function recalc() {
  let totalCost = 0, totalSell = 0;
  _items.forEach(it => {
    const ct = (it.costItems || []).reduce((s, c) => s + (parseFloat(c.amt) || 0), 0);
    totalCost += ct * (parseFloat(it.qty) || 0);
    totalSell += (parseFloat(it.sell) || 0) * (parseFloat(it.qty) || 0);
  });
  const profit = totalSell - totalCost;
  const mkPct = totalCost > 0 ? (profit / totalCost * 100) : 0;
  document.getElementById('tot-cost').textContent = 'RM ' + fmt(totalCost);
  document.getElementById('tot-sell').textContent = 'RM ' + fmt(totalSell);
  const mkEl = document.getElementById('tot-mk');
  if (mkPct > 0) {
    mkEl.textContent = `+${fmt(mkPct)}% (RM ${fmt(profit)})`;
    mkEl.style.color = mkPct >= 30 ? '#166534' : mkPct >= 15 ? '#92400e' : '#dc2626';
  } else {
    mkEl.textContent = '—';
    mkEl.style.color = '';
  }
}

// ─── SAVE ────────────────────────────────────────────────────────────────────
async function saveQuote() {
  if (!isDirty) return;
  const name = document.getElementById('f-name').value || 'Unnamed';
  const qno = document.getElementById('f-qno').value;
  const addr = document.getElementById('f-addr').value;
  const project = document.getElementById('f-proj').value;
  const date = document.getElementById('f-date').value;
  const status = document.getElementById('f-status').value;
  const notes = document.getElementById('f-notes').value;
  const payload = JSON.stringify({ items: _items, terms: _terms, qno, addr, notes }).slice(0, 2000);
  const body = {
    parent: { database_id: DB },
    properties: {
      Name: { title: [{ text: { content: name } }] },
      Project: { rich_text: [{ text: { content: project } }] },
      Date: date ? { date: { start: date } } : { date: null },
      Status: { status: { name: status } },
      Notes: { rich_text: [{ text: { content: payload } }] }
    }
  };
  setSS('Saving...');
  try {
    let res, data;
    if (activeId && activeId !== '__new__') {
      res = await fetch(PROXY + '/v1/pages/' + activeId, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ properties: body.properties })
      });
    } else {
      res = await fetch(PROXY + '/v1/pages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
    }
    data = await res.json();
    if (data.object === 'error') {
      setSS('Notion error: ' + (data.message || 'check API key'));
      return;
    }
    if (activeId === '__new__') {
      activeId = data.id;
      quotes.unshift({ id: data.id, name, project, date, status, qno, addr, items: _items, terms: _terms, notes });
    } else {
      const idx = quotes.findIndex(q => q.id === activeId);
      if (idx !== -1) quotes[idx] = { ...quotes[idx], name, project, date, status, qno, addr, items: _items, terms: _terms, notes };
    }
    isDirty = false;
    setSS('Saved ✓');
    renderList();
  } catch (e) {
    setSS('Network error — try again');
  }
}

// ─── DELETE ──────────────────────────────────────────────────────────────────
async function delQuote() {
  if (!activeId || activeId === '__new__') { alert('Nothing to delete.'); return; }
  if (!confirm('Delete this quotation? This cannot be undone.')) return;
  setSS('Deleting...');
  try {
    await fetch(PROXY + '/v1/pages/' + activeId, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ archived: true })
    });
  } catch (e) { /* ignore */ }
  quotes = quotes.filter(q => q.id !== activeId);
  activeId = null;
  isDirty = false;
  document.getElementById('welcome').style.display = 'block';
  document.getElementById('editor').style.display = 'none';
  renderList();
  setSS('Deleted');
}

// ─── DUPLICATE ────────────────────────────────────────────────────────────────
function duplicateQuote() {
  const q = quotes.find(x => x.id === activeId);
  if (!q) { alert('Open an existing quote first.'); return; }
  _items = JSON.parse(JSON.stringify(q.items || []));
  _terms = JSON.parse(JSON.stringify(q.terms || []));
  activeId = '__new__';
  document.getElementById('welcome').style.display = 'none';
  document.getElementById('editor').style.display = 'block';
  document.getElementById('f-name').value = q.name ? q.name + ' (Copy)' : '';
  document.getElementById('f-qno').value = 'QUO-HS-' + String(quotes.length + 1).padStart(3, '0');
  document.getElementById('f-addr').value = q.addr || '';
  document.getElementById('f-proj').value = q.project || '';
  document.getElementById('f-date').value = ISO();
  document.getElementById('f-status').value = 'Draft';
  document.getElementById('f-notes').value = q.notes || '';
  renderItems();
  renderTerms();
  recalc();
  isDirty = true;
  setSS('Duplicate — edit and save');
  renderList();
}

// ─── PDF ─────────────────────────────────────────────────────────────────────
function openPDF() {
  const name = document.getElementById('f-name').value || 'Valued Client';
  const qno = document.getElementById('f-qno').value;
  const addr = document.getElementById('f-addr').value;
  const project = document.getElementById('f-proj').value;
  const date = document.getElementById('f-date').value;
  const terms = _terms.filter(t => t.trim());
  const total = _items.reduce((s, it) => s + (parseFloat(it.sell) || 0) * (parseFloat(it.qty) || 0), 0);
  const dateStr = date ? new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : '';
  const rows = _items.map((it, i) => {
    const line = (parseFloat(it.sell) || 0) * (parseFloat(it.qty) || 0);
    return `<tr>
      <td style="width:24px">${i + 1}</td>
      <td>${esc(it.desc) || '—'}</td>
      <td style="width:60px;text-align:center">${esc(it.unit)}</td>
      <td style="width:40px;text-align:right">${it.qty || 0}</td>
      <td style="width:80px;text-align:right">RM ${fmt(it.sell)}</td>
      <td style="width:90px;text-align:right;font-weight:600">RM ${fmt(line)}</td>
    </tr>`;
  }).join('');
  const termList = terms.length ? `<div class="qp-terms"><h4>Payment Terms</h4><ul>${terms.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>` : '';
  const html = `<div class="qp">
    <div class="qp-hdr">
      <div class="qp-logo">
        <h2>Health Space Interior</h2>
        <p>HS Design (SSM: 202603001610)</p>
        <p>24-1, Jalan Rosmerah 2/17, Taman Johor Jaya</p>
        <p>81100 Johor Bahru, Johor</p>
        <p>011-1688 0145 | hsdesign.biz</p>
      </div>
      <div class="qp-ref">
        <h3>QUOTATION</h3>
        <p><strong>Ref:</strong> ${esc(qno) || '—'}</p>
        <p><strong>Date:</strong> ${dateStr}</p>
        <p><strong>Status:</strong> ${document.getElementById('f-status').value}</p>
      </div>
    </div>
    <div class="qp-ci">
      <h4>Prepared For</h4>
      <p>${esc(name)}</p>
      <span>${esc(addr || project || '—')}</span>
    </div>
    <table class="qp-table">
      <thead>
        <tr><th style="width:24px">#</th><th>Description</th><th style="width:60px;text-align:center">Unit</th><th style="width:40px;text-align:right">Qty</th><th style="width:80px;text-align:right">Unit Price</th><th style="width:90px;text-align:right">Amount</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="qp-totals">
      <div class="qp-tbox">
        <div class="qp-tr gd"><span>Grand Total</span><span>RM ${fmt(total)}</span></div>
      </div>
    </div>
    ${termList}
    <div class="qp-footer">
      Thank you for considering Health Space Interior<br>
      This quotation is valid for 30 days from the date above.
    </div>
  </div>`;
  document.getElementById('pdfbody').innerHTML = html;
  document.getElementById('pdfmo').classList.add('open');
}

function closePDF() { document.getElementById('pdfmo').classList.remove('open'); }

function printPDF() {
  const content = document.getElementById('pdfbody').innerHTML;
  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Quotation</title><style>
    body{font-family:'Segoe UI',Arial,sans-serif;padding:32px;max-width:720px;margin:0 auto;color:#1a1a1a;font-size:13px}
    .qp-hdr{display:flex;justify-content:space-between;margin-bottom:24px}
    .qp-logo h2{font-size:18px;font-weight:700;color:#5a9e8f}
    .qp-logo p{font-size:11px;color:#6b7280;line-height:1.8}
    .qp-ref{text-align:right}
    .qp-ref h3{font-size:15px;font-weight:700;margin-bottom:6px}
    .qp-ref p{font-size:12px;color:#6b7280;line-height:1.9}
    .qp-ci{background:#f0faf7;border-left:3px solid #5a9e8f;border-radius:0 8px 8px 0;padding:12px 16px;margin-bottom:20px}
    .qp-ci h4{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#5a9e8f;margin-bottom:8px}
    .qp-ci p{font-size:13px;font-weight:600;margin-bottom:2px}
    .qp-ci span{font-size:12px;color:#6b7280}
    table{width:100%;border-collapse:collapse;margin-bottom:18px}
    th{background:#2d5a47;color:#fff;padding:9px 10px;text-align:left;font-size:11px;font-weight:600}
    td{padding:8px 10px;border-bottom:1px solid #e8e8e8;font-size:12px}
    .r{text-align:right}
    .qp-totals{display:flex;justify-content:flex-end;margin-bottom:16px}
    .qp-tbox{width:240px;border:1px solid #e8e8e8;border-radius:6px;overflow:hidden}
    .qp-tr{display:flex;justify-content:space-between;padding:8px 12px;font-size:13px;border-bottom:1px solid #e8e8e8}
    .qp-tr.gd{background:#f0faf7;font-weight:700;font-size:15px;color:#2d5a47}
    .qp-terms{margin-top:20px;background:#fafafa;border-radius:8px;padding:14px 18px}
    .qp-terms h4{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#2d5a47;margin-bottom:10px}
    .qp-terms li{margin-bottom:4px;font-size:12px;color:#6b7280}
    .qp-footer{margin-top:28px;text-align:center;font-size:11px;color:#9a9ab0;padding-top:14px;border-top:1px solid #e8e8e8}
    @media print{body{padding:20px}}
  </style></head><body>${content}</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 600);
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
document.getElementById('pass').focus();
