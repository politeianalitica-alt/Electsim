// Relay de OpenSky en runtime EDGE.
//
// OpenSky Network descarta (timeout) el tráfico de los rangos AWS que usan las
// funciones Node de Vercel (verificado en iad1 y fra1). Este endpoint corre en
// runtime EDGE (otra red de salida) y autentica con OAuth2 (client_credentials →
// cupo ligado a la CUENTA) para devolver /states/all crudo a /api/osiris/flights
// (Node) vía OPENSKY_RELAY_URL.
//
// Protegido con OPENSKY_RELAY_KEY (?key=). Incluye diagnóstico granular en `dbg`
// para saber, desde producción, si el Edge alcanza OpenSky y en qué paso falla.
export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const AUTH_URL = 'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token';
const STATES_URL = 'https://opensky-network.org/api/states/all';

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

  const dbg: Record<string, unknown> = { creds: !!(process.env.OPENSKY_CLIENT_ID && process.env.OPENSKY_CLIENT_SECRET) };

  // 1) Token OAuth2 (best-effort: si falla, se intenta anónimo).
  let token: string | null = null;
  const id = process.env.OPENSKY_CLIENT_ID;
  const secret = process.env.OPENSKY_CLIENT_SECRET;
  if (id && secret) {
    const t0 = Date.now();
    try {
      const tr = await fetch(AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'client_credentials', client_id: id, client_secret: secret }),
        signal: AbortSignal.timeout(8000),
      });
      dbg.token_status = tr.status;
      dbg.token_ms = Date.now() - t0;
      if (tr.ok) {
        const j: any = await tr.json();
        token = j.access_token || null;
      } else {
        dbg.token_body = (await tr.text()).slice(0, 120);
      }
    } catch (e: any) {
      dbg.token_err = String(e?.name || e?.message || e);
      dbg.token_ms = Date.now() - t0;
    }
  }
  dbg.has_token = !!token;

  // 2) /states/all (con token si lo hay, anónimo si no).
  const t1 = Date.now();
  try {
    const sr = await fetch(STATES_URL, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal: AbortSignal.timeout(14000),
    });
    dbg.states_status = sr.status;
    dbg.states_ms = Date.now() - t1;
    if (sr.ok) {
      const data: any = await sr.json();
      const states = data.states || [];
      return json(
        { states, n: states.length, mode: token ? 'oauth' : 'anon', dbg },
        200,
        'public, s-maxage=20, stale-while-revalidate=40',
      );
    }
    return json({ states: [], error: `opensky_http_${sr.status}`, dbg }, 200);
  } catch (e: any) {
    dbg.states_err = String(e?.name || e?.message || e);
    dbg.states_ms = Date.now() - t1;
    return json({ states: [], error: 'states_fail', dbg }, 200);
  }
}
