import type { SignalsSnapshot, RiskDominio, NivelRelevancia } from '@/types/intelligence'
import { MOCK_SIGNALS, nowIso } from '../_mock'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BACKEND = process.env.BACKEND_URL ?? ''

const DOMINIOS: RiskDominio[] = ['politico', 'regulatorio', 'reputacional', 'narrativo', 'electoral', 'institucional', 'geopolitico', 'economico']
const RELEVANCIAS: NivelRelevancia[] = ['critica', 'alta', 'media', 'baja']

// Legacy shape for compatibility with /alertas page.
type Level = 'amarillo' | 'naranja' | 'rojo' | 'rojo-parpadeante'
type Category = 'Mercados' | 'Gobierno' | 'Parlamento' | 'Encuestas' | 'Geopolítica' | 'Medios' | 'Riesgo'
interface LegacySignal {
  id: string
  level: Level
  category: Category
  title: string
  description: string
  source: string
  ts: string
}

const LEGACY_SIGNALS: LegacySignal[] = [
  { id: 'a01', level: 'rojo-parpadeante', category: 'Riesgo', title: 'Prima de riesgo supera 110 pb', description: 'El diferencial con el Bund alcanza 112 pb tras tercera sesión consecutiva al alza.', source: 'Tesoro Público', ts: '18:42 · hoy' },
  { id: 'a02', level: 'rojo-parpadeante', category: 'Gobierno', title: 'Junts retira apoyo a la legislatura', description: 'Comunicado oficial: condicionan reincorporación a transferencia integral del IRPF antes del 30 jun.', source: 'Junts per Catalunya', ts: '17:15 · hoy' },
  { id: 'a03', level: 'rojo', category: 'Parlamento', title: 'Decreto-ley convalidación al límite', description: 'Mañana 11:00h se vota convalidación del decreto-ley 4/2026.', source: 'Congreso · Pleno', ts: '16:30 · hoy' },
  { id: 'a04', level: 'rojo', category: 'Mercados', title: 'IBEX 35 cae 1,8% en sesión', description: 'El selectivo cierra en 11.040 puntos arrastrado por bancos.', source: 'BME · cierre 17:35', ts: '17:35 · hoy' },
  { id: 'a05', level: 'naranja', category: 'Encuestas', title: 'PP supera 33% en sondeo Sigma Dos', description: 'Tracking diario: PP 33,2% · PSOE 26,1% · VOX 12,8%.', source: 'Sigma Dos / El Mundo', ts: '14:00 · hoy' },
  { id: 'a06', level: 'naranja', category: 'Geopolítica', title: 'Aranceles EE.UU. al sector agroalimentario', description: 'Anuncio aranceles 12% sobre aceite de oliva y vino tinto.', source: 'USTR · Washington', ts: '13:20 · hoy' },
  { id: 'a07', level: 'naranja', category: 'Parlamento', title: 'PNV exige reunión bilateral antes 15 mayo', description: 'Ortuzar advierte que sin avances en transferencia ferroviaria revisará apoyos.', source: 'EAJ-PNV', ts: '17:45 · ayer' },
  { id: 'a08', level: 'amarillo', category: 'Medios', title: 'Hashtag MociónCensura trending top 1 nacional', description: '56k tweets en 4 horas tras intervención de Feijóo.', source: 'Politeia · Monitor RRSS', ts: '12:30 · hoy' },
  { id: 'a09', level: 'amarillo', category: 'Encuestas', title: 'Sumar pierde 0,8 pp en franja 25-44', description: 'Tracking sociológico interno.', source: 'Politeia Lab', ts: '10:50 · hoy' },
  { id: 'a10', level: 'amarillo', category: 'Gobierno', title: 'Sánchez recibe a presidentes autonómicos', description: 'Reunión informal con CCAA del PSOE el viernes.', source: 'Moncloa', ts: '09:15 · hoy' },
  { id: 'a11', level: 'rojo', category: 'Riesgo', title: 'Riesgo político sube a 38/100', description: 'El Termómetro de Riesgo Político salta 12 puntos en 48h.', source: 'Politeia · Termómetro', ts: '08:00 · hoy' },
]

export async function GET(req: Request) {
  const url = new URL(req.url)
  const dominioParam = url.searchParams.get('dominio')
  const relevanciaParam = url.searchParams.get('relevancia')
  const legacy = url.searchParams.get('legacy')
  const dominio = (dominioParam && (DOMINIOS as string[]).includes(dominioParam)) ? dominioParam as RiskDominio : null
  const relevancia = (relevanciaParam && (RELEVANCIAS as string[]).includes(relevanciaParam)) ? relevanciaParam as NivelRelevancia : null

  try {
    if (BACKEND) {
      const res = await fetch(`${BACKEND}/api/v1/intelligence/signals${url.search}`, {
        headers: { 'X-API-Key': process.env.BACKEND_API_KEY ?? '' },
        next: { revalidate: 60 },
      })
      if (res.ok) return Response.json(await res.json())
    }
  } catch {}

  let items = MOCK_SIGNALS
  if (dominio) items = items.filter(s => s.dominio === dominio)
  if (relevancia) items = items.filter(s => s.relevancia === relevancia)
  const snap: SignalsSnapshot & { signals: LegacySignal[] } = {
    items,
    total: items.length,
    generado_en: nowIso(),
    signals: LEGACY_SIGNALS,
  }
  // If caller explicitly wants legacy-only, return that shape.
  if (legacy === '1') {
    return Response.json({ signals: LEGACY_SIGNALS, total: LEGACY_SIGNALS.length })
  }
  return Response.json(snap)
}
