/**
 * GET /api/electoral/provincial
 *
 * Distribución de escaños PROVINCIAL aplicando D'Hondt real (52
 * circunscripciones, umbral 3%, swing nacional uniforme) sobre la
 * estimación agregada de los sondeos curados.
 *
 * Devuelve para cada provincia:
 *   - id (código corto: m, b, va, …)
 *   - cod_ine
 *   - nombre
 *   - escanos (asignados por LOREG)
 *   - winner (partido ganador)
 *   - breakdown (escaños por partido)
 *
 * Útil para alimentar el MAPA POLÍTICO PROVINCIAL en tiempo real
 * con los datos de la estimación actual.
 */
import { NextResponse } from 'next/server'
import {
  SONDEOS_CURADOS_GENERALES,
  estimacionPonderada,
} from '@/lib/sources/encuestas-pesos'
import {
  PROVINCIAS,
  calcularEscanosProvinciales,
  type Partido,
} from '@/lib/sources/dhondt-provincial'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const t0 = Date.now()

  // 1) Estimación agregada ponderada
  const sondeos = SONDEOS_CURADOS_GENERALES.filter(s => s.tipo === 'general')
  const est = estimacionPonderada(sondeos)
  const pctMap: Partial<Record<Partido, number>> = {}
  for (const [siglas, e] of Object.entries(est.partidos)) {
    pctMap[siglas as Partido] = e.pct
  }

  // 2) D'Hondt provincial · matriz partido × provincia
  const escProv = calcularEscanosProvinciales(pctMap)

  // 3) Construir respuesta provincia × partido con winner
  const provincias = PROVINCIAS.map(p => {
    const breakdown = escProv[p.id] || {} as Record<Partido, number>
    // Determinar partido ganador (más escaños · empate → más votos)
    let winner: Partido | null = null
    let maxSeats = 0
    for (const [partido, esc] of Object.entries(breakdown) as Array<[Partido, number]>) {
      if (esc > maxSeats) { maxSeats = esc; winner = partido }
    }
    // Filtrar partidos con 0 escaños (no se muestran)
    const breakdownFiltrado: Partial<Record<Partido, number>> = {}
    for (const [k, v] of Object.entries(breakdown)) {
      if ((v as number) > 0) breakdownFiltrado[k as Partido] = v as number
    }
    return {
      id: p.id,
      cod_ine: p.cod_ine,
      nombre: p.nombre,
      ccaa: p.ccaa,
      escanos: p.escanos,
      winner,
      breakdown: breakdownFiltrado,
    }
  })

  // 4) Verificación · suma total = 350
  const totalSeats = provincias.reduce((s, p) =>
    s + Object.values(p.breakdown).reduce((a, b) => a + (b || 0), 0), 0,
  )

  // 5) Estadísticas agregadas por partido (suma de escaños provinciales)
  const totalesPorPartido: Record<string, number> = {}
  for (const p of provincias) {
    for (const [partido, esc] of Object.entries(p.breakdown)) {
      totalesPorPartido[partido] = (totalesPorPartido[partido] || 0) + (esc || 0)
    }
  }

  return NextResponse.json({
    provincias,
    totales_por_partido: totalesPorPartido,
    n_provincias: provincias.length,
    total_escanos: totalSeats,
    verificacion_ok: totalSeats === 350,
    estimacion_pct: Object.fromEntries(
      Object.entries(est.partidos).map(([s, e]) => [s, e.pct]),
    ),
    n_sondeos: sondeos.length,
    last_update: new Date().toISOString(),
    fetch_ms: Date.now() - t0,
    metodologia: 'D\'Hondt provincial · 52 circunscripciones · umbral 3% · swing nacional uniforme',
    fuente: 'electocracia.com (sondeos) + matriz votos provinciales 23-J 2023',
  }, { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } })
}
