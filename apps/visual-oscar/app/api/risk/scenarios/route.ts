import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || ''

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 90

export interface RiskScenario {
  title: string
  narrative: string
  probability_pct: number
  impact_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  horizon: string
  dimensions_affected: string[]
  triggers: string[]
  early_warnings: string[]
  mitigations: string[]
  key_actors: string[]
}

const MOCK_SCENARIOS: RiskScenario[] = [
  {
    title: 'Ruptura de Junts y bloqueo presupuestario',
    narrative: 'Junts retira el apoyo definitivo a la legislatura tras la falta de avance en la transferencia integral del IRPF, forzando un bloqueo del proyecto de presupuestos 2026 y abriendo escenario de moción de censura constructiva o adelanto electoral.',
    probability_pct: 42,
    impact_level: 'HIGH',
    horizon: '4-8 semanas',
    dimensions_affected: ['Institucional', 'Electoral', 'Económica'],
    triggers: [
      'Ortuzar/Nogueras endurecen tono en RAC1 esta semana',
      'Sin avances en bilateral Moncloa-Junts antes del 30 mayo',
      'Filtración de borradores fiscales sin la cláusula catalana',
    ],
    early_warnings: [
      'Variación en encuestas catalanas (CIS, GESOP) > 3 pp',
      'Voto Junts en comisión de Hacienda',
      'Tono mediático en El Punt Avui y NacióDigital',
    ],
    mitigations: [
      'Reunión bilateral con concesión parcial en cupo catalán',
      'Acuerdo de mínimos en cumplimiento de tratados',
    ],
    key_actors: ['Junts per Catalunya', 'PSOE', 'Moncloa', 'ERC'],
  },
  {
    title: 'Espiral de prima de riesgo > 130 pb',
    narrative: 'La prima de riesgo, en máximos del año, supera la barrera psicológica de los 130 pb por contagio de la inestabilidad política y revisión hawkish del BCE, forzando subasta extraordinaria del Tesoro y reacción del IBEX (-2/-4%).',
    probability_pct: 28,
    impact_level: 'CRITICAL',
    horizon: '2-6 semanas',
    dimensions_affected: ['Económica', 'Geopolítica', 'Media'],
    triggers: [
      'Nueva acta BCE más hawkish de lo esperado',
      'Downgrade de calificación crediticia por agencia',
      'Caída prolongada del bono alemán',
    ],
    early_warnings: [
      'Spread bono 10Y vs Bund supera 110 pb por > 5 días seguidos',
      'Anuncio de revisión de outlook por Moody\'s o Fitch',
    ],
    mitigations: [
      'Subasta extraordinaria con buena ratio de demanda',
      'Reunión Moncloa-BdE-AIReF coordinada',
    ],
    key_actors: ['BdE', 'Tesoro', 'BCE', 'AIReF', 'Moncloa'],
  },
  {
    title: 'Escalada narrativa vivienda + protesta urbana',
    narrative: 'La narrativa de crisis de vivienda alcanza pico mediático sostenido y deriva en convocatorias de manifestación masiva en Madrid y Barcelona, polarizando el debate y forzando reacción legislativa exprés del Gobierno con riesgo de rebote político.',
    probability_pct: 55,
    impact_level: 'MEDIUM',
    horizon: '3-6 semanas',
    dimensions_affected: ['Social', 'Media', 'Electoral'],
    triggers: [
      'Convocatoria masiva por colectivos urbanos antes de junio',
      'Nuevo informe Banco España alquileres con titular impactante',
      'Decisión judicial sobre ley vivienda en algún TSJ',
    ],
    early_warnings: [
      'Crecimiento sostenido > 25% menciones 7 días',
      'Sentiment neto < -0.40 en franja 25-44 años',
      'Trending #vivienda en X durante 3 días seguidos',
    ],
    mitigations: [
      'Anuncio de ampliación de zonas tensionadas',
      'Plan de aceleración rehabilitación viviendas vacías',
    ],
    key_actors: ['Ministerio de Vivienda', 'PSOE', 'Sumar', 'Comunidades de propietarios', 'Sindicatos vivienda'],
  },
]

export async function POST(req: NextRequest) {
  let body: unknown = {}
  try { body = await req.json() } catch { /* ignore */ }

  // Intenta backend si está configurado
  if (BACKEND) {
    try {
      const res = await fetch(`${BACKEND}/api/risk/scenarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body || {}),
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
      })
      if (res.ok) {
        const data = await res.json()
        if (data && (data.scenarios?.length || Array.isArray(data))) return NextResponse.json(data)
      }
    } catch { /* cae al mock */ }
  }

  // Fallback con 3 escenarios bien hechos
  return NextResponse.json({
    scenarios: MOCK_SCENARIOS,
    generated_at: new Date().toISOString(),
    _meta: { source: 'mock', ts: new Date().toISOString() },
  })
}
