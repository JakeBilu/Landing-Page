addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request, event.env));
});

async function handleRequest(request, env) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Only handle /d1-api/* routes
  if (!pathname.startsWith('/d1-api')) {
    return new Response('Not Found', { status: 404 });
  }

  const path = pathname.replace('/d1-api', '') || '/';
  const method = request.method;

  // Test endpoint - check if CF_API_KEY is configured
  if (path === '/test') {
    return new Response(JSON.stringify({
      status: 'ok',
      cf_api_key_set: !!(env.CF_API_KEY),
      env_keys: Object.keys(env).filter(k => k.includes('CF') || k.includes('D1') || k.includes('DATABASE')),
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // CORS preflight
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-SQL-Queries',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      }
    });
  }

  if (!env.CF_API_KEY) {
    return new Response(JSON.stringify({ error: 'CF_API_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const accountId = 'f6b7326e471bbe3d1b0a0e2ba770f47d';
  const databaseId = '8d776216-e135-4c9f-b1bb-9669cb10bd85';
  const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;

  let requestBody = null;
  if (['POST', 'GET'].includes(method)) {
    try {
      requestBody = await request.json();
    } catch (e) {
      requestBody = null;
    }
  }

  // Build SQL query from body or URL param
  let sql = '';
  if (requestBody && requestBody.sql) {
    sql = requestBody.sql;
  } else if (method === 'GET' && url.searchParams.has('sql')) {
    sql = url.searchParams.get('sql');
  }

  if (!sql) {
    return new Response(JSON.stringify({
      error: 'No SQL query provided. Send {sql: "SELECT ..."} in body or ?sql= parameter.'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  try {
    const cfResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'X-Auth-Email': 'ida.czia@gmail.com',
        'X-Auth-Key': env.CF_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql }),
    });

    const data = await cfResponse.json();
    return new Response(JSON.stringify(data), {
      status: cfResponse.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
