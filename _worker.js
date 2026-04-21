export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Notion proxy: route /notion-proxy/* to Notion API
    if (pathname.startsWith('/notion-proxy')) {
      const path = pathname.replace('/notion-proxy', '') || '\/';
      const notionUrl = 'https://api.notion.com' + path;
      const NOTION_API_KEY = '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';
      const method = request.method;
      const headers = {
        'Authorization': 'Bearer ' + NOTION_API_KEY,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application\/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      };

      if (method === 'OPTIONS') {
        return new Response(null, { status: 204, headers });
      }

      let body;
      if ([ 'POST', 'PATCH', 'DELETE' ].includes(method)) {
        body = await request.text();
      }

      try {
        const res = await fetch(notionUrl, { method, headers, body });
        const data = await res.json();
        return new Response(JSON.stringify(data), { status: res.status, headers });
      } catch (err) {
        return new Response(JSON.stringify({ object: 'error', message: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application\/json' },
        });
      }
    }

    // Serve static assets
    return env.ASSETS.fetch(request);
  }
};
