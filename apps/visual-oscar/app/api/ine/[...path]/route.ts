/**
 * /api/ine/[...path] · INE WSTempus JSON · Contabilidad Nacional España.
 *
 * Fuente: servicios.ine.es/wstempus/js/ES · Instituto Nacional de
 * Estadística. Sin auth · gratuito · cache 12h.
 *
 * Series clave para Politeia (códigos INE WSTempus DATOS_SERIE):
 *  - CNT desglose PIB: PIB volumen YoY · POS_2_4_1 trimestral
 *  - EPA paro armonizado: 4247 (Tasa paro general)
 *  - IPV índice precios vivienda: 25171 (trimestral)
 *  - DIRCE empresas activas: 9669 (mensual)
 *  - IPC variación anual: 23708
 *
 * Rutas:
 *   GET /api/ine/health · ping a serie simple
 *   GET /api/ine/cnt-desglose · PIB trimestral con 4 componentes
 *   GET /api/ine/epa · tasa paro armonizado serie 20 trimestres
 *   GET /api/ine/ipv · IPV precios vivienda serie 20 trimestres
 *   GET /api/ine/dirce-creacion · creación/destrucción empresas
 *   GET /api/ine/ipc · IPC variación anual
 *   GET /api/ine/serie?cod={code}&n={lastN} · query libre
 *
 * Estructura respuesta INE:
 *   { COD, Nombre, T3_TipoDato, T3_Periodicidad,
 *     Data: [{ FK_Periodo, Anyo, Valor, Secreto, T3_Periodo, ... }, ...] }
 */
import { NextResponse } from 'next/server'
import { quality } from '@/lib/macro-utils'

export const revalidate = 43200 // 12h

const INE_BASE = 'https://servicios.ine.es/wstempus/js/ES'

async function ineFetch(path: string): Promise<any> {
  try {
    const r = await fetch(`${INE_BASE}${path}`, {
      headers: {
        Accept: 'application/json',
        // INE rechaza User-Agent default de Node
        'User-Agent': 'Mozilla/5.0 (compatible; Politeia/1.0; +https://politeia-visual-oscar.vercel.app)',
      },
      next: { revalidate: 43200 },
    } as RequestInit)
    if (!r.ok) return { error: `HTTP ${r.status}` }
    return await r.json()
  } catch (e: any) {
    return { error: String(e?.message ?? e).slice(0, 160) }
  }
}

// Mapper: INE serie response → array de {period, value}
function mapInePoints(serie: any): { period: string; year: number; value: number | null }[] {
  if (!serie?.Data) return []
  return (serie.Data as any[]).map((d) => ({
    period: d.FK_Periodo ? `${d.Anyo}-${String(d.FK_Periodo).slice(-2)}` : String(d.Anyo),
    year: d.Anyo,
    value: d.Valor ?? null,
  }))
}

export async function GET(
  req: Request,
  { params }: { params: { path: string[] } },
) {
  const url = new URL(req.url)
  const segs = params.path || []
  const action = segs[0]

  // /api/ine/health
  if (action === 'health') {
    const probe = await ineFetch('/DATOS_SERIE/IPC251856?nult=1')
    return NextResponse.json({
      ok: !probe.error,
      auth_required: false,
      probe_status: probe.error ?? 'live',
      probe_series_name: probe?.Nombre ?? null,
    })
  }

  // /api/ine/cnt-desglose · PIB trimestral desglose por componente
  // Códigos canonicos CNT (Contabilidad Nacional Trimestral):
  //   IDA34004 · PIB pm volumen, var trim YoY
  //   IDA34005 · Consumo hogares
  //   IDA34006 · Consumo AAPP
  //   IDA34007 · Inversión (FBKF)
  //   IDA34008 · Sector exterior (exports - imports)
  if (action === 'cnt-desglose') {
    const n = url.searchParams.get('n') || '12'  // últimos 12 trimestres
    const [pib, consumoH, consumoA, inversion, exterior] = await Promise.all([
      ineFetch(`/DATOS_SERIE/IDA34004?nult=${n}`),
      ineFetch(`/DATOS_SERIE/IDA34005?nult=${n}`),
      ineFetch(`/DATOS_SERIE/IDA34006?nult=${n}`),
      ineFetch(`/DATOS_SERIE/IDA34007?nult=${n}`),
      ineFetch(`/DATOS_SERIE/IDA34008?nult=${n}`),
    ])
    if (pib.error && consumoH.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'INE WSTempus · CNT', pib.error || consumoH.error),
      })
    }
    return NextResponse.json({
      ok: true,
      data_quality: quality('live', 'INE WSTempus · Contabilidad Nacional Trimestral'),
      components: {
        pib_total: { name: pib?.Nombre, points: mapInePoints(pib) },
        consumo_hogares: { name: consumoH?.Nombre, points: mapInePoints(consumoH) },
        consumo_aapp: { name: consumoA?.Nombre, points: mapInePoints(consumoA) },
        inversion: { name: inversion?.Nombre, points: mapInePoints(inversion) },
        exterior: { name: exterior?.Nombre, points: mapInePoints(exterior) },
      },
      n_quarters: parseInt(n, 10),
    })
  }

  // /api/ine/epa · Tasa paro armonizado (EPA Encuesta Población Activa)
  if (action === 'epa') {
    const n = url.searchParams.get('n') || '20'
    // 4247 · Tasa de paro general (encuesta EPA)
    const data = await ineFetch(`/DATOS_SERIE/EPA4247?nult=${n}`)
    if (data.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'INE WSTempus · EPA', data.error),
      })
    }
    return NextResponse.json({
      ok: true,
      data_quality: quality('live', 'INE EPA · Tasa paro armonizado'),
      series_name: data?.Nombre,
      points: mapInePoints(data),
    })
  }

  // /api/ine/ipv · Índice precios vivienda
  if (action === 'ipv') {
    const n = url.searchParams.get('n') || '20'
    const data = await ineFetch(`/DATOS_SERIE/IPV25171?nult=${n}`)
    if (data.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'INE WSTempus · IPV', data.error),
      })
    }
    return NextResponse.json({
      ok: true,
      data_quality: quality('live', 'INE IPV · Precios vivienda'),
      series_name: data?.Nombre,
      points: mapInePoints(data),
    })
  }

  // /api/ine/dirce-creacion · Demografía empresarial DIRCE
  if (action === 'dirce-creacion') {
    const n = url.searchParams.get('n') || '24'
    const data = await ineFetch(`/DATOS_SERIE/DIRCE9669?nult=${n}`)
    if (data.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'INE WSTempus · DIRCE', data.error),
      })
    }
    return NextResponse.json({
      ok: true,
      data_quality: quality('live', 'INE DIRCE · Empresas activas'),
      series_name: data?.Nombre,
      points: mapInePoints(data),
    })
  }

  // /api/ine/ipc · IPC variación anual
  if (action === 'ipc') {
    const n = url.searchParams.get('n') || '24'
    const data = await ineFetch(`/DATOS_SERIE/IPC23708?nult=${n}`)
    if (data.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'INE WSTempus · IPC', data.error),
      })
    }
    return NextResponse.json({
      ok: true,
      data_quality: quality('live', 'INE IPC · Variación anual'),
      series_name: data?.Nombre,
      points: mapInePoints(data),
    })
  }

  // /api/ine/serie?cod={code}&n={n} · query libre
  if (action === 'serie') {
    const cod = url.searchParams.get('cod')
    const n = url.searchParams.get('n') || '12'
    if (!cod) {
      return NextResponse.json({ ok: false, error: 'cod parameter required' })
    }
    const data = await ineFetch(`/DATOS_SERIE/${cod}?nult=${n}`)
    if (data.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'INE WSTempus', data.error),
      })
    }
    return NextResponse.json({
      ok: true,
      cod,
      data_quality: quality('live', `INE WSTempus · ${cod}`),
      series_name: data?.Nombre,
      points: mapInePoints(data),
    })
  }

  return NextResponse.json(
    {
      ok: false,
      available_endpoints: [
        'GET /api/ine/health',
        'GET /api/ine/cnt-desglose?n=12 · PIB trimestral + 4 componentes',
        'GET /api/ine/epa?n=20 · tasa paro armonizado',
        'GET /api/ine/ipv?n=20 · índice precios vivienda',
        'GET /api/ine/dirce-creacion?n=24 · demografía empresarial',
        'GET /api/ine/ipc?n=24 · IPC variación anual',
        'GET /api/ine/serie?cod=IPC23708&n=12 · query libre',
      ],
    },
    { status: 404 },
  )
}
