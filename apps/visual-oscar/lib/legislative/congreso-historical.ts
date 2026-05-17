/**
 * Comisiones HISTÓRICAS del Congreso (legislaturas IX-XIV).
 *
 * Endpoint AJAX oculto verificado:
 *
 *   1. Listar comisiones de una legislatura:
 *      POST /es/opendata/organos?...&p_p_resource_id=resourceIDOrganos
 *      body: _opendata_tipoConsulta=3&_opendata_legislatura=14
 *
 *   2. Composición de una comisión:
 *      POST /es/organos/composicion-en-la-legislatura?...&p_p_resource_id=searchOrgano
 *      body: _organos_selectedSuborgano=301&_organos_selectedLegislatura=XIV&...
 *
 *   3. Export oficial (JSON/CSV/XML):
 *      POST /es/organos/composicion-en-la-legislatura?...&p_p_resource_id=opendataExport
 */

import type { Commission } from './types'
import type { CommissionMember, CommissionComposition } from './congreso'

const BASE = 'https://www.congreso.es'
const UA = 'Mozilla/5.0 (compatible; PoliteiaAnalitica/1.0; +https://politeia-visual-oscar.vercel.app)'

export type Legislatura = 'IX' | 'X' | 'XI' | 'XII' | 'XIII' | 'XIV' | 'XV'

const LEG_TO_NUM: Record<Legislatura, string> = {
  'IX': '9', 'X': '10', 'XI': '11', 'XII': '12',
  'XIII': '13', 'XIV': '14', 'XV': '15',
}

interface RawOrgano {
  urlExport: string
  descOrgano: string
  indexOrgano: number
}

interface RawMember {
  idCargo?: number
  apellidosNombre: string
  fechaAltaFormat?: string
  fechaBajaFormat?: string
  urlFichaDiputado?: string
  descCargo?: string
  siglas?: string
}

interface ListCache { ts: number; data: Commission[] }
const listCache: Map<Legislatura, ListCache> = new Map()
const LIST_TTL = 12 * 60 * 60 * 1000  // 12h

/**
 * Lista las comisiones de una legislatura concreta.
 *
 * tipoConsulta:
 *   0 = Mesa, 1 = Junta de Portavoces, 2 = Diputación Permanente
 *   3 = Comisiones del Congreso
 */
export async function fetchHistoricalCommissions(legislatura: Legislatura): Promise<Commission[]> {
  const cached = listCache.get(legislatura)
  if (cached && Date.now() - cached.ts < LIST_TTL) return cached.data

  const url = `${BASE}/es/opendata/organos?p_p_id=opendata&p_p_lifecycle=2&p_p_state=normal&p_p_mode=view&p_p_resource_id=resourceIDOrganos&p_p_cacheability=cacheLevelPage`
  const body = `_opendata_tipoConsulta=3&_opendata_legislatura=${LEG_TO_NUM[legislatura]}`
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), 12000)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'User-Agent': UA,
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        Accept: 'application/json, */*',
      },
      body,
      signal: controller.signal,
      next: { revalidate: 43200 }, // 12h
    })
    if (!res.ok) return cached?.data ?? []
    const text = await res.text()
    let json
    try { json = JSON.parse(text) } catch { return cached?.data ?? [] }
    const organos: RawOrgano[] = json.datosOrganos || []

    const commissions: Commission[] = organos.map(o => {
      // Extract code from urlExport: ?_organos_selectedSuborgano=NNN
      const codeMatch = o.urlExport.match(/_organos_selectedSuborgano=(\d+)/)
      const codigo = codeMatch ? codeMatch[1] : `idx-${o.indexOrgano}`
      const nombre = (o.descOrgano || '').trim()
      const isInvestigation = /investigaci/i.test(nombre)
      const isMixta = /mixt/i.test(nombre)
      return {
        id: `cgr-${legislatura}-${codigo}`,
        codigo,
        nombre,
        camara: isMixta ? 'mixta' : 'congreso',
        ccaa: null,
        kind: isInvestigation ? 'investigacion'
          : isMixta ? 'mixta'
          : /no permanente/i.test(nombre) ? 'no-permanente'
          : 'permanente',
        active: legislatura === 'XV',
        isInvestigation,
        url: `${BASE}${o.urlExport}`,
      }
    })

    listCache.set(legislatura, { ts: Date.now(), data: commissions })
    return commissions
  } catch {
    return cached?.data ?? []
  } finally {
    clearTimeout(t)
  }
}

/**
 * Composición de una comisión de una legislatura concreta (XV o histórica).
 *
 * organoSup: 1 = Permanentes Legislativas (default)
 *           152 = Comisiones de Investigación
 *           157 = Mixtas Congreso-Senado
 */
export async function fetchHistoricalComposition(
  codigo: string,
  legislatura: Legislatura,
  organoSup: string = '1',
): Promise<CommissionComposition | null> {
  const url = `${BASE}/es/organos/composicion-en-la-legislatura?p_p_id=organos&p_p_lifecycle=2&p_p_state=normal&p_p_mode=view&p_p_resource_id=searchOrgano&p_p_cacheability=cacheLevelPage&_organos_selectedLegislatura=${legislatura}&_organos_selectedOrganoSup=${organoSup}&_organos_selectedSuborgano=${codigo}`
  const compoHistorica = legislatura !== 'XV' ? 'true' : 'false'
  const body = `_organos_selectedLegislatura=${legislatura}&_organos_compoHistorica=${compoHistorica}&_organos_selectedOrganoSup=${organoSup}&_organos_selectedSuborgano=${codigo}`
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), 12000)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'User-Agent': UA,
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        Accept: 'text/html, */*',
      },
      body,
      signal: controller.signal,
      next: { revalidate: 86400 }, // 24h
    })
    if (!res.ok) return null
    const text = await res.text()
    const json = JSON.parse(text)

    const members: CommissionMember[] = (json.data || []).map((m: RawMember) => ({
      id: m.idCargo || 0,
      nombre: m.apellidosNombre || '',
      cargo: m.descCargo || 'Vocal',
      grupo: m.siglas || '',
      fechaAlta: m.fechaAltaFormat || '',
      fechaBaja: m.fechaBajaFormat || '',
      urlFicha: m.urlFichaDiputado ? `${BASE}${m.urlFichaDiputado}` : '',
    }))

    const byGroup: Record<string, number> = {}
    for (const m of members) {
      if (m.fechaBaja) continue   // solo activos en la legislatura
      byGroup[m.grupo || '—'] = (byGroup[m.grupo || '—'] || 0) + 1
    }

    return {
      codigo,
      fechaConstitucion: json.fechaConstitucion?.fechaConstitucion || null,
      fechaDisolucion: json.fechaDisolucion?.fechaDisolucion || null,
      members: members.filter(m => !m.fechaBaja),
      byGroup,
      total: members.filter(m => !m.fechaBaja).length,
      active: !json.fechaDisolucion?.fechaDisolucion,
    }
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

export const HISTORICAL_LEGISLATURAS: Legislatura[] = ['XV', 'XIV', 'XIII', 'XII', 'XI', 'X', 'IX']
