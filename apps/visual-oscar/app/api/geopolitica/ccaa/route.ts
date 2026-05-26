import { NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'
import { buildGeoMeta } from '@/lib/geopolitica/geo-methodology'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface CcaaExposicion {
  ccaa: string; ccaa_iso: string; lat: number; lon: number
  puertos: string[]; bases_militares: string[]
  dependencia_gas_pct: number; rutas_migratorias: boolean
  exportaciones_riesgo_pct: number; poblacion_ext_riesgo_pct: number
}

// Static exposure data for 17 CCAA + Ceuta/Melilla
const EXPOSICION: CcaaExposicion[] = [
  { ccaa: 'Andalucía', ccaa_iso: 'ES-AN', lat: 37.5, lon: -4.5, puertos: ['Algeciras', 'Málaga'], bases_militares: ['Rota', 'Morón'], dependencia_gas_pct: 45, rutas_migratorias: true, exportaciones_riesgo_pct: 18, poblacion_ext_riesgo_pct: 12 },
  { ccaa: 'Cataluña', ccaa_iso: 'ES-CT', lat: 41.7, lon: 1.8, puertos: ['Barcelona', 'Tarragona'], bases_militares: [], dependencia_gas_pct: 60, rutas_migratorias: false, exportaciones_riesgo_pct: 22, poblacion_ext_riesgo_pct: 15 },
  { ccaa: 'Madrid', ccaa_iso: 'ES-MD', lat: 40.4, lon: -3.7, puertos: [], bases_militares: ['Torrejón'], dependencia_gas_pct: 70, rutas_migratorias: false, exportaciones_riesgo_pct: 28, poblacion_ext_riesgo_pct: 18 },
  { ccaa: 'Comunidad Valenciana', ccaa_iso: 'ES-VC', lat: 39.5, lon: -0.5, puertos: ['Valencia'], bases_militares: [], dependencia_gas_pct: 55, rutas_migratorias: false, exportaciones_riesgo_pct: 20, poblacion_ext_riesgo_pct: 14 },
  { ccaa: 'Galicia', ccaa_iso: 'ES-GA', lat: 42.6, lon: -8.0, puertos: ['Vigo', 'A Coruña'], bases_militares: ['Ferrol'], dependencia_gas_pct: 30, rutas_migratorias: false, exportaciones_riesgo_pct: 10, poblacion_ext_riesgo_pct: 6 },
  { ccaa: 'Canarias', ccaa_iso: 'ES-CN', lat: 28.3, lon: -15.5, puertos: ['Las Palmas', 'Tenerife'], bases_militares: [], dependencia_gas_pct: 100, rutas_migratorias: true, exportaciones_riesgo_pct: 8, poblacion_ext_riesgo_pct: 20 },
  { ccaa: 'País Vasco', ccaa_iso: 'ES-PV', lat: 43.1, lon: -2.6, puertos: ['Bilbao'], bases_militares: [], dependencia_gas_pct: 65, rutas_migratorias: false, exportaciones_riesgo_pct: 24, poblacion_ext_riesgo_pct: 10 },
  { ccaa: 'Castilla-La Mancha', ccaa_iso: 'ES-CM', lat: 39.5, lon: -3.0, puertos: [], bases_militares: ['Albacete'], dependencia_gas_pct: 50, rutas_migratorias: false, exportaciones_riesgo_pct: 12, poblacion_ext_riesgo_pct: 8 },
  { ccaa: 'Castilla y León', ccaa_iso: 'ES-CL', lat: 41.5, lon: -4.5, puertos: [], bases_militares: ['León', 'Salamanca'], dependencia_gas_pct: 40, rutas_migratorias: false, exportaciones_riesgo_pct: 8, poblacion_ext_riesgo_pct: 5 },
  { ccaa: 'Extremadura', ccaa_iso: 'ES-EX', lat: 39.0, lon: -6.0, puertos: [], bases_militares: [], dependencia_gas_pct: 35, rutas_migratorias: false, exportaciones_riesgo_pct: 6, poblacion_ext_riesgo_pct: 7 },
  { ccaa: 'Aragón', ccaa_iso: 'ES-AR', lat: 41.5, lon: -0.9, puertos: [], bases_militares: ['Zaragoza'], dependencia_gas_pct: 50, rutas_migratorias: false, exportaciones_riesgo_pct: 14, poblacion_ext_riesgo_pct: 10 },
  { ccaa: 'Murcia', ccaa_iso: 'ES-MC', lat: 37.9, lon: -1.5, puertos: ['Cartagena'], bases_militares: [], dependencia_gas_pct: 55, rutas_migratorias: false, exportaciones_riesgo_pct: 16, poblacion_ext_riesgo_pct: 16 },
  { ccaa: 'Asturias', ccaa_iso: 'ES-AS', lat: 43.4, lon: -5.9, puertos: ['Gijón'], bases_militares: [], dependencia_gas_pct: 38, rutas_migratorias: false, exportaciones_riesgo_pct: 10, poblacion_ext_riesgo_pct: 6 },
  { ccaa: 'Navarra', ccaa_iso: 'ES-NC', lat: 42.7, lon: -1.7, puertos: [], bases_militares: [], dependencia_gas_pct: 45, rutas_migratorias: false, exportaciones_riesgo_pct: 18, poblacion_ext_riesgo_pct: 12 },
  { ccaa: 'Cantabria', ccaa_iso: 'ES-CB', lat: 43.2, lon: -4.0, puertos: ['Santander'], bases_militares: [], dependencia_gas_pct: 32, rutas_migratorias: false, exportaciones_riesgo_pct: 8, poblacion_ext_riesgo_pct: 5 },
  { ccaa: 'La Rioja', ccaa_iso: 'ES-RI', lat: 42.3, lon: -2.4, puertos: [], bases_militares: [], dependencia_gas_pct: 42, rutas_migratorias: false, exportaciones_riesgo_pct: 20, poblacion_ext_riesgo_pct: 12 },
  { ccaa: 'Islas Baleares', ccaa_iso: 'ES-IB', lat: 39.5, lon: 2.7, puertos: ['Palma'], bases_militares: [], dependencia_gas_pct: 100, rutas_migratorias: true, exportaciones_riesgo_pct: 6, poblacion_ext_riesgo_pct: 22 },
  { ccaa: 'Ceuta', ccaa_iso: 'ES-CE', lat: 35.9, lon: -5.3, puertos: ['Ceuta'], bases_militares: ['Ceuta'], dependencia_gas_pct: 100, rutas_migratorias: true, exportaciones_riesgo_pct: 5, poblacion_ext_riesgo_pct: 35 },
  { ccaa: 'Melilla', ccaa_iso: 'ES-ML', lat: 35.3, lon: -2.9, puertos: ['Melilla'], bases_militares: ['Melilla'], dependencia_gas_pct: 100, rutas_migratorias: true, exportaciones_riesgo_pct: 5, poblacion_ext_riesgo_pct: 40 },
]

function calcularScore(exp: CcaaExposicion): {
  score_energia: number; score_migracion: number; score_seguridad: number
  score_comercio: number; score_total: number; factor_dominante: string; explicacion: string
} {
  // Normalize to 0-10
  const score_energia = Math.min(10, exp.dependencia_gas_pct / 10)
  const score_migracion = exp.rutas_migratorias ? Math.min(10, 4 + exp.poblacion_ext_riesgo_pct / 5) : Math.min(10, exp.poblacion_ext_riesgo_pct / 4)
  const score_seguridad = Math.min(10, (exp.bases_militares.length * 1.5) + (exp.puertos.length * 0.8) + (exp.rutas_migratorias ? 2 : 0))
  const score_comercio = Math.min(10, exp.exportaciones_riesgo_pct / 3)
  const score_total = Math.min(10, (score_energia * 0.3 + score_migracion * 0.25 + score_seguridad * 0.25 + score_comercio * 0.2))

  const scores: Record<string, number> = { energia: score_energia, migracion: score_migracion, seguridad: score_seguridad, comercio: score_comercio }
  const factor_dominante = Object.entries(scores).sort(([, a], [, b]) => b - a)[0][0]

  const explicacion = `Exposición dominada por ${factor_dominante}. ` +
    (exp.bases_militares.length > 0 ? `Bases: ${exp.bases_militares.join(', ')}. ` : '') +
    (exp.puertos.length > 0 ? `Puertos: ${exp.puertos.join(', ')}. ` : '') +
 `Dependencia gas: ${exp.dependencia_gas_pct}%. Exportaciones a países en riesgo: ${exp.exportaciones_riesgo_pct}%.`

  return { score_energia, score_migracion, score_seguridad, score_comercio, score_total, factor_dominante, explicacion }
}

export async function GET() {
  const startedAt = Date.now()
  const real = await fromBackend<{ data: unknown[] }>('/api/geopolitica/ccaa-riesgo')
  if (real?.data?.length) {
    return NextResponse.json({
      ...withMeta(real, 'backend'),
      _geo_meta: buildGeoMeta({
        source_mode: 'live_api',
        sources_used: ['backend · /api/geopolitica/ccaa-riesgo'],
        startedAt, confidence: 0.75, layer: 'analytical_model',
      }),
    })
  }

  const data = EXPOSICION.map(exp => ({
    ccaa: exp.ccaa, ccaa_iso: exp.ccaa_iso, lat: exp.lat, lon: exp.lon,
    ...calcularScore(exp),
  }))

  return NextResponse.json({
    ...withMeta({ data }, 'mock'),
    _geo_meta: buildGeoMeta({
      source_mode: 'curated_baseline',
      sources_used: [`baseline EXPOSICION · ${EXPOSICION.length} CCAA`],
      startedAt, confidence: 0.55, layer: 'analytical_model',
      warnings: [
        'Scores CCAA calculados sobre baseline editorial · revisión manual',
        'Score sin backend · sin ajuste por noticias recientes',
      ],
      notes: 'CCAA-riesgo derivado de exposición curada (energía/migración/seguridad/comercio)',
    }),
  })
}
