// Netlify Function: notion-proxy
// Proxies Notion API calls to avoid CORS. API key is set as Netlify env variable.
// Browser only calls this proxy — key never exposed to client.
exports.handler = async (event) => {
  const API_KEY = process.env.NOTION_API_KEY;
  const HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
      body: JSON.stringify({ object: 'error', message: 'NOTION_API_KEY environment variable not set' })
    };
  }

  // Remove leading /v1 from path since we append it
  const path = event.path.replace('/.netlify/functions/notion-proxy', '') || event.path;
  const notionUrl = 'https://api.notion.com/v1' + path;

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
