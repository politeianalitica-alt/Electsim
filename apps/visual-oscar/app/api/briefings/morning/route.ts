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
  executive_summary: 'El PP consolida su liderazgo en intención de voto (+0,4 pp esta semana) mientras el PSOE mantiene posiciones tras la última intervención del presidente. La narrativa de vivienda continúa en aceleración (+18% menciones 24 h) con una emoción dominante de frustración. La amnistía vuelve al primer plano tras dos decisiones judiciales que dividen al socio Junts. En lo económico, el IPC subyacente sorprende a la baja, lo que abre margen al gobierno para una intervención en política fiscal antes del cierre del semestre.',
  key_alerts: [
    { title: 'Caída PP en sondeos territoriales', level: 'high',     body: 'Tres sondeos consecutivos muestran erosión en mayores de 55 años en Cataluña y País Vasco.' },
    { title: 'Narrativa vivienda alcanza pico',   level: 'medium',   body: 'Crecimiento sostenido +18% sin moderación visible.' },
    { title: 'Bloqueo Junts en comisión',         level: 'high',     body: 'Riesgo de obstrucción legislativa en comisión de Justicia esta semana.' },
    { title: 'Tensión parlamentaria en alza',     level: 'critical', body: 'El Termómetro de Riesgo Político salta 12 puntos en 48 h.' },
  ],
  top_stories: [
    { title: 'El Tribunal Constitucional admite a trámite el recurso del PP contra la amnistía', source: 'El País',     relevance: 0.92 },
    { title: 'Sumar exige al PSOE acelerar la reforma del IRPF',                                  source: 'elDiario.es', relevance: 0.81 },
    { title: 'VOX rompe gobierno en una nueva CCAA por desacuerdo en política migratoria',         source: 'ABC',         relevance: 0.78 },
    { title: 'El Banco de España revisa al alza la previsión de PIB 2026',                         source: 'Cinco Días',  relevance: 0.74 },
    { title: 'Investigación judicial al hermano de la ex pareja de un alto cargo de Moncloa',      source: 'OK Diario',   relevance: 0.69 },
  ],
  active_narratives: [
    { frame_label: 'Crisis de vivienda asequible',         velocity: 'up',     recommended_action: 'Diseñar mensaje de respuesta con propuestas concretas.' },
    { frame_label: 'Lawfare contra el gobierno',           velocity: 'up',     recommended_action: 'Vigilar amplificación y construir contra-frame.' },
    { frame_label: 'Pactos PP-VOX en CCAA',                velocity: 'stable', recommended_action: 'Monitorizar tensiones internas.' },
  ],
  risk_signals: [],
  legislative_updates: [],
  electoral_snapshot: { itpe: 52.3, top_parties: { PP: 33.2, PSOE: 28.5, VOX: 11.3 }, trend: 'up' },
  three_questions: [
    '¿Mantendrá el PP el liderazgo si la narrativa de vivienda erosiona su electorado urbano?',
    '¿Activará el PSOE una iniciativa fiscal antes del cierre del semestre?',
    '¿Qué impacto tiene el bloqueo de Junts en la coalición de investidura a 12 meses?',
  ],
  analyst_note: 'Semana de inflexión electoral. Vigilar señales de movilización en mayores de 55 años.',
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
