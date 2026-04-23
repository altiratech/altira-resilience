interface Env {
  API_ORIGIN?: string;
}

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  const apiOrigin = env.API_ORIGIN?.trim();
  if (!apiOrigin) {
    return Response.json({ error: 'Preview API origin is not configured.' }, { status: 500 });
  }

  const incomingUrl = new URL(request.url);
  const targetUrl = new URL(`${incomingUrl.pathname}${incomingUrl.search}`, apiOrigin);
  const headers = new Headers(request.headers);

  headers.delete('host');
  headers.set('x-forwarded-proto', incomingUrl.protocol.replace(':', ''));

  const response = await fetch(targetUrl.toString(), {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
    redirect: 'manual',
  });

  const proxiedHeaders = new Headers(response.headers);
  proxiedHeaders.delete('access-control-allow-origin');
  proxiedHeaders.delete('access-control-allow-credentials');
  proxiedHeaders.delete('access-control-allow-headers');
  proxiedHeaders.delete('access-control-allow-methods');
  proxiedHeaders.delete('access-control-expose-headers');
  proxiedHeaders.delete('vary');

  return new Response(response.body, {
    status: response.status,
    headers: proxiedHeaders,
  });
};
