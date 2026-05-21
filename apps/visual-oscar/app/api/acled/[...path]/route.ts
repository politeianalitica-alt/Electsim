/**
 * /api/acled/[...path] · ACLED conflict event data.
 *
 * Server-side fetch a https://api.acleddata.com con credenciales en env.
 * Soporta dos métodos de auth (orden de preferencia):
 *
 *   1. API key directa · ACLED_API_KEY + ACLED_EMAIL (preferido)
 *      Se genera desde el portal ACLED · acleddata.com → Access Data →
 *      Generate API Key. Más estable, no expira.
 *
 *   2. OAuth password grant · ACLED_EMAIL + ACLED_PASSWORD (fallback)
 *      Login flow contra acleddata.com/oauth/token. Token Bearer.
 *      NB: requiere que la cuenta tenga el "API Access" habilitado;
 *      la password de login web a veces no funciona para OAuth.
 *
 * Rutas:
 *   GET /api/acled/spain-context
 *     → 30d eventos en países de relevancia geopolítica para España
 *       (Marruecos, Argelia, Mali, Senegal, Ucrania, Venezuela, etc.)
 *
 *   GET /api/acled/recent?country=ES&days=30&limit=50
 *     → Eventos recientes de un país concreto
 *
 *   GET /api/acled/by-country?days=90
 *     → Conteo agregado por país (top 20)
 *
 *   GET /api/acled/health
 *     → Diagnóstico · qué método de auth está disponible
 *
 * Cache HTTP 1h (datos cambian semanalmente).
 */
import { NextResponse } from 'next/server'

export const revalidate = 3600

const ACLED_API = 'https://api.acleddata.com/acled/read'
const ACLED_OAUTH = 'https://acleddata.com/oauth/token'

// Países alta-relevancia geopolítica para España (heredado de SPAIN_RELEVANCE)
const SPAIN_CONTEXT_COUNTRIES = [
  'Algeria', 'Morocco', 'Tunisia', 'Libya', 'Mauritania',
  'Mali', 'Niger', 'Burkina Faso', 'Senegal',
  'Ukraine', 'Russia', 'Belarus',
  'Venezuela', 'Colombia', 'Mexico', 'Cuba', 'Argentina',
  'Israel', 'Palestine', 'Lebanon', 'Syria',
  'Equatorial Guinea',
]

function quality(t: 'live' | 'cache' | 'missing' | 'rate_limited', name: string, note?: string) {
  return { source_type: t, source_name: name, ...(note ? { note } : {}) }
}

let _cachedToken: { token: string; expires_at: number } | null = null

async function getOAuthToken(): Promise<string | null> {
  // Cache de token in-memory (Vercel functions son reutilizables ~5min)
  if (_cachedToken && Date.now() < _cachedToken.expires_at) {
    return _cachedToken.token
  }
  const email = process.env.ACLED_EMAIL
  const password = process.env.ACLED_PASSWORD
  if (!email || !password) return null
  try {
    const body = new URLSearchParams({
      username: email,
      password: password,
      grant_type: 'password',
      client_id: 'acled',
    })
    const r = await fetch(ACLED_OAUTH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
    if (!r.ok) return null
    const j: any = await r.json()
    if (!j?.access_token) return null
    _cachedToken = {
      token: j.access_token,
      expires_at: Date.now() + (j.expires_in - 60) * 1000,
    }
    return j.access_token
  } catch {
    return null
  }
}

interface AcledAuth {
  method: 'api_key' | 'oauth' | 'none'
  url_extra?: Record<string, string>
  headers?: Record<string, string>
}

async function resolveAuth(): Promise<AcledAuth> {
  const apiKey = process.env.ACLED_API_KEY
  const email = process.env.ACLED_EMAIL
  if (apiKey && email) {
    return {
      method: 'api_key',
      url_extra: { email, key: apiKey },
    }
  }
  if (email && process.env.ACLED_PASSWORD) {
    const token = await getOAuthToken()
    if (token) {
      return {
        method: 'oauth',
        headers: { Authorization: `Bearer ${token}`, email },
      }
    }
  }
  return { method: 'none' }
}

async function acledRead(params: Record<string, string>): Promise<any> {
  const auth = await resolveAuth()
  if (auth.method === 'none') {
    return { error: 'no_credentials', _auth_status: 'none' }
  }
  const qs = new URLSearchParams({
    ...params,
    ...(auth.url_extra || {}),
    format: 'json',
  })
  try {
    const r = await fetch(`${ACLED_API}?${qs}`, {
      headers: auth.headers || {},
      next: { revalidate: 3600 },
    })
    if (!r.ok) return { error: `HTTP ${r.status}`, _auth_status: auth.method }
    return { ...(await r.json()), _auth_status: auth.method }
  } catch (e: any) {
    return { error: String(e?.message ?? e).slice(0, 160), _auth_status: auth.method }
  }
}

export async function GET(
  req: Request,
  { params }: { params: { path: string[] } },
) {
  const url = new URL(req.url)
  const segs = params.path || []
  const action = segs[0]

  // /api/acled/health
  if (action === 'health') {
    const auth = await resolveAuth()
    return NextResponse.json({
      ok: auth.method !== 'none',
      auth_method: auth.method,
      has_api_key: !!process.env.ACLED_API_KEY,
      has_email: !!process.env.ACLED_EMAIL,
      has_password: !!process.env.ACLED_PASSWORD,
      hint: auth.method === 'none'
        ? 'Configura ACLED_API_KEY (preferido) o pareja ACLED_EMAIL+ACLED_PASSWORD con cuenta API-enabled.'
        : null,
    })
  }

  // /api/acled/spain-context
  if (action === 'spain-context') {
    const days = parseInt(url.searchParams.get('days') || '30', 10)
    const limit = parseInt(url.searchParams.get('limit') || '100', 10)
    const since = new Date(Date.now() - days * 86400 * 1000).toISOString().slice(0, 10)
    const today = new Date().toISOString().slice(0, 10)
    const data = await acledRead({
      country: SPAIN_CONTEXT_COUNTRIES.join('|'),
      event_date: `${since}|${today}`,
      event_date_where: 'BETWEEN',
      limit: String(limit),
    })
    if (data.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'ACLED', data.error),
        items: [],
        auth_method: data._auth_status,
      })
    }
    const items = (data.data || []) as any[]
    // Agregar por país
    const byCountry: Record<string, { country: string; count: number; fatalities: number }> = {}
    for (const e of items) {
      const c = e.country || 'unknown'
      if (!byCountry[c]) byCountry[c] = { country: c, count: 0, fatalities: 0 }
      byCountry[c].count++
      byCountry[c].fatalities += Number(e.fatalities) || 0
    }
    const ranked = Object.values(byCountry).sort((a, b) => b.count - a.count)
    return NextResponse.json({
      ok: true,
      n_events: items.length,
      from: since,
      to: today,
      by_country: ranked,
      recent_events: items.slice(0, 20).map((e) => ({
        date: e.event_date,
        country: e.country,
        event_type: e.event_type,
        sub_event_type: e.sub_event_type,
        location: e.location,
        fatalities: Number(e.fatalities) || 0,
        notes: (e.notes || '').slice(0, 200),
      })),
      data_quality: quality('live', 'ACLED', `auth=${data._auth_status}, ${items.length} eventos ${days}d`),
    })
  }

  // /api/acled/recent?country=Spain
  if (action === 'recent') {
    const country = url.searchParams.get('country') || 'Spain'
    const days = parseInt(url.searchParams.get('days') || '30', 10)
    const limit = parseInt(url.searchParams.get('limit') || '50', 10)
    const since = new Date(Date.now() - days * 86400 * 1000).toISOString().slice(0, 10)
    const today = new Date().toISOString().slice(0, 10)
    const data = await acledRead({
      country,
      event_date: `${since}|${today}`,
      event_date_where: 'BETWEEN',
      limit: String(limit),
    })
    if (data.error) {
      return NextResponse.json({
        ok: false,
        country,
        data_quality: quality('missing', 'ACLED', data.error),
        items: [],
      })
    }
    return NextResponse.json({
      ok: true,
      country,
      from: since,
      to: today,
      n_items: (data.data || []).length,
      items: data.data || [],
      data_quality: quality('live', 'ACLED'),
    })
  }

  // /api/acled/by-country?days=90
  if (action === 'by-country') {
    const days = parseInt(url.searchParams.get('days') || '90', 10)
    const since = new Date(Date.now() - days * 86400 * 1000).toISOString().slice(0, 10)
    const today = new Date().toISOString().slice(0, 10)
    // Spain-context countries · limit alto para captura completa
    const data = await acledRead({
      country: SPAIN_CONTEXT_COUNTRIES.join('|'),
      event_date: `${since}|${today}`,
      event_date_where: 'BETWEEN',
      limit: '5000',
    })
    if (data.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'ACLED', data.error),
        items: [],
      })
    }
    const items = (data.data || []) as any[]
    const map: Record<string, { country: string; events: number; fatalities: number; latest: string }> = {}
    for (const e of items) {
      const c = e.country
      if (!map[c]) map[c] = { country: c, events: 0, fatalities: 0, latest: e.event_date }
      map[c].events++
      map[c].fatalities += Number(e.fatalities) || 0
      if (e.event_date > map[c].latest) map[c].latest = e.event_date
    }
    return NextResponse.json({
      ok: true,
      days,
      n_countries: Object.keys(map).length,
      n_events_total: items.length,
      countries: Object.values(map).sort((a, b) => b.events - a.events),
      data_quality: quality('live', 'ACLED'),
    })
  }

  return NextResponse.json({
    ok: false,
    available_endpoints: [
      'GET /api/acled/health',
      'GET /api/acled/spain-context?days=30',
      'GET /api/acled/recent?country=Spain&days=30',
      'GET /api/acled/by-country?days=90',
    ],
  }, { status: 404 })
}
