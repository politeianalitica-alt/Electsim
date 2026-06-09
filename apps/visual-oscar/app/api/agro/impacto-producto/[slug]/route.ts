/**
 * GET /api/agro/impacto-producto/[slug]
 *
 * Análisis Gemini del impacto de un producto agrícola del catálogo sobre
 * la agricultura y la economía española. Recibe el snapshot ya calculado
 * (precio actual + variación + contexto España) y devuelve un análisis
 * estructurado con cuatro lecturas: titular, factores, riesgo, oportunidad.
 *
 * Modelo: gemini-2.0-flash-lite (default del cliente · cuota generosa).
 * Cache 4h por slug.
 *
 * Degradación honesta: si Gemini cae devuelve `ok: false` con el motivo;
 * la UI muestra un mensaje claro · NO se inventa análisis.
 */
import { NextRequest, NextResponse } from 'next/server'
import { PRODUCTOS_AGRO, type ProductoAgro } from '@/lib/agro/catalogos'
import { fetchYahooSnapshot, type YahooQuoteSnapshot } from '@/lib/agro/sources/yahoo-agro'
import { fetchFredAgro } from '@/lib/agro/sources/fred-agro'
import { generateJSON } from '@/lib/ai/gemini-client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Snapshot de precio multi-fuente: intenta Yahoo (futuros, en vivo); si falla
 * (p.ej. bloqueo de IP del datacenter), cae a FRED (IMF Global Price mensual).
 * Garantiza que el análisis Gemini siempre tenga una cifra de referencia.
 */
async function obtenerSnapshot(
  producto: ProductoAgro
): Promise<{ snap: YahooQuoteSnapshot; fuente: string } | null> {
  if (producto.ticker) {
    const y = await fetchYahooSnapshot(producto.ticker)
    if (y && y.price != null) return { snap: y, fuente: 'Yahoo Finance · futuros' }
  }
  if (producto.fred_slug) {
    const serie = await fetchFredAgro(producto.fred_slug)
    const pts = serie?.points.filter((p) => p.value != null) ?? []
    const last = pts[pts.length - 1]
    const prev = pts[pts.length - 2]
    if (last) {
      const price = last.value as number
      const previous = (prev?.value as number) ?? null
      const change = previous != null ? Number((price - previous).toFixed(2)) : null
      const change_pct = previous != null && previous !== 0 ? Number((((price - previous) / previous) * 100).toFixed(2)) : null
      return {
        snap: {
          symbol: serie!.id,
          price,
          previous_close: previous,
          change,
          change_pct,
          currency: serie!.unidad.startsWith('USD') ? 'USD' : serie!.unidad,
          ts: null,
          spark: pts.slice(-6).map((p) => p.value as number),
        },
        fuente: `FRED · ${serie!.label}`,
      }
    }
  }
  return null
}

interface ImpactoOutput {
  titular: string
  resumen: string
  factores: string[]
  riesgo: string
  oportunidad: string
  efecto_en_espana: string
  confianza: 'alta' | 'media' | 'baja'
}

const SCHEMA = {
  type: 'object',
  properties: {
    titular: { type: 'string', description: 'Una frase breve (<120 chars) que resuma qué está pasando' },
    resumen: { type: 'string', description: 'Análisis de 2-3 frases de la situación actual del producto' },
    factores: {
      type: 'array',
      items: { type: 'string' },
      description: '2-4 factores clave (macro, climáticos, geopolíticos) que explican el movimiento',
    },
    riesgo: { type: 'string', description: 'Principal riesgo si la tendencia continúa' },
    oportunidad: { type: 'string', description: 'Principal oportunidad si la tendencia se modera o invierte' },
    efecto_en_espana: {
      type: 'string',
      description:
        'Efecto concreto sobre la agricultura, ganadería o industria alimentaria española según el rol declarado del país (productor / exportador / importador)',
    },
    confianza: {
      type: 'string',
      enum: ['alta', 'media', 'baja'],
      description: 'Confianza en el análisis dado el contexto y la magnitud del movimiento',
    },
  },
  required: ['titular', 'resumen', 'factores', 'riesgo', 'oportunidad', 'efecto_en_espana', 'confianza'],
}

const SYSTEM = `Eres un analista económico especializado en mercados agroalimentarios europeos y españoles.
Recibes el snapshot de un commodity agrícola (precio actual, variación, contrato, rol de España)
y devuelves un análisis estructurado JSON. Tono profesional, conciso, sin emojis. Cita factores
verificables (macro, climáticos, geopolíticos, regulatorios). Si el dato es ruidoso o el movimiento
no es significativo, asígnale confianza "baja" y explícalo. Nunca inventes cifras concretas
distintas a las del prompt.`

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  const producto = PRODUCTOS_AGRO.find((p) => p.id === params.slug)
  if (!producto) {
    return NextResponse.json(
      { ok: false, data: null, error: `producto desconocido: ${params.slug}`, fuente: 'catálogo Politeia' },
      { status: 404 }
    )
  }
  const snapRes = await obtenerSnapshot(producto)
  if (!snapRes) {
    return NextResponse.json(
      {
        ok: false,
        data: null,
        fuente: 'Yahoo/FRED + Gemini',
        fuente_url: 'https://finance.yahoo.com/commodities',
        fuentes_error: ['sin precio en vivo (Yahoo) ni histórico (FRED) para este producto'],
        producto: { id: producto.id, nombre: producto.nombre, ticker: producto.ticker },
      },
      { headers: { 'Cache-Control': 's-maxage=600, stale-while-revalidate=1800' } }
    )
  }
  const snap = snapRes.snap
  const snapFuente = snapRes.fuente

  const prompt = [
    `Producto: ${producto.nombre}`,
    `Contrato: ${producto.contrato}`,
    `Categoría: ${producto.categoria}`,
    `Unidad: ${producto.unidad}`,
    `Rol de España: ${producto.rol_espana}`,
    `Precio actual: ${snap.price} ${snap.currency ?? ''}`,
    snap.previous_close != null ? `Cierre anterior: ${snap.previous_close}` : '',
    snap.change_pct != null ? `Variación diaria: ${snap.change_pct > 0 ? '+' : ''}${snap.change_pct}%` : '',
    snap.spark.length > 1 ? `Mini-serie cierres recientes: ${snap.spark.join(', ')}` : '',
    '',
    'Devuelve un análisis JSON con la forma del schema. Sé concreto. Cita factores verificables.',
  ]
    .filter(Boolean)
    .join('\n')

  try {
    const analysis = await generateJSON<ImpactoOutput>({
      system: SYSTEM,
      messages: [{ role: 'user', content: prompt }],
      jsonSchema: SCHEMA,
      temperature: 0.3,
      maxTokens: 700,
    })
    return NextResponse.json(
      {
        ok: true,
        data: {
          producto: {
            id: producto.id,
            nombre: producto.nombre,
            categoria: producto.categoria,
            unidad: producto.unidad,
            ticker: producto.ticker,
            rol_espana: producto.rol_espana,
          },
          snapshot: snap,
          analisis: analysis,
        },
        fuente: `${snapFuente} + Google Gemini · gemini-2.0-flash-lite`,
        fuente_url: producto.ticker
          ? `https://finance.yahoo.com/quote/${encodeURIComponent(producto.ticker)}`
          : 'https://fred.stlouisfed.org',
        generated_by_llm: true,
        modelo: process.env.GEMINI_MODEL || 'gemini-2.0-flash-lite',
        generado_en: 'ISR · cache 4h',
      },
      { headers: { 'Cache-Control': 's-maxage=14400, stale-while-revalidate=28800' } }
    )
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        data: { producto, snapshot: snap, analisis: null },
        fuente: 'Yahoo Finance + Gemini',
        fuente_url: 'https://finance.yahoo.com/commodities',
        fuentes_error: [`gemini · ${e instanceof Error ? e.message : 'sin detalle'}`],
        generated_by_llm: false,
      },
      { headers: { 'Cache-Control': 's-maxage=600, stale-while-revalidate=1800' } }
    )
  }
}
