export async function onRequest(context) {
  return new Response(JSON.stringify({
    method: context.request.method,
    url: context.request.url,
    ok: true
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
