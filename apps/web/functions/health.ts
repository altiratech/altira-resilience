interface Env {
  API_ORIGIN?: string;
}

export const onRequest: PagesFunction<Env> = async ({ env }) => {
  const apiOrigin = env.API_ORIGIN?.trim();
  if (!apiOrigin) {
    return Response.json({ error: 'Preview API origin is not configured.' }, { status: 500 });
  }

  return fetch(new URL('/health', apiOrigin).toString(), {
    headers: {
      'x-forwarded-proto': 'https',
    },
  });
};
