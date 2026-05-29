
/* UX: taller rows with hover highlight */
.section-block{min-height:48px;border-bottom:1px solid var(--gray-200);transition:background .15s}
.section-block:hover{background:#f8fafc}
.sec-items .item{padding:8px 4px;border-radius:6px;transition:background .12s}
.sec-items .item:hover{background:#f8fafc}

// ─── CONFIG ─────────────────────────────────────────────────────────────────
const API_BASE = 'https://quotation.hsdesign.biz'; // SaaS API base
const UNITS = ['nos', 'set', 'm', 'm²', 'lot', 'box', 'lump sum', 'day', 'trip', 'ft', 'ft²', 'hour'];

// ─── STATE ────────────────────────────────────────────────────────────────────
let quotes = [];
let activeId = null;
let expandedId = null;
let isDirty = false;
let searchFilter = '';
let autoSaveTimer = null;
// _data = [{ section: '', items: [{ desc:'', unit:'nos', qty:1, costItems:[{desc:'',unit:'nos',qty:1,unitPrice:0,amt:0}], sell:0 }] }]
let _data = { items: [] };
let _terms = [];
let _notes = [];
let _name = '', _qno = '', _addr = '', _proj = '', _date = '', _status = 'Draft', _notesTxt = '';
let _dragSection = null; // {fromSi}
let _dragItem = null;    // {fromSi, fromIi}

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
const esc = s => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
// SMART AUTO-SAVE STATUS
let _lastSaveTime = null;
const setSS = m => {
  if (!m || m === 'Saving...' || m === 'Saved ' || m === 'Error: ') {
    document.getElementById('ss').textContent = m;
    return;
  }
  if (m.startsWith('Last saved')) {
    const now = Date.now();
    if (_lastSaveTime) {
      const diffSec = Math.floor((now - _lastSaveTime) / 1000);
      if (diffSec < 30) { document.getElementById('ss').textContent = 'Last saved Just now'; return; }
      if (diffSec < 300) { document.getElementById('ss').textContent = 'Last saved ' + Math.floor(diffSec/60) + ' min ago'; return; }
    }
    _lastSaveTime = now;
  }
  document.getElementById('ss').textContent = m;
};
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
  renderSections(); recalc();
  renderTerms();
  renderNotes();
  recalc();
  isDirty = false;
setSS('Draft restored');
    renderList();
  }

  
// ─── ONBOARDING TOOLTIP ─────────────────────────────────────────────────────
const ONBOARD_KEY = 'hsdesign_onboarded';
function showOnboardingTip() {
  if (localStorage.getItem(ONBOARD_KEY)) return;
  const tip = document.createElement('div');
  tip.id = 'onboard-tip';
  tip.innerHTML = '<div class="onboard-overlay"></div>' +
    '<div class="onboard-box">' +
    '<div class="onboard-arrow"></div>' +
    '<p class="onboard-msg">Tip: Create your first quote in under 2 minutes. Click here!</p>' +
    '<button class="onboard-close" onclick="dismissOnboard()">Got it</button></div>';
  document.body.appendChild(tip);
  const newBtn = document.querySelector('button[onclick*="newQuote"]') ||
                 document.querySelector('button[onclick*="__new"]');
  if (newBtn) {
    const rect = newBtn.getBoundingClientRect();
    const box = tip.querySelector('.onboard-box');
    box.style.top = (rect.bottom + window.scrollY + 8) + 'px';
    box.style.left = (rect.left + window.scrollX) + 'px';
  }
}
function dismissOnboard() {
  try { localStorage.setItem(ONBOARD_KEY, '1'); } catch(e) {}
  const tip = document.getElementById('onboard-tip');
  if (tip) tip.remove();
}
function checkOnboard() {
  if (!quotes || quotes.length === 0) setTimeout(showOnboardingTip, 800);
}


// ─── USAGE BANNER ────────────────────────────────────────────────────────────
function showUsageBanner(pct) {
  const existing = document.getElementById('usage-banner');
  if (existing) existing.remove();
  if (pct < 80) return;
  const banner = document.createElement('div');
  banner.id = 'usage-banner';
  const msg = "You've used " + pct + "/100 quotes this month.";
  const link = '<a href="/pricing" class="usage-banner-link">Upgrade to Ad-Free for RM5/mo &#8594;</a>';
  const closeBtn = '<button onclick="this.parentElement.remove()" style="background:none;border:none;cursor:pointer;font-size:16px;padding:0 4px;margin-left:8px;color:inherit">&#215;</button>';
  banner.innerHTML = '<div class="usage-banner-inner">' + msg + ' ' + link + closeBtn + '</div>';
  const toolbar = document.querySelector('.tb');
  if (toolbar && toolbar.parentNode) toolbar.parentNode.insertBefore(banner, toolbar.nextSibling);
}


// PDF EXPORT SPINNER
function setExportLoading(on) {
  const btn = document.getElementById('btn-open-pdf');
  if (!btn) return;
  if (on) {
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = '<svg class="spin" viewBox="0 0 24 24" width="14" height="14" style="animation:spin .8s linear infinite;fill:currentColor"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" fill="none" stroke-dasharray="30 70"/></svg> Generating...';
    btn.disabled = true;
  } else {
    btn.innerHTML = btn.dataset.originalText || 'Export PDF';
    btn.disabled = false;
  }
}


// MOBILE SIDEBAR - auto-collapse on <768px
function initMobileSidebar() {
  const handleResize = () => {
    const sb = document.querySelector('.sidebar');
    if (!sb) return;
    if (window.innerWidth < 768) {
      sb.classList.add('collapsed');
      document.querySelector('.body').classList.add('sidebar-collapsed');
      const toggle = document.getElementById('sidebar-toggle');
      if (toggle) toggle.textContent = '▸';
    }
  };
  window.addEventListener('resize', handleResize);
  handleResize();
}

// ─── SIDEBAR COLLAPSE ──────────────────────────────────────────────────────────
function toggleSidebar() {
  const sb = document.querySelector('.sidebar');
  const collapsed = sb.classList.toggle('collapsed');
  document.querySelector('.body').classList.toggle('collapsed', collapsed);
  document.getElementById('sidebar-toggle').textContent = collapsed ? '▸' : '☰';
  try { localStorage.setItem('hsdesign_sidebar', collapsed ? '1' : '0'); } catch(e) {}
}

function initSidebar() {
  try {
    const v = localStorage.getItem('hsdesign_sidebar');
    if (v === '1') {
      document.querySelector('.sidebar').classList.add('collapsed');
      document.querySelector('.body').classList.add('collapsed');
      document.getElementById('sidebar-toggle').textContent = '▸';
    }
  } catch(e) {}
}

// ─── SECTION DRAG-AND-DROP ────────────────────────────────────────────────────
function secDragStart(si, el) {
  _dragSection = si;
  el.classList.add('dragging');
  el.addEventListener('dragend', () => el.classList.remove('dragging'), { once: true });
}

function secDragOver(si, el) {
  if (_dragSection === null || _dragSection === si) return;
  el.classList.add('drag-over');
}

function secDragLeave(si, el) {
  el.classList.remove('drag-over');
}

function secDrop(si, el) {
  el.classList.remove('drag-over');
  if (_dragSection === null || _dragSection === si) return;
  const from = _dragSection;
  _dragSection = null;
  const data = _data.splice(from, 1)[0];
  _data.splice(si, 0, data);
  renderSections();
  dirty();
}

// ─── ITEM DRAG-AND-DROP ───────────────────────────────────────────────────────
function itemDragStart(si, ii, el) {
  _dragItem = { fromSi: si, fromIi: ii };
  el.classList.add('dragging');
  el.addEventListener('dragend', () => el.classList.remove('dragging'), { once: true });
}

function itemDragOver(si, ii, el) {
  if (!_dragItem || (_dragItem.fromSi === si && _dragItem.fromIi === ii)) return;
  el.classList.add('drag-over');
}

function itemDragLeave(si, ii, el) {
  el.classList.remove('drag-over');
}

function itemDrop(si, ii, el) {
  el.classList.remove('drag-over');
  if (!_dragItem) return;
  const { fromSi, fromIi } = _dragItem;
  _dragItem = null;
  // Remove from original position
  const [moved] = _data[fromSi].items.splice(fromIi, 1);
  // Insert at new position (same section or different)
  _data[si].items.splice(ii, 0, moved);
  renderSections();
  dirty();
}

// ─── GATE (SaaS) ───────────────────────────────────────────────────────────────
function checkAuth() {
  const token = localStorage.getItem('token');
  return token || null;
}

function showGate() {
  // Redirect to login page
  window.location.href = '/dashboard?login=1';
}

function chkGate() {
  const token = checkAuth();
  if (!token) {
    // Show error if password field exists (original gate UI still visible)
    const passEl = document.getElementById('pass');
    if (passEl) {
      document.getElementById('gerr').textContent = 'Please login via quotation.hsdesign.biz';
      document.getElementById('gerr').style.display = 'block';
    }
    return;
  }
  document.getElementById('gate').style.display = 'none';
  const app = document.getElementById('app');
  app.style.display = 'flex';
  app.style.flexDirection = 'column';
  initSidebar();
  initMobileSidebar();
  loadQuotes();
  // Check for unsaved draft
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
}

// ─── NOTION ───────────────────────────────────────────────────────────────────
async function loadQuotes() {
  setSS('Loading...');
  const token = localStorage.getItem('token') || '';
  try {
    const r = await fetch(API_BASE + '/api/quotations', {
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
    });
    const d = await r.json();
    if (!r.ok) { setSS('Error: ' + (d.error || r.statusText)); quotes = []; }
    else {
      quotes = (d.quotations || []).map(parseSaaS);
      setSS(quotes.length ? `Loaded ${quotes.length} quotes` : 'No quotes yet');
    }
    renderList();
  } catch (e) { setSS('Offline'); quotes = []; renderList(); }
}

function parseSaaS(row) {
  // SaaS list returns flat fields; full data loaded on openQ via GET /api/quotations/:id
  return { id: row.id, name: row.name||'', project: row.proj||'', date: row.date||'', status: row.status||'Draft', qno: row.qno||'', addr: row.addr||'', items: [], terms: [], notes: '', notes2: [] };
}

function parsePage(p) {
  const g = k => { const v = p.properties[k]; if (!v) return ''; if (v.type==='title') return v.title?.[0]?.plain_text||''; if (v.type==='rich_text') return v.rich_text?.[0]?.plain_text||''; if (v.type==='date') return v.date?.start||''; if (v.type==='select') return v.select?.name||''; if (v.type==='status') return v.status?.name||''; return ''; };
  let items=[],terms=[],notes='',notes2=[],qno='',addr='';
  try { const j=JSON.parse(g('Notes')||'{}'); items=j.items||[]; terms=j.terms||[]; notes=j.notes||''; notes2=j.notes2||[]; qno=j.qno||''; addr=j.addr||''; } catch(e) {}
  return { id:p.id, name:g('Name'), project:g('Project'), date:g('Date'), status:g('Status')||'Draft', qno, addr, items, terms, notes, notes2 };
}

// ─── LIST ─────────────────────────────────────────────────────────────────────
function handleSearch(val) {
  searchFilter = val.trim().toLowerCase();
  renderList();
  if (!quotes || quotes.length === 0) setTimeout(showOnboardingTip, 800);
  try {
    const raw = localStorage.getItem('hsdesign_usage') || '0/100';
    const m = raw.match(/(\d+)\/(\d+)/);
    if (m) showUsageBanner(Math.round(parseInt(m[1]) / (parseInt(m[2]) || 100) * 100));
  } catch(e) {}
}


function renderList() {
  const el = document.getElementById('ql');
  const list = quotes.filter(q => {
    if (!searchFilter) return true;
    return (q.name||'').toLowerCase().includes(searchFilter)
        || (q.project||'').toLowerCase().includes(searchFilter)
        || (q.qno||'').toLowerCase().includes(searchFilter)
        || (q.status||'').toLowerCase().includes(searchFilter);
  });
  if (!list.length) {
    el.innerHTML = `<div class="el"><div class="e">${searchFilter ? '🔍' : '📋'}</div><p>${searchFilter ? 'No matches found' : 'No quotations yet'}</p></div>`;
    return;
  }
  el.innerHTML = list.map(q => {
    const tot = (q.items||[]).reduce((s,sec) => s + (sec.items||[]).reduce((a,it) => a + (parseFloat(it.sell)||0)*(parseFloat(it.qty)||0), 0), 0);
    const bdg = q.status==='Sent'?'bdg-se':q.status==='Paid'?'bdg-pa':'bdg-dr';
    const secNames = (q.items||[]).map(s=>s.section||'Untitled').filter(Boolean).join(', ') || 'No sections';
    const itemCount = (q.items||[]).reduce((a,sec)=>a+(sec.items||[]).length,0);
    const isOpen = q.id===activeId;
    const isExp = expandedId===q.id;
    return `<div class="qc ${isOpen?'active':''}" id="qc-${q.id}">
      <div class="qc-head" onclick="handleQClick('${q.id}',event)">
        <div class="qc-mini">
          <div class="qc-t">${esc(q.name)||'Unnamed'}</div>
          <div class="qc-p">${esc(q.project)||'—'}</div>
          <div class="qc-b"><span class="qc-tot">RM ${fmt(tot)}</span><span class="bdg ${bdg}">${q.status}</span></div>
        </div>
        <button class="qc-chevron ${isExp?'open':''}" onclick="toggleQ('${q.id}',event)" title="Expand">${isExp?'▴':'▾'}</button>
      </div>
      <div class="qc-body ${isExp?'open':''}" onclick="event.stopPropagation()">
        <div class="qc-detail"><span class="qc-dl">No</span><span>${esc(q.qno)||'—'}</span></div>
        <div class="qc-detail"><span class="qc-dl">Date</span><span>${q.date||'—'}</span></div>
        <div class="qc-detail"><span class="qc-dl">Sections</span><span>${secNames}</span></div>
        <div class="qc-detail"><span class="qc-dl">Items</span><span>${itemCount} item${itemCount!==1?'s':''}</span></div>
      </div>
    </div>`;
  }).join('');
}
function handleQClick(id, event) {
  event.stopPropagation();
  openQ(id);
}
function toggleQ(id, event) {
  event.stopPropagation();
  expandedId = expandedId === id ? null : id;
  renderList();
  if (!quotes || quotes.length === 0) setTimeout(showOnboardingTip, 800);
  try {
    const raw = localStorage.getItem('hsdesign_usage') || '0/100';
    const m = raw.match(/(\d+)\/(\d+)/);
    if (m) showUsageBanner(Math.round(parseInt(m[1]) / (parseInt(m[2]) || 100) * 100));
  } catch(e) {}
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

async function openQ(id) {
  if (isDirty && !confirm('Unsaved changes. Discard?')) return;
  clearDraft();
  activeId = id;
  const q = quotes.find(x => x.id === id);
  if (!q) return;
  // Load full data from SaaS API (list only returns flat fields)
  const token = localStorage.getItem('token') || '';
  try {
    const res = await fetch(API_BASE + '/api/quotations/' + id, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (res.ok) {
      const d = await res.json();
      const sq = d.quotation;
      if (sq) {
        let full = null;
        // Try notes field first (original Notion format stored as JSON)
        if (sq.notes) {
          try { full = JSON.parse(sq.notes); } catch(e) {}
        }
        if (!full && sq.data) {
          try { full = typeof sq.data === 'string' ? JSON.parse(sq.data) : sq.data; } catch(e) {}
        }
        if (full) {
          _data = migrateData(full.items && full.items.length ? full.items : null) || [{section:'',items:[makeItem()]}];
          _terms = JSON.parse(JSON.stringify(full.terms && full.terms.length ? full.terms : ['50% deposit upon confirmation','40% upon work commencement','10% upon completion']));
          _notes = JSON.parse(JSON.stringify(full.notes2 && full.notes2.length ? full.notes2 : DEFAULT_NOTES));
          _notesTxt = full.notes || '';
        } else {
          _data = [{section:'',items:[makeItem()]}];
          _terms = ['50% deposit upon confirmation','40% upon work commencement','10% upon completion'];
          _notes = JSON.parse(JSON.stringify(DEFAULT_NOTES));
          _notesTxt = '';
        }
      } else {
        _data = [{section:'',items:[makeItem()]}];
        _terms = ['50% deposit upon confirmation','40% upon work commencement','10% upon completion'];
        _notes = JSON.parse(JSON.stringify(DEFAULT_NOTES));
        _notesTxt = '';
      }
    } else {
      _data = [{section:'',items:[makeItem()]}];
      _terms = ['50% deposit upon confirmation','40% upon work commencement','10% upon completion'];
      _notes = JSON.parse(JSON.stringify(DEFAULT_NOTES));
      _notesTxt = '';
    }
  } catch(e) {
    _data = [{section:'',items:[makeItem()]}];
    _terms = ['50% deposit upon confirmation','40% upon work commencement','10% upon completion'];
    _notes = JSON.parse(JSON.stringify(DEFAULT_NOTES));
    _notesTxt = '';
  }
  _name = q.name||''; _qno = q.qno||''; _addr = q.addr||''; _proj = q.project||''; _date = q.date||''; _status = q.status||'Draft';
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
  renderList();
  if (!quotes || quotes.length === 0) setTimeout(showOnboardingTip, 800);
  try {
    const raw = localStorage.getItem('hsdesign_usage') || '0/100';
    const m = raw.match(/(\d+)\/(\d+)/);
    if (m) showUsageBanner(Math.round(parseInt(m[1]) / (parseInt(m[2]) || 100) * 100));
  } catch(e) {}
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
  if (!quotes || quotes.length === 0) setTimeout(showOnboardingTip, 800);
  try {
    const raw = localStorage.getItem('hsdesign_usage') || '0/100';
    const m = raw.match(/(\d+)\/(\d+)/);
    if (m) showUsageBanner(Math.round(parseInt(m[1]) / (parseInt(m[2]) || 100) * 100));
  } catch(e) {}
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
    secEl.innerHTML = `
      <div class="sec-hdr">
        <input type="text" class="sec-name" placeholder="Section name, e.g. Electrical Work" value="${esc(sec.section)}" oninput="syncSectionName(${si},this)">
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

function addSection(name) { _data.push({section:name||'',items:[makeItem()]}); renderSections(); recalc(); dirty(); }
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
      <input type="text" placeholder="e.g. Wire 100m" value="${esc(ci.desc)}" oninput="syncCi(${si},${ii},${cii},this,'desc')">
      <select class="ci-unit" onchange="syncCi(${si},${ii},${cii},this,'unit')">${UNITS.map(u => `<option value="${u}" ${(ci.unit||'nos')===u?'selected':''}>${u}</option>`).join('')}</select>
      <input type="number" min="0" class="ci-qty" placeholder="Qty" value="${ci.qty||''}" oninput="syncCi(${si},${ii},${cii},this,'qty')" style="text-align:center">
      <input type="number" min="0" class="ci-price" placeholder="RM" value="${ci.unitPrice||ci.unitPrice===0?ci.unitPrice:''}" oninput="syncCi(${si},${ii},${cii},this,'price')">
      <span class="ci-amt">${ci.amt>0?'RM '+fmt(ci.amt):'—'}</span>
      <button class="del" style="font-size:13px" onclick="remCi(${si},${ii},${cii},this)">×</button>
    </div>`).join('');
  el.innerHTML = `
    <div class="item-main">
      <span class="item-num">${ii+1}</span>
      <input type="text" class="f-desc" placeholder="e.g. Install lighting point" value="${esc(it.desc)}" oninput="syncItemDesc(${si},${ii},this)">
      <select class="f-unit" onchange="syncItemUnit(${si},${ii},this)">${UNITS.map(u => `<option value="${u}" ${it.unit===u?'selected':''}>${u}</option>`).join('')}</select>
      <input type="number" class="f-qty" min="0" placeholder="1" value="${it.qty}" oninput="syncItemQty(${si},${ii},this)" style="text-align:center">
      <input type="number" class="f-cost" min="0" placeholder="0.00" value="${ct>0?ct.toFixed(2):''}" readonly>
      <input type="number" class="f-sell" min="0" placeholder="0.00" value="${(it.sell||0).toFixed(2)}" oninput="syncItemSell(${si},${ii},this)">
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
  return el;
}

function toggleCost(el) { const cb=el.nextElementSibling; cb.classList.toggle('open'); el.querySelector('.tog').textContent = cb.classList.contains('open')?'▼':'▶'; }

// Item field sync
function syncItemDesc(si,ii,inp) { _data[si].items[ii].desc = inp.value; dirty(); }
function syncItemUnit(si,ii,inp) { _data[si].items[ii].unit = inp.value; dirty(); }
function syncItemQty(si,ii,inp) { _data[si].items[ii].qty = parseFloat(inp.value)||0; recalc(); dirty(); }
function syncItemSell(si,ii,inp) { _data[si].items[ii].sell = parseFloat(inp.value)||0; recalc(); dirty(); }

function autoSell(si,ii) {
  const it = _data[si].items[ii];
  const ct = (it.costItems||[]).reduce((s,c) => s+(parseFloat(c.amt)||0), 0);
  if (ct <= 0) { alert('Cost breakdown is empty or 0! Add cost amounts first.'); return; }
  var mk = parseFloat(document.getElementById("mk-input")?.value||25)/100;const sell = ct * (1 + mk);
  it.sell = sell;
  // update DOM — find row by section index + item index
  const secItems = document.querySelectorAll('.sec-items');
  const row = secItems[si] ? secItems[si].children[ii] : null;
  if (row) {
    const sellInput = row.querySelector('.f-sell');
    if (sellInput) sellInput.value = sell.toFixed(2);
    const costInput = row.querySelector('.f-cost');
    if (costInput) costInput.value = ct.toFixed(2);
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
  ci.qty = qtyInp ? (parseFloat(qtyInp.value)||0) : ci.qty;
  ci.unitPrice = priceInp ? (parseFloat(priceInp.value)||0) : ci.unitPrice;
  ci.amt = ci.unitPrice * ci.qty;
  const amtEl = row.querySelector('.ci-amt');
  if (amtEl) amtEl.textContent = ci.amt > 0 ? 'RM ' + fmt(ci.amt) : '—';
  const ct = (_data[si].items[ii].costItems||[]).reduce((s,c) => s+(parseFloat(c.amt)||0), 0);
  const itemRow = row.closest('.item');
  const costInput = itemRow.querySelector('.f-cost');
  if (costInput) costInput.value = ct>0?ct.toFixed(2):'';
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
    row.innerHTML = `<input type="text" placeholder="e.g. 50% deposit upon confirmation" value="${esc(t)}" oninput="syncTerm(${i},this)"><button class="del" onclick="remTerm(${i})">×</button>`;
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
    row.innerHTML = `<input type="text" placeholder="Enter term or note..." value="${esc(t)}" oninput="syncNote(${i},this)"><button class="del" onclick="remNote(${i})">×</button>`;
    c.appendChild(row);
  });
}
function addNote() { _notes.push(''); renderNotes(); dirty(); }
function remNote(i) { _notes.splice(i,1); renderNotes(); dirty(); }
function syncNote(i,inp) { _notes[i]=inp.value; dirty(); }

// ─── RECALC ──────────────────────────────────────────────────────────────────
function applyMarkupAll(){var mk=parseFloat(document.getElementById("mk-input")?.value||25)/100;if(!_data||!_data.length)return;var any=false;_data.forEach(function(sec){sec.items.forEach(function(it){if(it.costItems&&it.costItems.length){var ct=it.costItems.reduce(function(s,ci){return s+(parseFloat(ci.amt)||0)},0);if(ct>0){it.sell=ct*(1+mk);any=true}}});});if(any){renderSections();recalc();dirty()}}
function attachMarkupListener(){var mi=document.getElementById("mk-input");if(mi&&!mi._hasListener){mi._hasListener=true;mi.addEventListener("change",function(){applyMarkupAll()});mi.addEventListener("input",function(){applyMarkupAll()})}}
if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",attachMarkupListener)}else{attachMarkupListener()}

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
  if (!isDirty) return;
  gatherForm();
  const token = localStorage.getItem('token') || '';
  const total = _data.reduce((s,sec) => s+(sec.items||[]).reduce((a,it)=>a+(parseFloat(it.sell)||0)*(parseFloat(it.qty)||0),0),0);
  // Store original Notion-format data in notes field; SaaS data field stores full JSON for portability
  const notesPayload = JSON.stringify({items:_data, terms:_terms, notes2:_notes, qno:_qno, code:_code, addr:_addr, notes:_notesTxt});
  const body = {
    qno: _qno, name: _name, proj: _proj, addr: _addr, date: _date, status: _status,
    notes: notesPayload,
    total
  };
  setSS('Saving...');
  try {
    let res, data;
    const headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token };
    if (activeId && activeId !== '__new__') {
      res = await fetch(API_BASE + '/api/quotations/' + activeId, { method: 'PUT', headers, body: JSON.stringify(body) });
    } else {
      res = await fetch(API_BASE + '/api/quotations', { method: 'POST', headers, body: JSON.stringify(body) });
    }

    try { data = await res.json(); } catch(e) { data = {}; }
    if (!res.ok) { setSS('Error: ' + (data.error || res.statusText)); return; }
    if (activeId === '__new__') {
      activeId = data.id;
      quotes.unshift({ id: data.id, name: _name, project: _proj, date: _date, status: _status, qno: _qno, addr: _addr, items: _data, terms: _terms, notes2: _notes, notes: _notesTxt });
    } else {
      const idx = quotes.findIndex(q => q.id === activeId);
      if (idx !== -1) quotes[idx] = { ...quotes[idx], name: _name, project: _proj, date: _date, status: _status, qno: _qno, addr: _addr, items: _data, terms: _terms, notes2: _notes, notes: _notesTxt };
    }
    isDirty = false;
    setSS('Saved ✓');
    renderList();
    clearDraft();
  } catch(e) { setSS('Network error'); }
}

// ─── DELETE ──────────────────────────────────────────────────────────────────
async function delQuote() {
  if (!activeId||activeId==='__new__') { alert('Nothing to delete'); return; }
  if (!confirm('Delete this quotation?')) return;
  const token = localStorage.getItem('token') || '';
  try {
    await fetch(API_BASE + '/api/quotations/' + activeId, {
      method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token }
    });
  } catch(e){}
  quotes = quotes.filter(q=>q.id!==activeId);
  activeId = null; isDirty = false;
  document.getElementById('welcome').style.display='block';
  document.getElementById('editor').style.display='none';
  renderList();
  setSS('Deleted');
}

// ─── PDF ─────────────────────────────────────────────────────────────────────
function openPDF() {
  setExportLoading(true);
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
      rows.push(`<tr class="sec-row"><td colspan="6" style="background:#e8f4f1;font-weight:700;color:#2d5a47;font-size:12px;padding:8px 12px">${esc(sec.section)}</td></tr>`);
    }
    (sec.items||[]).forEach(it => {
      if (!it.desc && !it.sell) return;
      itemNum++;
      const line = (parseFloat(it.sell)||0)*(parseFloat(it.qty)||0);
      secTotal += line;
      grandTotal += line;
      rows.push(`<tr>
        <td style="width:24px;color:var(--gray-400)">${itemNum}</td>
        <td>${esc(it.desc)||'—'}</td>
        <td style="width:60px;text-align:center">${esc(it.unit)}</td>
        <td style="width:40px;text-align:right">${it.qty||0}</td>
        <td style="width:80px;text-align:right">RM ${fmt(it.sell)}</td>
        <td style="width:90px;text-align:right;font-weight:600">RM ${fmt(line)}</td>
      </tr>`);
    });
    // Section subtotal row
    rows.push(`<tr class="sec-subtotal-row"><td colspan="5" style="text-align:right;font-weight:700;background:#f0faf7;color:#2d5a47;font-size:12px;padding:6px 12px">Section Total: RM ${fmt(secTotal)}</td><td style="text-align:right;font-weight:700;background:#f0faf7;color:#2d5a47;font-size:12px;padding:6px 12px">RM ${fmt(secTotal)}</td></tr>`);
  });
  const dateStr = _date ? new Date(_date+'T00:00:00').toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'}) : '';
  const termList = terms.length ? `<div class="qp-terms"><h4>Payment Terms</h4><ul>${terms.map(t=>`<li>${esc(t)}</li>`).join('')}</ul></div>` : '';
  const stdTerms = _notes.filter(t=>t.trim());
  const stdTermsList = stdTerms.length ? `<div class="qp-terms"><h4>Terms &amp; Conditions</h4><ol style="padding-left:18px;margin:0">${stdTerms.map(t=>`<li>${esc(t)}</li>`).join('')}</ol></div>` : '';
  // Use company settings from __acct or localStorage
  var _acct = window.__acct || {};
  var _cmpSettings = {};
  try { _cmpSettings = JSON.parse(localStorage.getItem('hsdesign_company') || '{}'); } catch(e) {}
  var _cmpName = _acct.company || _cmpSettings.company || 'Health Space Interior';
  var _cmpReg = _cmpSettings.reg || (_acct.name ? 'SSM: ' + _acct.name : 'HS Design (SSM: 202603001610)');
  var _cmpAddr = _cmpSettings.addr || '24-1, Jalan Rosmerah 2/17, Taman Johor Jaya\n81100 Johor Bahru, Johor';
  var _cmpPhone = _cmpSettings.phone || '011-1688 0145';
  var _cmpColor = _acct.color_hex || _cmpSettings.color_hex || '#5a9e8f';
  var _cmpLogo = _acct.logo_url || _cmpSettings.logo_url || '';
  var _cmpLogoHtml = _cmpLogo ? '<img src="' + esc(_cmpLogo) + '" style="max-height:50px;margin-bottom:8px">' : '';
  const html = `<div class="qp">
    <div class="qp-hdr">
      <div class="qp-logo">${_cmpLogoHtml}<h2 style="color:${_cmpColor}">${esc(_cmpName)}</h2><p>${esc(_cmpReg)}</p>${_cmpAddr.split('\n').map(function(l){return '<p>'+esc(l)+'</p>';}).join('')}<p>${esc(_cmpPhone)}</p></div>
      <div class="qp-ref"><h3>QUOTATION</h3><p><strong>Ref:</strong> ${esc(_qno)||'—'}</p><p><strong>Date:</strong> ${dateStr}</p><p><strong>Status:</strong> ${_status}</p></div>
    </div>
    <div class="qp-ci"><h4>Prepared For</h4><p>${esc(_name)}</p><span>${esc(_addr||_proj||'—')}</span></div>
    <table class="qp-table"><thead><tr><th style="width:24px">#</th><th>Description</th><th style="width:60px;text-align:center">Unit</th><th style="width:40px;text-align:right">Qty</th><th style="width:80px;text-align:right">Unit Price</th><th style="width:90px;text-align:right">Amount</th></tr></thead><tbody>${rows.join('')}</tbody></table>
    <div class="qp-totals"><div class="qp-tbox"><div class="qp-tr gd"><span>Grand Total</span><span>RM ${fmt(grandTotal)}</span></div></div></div>
    ${termList}
    ${stdTermsList}
    <div class="qp-footer">Thank you for considering Health Space Interior<br>This quotation is valid for 30 days from the date above.</div>
  </div>`;
  document.getElementById('pdfbody').innerHTML = html;
  document.getElementById('pdfmo').classList.add('open');
  setExportLoading(false);
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
  var _acct2 = window.__acct || {};
  var _cmpSet2 = {};
  try { _cmpSet2 = JSON.parse(localStorage.getItem('hsdesign_company') || '{}'); } catch(e) {}
  var _pdfColor = _acct2.color_hex || _cmpSet2.color_hex || '#5a9e8f';
  const content = document.getElementById('pdfbody').innerHTML;
  const win = window.open('','_blank');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Quotation</title><style>
    body{font-family:'Segoe UI',Arial,sans-serif;padding:32px;max-width:720px;margin:0 auto;color:#1a1a1a;font-size:13px}
    .qp-hdr{display:flex;justify-content:space-between;margin-bottom:24px}
    .qp-logo h2{font-size:18px;font-weight:700;color:${_pdfColor}}
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
document.getElementById('pass')?.focus();
