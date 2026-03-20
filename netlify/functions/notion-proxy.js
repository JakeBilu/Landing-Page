// Netlify Function: notion-proxy
// Proxies Notion API calls to avoid CORS. API key set as Netlify env variable.
exports.handler = async (event) => {
  const API_KEY = process.env.NOTION_API_KEY;
  const HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: HEADERS, body: '' };
  }

  if (!API_KEY) {
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({ object: 'error', message: 'NOTION_API_KEY not set in Netlify env' })
    };
  }

  // Netlify passes path as e.g. "/v1/databases/xxx/query"
  // The full path we want to forward is exactly event.path
  const notionUrl = 'https://api.notion.com' + event.path;

  try {
    const res = await fetch(notionUrl, {
      method: event.httpMethod,
      headers: {
        'Authorization': 'Bearer ' + API_KEY,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: ['POST', 'PATCH'].includes(event.httpMethod) ? event.body : undefined
    });

    const data = await res.json();
    return {
      statusCode: res.status,
      headers: HEADERS,
      body: JSON.stringify(data)
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: HEADERS,
      body: JSON.stringify({ object: 'error', message: err.message })
    };
  }
};
