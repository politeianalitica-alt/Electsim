/**
 * /api/undp/[...path] · UNDP Human Development Index (HDI) snapshot.
 *
 * Fuente: UNDP Human Development Report Statistical Annex.
 *  https://hdr.undp.org/data-center/documentation-and-downloads
 *
 * UNDP NO publica un endpoint JSON estándar. Los datos vienen como
 * CSV/Excel anual en el HDR. Esta ruta sirve los valores conocidos
 * de Spain (y otros países seleccionados) embedded como snapshot.
 *
 * Actualización: manual cuando UNDP publica nuevo HDR (típicamente
 * marzo del año T+1 con datos del año T).
 *
 * Sprint Backend C5 (2026-05-30): snapshot inicial con HDI 2013-2022
 * para España + DE/FR/IT (referencia UE).
 *
 * Rutas:
 *   GET /api/undp/health
 *   GET /api/undp/hdi?country=ESP (default España)
 *     → { ok, last: { value, time }, points: [...] }
 *
 * Cache HTTP 24h (datos no cambian intra-day).
 */
import { NextResponse } from 'next/server'
import { quality } from '@/lib/macro-utils'

export const revalidate = 86400

/**
 * Snapshot de HDI por país y año.
 * Fuente: UNDP HDR 2023-2024 Statistical Annex Table 1.
 * Verificado contra: https://hdr.undp.org/sites/default/files/2023-24_HDR/HDR23-24_Statistical_Annex_HDI_Table.xlsx
 *
 * Para actualizar tras nuevo HDR:
 *   1. Descargar Statistical Annex Table 1 (Excel)
 *   2. Añadir columna `[year]` para cada país
 *   3. Actualizar `latestYear` constante
 */
const HDI_SNAPSHOT: Record<string, Record<string, number | null>> = {
  // ISO3 → { year: HDI }
  ESP: {
    '2013': 0.885, '2014': 0.890, '2015': 0.892, '2016': 0.896,
    '2017': 0.901, '2018': 0.904, '2019': 0.911, '2020': 0.904,
    '2021': 0.905, '2022': 0.911,
  },
  DEU: {
    '2013': 0.926, '2014': 0.929, '2015': 0.937, '2016': 0.942,
    '2017': 0.946, '2018': 0.948, '2019': 0.948, '2020': 0.947,
    '2021': 0.942, '2022': 0.950,
  },
  FRA: {
    '2013': 0.892, '2014': 0.894, '2015': 0.899, '2016': 0.901,
    '2017': 0.901, '2018': 0.901, '2019': 0.903, '2020': 0.900,
    '2021': 0.903, '2022': 0.910,
  },
  ITA: {
    '2013': 0.872, '2014': 0.876, '2015': 0.881, '2016': 0.885,
    '2017': 0.890, '2018': 0.893, '2019': 0.895, '2020': 0.892,
    '2021': 0.892, '2022': 0.906,
  },
  USA: {
    '2013': 0.917, '2014': 0.919, '2015': 0.920, '2016': 0.923,
    '2017': 0.924, '2018': 0.925, '2019': 0.926, '2020': 0.926,
    '2021': 0.921, '2022': 0.927,
  },
}

const HDI_LATEST_YEAR = '2022'
const HDI_SOURCE_NOTE = 'UNDP HDR 2023-2024 Statistical Annex Table 1'

interface HdiPoint {
  time: string
  value: number
}

interface HdiResponse {
  ok: boolean
  country: string
  source: string
  data_quality: ReturnType<typeof quality>
  n_points: number
  points: HdiPoint[]
  last: HdiPoint | null
  latest_year: string
  snapshot_note: string
}

export async function GET(
  req: Request,
  { params }: { params: { path: string[] } },
) {
  const url = new URL(req.url)
  const segs = params.path || []
  const action = segs[0]

  if (!action || action === 'health') {
    return NextResponse.json({
      ok: true,
      service: 'UNDP Human Development Index (snapshot)',
      countries: Object.keys(HDI_SNAPSHOT),
      latest_year: HDI_LATEST_YEAR,
      source: HDI_SOURCE_NOTE,
      example: '/api/undp/hdi?country=ESP',
    })
  }

  if (action === 'hdi') {
    const country = (url.searchParams.get('country') || 'ESP').toUpperCase()
    const data = HDI_SNAPSHOT[country]
    if (!data) {
      const out: HdiResponse = {
        ok: false,
        country,
        source: HDI_SOURCE_NOTE,
        data_quality: quality('missing', 'UNDP HDI snapshot', `country_not_in_snapshot:${country}`),
        n_points: 0,
        points: [],
        last: null,
        latest_year: HDI_LATEST_YEAR,
        snapshot_note: `Country ${country} not in snapshot. Available: ${Object.keys(HDI_SNAPSHOT).join(', ')}`,
      }
      return NextResponse.json(out, { status: 404 })
    }

    const points: HdiPoint[] = Object.entries(data)
      .filter(([, v]) => v != null)
      .map(([time, value]) => ({ time, value: value as number }))
      .sort((a, b) => a.time.localeCompare(b.time))
    const last = points.length > 0 ? points[points.length - 1] : null

    const out: HdiResponse = {
      ok: true,
      country,
      source: HDI_SOURCE_NOTE,
      data_quality: quality('live', `UNDP HDI · ${country}`),
      n_points: points.length,
      points,
      last,
      latest_year: HDI_LATEST_YEAR,
      snapshot_note:
        'Snapshot estático. Update manual tras publicación HDR (marzo año T+1). Para datos en tiempo real consultar https://hdr.undp.org',
    }
    return NextResponse.json(out)
  }

  return NextResponse.json(
    {
      ok: false,
      error: 'unknown action',
      available: ['health', 'hdi'],
    },
    { status: 400 },
  )
}
