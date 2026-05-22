'use client'
/**
 * `<CompanyDetailLayout />` · página /macro/empresas-beneficios/company/[id].
 *
 * Estructura:
 *   1. Header empresa con precio + Δ% + sector + sede
 *   2. Mapa de exposiciones macro
 *   3. Análisis Groq company-aware
 *   4. Empresas peer del mismo sector
 *   5. Catálogo completo de cotizadas
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import AppHeader from '../../../app/_components/AppHeader'
import { type SpanishCompany, COMPANY_CATALOG, listCompaniesBySector } from '@/lib/macro/company-catalog'

interface Snapshot {
  price: number | null
  change: number | null
  changePct: number | null
  open: number | null
  high: number | null
  low: number | null
  volume: number | null
  marketCap: number | null
}

interface DetailPayload {
  ok: boolean
  id: string
  company: SpanishCompany
  snapshot: Snapshot
}

interface CompanyInsight {
  headline: string
  positioning: string
  macroExposures: Array<{ driver: string; sensitivity: 'low' | 'medium' | 'high'; explanation: string }>
  cycleSignal: 'expansion' | 'deceleration' | 'contraction' | 'recovery' | 'unclear'
  risks: Array<{ risk: string; trigger: string; severity: 'low' | 'medium' | 'high' | 'critical' }>
  watchNext: string[]
  politicalRegulatorySignals: string[]
  confidenceScore: number
}

interface AIResp {
  ok: true
  insight: CompanyInsight
  disclaimer: string
  provider: 'groq' | 'anthropic'
  model: string
}

const SENSITIVITY_COLOR = {
  low: { bg: '#f1f5f9', color: '#475569' },
  medium: { bg: '#fef3c7', color: '#92400e' },
  high: { bg: '#fee2e2', color: '#991b1b' },
} as const

const SEVERITY_COLOR = {
  low: { bg: '#f1f5f9', color: '#475569' },
  medium: { bg: '#fef3c7', color: '#92400e' },
  high: { bg: '#fed7aa', color: '#9a3412' },
  critical: { bg: '#fee2e2', color: '#991b1b' },
} as const

export function CompanyDetailLayout({ companyId }: { companyId: string }) {
  const [payload, setPayload] = useState<DetailPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ai, setAi] = useState<AIResp | null>(null)
  const [aiState, setAiState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  useEffect(() => {
    if (!companyId) return
    let alive = true
    fetch(`/api/macro/empresas-beneficios/company/${encodeURIComponent(companyId)}`, { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return
        if (!j?.ok) { setError(j?.error || 'not_found'); return }
        setPayload(j as DetailPayload)
      })
      .catch((e) => alive && setError(e.message))
    return () => { alive = false }
  }, [companyId])

  useEffect(() => {
    if (!payload || aiState !== 'idle') return
    setAiState('loading')
    fetch('/api/macro/ai/analyze-company', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company: payload.company, snapshot: payload.snapshot }),
    })
      .then((r) => r.json())
      .then((j) => {
        if (!j?.ok) { setAiState('error'); return }
        setAi(j as AIResp)
        setAiState('success')
      })
      .catch(() => setAiState('error'))
  }, [payload, aiState])

  const peers = payload ? listCompaniesBySector(payload.company.sector).filter((c) => c.id !== payload.company.id) : []

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <AppHeader />
      <main style={{ maxWidth: 1320, margin: '0 auto', padding: '16px 20px 40px' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 14, fontSize: 12, color: '#64748b' }}>
          <Link href="/macro" style={{ color: '#0F766E', textDecoration: 'none', fontWeight: 600 }}>Macro</Link>
          <span>·</span>
          <Link href="/macro/empresas-beneficios" style={{ color: '#0F766E', textDecoration: 'none', fontWeight: 600 }}>Empresas</Link>
          <span>·</span>
          <span style={{ color: '#0f172a', fontWeight: 600 }}>{payload?.company?.shortName || companyId}</span>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: 14, borderRadius: 8, color: '#991b1b', fontSize: 12 }}>
            Empresa no encontrada · {error}.{' '}
            <Link href="/macro/empresas-beneficios" style={{ color: '#7c3aed' }}>Volver</Link>
          </div>
        )}

        {payload && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Header */}
            <section
              style={{
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderLeft: `4px solid ${payload.snapshot.changePct != null && payload.snapshot.changePct >= 0 ? '#16a34a' : '#dc2626'}`,
                borderRadius: 12,
                padding: 18,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 0.7, color: '#7c3aed', textTransform: 'uppercase' }}>
                    {payload.company.sector} · {payload.company.geography}
                  </p>
                  <h1 style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 700, color: '#0f172a', letterSpacing: -0.5 }}>
                    {payload.company.legalName}
                  </h1>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b', maxWidth: 700 }}>
                    {payload.company.description}
                  </p>
                  <p style={{ margin: '6px 0 0', fontSize: 10, color: '#94a3b8' }}>
                    Ticker: {payload.company.ticker} · ISIN: {payload.company.isin ?? 'n/a'} · Finnhub: {payload.company.finnhubSymbol}
                  </p>
                </div>
                <div style={{ textAlign: 'right', minWidth: 220 }}>
                  <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>Cotización</p>
                  <p style={{ margin: '2px 0 0', fontSize: 32, fontWeight: 700, color: payload.snapshot.changePct != null && payload.snapshot.changePct >= 0 ? '#16a34a' : '#dc2626', fontVariantNumeric: 'tabular-nums' }}>
                    {payload.snapshot.price != null ? `$${payload.snapshot.price.toFixed(2)}` : '—'}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 600, color: payload.snapshot.changePct != null && payload.snapshot.changePct >= 0 ? '#16a34a' : '#dc2626' }}>
                    {payload.snapshot.changePct != null ? `${payload.snapshot.changePct >= 0 ? '+' : ''}${payload.snapshot.changePct.toFixed(2)}%` : '—'}
                  </p>
                </div>
              </div>
            </section>

            {/* Exposición macro declarada */}
            <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderLeft: '4px solid #0F766E', borderRadius: 10, padding: 16 }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: '#0F766E', textTransform: 'uppercase' }}>
                Mapa de exposiciones macro · catálogo
              </p>
              <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
                {Object.entries(payload.company.macroExposure).map(([key, level]) => {
                  const cfg = SENSITIVITY_COLOR[level as keyof typeof SENSITIVITY_COLOR]
                  return (
                    <div key={key} style={{ background: cfg.bg, borderRadius: 6, padding: '8px 10px' }}>
                      <p style={{ margin: 0, fontSize: 9, color: cfg.color, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())}
                      </p>
                      <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 700, color: cfg.color }}>
                        {level.toUpperCase()}
                      </p>
                    </div>
                  )
                })}
              </div>
            </section>

            {/* Análisis Groq */}
            <section
              style={{
                background: 'linear-gradient(180deg, #faf5ff 0%, #fff 60%)',
                border: '1px solid #e9d5ff',
                borderLeft: '4px solid #7c3aed',
                borderRadius: 12,
                padding: 18,
              }}
            >
              <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 0.7, color: '#7c3aed', textTransform: 'uppercase' }}>
                ✦ Posicionamiento macro · análisis IA
              </p>
              {aiState === 'loading' && (
                <p style={{ margin: '8px 0 0', fontSize: 12, color: '#64748b' }}>
                  Groq está leyendo el posicionamiento de {payload.company.shortName} en el ciclo actual…
                </p>
              )}
              {aiState === 'error' && (
                <p style={{ margin: '8px 0 0', fontSize: 12, color: '#dc2626' }}>Análisis IA no disponible.</p>
              )}
              {aiState === 'success' && ai && (
                <div style={{ marginTop: 10, fontSize: 14, color: '#334155', lineHeight: 1.6 }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 17, color: '#0f172a' }}>{ai.insight.headline}</p>
                  <p style={{ margin: '6px 0 0' }}>
                    <span style={{ fontSize: 10, padding: '2px 6px', background: '#ede9fe', color: '#5b21b6', borderRadius: 4, fontWeight: 700, letterSpacing: 0.4, marginRight: 6 }}>
                      CICLO · {ai.insight.cycleSignal.toUpperCase()}
                    </span>
                  </p>
                  <p style={{ margin: '10px 0 0' }}>{ai.insight.positioning}</p>

                  {ai.insight.macroExposures.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: '#7c3aed', textTransform: 'uppercase' }}>Exposiciones macro</p>
                      <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>
                        {ai.insight.macroExposures.map((e, i) => {
                          const sc = SENSITIVITY_COLOR[e.sensitivity]
                          return (
                            <li key={i}>
                              <strong>{e.driver}</strong>{' '}
                              <span style={{ fontSize: 9, padding: '1px 5px', background: sc.bg, color: sc.color, borderRadius: 3, fontWeight: 700 }}>{e.sensitivity}</span>: {e.explanation}
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )}

                  {ai.insight.risks.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: '#7c3aed', textTransform: 'uppercase' }}>Riesgos</p>
                      <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>
                        {ai.insight.risks.map((r, i) => {
                          const sv = SEVERITY_COLOR[r.severity]
                          return (
                            <li key={i}>
                              <span style={{ fontSize: 9, padding: '1px 5px', background: sv.bg, color: sv.color, borderRadius: 3, fontWeight: 700, marginRight: 4 }}>{r.severity}</span>
                              <strong>{r.risk}</strong> · trigger: {r.trigger}
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )}

                  {ai.insight.politicalRegulatorySignals.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: '#7c3aed', textTransform: 'uppercase' }}>Señales político-regulatorias</p>
                      <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>
                        {ai.insight.politicalRegulatorySignals.map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                  )}

                  {ai.insight.watchNext.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: '#7c3aed', textTransform: 'uppercase' }}>A vigilar</p>
                      <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>
                        {ai.insight.watchNext.map((w, i) => <li key={i}>{w}</li>)}
                      </ul>
                    </div>
                  )}

                  <p style={{ marginTop: 12, fontSize: 10, color: '#94a3b8', fontStyle: 'italic' }}>
                    {ai.disclaimer} · Confianza {Math.round((ai.insight.confidenceScore ?? 0) * 100)}% · {ai.provider}/{ai.model}
                  </p>
                </div>
              )}
            </section>

            {/* Peers del mismo sector */}
            {peers.length > 0 && (
              <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderLeft: '4px solid #0891b2', borderRadius: 10, padding: 16 }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: '#0891b2', textTransform: 'uppercase' }}>
                  Peers sectoriales · {payload.company.sector}
                </p>
                <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
                  {peers.map((p) => (
                    <Link
                      key={p.id}
                      href={`/macro/empresas-beneficios/company/${p.id}`}
                      style={{
                        display: 'block', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, padding: 10,
                        textDecoration: 'none', color: '#0f172a',
                      }}
                    >
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 600 }}>{p.shortName}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 10, color: '#64748b' }}>{p.ticker} · {p.region}</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Catálogo completo */}
            <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: '#475569', textTransform: 'uppercase' }}>
                Catálogo completo · {COMPANY_CATALOG.length} cotizadas
              </p>
              <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 6 }}>
                {COMPANY_CATALOG.map((c) => (
                  <Link key={c.id} href={`/macro/empresas-beneficios/company/${c.id}`} style={{ fontSize: 11, color: c.id === payload.company.id ? '#0f172a' : '#475569', textDecoration: c.id === payload.company.id ? 'none' : 'underline dotted', fontWeight: c.id === payload.company.id ? 700 : 400 }}>
                    {c.shortName}
                  </Link>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}

export default CompanyDetailLayout
