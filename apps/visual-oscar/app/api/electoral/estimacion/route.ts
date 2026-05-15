/**
 * GET /api/electoral/estimacion
 *
 * Estimación electoral agregada ponderada a partir del catálogo de
 * sondeos curados (alimentado por electocracia.com + cifras públicas).
 *
 * Devuelve:
 *   - parties[] · Array compatible con el shape de /api/analytics/nowcast
 *                 (siglas, nombre, pct, ci_inf, ci_sup, seats,
 *                  seats_low, seats_high, color, bloque, delta, n_enc)
 *   - meta.n_sondeos · cuántos sondeos componen la media ponderada
 *   - meta.peso_total · suma de pesos
 *   - meta.fuente · explicación de la fuente
 *
 * Conversión % → escaños hecha por D'Hondt simplificado calibrado
 * con histórico Generales 2023 (PP 137, PSOE 121, VOX 33, etc.).
 */
import { NextResponse } from 'next/server'
import {
  SONDEOS_CURADOS_GENERALES,
  estimacionPonderada,
} from '@/lib/sources/encuestas-pesos'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface PartyEstimate {
  partido_id?: number
  siglas: string
  nombre: string
  pct: number
  ci_inf: number
  ci_sup: number
  seats: number
  seats_low: number
  seats_high: number
  color: string
  bloque: 'izquierda' | 'derecha' | 'otros'
  delta: number
  n_enc: number
}

const PARTY_META: Record<string, { nombre: string; color: string; bloque: 'izquierda' | 'derecha' | 'otros'; partido_id?: number }> = {
  PP:    { partido_id: 2, nombre: 'Partido Popular',           color: '#1F4E8C', bloque: 'derecha'   },
  PSOE:  { partido_id: 1, nombre: 'PSOE',                      color: '#E1322D', bloque: 'izquierda' },
  VOX:   { partido_id: 3, nombre: 'VOX',                       color: '#5BA02E', bloque: 'derecha'   },
  SUMAR: { partido_id: 4, nombre: 'Sumar',                     color: '#D43F8D', bloque: 'izquierda' },
  ERC:   { partido_id: 6, nombre: 'Esquerra Republicana',      color: '#E8A030', bloque: 'izquierda' },
  JUNTS: { partido_id: 7, nombre: 'Junts per Catalunya',       color: '#1FA89B', bloque: 'otros'     },
  PNV:   { partido_id: 8, nombre: 'Partido Nacionalista Vasco', color: '#7DB94B', bloque: 'otros'    },
  BILDU: { partido_id: 9, nombre: 'EH Bildu',                  color: '#3F7A3A', bloque: 'izquierda' },
  CC:    { nombre: 'Coalición Canaria',                         color: '#F2C43A', bloque: 'derecha'   },
  BNG:   { nombre: 'Bloque Nacionalista Galego',                color: '#5BB3D9', bloque: 'izquierda' },
  OTROS: { nombre: 'Otros partidos',                            color: '#9E9E9E', bloque: 'otros'     },
}

/**
 * D'Hondt simplificado para 350 escaños totales · usa una elasticidad
 * histórica calibrada a las generales 2023 (cada 1% adicional = ~3.5 escaños
 * para los grandes, menos para los nacionalistas).
 *
 * Para las próximas elecciones esto se sustituirá por D'Hondt provincial
 * real con la matriz de censo + threshold 3% por circunscripción.
 */
const ELASTICIDAD: Record<string, number> = {
  PP:    3.9,
  PSOE:  3.8,
  VOX:   3.4,
  SUMAR: 3.3,
  ERC:   3.0,  // concentración Cataluña
  JUNTS: 2.7,
  PNV:   2.5,
  BILDU: 2.2,
  CC:    1.4,
  BNG:   1.2,
  OTROS: 0.4,  // dispersión
}

// Punto base 2023 (% real → escaños reales)
const BASE_2023: Record<string, { pct: number; seats: number }> = {
  PP:    { pct: 33.05, seats: 137 },
  PSOE:  { pct: 31.70, seats: 121 },
  VOX:   { pct: 12.39, seats:  33 },
  SUMAR: { pct: 12.31, seats:  31 },
  ERC:   { pct:  1.94, seats:   7 },
  JUNTS: { pct:  1.62, seats:   7 },
  BILDU: { pct:  1.36, seats:   6 },
  PNV:   { pct:  1.13, seats:   5 },
  CC:    { pct:  0.31, seats:   1 },
  BNG:   { pct:  0.65, seats:   1 },
  OTROS: { pct:  3.54, seats:   1 },
}

function pctToSeats(siglas: string, pct: number): number {
  const base = BASE_2023[siglas]
  const elast = ELASTICIDAD[siglas] ?? 1.0
  if (!base) return Math.max(0, Math.round((pct - 3) * 0.5))
  const delta = pct - base.pct
  const seats = Math.round(base.seats + delta * elast)
  return Math.max(0, seats)
}

export async function GET() {
  const t0 = Date.now()

  // Sondeos generales (España, últimos 30 días)
  const sondeos = SONDEOS_CURADOS_GENERALES.filter(s => s.tipo === 'general')
  const est = estimacionPonderada(sondeos)

  // Construir array PartyEstimate con conversión a escaños y deltas vs 2023
  const parties: PartyEstimate[] = []
  const order = ['PP', 'PSOE', 'VOX', 'SUMAR', 'ERC', 'JUNTS', 'PNV', 'BILDU', 'CC', 'BNG', 'OTROS']
  for (const siglas of order) {
    const e = est.partidos[siglas]
    if (!e) continue
    const meta = PARTY_META[siglas]
    if (!meta) continue
    const seats = pctToSeats(siglas, e.pct)
    const seats_low = pctToSeats(siglas, e.ic80_inf)
    const seats_high = pctToSeats(siglas, e.ic80_sup)
    const base = BASE_2023[siglas]
    const delta = base ? +(e.pct - base.pct).toFixed(2) : 0
    parties.push({
      partido_id: meta.partido_id,
      siglas,
      nombre: meta.nombre,
      pct: e.pct,
      ci_inf: e.ic80_inf,
      ci_sup: e.ic80_sup,
      seats,
      seats_low: Math.min(seats_low, seats_high),
      seats_high: Math.max(seats_low, seats_high),
      color: meta.color,
      bloque: meta.bloque,
      delta,
      n_enc: e.n_encuestas,
    })
  }

  // Bloques agregados
  const sumBloque = (b: 'izquierda' | 'derecha' | 'otros') =>
    parties.filter(p => p.bloque === b).reduce((s, p) => s + p.seats, 0)
  const bloques = {
    derecha:    sumBloque('derecha'),
    izquierda:  sumBloque('izquierda'),
    otros:      sumBloque('otros'),
    mayoria_absoluta: 176,
  }

  // Pedersen index (volatilidad agregada vs 2023)
  let pedersen = 0
  for (const p of parties) {
    if (p.delta != null) pedersen += Math.abs(p.delta)
  }
  pedersen = Math.round(pedersen * 10) / 10 / 2

  return NextResponse.json({
    parties,
    bloques,
    pedersen,
    n_polls: sondeos.length,
    last_update: new Date().toISOString(),
    transfers: [],   // futuro · matriz de transferencia entre partidos
    meta: {
      ...est.meta,
      fuente_principal: 'Catálogo curado · alimentado por electocracia.com',
      metodologia: 'Media ponderada (calidad × recencia × √muestra) · D\'Hondt calibrado 2023',
      casas_incluidas: Array.from(new Set(sondeos.map(s => s.casa))),
    },
    fetch_ms: Date.now() - t0,
    _meta: {
      source: 'electocracia',  // marca para distinguir de mock anterior
      ts: new Date().toISOString(),
    },
  }, { headers: { 'Cache-Control': 's-maxage=900, stale-while-revalidate=1800' } })
}
