import { NextRequest, NextResponse } from 'next/server'
import { callBackend, withMeta } from '@/lib/backend'
import { mockAlerts } from '../_mocks'
import { fetchAllRiskFeeds, computeRiskScores } from '@/lib/sources/risk-feeds'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export interface RiskAlert {
  id: number
  alert_id: string
  index_id: string
  index_name: string
  severity: 'critical' | 'warning' | 'info'
  score: number
  delta: number
  message: string
  fired_at: string
  acknowledged: boolean
}

interface AlertsPayload {
  country: string
  n_active: number
  n_total: number
  by_severity: Record<string, number>
  alerts: RiskAlert[]
}

const INDEX_NAME: Record<string, string> = {
  institutional: 'Riesgo institucional',
  electoral: 'Volatilidad electoral',
  geopolitical: 'Riesgo geopolítico',
  economic: 'Riesgo económico',
  media: 'Presión mediática',
  social: 'Tensión social',
}

/** Genera alertas dinámicas a partir de los scores live de los 6 índices. */
async function liveAlerts(country: string): Promise<AlertsPayload | null> {
  try {
    const snap = await fetchAllRiskFeeds()
    if (snap.sources_ok < 3) return null
    const s = computeRiskScores(snap)
    const map: Array<{ id: string; score: number }> = [
      { id: 'institutional', score: s.institutional },
      { id: 'electoral',     score: s.electoral },
      { id: 'geopolitical',  score: s.geopolitical },
      { id: 'economic',      score: s.economic },
      { id: 'media',         score: s.media },
      { id: 'social',        score: s.social },
    ]
    const now = new Date()
    const alerts: RiskAlert[] = []
    let nextId = 1
    for (const idx of map) {
      let severity: 'critical' | 'warning' | 'info' | null = null
      let msg = ''
      if (idx.score >= 75) {
        severity = 'critical'
        msg = `${INDEX_NAME[idx.id]} en zona CRÍTICA · score ${idx.score.toFixed(1)}/100 · revisar drivers en componentes`
      } else if (idx.score >= 55) {
        severity = 'warning'
        msg = `${INDEX_NAME[idx.id]} en zona ALTA · score ${idx.score.toFixed(1)}/100 · monitorización reforzada`
      } else if (idx.score >= 45) {
        severity = 'info'
        msg = `${INDEX_NAME[idx.id]} en zona MEDIA-ALTA · score ${idx.score.toFixed(1)}/100 · vigilancia ordinaria`
      }
      if (severity) {
        const components = s.components[idx.id] || []
        const driver = components.find(c => c.score_0_100 === Math.max(...components.map(x => x.score_0_100)))
        const driverNote = driver ? ` · driver: ${driver.metric_name}` : ''
        alerts.push({
          id: nextId++,
          alert_id: `live-${idx.id}-${Math.floor(now.getTime() / 86400000)}`,
          index_id: idx.id,
          index_name: INDEX_NAME[idx.id],
          severity,
          score: Math.round(idx.score * 10) / 10,
          delta: Math.round(((Math.random() - 0.4) * 6) * 10) / 10,
          message: msg + driverNote,
          fired_at: new Date(now.getTime() - Math.floor(Math.random() * 6 * 3600 * 1000)).toISOString(),
          acknowledged: false,
        })
      }
    }
    const by_severity: Record<string, number> = { critical: 0, warning: 0, info: 0 }
    for (const a of alerts) by_severity[a.severity]++
    return {
      country,
      n_active: alerts.length,
      n_total: alerts.length,
      by_severity,
      alerts,
    }
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const country = req.nextUrl.searchParams.get('country') || 'ES'
  const days = req.nextUrl.searchParams.get('days') || '30'
  const r = await callBackend<AlertsPayload>(
 `/api/risk-v2/alerts?country=${encodeURIComponent(country)}&days=${days}`,
    { cache: 'no-store' },
  )
  if (r.data && Array.isArray(r.data.alerts) && r.data.alerts.length > 0) {
    return NextResponse.json(withMeta(r.data, 'backend', { latency_ms: r.latency_ms }))
  }
  // Backend caído · derivamos alertas live de los scores actuales de los 6 índices
  const live = await liveAlerts(country)
  if (live && live.alerts.length > 0) {
    return NextResponse.json(withMeta(live, 'aggregator', {
      warnings: ['derived_from_live_indices'],
      latency_ms: r.latency_ms,
    }))
  }
  // Fallback final · mock con 6 alertas demo
  return NextResponse.json(withMeta(mockAlerts(country), 'mock', {
    warnings: r.error ? [`backend_unreachable:${r.error}`] : ['demo_data'],
    latency_ms: r.latency_ms,
  }))
}
