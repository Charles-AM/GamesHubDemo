export default async () => new Response(
  JSON.stringify({ error: 'Online accounts and multiplayer are being connected. Guest practice is available.' }),
  {
    status: 503,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  },
);
