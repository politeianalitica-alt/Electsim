import type { SignalsSnapshot, RiskDominio, NivelRelevancia } from '@/types/intelligence'
import { NextResponse } from 'next/server'
import { callBackend, withMeta } from '@/lib/backend'
import { MOCK_SIGNALS, nowIso } from '../_mock'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const DOMINIOS: RiskDominio[] = ['politico', 'regulatorio', 'reputacional', 'narrativo', 'electoral', 'institucional', 'geopolitico', 'economico']
const RELEVANCIAS: NivelRelevancia[] = ['critica', 'alta', 'media', 'baja']

// Shape "legacy" usado por `/alertas` (frontend que migrará a items[]).
type Level = 'amarillo' | 'naranja' | 'rojo' | 'rojo-parpadeante'
type Category = 'Mercados' | 'Gobierno' | 'Parlamento' | 'Encuestas' | 'Geopolítica' | 'Medios' | 'Riesgo'
interface LegacySignal {
  id: string; level: Level; category: Category; title: string
  description: string; source: string; ts: string
}

/**
 * LEGACY_SIGNALS: snapshot del estado actual del Termómetro de Riesgo Político.
 * Mantenido como FALLBACK cuando el backend está caído. NO son datos en tiempo
 * real — el meta.source dirá 'mock' y la UI debe mostrar el badge correspondiente.
 */
const LEGACY_SIGNALS: LegacySignal[] = [
  { id: 'a01', level: 'rojo-parpadeante', category: 'Riesgo',     title: 'Prima de riesgo supera 110 pb', description: 'El diferencial con el Bund alcanza 112 pb tras tercera sesión consecutiva al alza.', source: 'Tesoro Público',        ts: '18:42 · hoy' },
  { id: 'a02', level: 'rojo-parpadeante', category: 'Gobierno',   title: 'Junts retira apoyo a la legislatura', description: 'Comunicado oficial: condicionan reincorporación a transferencia integral del IRPF antes del 30 jun.', source: 'Junts per Catalunya', ts: '17:15 · hoy' },
  { id: 'a03', level: 'rojo',             category: 'Parlamento', title: 'Decreto-ley convalidación al límite', description: 'Mañana 11:00h se vota convalidación del decreto-ley 4/2026.', source: 'Congreso · Pleno',   ts: '16:30 · hoy' },
  { id: 'a04', level: 'rojo',             category: 'Mercados',   title: 'IBEX 35 cae 1,8% en sesión', description: 'El selectivo cierra en 11.040 puntos arrastrado por bancos.', source: 'BME · cierre 17:35',  ts: '17:35 · hoy' },
  { id: 'a05', level: 'naranja',          category: 'Encuestas',  title: 'PP supera 33% en sondeo Sigma Dos', description: 'Tracking diario: PP 33,2% · PSOE 26,1% · VOX 12,8%.', source: 'Sigma Dos / El Mundo',     ts: '14:00 · hoy' },
  { id: 'a06', level: 'naranja',          category: 'Geopolítica',title: 'Aranceles EE.UU. al sector agroalimentario', description: 'Anuncio aranceles 12% sobre aceite de oliva y vino tinto.', source: 'USTR · Washington',  ts: '13:20 · hoy' },
  { id: 'a11', level: 'rojo',             category: 'Riesgo',     title: 'Riesgo político sube a 38/100', description: 'El Termómetro de Riesgo Político salta 12 puntos en 48h.', source: 'Politeia · Termómetro', ts: '08:00 · hoy' },
]

export async function GET(req: Request) {
  const url = new URL(req.url)
  const dominioParam   = url.searchParams.get('dominio')
  const relevanciaParam = url.searchParams.get('relevancia')
  const legacy = url.searchParams.get('legacy')
  const dominio = (dominioParam && (DOMINIOS as string[]).includes(dominioParam)) ? dominioParam as RiskDominio : null
  const relevancia = (relevanciaParam && (RELEVANCIAS as string[]).includes(relevanciaParam)) ? relevanciaParam as NivelRelevancia : null

  // Backend: usa el router existente `/intelligence/signals` (api/routers/intelligence.py)
  const params = new URLSearchParams()
  if (dominio) params.set('tipo', dominio)
  params.set('urgencia_min', '1')
  params.set('limit', '50')
  const result = await callBackend<unknown[]>(`/intelligence/signals?${params}`)

  if (Array.isArray(result.data) && result.data.length > 0) {
    return NextResponse.json(
      withMeta({ items: result.data, total: result.data.length, generado_en: nowIso() }, 'backend', {
        latency_ms: result.latency_ms,
      }),
    )
  }

  // Fallback: signals curadas. La UI verá _meta.source='mock'.
  let items = MOCK_SIGNALS
  if (dominio)    items = items.filter(s => s.dominio === dominio)
  if (relevancia) items = items.filter(s => s.relevancia === relevancia)
  const warnings = result.error ? [`backend_unreachable:${result.error}`] : ['empty_dataset']

  if (legacy === '1') {
    return NextResponse.json(
      withMeta({ signals: LEGACY_SIGNALS, total: LEGACY_SIGNALS.length }, 'mock', { warnings }),
    )
  }
  return NextResponse.json(
    withMeta(
      { items, total: items.length, generado_en: nowIso(), signals: LEGACY_SIGNALS } as
        SignalsSnapshot & { signals: LegacySignal[] },
      'mock',
      { warnings, latency_ms: result.latency_ms },
    ),
  )
}
