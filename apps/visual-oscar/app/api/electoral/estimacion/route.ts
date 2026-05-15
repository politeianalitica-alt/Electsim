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
import { calcularEscanosNacional, type Partido } from '@/lib/sources/dhondt-provincial'

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
 * Punto base 2023 (% real Generales 23-J) · solo para calcular el delta
 * que se muestra al usuario. La asignación de escaños se hace ahora con
 * D'Hondt PROVINCIAL real (52 circunscripciones, umbral 3%, swing
 * nacional uniforme aplicado a la matriz de votos provinciales 2023).
 *
 * Ver: lib/sources/dhondt-provincial.ts
 */
const BASE_2023_PCT: Record<string, number> = {
  PP: 33.05, PSOE: 31.70, VOX: 12.39, SUMAR: 12.31,
  ERC: 1.94, JUNTS: 1.62, BILDU: 1.36, PNV: 1.13,
  CC: 0.31, BNG: 0.65, OTROS: 3.54,
}

/**
 * Wrapper sobre calcularEscanosNacional() de dhondt-provincial.ts:
 * convierte el shape interno (Record<string,number>) al esperado por
 * el resto del endpoint.
 */
function asignarEscanos(estimaciones: Record<string, number>): Record<string, number> {
  return calcularEscanosNacional(estimaciones as Partial<Record<Partido, number>>) as Record<string, number>
}

export async function GET() {
  const t0 = Date.now()

  // Sondeos generales (España, últimos 30 días)
  const sondeos = SONDEOS_CURADOS_GENERALES.filter(s => s.tipo === 'general')
  const est = estimacionPonderada(sondeos)

  // 1. Map de % por partido para el asignador
  const pctMap: Record<string, number> = {}
  const pctMapLow: Record<string, number> = {}
  const pctMapHigh: Record<string, number> = {}
  for (const [siglas, e] of Object.entries(est.partidos)) {
    pctMap[siglas] = e.pct
    pctMapLow[siglas] = e.ic80_inf
    pctMapHigh[siglas] = e.ic80_sup
  }

  // 2. Asignar escaños con normalización a 350
  const seatsCentral = asignarEscanos(pctMap)
  const seatsLow = asignarEscanos(pctMapLow)
  const seatsHigh = asignarEscanos(pctMapHigh)

  // 3. Construir array PartyEstimate
  const parties: PartyEstimate[] = []
  const order = ['PP', 'PSOE', 'VOX', 'SUMAR', 'ERC', 'JUNTS', 'PNV', 'BILDU', 'CC', 'BNG', 'OTROS']
  for (const siglas of order) {
    const e = est.partidos[siglas]
    if (!e) continue
    const meta = PARTY_META[siglas]
    if (!meta) continue
    const sCent = seatsCentral[siglas] || 0
    const sLow = seatsLow[siglas] || 0
    const sHigh = seatsHigh[siglas] || 0
    const base_pct = BASE_2023_PCT[siglas]
    const delta = base_pct != null ? +(e.pct - base_pct).toFixed(2) : 0
    parties.push({
      partido_id: meta.partido_id,
      siglas,
      nombre: meta.nombre,
      pct: e.pct,
      ci_inf: e.ic80_inf,
      ci_sup: e.ic80_sup,
      seats: sCent,
      seats_low: Math.min(sLow, sHigh),
      seats_high: Math.max(sLow, sHigh),
      color: meta.color,
      bloque: meta.bloque,
      delta,
      n_enc: e.n_encuestas,
    })
  }

  // 4. Verificación: la suma DEBE ser 350
  const totalSeats = parties.reduce((s, p) => s + p.seats, 0)

  // 5. Bloques agregados con interpretación de coalición típica
  const sumBloque = (b: 'izquierda' | 'derecha' | 'otros') =>
    parties.filter(p => p.bloque === b).reduce((s, p) => s + p.seats, 0)
  const seats = (s: string) => parties.find(p => p.siglas === s)?.seats || 0
  const MAYORIA = 176

  // Coaliciones típicas
  const pp_vox     = seats('PP') + seats('VOX')
  const pp_vox_cc  = pp_vox + seats('CC')
  const psoe_sumar = seats('PSOE') + seats('SUMAR')
  const izq_amplia = psoe_sumar + seats('ERC') + seats('PNV') + seats('BILDU') + seats('BNG')
  const der_amplia = pp_vox_cc

  const bloques = {
    derecha:    sumBloque('derecha'),
    izquierda:  sumBloque('izquierda'),
    otros:      sumBloque('otros'),
    mayoria_absoluta: MAYORIA,
    coaliciones: {
      pp_vox:        { seats: pp_vox,        viable: pp_vox >= MAYORIA,        falta: Math.max(0, MAYORIA - pp_vox) },
      pp_vox_cc:     { seats: pp_vox_cc,     viable: pp_vox_cc >= MAYORIA,     falta: Math.max(0, MAYORIA - pp_vox_cc) },
      psoe_sumar:    { seats: psoe_sumar,    viable: psoe_sumar >= MAYORIA,    falta: Math.max(0, MAYORIA - psoe_sumar) },
      izq_amplia:    { seats: izq_amplia,    viable: izq_amplia >= MAYORIA,    falta: Math.max(0, MAYORIA - izq_amplia) },
      der_amplia:    { seats: der_amplia,    viable: der_amplia >= MAYORIA,    falta: Math.max(0, MAYORIA - der_amplia) },
    },
  }

  // 6. KPIs derivados (para el dashboard ejecutivo)
  const distancia_pp_psoe = seats('PP') - seats('PSOE')
  // P(PP gobierna) heurístico: si PP+VOX≥176 → muy probable; +CC ≥176 → probable;
  // si solo +CC depende de Junts/PNV → incierto.
  let p_pp_gobierna = 50
  if (pp_vox >= MAYORIA) p_pp_gobierna = 92
  else if (pp_vox_cc >= MAYORIA) p_pp_gobierna = 78
  else if (pp_vox >= MAYORIA - 5) p_pp_gobierna = 64
  else if (seats('PP') > seats('PSOE') + 10) p_pp_gobierna = 48
  else p_pp_gobierna = 28

  const kpis_derivados = [
    { label: 'Escaños PP',         value: seats('PP'),          sub: `de 350 · ${parties.find(p => p.siglas === 'PP')?.delta || 0 >= 0 ? '+' : ''}${parties.find(p => p.siglas === 'PP')?.delta || 0} pp`,    accent: '#1F4E8C' },
    { label: 'Escaños PSOE',       value: seats('PSOE'),        sub: `de 350 · ${parties.find(p => p.siglas === 'PSOE')?.delta || 0 >= 0 ? '+' : ''}${parties.find(p => p.siglas === 'PSOE')?.delta || 0} pp`, accent: '#E1322D' },
    { label: 'Distancia PP–PSOE',  value: Math.abs(distancia_pp_psoe), sub: `escaños · ${distancia_pp_psoe > 15 ? 'margen sólido' : distancia_pp_psoe > 5 ? 'margen ajustado' : 'empate técnico'}`, accent: '#8B5CF6' },
    { label: 'P(PP gobierna)',     value: `${p_pp_gobierna}%`,  sub: pp_vox >= MAYORIA ? 'PP+VOX mayoría absoluta' : pp_vox_cc >= MAYORIA ? 'PP+VOX+CC mayoría' : 'depende de regionalistas', accent: p_pp_gobierna >= 70 ? '#16A34A' : p_pp_gobierna >= 45 ? '#D97706' : '#DC2626' },
  ]

  // Pedersen index (volatilidad agregada vs 2023)
  let pedersen = 0
  for (const p of parties) {
    if (p.delta != null) pedersen += Math.abs(p.delta)
  }
  pedersen = Math.round(pedersen * 10) / 10 / 2

  return NextResponse.json({
    parties,
    bloques,
    kpis_derivados,
    pedersen,
    n_polls: sondeos.length,
    last_update: new Date().toISOString(),
    transfers: [],   // futuro · matriz de transferencia entre partidos
    meta: {
      ...est.meta,
      fuente_principal: 'Catálogo curado · alimentado por electocracia.com',
      metodologia: 'Media ponderada (calidad × recencia × √muestra) · D\'Hondt calibrado 2023 con normalización a 350',
      casas_incluidas: Array.from(new Set(sondeos.map(s => s.casa))),
      total_seats: totalSeats,        // debe ser 350
      mayoria_absoluta: MAYORIA,
      verificacion_ok: totalSeats === 350,
    },
    fetch_ms: Date.now() - t0,
    _meta: {
      source: 'electocracia',
      ts: new Date().toISOString(),
    },
  }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } })
}
