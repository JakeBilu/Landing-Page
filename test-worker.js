addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request, event.env));
});

async function handleRequest(request, env) {
  return new Response('Worker OK, CF_API_KEY=' + (env.CF_API_KEY ? 'SET' : 'UNSET'), { status: 200 });
}
