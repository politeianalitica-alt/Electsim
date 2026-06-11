// Relay de OpenSky en runtime EDGE.
//
// OpenSky Network descarta (timeout) el tráfico de los rangos AWS que usan las
// funciones Node de Vercel (verificado en iad1 y fra1). Las funciones EDGE de
// Vercel, en cambio, corren sobre la red de Cloudflare (otros rangos de IP), y
// desde ahí OpenSky sí responde. Este endpoint autentica con OAuth2
// (client_credentials → cupo ligado a la CUENTA, no a la IP) y devuelve
// /states/all crudo para que /api/osiris/flights (Node) lo consuma vía
// OPENSKY_RELAY_URL.
//
// Protegido con OPENSKY_RELAY_KEY (query ?key=) para que nadie ajeno malgaste el
// cupo de la cuenta. La clave nunca llega al navegador: vive en la env var
// OPENSKY_RELAY_URL que solo lee el servidor.
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

let tok: { token: string; exp: number } | null = null;

async function getToken(): Promise<string | null> {
  const id = process.env.OPENSKY_CLIENT_ID;
  const secret = process.env.OPENSKY_CLIENT_SECRET;
  if (!id || !secret) return null;
  if (tok && Date.now() < tok.exp) return tok.token;
  try {
    const r = await fetch(
      'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'client_credentials', client_id: id, client_secret: secret }),
      },
    );
    if (!r.ok) return null;
    const j: any = await r.json();
    if (!j.access_token) return null;
    tok = { token: j.access_token, exp: Date.now() + ((j.expires_in || 1800) - 60) * 1000 };
    return tok.token;
  } catch {
    return null;
  }
}

const json = (body: unknown, status = 200, cache?: string) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...(cache ? { 'cache-control': cache } : {}) },
  });

export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get('key');
  if (!process.env.OPENSKY_RELAY_KEY || key !== process.env.OPENSKY_RELAY_KEY) {
    return json({ error: 'unauthorized', states: [] }, 401);
  }
  try {
    const token = await getToken();
    const r = await fetch('https://opensky-network.org/api/states/all', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!r.ok) {
      return json({ error: `opensky_http_${r.status}`, states: [] }, 200, 's-maxage=20');
    }
    const data: any = await r.json();
    return json(
      { states: data.states || [], time: data.time, mode: token ? 'oauth' : 'anon', n: (data.states || []).length },
      200,
      'public, s-maxage=20, stale-while-revalidate=40',
    );
  } catch (e: any) {
    return json({ error: `relay_fail: ${e?.message || e}`, states: [] }, 200);
  }
}
