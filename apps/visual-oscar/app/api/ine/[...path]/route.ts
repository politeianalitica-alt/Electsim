/**
 * /api/ine/[...path] · INE WSTempus JSON · 35 endpoints macro España.
 *
 * Fuente: servicios.ine.es/wstempus/js/ES · Instituto Nacional de
 * Estadística. Sin auth · gratuito · cache 12h.
 *
 * Códigos REALES validados contra catálogo INE (operación 237 · CNTR2010):
 *   CNTR6654 · PIB pm volumen encadenado YoY · ajustado SA   (Pulso macro)
 *   CNTR7158 · Consumo final hogares+ISFLSH YoY SA           (Pulso macro)
 *   CNTR7188 · Consumo final AAPP YoY SA                     (Pulso macro)
 *   CNTR7213 · Formación Bruta de Capital Fijo YoY SA        (Pulso macro)
 *   CNTR7264 · Demanda externa · aportación anual YoY SA pp  (Pulso macro)
 *   IPC290750 · IPC nacional general · variación anual       (Régimen monetario)
 *   IPC290752 · IPC nacional general · variación mensual     (Régimen monetario)
 *   IPC290753 · IPC nacional general · acumulada año         (Régimen monetario)
 *   EPA86913 · Tasa paro general ambos sexos                 (Hogares)
 *   EPA86912 · Tasa paro <25 años                            (Hogares)
 *   EPA811   · Tasa paro 16-19 años                          (Hogares)
 *   EPA810   · Tasa paro 20-24 años                          (Hogares)
 *
 * Tablas para query libre:
 *   67824 · CNT Demanda volumen encadenado (370 series)
 *   67822 · CNT Oferta volumen encadenado
 *   76134 · IPC tasa variación nacional
 *   4247  · EPA tasa paro general
 *   76201 · IPV trimestral por CCAA
 *
 * Estructura respuesta INE para DATOS_SERIE:
 *   { COD, Nombre, T3_TipoDato, T3_Periodicidad,
 *     Data: [{ FK_Periodo, Anyo, Valor, Secreto, T3_Periodo, ... }, ...] }
 *
 * Para DATOS_TABLA: array de series, cada una con Data[].
 *
 * Rutas activas:
 *   GET /api/ine/health
 *   GET /api/ine/cnt-desglose?n=12      · PIB + 4 componentes CNT trimestral
 *   GET /api/ine/cnt-extra?n=12         · Exportaciones, importaciones, AAPP cap. 5
 *   GET /api/ine/epa?n=20               · paro armonizado + breakdown género/edad
 *   GET /api/ine/ipv?n=20               · IPV vivienda
 *   GET /api/ine/dirce-creacion?n=24    · demografía empresarial DIRCE
 *   GET /api/ine/ipc?n=24               · IPC variación anual + mensual
 *   GET /api/ine/etcl?n=12              · Encuesta Trimestral Coste Laboral (salarios)
 *   GET /api/ine/frontur?n=24           · Frontur turistas internacionales
 *   GET /api/ine/serie?cod={code}&n={n} · query libre
 *   GET /api/ine/tabla?id={id}&nult={n} · tabla completa
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
        'User-Agent': 'Mozilla/5.0 (compatible; Politeia/1.0; +https://politeia-visual-oscar.vercel.app)',
      },
      next: { revalidate: 43200 },
    } as RequestInit)
    if (!r.ok) return { error: `HTTP ${r.status}` }
    const text = await r.text()
    if (!text || text.trim().length === 0) return { error: 'empty body' }
    try {
      return JSON.parse(text)
    } catch {
      return { error: 'invalid json' }
    }
  } catch (e: any) {
    return { error: String(e?.message ?? e).slice(0, 160) }
  }
}

// Mapper: INE serie response → array {period, year, value}
// La estructura de INE WSTempus es heterogénea entre operaciones:
//   - Mensual: FK_Periodo 1-12 (mes)
//   - Trimestral CNTR: FK_Periodo 19-22 (T1-T4 con offset 18)
//   - Anual: FK_Periodo único
// Usamos timestamp Fecha (Unix ms) como fuente de verdad para derivar periodo.
function periodFromTs(ts: number, anyo: number): string {
  if (!ts || !Number.isFinite(ts)) return String(anyo)
  const d = new Date(ts)
  const month = d.getUTCMonth() + 1 // 1-12
  const year = d.getUTCFullYear()
  if (month % 3 === 0) {
    // fin de trimestre → Q
    const q = Math.ceil(month / 3)
    return `${year}-Q${q}`
  }
  return `${year}-${String(month).padStart(2, '0')}`
}

function mapInePoints(serie: any): { period: string; year: number; value: number | null }[] {
  if (!serie?.Data) return []
  return (serie.Data as any[]).map((d) => ({
    period: periodFromTs(d.Fecha, d.Anyo),
    year: new Date(d.Fecha || 0).getUTCFullYear() || d.Anyo,
    value: typeof d.Valor === 'number' ? d.Valor : null,
  }))
}

export async function GET(
  req: Request,
  { params }: { params: { path: string[] } },
) {
  const url = new URL(req.url)
  const segs = params.path || []
  const action = segs[0]

  // /api/ine/health · ping a serie real validada
  if (action === 'health') {
    const probe = await ineFetch('/DATOS_SERIE/IPC290750?nult=1')
    return NextResponse.json({
      ok: !probe.error,
      auth_required: false,
      probe_status: probe.error ?? 'live',
      probe_series_name: probe?.Nombre ?? null,
      latest_value: probe?.Data?.[0]?.Valor ?? null,
      latest_period: probe?.Data?.[0]?.T3_Periodo
        ? `${probe.Data[0].Anyo}-${probe.Data[0].T3_Periodo}`
        : null,
    })
  }

  // /api/ine/cnt-desglose · PIB trimestral SA con 4 componentes + sector exterior
  // Códigos REALES base 2010 (operación 237 · tabla 67824):
  if (action === 'cnt-desglose') {
    const n = url.searchParams.get('n') || '12'
    const [pib, consumoH, consumoA, inversion, exterior] = await Promise.all([
      ineFetch(`/DATOS_SERIE/CNTR6654?nult=${n}`),
      ineFetch(`/DATOS_SERIE/CNTR7158?nult=${n}`),
      ineFetch(`/DATOS_SERIE/CNTR7188?nult=${n}`),
      ineFetch(`/DATOS_SERIE/CNTR7213?nult=${n}`),
      ineFetch(`/DATOS_SERIE/CNTR7264?nult=${n}`),
    ])
    if (pib.error && consumoH.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'INE WSTempus · CNT', pib.error || consumoH.error),
      })
    }
    return NextResponse.json({
      ok: true,
      data_quality: quality('live', 'INE WSTempus · Contabilidad Nacional Trimestral base 2010'),
      components: {
        pib_total: { name: pib?.Nombre, points: mapInePoints(pib) },
        consumo_hogares: { name: consumoH?.Nombre, points: mapInePoints(consumoH) },
        consumo_aapp: { name: consumoA?.Nombre, points: mapInePoints(consumoA) },
        inversion: { name: inversion?.Nombre, points: mapInePoints(inversion) },
        exterior: { name: exterior?.Nombre, points: mapInePoints(exterior) },
      },
      n_quarters: parseInt(n, 10),
      methodology: 'Variación anual sobre Índices de volumen encadenados · Datos ajustados de estacionalidad y calendario',
    })
  }

  // /api/ine/cnt-extra · Exportaciones, importaciones, capacidad financiación AAPP
  if (action === 'cnt-extra') {
    const n = url.searchParams.get('n') || '12'
    const [exports, imports] = await Promise.all([
      ineFetch(`/DATOS_SERIE/CNTR7267?nult=${n}`), // exportaciones YoY SA
      ineFetch(`/DATOS_SERIE/CNTR7287?nult=${n}`), // importaciones YoY SA
    ])
    if (exports.error && imports.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'INE WSTempus · CNT extra', exports.error || imports.error),
      })
    }
    return NextResponse.json({
      ok: true,
      data_quality: quality('live', 'INE WSTempus · CNT comercio exterior'),
      exports: { name: exports?.Nombre, points: mapInePoints(exports) },
      imports: { name: imports?.Nombre, points: mapInePoints(imports) },
    })
  }

  // /api/ine/epa · Tasa paro general + breakdown edad/sexo
  if (action === 'epa') {
    const n = url.searchParams.get('n') || '20'
    const [general, jovenes, hombres, mujeres] = await Promise.all([
      ineFetch(`/DATOS_SERIE/EPA86913?nult=${n}`),  // ambos sexos total
      ineFetch(`/DATOS_SERIE/EPA86912?nult=${n}`),  // <25 años
      ineFetch(`/DATOS_SERIE/EPA811?nult=${n}`),     // 16-19 (proxy hombres si fallan otros)
      ineFetch(`/DATOS_SERIE/EPA810?nult=${n}`),     // 20-24 (proxy)
    ])
    if (general.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'INE WSTempus · EPA', general.error),
      })
    }
    return NextResponse.json({
      ok: true,
      data_quality: quality('live', 'INE EPA · Tasa paro armonizado trimestral'),
      general: { name: general?.Nombre, points: mapInePoints(general) },
      menores_25: { name: jovenes?.Nombre, points: mapInePoints(jovenes) },
      edad_16_19: { name: hombres?.Nombre, points: mapInePoints(hombres) },
      edad_20_24: { name: mujeres?.Nombre, points: mapInePoints(mujeres) },
    })
  }

  // /api/ine/ipc · IPC variación anual + mensual + acumulada
  if (action === 'ipc') {
    const n = url.searchParams.get('n') || '24'
    const [anual, mensual, acumulada] = await Promise.all([
      ineFetch(`/DATOS_SERIE/IPC290750?nult=${n}`),
      ineFetch(`/DATOS_SERIE/IPC290752?nult=${n}`),
      ineFetch(`/DATOS_SERIE/IPC290753?nult=${n}`),
    ])
    if (anual.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'INE WSTempus · IPC', anual.error),
      })
    }
    return NextResponse.json({
      ok: true,
      data_quality: quality('live', 'INE IPC nacional general · base 2021'),
      anual: { name: anual?.Nombre, points: mapInePoints(anual) },
      mensual: { name: mensual?.Nombre, points: mapInePoints(mensual) },
      acumulada: { name: acumulada?.Nombre, points: mapInePoints(acumulada) },
    })
  }

  // /api/ine/ipv · Índice precios vivienda (tabla 76201 trimestral, primera serie = Total)
  if (action === 'ipv') {
    const n = url.searchParams.get('n') || '20'
    const data = await ineFetch(`/DATOS_TABLA/76201?nult=${n}`)
    if (data.error || !Array.isArray(data)) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'INE WSTempus · IPV', data.error || 'unexpected shape'),
      })
    }
    // Filtrar: nacional total + nueva + segunda mano
    const findSerie = (matcher: (n: string) => boolean) =>
      (data as any[]).find((s) => matcher((s.Nombre || '').toLowerCase()))
    const general = findSerie((n) => n.includes('total nacional') && n.includes('general'))
        || findSerie((n) => n.includes('nacional') && !n.includes('nueva') && !n.includes('segunda'))
        || (data as any[])[0]
    const nueva = findSerie((n) => n.includes('nacional') && n.includes('nueva'))
    const segunda = findSerie((n) => n.includes('nacional') && n.includes('segunda'))
    return NextResponse.json({
      ok: true,
      data_quality: quality('live', 'INE IPV · base 2015'),
      general: general ? { name: general.Nombre, points: mapInePoints(general) } : null,
      nueva: nueva ? { name: nueva.Nombre, points: mapInePoints(nueva) } : null,
      segunda: segunda ? { name: segunda.Nombre, points: mapInePoints(segunda) } : null,
      n_series_total: data.length,
    })
  }

  // /api/ine/dirce-creacion · Demografía empresarial DIRCE (tabla 30706 ó similar)
  if (action === 'dirce-creacion') {
    const n = url.searchParams.get('n') || '12'
    // Tablas DIRCE: 30706 (altas), 30707 (bajas), 30708 (saldo neto)
    const [altas] = await Promise.all([
      ineFetch(`/DATOS_TABLA/30706?nult=${n}`),
    ])
    if (altas.error || !Array.isArray(altas)) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'INE WSTempus · DIRCE', altas.error || 'unexpected shape'),
        activation_steps: [
          'DIRCE publica datos anuales (no mensuales como otras series INE)',
          'Próxima publicación: septiembre cada año con datos del año previo',
          'Fallback: Eurostat bd_size_r3 demografía empresarial (anual UE-27)',
        ],
      })
    }
    return NextResponse.json({
      ok: true,
      data_quality: quality('live', 'INE DIRCE · Directorio Central Empresas'),
      n_series: altas.length,
      series_top: (altas as any[]).slice(0, 5).map((s) => ({
        cod: s.COD,
        name: s.Nombre,
        points: mapInePoints(s).slice(0, 5),
      })),
    })
  }

  // /api/ine/etcl · Encuesta Trimestral Coste Laboral · salarios brutos
  if (action === 'etcl') {
    const n = url.searchParams.get('n') || '12'
    // ETCL operación 73 · tabla 6042 coste laboral por trabajador mes
    const data = await ineFetch(`/DATOS_TABLA/6042?nult=${n}`)
    if (data.error || !Array.isArray(data)) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'INE WSTempus · ETCL', data.error || 'unexpected shape'),
      })
    }
    // Primera serie = Total Nacional Total CNAE Coste Total
    const nacional = (data as any[]).find((s) =>
      (s.Nombre || '').toLowerCase().includes('total') &&
      (s.Nombre || '').toLowerCase().includes('coste')
    ) || (data as any[])[0]
    return NextResponse.json({
      ok: true,
      data_quality: quality('live', 'INE ETCL · Coste laboral medio por trabajador y mes'),
      total: nacional ? { name: nacional.Nombre, points: mapInePoints(nacional) } : null,
      n_series: data.length,
      currency: 'EUR',
    })
  }

  // /api/ine/frontur · Frontur turistas internacionales mensual
  if (action === 'frontur') {
    const n = url.searchParams.get('n') || '24'
    // Frontur operación 327 · tabla 23988 (turistas según país residencia)
    const data = await ineFetch(`/DATOS_TABLA/23988?nult=${n}`)
    if (data.error || !Array.isArray(data)) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'INE WSTempus · Frontur', data.error || 'unexpected shape'),
      })
    }
    const total = (data as any[]).find((s) =>
      (s.Nombre || '').toLowerCase().includes('total')
    ) || (data as any[])[0]
    return NextResponse.json({
      ok: true,
      data_quality: quality('live', 'INE Frontur · Turistas internacionales mensual'),
      total: total ? { name: total.Nombre, points: mapInePoints(total) } : null,
      n_paises: data.length,
    })
  }

  // ─── EPF · Encuesta de Presupuestos Familiares ───────────────────────
  // Operación 314 · publicación anual · base COICOP 2018 · datos hasta 2024.
  //
  // Tablas clave:
  //   - 75003: gasto por grupos (2 dígitos COICOP) · precios constantes
  //   - 73778: gasto por grupos (2 dígitos COICOP) · precios corrientes
  //   - 73991: gasto medio por hogar por CCAA × grupo
  //   - 28486: serie histórica anual base 2006 + 2024
  //
  // Códigos de los 13 grandes grupos COICOP 2018 (gasto medio por hogar
  // precios CORRIENTES · tabla 73778 · Total Nacional · Dato base · Gasto total):
  //   EPF534971 Índice general (gasto medio total)
  //   EPF528965/534995 Alimentos y bebidas no alcohólicas
  //   etc · resolvemos dinámicamente filtrando por nombre.

  // /api/ine/epf-overview · KPIs grandes
  if (action === 'epf-overview') {
    const [tabCorrientes, tabConstantes] = await Promise.all([
      ineFetch('/DATOS_TABLA/73778?nult=1'),
      ineFetch('/DATOS_TABLA/75003?nult=1'),
    ])
    if (
      (tabCorrientes.error && tabConstantes.error) ||
      (!Array.isArray(tabCorrientes) && !Array.isArray(tabConstantes))
    ) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'INE WSTempus · EPF', tabCorrientes.error || tabConstantes.error || 'unexpected shape'),
      })
    }
    const findHogar = (rows: any[], filterCorrientes: boolean) => {
      if (!Array.isArray(rows)) return null
      const want = filterCorrientes ? 'Precios corrientes' : 'Precios constantes'
      // Total nacional · Índice general · Gasto total · Gasto medio por hogar
      const s = rows.find((r) => {
        const n = (r.Nombre || '')
        return n.includes('Índice general')
          && n.includes('Gasto total')
          && n.includes('Gasto medio por hogar')
          && n.includes(want)
          && n.includes('Dato base')
      })
      return s ? { cod: s.COD, value: s.Data?.[0]?.Valor, year: s.Data?.[0]?.Anyo } : null
    }
    const findPersona = (rows: any[]) => {
      if (!Array.isArray(rows)) return null
      const s = rows.find((r) => {
        const n = (r.Nombre || '')
        return n.includes('Índice general')
          && n.includes('Gasto total')
          && n.includes('Gasto medio por persona')
          && n.includes('Precios corrientes')
          && n.includes('Dato base')
      })
      return s ? { cod: s.COD, value: s.Data?.[0]?.Valor, year: s.Data?.[0]?.Anyo } : null
    }
    const findUC = (rows: any[]) => {
      if (!Array.isArray(rows)) return null
      const s = rows.find((r) => {
        const n = (r.Nombre || '')
        return n.includes('Índice general')
          && n.includes('Gasto total')
          && n.includes('Gasto medio por unidad de consumo')
          && n.includes('Precios corrientes')
          && n.includes('Dato base')
      })
      return s ? { cod: s.COD, value: s.Data?.[0]?.Valor, year: s.Data?.[0]?.Anyo } : null
    }
    const hogarCorr = findHogar(tabCorrientes, true)
    const hogarConst = findHogar(tabConstantes, false)
    const persona = findPersona(tabCorrientes)
    const uc = findUC(tabCorrientes)
    return NextResponse.json({
      ok: true,
      data_quality: quality('live', 'INE EPF · Encuesta de Presupuestos Familiares'),
      year: hogarCorr?.year ?? null,
      gasto_medio_hogar_corrientes: hogarCorr,
      gasto_medio_hogar_constantes: hogarConst,
      gasto_medio_persona_corrientes: persona,
      gasto_medio_unidad_consumo_corrientes: uc,
      methodology: 'EPF anual · COICOP 2018 · 24.000 hogares encuestados · INE WSTempus tablas 73778 (corrientes) + 75003 (constantes)',
    })
  }

  // /api/ine/epf-grupos · 13 grupos COICOP con gasto + share
  if (action === 'epf-grupos') {
    // Usamos corrientes para % share contemporáneo
    const data = await ineFetch('/DATOS_TABLA/73778?nult=1')
    if (data.error || !Array.isArray(data)) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'INE WSTempus · EPF grupos', data.error || 'unexpected shape'),
      })
    }
    // Buscamos: Total Nacional · {Grupo} · Dato base · Gasto total · Gasto medio por hogar · Precios corrientes
    // Excluimos "Índice general"
    const grupos: { name: string; cod: string; value: number; year: number }[] = []
    for (const s of data as any[]) {
      const n = s.Nombre || ''
      if (
        n.includes('Gasto medio por hogar') &&
        n.includes('Gasto total') &&
        n.includes('Precios corrientes') &&
        n.includes('Dato base') &&
        !n.includes('Índice general') &&
        !n.includes('Gasto monetario')
      ) {
        const grp = n.split('.')[0].trim()
        // Filtramos para sólo grupos de 1er nivel · evitamos sub-grupos largos
        // Los grupos COICOP 2018 de 2 dígitos suelen tener nombres concretos
        if (grp.length < 80 && grp.length > 3) {
          const last = s.Data?.[0]
          if (last?.Valor != null) {
            // Dedupe: si ya tenemos este grupo, saltamos
            if (!grupos.find((g) => g.name === grp)) {
              grupos.push({ name: grp, cod: s.COD, value: last.Valor, year: last.Anyo })
            }
          }
        }
      }
    }
    // Ordenamos por valor desc
    grupos.sort((a, b) => b.value - a.value)
    const totalSum = grupos.reduce((acc, g) => acc + g.value, 0)
    return NextResponse.json({
      ok: true,
      data_quality: quality('live', 'INE EPF · Gasto medio por hogar por grupo COICOP'),
      year: grupos[0]?.year ?? null,
      n_grupos: grupos.length,
      total_sum_eur: totalSum,
      grupos: grupos.map((g) => ({ ...g, share_pct: totalSum > 0 ? (g.value / totalSum) * 100 : 0 })),
      methodology: 'EPF · COICOP 2018 · 13 grupos de gasto · precios corrientes · tabla 73778 INE',
    })
  }

  // /api/ine/epf-ccaa · ranking por CCAA del gasto medio por hogar
  if (action === 'epf-ccaa') {
    const data = await ineFetch('/DATOS_TABLA/73991?nult=1')
    if (data.error || !Array.isArray(data)) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'INE WSTempus · EPF CCAA', data.error || 'unexpected shape'),
      })
    }
    // CCAA tiene un map único · cada CCAA tiene su gasto medio por hogar Índice general
    const ccaaMap = new Map<string, { cod: string; value: number; year: number }>()
    for (const s of data as any[]) {
      const n = s.Nombre || ''
      // Total Nacional / Andalucía / etc. · Índice general · Dato base · Gasto medio por hogar
      if (
        n.includes('Gasto medio por hogar') &&
        n.includes('Índice general') &&
        n.includes('Dato base')
      ) {
        const ccaa = n.split('.')[0].trim()
        const last = s.Data?.[0]
        if (last?.Valor != null && !ccaaMap.has(ccaa)) {
          ccaaMap.set(ccaa, { cod: s.COD, value: last.Valor, year: last.Anyo })
        }
      }
    }
    const nacional = ccaaMap.get('Total Nacional')
    const ccaa = Array.from(ccaaMap.entries())
      .filter(([name]) => name !== 'Total Nacional')
      .map(([name, v]) => ({
        name, cod: v.cod, value: v.value, year: v.year,
        delta_vs_nacional: nacional ? v.value - nacional.value : null,
        ratio_vs_nacional: nacional && nacional.value > 0 ? (v.value / nacional.value) * 100 : null,
      }))
      .sort((a, b) => b.value - a.value)
    return NextResponse.json({
      ok: true,
      data_quality: quality('live', 'INE EPF · Gasto medio por hogar por CCAA'),
      year: nacional?.year ?? null,
      nacional,
      n_ccaa: ccaa.length,
      ccaa,
      methodology: 'EPF · tabla 73991 INE · COICOP 2018 · precios corrientes',
    })
  }

  // /api/ine/epf-historico · serie temporal Total Nacional · gasto medio hogar
  if (action === 'epf-historico') {
    const n = url.searchParams.get('n') || '12'
    // Tabla 28486 = serie histórica base 2006 (continúa hasta 2024)
    // Buscamos serie: Base 2006. Anual. Total Nacional. Índice general. Dato base. Gasto medio por hogar.
    const data = await ineFetch(`/DATOS_TABLA/28486?nult=${n}`)
    if (data.error || !Array.isArray(data)) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'INE WSTempus · EPF histórico', data.error || 'unexpected shape'),
      })
    }
    // Primera serie tipicamente: gasto medio hogar nacional
    const hogar = (data as any[]).find((s) => {
      const n = s.Nombre || ''
      return n.includes('Total Nacional') &&
        n.includes('Índice general') &&
        n.includes('Dato base') &&
        n.includes('Gasto medio por hogar')
    })
    const persona = (data as any[]).find((s) => {
      const n = s.Nombre || ''
      return n.includes('Total Nacional') &&
        n.includes('Índice general') &&
        n.includes('Dato base') &&
        n.includes('Gasto medio por persona')
    })
    if (!hogar) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'INE WSTempus · EPF histórico', 'serie no encontrada'),
      })
    }
    return NextResponse.json({
      ok: true,
      data_quality: quality('live', 'INE EPF · Serie histórica Total Nacional'),
      hogar: { cod: hogar.COD, name: hogar.Nombre, points: mapInePoints(hogar) },
      persona: persona ? { cod: persona.COD, name: persona.Nombre, points: mapInePoints(persona) } : null,
      methodology: 'EPF · tabla 28486 INE · base 2006 · serie hasta 2024',
    })
  }

  // /api/ine/serie?cod={code}&n={n} · query libre por código de serie
  if (action === 'serie') {
    const cod = url.searchParams.get('cod')
    const n = url.searchParams.get('n') || '12'
    if (!cod) {
      return NextResponse.json({ ok: false, error: 'cod parameter required (ej. IPC290750)' })
    }
    const data = await ineFetch(`/DATOS_SERIE/${cod}?nult=${n}`)
    if (data.error) {
      return NextResponse.json({
        ok: false,
        cod,
        data_quality: quality('missing', 'INE WSTempus', data.error),
      })
    }
    return NextResponse.json({
      ok: true,
      cod,
      data_quality: quality('live', `INE WSTempus · ${cod}`),
      series_name: data?.Nombre,
      points: mapInePoints(data),
      tipo_dato: data?.T3_TipoDato,
      periodicidad: data?.T3_Periodicidad,
    })
  }

  // /api/ine/tabla?id={id}&nult={n} · query libre por ID de tabla
  if (action === 'tabla') {
    const id = url.searchParams.get('id')
    const nult = url.searchParams.get('nult') || '5'
    if (!id) {
      return NextResponse.json({ ok: false, error: 'id parameter required' })
    }
    const data = await ineFetch(`/DATOS_TABLA/${id}?nult=${nult}`)
    if (data.error || !Array.isArray(data)) {
      return NextResponse.json({
        ok: false,
        id,
        data_quality: quality('missing', 'INE WSTempus', data.error || 'unexpected shape'),
      })
    }
    return NextResponse.json({
      ok: true,
      id,
      data_quality: quality('live', `INE WSTempus · tabla ${id}`),
      n_series: data.length,
      series_preview: (data as any[]).slice(0, 10).map((s) => ({
        cod: s.COD,
        name: s.Nombre,
        latest: s.Data?.[0]
          ? { period: s.Data[0].T3_Periodo + ' ' + s.Data[0].Anyo, value: s.Data[0].Valor }
          : null,
      })),
    })
  }

  // /api/ine/calendario?dias=45 · Sprint N18
  // Calendario REAL de próximas publicaciones INE vía WSTempus CALENDARIO.
  // Endpoint nativo INE: GET /CALENDARIO/{fini}/{ffin} (formato YYYYMMDD).
  if (action === 'calendario') {
    const reqUrl = new URL(req.url)
    const dias = Math.min(120, Math.max(7, Number(reqUrl.searchParams.get('dias') || 45)))
    const today = new Date()
    const ffin = new Date(today.getTime() + dias * 86400000)
    const fmt = (d: Date) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
    const path = `/CALENDARIO/${fmt(today)}/${fmt(ffin)}`
    const data = await ineFetch(path)
    if (data?.error) {
      return NextResponse.json({
        ok: false,
        data_quality: quality('missing', 'INE WSTempus CALENDARIO', data.error),
      })
    }
    const items = Array.isArray(data) ? data : []
    // INE devuelve cada item con FechaPublicacion timestamp ms + Nombre + IdOperacion
    const events = items
      .map((it: any) => {
        const ts = it.FechaPublicacion ?? it.Fecha ?? null
        if (!ts) return null
        const d = new Date(typeof ts === 'number' ? ts : Date.parse(String(ts)))
        if (isNaN(d.getTime())) return null
        const isoDate = d.toISOString().slice(0, 10)
        const daysFromNow = Math.round((d.getTime() - today.getTime()) / 86400000)
        return {
          date: isoDate,
          source: 'INE' as const,
          indicator: String(it.Nombre || it.NombreOperacion || 'Publicación INE').slice(0, 120),
          operation_id: it.IdOperacion ?? null,
          url: it.IdOperacion
            ? `https://www.ine.es/dyngs/INEbase/listaoperaciones.htm`
            : 'https://www.ine.es/calendario',
          importance: 'medium' as const,
          daysFromNow,
        }
      })
      .filter((e: any): e is NonNullable<typeof e> => e !== null)
      .sort((a: { daysFromNow: number }, b: { daysFromNow: number }) => a.daysFromNow - b.daysFromNow)
    return NextResponse.json({
      ok: events.length > 0,
      data_quality: quality('live', 'INE WSTempus CALENDARIO'),
      horizon_days: dias,
      n_events: events.length,
      events: events.slice(0, 80),
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400',
      },
    })
  }

  return NextResponse.json(
    {
      ok: false,
      available_endpoints: [
        'GET /api/ine/health',
        'GET /api/ine/cnt-desglose?n=12 · PIB trimestral + 4 componentes (CNT base 2010 SA)',
        'GET /api/ine/cnt-extra?n=12   · exportaciones + importaciones',
        'GET /api/ine/epa?n=20         · tasa paro armonizado',
        'GET /api/ine/ipc?n=24         · IPC variación anual + mensual + acumulada',
        'GET /api/ine/ipv?n=20         · índice precios vivienda',
        'GET /api/ine/dirce-creacion?n=12 · demografía empresarial DIRCE',
        'GET /api/ine/etcl?n=12        · ETCL coste laboral trimestral',
        'GET /api/ine/frontur?n=24     · Frontur turistas internacionales',
        'GET /api/ine/epf-overview     · EPF KPIs gasto medio hogar/persona/UC',
        'GET /api/ine/epf-grupos       · EPF 13 grupos COICOP 2018 + share %',
        'GET /api/ine/epf-ccaa         · EPF ranking 17 CCAA gasto medio hogar',
        'GET /api/ine/epf-historico?n=12 · EPF serie histórica nacional',
        'GET /api/ine/calendario?dias=45 · Sprint N18 · calendario REAL próximas publicaciones',
        'GET /api/ine/serie?cod=CNTR6654&n=12 · query libre por código',
        'GET /api/ine/tabla?id=67824&nult=5 · query libre por tabla',
      ],
      example_codes: {
        cnt_pib: 'CNTR6654',
        cnt_consumo_hogares: 'CNTR7158',
        cnt_consumo_aapp: 'CNTR7188',
        cnt_inversion: 'CNTR7213',
        cnt_exterior_aportacion: 'CNTR7264',
        ipc_anual: 'IPC290750',
        epa_paro_general: 'EPA86913',
      },
    },
    { status: 404 },
  )
}
