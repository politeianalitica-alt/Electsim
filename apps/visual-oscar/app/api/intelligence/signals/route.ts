import { NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// intelligence.py · GET /intelligence/signals
type Level = 'amarillo' | 'naranja' | 'rojo' | 'rojo-parpadeante'
type Category = 'Mercados' | 'Gobierno' | 'Parlamento' | 'Encuestas' | 'Geopolítica' | 'Medios' | 'Riesgo'

interface Signal {
  id: string
  level: Level
  category: Category
  title: string
  description: string
  source: string
  ts: string
}

const BASE_SIGNALS: Signal[] = [
  { id:'a01', level:'rojo-parpadeante', category:'Riesgo',      title:'Prima de riesgo supera 110 pb',
    description:'El diferencial con el Bund alcanza 112 pb tras tercera sesión consecutiva al alza. Tesoro convoca reunión extraordinaria.',
    source:'Tesoro Público', ts:'18:42 · hoy' },
  { id:'a02', level:'rojo-parpadeante', category:'Gobierno',    title:'Junts retira apoyo a la legislatura',
    description:'Comunicado oficial: condicionan reincorporación a transferencia integral del IRPF antes del 30 jun.',
    source:'Junts per Catalunya', ts:'17:15 · hoy' },
  { id:'a03', level:'rojo',             category:'Parlamento',  title:'Decreto-ley convalidación al límite',
    description:'Mañana 11:00h se vota convalidación del decreto-ley 4/2026. Margen estimado: ±2 escaños.',
    source:'Congreso · Pleno', ts:'16:30 · hoy' },
  { id:'a04', level:'rojo',             category:'Mercados',    title:'IBEX 35 cae −1,8% en sesión',
    description:'El selectivo cierra en 11.040 puntos arrastrado por bancos (-2,4%) e inmobiliario (-3,1%).',
    source:'BME · cierre 17:35', ts:'17:35 · hoy' },
  { id:'a05', level:'naranja',          category:'Encuestas',   title:'PP supera 33% en sondeo Sigma Dos',
    description:'Tracking diario: PP 33,2% (+0,4) · PSOE 26,1% (-0,3) · VOX 12,8% (+0,2). Trabajo de campo 24-26 abr.',
    source:'Sigma Dos / El Mundo', ts:'14:00 · hoy' },
  { id:'a06', level:'naranja',          category:'Geopolítica', title:'Aranceles EE.UU. al sector agroalimentario',
    description:'Anuncio aranceles 12% sobre aceite de oliva y vino tinto. Impacto estimado: 380 M€ exportaciones.',
    source:'USTR · Washington', ts:'13:20 · hoy' },
  { id:'a07', level:'naranja',          category:'Parlamento',  title:'PNV exige reunión bilateral antes 15 mayo',
    description:'Ortuzar advierte que sin avances en transferencia ferroviaria revisará apoyos.',
    source:'EAJ-PNV · prensa', ts:'17:45 · ayer' },
  { id:'a08', level:'amarillo',         category:'Medios',      title:'#MociónCensura trending top 1 nacional',
    description:'56k tweets en 4 horas tras intervención de Feijóo. Sentimiento neto: -0,42 (negativo).',
    source:'Politeia · Monitor RRSS', ts:'12:30 · hoy' },
  { id:'a09', level:'amarillo',         category:'Encuestas',   title:'Sumar pierde 0,8 pp en franja 25-44',
    description:'Tracking sociológico interno: el desgaste se concentra en clase media urbana.',
    source:'Politeia Lab', ts:'10:50 · hoy' },
  { id:'a10', level:'amarillo',         category:'Gobierno',    title:'Sánchez recibe a presidentes autonómicos',
    description:'Reunión informal con CCAA del PSOE el viernes para coordinar narrativa presupuestaria.',
    source:'Moncloa', ts:'09:15 · hoy' },
  { id:'a11', level:'rojo',             category:'Riesgo',      title:'Riesgo político sube a 38/100 (MEDIO-ALTO)',
    description:'El Termómetro de Riesgo Político salta 12 puntos en 48h por confluencia de factores.',
    source:'Politeia · Termómetro', ts:'08:00 · hoy' },
]

export async function GET() {
  const real = await fromBackend<{ signals: Signal[] }>('/intelligence/signals')
  if (real && Array.isArray(real.signals)) {
    return NextResponse.json(withMeta(real, 'backend'))
  }
  // Mock con un campo derivado del minuto actual para que cambie ligeramente
  // y demuestre que el endpoint está vivo.
  const minute = new Date().getMinutes()
  const signals = BASE_SIGNALS.map((s, i) => ({
    ...s,
    // pequeño jitter en el ts para simular actualización
    ts: i === 0 ? `${String(minute).padStart(2, '0')}:42 · hoy` : s.ts,
  }))
  return NextResponse.json(withMeta({ signals, total: signals.length }, 'mock'))
}
