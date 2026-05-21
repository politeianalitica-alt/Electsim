import { NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'
import type { MorningBriefing } from '@/lib/api-types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Proxy a politeia_v3.py · GET /api/briefings/morning?workspace_id=default
// Devuelve un MorningBriefing completo (shape real del backend)
// Si el backend no responde, fallback a mock con shape idéntico.

const FALLBACK_BRIEFING: MorningBriefing = {
  date: '',
  generated_at: '',
  tenant_id: 'demo',
  workspace_id: 'default',
  executive_summary: 'Buenos días. Te resumo cómo está la mañana. El PP sigue por delante — sube 0,4 puntos esta semana — y el PSOE aguanta el tipo tras la rueda de prensa del presidente. La vivienda no afloja: las menciones se han disparado un 18% en 24 horas y la conversación pública está más cabreada que asustada. La amnistía vuelve a portada por dos decisiones judiciales que están dividiendo a Junts. Y una buena noticia para Moncloa: el IPC subyacente ha bajado más de lo esperado, así que tienen margen para mover algo en lo fiscal antes de que acabe el semestre. Vamos al detalle.',
  key_alerts: [
    { title: 'Al PP se le escapan los mayores',       level: 'high',     body: 'Tres sondeos seguidos detectan que pierde voto en +55 años en Cataluña y País Vasco. Ya no es puntual: es un patrón.' },
    { title: 'La vivienda está al rojo vivo',         level: 'medium',   body: 'Las menciones suben un 18% y no se frenan. Si no se responde con propuestas, el tema seguirá marcando la agenda.' },
    { title: 'Junts puede bloquear esta semana',      level: 'high',     body: 'Hay riesgo real de que paralicen la comisión de Justicia. Conviene tener un plan B antes del jueves.' },
    { title: 'Sube la tensión en el Congreso',        level: 'critical', body: 'El termómetro político ha pegado un salto de 12 puntos en dos días. Mantente alerta — todo apunta a una semana caliente.' },
  ],
  top_stories: [
    { title: 'El Tribunal Constitucional admite a trámite el recurso del PP contra la amnistía', source: 'El País',     relevance: 0.92 },
    { title: 'Sumar exige al PSOE acelerar la reforma del IRPF',                                  source: 'elDiario.es', relevance: 0.81 },
    { title: 'VOX rompe gobierno en una nueva CCAA por desacuerdo en política migratoria',         source: 'ABC',         relevance: 0.78 },
    { title: 'El Banco de España revisa al alza la previsión de PIB 2026',                         source: 'Cinco Días',  relevance: 0.74 },
    { title: 'Investigación judicial al hermano de la ex pareja de un alto cargo de Moncloa',      source: 'OK Diario',   relevance: 0.69 },
  ],
  active_narratives: [
    { frame_label: 'La vivienda como problema generacional', velocity: 'up',     recommended_action: 'Toca sacar un mensaje con propuestas concretas. Sin propuestas, esto no se desinfla.' },
    { frame_label: 'Lawfare contra el gobierno',             velocity: 'up',     recommended_action: 'Mira cómo se amplifica esto y empieza a montar la respuesta narrativa antes de que cale.' },
    { frame_label: 'Pactos PP-VOX en CCAA',                  velocity: 'stable', recommended_action: 'Ojo a las tensiones internas — están ahí, aunque ahora no se vean.' },
  ],
  risk_signals: [],
  legislative_updates: [],
  electoral_snapshot: { itpe: 52.3, top_parties: { PP: 33.2, PSOE: 28.5, VOX: 11.3 }, trend: 'up' },
  three_questions: [
 '¿Aguanta el PP arriba si la vivienda le sigue comiendo voto en las ciudades?',
 '¿Se atreverá el PSOE a mover ficha en lo fiscal antes de que acabe el semestre?',
 '¿Cuánto daña a la coalición si Junts sigue bloqueando? Pensemos a 12 meses.',
  ],
  analyst_note: 'Semana clave. Quien mueva el voto de los +55 marca el ritmo. Atención ahí.',
  mode: 'demo',
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const workspace = url.searchParams.get('workspace_id') || 'default'

  // Backend real ElectSim FastAPI · politeia_v3.py
  const real = await fromBackend<MorningBriefing>(
 `/api/briefings/morning?workspace_id=${encodeURIComponent(workspace)}`
  )
  if (real && real.executive_summary) {
    return NextResponse.json(withMeta(real, 'backend'))
  }

  // Fallback mock con shape idéntico al backend
  return NextResponse.json(withMeta({
    ...FALLBACK_BRIEFING,
    date: new Date().toISOString().slice(0, 10),
    generated_at: new Date().toISOString(),
  }, 'mock'))
}
