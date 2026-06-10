/**
 * /api/tercer-sector/licitaciones · Agregador de licitaciones MULTINIVEL.
 * Sprint Tercer Sector v3 · TS2-lic-src (route).
 *
 * Fan-out en paralelo a los conectores de `lib/tercer-sector/licitaciones/*`
 * (PLACE ATOM ES+CCAA, BDNS, TED UE, SEDIA grants UE, World Bank, UK OCDS,
 * Tenders.guru multi-país), normaliza al shape común, filtra, deduplica y
 * pagina. Cada conector NUNCA lanza: devuelve `SourceResult` con `ok` por fuente
 * (degradación honesta — fuentes_error nunca oculta una caída).
 *
 * Query params (LicitacionesFiltros): nivel, pais, cpv, q, desde, hasta, page, pageSize.
 * Filtros de analista (sobre el enriquecimiento): aptoOng (alta|media|baja|incierta),
 * diasMax, valorMin, valorMax, soloConDocs, soloAnalizable, sectorTs, compradorTipo.
 * Si `nivel` se especifica, solo se consultan los conectores capaces de ese nivel.
 *
 * Cada licitación se enriquece (categoria_ts, score_ong/label/razones, dias_restantes,
 * valor_bucket, comprador_tipo, riesgo_pliego) vía `enrichLicitacionTS` tras concatenar
 * y antes de filtrar/deduplicar. El scoring degrada honestamente si no está disponible.
 *
 * Respuesta (HTTP 200 aun degradado): LicitacionesResponse.
 * Cache: s-maxage=1800 (30 min · las licitaciones rotan despacio).
 */
import { NextResponse } from 'next/server'
import type {
  CompradorTipo,
  FuenteLicitacion,
  LicitacionNormalizada,
  LicitacionesResponse,
  NivelLicitacion,
  ScoreLabel,
  SourceResult,
} from '@/lib/tercer-sector/licitaciones/types'
import { enrichLicitacionTS, tieneDocAnalizable } from '@/lib/tercer-sector/licitaciones/enrich'
import { fetchPlace } from '@/lib/tercer-sector/licitaciones/place'
import { fetchBdns } from '@/lib/tercer-sector/licitaciones/bdns'
import { fetchTed } from '@/lib/tercer-sector/licitaciones/ted'
import { fetchSedia } from '@/lib/tercer-sector/licitaciones/sedia'
import { fetchWorldbank } from '@/lib/tercer-sector/licitaciones/worldbank'
import { fetchUkOcds } from '@/lib/tercer-sector/licitaciones/uk-ocds'
import { fetchTendersGuru } from '@/lib/tercer-sector/licitaciones/tendersguru'
import { fetchGrantsGov } from '@/lib/tercer-sector/licitaciones/grantsgov'
import { fetchProzorro } from '@/lib/tercer-sector/licitaciones/prozorro'
import { fetchAustender } from '@/lib/tercer-sector/licitaciones/austender'
import { fetchSecop } from '@/lib/tercer-sector/licitaciones/secop'
import { fetchDncp } from '@/lib/tercer-sector/licitaciones/dncp'
// TS6 · cobertura ES por CCAA (Socrata/Opendatasoft/API keyless) + ONU
import { fetchCatalunya } from '@/lib/tercer-sector/licitaciones/catalunya'
import { fetchCastillaLeon } from '@/lib/tercer-sector/licitaciones/castillaleon'
import { fetchEuskadi } from '@/lib/tercer-sector/licitaciones/euskadi'
import { fetchMadrid } from '@/lib/tercer-sector/licitaciones/madrid'
import { fetchAragon } from '@/lib/tercer-sector/licitaciones/aragon'
import { fetchUngm } from '@/lib/tercer-sector/licitaciones/ungm'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

type ConnFn = (opts?: { timeoutMs?: number; noCache?: boolean }) => Promise<SourceResult>

interface ConnectorDef {
  fuente: FuenteLicitacion
  fn: ConnFn
  niveles: NivelLicitacion[]
}

const CONNECTORS: ConnectorDef[] = [
  { fuente: 'place', fn: fetchPlace as ConnFn, niveles: ['ccaa', 'nacional_es'] },
  { fuente: 'bdns', fn: fetchBdns as ConnFn, niveles: ['nacional_es', 'ccaa'] },
  { fuente: 'ted', fn: fetchTed as ConnFn, niveles: ['ue'] },
  { fuente: 'sedia', fn: fetchSedia as ConnFn, niveles: ['ue'] },
  { fuente: 'worldbank', fn: fetchWorldbank as ConnFn, niveles: ['org_internacional'] },
  { fuente: 'uk-ocds', fn: fetchUkOcds as ConnFn, niveles: ['pais_extranjero'] },
  {
    fuente: 'tendersguru',
    fn: fetchTendersGuru as ConnFn,
    niveles: ['pais_extranjero', 'regional_extranjero'],
  },
  // ── Global Opportunity Graph (Gb) · conectores LIVE gratuitos nuevos ──
  { fuente: 'grantsgov', fn: fetchGrantsGov as ConnFn, niveles: ['pais_extranjero'] },
  { fuente: 'prozorro', fn: fetchProzorro as ConnFn, niveles: ['pais_extranjero'] },
  { fuente: 'austender', fn: fetchAustender as ConnFn, niveles: ['pais_extranjero'] },
  {
    fuente: 'secop',
    fn: fetchSecop as ConnFn,
    niveles: ['pais_extranjero', 'regional_extranjero'],
  },
  { fuente: 'dncp', fn: fetchDncp as ConnFn, niveles: ['pais_extranjero'] },
  // TS6 · CCAA España (open-data autonómico/municipal keyless) + ONU
  { fuente: 'catalunya', fn: fetchCatalunya as ConnFn, niveles: ['ccaa'] },
  { fuente: 'castillaleon', fn: fetchCastillaLeon as ConnFn, niveles: ['ccaa'] },
  { fuente: 'euskadi', fn: fetchEuskadi as ConnFn, niveles: ['ccaa'] },
  { fuente: 'madrid', fn: fetchMadrid as ConnFn, niveles: ['ccaa'] },
  { fuente: 'aragon', fn: fetchAragon as ConnFn, niveles: ['ccaa'] },
  { fuente: 'ungm', fn: fetchUngm as ConnFn, niveles: ['org_internacional'] },
]

const NIVELES: NivelLicitacion[] = [
  'ccaa',
  'nacional_es',
  'ue',
  'pais_extranjero',
  'regional_extranjero',
  'org_internacional',
]

function clampInt(v: string | null, def: number, min: number, max: number): number {
  const n = Number(v)
  if (!Number.isFinite(n)) return def
  return Math.max(min, Math.min(max, Math.trunc(n)))
}

/** Número finito o null (para filtros opcionales: importe / días). */
function numOrNull(v: string | null): number | null {
  if (v == null || v.trim() === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/** Flag booleano de query: '1'/'true'/'yes'/'on' → true. */
function boolFlag(v: string | null): boolean {
  if (!v) return false
  return ['1', 'true', 'yes', 'on'].includes(v.trim().toLowerCase())
}

const SCORE_LABELS: ScoreLabel[] = ['alta', 'media', 'baja', 'incierta']
const COMPRADOR_TIPOS: CompradorTipo[] = [
  'ayuntamiento',
  'ccaa',
  'age',
  'ue',
  'org_internacional',
  'otro',
]

export async function GET(req: Request) {
  const fetched_at = new Date().toISOString()
  try {
    const sp = new URL(req.url).searchParams
    const nivel = (sp.get('nivel') as NivelLicitacion | null) || null
    const pais = (sp.get('pais') || '').trim().toLowerCase()
    const cpv = (sp.get('cpv') || '').trim()
    const q = (sp.get('q') || '').trim().toLowerCase()
    const desde = (sp.get('desde') || '').trim()
    const hasta = (sp.get('hasta') || '').trim()
    const page = clampInt(sp.get('page'), 1, 1, 10000)
    const pageSize = clampInt(sp.get('pageSize'), 30, 1, 100)

    // Filtros de analista (sobre el enriquecimiento). Valores inválidos → ignorados.
    const aptoOngRaw = (sp.get('aptoOng') || '').trim().toLowerCase()
    const aptoOng = (SCORE_LABELS as string[]).includes(aptoOngRaw)
      ? (aptoOngRaw as ScoreLabel)
      : null
    const diasMax = numOrNull(sp.get('diasMax'))
    const valorMin = numOrNull(sp.get('valorMin'))
    const valorMax = numOrNull(sp.get('valorMax'))
    const soloConDocs = boolFlag(sp.get('soloConDocs'))
    const soloAnalizable = boolFlag(sp.get('soloAnalizable'))
    const sectorTs = (sp.get('sectorTs') || '').trim().toLowerCase()
    const compradorTipoRaw = (sp.get('compradorTipo') || '').trim().toLowerCase()
    const compradorTipo = (COMPRADOR_TIPOS as string[]).includes(compradorTipoRaw)
      ? (compradorTipoRaw as CompradorTipo)
      : null

    // Selección de conectores: si hay filtro de nivel, solo los que lo producen.
    const selected =
      nivel && NIVELES.includes(nivel)
        ? CONNECTORS.filter((c) => c.niveles.includes(nivel))
        : CONNECTORS

    const settled = await Promise.all(
      selected.map((c) =>
        c
          .fn({})
          .catch(
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
    )

    const fuentes_ok: FuenteLicitacion[] = []
    const fuentes_error: { fuente: FuenteLicitacion; error: string }[] = []
    let all: LicitacionNormalizada[] = []
    for (const r of settled) {
      if (r.ok) {
        fuentes_ok.push(r.fuente)
        all = all.concat(r.licitaciones || [])
      } else {
        fuentes_error.push({ fuente: r.fuente, error: r.error || 'error' })
      }
    }

    // Enriquecimiento de analista: categoría TS, score ONG, urgencia, tipo de
    // comprador, bucket de valor, riesgo de pliego. Se aplica a CADA licitación
    // tras concatenar y ANTES de filtrar/deduplicar (los filtros nuevos operan
    // sobre estos campos). El scoring degrada honestamente si no está disponible.
    const enriched = all.map((l) => enrichLicitacionTS(l))

    // Filtros (defensivos contra campos null).
    const filtered = enriched.filter((l) => {
      if (nivel && l.nivel !== nivel) return false
      if (pais && !(l.pais || '').toLowerCase().includes(pais)) return false
      if (cpv && !(l.cpv || '').startsWith(cpv)) return false
      if (q) {
        const hay = `${l.titulo || ''} ${l.comprador || ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      if (desde && (l.fecha_pub || '') < desde) return false
      if (hasta && l.fecha_pub && l.fecha_pub > `${hasta}T23:59:59Z`) return false

      // ── Filtros de analista (sobre el enriquecimiento) ──
      if (aptoOng && l.score_label !== aptoOng) return false
      if (compradorTipo && l.comprador_tipo !== compradorTipo) return false
      if (diasMax != null) {
        // Sin plazo conocido (null) no puede garantizar estar dentro del límite.
        if (l.dias_restantes == null || l.dias_restantes > diasMax) return false
      }
      if (valorMin != null) {
        if (l.valor_eur == null || l.valor_eur < valorMin) return false
      }
      if (valorMax != null) {
        if (l.valor_eur == null || l.valor_eur > valorMax) return false
      }
      if (soloConDocs && (l.documentos || []).length === 0) return false
      if (soloAnalizable && !tieneDocAnalizable(l)) return false
      if (sectorTs && !(l.categoria_ts || '').toLowerCase().includes(sectorTs)) return false
      return true
    })

    // Dedup determinista por id.
    const byId = new Map<string, LicitacionNormalizada>()
    for (const l of filtered) {
      if (l && l.id && !byId.has(l.id)) byId.set(l.id, l)
    }
    const deduped = [...byId.values()]

    // Orden por fecha de publicación desc (nulls al final).
    deduped.sort((a, b) => (b.fecha_pub || '').localeCompare(a.fecha_pub || ''))

    // Facetas (sobre el conjunto filtrado, antes de paginar).
    const por_nivel: Record<string, number> = {}
    const por_fuente: Record<string, number> = {}
    for (const l of deduped) {
      por_nivel[l.nivel] = (por_nivel[l.nivel] || 0) + 1
      por_fuente[l.fuente] = (por_fuente[l.fuente] || 0) + 1
    }

    const total = deduped.length
    const start = (page - 1) * pageSize
    const pageItems = deduped.slice(start, start + pageSize)

    const body: LicitacionesResponse = {
      licitaciones: pageItems,
      total,
      page,
      page_size: pageSize,
      por_nivel,
      por_fuente,
      fuentes_ok,
      fuentes_error,
      fetched_at,
    }

    return NextResponse.json(
      {
        ...body,
        _meta: {
          source: 'tercer-sector/licitaciones',
          source_label:
            'Agregador multinivel (PLACE/BDNS/TED/SEDIA/WorldBank/UK-OCDS/Tenders.guru/Grants.gov/Prozorro/AusTender/SECOP/DNCP)',
          niveles_disponibles: NIVELES,
          fuentes_consultadas: selected.map((c) => c.fuente),
          filtros_aceptados: [
            'nivel',
            'pais',
            'cpv',
            'q',
            'desde',
            'hasta',
            'page',
            'pageSize',
            'aptoOng',
            'diasMax',
            'valorMin',
            'valorMax',
            'soloConDocs',
            'soloAnalizable',
            'sectorTs',
            'compradorTipo',
          ],
          cache_ttl_seconds: 1800,
          note: 'CCAA → estatal → UE → otros países → regional extranjero → organizaciones internacionales. Degradación honesta por fuente (fuentes_error). Documentos de pliego en cada licitación; analizar con /api/tercer-sector/licitaciones/analizar.',
        },
      },
      { headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' } },
    )
  } catch (e: unknown) {
    return NextResponse.json(
      {
        licitaciones: [],
        total: 0,
        page: 1,
        page_size: 30,
        por_nivel: {},
        por_fuente: {},
        fuentes_ok: [],
        fuentes_error: [],
        fetched_at,
        error: String((e as Error)?.message ?? e),
      },
      { status: 200 },
    )
  }
}
