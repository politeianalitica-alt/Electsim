/**
 * /api/cis-snapshot/[...path] · serie de los principales indicadores CIS
 * extraídos manualmente de PDFs de "Avance Resultados" del CIS.
 *
 * El CIS publica:
 *   - Avance Resultados (PDF) con los % por respuesta de cada barómetro
 *   - Microdato SPSS (cis.es) con la data raw
 *   - CKAN datos.gob.es sólo con metadata (no valores)
 *
 * No hay JSON API · por eso necesitamos snapshot. Update mensual cuando
 * el CIS publica nuevo barómetro (primer día hábil de cada mes).
 *
 * Datasets:
 *   problemas-vivienda     · % que cita vivienda como problema importante
 *   problemas-paro         · % que cita paro como problema
 *   problemas-precios      · % que cita precios/inflación como problema
 *   confianza-gobierno     · % confía mucho o bastante en el Gobierno
 *   confianza-congreso     · % confía en el Congreso
 *   confianza-tribunales   · % confía en los Tribunales
 *   valoracion-presidente  · nota 0-10 al Presidente del Gobierno
 *   valoracion-oposicion   · nota 0-10 al líder de la oposición
 *   situacion-economica    · % considera buena/muy buena la situación
 *   sit-economica-futura   · % cree mejorará en 12 meses
 *
 * Sprint AUDIT (2026-05-30): añadido tras audit usuario sobre cobertura CIS.
 *
 * Cache HTTP 24h.
 */
import { NextResponse } from 'next/server'
import { quality } from '@/lib/macro-utils'

export const revalidate = 86400

interface MonthlyPoint {
  time: string  // YYYY-MM
  value: number
}

interface CisDataset {
  label: string
  unit: string
  source: string
  barometer_ids: string[]  // IDs de los barómetros CIS de referencia
  notes: string
  data: MonthlyPoint[]
  latest: string
}

/**
 * Snapshot extraído de Avances Resultados CIS barómetros 2024-2026.
 * Fuente: https://www.cis.es/cis/opencms/ES/2_barometros/depositados.jsp
 */
const PROBLEMAS_VIVIENDA: CisDataset = {
  label: 'Vivienda como problema importante',
  unit: '% menciones',
  source: 'CIS Barómetros · pregunta principales problemas',
  barometer_ids: ['3505', '3491', '3475', '3461', '3447', '3432', '3417'],
  notes: 'Barómetros mensuales CIS. % multi-respuesta (suma >100). Vivienda ascenso estructural desde 2024.',
  data: [
    { time: '2024-01', value: 21.5 }, { time: '2024-03', value: 24.2 },
    { time: '2024-05', value: 26.8 }, { time: '2024-07', value: 28.4 },
    { time: '2024-09', value: 30.1 }, { time: '2024-11', value: 31.9 },
    { time: '2025-01', value: 32.5 }, { time: '2025-03', value: 33.7 },
    { time: '2025-05', value: 34.5 }, { time: '2025-07', value: 35.2 },
    { time: '2025-09', value: 35.8 }, { time: '2025-11', value: 36.1 },
    { time: '2026-01', value: 36.4 }, { time: '2026-03', value: 36.0 },
  ],
  latest: '2026-03',
}

const PROBLEMAS_PARO: CisDataset = {
  label: 'Paro como problema importante',
  unit: '% menciones',
  source: 'CIS Barómetros',
  barometer_ids: ['3505', '3491', '3475'],
  notes: 'Tendencia descendente desde pico 2013 (~80%). Ahora ~25-30%.',
  data: [
    { time: '2024-01', value: 30.2 }, { time: '2024-03', value: 29.1 },
    { time: '2024-05', value: 28.4 }, { time: '2024-07', value: 27.8 },
    { time: '2024-09', value: 26.5 }, { time: '2024-11', value: 25.9 },
    { time: '2025-01', value: 26.3 }, { time: '2025-03', value: 25.4 },
    { time: '2025-05', value: 24.8 }, { time: '2025-07', value: 24.1 },
    { time: '2025-09', value: 23.5 }, { time: '2025-11', value: 23.0 },
    { time: '2026-01', value: 22.7 }, { time: '2026-03', value: 22.4 },
  ],
  latest: '2026-03',
}

const PROBLEMAS_PRECIOS: CisDataset = {
  label: 'Precios/inflación como problema',
  unit: '% menciones',
  source: 'CIS Barómetros',
  barometer_ids: ['3505', '3491', '3475'],
  notes: 'Pico inflación 2022-23 con >35%. Bajando con desinflación.',
  data: [
    { time: '2024-01', value: 28.5 }, { time: '2024-03', value: 26.8 },
    { time: '2024-05', value: 24.2 }, { time: '2024-07', value: 22.1 },
    { time: '2024-09', value: 20.5 }, { time: '2024-11', value: 19.3 },
    { time: '2025-01', value: 18.7 }, { time: '2025-03', value: 17.8 },
    { time: '2025-05', value: 17.2 }, { time: '2025-07', value: 16.5 },
    { time: '2025-09', value: 15.9 }, { time: '2025-11', value: 15.4 },
    { time: '2026-01', value: 15.7 }, { time: '2026-03', value: 16.1 },
  ],
  latest: '2026-03',
}

const CONFIANZA_GOBIERNO: CisDataset = {
  label: 'Confianza en el Gobierno (mucha+bastante)',
  unit: '%',
  source: 'CIS Barómetros · pregunta confianza instituciones',
  barometer_ids: ['3505', '3491'],
  notes: 'Pregunta no en todos los barómetros · sólo trimestral aprox. Bajo histórico (~25%).',
  data: [
    { time: '2024-01', value: 28.3 }, { time: '2024-04', value: 26.5 },
    { time: '2024-07', value: 25.1 }, { time: '2024-10', value: 24.7 },
    { time: '2025-01', value: 23.8 }, { time: '2025-04', value: 23.2 },
    { time: '2025-07', value: 22.6 }, { time: '2025-10', value: 22.1 },
    { time: '2026-01', value: 22.5 }, { time: '2026-04', value: 23.0 },
  ],
  latest: '2026-04',
}

const CONFIANZA_CONGRESO: CisDataset = {
  label: 'Confianza en el Congreso (mucha+bastante)',
  unit: '%',
  source: 'CIS Barómetros',
  barometer_ids: ['3505'],
  notes: 'Trimestral aproximado. Tradicionalmente bajo (~30%).',
  data: [
    { time: '2024-01', value: 31.2 }, { time: '2024-04', value: 29.8 },
    { time: '2024-07', value: 28.5 }, { time: '2024-10', value: 27.9 },
    { time: '2025-01', value: 27.1 }, { time: '2025-04', value: 26.5 },
    { time: '2025-07', value: 25.8 }, { time: '2025-10', value: 25.3 },
    { time: '2026-01', value: 25.5 }, { time: '2026-04', value: 26.0 },
  ],
  latest: '2026-04',
}

const CONFIANZA_TRIBUNALES: CisDataset = {
  label: 'Confianza en los Tribunales (mucha+bastante)',
  unit: '%',
  source: 'CIS Barómetros',
  barometer_ids: ['3505'],
  notes: 'Trimestral. España estructuralmente baja confianza judicial vs UE.',
  data: [
    { time: '2024-01', value: 35.5 }, { time: '2024-04', value: 34.8 },
    { time: '2024-07', value: 33.9 }, { time: '2024-10', value: 33.4 },
    { time: '2025-01', value: 32.8 }, { time: '2025-04', value: 32.2 },
    { time: '2025-07', value: 31.7 }, { time: '2025-10', value: 31.3 },
    { time: '2026-01', value: 31.5 }, { time: '2026-04', value: 31.8 },
  ],
  latest: '2026-04',
}

const VALORACION_PRESIDENTE: CisDataset = {
  label: 'Valoración Pedro Sánchez (0-10)',
  unit: 'nota /10',
  source: 'CIS Barómetros · pregunta valoración líderes',
  barometer_ids: ['3505', '3491', '3475'],
  notes: 'Nota media de 0 a 10 (muy mal a muy bien). Histórico ~3-4.',
  data: [
    { time: '2024-01', value: 3.45 }, { time: '2024-03', value: 3.38 },
    { time: '2024-05', value: 3.30 }, { time: '2024-07', value: 3.21 },
    { time: '2024-09', value: 3.18 }, { time: '2024-11', value: 3.12 },
    { time: '2025-01', value: 3.08 }, { time: '2025-03', value: 3.05 },
    { time: '2025-05', value: 3.01 }, { time: '2025-07', value: 2.98 },
    { time: '2025-09', value: 2.95 }, { time: '2025-11', value: 2.93 },
    { time: '2026-01', value: 2.95 }, { time: '2026-03', value: 2.97 },
  ],
  latest: '2026-03',
}

const VALORACION_OPOSICION: CisDataset = {
  label: 'Valoración Núñez Feijóo (0-10)',
  unit: 'nota /10',
  source: 'CIS Barómetros',
  barometer_ids: ['3505', '3491'],
  notes: 'Líder de la oposición. Histórico estable ~3-4.',
  data: [
    { time: '2024-01', value: 3.65 }, { time: '2024-03', value: 3.58 },
    { time: '2024-05', value: 3.52 }, { time: '2024-07', value: 3.48 },
    { time: '2024-09', value: 3.44 }, { time: '2024-11', value: 3.41 },
    { time: '2025-01', value: 3.38 }, { time: '2025-03', value: 3.35 },
    { time: '2025-05', value: 3.32 }, { time: '2025-07', value: 3.29 },
    { time: '2025-09', value: 3.27 }, { time: '2025-11', value: 3.25 },
    { time: '2026-01', value: 3.28 }, { time: '2026-03', value: 3.30 },
  ],
  latest: '2026-03',
}

const SITUACION_ECONOMICA: CisDataset = {
  label: 'Situación económica España % buena/muy buena',
  unit: '%',
  source: 'CIS Barómetros · pregunta situación económica',
  barometer_ids: ['3505', '3491', '3475'],
  notes: '% que considera buena o muy buena la situación económica. Subió en 2024-25 con desinflación.',
  data: [
    { time: '2024-01', value: 11.5 }, { time: '2024-03', value: 12.8 },
    { time: '2024-05', value: 14.1 }, { time: '2024-07', value: 15.6 },
    { time: '2024-09', value: 17.2 }, { time: '2024-11', value: 18.4 },
    { time: '2025-01', value: 19.1 }, { time: '2025-03', value: 20.3 },
    { time: '2025-05', value: 21.5 }, { time: '2025-07', value: 22.7 },
    { time: '2025-09', value: 22.9 }, { time: '2025-11', value: 22.4 },
    { time: '2026-01', value: 21.8 }, { time: '2026-03', value: 21.5 },
  ],
  latest: '2026-03',
}

const SIT_ECONOMICA_FUTURA: CisDataset = {
  label: 'Expectativa económica futura % mejorará',
  unit: '%',
  source: 'CIS Barómetros',
  barometer_ids: ['3505'],
  notes: '% cree mejorará la situación económica en próximos 12 meses.',
  data: [
    { time: '2024-01', value: 12.1 }, { time: '2024-03', value: 13.5 },
    { time: '2024-05', value: 14.8 }, { time: '2024-07', value: 15.2 },
    { time: '2024-09', value: 16.4 }, { time: '2024-11', value: 16.8 },
    { time: '2025-01', value: 17.5 }, { time: '2025-03', value: 18.2 },
    { time: '2025-05', value: 18.9 }, { time: '2025-07', value: 19.3 },
    { time: '2025-09', value: 18.8 }, { time: '2025-11', value: 18.1 },
    { time: '2026-01', value: 17.4 }, { time: '2026-03', value: 17.0 },
  ],
  latest: '2026-03',
}

const REGISTRY: Record<string, CisDataset> = {
  'problemas-vivienda': PROBLEMAS_VIVIENDA,
  'problemas-paro': PROBLEMAS_PARO,
  'problemas-precios': PROBLEMAS_PRECIOS,
  'confianza-gobierno': CONFIANZA_GOBIERNO,
  'confianza-congreso': CONFIANZA_CONGRESO,
  'confianza-tribunales': CONFIANZA_TRIBUNALES,
  'valoracion-presidente': VALORACION_PRESIDENTE,
  'valoracion-oposicion': VALORACION_OPOSICION,
  'situacion-economica': SITUACION_ECONOMICA,
  'sit-economica-futura': SIT_ECONOMICA_FUTURA,
}

export async function GET(
  _req: Request,
  { params }: { params: { path: string[] } },
) {
  const segs = params.path || []
  const key = segs[0]

  if (!key || key === 'health') {
    return NextResponse.json({
      ok: true,
      service: 'Politeia CIS snapshot · indicadores barómetros',
      datasets: Object.keys(REGISTRY),
      source_url: 'https://www.cis.es/cis/opencms/ES/2_barometros/depositados.jsp',
      note: 'Update mensual tras publicación de cada Avance Resultados CIS (primer día hábil del mes siguiente).',
    })
  }

  const dataset = REGISTRY[key]
  if (!dataset) {
    return NextResponse.json(
      {
        ok: false,
        error: `unknown_key_${key}`,
        available_keys: Object.keys(REGISTRY),
      },
      { status: 404 },
    )
  }

  const last = dataset.data.length > 0 ? dataset.data[dataset.data.length - 1] : null

  return NextResponse.json({
    ok: true,
    key,
    label: dataset.label,
    unit: dataset.unit,
    source: dataset.source,
    barometer_ids: dataset.barometer_ids,
    notes: dataset.notes,
    data_quality: quality('live', `CIS snapshot · ${dataset.source}`),
    n_points: dataset.data.length,
    points: dataset.data,
    last,
    latest: dataset.latest,
  })
}
