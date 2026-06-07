/**
 * /api/tercer-sector/oportunidades · AGREGADOR DE OPORTUNIDADES · cockpit
 * Tercer Sector · Sprint W1a.
 *
 * Fan-out EN PARALELO a:
 *   - BDNS convocatorias (subvenciones)         → tipo 'subvencion'
 *   - conectores de licitaciones multinivel      → 'licitacion' | 'grant_ue' |
 *     (`lib/tercer-sector/licitaciones/*`)          'cooperacion_internacional'
 *
 * Cada item se NORMALIZA al shape común `OportunidadTS`, se le aplica el scoring
 * de aptitud ONG (fuente ÚNICA: `oportunidades/scoring.ts`) y se calcula
 * `dias_restantes`. Después: filtros por query params, dedup por id, orden
 * (score↓ · días↑ · importe↓) y paginación.
 *
 * Query params (OportunidadesFiltros): tipo, ccaa, pais, sector, q, diasMax,
 * importeMin, importeMax, scoreMin, page, pageSize.
 *
 * Degradación honesta (CLAUDE.md): cada fuente reporta `ok`; las que caen van a
 * `fuentes_error` sin tumbar la respuesta. HTTP 200 AUN degradado. Sin importes
 * inventados (null si la fuente no lo da). Sin emojis.
 *
 * LEY VERCEL HOBBY: `maxDuration = 30` (config existente · NO crear una nueva).
 */
import { NextResponse } from 'next/server'
import type {
  OportunidadTS,
  OportunidadesResponse,
  TipoOportunidad,
} from '@/lib/tercer-sector/oportunidades/types'
import { scoreOportunidad, diasRestantes } from '@/lib/tercer-sector/oportunidades/scoring'
import { fetchConvocatorias, type BdnsConvocatoria } from '@/lib/tercer-sector/bdns'
import { ccaaKey } from '@/lib/tercer-sector/shared'
import type {
  FuenteLicitacion,
  LicitacionNormalizada,
  SourceResult,
} from '@/lib/tercer-sector/licitaciones/types'
import { fetchPlace } from '@/lib/tercer-sector/licitaciones/place'
import { fetchTed } from '@/lib/tercer-sector/licitaciones/ted'
import { fetchSedia } from '@/lib/tercer-sector/licitaciones/sedia'
import { fetchWorldbank } from '@/lib/tercer-sector/licitaciones/worldbank'
import { fetchBdns as fetchBdnsContratos } from '@/lib/tercer-sector/licitaciones/bdns'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

const BDNS_PUBLIC = 'https://www.infosubvenciones.es'

// ─────────────────────────────────────────────────────────────────────────
// Fuentes de licitaciones a agregar (subconjunto representativo y barato).
// Cada `fn` devuelve un SourceResult (nunca lanza). Mantenemos pocas fuentes en
// paralelo para no agotar los 30s; el endpoint /licitaciones cubre el resto.
// ─────────────────────────────────────────────────────────────────────────
type LicConnFn = (opts?: { timeoutMs?: number; noCache?: boolean }) => Promise<SourceResult>

const LIC_CONNECTORS: { fuente: FuenteLicitacion; fn: LicConnFn }[] = [
  { fuente: 'place', fn: fetchPlace as LicConnFn },
  { fuente: 'bdns', fn: fetchBdnsContratos as LicConnFn },
  { fuente: 'ted', fn: fetchTed as LicConnFn },
  { fuente: 'sedia', fn: fetchSedia as LicConnFn },
  { fuente: 'worldbank', fn: fetchWorldbank as LicConnFn },
]

const TIPOS: TipoOportunidad[] = [
  'subvencion',
  'licitacion',
  'grant_ue',
  'cooperacion_internacional',
  'convenio',
  'premio',
  'otro',
]

// ─────────────────────────────────────────────────────────────────────────
// Normalizadores PUROS · fuente → OportunidadTS (+scoring +dias_restantes)
// ─────────────────────────────────────────────────────────────────────────

/** Mapea el nivel/fuente de una licitación al tipo de oportunidad del cockpit. */
function tipoDesdeLicitacion(l: LicitacionNormalizada): TipoOportunidad {
  if (l.fuente === 'sedia') return 'grant_ue'
  if (l.nivel === 'org_internacional') return 'cooperacion_internacional'
  return 'licitacion'
}

/** Convocatoria BDNS → OportunidadTS (tipo 'subvencion'). */
function fromBdnsConvocatoria(c: BdnsConvocatoria, now: Date): OportunidadTS {
  const dias = diasRestantes(c.fecha, now)
  const sc = scoreOportunidad({
    titulo: c.titulo,
    cpv: null,
    tipo: 'subvencion',
    importe_eur: null, // la búsqueda de convocatorias no informa importe → no se inventa
    fecha_limite: c.fecha,
    documentos: null,
    moneda: 'EUR',
    idioma: 'es',
    now,
  })
  return {
    id: `bdns-conv:${c.id || c.numero || c.titulo.slice(0, 40)}`,
    tipo: 'subvencion',
    titulo: c.titulo,
    organismo: c.organo || c.territorio || c.nivel || 'Administración (BDNS)',
    fuente: 'bdns',
    fuente_url: BDNS_PUBLIC,
    url: c.numero
      ? `https://www.infosubvenciones.es/bdnstrans/GE/es/convocatoria/${encodeURIComponent(c.numero)}`
      : BDNS_PUBLIC,
    pais: 'España',
    region: c.territorio || null,
    ccaa: ccaaKey(c.territorio),
    fecha_publicacion: c.fecha,
    fecha_limite: null, // BDNS búsqueda no da plazo de presentación fiable → null
    dias_restantes: dias,
    importe_eur: null,
    moneda: 'EUR',
    sector_ts: null,
    cpv: null,
    dac_sector: null,
    beneficiarios_objetivo: [],
    requisitos_resumen: null,
    documentos: [],
    score_ong: sc.score,
    score_label: sc.label,
    razones_score: sc.razones,
    riesgo: sc.riesgo,
  }
}

/** Licitación normalizada → OportunidadTS (tipo según nivel/fuente). */
function fromLicitacion(l: LicitacionNormalizada, now: Date): OportunidadTS {
  const tipo = tipoDesdeLicitacion(l)
  const dias = diasRestantes(l.plazo, now)
  const sc = scoreOportunidad({
    titulo: l.titulo,
    cpv: l.cpv,
    tipo,
    importe_eur: l.valor_eur,
    fecha_limite: l.plazo,
    documentos: l.documentos,
    moneda: l.moneda,
    idioma: l.idioma,
    now,
  })
  return {
    id: `lic:${l.id}`,
    tipo,
    titulo: l.titulo,
    organismo: l.comprador || '—',
    fuente: l.fuente,
    fuente_url: l.url || '',
    url: l.url || '',
    pais: l.pais || '—',
    region: l.region,
    ccaa: l.nivel === 'ccaa' ? ccaaKey(l.region) : null,
    fecha_publicacion: l.fecha_pub,
    fecha_limite: l.plazo,
    dias_restantes: dias,
    importe_eur: l.valor_eur, // ya en EUR o null (no se inventa)
    moneda: l.moneda || 'EUR',
    sector_ts: null,
    cpv: l.cpv,
    dac_sector: null,
    beneficiarios_objetivo: [],
    requisitos_resumen: null,
    documentos: (l.documentos || []).map((d) => ({
      nombre: d.nombre,
      url: d.url,
      tipo: d.tipo,
      formato: d.formato,
    })),
    score_ong: sc.score,
    score_label: sc.label,
    razones_score: sc.razones,
    riesgo: sc.riesgo,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers de query params
// ─────────────────────────────────────────────────────────────────────────

function clampInt(v: string | null, def: number, min: number, max: number): number {
  const n = Number(v)
  if (!Number.isFinite(n)) return def
  return Math.max(min, Math.min(max, Math.trunc(n)))
}

function numOrNull(v: string | null): number | null {
  if (v == null || v.trim() === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export async function GET(req: Request) {
  const fetched_at = new Date().toISOString()
  const now = new Date()
  try {
    const sp = new URL(req.url).searchParams
    const tipo = (sp.get('tipo') as TipoOportunidad | null) || null
    const ccaaFiltro = ccaaKey(sp.get('ccaa'))
    const pais = (sp.get('pais') || '').trim().toLowerCase()
    const sector = (sp.get('sector') || '').trim().toLowerCase()
    const q = (sp.get('q') || '').trim().toLowerCase()
    const diasMax = numOrNull(sp.get('diasMax'))
    const importeMin = numOrNull(sp.get('importeMin'))
    const importeMax = numOrNull(sp.get('importeMax'))
    const scoreMin = numOrNull(sp.get('scoreMin'))
    const page = clampInt(sp.get('page'), 1, 1, 10000)
    const pageSize = clampInt(sp.get('pageSize'), 30, 1, 100)

    const fuentes_ok: string[] = []
    const fuentes_error: { fuente: string; error: string }[] = []
    const all: OportunidadTS[] = []

    // Fan-out paralelo: BDNS convocatorias + N conectores de licitaciones.
    const [bdnsRes, ...licResults] = await Promise.all([
      fetchConvocatorias({}).catch((e) => ({
        ok: false as const,
        data: null,
        error: String((e as Error)?.message ?? e),
        fetched_at,
        source_url: BDNS_PUBLIC,
      })),
      ...LIC_CONNECTORS.map((c) =>
        c.fn({}).catch(
          (e): SourceResult => ({
            fuente: c.fuente,
            ok: false,
            licitaciones: [],
            error: String((e as Error)?.message ?? e),
            fetched_at,
            source_url: '',
          }),
        ),
      ),
    ])

    // BDNS convocatorias → subvenciones.
    if (bdnsRes.ok && Array.isArray(bdnsRes.data)) {
      fuentes_ok.push('bdns-convocatorias')
      for (const c of bdnsRes.data) all.push(fromBdnsConvocatoria(c, now))
    } else {
      fuentes_error.push({
        fuente: 'bdns-convocatorias',
        error: ('error' in bdnsRes && bdnsRes.error) || 'error',
      })
    }

    // Licitaciones multinivel → licitacion / grant_ue / cooperacion_internacional.
    for (const r of licResults) {
      if (r.ok) {
        fuentes_ok.push(r.fuente)
        for (const l of r.licitaciones || []) all.push(fromLicitacion(l, now))
      } else {
        fuentes_error.push({ fuente: r.fuente, error: r.error || 'error' })
      }
    }

    // Dedup determinista por id (primero gana).
    const byId = new Map<string, OportunidadTS>()
    for (const o of all) {
      if (o && o.id && !byId.has(o.id)) byId.set(o.id, o)
    }
    const deduped = Array.from(byId.values())

    // Filtros (defensivos contra null).
    const filtered = deduped.filter((o) => {
      if (tipo && o.tipo !== tipo) return false
      if (ccaaFiltro && o.ccaa !== ccaaFiltro) return false
      if (pais && !(o.pais || '').toLowerCase().includes(pais)) return false
      if (sector && (o.sector_ts || '').toLowerCase() !== sector) return false
      if (q) {
        const hay = `${o.titulo || ''} ${o.organismo || ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (diasMax != null) {
        // Solo pasan las que tienen plazo dentro de la ventana [0, diasMax].
        if (o.dias_restantes == null) return false
        if (o.dias_restantes < 0 || o.dias_restantes > diasMax) return false
      }
      if (importeMin != null) {
        if (o.importe_eur == null || o.importe_eur < importeMin) return false
      }
      if (importeMax != null) {
        if (o.importe_eur == null || o.importe_eur > importeMax) return false
      }
      if (scoreMin != null && o.score_ong < scoreMin) return false
      return true
    })

    // Orden: score↓, luego días↑ (nulls al final), luego importe↓ (nulls al final).
    filtered.sort((a, b) => {
      if (b.score_ong !== a.score_ong) return b.score_ong - a.score_ong
      const da = a.dias_restantes == null ? Number.POSITIVE_INFINITY : a.dias_restantes
      const db = b.dias_restantes == null ? Number.POSITIVE_INFINITY : b.dias_restantes
      if (da !== db) return da - db
      const ia = a.importe_eur == null ? -1 : a.importe_eur
      const ib = b.importe_eur == null ? -1 : b.importe_eur
      return ib - ia
    })

    // Facetas sobre el conjunto filtrado (antes de paginar).
    const por_tipo: Record<string, number> = {}
    const por_fuente: Record<string, number> = {}
    for (const o of filtered) {
      por_tipo[o.tipo] = (por_tipo[o.tipo] || 0) + 1
      por_fuente[o.fuente] = (por_fuente[o.fuente] || 0) + 1
    }

    const total = filtered.length
    const start = (page - 1) * pageSize
    const pageItems = filtered.slice(start, start + pageSize)

    const data: OportunidadesResponse = {
      oportunidades: pageItems,
      total,
      page,
      page_size: pageSize,
      por_tipo,
      por_fuente,
      fuentes_ok,
      fuentes_error,
    }

    return NextResponse.json(
      {
        ok: true,
        data,
        error: null,
        fetched_at,
        source_url: 'https://www.infosubvenciones.es',
        _meta: {
          source: 'tercer-sector/oportunidades',
          source_label:
            'Agregador de oportunidades (BDNS subvenciones + licitaciones PLACE/BDNS/TED/SEDIA/WorldBank)',
          tipos_disponibles: TIPOS,
          fuentes_consultadas: ['bdns-convocatorias', ...LIC_CONNECTORS.map((c) => c.fuente)],
          scoring: 'oportunidades/scoring.ts (fuente única). Sin importes ni aptitud inventados.',
          orden: 'score↓ · dias_restantes↑ · importe↓',
          note:
            'Degradación honesta por fuente (fuentes_error). Importe null cuando la fuente no lo declara. ' +
            'Subvenciones BDNS no exponen importe/plazo de presentación fiables en la búsqueda → null.',
        },
      },
      { headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' } },
    )
  } catch (e: unknown) {
    // Fallo inesperado: aún 200, envelope honesto con data vacía.
    const data: OportunidadesResponse = {
      oportunidades: [],
      total: 0,
      page: 1,
      page_size: 30,
      por_tipo: {},
      por_fuente: {},
      fuentes_ok: [],
      fuentes_error: [],
    }
    return NextResponse.json(
      {
        ok: false,
        data,
        error: String((e as Error)?.message ?? e),
        fetched_at,
        source_url: 'https://www.infosubvenciones.es',
      },
      { status: 200 },
    )
  }
}
