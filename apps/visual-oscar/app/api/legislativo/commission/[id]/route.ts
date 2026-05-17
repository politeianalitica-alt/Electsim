/**
 * /api/legislativo/commission/[id] — Detalle ENRIQUECIDO de una comisión.
 *
 * Combina datos en paralelo según el tipo de comisión:
 *
 *   CONGRESO/MIXTA:
 *     - Composición REAL via AJAX endpoint /es/organos/composicion-en-la-legislatura
 *     - Próximas sesiones via /es/actualidad/sesiones-de-comisiones (jsonObject)
 *     - Comparecientes via dataset IntervencionesCronologicamente__*.json
 *     - Sesiones pasadas con comparecientes
 *
 *   SENADO:
 *     - Composición REAL via scraping HTML /web/actividadparlamentaria/...
 *
 *   AUTONÓMICA (Cataluña, País Vasco, Andalucía, Valenciana, Galicia):
 *     - Composición real via scraping específico por CCAA
 */

import { NextRequest, NextResponse } from 'next/server'
import { findCommission } from '@/lib/legislative/aggregator'
import {
  fetchCommissionComposition as fetchCongresoComposition,
  inferOrganoSup,
  groupInfo as congresoGroupInfo,
} from '@/lib/legislative/congreso'
import { fetchSenadoCommissionComposition, senadoGroupInfo } from '@/lib/legislative/senado-commissions'
import { fetchCCAAComposition } from '@/lib/legislative/ccaa-commissions'
import {
  fetchCommissionComparecientes,
  fetchCommissionSessions,
  fetchScheduledSessions,
} from '@/lib/legislative/interventions'
import { withMeta } from '@/lib/backend'
import type { CCAA } from '@/lib/legislative/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = decodeURIComponent(params.id)
    const c = await findCommission(id)
    if (!c) return NextResponse.json(withMeta({ error: 'not_found' }, 'error'), { status: 404 })

    const includeInterventions = req.nextUrl.searchParams.get('interventions') !== 'false'

    // CONGRESO / MIXTA
    if (c.camara === 'congreso' || c.camara === 'mixta') {
      const organoSup = inferOrganoSup(c)
      const [composition, schedule, comparecientes, sessions] = await Promise.all([
        fetchCongresoComposition(c.codigo, organoSup),
        fetchScheduledSessions(c.codigo),
        includeInterventions ? fetchCommissionComparecientes(c.nombre) : Promise.resolve([]),
        includeInterventions ? fetchCommissionSessions(c.nombre) : Promise.resolve([]),
      ])

      const groupSummary = composition
        ? Object.entries(composition.byGroup).map(([siglas, n]) => ({
            siglas, ...congresoGroupInfo(siglas), n,
          })).sort((a, b) => b.n - a.n)
        : []

      return NextResponse.json(withMeta({
        commission: c,
        composition,
        groupSummary,
        scheduledSessions: schedule,
        comparecientes,
        recentSessions: sessions.slice(0, 20),
        sessionsCount: sessions.length,
      }, 'live'))
    }

    // SENADO
    if (c.camara === 'senado') {
      const composition = await fetchSenadoCommissionComposition(c.codigo, false)
      const groupSummary = composition
        ? Object.entries(composition.byGroup).map(([siglas, n]) => ({
            siglas, ...senadoGroupInfo(siglas), n,
          })).sort((a, b) => b.n - a.n)
        : []

      return NextResponse.json(withMeta({
        commission: c,
        composition,
        groupSummary,
        scheduledSessions: [],
        comparecientes: [],
        recentSessions: [],
        sessionsCount: 0,
      }, 'live'))
    }

    // CCAA
    if (c.camara === 'autonomico' && c.ccaa) {
      const composition = await fetchCCAAComposition(c.ccaa as CCAA, c.codigo)
      const groupSummary = composition
        ? Object.entries(composition.byGroup).map(([siglas, n]) => ({
            siglas, label: siglas, color: ccaaGroupColor(siglas), n,
          })).sort((a, b) => b.n - a.n)
        : []

      return NextResponse.json(withMeta({
        commission: c,
        composition,
        groupSummary,
        scheduledSessions: [],
        comparecientes: [],
        recentSessions: [],
        sessionsCount: 0,
      }, 'live'))
    }

    return NextResponse.json(withMeta({
      commission: c,
      composition: null,
      groupSummary: [],
      scheduledSessions: [],
      comparecientes: [],
      recentSessions: [],
      sessionsCount: 0,
    }, 'live'))
  } catch (e) {
    return NextResponse.json(withMeta({ error: String(e) }, 'error'), { status: 500 })
  }
}

function ccaaGroupColor(siglas: string): string {
  const map: Record<string, string> = {
    'PSC': '#E1322D', 'PSPV': '#E1322D', 'PSE-EE': '#E1322D',
    'PP': '#1F4E8C', 'PPC': '#1F4E8C',
    'VOX': '#5BA02E',
    'Junts': '#1FA89B', 'ERC': '#E8A030',
    'PNV': '#7DB94B',
    'EH Bildu': '#3F7A3A',
    'Comuns': '#D43F8D', 'Elkarrekin': '#D43F8D',
    'Compromís': '#0F9B6C',
    'CUP': '#FFCC00',
    'AC': '#8B0000',
    'Mixt': '#94A3B8', 'Mixto': '#94A3B8',
    '—': '#525252',
  }
  return map[siglas] || '#6E6E73'
}
