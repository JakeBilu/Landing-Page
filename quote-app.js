// ─── CONFIG ─────────────────────────────────────────────────────────────────
const DB = '8d776216-e135-4c9f-b1bb-9669cb10bd85';
const escSql = s => String(s==null?'':s).replace(/'/g, "''"); // SQL string escape
const PASS = 'HSHSHS';
const PROXY = 'https://hsdesign-d1-api.ida-czia.workers.dev/d1-api';
const UNITS = ['nos', 'set', 'm', 'm²', 'lot', 'box', 'lump sum', 'day', 'trip', 'ft', 'ft²', 'hour'];

// ─── STATE ────────────────────────────────────────────────────────────────────
let quotes = [];
let activeId = null;
let expandedId = null;
let isDirty = false;
let autoSaveTimer = null;
// _data = [{ section: '', items: [{ desc:'', unit:'nos', qty:1, costItems:[{desc:'',unit:'nos',qty:1,unitPrice:0,amt:0}], sell:0 }] }]
let _data = { items: [] };
let _terms = [];
let _notes = [];
let _name = '', _qno = '', _addr = '', _proj = '', _date = '', _status = 'Draft', _notesTxt = '';

// Default Standard Terms & Conditions (used for new quotes)
const DEFAULT_NOTES = [
  'Completion of works refers to fulfilling works as listed in the agreement, or the owner taking occupancy of the premises, whichever is earlier. Any variation or modification of works shall not be taken as extension of completion date.',
  'Claims whatsoever will not be entertained after receipt. Please ensure all works are received in good condition.',
  'Deposit paid is non-refundable.',
  '2% monthly interest will be charged if payment is delayed.',
  'Price may vary if owner changes design during production.',
  'Payment must be fully settled within 14 days after completion.',
  'Installation fees will be charged for unincluded products and products purchased from other sources.',
  'No retention amount after project completion.'
];

// ─── UTILS ───────────────────────────────────────────────────────────────────
const ISO = () => new Date().toISOString().slice(0, 10);
const fmt = n => parseFloat(n || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const escHtml = s => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const setSS = m => { document.getElementById('ss').textContent = m; };
const dirty = () => { isDirty = true; setSS('Unsaved...'); clearTimeout(autoSaveTimer); autoSaveTimer = setTimeout(saveQuote, 3000); clearTimeout(_draftTimer); _draftTimer = setTimeout(saveDraft, 1000); };
let _draftTimer = null;
const DRAFT_KEY = 'hsdesign_quote_draft';

function saveDraft() {
  gatherForm();
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
      activeId, _data, _terms, _name, _code, _qno, _addr, _proj, _date, _status, _notes, _notesTxt, _items: _data
    }));
  } catch(e) {}
}

function clearDraft() { try { localStorage.removeItem(DRAFT_KEY); } catch(e) {} }

function restoreDraft(draft) {
  activeId = draft.activeId || '__new__';
  _data = draft._data || draft._items || [{section:'',items:[makeItem()]}];
  _terms = draft._terms || [];
  _notes = draft._notes || [];
  _name = draft._name || '';
  _code = draft._code || '';
  _qno = draft._qno || '';
  _addr = draft._addr || '';
  _proj = draft._proj || '';
  _date = draft._date || '';
  _status = draft._status || 'Draft';
  _notesTxt = draft._notesTxt || '';
  document.getElementById('f-name').value = _name;
  document.getElementById('f-code').value = _code;
  document.getElementById('f-qno').value = _qno;
  document.getElementById('f-addr').value = _addr;
  document.getElementById('f-proj').value = _proj;
  document.getElementById('f-date').value = _date;
  document.getElementById('f-status').value = _status;
  document.getElementById('f-notes').value = _notesTxt;
  document.getElementById('welcome').style.display='none';
  document.getElementById('editor').style.display='block';
  renderSections();
  renderTerms();
  renderNotes();
  recalc();
  isDirty = false;
  setSS('Draft restored');
  renderList();
}

// ─── GATE ─────────────────────────────────────────────────────────────────────
function chkGate() {
  if (document.getElementById('pass').value === PASS) {
    document.getElementById('gate').style.display = 'none';
    const app = document.getElementById('app');
    app.style.display = 'flex';
    app.style.flexDirection = 'column';
    loadQuotes();
    initSidebar();
    // Check for unsaved draft after loading quotes list
    setTimeout(() => {
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (raw) {
          const draft = JSON.parse(raw);
          if (confirm('You have an unsaved draft. Restore it?')) {
            restoreDraft(draft);
          }
        }
      } catch(e) {}
    }, 200);
  } else {
    document.getElementById('gerr').textContent = 'Incorrect password';
    document.getElementById('gerr').style.display = 'block';
  }
}

// ─── NOTION ───────────────────────────────────────────────────────────────────
async function loadQuotes() {
  setSS('Loading...');
  console.log('loadQuotes: starting...');
  try {
    const r = await fetch(PROXY, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql: "SELECT id, name, project, date, status, qno, addr, data, created_at FROM quotes ORDER BY date DESC LIMIT 50", params: [] })
    });
    console.log('loadQuotes: response status=' + r.status);
    if (!r.ok) {
      r.text().then(t => console.log('loadQuotes: HTTP error body:', t));
      console.log('loadQuotes: HTTP error, status=' + r.status);
      /* Try localStorage cache as fallback */
      try { const cached = localStorage.getItem('hsdesign_quotes_cache'); if (cached) { quotes = JSON.parse(cached); console.log('loadQuotes: restored', quotes.length, 'quotes from localStorage cache'); renderList(); return; } } catch(e2) {}
      setSS('Network error'); quotes = []; renderList(); return;
    }
    const d = await r.json();
    console.log('loadQuotes: d.success=' + d.success + ' result=' + JSON.stringify(d.result));
    if (!d.success) { console.log('loadQuotes D1 error:', d.errors); setSS('D1 error: ' + (d.errors && d.errors[0] || '')); quotes = []; }
    else { const rows = (d.result && d.result[0] && d.result[0].results) || []; quotes = rows.map(parseD1Row); console.log('loadQuotes success: quotes.length=' + quotes.length + ' ids=' + quotes.map(q=>q.id).join(',')); setSS(quotes.length ? `Loaded ${quotes.length} quotes` : 'No quotes yet'); /* Save to localStorage cache for offline fallback */ try { localStorage.setItem('hsdesign_quotes_cache', JSON.stringify(quotes)); } catch(e) {} }
    console.log('loadQuotes: calling renderList, quotes.length=' + quotes.length);
    renderList();
  } catch (e) { console.log('loadQuotes network error:', e.message); setSS('Offline'); /* Try localStorage cache as fallback */ try { const cached = localStorage.getItem('hsdesign_quotes_cache'); if (cached) { quotes = JSON.parse(cached); console.log('loadQuotes: restored', quotes.length, 'quotes from localStorage cache'); renderList(); return; } } catch(e2) {} quotes = []; renderList(); }
}

function parseD1Row(r) {
  let items=[],terms=[],notes='',notes2=[],qno='',addr='';
  try { const j=JSON.parse(r.data||'{}'); items=j.items||[]; terms=j.terms||[]; notes=j.notes||''; notes2=j.notes2||[]; qno=j.qno||''; addr=j.addr||''; } catch(e) {}
  return { id:r.id, name:r.name||'', project:r.project||'', date:r.date||'', status:r.status||'Draft', qno:r.qno||'', addr:r.addr||'', items, terms, notes, notes2 };
}

// ─── LIST ─────────────────────────────────────────────────────────────────────
function renderList() {
  const el = document.getElementById('ql');
  if (!quotes.length) { el.innerHTML='<div class="el"><div class="e">📋</div><p>No quotations yet</p></div>'; return; }
  el.innerHTML = quotes.map(q => {
    const tot = (q.items||[]).reduce((s,sec) => s + (sec.items||[]).reduce((a,it) => a + (parseFloat(it.sell)||0)*(parseFloat(it.qty)||0), 0), 0);
    const bdg = q.status==='Sent'?'bdg-se':q.status==='Paid'?'bdg-pa':'bdg-dr';
    const secNames = (q.items||[]).map(s=>s.section||'Untitled').filter(Boolean).join(', ') || 'No sections';
    const itemCount = (q.items||[]).reduce((a,sec)=>a+(sec.items||[]).length,0);
    const isOpen = q.id===activeId;
    const isExp = expandedId===q.id;
    return `<div class="qc ${isOpen?'active':''}" id="qc-${q.id}">
      <div class="qc-head" onclick="handleQClick('${q.id}',event)">
        <div class="qc-mini">
          <div class="qc-t">${escHtml(q.name)||'Unnamed'}</div>
          <div class="qc-p">${escHtml(q.project)||'—'}</div>
          <div class="qc-b"><span class="qc-tot">RM ${fmt(tot)}</span><span class="bdg ${bdg}">${q.status}</span></div>
        </div>
        <button class="qc-chevron ${isExp?'open':''}" onclick="toggleQ('${q.id}',event)" title="Expand">${isExp?'▾':'▾'}</button>
      </div>
      <div class="qc-body ${isExp?'open':''}" onclick="event.stopPropagation()">
        <div class="qc-detail"><span class="qc-dl">No</span><span>${escHtml(q.qno)||'—'}</span></div>
        <div class="qc-detail"><span class="qc-dl">Date</span><span>${q.date||'—'}</span></div>
        <div class="qc-detail"><span class="qc-dl">Sections</span><span>${secNames}</span></div>
        <div class="qc-detail"><span class="qc-dl">Items</span><span>${itemCount} item${itemCount!==1?'s':''}</span></div>
      </div>
    </div>`;
  }).join('');
}
function handleQClick(id, event) { console.log('handleQClick: id=' + id + ' isDirty=' + isDirty);
  event.stopPropagation();
  openQ(id);
}
function toggleQ(id, event) {
  event.stopPropagation();
  expandedId = expandedId === id ? null : id;
  renderList();
}

// ─── OPEN / NEW ───────────────────────────────────────────────────────────────
// Migrate old cost items (desc,amt) → new structure (desc,unit,qty,unitPrice,amt)
function migrateCi(ci) {
  if (ci.unit !== undefined) return ci; // already migrated
  return { desc: ci.desc||'', unit: 'lump sum', qty: 1, unitPrice: parseFloat(ci.amt)||0, amt: parseFloat(ci.amt)||0 };
}
function migrateData(data) {
  if (!data || !data.length) return null;
  return data.map(sec => ({
    section: sec.section||'',
    items: (sec.items||[]).map(it => ({
      desc: it.desc||'', unit: it.unit||'nos', qty: parseFloat(it.qty)||1,
      costItems: (it.costItems||[]).map(migrateCi),
      sell: parseFloat(it.sell)||0
    }))
  }));
}

function openQ(id) {
  console.log('openQ: ENTER id=' + id + ' isDirty=' + isDirty + ' quotes.length=' + quotes.length);
  if (isDirty && !confirm('Unsaved changes. Discard?')) { console.log('openQ: ABORTED (isDirty)'); return; }
  clearDraft();
  activeId = id;
  console.log('openQ: activeId set to ' + activeId + ', searching quotes array...');
  const q = quotes.find(x => x.id === id);
  console.log('openQ: quotes.find result=', q ? 'FOUND name=' + q.name : 'NOT FOUND');
  if (!q) { console.log('openQ: ABORT - quote not found. Available ids=' + quotes.map(q=>q.id).join(',')); return; }
  _data = migrateData(q.items && q.items.length ? q.items : null) || [{section:'',items:[makeItem()]}];
  _terms = JSON.parse(JSON.stringify(q.terms && q.terms.length ? q.terms : ['50% deposit upon confirmation','40% upon work commencement','10% upon completion']));
  _notes = JSON.parse(JSON.stringify(q.notes2 && q.notes2.length ? q.notes2 : DEFAULT_NOTES));
  _name = q.name||''; _qno = q.qno||''; _addr = q.addr||''; _proj = q.project||''; _date = q.date||''; _status = q.status||'Draft'; _notesTxt = q.notes||'';
  document.getElementById('welcome').style.display='none';
  document.getElementById('editor').style.display='block';
  document.getElementById('f-name').value = _name;
  document.getElementById('f-qno').value = _qno;
  document.getElementById('f-addr').value = _addr;
  document.getElementById('f-proj').value = _proj;
  document.getElementById('f-date').value = _date;
  document.getElementById('f-status').value = _status;
  document.getElementById('f-notes').value = _notesTxt;
  renderSections();
  renderTerms();
  renderNotes();
  recalc();
  isDirty = false;
  setSS('Loaded');
  console.log('openQ: calling renderList with activeId=' + activeId);
  renderList();
  console.log('openQ: DONE');
}

function newQuote() {
  if (isDirty && !confirm('Unsaved changes. Discard?')) return;
  clearDraft();
  activeId = '__new__';
  _data = [{ section: '', items: [makeItem()] }];
  _terms = ['50% deposit upon confirmation','40% upon work commencement','10% upon completion'];
  _notes = JSON.parse(JSON.stringify(DEFAULT_NOTES));
  _name=''; _qno='QUO-HS-'+String(quotes.length+1).padStart(3,'0'); _addr=''; _proj=''; _date=ISO(); _status='Draft'; _notesTxt='';
  document.getElementById('welcome').style.display='none';
  document.getElementById('editor').style.display='block';
  document.getElementById('f-name').value=_name; document.getElementById('f-qno').value=_qno; document.getElementById('f-addr').value=_addr;
  document.getElementById('f-proj').value=_proj; document.getElementById('f-date').value=_date; document.getElementById('f-status').value=_status;
  document.getElementById('f-notes').value=_notesTxt;
  renderSections();
  renderTerms();
  renderNotes();
  recalc();
  isDirty = false;
  setSS('New quotation');
  renderList();
}

function makeItem() { return { desc:'', unit:'nos', qty:1, costItems:[{desc:'',unit:'nos',qty:1,unitPrice:0,amt:0}], sell:0 }; }

// ─── SECTIONS ────────────────────────────────────────────────────────────────
function renderSections() {
  const c = document.getElementById('sections-container');
  if (!_data.length) _data = [{section:'',items:[makeItem()]}];
  c.innerHTML = '';
  _data.forEach((sec, si) => {
    const secEl = document.createElement('div');
    secEl.className = 'section-block';
    secEl.setAttribute('draggable','true');
    secEl.setAttribute('data-si', si);
    secEl.ondragstart = function(ev) { window._dragSec=si; ev.dataTransfer.effectAllowed='move'; this.style.opacity='0.5'; };
    secEl.ondragend = function(ev) { this.style.opacity='1'; };
    secEl.ondragover = function(ev) { ev.preventDefault(); this.classList.add('drag-over'); };
    secEl.ondragleave = function(ev) { this.classList.remove('drag-over'); };
    secEl.ondrop = function(ev) { ev.preventDefault(); this.classList.remove('drag-over'); if(window._dragSec==null||window._dragSec===si) return; const tmp=_data.splice(window._dragSec,1)[0]; _data.splice(si,0,tmp); window._dragSec=null; renderSections(); dirty(); };
    secEl.innerHTML = `
      <div class="sec-hdr">
        <span class="drag-handle" title="Drag to reorder">☰</span>
        <button class="btn btn-sm" onclick="moveSectionUp(${si})" title="Move up" style="padding:4px 8px;background:none;border:1px solid var(--gray-200)">↑</button>
        <button class="btn btn-sm" onclick="moveSectionDown(${si})" title="Move down" style="padding:4px 8px;background:none;border:1px solid var(--gray-200)">↓</button>
        <input type="text" class="sec-name" placeholder="Section name, e.g. Electrical Work" value="${escHtml(sec.section)}" oninput="syncSectionName(${si},this)">
        <button class="btn btn-r btn-sm" onclick="delSection(${si})" title="Delete section">🗑</button>
      </div>
      <div class="sec-items" id="sec-items-${si}"></div>
      <div class="sec-subtotal" id="sec-total-${si}">Section Total: <strong>RM 0.00</strong></div>
      <button class="btn btn-g btn-sm" onclick="addItem(${si})" style="margin-top:6px">+ Add Item</button>
    `;
    c.appendChild(secEl);
    // render items for this section
    const ic = document.getElementById('sec-items-' + si);
    if (!sec.items || !sec.items.length) sec.items = [makeItem()];
    sec.items.forEach((it, ii) => ic.appendChild(buildItemRow(it, si, ii)));
  });
}

function moveSectionUp(si) { if(si<=0)return; const tmp=_data.splice(si,1)[0]; _data.splice(si-1,0,tmp); renderSections(); dirty(); }
function moveSectionDown(si) { if(si>=_data.length-1)return; const tmp=_data.splice(si,1)[0]; _data.splice(si+1,0,tmp); renderSections(); dirty(); }
function addSection(name) { _data.push({section:name||'',items:[makeItem()]}); renderSections(); dirty(); }
function delSection(si) { if (_data.length <= 1) return; _data.splice(si,1); renderSections(); dirty(); }
function syncSectionName(si, inp) { _data[si].section = inp.value; dirty(); }

function addItem(si) {
  _data[si].items.push(makeItem());
  const ic = document.getElementById('sec-items-' + si);
  ic.appendChild(buildItemRow(_data[si].items[_data[si].items.length-1], si, _data[si].items.length-1));
  dirty();
}

function remItem(si, ii) {
  _data[si].items.splice(ii,1);
  renderSections();
  dirty();
}

function buildItemRow(it, si, ii) {
  const el = document.createElement('div');
  el.className = 'item';
  const ct = (it.costItems||[]).reduce((s,c) => s+(parseFloat(c.amt)||0), 0);
  const mk = ct>0 && it.sell>0 ? ((it.sell-ct)/ct*100) : 0;
  const mkCls = mk>=30?'mk-g':mk>=15?'mk-y':'mk-r';
  const ctStr = ct>0?`RM ${fmt(ct)}`:'—';
  const mkStr = mk>0?`<span class="mk ${mkCls}">+${fmt(mk)}%</span>`:'';
  const ciRows = (it.costItems||[]).map((ci, cii) => `
    <div class="csub">
      <input type="text" placeholder="e.g. Wire 100m" value="${escHtml(ci.desc)}" oninput="syncCi(${si},${ii},${cii},this,'desc')">
      <select class="ci-unit" onchange="syncCi(${si},${ii},${cii},this,'unit')">${UNITS.map(u => `<option value="${u}" ${(ci.unit||'nos')===u?'selected':''}>${u}</option>`).join('')}</select>
      <input type="number" min="0" class="ci-qty" placeholder="Qty" value="${ci.qty||''}" oninput="syncCi(${si},${ii},${cii},this,'qty')" style="text-align:center">
      <input type="number" min="0" class="ci-price" placeholder="RM" value="${ci.unitPrice||ci.unitPrice===0?ci.unitPrice:''}" oninput="syncCi(${si},${ii},${cii},this,'price')">
      <span class="ci-amt">${ci.amt>0?'RM '+fmt(ci.amt):'—'}</span>
      <button class="del" style="font-size:13px" onclick="remCi(${si},${ii},${cii},this)">×</button>
    </div>`).join('');
  el.innerHTML = `
    <div class="item-main">
      <span class="item-num">${ii+1}</span>
      <input type="text" class="f-desc" placeholder="e.g. Install lighting point" value="${escHtml(it.desc)}" oninput="syncItemDesc(${si},${ii},this)">
      <select class="f-unit" onchange="syncItemUnit(${si},${ii},this)">${UNITS.map(u => `<option value="${u}" ${it.unit===u?'selected':''}>${u}</option>`).join('')}</select>
      <input type="number" class="f-qty" min="0" placeholder="1" value="${it.qty}" oninput="syncItemQty(${si},${ii},this)" style="text-align:center">
      <input type="number" class="f-cost" min="0" placeholder="0.00" value="${ct>0?fmt(ct):''}" readonly>
      <input type="number" class="f-sell" min="0" placeholder="0.00" value="${it.sell||it.sell===0?fmt(it.sell):''}" oninput="syncItemSell(${si},${ii},this)">
      <button class="btn btn-g btn-sm" style="padding:4px 8px;font-size:11px;white-space:nowrap" onclick="autoSell(${si},${ii})">+25%</button>
      <button class="del" onclick="remItem(${si},${ii})">×</button>
    </div>
    <div class="exp-h" onclick="toggleCost(this)">
      💰 Cost breakdown <span style="font-size:11px;color:var(--gold)">${ctStr}</span> ${mkStr}<span class="tog">▶</span>
    </div>
    <div class="cb">${ciRows}
      <button class="btn btn-g btn-sm" onclick="addCi(${si},${ii},this)" style="margin-top:4px">+ Add cost line</button>
      <div class="csub-row">Subtotal cost: <span>RM ${fmt(ct)}</span></div>
    </div>`;
  el.setAttribute('draggable', 'true');
  el.dataset.si = si;
  el.dataset.ii = ii;
  el.ondragstart = function(e) { window._dragItem = {si,ii}; e.dataTransfer.effectAllowed = 'move'; this.style.opacity = '0.5'; };
  el.ondragend = function(e) { this.style.opacity = '1'; window._dragItem = null; };
  el.ondragover = function(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; this.classList.add('drag-over'); };
  el.ondragleave = function(e) { this.classList.remove('drag-over'); };
  el.ondrop = function(e) { e.preventDefault(); this.classList.remove('drag-over'); if(!window._dragItem) return; const {si:fsi,ii:fii}=window._dragItem; if(fsi===si&&fii===ii) return; const [moved]=_data[fsi].items.splice(fii,1); _data[si].items.splice(ii,0,moved); renderSections(); dirty(); };
  return el;
}

function toggleCost(el) { const cb=el.nextElementSibling; cb.classList.toggle('open'); el.querySelector('.tog').textContent = cb.classList.contains('open')?'▼':'▶'; }

// Item field sync
function syncItemDesc(si,ii,inp) { _data[si].items[ii].desc = inp.value; dirty(); }
function syncItemUnit(si,ii,inp) { _data[si].items[ii].unit = inp.value; dirty(); }
function syncItemQty(si,ii,inp) { _data[si].items[ii].qty = parseFloat(inp.value.replace(/,/g,""))||0; recalc(); dirty(); }
function syncItemSell(si,ii,inp) { _data[si].items[ii].sell = parseFloat(inp.value.replace(/,/g,""))||0; recalc(); dirty(); }

function autoSell(si,ii) {
  const it = _data[si].items[ii];
  const ct = (it.costItems||[]).reduce((s,c) => s+(parseFloat(c.amt)||0), 0);
  if (ct <= 0) { alert('Cost breakdown is empty or 0! Add cost amounts first.'); return; }
  const sell = ct * 1.25;
  it.sell = sell;
  // update DOM — find row by section index + item index
  const secItems = document.querySelectorAll('.sec-items');
  const row = secItems[si] ? secItems[si].children[ii] : null;
  if (row) {
    const sellInput = row.querySelector('.f-sell');
    if (sellInput) sellInput.value = fmt(sell);
    const costInput = row.querySelector('.f-cost');
    if (costInput) costInput.value = fmt(ct);
    const subRow = row.querySelector('.csub-row span');
    if (subRow) subRow.textContent = 'RM ' + fmt(ct);
    recalc();
    dirty();
  } else {
    // fallback: just update the sell field directly
    alert('Cost RM ' + fmt(ct) + ' → Sell RM ' + fmt(sell) + ' (row not found in DOM, please refresh)');
  }
}

function addCi(si, ii, btn) {
  _data[si].items[ii].costItems.push({desc:'',unit:'nos',qty:1,unitPrice:0,amt:0});
  const row = btn.closest('.cb');
  const ciRows = row.querySelectorAll('.csub');
  const newRow = document.createElement('div');
  newRow.className = 'csub';
  newRow.innerHTML = `<input type="text" placeholder="e.g. Wire 100m" value="" oninput="syncCi(${si},${ii},${ciRows.length},this,'desc')">
  <select class="ci-unit" onchange="syncCi(${si},${ii},${ciRows.length},this,'unit')">${UNITS.map(u => `<option value="${u}">${u}</option>`).join('')}</select>
  <input type="number" min="0" class="ci-qty" placeholder="Qty" value="" oninput="syncCi(${si},${ii},${ciRows.length},this,'qty')" style="text-align:center">
  <input type="number" min="0" class="ci-price" placeholder="RM" value="" oninput="syncCi(${si},${ii},${ciRows.length},this,'price')">
  <span class="ci-amt">—</span>
  <button class="del" style="font-size:13px" onclick="remCi(${si},${ii},${ciRows.length},this)">×</button>`;
  row.insertBefore(newRow, btn);
  dirty();
}

function remCi(si, ii, cii, btn) {
  _data[si].items[ii].costItems.splice(cii,1);
  btn.closest('.csub').remove();
  recalc();
  dirty();
}

function syncCi(si, ii, cii, inp, field) {
  const row = inp.closest('.csub');
  const ci = _data[si].items[ii].costItems[cii];
  const descInp = row.querySelector('input[type="text"]');
  const unitSel = row.querySelector('.ci-unit');
  const qtyInp = row.querySelector('.ci-qty');
  const priceInp = row.querySelector('.ci-price');
  ci.desc = descInp ? descInp.value : ci.desc;
  ci.unit = unitSel ? unitSel.value : ci.unit;
  ci.qty = qtyInp ? (parseFloat(qtyInp.value.replace(/,/g,""))||0) : ci.qty;
  ci.unitPrice = priceInp ? (parseFloat(priceInp.value.replace(/,/g,""))||0) : ci.unitPrice;
  ci.amt = ci.unitPrice * ci.qty;
  const amtEl = row.querySelector('.ci-amt');
  if (amtEl) amtEl.textContent = ci.amt > 0 ? 'RM ' + fmt(ci.amt) : '—';
  const ct = (_data[si].items[ii].costItems||[]).reduce((s,c) => s+(parseFloat(c.amt)||0), 0);
  const itemRow = row.closest('.item');
  const costInput = itemRow.querySelector('.f-cost');
  if (costInput) costInput.value = ct>0?fmt(ct):'';
  const subRow = itemRow.querySelector('.csub-row span');
  if (subRow) subRow.textContent = 'RM '+fmt(ct);
  recalc();
  dirty();
}

// ─── TERMS ───────────────────────────────────────────────────────────────────
function renderTerms() {
  const c = document.getElementById('terms-container');
  c.innerHTML = '';
  _terms.forEach((t,i) => {
    const row = document.createElement('div');
    row.className = 'terms-row';
    row.innerHTML = `<input type="text" placeholder="e.g. 50% deposit upon confirmation" value="${escHtml(t)}" oninput="syncTerm(${i},this)"><button class="del" onclick="remTerm(${i})">×</button>`;
    c.appendChild(row);
  });
}
function addTerm() { _terms.push(''); renderTerms(); dirty(); }
function remTerm(i) { _terms.splice(i,1); renderTerms(); dirty(); }
function syncTerm(i,inp) { _terms[i]=inp.value; dirty(); }

// ─── NOTES / STANDARD T&C ─────────────────────────────────────────────────────
function renderNotes() {
  const c = document.getElementById('terms-notes-container');
  if (!c) return;
  c.innerHTML = '';
  _notes.forEach((t,i) => {
    const row = document.createElement('div');
    row.className = 'terms-row';
    row.innerHTML = `<input type="text" placeholder="Enter term or note..." value="${escHtml(t)}" oninput="syncNote(${i},this)"><button class="del" onclick="remNote(${i})">×</button>`;
    c.appendChild(row);
  });
}
function addNote() { _notes.push(''); renderNotes(); dirty(); }
function remNote(i) { _notes.splice(i,1); renderNotes(); dirty(); }
function syncNote(i,inp) { _notes[i]=inp.value; dirty(); }

// ─── RECALC ──────────────────────────────────────────────────────────────────
function recalc() {
  let totalCost=0, totalSell=0;
  _data.forEach((sec, si) => {
    let secSell=0;
    (sec.items||[]).forEach(it => {
      const ct = (it.costItems||[]).reduce((s,c) => s+(parseFloat(c.amt)||0), 0);
      // cost breakdown amt already includes qty×unitPrice; main qty multiplies sell only
      totalCost += ct;
      const lineSell = (parseFloat(it.sell)||0) * (parseFloat(it.qty)||0);
      secSell += lineSell;
      totalSell += lineSell;
    });
    const el = document.getElementById('sec-total-' + si);
    if (el) el.innerHTML = 'Section Total: <strong>RM ' + fmt(secSell) + '</strong>';
  });
  const profit = totalSell - totalCost;
  const mkPct = totalCost>0 ? (profit/totalCost*100) : 0;
  document.getElementById('tot-cost').textContent = 'RM '+fmt(totalCost);
  document.getElementById('tot-sell').textContent = 'RM '+fmt(totalSell);
  const mkEl = document.getElementById('tot-mk');
  if (mkPct>0) { mkEl.textContent = `+${fmt(mkPct)}% (RM ${fmt(profit)})`; mkEl.style.color = mkPct>=30?'#166534':mkPct>=15?'#92400e':'#dc2626'; }
  else { mkEl.textContent='—'; mkEl.style.color=''; }
}

// ─── SAVE ────────────────────────────────────────────────────────────────────
function gatherForm() {
  _name = document.getElementById('f-name').value||'Unnamed';
  _code = document.getElementById('f-code').value;
  _qno = document.getElementById('f-qno').value;
  _addr = document.getElementById('f-addr').value;
  _proj = document.getElementById('f-proj').value;
  _date = document.getElementById('f-date').value;
  _status = document.getElementById('f-status').value;
  _notesTxt = document.getElementById('f-notes').value;
}

async function saveQuote() {
  if (!isDirty) { console.log('saveQuote: nothing to save (not dirty)'); return; }
  gatherForm();
  const payload = JSON.stringify({items:_data, terms:_terms, notes2:_notes, qno:_qno, code:_code, addr:_addr, notes:_notesTxt});
  setSS('Saving...');
  console.log('saveQuote: starting... activeId=' + activeId + ' payload length=' + payload.length);
  try {
    let res, data;
    if (activeId && activeId!=='__new__') {
      const sql = `UPDATE quotes SET name='${escSql(_name)}', project='${escSql(_proj)}', date='${escSql(_date)}', status='${escSql(_status)}', qno='${escSql(_qno)}', addr='${escSql(_addr)}', data='${escSql(payload)}' WHERE id='${escSql(activeId)}'`;
      console.log('saveQuote: UPDATE sql=', sql);
      res = await fetch(PROXY, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sql})});
    } else {
      const newId = crypto.randomUUID();
      const sql = `INSERT INTO quotes (id, name, project, date, status, qno, addr, data) VALUES ('${escSql(newId)}', '${escSql(_name)}', '${escSql(_proj)}', '${escSql(_date)}', '${escSql(_status)}', '${escSql(_qno)}', '${escSql(_addr)}', '${escSql(payload)}')`;
      console.log('saveQuote: INSERT sql=', sql);
      res = await fetch(PROXY, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sql})});
      data = { id: newId };
    }
    console.log('saveQuote: response status=' + res.status);
    if (!res.ok) { console.log('saveQuote: network error, res.ok=false'); setSS('Network error'); return; }
    data = await res.json();
    console.log('saveQuote: D1 response=', JSON.stringify(data));
    if (!data.success) { console.log('saveQuote: D1 error'); setSS('D1 error: '+(data.errors&&data.errors[0]||'')); return; }
    if (activeId==='__new__') { console.log('saveQuote: new quote, adding to quotes array with newId=' + newId + ' (data.id was=' + data.id + ')'); activeId=newId; quotes.unshift({id:newId,name:_name,project:_proj,date:_date,status:_status,qno:_qno,addr:_addr,items:_data,terms:_terms,notes2:_notes,notes:_notesTxt}); }
    else { console.log('saveQuote: update existing, activeId=' + activeId); const idx=quotes.findIndex(q=>q.id===activeId); if(idx!==-1) quotes[idx]={...quotes[idx],name:_name,project:_proj,date:_date,status:_status,qno:_qno,addr:_addr,items:_data,terms:_terms,notes2:_notes,notes:_notesTxt}; }
    isDirty = false;
    setSS('Saved ✓');
    console.log('saveQuote: calling renderList, quotes.length=' + quotes.length);
    renderList();
    clearDraft();
  } catch(e) { console.log('saveQuote: catch error=' + e.message); setSS('Network error'); }
}

// ─── DELETE ──────────────────────────────────────────────────────────────────
async function delQuote() {
  if (!activeId||activeId==='__new__') { alert('Nothing to delete'); return; }
  if (!confirm('Delete this quotation?')) return;
  try { const res = await fetch(PROXY, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sql:`DELETE FROM quotes WHERE id='${escSql(activeId)}'`})}); } catch(e){}
  quotes = quotes.filter(q=>q.id!==activeId);
  activeId = null; isDirty = false;
  document.getElementById('welcome').style.display='block';
  document.getElementById('editor').style.display='none';
  renderList();
  setSS('Deleted');
}

// ─── PDF ─────────────────────────────────────────────────────────────────────
function openPDF() {
  gatherForm();
  // Sync section names and item sell values from DOM → _data before PDF generation
  const sectionBlocks = document.querySelectorAll('.section-block');
  sectionBlocks.forEach((block, si) => {
    const secNameInput = block.querySelector('.sec-name');
    if (secNameInput && _data[si]) _data[si].section = secNameInput.value;
    const itemEls = block.querySelectorAll('.item');
    itemEls.forEach((itemEl, ii) => {
      const sellInput = itemEl.querySelector('.f-sell');
      if (sellInput && _data[si] && _data[si].items[ii]) {
        _data[si].items[ii].sell = parseFloat(sellInput.value) || 0;
      }
    });
  });
  const terms = _terms.filter(t=>t.trim());
  let grandTotal = 0;
  const rows = [];
  let itemNum = 0;
  _data.forEach((sec,si) => {
    let secTotal = 0;
    // Section header row
    if (sec.section) {
      rows.push(`<tr class="sec-row"><td colspan="6" style="background:#e8f4f1;font-weight:700;color:#2d5a47;font-size:12px;padding:8px 12px">${escHtml(sec.section)}</td></tr>`);
    }
    (sec.items||[]).forEach(it => {
      if (!it.desc && !it.sell) return;
      itemNum++;
      const line = (parseFloat(it.sell)||0)*(parseFloat(it.qty)||0);
      secTotal += line;
      grandTotal += line;
      rows.push(`<tr>
        <td style="width:24px;color:var(--gray-400)">${itemNum}</td>
        <td>${escHtml(it.desc)||'—'}</td>
        <td style="width:60px;text-align:center">${escHtml(it.unit)}</td>
        <td style="width:40px;text-align:right">${it.qty||0}</td>
        <td style="width:80px;text-align:right">RM ${fmt(it.sell)}</td>
        <td style="width:90px;text-align:right;font-weight:600">RM ${fmt(line)}</td>
      </tr>`);
    });
    // Section subtotal row
    rows.push(`<tr class="sec-subtotal-row"><td colspan="5" style="text-align:right;font-weight:700;background:#f0faf7;color:#2d5a47;font-size:12px;padding:6px 12px">Section Total: RM ${fmt(secTotal)}</td><td style="text-align:right;font-weight:700;background:#f0faf7;color:#2d5a47;font-size:12px;padding:6px 12px">RM ${fmt(secTotal)}</td></tr>`);
  });
  const dateStr = _date ? new Date(_date+'T00:00:00').toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'}) : '';
  const termList = terms.length ? `<div class="qp-terms"><h4>Payment Terms</h4><ul>${terms.map(t=>`<li>${escHtml(t)}</li>`).join('')}</ul></div>` : '';
  const stdTerms = _notes.filter(t=>t.trim());
  const stdTermsList = stdTerms.length ? `<div class="qp-terms"><h4>Terms &amp; Conditions</h4><ol style="padding-left:18px;margin:0">${stdTerms.map(t=>`<li>${escHtml(t)}</li>`).join('')}</ol></div>` : '';
  const html = `<div class="qp">
    <div class="qp-hdr">
      <div class="qp-logo"><h2>Health Space Interior</h2><p>HS Design (SSM: 202603001610)</p><p>24-1, Jalan Rosmerah 2/17, Taman Johor Jaya</p><p>81100 Johor Bahru, Johor</p><p>011-1688 0145 | hsdesign.biz</p></div>
      <div class="qp-ref"><h3>QUOTATION</h3><p><strong>Ref:</strong> ${escHtml(_qno)||'—'}</p><p><strong>Date:</strong> ${dateStr}</p><p><strong>Status:</strong> ${_status}</p></div>
    </div>
    <div class="qp-ci"><h4>Prepared For</h4><p>${escHtml(_name)}</p><span>${escHtml(_addr||_proj||'—')}</span></div>
    <table class="qp-table"><thead><tr><th style="width:24px">#</th><th>Description</th><th style="width:60px;text-align:center">Unit</th><th style="width:40px;text-align:right">Qty</th><th style="width:80px;text-align:right">Unit Price</th><th style="width:90px;text-align:right">Amount</th></tr></thead><tbody>${rows.join('')}</tbody></table>
    <div class="qp-totals"><div class="qp-tbox"><div class="qp-tr gd"><span>Grand Total</span><span>RM ${fmt(grandTotal)}</span></div></div></div>
    ${termList}
    ${stdTermsList}
    <div class="qp-footer">Thank you for considering Health Space Interior<br>This quotation is valid for 30 days from the date above.</div>
  </div>`;
  document.getElementById('pdfbody').innerHTML = html;
  document.getElementById('pdfmo').classList.add('open');
}

function closePDF() { document.getElementById('pdfmo').classList.remove('open'); }

// ─── EXPORT / IMPORT JSON ─────────────────────────────────────────────────────
function exportJSON() {
  gatherForm();
  const data = {
    name: _name, qno: _qno, addr: _addr, proj: _proj, date: _date, status: _status,
    items: _data, terms: _terms, notes: _notes, notesTxt: _notesTxt
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'HS_Quote_' + (_qno || ISO()) + '.json';
  a.click();
  URL.revokeObjectURL(url);
  setSS('Exported ✓');
}

function importJSON() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data.items) { alert('Invalid file format: missing items array'); return; }
        if (!confirm('Import this quotation? Current unsaved changes will be lost.')) return;
        _data = data.items;
        _terms = data.terms || [];
        _notes = data.notes || [];
        _notesTxt = data.notesTxt || '';
        _name = data.name || '';
        _qno = data.qno || '';
        _addr = data.addr || '';
        _proj = data.proj || '';
        _date = data.date || '';
        _status = data.status || 'Draft';
        document.getElementById('f-name').value = _name;
        document.getElementById('f-qno').value = _qno;
        document.getElementById('f-addr').value = _addr;
        document.getElementById('f-proj').value = _proj;
        document.getElementById('f-date').value = _date;
        document.getElementById('f-status').value = _status;
        document.getElementById('f-notes').value = _notesTxt;
        activeId = '__new__';
        isDirty = true;
        renderSections();
        renderTerms();
        renderNotes();
        recalc();
        clearDraft();
        setSS('Imported — save to Notion when online');
      } catch(err) {
        alert('Failed to import: ' + err.message);
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

function printPDF() {
  const content = document.getElementById('pdfbody').innerHTML;
  const win = window.open('','_blank');
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
    .sec-row td{background:#e8f4f1!important;font-weight:700!important;color:#2d5a47!important}
    .sec-subtotal-row td{background:#f0faf7!important;font-weight:700!important;color:#2d5a47!important}
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
    .qp-terms ol{margin:0;padding-left:20px}
    .qp-terms ol li{margin-bottom:4px;font-size:12px;color:#6b7280}
    .qp-footer{margin-top:28px;text-align:center;font-size:11px;color:#9a9ab0;padding-top:14px;border-top:1px solid #e8e8e8}
    @media print{body{padding:20px}}
  </style></head><body>${content}</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(()=>win.print(),600);
}

// ─── INIT ─────────────────────────────────────────────────────────────────────

// ─── SIDEBAR COLLAPSE ──────────────────────────────────────────────────────────
function toggleSidebar() {
  const sb = document.querySelector('.sidebar');
  const body = document.querySelector('.body');
  const collapsed = sb.classList.toggle('collapsed');
  body.classList.toggle('sidebar-collapsed', collapsed);
  const btn = document.getElementById('sidebar-toggle');
  if (btn) btn.textContent = collapsed ? '\u25ba' : '\u2630';
  localStorage.setItem('sidebarCollapsed', collapsed);
}
function initSidebar() {
  const sb = document.querySelector('.sidebar');
  const body = document.querySelector('.body');
  const collapsed = localStorage.getItem('sidebarCollapsed') === 'true';
  sb.classList.toggle('collapsed', collapsed);
  body.classList.toggle('sidebar-collapsed', collapsed);
  const btn = document.getElementById('sidebar-toggle');
  if (btn) btn.textContent = collapsed ? '\u25ba' : '\u2630';
}

document.getElementById('pass').focus();
