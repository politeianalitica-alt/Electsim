/**
 * GET /api/sectores/vivienda/mercado
 *
 * Datos de mercado consolidados del sector vivienda:
 *   - ccaa[]      · ranking de CCAA con precio €/m² y variación anual
 *                   (referencia Tinsa IMIE / MITMA Q4 2025)
 *   - ciudades[]  · ranking top 10 ciudades por precio €/m²
 *   - hipotecas[] · serie mensual 24 meses · constituidas + tipo medio (INE H910)
 *   - visados[]   · serie mensual 24 meses · visados obra nueva residencial (MITMA)
 *   - resumen     · agregados nacionales: precio €/m² medio, esfuerzo, volumen
 *
 * Cuando la conexión INE/MITMA esté disponible, este endpoint debería
 * sustituir los mocks por las series reales. Hasta entonces, devuelve
 * datos calibrados con valores observados en los últimos 12 meses.
 */
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// ─── Datos calibrados (referencia Tinsa Q4 2025 / MITMA / INE) ──────────
const CCAA_DATA: Array<{ id: string; nombre: string; precio_m2: number; var_anual: number; cod_ine: string }> = [
  { cod_ine: '04', id: 'baleares',  nombre: 'Illes Balears',      precio_m2: 3850, var_anual: 5.2 },
  { cod_ine: '13', id: 'madrid',    nombre: 'Madrid',             precio_m2: 3540, var_anual: 8.1 },
  { cod_ine: '16', id: 'pais_vasco',nombre: 'País Vasco',         precio_m2: 2890, var_anual: 6.3 },
  { cod_ine: '09', id: 'cataluna',  nombre: 'Cataluña',           precio_m2: 2650, var_anual: 7.4 },
  { cod_ine: '05', id: 'canarias',  nombre: 'Canarias',           precio_m2: 2240, var_anual: 6.1 },
  { cod_ine: '15', id: 'navarra',   nombre: 'Navarra',            precio_m2: 2150, var_anual: 4.8 },
  { cod_ine: '06', id: 'cantabria', nombre: 'Cantabria',          precio_m2: 1850, var_anual: 5.1 },
  { cod_ine: '01', id: 'andalucia', nombre: 'Andalucía',          precio_m2: 1730, var_anual: 6.7 },
  { cod_ine: '10', id: 'valencia',  nombre: 'C. Valenciana',      precio_m2: 1690, var_anual: 8.4 },
  { cod_ine: '03', id: 'asturias',  nombre: 'Asturias',           precio_m2: 1620, var_anual: 4.5 },
  { cod_ine: '12', id: 'galicia',   nombre: 'Galicia',            precio_m2: 1490, var_anual: 5.3 },
  { cod_ine: '02', id: 'aragon',    nombre: 'Aragón',             precio_m2: 1490, var_anual: 4.2 },
  { cod_ine: '17', id: 'rioja',     nombre: 'La Rioja',           precio_m2: 1380, var_anual: 3.8 },
  { cod_ine: '14', id: 'murcia',    nombre: 'Murcia',             precio_m2: 1340, var_anual: 5.6 },
  { cod_ine: '07', id: 'cyl',       nombre: 'Castilla y León',    precio_m2: 1320, var_anual: 3.9 },
  { cod_ine: '08', id: 'clm',       nombre: 'Castilla-La Mancha', precio_m2: 1110, var_anual: 3.5 },
  { cod_ine: '11', id: 'extrem',    nombre: 'Extremadura',        precio_m2:  950, var_anual: 2.8 },
  { cod_ine: '18', id: 'ceuta',     nombre: 'Ceuta',              precio_m2: 1750, var_anual: 4.1 },
  { cod_ine: '19', id: 'melilla',   nombre: 'Melilla',            precio_m2: 1620, var_anual: 3.6 },
]

const CIUDADES_DATA: Array<{ ciudad: string; ccaa: string; precio_m2: number; var_anual: number }> = [
  { ciudad: 'Donostia-San Sebastián', ccaa: 'País Vasco',    precio_m2: 5350, var_anual: 5.8 },
  { ciudad: 'Madrid',                 ccaa: 'Madrid',        precio_m2: 4860, var_anual: 8.1 },
  { ciudad: 'Barcelona',              ccaa: 'Cataluña',      precio_m2: 4720, var_anual: 7.2 },
  { ciudad: 'Bilbao',                 ccaa: 'País Vasco',    precio_m2: 3540, var_anual: 6.3 },
  { ciudad: 'Palma',                  ccaa: 'Illes Balears', precio_m2: 3490, var_anual: 5.2 },
  { ciudad: 'Vitoria',                ccaa: 'País Vasco',    precio_m2: 2680, var_anual: 5.4 },
  { ciudad: 'Málaga',                 ccaa: 'Andalucía',     precio_m2: 2680, var_anual: 9.4 },
  { ciudad: 'Valencia',               ccaa: 'C. Valenciana', precio_m2: 2420, var_anual: 8.6 },
  { ciudad: 'Pamplona',               ccaa: 'Navarra',       precio_m2: 2380, var_anual: 5.0 },
  { ciudad: 'Sevilla',                ccaa: 'Andalucía',     precio_m2: 2160, var_anual: 7.1 },
]

// Serie mensual sintética: jitter pequeño + tendencia ligera + estacionalidad
function generateMonthlySeries(months: number, base: number, drift: number, seasonal: number, noise: number): Array<{ t: string; v: number }> {
  const now = new Date()
  const out: Array<{ t: string; v: number }> = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const t = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const trend = base + drift * (months - i)
    const season = seasonal * Math.sin((d.getMonth() / 12) * 2 * Math.PI)
    const rand = (Math.random() - 0.5) * 2 * noise
    out.push({ t, v: Math.round(trend + season + rand) })
  }
  return out
}

function generateRateSeries(months: number, base: number, drift: number, noise: number): Array<{ t: string; v: number }> {
  const now = new Date()
  const out: Array<{ t: string; v: number }> = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const t = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const trend = base + drift * (months - i)
    const rand = (Math.random() - 0.5) * 2 * noise
    out.push({ t, v: Math.round((trend + rand) * 100) / 100 })
  }
  return out
}

export async function GET() {
  const t0 = Date.now()

  // Hipotecas constituidas mensuales (INE H910) · 24 meses
  // Volumen ~36k/mes con ligera subida; tipo medio ~3.4% (post-bajadas BCE 2025)
  const hipotecas_volumen = generateMonthlySeries(24, 32000, 200, 4500, 2500)
  const hipotecas_tipo    = generateRateSeries(24, 3.45, -0.012, 0.08)
  const hipotecas_importe = generateMonthlySeries(24, 152000, 380, 5500, 3500)

  // Visados obra nueva mensuales (MITMA) · 24 meses
  // Volumen ~10k/mes con tendencia alcista 2024-2025
  const visados = generateMonthlySeries(24, 8500, 90, 1200, 800)

  // KPIs nacionales agregados
  const precio_m2_medio = Math.round(
    CCAA_DATA.reduce((s, c) => s + c.precio_m2, 0) / CCAA_DATA.length,
  )
  const var_anual_media = +(
    CCAA_DATA.reduce((s, c) => s + c.var_anual, 0) / CCAA_DATA.length
  ).toFixed(1)

  // Esfuerzo financiero: % renta dedicada a hipoteca (Banco de España)
  // Referencia BdE Q4 2025: ~37% para vivienda media · hipoteca a 25 años
  const esfuerzo_financiero = 37.4

  return NextResponse.json({
    ccaa: CCAA_DATA.sort((a, b) => b.precio_m2 - a.precio_m2),
    ciudades: CIUDADES_DATA,
    hipotecas: {
      volumen: hipotecas_volumen,
      tipo_medio: hipotecas_tipo,
      importe_medio: hipotecas_importe,
      ult_volumen: hipotecas_volumen[hipotecas_volumen.length - 1].v,
      ult_tipo: hipotecas_tipo[hipotecas_tipo.length - 1].v,
      ult_importe: hipotecas_importe[hipotecas_importe.length - 1].v,
    },
    visados: {
      serie: visados,
      ult: visados[visados.length - 1].v,
      var_anual: +(((visados[visados.length - 1].v - visados[visados.length - 13].v) / visados[visados.length - 13].v) * 100).toFixed(1),
    },
    resumen: {
      precio_m2_medio,
      var_anual_media,
      esfuerzo_financiero,
      ccaa_top: CCAA_DATA[0],
      ccaa_bottom: CCAA_DATA[CCAA_DATA.length - 1],
    },
    fetch_ms: Date.now() - t0,
    fuentes: 'Tinsa IMIE · MITMA · INE H910 · Banco de España',
    fuente_note: 'Demo calibrado · sustituible por feeds reales cuando estén disponibles',
  }, { headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=7200' } })
}
