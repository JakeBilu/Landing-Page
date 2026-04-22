export async function onRequest(context) {
  const url = new URL(context.request.url);
  const path = url.pathname.replace(/^\/d1-api/, '') || '/';
  const method = context.request.method;
  const DB = context.env.DB; // D1 database binding

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  };

  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  // Helper: build Notion-style page object from quote row
  function toNotionPage(row) {
    let data = {};
    try { data = JSON.parse(row.data || '{}'); } catch(e) {}
    return {
      id: row.id,
      properties: {
        Name: { type: 'title', title: [{ plain_text: row.name || '' }] },
        Project: { type: 'rich_text', rich_text: [{ plain_text: row.project || '' }] },
        Date: { type: 'date', date: { start: row.date || '' } },
        Status: { type: 'status', status: { name: row.status || 'Draft' } },
        Notes: { type: 'rich_text', rich_text: [{ plain_text: JSON.stringify(data) }] },
      }
    };
  }

  // GET /v1/databases/{db}/query  →  list all quotes
  let m;
  if ((m = path.match('^/v1/databases/([^/]+)/query$')) && method === 'GET') {
    const { results } = await DB.prepare(
      'SELECT id, name, project, date, status, qno, addr, data FROM quotes ORDER BY date DESC LIMIT 50'
    ).all();
    return new Response(JSON.stringify({ object: 'list', results: results.map(toNotionPage) }), { headers });
  }

  // POST /v1/pages  →  create new quote
  if (path === '/v1/pages' && method === 'POST') {
    let body = {};
    try { body = await context.request.json(); } catch(e) {}
    const props = body.properties || {};
    const name = props.Name?.title?.[0]?.plain_text || 'Untitled';
    const project = props.Project?.rich_text?.[0]?.plain_text || '';
    const date = props.Date?.date?.start || '';
    const status = props.Status?.status?.name || 'Draft';
    const notesJson = props.Notes?.rich_text?.[0]?.plain_text || '{}';
    const id = crypto.randomUUID();
    await DB.prepare(
      'INSERT INTO quotes (id, name, project, date, status, data) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(id, name, project, date, status, notesJson).run();
    const row = await DB.prepare('SELECT * FROM quotes WHERE id = ?').bind(id).first();
    return new Response(JSON.stringify(toNotionPage(row)), { headers: { ...headers, 'Content-Type': 'application/json' }, status: 200 });
  }

  // PATCH /v1/pages/{id}  →  update quote
  if ((m = path.match('^/v1/pages/([^/]+)$')) && method === 'PATCH') {
    const id = m[1];
    let body = {};
    try { body = await context.request.json(); } catch(e) {}
    const props = body.properties || {};
    const name = props.Name?.title?.[0]?.plain_text;
    const project = props.Project?.rich_text?.[0]?.plain_text;
    const date = props.Date?.date?.start;
    const status = props.Status?.status?.name;
    const notesJson = props.Notes?.rich_text?.[0]?.plain_text;

    const fields = [], vals = [];
    if (name !== undefined) { fields.push('name=?'); vals.push(name); }
    if (project !== undefined) { fields.push('project=?'); vals.push(project); }
    if (date !== undefined) { fields.push('date=?'); vals.push(date); }
    if (status !== undefined) { fields.push('status=?'); vals.push(status); }
    if (notesJson !== undefined) { fields.push('data=?'); vals.push(notesJson); }
    if (fields.length === 0) {
      return new Response(JSON.stringify({ object: 'error', message: 'No fields to update' }), { status: 400, headers });
    }
    vals.push(id);
    await DB.prepare('UPDATE quotes SET ' + fields.join(', ') + ' WHERE id = ?').bind(...vals).run();
    const row = await DB.prepare('SELECT * FROM quotes WHERE id = ?').bind(id).first();
    return new Response(JSON.stringify(toNotionPage(row)), { headers: { ...headers, 'Content-Type': 'application/json' } });
  }

  // DELETE /v1/pages/{id}  →  delete quote
  if ((m = path.match('^/v1/pages/([^/]+)$')) && method === 'DELETE') {
    const id = m[1];
    await DB.prepare('DELETE FROM quotes WHERE id = ?').bind(id).run();
    return new Response(JSON.stringify({ object: 'page', id, archived: true }), { headers });
  }

  return new Response(JSON.stringify({ object: 'error', message: 'Not found: ' + method + ' ' + path }), { status: 404, headers });
}
