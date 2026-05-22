'use client'
/**
 * `<SectorDetailLayout />` · página /macro/empresas-beneficios/sector/[id].
 *
 * Estructura:
 *   1. Header sector con peso PIB + empleo
 *   2. Top empresas representativas con snapshots
 *   3. Análisis Groq sector-aware
 *   4. Otros sectores
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import AppHeader from '../../../app/_components/AppHeader'
import { type SpanishSector, SECTOR_CATALOG } from '@/lib/macro/sector-catalog'

interface CompanySnap {
  id: string
  shortName: string
  ticker: string
  price: number | null
  changePct: number | null
}

interface DetailPayload {
  ok: boolean
  id: string
  sector: SpanishSector
  companies: CompanySnap[]
}

interface SectorInsight {
  headline: string
  cyclePhase: 'expansion' | 'peak' | 'deceleration' | 'contraction' | 'trough' | 'recovery' | 'unclear'
  state: string
  drivers: Array<{ driver: string; impact: 'low' | 'medium' | 'high'; explanation: string }>
  opportunities: string[]
  risks: Array<{ risk: string; trigger: string; severity: 'low' | 'medium' | 'high' }>
  topPlayersReading: string
  politicalRegulatorySignals: string[]
  watchNext: string[]
  confidenceScore: number
}

interface AIResp {
  ok: true
  insight: SectorInsight
  disclaimer: string
  provider: string
  model: string
}

const IMPACT_COLOR = {
  low: { bg: '#f1f5f9', color: '#475569' },
  medium: { bg: '#fef3c7', color: '#92400e' },
  high: { bg: '#fee2e2', color: '#991b1b' },
} as const

export function SectorDetailLayout({ sectorId }: { sectorId: string }) {
  const [payload, setPayload] = useState<DetailPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ai, setAi] = useState<AIResp | null>(null)
  const [aiState, setAiState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  useEffect(() => {
    if (!sectorId) return
    let alive = true
    fetch(`/api/macro/empresas-beneficios/sector/${encodeURIComponent(sectorId)}`, { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return
        if (!j?.ok) { setError(j?.error || 'not_found'); return }
        setPayload(j as DetailPayload)
      })
      .catch((e) => alive && setError(e.message))
    return () => { alive = false }
  }, [sectorId])

  useEffect(() => {
    if (!payload || aiState !== 'idle') return
    setAiState('loading')
    fetch('/api/macro/ai/analyze-sector', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sector: payload.sector, companies: payload.companies }),
    })
      .then((r) => r.json())
      .then((j) => {
        if (!j?.ok) { setAiState('error'); return }
        setAi(j as AIResp)
        setAiState('success')
      })
      .catch(() => setAiState('error'))
  }, [payload, aiState])

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <AppHeader />
      <main style={{ maxWidth: 1320, margin: '0 auto', padding: '16px 20px 40px' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 14, fontSize: 12, color: '#64748b' }}>
          <Link href="/macro" style={{ color: '#0F766E', textDecoration: 'none', fontWeight: 600 }}>Macro</Link>
          <span>·</span>
          <Link href="/macro/empresas-beneficios" style={{ color: '#0F766E', textDecoration: 'none', fontWeight: 600 }}>Empresas</Link>
          <span>·</span>
          <span style={{ color: '#0f172a', fontWeight: 600 }}>{payload?.sector?.shortLabel || sectorId}</span>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: 14, borderRadius: 8, color: '#991b1b', fontSize: 12 }}>
            Sector no encontrado · {error}.{' '}
            <Link href="/macro/empresas-beneficios" style={{ color: '#7c3aed' }}>Volver</Link>
          </div>
        )}

        {payload && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Header */}
            <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderLeft: '4px solid #7c3aed', borderRadius: 12, padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 0.7, color: '#7c3aed', textTransform: 'uppercase' }}>
                    Sector estratégico España
                  </p>
                  <h1 style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 700, color: '#0f172a', letterSpacing: -0.5 }}>
                    {payload.sector.label}
                  </h1>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b', maxWidth: 700, lineHeight: 1.5 }}>
                    {payload.sector.description}
                  </p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, minWidth: 220 }}>
                  <div style={{ background: '#f1f5f9', borderRadius: 8, padding: 10 }}>
                    <p style={{ margin: 0, fontSize: 9, color: '#64748b', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>% PIB</p>
                    <p style={{ margin: '2px 0 0', fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
                      {payload.sector.gdpShare.toFixed(1)}%
                    </p>
                  </div>
                  <div style={{ background: '#f1f5f9', borderRadius: 8, padding: 10 }}>
                    <p style={{ margin: 0, fontSize: 9, color: '#64748b', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>% EMPLEO</p>
                    <p style={{ margin: '2px 0 0', fontSize: 20, fontWeight: 700, color: '#0f172a' }}>
                      {payload.sector.employmentShare.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Top empresas */}
            {payload.companies.length > 0 && (
              <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderLeft: '4px solid #0891b2', borderRadius: 10, padding: 16 }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: '#0891b2', textTransform: 'uppercase' }}>
                  Empresas representativas · cotizadas
                </p>
                <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
                  {payload.companies.map((c) => (
                    <Link
                      key={c.id}
                      href={`/macro/empresas-beneficios/company/${c.id}`}
                      style={{
                        display: 'block', background: '#f8fafc', border: '1px solid #e5e7eb',
                        borderLeft: `3px solid ${c.changePct != null && c.changePct >= 0 ? '#16a34a' : '#dc2626'}`,
                        borderRadius: 8, padding: 12, textDecoration: 'none', color: '#0f172a',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{c.shortName}</p>
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>{c.ticker}</span>
                      </div>
                      <p style={{ margin: '6px 0 0', fontSize: 18, fontWeight: 700, color: c.changePct != null && c.changePct >= 0 ? '#16a34a' : '#dc2626', fontVariantNumeric: 'tabular-nums' }}>
                        {c.price != null ? `$${c.price.toFixed(2)}` : '—'}
                      </p>
                      <p style={{ margin: '2px 0 0', fontSize: 11, fontWeight: 600, color: c.changePct != null && c.changePct >= 0 ? '#16a34a' : '#dc2626' }}>
                        {c.changePct != null ? `${c.changePct >= 0 ? '+' : ''}${c.changePct.toFixed(2)}%` : '—'}
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Drivers & Risks declarados */}
            <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderLeft: '4px solid #f59e0b', borderRadius: 10, padding: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: '#f59e0b', textTransform: 'uppercase' }}>
                    Drivers macro habituales
                  </p>
                  <ul style={{ margin: '4px 0 0', paddingLeft: 16, fontSize: 12, color: '#475569' }}>
                    {payload.sector.macroDrivers.map((d, i) => <li key={i}>{d}</li>)}
                  </ul>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: '#dc2626', textTransform: 'uppercase' }}>
                    Riesgos recurrentes
                  </p>
                  <ul style={{ margin: '4px 0 0', paddingLeft: 16, fontSize: 12, color: '#475569' }}>
                    {payload.sector.recurringRisks.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              </div>
            </section>

            {/* Análisis Groq */}
            <section style={{ background: 'linear-gradient(180deg, #faf5ff 0%, #fff 60%)', border: '1px solid #e9d5ff', borderLeft: '4px solid #7c3aed', borderRadius: 12, padding: 18 }}>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 0.7, color: '#7c3aed', textTransform: 'uppercase' }}>
                ✦ Diagnóstico sectorial IA
              </p>
              {aiState === 'loading' && (
                <p style={{ margin: '8px 0 0', fontSize: 12, color: '#64748b' }}>
                  Groq está sintetizando el estado actual del sector {payload.sector.label.toLowerCase()}…
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
                      CICLO · {ai.insight.cyclePhase.toUpperCase()}
                    </span>
                  </p>
                  <p style={{ margin: '10px 0 0' }}>{ai.insight.state}</p>

                  <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
                    {ai.insight.drivers.length > 0 && (
                      <div>
                        <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: '#7c3aed', textTransform: 'uppercase' }}>Drivers activos</p>
                        <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>
                          {ai.insight.drivers.map((d, i) => {
                            const ic = IMPACT_COLOR[d.impact]
                            return (
                              <li key={i}>
                                <strong>{d.driver}</strong>{' '}
                                <span style={{ fontSize: 9, padding: '1px 5px', background: ic.bg, color: ic.color, borderRadius: 3, fontWeight: 700 }}>{d.impact}</span>: {d.explanation}
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    )}
                    {ai.insight.opportunities.length > 0 && (
                      <div>
                        <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: '#16a34a', textTransform: 'uppercase' }}>Oportunidades</p>
                        <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>
                          {ai.insight.opportunities.map((o, i) => <li key={i}>{o}</li>)}
                        </ul>
                      </div>
                    )}
                    {ai.insight.risks.length > 0 && (
                      <div>
                        <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: '#dc2626', textTransform: 'uppercase' }}>Riesgos identificados</p>
                        <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>
                          {ai.insight.risks.map((r, i) => (
                            <li key={i}><strong>{r.risk}</strong> · trigger: {r.trigger}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {ai.insight.watchNext.length > 0 && (
                      <div>
                        <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: '#7c3aed', textTransform: 'uppercase' }}>A vigilar</p>
                        <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>
                          {ai.insight.watchNext.map((w, i) => <li key={i}>{w}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>

                  {ai.insight.topPlayersReading && (
                    <div style={{ marginTop: 12 }}>
                      <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: '#7c3aed', textTransform: 'uppercase' }}>Lectura de las cotizadas</p>
                      <p style={{ margin: '4px 0 0' }}>{ai.insight.topPlayersReading}</p>
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

                  <p style={{ marginTop: 12, fontSize: 10, color: '#94a3b8', fontStyle: 'italic' }}>
                    {ai.disclaimer} · Confianza {Math.round((ai.insight.confidenceScore ?? 0) * 100)}% · {ai.provider}/{ai.model}
                  </p>
                </div>
              )}
            </section>

            {/* Otros sectores */}
            <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: '#475569', textTransform: 'uppercase' }}>
                Otros sectores · {SECTOR_CATALOG.length - 1} disponibles
              </p>
              <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
                {SECTOR_CATALOG.filter((s) => s.id !== payload.sector.id).map((s) => (
                  <Link
                    key={s.id}
                    href={`/macro/empresas-beneficios/sector/${s.id}`}
                    style={{ display: 'block', background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 8, padding: 10, textDecoration: 'none', color: '#0f172a' }}
                  >
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 600 }}>{s.label}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 10, color: '#64748b' }}>
                      {s.gdpShare.toFixed(1)}% PIB · {s.employmentShare.toFixed(1)}% empleo
                    </p>
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

export default SectorDetailLayout
