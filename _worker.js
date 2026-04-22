export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // ── D1 API ────────────────────────────────────────────────────────────────
    if (pathname.startsWith('/d1-api')) {
      const d1 = env.DB;
      if (!d1) {
        return new Response(JSON.stringify({ object: 'error', message: 'D1 binding not found' }), {
          status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      const jsonHeaders = { 'Content-Type': 'application/json', ...corsHeaders };

      async function d1all(sql, params = []) {
        try {
          const r = await d1.prepare(sql).bind(...params).all();
          return { results: r.results || [] };
        } catch (e) {
          return { object: 'error', message: e.message };
        }
      }

      async function d1first(sql, params = []) {
        try {
          return await d1.prepare(sql).bind(...params).first();
        } catch (e) {
          return null;
        }
      }

      // POST /d1-api/v1/databases/{db}/query — list quotes
      const dbMatch = pathname.match(/^\/d1-api\/v1\/databases\/([^/]+)\/query$/);
      if (dbMatch && request.method === 'POST') {
        const body = await request.json().catch(() => ({}));
        const limit = Math.min(body.page_size || 50, 100);
        const offset = body.cursor ? parseInt(body.cursor) : 0;
        const sorts = body.sorts || [];
        let order = 'created_at DESC';
        if (sorts.length) {
          const s = sorts[0];
          if (s.property === 'Date') order = `date ${s.direction === 'ascending' ? 'ASC' : 'DESC'}`;
          else if (s.property === 'Name') order = `name ${s.direction === 'ascending' ? 'ASC' : 'DESC'}`;
        }
        const rows = await d1all(`SELECT id, name, project, date, status, data FROM quotes ORDER BY ${order} LIMIT ? OFFSET ?`, [limit, offset]);
        if (rows.object === 'error') {
          return new Response(JSON.stringify(rows), { status: 500, headers: jsonHeaders });
        }
        const countRow = await d1first(`SELECT COUNT(*) as cnt FROM quotes`);
        const total = countRow ? countRow.cnt : 0;
        const hasMore = offset + limit < total;
        const results = rows.results.map(r => {
          let items = [], terms = [], notes = '', notes2 = [], qno = '', addr = '';
          try { const j = JSON.parse(r.data || '{}'); items = j.items || []; terms = j.terms || []; notes = j.notes || ''; notes2 = j.notes2 || []; qno = j.qno || ''; addr = j.addr || ''; } catch (e) {}
          return {
            id: r.id, object: 'page',
            properties: {
              Name: { title: [{ plain_text: r.name || '' }] },
              Project: { rich_text: [{ plain_text: r.project || '' }] },
              Date: { date: { start: r.date || null } },
              Status: { status: { name: r.status || 'Draft' } },
              Notes: { rich_text: [{ plain_text: JSON.stringify({ items, terms, notes, notes2, qno, addr }) }] },
            }
          };
        });
        return new Response(JSON.stringify({ object: 'list', results, has_more: hasMore, next_cursor: hasMore ? String(offset + limit) : null }), { status: 200, headers: jsonHeaders });
      }

      // POST /d1-api/v1/pages — create quote
      if (pathname === '/d1-api/v1/pages' && request.method === 'POST') {
        const body = await request.json().catch(() => null);
        if (!body || !body.properties) {
          return new Response(JSON.stringify({ object: 'error', message: 'Invalid body' }), { status: 400, headers: jsonHeaders });
        }
        const props = body.properties;
        const name = props.Name?.title?.[0]?.plain_text || '';
        const project = props.Project?.rich_text?.[0]?.plain_text || '';
        const date = props.Date?.date?.start || '';
        const status = props.Status?.status?.name || 'Draft';
        const notesJson = props.Notes?.rich_text?.[0]?.plain_text || '{}';
        const id = crypto.randomUUID();
        const data = notesJson;
        await d1all(`INSERT INTO quotes (id, name, project, date, status, qno, addr, data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`, [id, name, project, date, status, '', '', data]);
        return new Response(JSON.stringify({ object: 'page', id, properties: props }), { status: 200, headers: jsonHeaders });
      }

      // PATCH /d1-api/v1/pages/{id} — update or archive
      const pageMatch = pathname.match(/^\/d1-api\/v1\/pages\/([^/]+)$/);
      if (pageMatch && request.method === 'PATCH') {
        const id = pageMatch[1];
        const body = await request.json().catch(() => null);
        if (!body) {
          return new Response(JSON.stringify({ object: 'error', message: 'Invalid body' }), { status: 400, headers: jsonHeaders });
        }
        // Archive = delete
        if (body.archived) {
          await d1all(`DELETE FROM quotes WHERE id = ?`, [id]);
          return new Response(JSON.stringify({ object: 'page', id, archived: true }), { status: 200, headers: jsonHeaders });
        }
        // Update properties
        if (body.properties) {
          const props = body.properties;
          const existing = await d1first(`SELECT data FROM quotes WHERE id = ?`, [id]);
          let items = [], terms = [], notes = '', notes2 = [], qno = '', addr = '';
          if (existing && existing.data) {
            try { const j = JSON.parse(existing.data); items = j.items || []; terms = j.terms || []; notes = j.notes || ''; notes2 = j.notes2 || []; qno = j.qno || ''; addr = j.addr || ''; } catch (e) {}
          }
          // Merge new Notes JSON if provided
          if (props.Notes?.rich_text?.[0]?.plain_text) {
            try { const j = JSON.parse(props.Notes.rich_text[0].plain_text); items = j.items || items; terms = j.terms || terms; notes = j.notes || notes; notes2 = j.notes2 || notes2; qno = j.qno || qno; addr = j.addr || addr; } catch (e) {}
          }
          const data = JSON.stringify({ items, terms, notes, notes2, qno, addr });
          const newName = props.Name?.title?.[0]?.plain_text;
          const newProject = props.Project?.rich_text?.[0]?.plain_text;
          const newDate = props.Date?.date?.start;
          const newStatus = props.Status?.status?.name;
          await d1all(`UPDATE quotes SET name=COALESCE(?,name), project=COALESCE(?,project), date=COALESCE(?,date), status=COALESCE(?,status), data=? WHERE id=?`, [newName, newProject, newDate, newStatus, data, id]);
          return new Response(JSON.stringify({ object: 'page', id, properties: props }), { status: 200, headers: jsonHeaders });
        }
      }

      return new Response(JSON.stringify({ object: 'error', message: 'Not found' }), { status: 404, headers: jsonHeaders });
    }

    // ── Notion proxy ─────────────────────────────────────────────────────────
    if (pathname.startsWith('/notion-proxy')) {
      const path = pathname.replace('/notion-proxy', '') || '/';
      const notionUrl = 'https://api.notion.com' + path;
      const NOTION_API_KEY = env.NOTION_API_KEY || 'ntn_22Ht5kGAX5roKKwnVDYZKe5mX6Lq';
      const method = request.method;
      const headers = {
        'Authorization': 'Bearer ' + NOTION_API_KEY,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      };

      if (method === 'OPTIONS') {
        return new Response(null, { status: 204, headers });
      }

      let body;
      if (['POST', 'PATCH', 'DELETE'].includes(method)) {
        body = await request.text();
      }

      try {
        const res = await fetch(notionUrl, { method, headers, body });
        const data = await res.json();
        return new Response(JSON.stringify(data), { status: res.status, headers });
      } catch (err) {
        return new Response(JSON.stringify({ object: 'error', message: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Serve static assets
    return env.ASSETS.fetch(request);
  }
};
