/**
 * /api/medios/dsa-transparency · DSA Transparency Database (Research API · CE)
 *
 * Inteligencia de moderación de contenido de plataformas online a partir de la
 * base de "statements of reasons" del Digital Services Act: cada acción de
 * moderación (retirada / restricción de visibilidad / suspensión de cuenta /
 * desmonetización) que las plataformas reportan a la Comisión Europea, por
 * plataforma, categoría de infracción y ámbito territorial.
 *
 * Query:
 *   ?view=overview    (default) → KPIs: total del día + total histórico +
 *                                 nº plataformas + statements con alcance ES.
 *   ?view=platforms   → top plataformas por volumen de moderación del día.
 *   ?view=categories  → desglose por categoría DSA del día (foco político).
 *   ?view=spain       → statements con territorial_scope = ES (histórico, o del
 *                       día si se pasa &date).
 *   &date=YYYY-MM-DD  → día a consultar (default: hoy-2, ya consolidado).
 *
 * Respuesta (patrón Politeia · HTTP 200 incluso si degrada):
 *   { ok, data, fetched_at, source_url, _meta }
 * o ante key ausente / fallo: { ok:false, error, fetched_at, source_url, _meta }
 *
 * Cache: s-maxage=43200 (12h · el dato es diario).
 * Auth: requiere DSA_TRANSPARENCY_API_KEY (server-side, Vercel env). Sin ella
 * degrada con ok:false (no expone el secreto · ver lib/medios/dsa-transparency).
 *
 * Docs: https://transparency.dsa.ec.europa.eu/page/research-api
 */
import { NextResponse } from 'next/server'
import {
  fetchDsaPlatforms,
  fetchDsaDailyTotal,
  fetchDsaTotalHistoric,
  fetchDsaByPlatform,
  fetchDsaByCategory,
  fetchDsaSpain,
  safeDate,
} from '@/lib/medios/dsa-transparency'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=43200, stale-while-revalidate=86400',
}

const META = {
  source: 'dsa_transparency',
  source_label: 'DSA Transparency Database · Comisión Europea',
  env_hint: 'DSA_TRANSPARENCY_API_KEY',
  docs_url: 'https://transparency.dsa.ec.europa.eu/page/research-api',
  cache_ttl_seconds: 43200,
  note:
    'Statements of reasons del Digital Services Act · acciones de moderación de ' +
    'contenido por plataforma, categoría y territorio. ~2.100M registros, ~23M/día.',
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const view = (searchParams.get('view') || 'overview').toLowerCase()
  const dateParam = searchParams.get('date')
  const date = safeDate(dateParam) // saneado · default hoy-2

  try {
    if (view === 'platforms') {
      const res = await fetchDsaByPlatform(date)
      return NextResponse.json(
        { ...res, view, date, _meta: META },
        { headers: CACHE_HEADERS },
      )
    }

    if (view === 'categories') {
      const res = await fetchDsaByCategory(date)
      return NextResponse.json(
        { ...res, view, date, _meta: META },
        { headers: CACHE_HEADERS },
      )
    }

    if (view === 'spain') {
      // Sin &date → histórico ES; con &date → ese día.
      const res = await fetchDsaSpain(dateParam ?? undefined)
      return NextResponse.json(
        { ...res, view, date: dateParam ? date : null, scope: 'ES', _meta: META },
        { headers: CACHE_HEADERS },
      )
    }

    // ── overview (default) · KPIs en paralelo, cada uno degrada por su cuenta ─
    const [daily, historic, platforms, spain] = await Promise.all([
      fetchDsaDailyTotal(date),
      fetchDsaTotalHistoric(),
      fetchDsaPlatforms(),
      fetchDsaSpain(), // histórico ES
    ])

    // ok del overview = al menos una métrica disponible (degradación parcial OK).
    const anyOk = daily.ok || historic.ok || platforms.ok || spain.ok
    const fetched_at = daily.fetched_at

    return NextResponse.json(
      {
        ok: anyOk,
        view: 'overview',
        date,
        data: {
          daily_total: daily.ok ? daily.data!.total : null,
          daily_date: daily.ok ? daily.data!.date : date,
          total_historic: historic.ok ? historic.data! : null,
          n_platforms: platforms.ok ? platforms.data!.length : null,
          n_vlops: platforms.ok ? platforms.data!.filter((p) => p.vlop).length : null,
          spain_total: spain.ok ? spain.data! : null,
        },
        errors: {
          daily: daily.ok ? null : daily.error,
          historic: historic.ok ? null : historic.error,
          platforms: platforms.ok ? null : platforms.error,
          spain: spain.ok ? null : spain.error,
        },
        fetched_at,
        source_url: daily.source_url,
        _meta: META,
      },
      { headers: CACHE_HEADERS },
    )
  } catch (e: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: String((e as Error)?.message ?? e).slice(0, 200),
        fetched_at: new Date().toISOString(),
        source_url: 'https://transparency.dsa.ec.europa.eu',
        _meta: META,
      },
      { headers: CACHE_HEADERS },
    )
  }
}
