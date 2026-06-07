/**
 * /api/tercer-sector/global-opportunities · GLOBAL OPPORTUNITY GRAPH · Tercer
 * Sector cockpit · Sprint Ga (route).
 *
 * Sirve el CATÁLOGO CURADO de fuentes de licitaciones/subvenciones/convocatorias
 * del tercer sector a escala mundial (`lib/tercer-sector/global-opportunities/
 * sources.ts`) con vistas derivadas (prioritarias, por método de acceso, por
 * nivel, grants vs tenders) + facetas. Es ESTÁTICO (metadata curada en código,
 * sin red), por lo que NO declara `maxDuration` → config serverless `{}`
 * (LEY VERCEL HOBBY del spec: no crear una config nueva).
 *
 * Filtros opcionales (query): level, geography, status, priority, q.
 *
 * Envelope Politeia: { ok, data:{...}, fetched_at, source_url, _meta }.
 * Cero emojis.
 */
import { NextResponse } from 'next/server'

import { SOURCES, SOURCES_COUNT } from '@/lib/tercer-sector/global-opportunities/sources'
import type {
  GlobalSourcesResponse,
  ImplementationPriority,
  IntegrationStatus,
  OpportunitySource,
  SourceLevel,
} from '@/lib/tercer-sector/global-opportunities/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
// NOTA: SIN `export const maxDuration` a propósito → config `{}` (estático).

const SOURCE_URL =
  'https://iatistandard.org/en/using-data/iati-tools-and-resources/iati-datastore/'

/** Niveles considerados "internacionales" (organismo ONU / banco multilateral). */
const INTERNATIONAL_LEVELS: SourceLevel[] = ['international_org', 'mdb']

/** Tipos de oportunidad que cuentan como "grant" (subvención/convocatoria). */
const GRANT_KINDS = new Set(['grant', 'call_for_proposal'])

/** Tipos de oportunidad que cuentan como "tender" (contrato público). */
const TENDER_KINDS = new Set([
  'tender',
  'request_for_proposal',
  'request_for_quotation',
  'invitation_to_bid',
  'framework_agreement',
  'expression_of_interest',
])

const VALID_LEVELS = new Set<SourceLevel>([
  'international_org',
  'mdb',
  'eu',
  'national',
  'regional',
  'local',
])
const VALID_STATUS = new Set<IntegrationStatus>(['live', 'catalog', 'planned'])
const VALID_PRIORITY = new Set<ImplementationPriority>(['P0', 'P1', 'P2', 'P3'])

export async function GET(req: Request) {
  const fetched_at = new Date().toISOString()
  try {
    const sp = new URL(req.url).searchParams

    const levelRaw = (sp.get('level') || '').trim()
    const level = VALID_LEVELS.has(levelRaw as SourceLevel)
      ? (levelRaw as SourceLevel)
      : null
    const geography = (sp.get('geography') || '').trim().toLowerCase()
    const statusRaw = (sp.get('status') || '').trim()
    const status = VALID_STATUS.has(statusRaw as IntegrationStatus)
      ? (statusRaw as IntegrationStatus)
      : null
    const priorityRaw = (sp.get('priority') || '').trim().toUpperCase()
    const priority = VALID_PRIORITY.has(priorityRaw as ImplementationPriority)
      ? (priorityRaw as ImplementationPriority)
      : null
    const q = (sp.get('q') || '').trim().toLowerCase()

    // ── Filtro principal ─────────────────────────────────────────────────
    const sources: OpportunitySource[] = SOURCES.filter((s) => {
      if (level && !s.levels.includes(level)) return false
      if (status && s.integration_status !== status) return false
      if (priority && s.implementation_priority !== priority) return false
      if (geography) {
        const hit = s.geography.some((g) => g.toLowerCase() === geography)
        if (!hit) return false
      }
      if (q) {
        const hay = `${s.id} ${s.label} ${s.notes}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })

    // ── Vistas derivadas (sobre el conjunto filtrado) ────────────────────
    const priority_sources = sources.filter(
      (s) => s.implementation_priority === 'P0' || s.implementation_priority === 'P1',
    )
    const api_sources = sources.filter(
      (s) => s.access_method === 'api' || s.access_method === 'ocds',
    )
    const scrape_sources = sources.filter((s) => s.access_method === 'html_scrape')
    const grant_sources = sources.filter((s) =>
      s.opportunity_types.some((k) => GRANT_KINDS.has(k)),
    )
    const tender_sources = sources.filter((s) =>
      s.opportunity_types.some((k) => TENDER_KINDS.has(k)),
    )
    const international_sources = sources.filter((s) =>
      s.levels.some((l) => INTERNATIONAL_LEVELS.includes(l)),
    )
    const national_sources = sources.filter((s) => s.levels.includes('national'))
    const regional_sources = sources.filter(
      (s) => s.levels.includes('regional') || s.levels.includes('local'),
    )

    // ── Conteos ──────────────────────────────────────────────────────────
    const por_status: Record<IntegrationStatus, number> = {
      live: 0,
      catalog: 0,
      planned: 0,
    }
    const por_pais_cobertura: Record<string, number> = {}
    for (const s of sources) {
      por_status[s.integration_status] += 1
      for (const g of s.geography) {
        por_pais_cobertura[g] = (por_pais_cobertura[g] ?? 0) + 1
      }
    }

    const data: GlobalSourcesResponse = {
      sources,
      priority_sources,
      api_sources,
      scrape_sources,
      grant_sources,
      tender_sources,
      international_sources,
      national_sources,
      regional_sources,
      total: sources.length,
      por_status,
      por_pais_cobertura,
    }

    return NextResponse.json(
      {
        ok: true,
        data,
        fetched_at,
        source_url: SOURCE_URL,
        _meta: {
          source: 'tercer-sector/global-opportunities',
          catalog_total: SOURCES_COUNT,
          cache_ttl_seconds: 86400,
          note:
            'Catálogo curado de conectores (Opportunity Graph). NO hace scraping: es metadata por fuente. Estático: sin maxDuration (LEY VERCEL HOBBY). integration_status=live → conector ya activo en nuestro agregador.',
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=172800',
        },
      },
    )
  } catch (e: unknown) {
    return NextResponse.json(
      {
        ok: false,
        data: null,
        error: String((e as Error)?.message ?? e),
        fetched_at,
        source_url: SOURCE_URL,
      },
      { status: 200 },
    )
  }
}
