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
import { fetchExtraCCAAComposition } from '@/lib/legislative/ccaa-commissions-extra'
import { fetchMadridComposition } from '@/lib/legislative/madrid-bypass'
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

    // CCAA — intentar primero el set "core" (5 CCAA originales), luego "extra" (10), luego Madrid
    if (c.camara === 'autonomico' && c.ccaa) {
      const ccaa = c.ccaa as CCAA
      let composition = await fetchCCAAComposition(ccaa, c.codigo)
      if (!composition) composition = await fetchExtraCCAAComposition(ccaa, c.codigo)
      if (!composition && ccaa === 'madrid') composition = await fetchMadridComposition(c.nombre)

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
    // Nacionales
    'PP': '#1F4E8C', 'PSOE': '#E1322D', 'VOX': '#5BA02E',
    'PNV': '#7DB94B', 'EH Bildu': '#3F7A3A',
    // Cataluña
    'PSC': '#E1322D', 'PPC': '#1F4E8C',
    'Junts': '#1FA89B', 'ERC': '#E8A030',
    'Comuns': '#D43F8D', 'AC': '#8B0000',
    'CUP': '#FFCC00', 'Mixt': '#94A3B8',
    // Valenciana
    'PSPV': '#E1322D', 'Compromís': '#0F9B6C',
    // País Vasco
    'PSE-EE': '#E1322D', 'Elkarrekin': '#D43F8D',
    // Canarias
    'CC': '#F2C43A', 'NC': '#0086D3', 'ASG': '#0F9B6C',
    // Cantabria
    'PRC': '#0086D3',
    // Aragón
    'CHA': '#0066CC', 'PAR': '#FFCC00', 'AE': '#FF6666',
    'IU': '#A05050', 'TE': '#5050A0',
    // Galicia
    'BNG': '#5BB3D9',
    // Navarra
    'PSN': '#E1322D', 'UPN': '#0086D3', 'Geroa Bai': '#0F9B6C', 'Contigo': '#D43F8D',
    // Murcia
    'Podemos': '#D43F8D',
    // Generic
    'Mixto': '#94A3B8', '—': '#525252',
  }
  return map[siglas] || '#6E6E73'
}
