'use client'
/**
 * `<InsightsBlock />` · Sprint N9.
 *
 * Bullets automáticos derivados cruzando datos del catálogo:
 *  1. Thresholds amber/red del subtab → cuántos indicadores críticos
 *  2. Variación YoY computada por TrendsTable lógica → mayores caídas/subidas
 *  3. Peer comparison (fetch async) → posición España vs UE peers
 *  4. Cobertura live/stale/missing → estado del subtab
 *
 * SIN IA. Lógica determinista pura para que el analista tenga titulares
 * accionables sin esperar a fetches IA y sin riesgo de alucinaciones.
 *
 * Renderizado encima del TrendsTable porque sintetiza lo que sigue.
 */
import { useEffect, useMemo, useState } from 'react'
import type { PulsoIndicatorMeta } from '@/lib/macro/pulso-indicators'
import type { PulsoFetchResult } from '@/lib/macro/pulso-fetcher'

interface Props {
  indicators: PulsoIndicatorMeta[]
  byId: Record<string, PulsoFetchResult>
  subtabSlug: string
  accent: string
  termometroScore: number
  coverage: { total: number; live: number; stale: number; missing: number }
}

interface PeerIndicator {
  id: string
  label: string
  peerable: boolean
  spainPosition?: number
  nCountries?: number
  spainVsAvgPct?: number | null
  goodAbove?: boolean | null
  ranking?: { geo: string; geoLabel: string; value: number | null }[]
}

interface Insight {
  icon: string
  severity: 'crit' | 'warn' | 'info' | 'good'
  text: string
}

function statusForValue(v: number | null, threshold?: PulsoIndicatorMeta['threshold']): 'green' | 'amber' | 'red' | 'na' {
  if (v == null || !threshold) return 'na'
  const { amber, red, goodAbove } = threshold
  if (goodAbove) {
    if (red != null && v < red) return 'red'
    if (amber != null && v < amber) return 'amber'
    return 'green'
  }
  if (red != null && v > red) return 'red'
  if (amber != null && v > amber) return 'amber'
  return 'green'
}

function computeYoY(meta: PulsoIndicatorMeta, series: PulsoFetchResult['series']): number | null {
  if (!series || series.length < 2) return null
  const valid = series.filter((p) => p.value != null)
  if (valid.length < 2) return null
  const last = valid[valid.length - 1]
  const lag = meta.frequency === 'monthly' ? 12 : meta.frequency === 'quarterly' ? 4 : 1
  const yoyIdx = valid.length - 1 - lag
  if (yoyIdx < 0) return null
  const prev = valid[yoyIdx]
  if (prev?.value == null || prev.value === 0 || last?.value == null) return null
  return ((last.value - prev.value) / Math.abs(prev.value)) * 100
}

const SEV_STYLES: Record<Insight['severity'], { bg: string; fg: string; border: string }> = {
  crit: { bg: '#fee2e2', fg: '#991b1b', border: '#fecaca' },
  warn: { bg: '#fef3c7', fg: '#92400e', border: '#fde68a' },
  info: { bg: '#dbeafe', fg: '#1e40af', border: '#bfdbfe' },
  good: { bg: '#dcfce7', fg: '#166534', border: '#bbf7d0' },
}

export function InsightsBlock({ indicators, byId, subtabSlug, accent, termometroScore, coverage }: Props) {
  const [peer, setPeer] = useState<PeerIndicator[] | null>(null)

  useEffect(() => {
    let alive = true
    setPeer(null)
    fetch(`/api/macro/peer-comparison/${subtabSlug}`, { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j) => { if (alive && j?.ok && Array.isArray(j.indicators)) setPeer(j.indicators) })
      .catch(() => {})
    return () => { alive = false }
  }, [subtabSlug])

  const insights = useMemo<Insight[]>(() => {
    const out: Insight[] = []

    // ─── Insight 1: cobertura ───────────────────────────────────────────
    const coveragePct = coverage.total > 0 ? (coverage.live / coverage.total) * 100 : 0
    if (coverage.missing > coverage.total * 0.3) {
      out.push({
        icon: '!',
        severity: 'warn',
        text: `Cobertura limitada · ${coverage.live}/${coverage.total} series live (${coveragePct.toFixed(0)}%) · ${coverage.missing} sin dato. Algunas lecturas pueden ser incompletas.`,
      })
    } else if (coverage.live === coverage.total) {
      out.push({
        icon: '✓',
        severity: 'good',
        text: `Cobertura completa · ${coverage.live}/${coverage.total} series live · datos en tiempo real.`,
      })
    }

    // ─── Insight 2: score global del subtab ─────────────────────────────
    if (termometroScore < 30) {
      out.push({
        icon: '!',
        severity: 'crit',
        text: `Score sectorial CRÍTICO · ${termometroScore}/100. Mayoría de indicadores en zona roja según umbrales académicos del catálogo.`,
      })
    } else if (termometroScore < 50) {
      out.push({
        icon: '◐',
        severity: 'warn',
        text: `Score sectorial DETERIORADO · ${termometroScore}/100. Múltiples indicadores en zona amber · revisar dinámica.`,
      })
    } else if (termometroScore >= 75) {
      out.push({
        icon: '◉',
        severity: 'good',
        text: `Score sectorial SÓLIDO · ${termometroScore}/100. Mayoría de indicadores dentro de bandas saludables.`,
      })
    }

    // ─── Insight 3: indicadores en zona crítica (red) ────────────────────
    const reds: { meta: PulsoIndicatorMeta; value: number }[] = []
    const ambers: { meta: PulsoIndicatorMeta; value: number }[] = []
    for (const meta of indicators) {
      const last = byId[meta.id]?.last
      const v = last?.value
      if (v == null) continue
      const status = statusForValue(v, meta.threshold)
      if (status === 'red') reds.push({ meta, value: v })
      else if (status === 'amber') ambers.push({ meta, value: v })
    }
    if (reds.length > 0) {
      const sample = reds.slice(0, 3).map((r) => `${r.meta.shortLabel || r.meta.label} (${r.value.toFixed(2)}${r.meta.unit})`).join(' · ')
      out.push({
        icon: '!',
        severity: 'crit',
        text: `${reds.length} indicador${reds.length > 1 ? 'es' : ''} en zona crítica: ${sample}${reds.length > 3 ? ` · +${reds.length - 3} más` : ''}.`,
      })
    } else if (ambers.length > 0) {
      const sample = ambers.slice(0, 3).map((r) => `${r.meta.shortLabel || r.meta.label} (${r.value.toFixed(2)}${r.meta.unit})`).join(' · ')
      out.push({
        icon: '!',
        severity: 'warn',
        text: `${ambers.length} indicador${ambers.length > 1 ? 'es' : ''} en zona de alerta: ${sample}${ambers.length > 3 ? ` · +${ambers.length - 3} más` : ''}.`,
      })
    }

    // ─── Insight 4: mayor variación YoY (positiva y negativa) ────────────
    const yoys: { meta: PulsoIndicatorMeta; yoy: number }[] = []
    for (const meta of indicators) {
      const result = byId[meta.id]
      if (!result?.series) continue
      const yoy = computeYoY(meta, result.series)
      if (yoy != null && Math.abs(yoy) > 0.5) yoys.push({ meta, yoy })
    }
    yoys.sort((a, b) => Math.abs(b.yoy) - Math.abs(a.yoy))
    const topUp = yoys.filter((y) => y.yoy > 0).slice(0, 1)[0]
    const topDown = yoys.filter((y) => y.yoy < 0).slice(0, 1)[0]
    if (topUp) {
      out.push({
        icon: '↑',
        severity: 'info',
        text: `Mayor subida YoY: ${topUp.meta.shortLabel || topUp.meta.label} +${topUp.yoy.toFixed(1)}%. Driver del cambio del subtab.`,
      })
    }
    if (topDown) {
      out.push({
        icon: '↓',
        severity: 'info',
        text: `Mayor caída YoY: ${topDown.meta.shortLabel || topDown.meta.label} ${topDown.yoy.toFixed(1)}%. Revisar contexto sectorial.`,
      })
    }

    // ─── Insight 5: peer positioning España ────────────────────────────
    if (peer && peer.length > 0) {
      const peerableData = peer.filter((p) => p.peerable && p.spainPosition && p.spainPosition > 0)
      const worstRanks = peerableData.filter((p) => {
        if (!p.nCountries || !p.spainPosition) return false
        return p.spainPosition >= p.nCountries - 1
      })
      const bestRanks = peerableData.filter((p) => p.spainPosition === 1 || p.spainPosition === 2)

      if (bestRanks.length > 0) {
        const sample = bestRanks.slice(0, 2).map((p) => `${p.label} #${p.spainPosition}`).join(' · ')
        out.push({
          icon: '★',
          severity: 'good',
          text: `España lidera vs peers UE en ${bestRanks.length} indicador${bestRanks.length > 1 ? 'es' : ''}: ${sample}.`,
        })
      }
      if (worstRanks.length > 0) {
        const sample = worstRanks.slice(0, 2).map((p) => `${p.label} #${p.spainPosition}/${p.nCountries}`).join(' · ')
        out.push({
          icon: '⊟',
          severity: 'warn',
          text: `España en última posición vs peers UE en ${worstRanks.length} indicador${worstRanks.length > 1 ? 'es' : ''}: ${sample}.`,
        })
      }

      // Mayor brecha negativa vs media peers
      const worstDelta = peerableData
        .filter((p) => p.spainVsAvgPct != null)
        .sort((a, b) => {
          // Determinar dirección "mala" por goodAbove
          const aBad = a.goodAbove ? (a.spainVsAvgPct ?? 0) : -(a.spainVsAvgPct ?? 0)
          const bBad = b.goodAbove ? (b.spainVsAvgPct ?? 0) : -(b.spainVsAvgPct ?? 0)
          return aBad - bBad
        })[0]
      if (worstDelta && worstDelta.spainVsAvgPct != null && Math.abs(worstDelta.spainVsAvgPct) > 5) {
        const goodHigh = worstDelta.goodAbove ?? true
        const isBad = goodHigh ? worstDelta.spainVsAvgPct < 0 : worstDelta.spainVsAvgPct > 0
        if (isBad) {
          out.push({
            icon: '↓',
            severity: 'warn',
            text: `Mayor gap vs peers UE: ${worstDelta.label} · España ${worstDelta.spainVsAvgPct > 0 ? '+' : ''}${worstDelta.spainVsAvgPct.toFixed(1)}% vs media (${goodHigh ? 'por debajo' : 'por encima'} de lo deseable).`,
          })
        }
      }
    }

    return out
  }, [indicators, byId, peer, termometroScore, coverage])

  if (insights.length === 0) {
    return null
  }

  return (
    <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderLeft: `4px solid ${accent}`, borderRadius: 10, padding: 16 }}>
      <header style={{ marginBottom: 12 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: accent, textTransform: 'uppercase' }}>
          Insights automáticos · {insights.length} titulares accionables
        </p>
        <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8' }}>
          Sintetiza score + umbrales + variaciones YoY + posición España vs peers UE. Sin IA · lógica determinista del catálogo.
        </p>
      </header>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {insights.map((ins, i) => {
          const sty = SEV_STYLES[ins.severity]
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '8px 12px',
                background: sty.bg,
                border: `1px solid ${sty.border}`,
                borderRadius: 6,
                fontSize: 12,
                color: sty.fg,
                lineHeight: 1.45,
              }}
            >
              <span style={{ fontSize: 14, fontWeight: 700, flexShrink: 0, lineHeight: 1 }}>{ins.icon}</span>
              <span>{ins.text}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default InsightsBlock
