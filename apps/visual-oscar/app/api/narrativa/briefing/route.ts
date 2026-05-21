import { NextResponse } from 'next/server'
import { callBackend, withMeta } from '@/lib/backend'
import type { BriefingDiario, BriefingItem } from '@/types/narrativa'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface MorningBriefingPayload {
  date: string
  generated_at: string
  tenant_id?: string
  workspace_id?: string
  executive_summary: string
  key_alerts: Array<{ title: string; level: string; body: string }>
  top_stories: Array<{
    title: string
    summary?: string
    source?: string
    url?: string
    published_at?: string
    sentiment?: number
    tags?: string[]
  }>
  metrics?: Record<string, unknown>
}

// Map backend alert level → frontend urgencia
function mapUrgencia(level: string): 'URGENTE' | 'ALTA' | 'NORMAL' {
  const l = level.toLowerCase()
  if (l === 'critical' || l === 'crítica' || l === 'urgente') return 'URGENTE'
  if (l === 'high' || l === 'alta') return 'ALTA'
  return 'NORMAL'
}

function inferType(title: string): BriefingItem['tipo'] {
  const t = title.toLowerCase()
  if (/eeuu|arancel|exterior|sanci|ucrania|israel|gaza|china|otan/.test(t)) return 'Geopolítica'
  if (/vivienda|salario|inflación|fiscal|impuest|empleo|paro|bce|euribor/.test(t)) return 'Economía'
  if (/ley|congreso|senado|boe|reforma|decret/.test(t)) return 'Legislativo'
  if (/eleccion|sondeo|encuesta|voto/.test(t)) return 'Electoral'
  if (/migra|frontera|seguridad|terrorismo/.test(t)) return 'Seguridad'
  if (/energ|brent|gas|petróleo|nuclear/.test(t)) return 'Energía'
  if (/narrativa|desinformación|bulo|deepfake/.test(t)) return 'Narrativa'
  return 'Social'
}

export async function GET() {
  const r = await callBackend<MorningBriefingPayload>('/api/briefings/morning', {
    cache: 'no-store',
  })

  if (r.data && (r.data.executive_summary || r.data.key_alerts)) {
    const d = r.data
    const items: BriefingItem[] = [
      // Executive summary as the first "Geopolítica/Social" item
      ...(d.executive_summary
        ? [{
            id: `summary-${d.date}`,
            titulo: 'Lo más importante de hoy',
            tipo: 'Social' as const,
            urgencia: 'ALTA' as const,
            resumen: d.executive_summary,
            implicaciones: [],
            fuentes: ['Politeia Brain'],
            tags: ['resumen', 'lo-importante'],
            fecha: d.generated_at ?? d.date,
            leido: false,
          }]
        : []),
      // Key alerts
      ...(d.key_alerts ?? []).map((a, i) => ({
        id: `alert-${i}-${d.date}`,
        titulo: a.title,
        tipo: inferType(a.title),
        urgencia: mapUrgencia(a.level),
        resumen: a.body,
        implicaciones: [],
        fuentes: [],
        tags: [a.level],
        fecha: d.generated_at ?? d.date,
        leido: false,
      })),
      // Top stories
      ...(d.top_stories ?? []).slice(0, 8).map((s, i) => ({
        id: `story-${i}-${d.date}`,
        titulo: s.title,
        tipo: inferType(s.title),
        urgencia: 'NORMAL' as const,
        resumen: s.summary ?? '',
        implicaciones: [],
        fuentes: s.source ? [s.source] : [],
        tags: s.tags ?? [],
        fecha: s.published_at ?? d.generated_at ?? d.date,
        leido: false,
      })),
    ]

    const briefing: BriefingDiario = {
      id: `b_${d.date}`,
      fecha: d.date,
      periodo: 'matinal',
      items,
      alertas_criticas: (d.key_alerts ?? []).filter(a =>
        ['critical', 'crítica', 'high', 'alta', 'urgente'].includes(a.level.toLowerCase()),
      ).length,
      total_items: items.length,
      generado_por: 'Politeia Brain · IA local',
    }

    return NextResponse.json(withMeta(briefing, 'backend', { latency_ms: r.latency_ms }))
  }

  // Honest empty fallback
  const empty: BriefingDiario = {
    id: '', fecha: new Date().toISOString().slice(0, 10), periodo: 'matinal', items: [],
    alertas_criticas: 0, total_items: 0,
    generado_por: 'Sistema · sin datos en este momento',
  }
  return NextResponse.json(withMeta(empty, 'mock', {
    warnings: r.error ? [`backend_unreachable:${r.error}`] : ['briefing_not_yet_generated'],
    latency_ms: r.latency_ms,
  }))
}
