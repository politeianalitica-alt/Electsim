/**
 * Adaptador para Tenders Electronic Daily (TED) — diario oficial de la UE
 * para licitaciones públicas europeas.
 *
 * API v3: https://api.ted.europa.eu/v3/notices/search (POST)
 * Filtramos a buyer-country=ESP para licitaciones publicadas por organismos
 * españoles en TED.
 */

import type { NormalizedContrato } from '@/lib/socrata-catalunya'

const ENDPOINT = 'https://api.ted.europa.eu/v3/notices/search'
const UA = 'Politeia-Analitica/1.0 (+https://politeia-analitica.vercel.app)'

interface TedNotice {
  'publication-number'?: string
  'title-of-procedure'?: { spa?: string; eng?: string; [k: string]: unknown }
  'buyer-name'?: Array<{ spa?: string; eng?: string; [k: string]: unknown }>
  'buyer-country'?: string[]
  'buyer-city'?: Array<{ spa?: string; eng?: string }>
  'contract-nature'?: string[]
  'classification-cpv'?: string[]
  'total-value'?: number | string
  'total-value-cur'?: string
  'publication-date'?: string
  'deadline-date-receipt-tender'?: string
  links?: { xml?: { MUL?: string }; pdf?: { ENG?: string; SPA?: string } }
}

function pickLang(o: unknown, langs = ['spa', 'eng']): string | undefined {
  if (!o) return undefined
  if (typeof o === 'string') return o
  if (Array.isArray(o)) return pickLang(o[0])
  if (typeof o === 'object') {
    for (const l of langs) {
      const v = (o as Record<string, unknown>)[l]
      if (typeof v === 'string') return v
    }
    const vals = Object.values(o as Record<string, unknown>)
    for (const v of vals) if (typeof v === 'string') return v
  }
  return undefined
}

function normalize(n: TedNotice): NormalizedContrato {
  const titulo = pickLang(n['title-of-procedure'])
  const buyer = pickLang(n['buyer-name'])
  const cpv = Array.isArray(n['classification-cpv']) ? n['classification-cpv'][0] : undefined
  const fecha = n['publication-date']?.slice(0, 10)
  const importeRaw = n['total-value']
  const importe = typeof importeRaw === 'number' ? importeRaw
    : typeof importeRaw === 'string' ? Number(importeRaw) : undefined
  return {
    id: `TED-${n['publication-number']}`,
    source_id: n['publication-number'],
    fuente: 'CATALUNYA_SOCRATA' as never,
    fuente_label: 'TED · Diario UE',
    expediente: n['publication-number'] || '',
    organo: buyer || '—',
    ambito: 'Europa',
    objeto: titulo || '—',
    tipo_contrato: Array.isArray(n['contract-nature']) ? n['contract-nature'][0] : undefined,
    cpv,
    cpv_div: cpv?.slice(0, 2),
    lugar_ejecucion: pickLang(n['buyer-city']),
    importe_licitacion: undefined,
    importe_adjudicacion: Number.isFinite(importe) ? importe : undefined,
    estado: 'Publicado',
    fecha_publicacion: fecha,
    anio: fecha ? Number(fecha.slice(0, 4)) : undefined,
    url: n.links?.pdf?.SPA || n.links?.pdf?.ENG || (n['publication-number'] ? `https://ted.europa.eu/es/notice/${n['publication-number']}` : undefined),
  }
}

export interface TedSearchParams {
  q?: string
  desde?: string                   // ISO YYYY-MM-DD
  hasta?: string
  cpv_div?: string
  organo?: string
  limit?: number
  page?: number
}

/**
 * Construye la query SoQL-like de TED. Filtramos a España siempre.
 *
 * Sintaxis TED v3:
 *   campo="valor"          (exacto)
 *   campo>=fecha           (rango)
 *   FT="texto"             (full text)
 *   AND/OR/NOT             (booleanos)
 *
 * Docs: https://docs.ted.europa.eu/api/index.html
 */
function buildQuery(p: TedSearchParams): string {
  const parts: string[] = ['buyer-country="ESP"']
  if (p.desde) parts.push(`publication-date>=${p.desde}`)
  if (p.hasta) parts.push(`publication-date<=${p.hasta}`)
  if (p.cpv_div) parts.push(`classification-cpv=${p.cpv_div}*`)
  if (p.q) parts.push(`FT="${p.q.replace(/"/g, '\\"')}"`)
  if (p.organo) parts.push(`buyer-name="${p.organo.replace(/"/g, '\\"')}"~`)
  return parts.join(' AND ')
}

export async function searchTed(
  p: TedSearchParams,
  timeoutMs = 8000,
): Promise<{ ok: boolean; items: NormalizedContrato[]; ms: number; error?: string }> {
  const t0 = Date.now()
  const limit = Math.min(100, Math.max(1, p.limit ?? 30))
  const page = Math.max(1, p.page ?? 1)

  const body = {
    query: buildQuery(p),
    fields: [
      'publication-number',
      'title-of-procedure',
      'buyer-name',
      'buyer-country',
      'buyer-city',
      'contract-nature',
      'classification-cpv',
      'total-value',
      'total-value-cur',
      'publication-date',
      'deadline-date-receipt-tender',
      'links',
    ],
    page,
    limit,
  }

  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'User-Agent': UA,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
      next: { revalidate: 600 },
    })
    clearTimeout(timer)
    if (!res.ok) return { ok: false, items: [], ms: Date.now() - t0, error: `HTTP ${res.status}` }
    const json = (await res.json()) as { notices?: TedNotice[]; totalNoticeCount?: number }
    const items = (json.notices || []).map(normalize).map(n => ({
      ...n,
      fuente: 'TED' as 'CATALUNYA_SOCRATA',
    }))
    return { ok: true, items, ms: Date.now() - t0 }
  } catch (e: unknown) {
    return { ok: false, items: [], ms: Date.now() - t0, error: e instanceof Error ? e.message : 'unknown' }
  }
}
