'use client'
/**
 * `<AssetDetailLayout />` · página /macro/mercados-activos/asset/[id].
 *
 * Estructura tipo IndicatorDetailLayout pero adaptada a activos:
 *   1. Header con precio + Δ% + clase de activo
 *   2. Snapshot OHLC
 *   3. Lectura macro (qué señales transmite este activo)
 *   4. Análisis Groq de la situación actual
 *   5. Activos relacionados
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AppHeader from '../../../app/_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import {
  type MarketAsset,
  listAssetsByClass,
  ASSET_CATALOG,
} from '@/lib/macro/asset-catalog'

interface Snapshot {
  price: number | null
  change: number | null
  changePct: number | null
  open: number | null
  high: number | null
  low: number | null
  volume: number | null
  timestamp: number | null
  source: string
}

interface DetailPayload {
  ok: boolean
  id: string
  asset: MarketAsset
  snapshot: Snapshot
  generated_at: string
}

interface AssetInsight {
  headline: string
  marketRegime: 'risk_on' | 'risk_off' | 'neutral' | 'stress' | 'unclear'
  whatItDiscounts: string
  macroChannels: Array<{ channel: string; explanation: string; severity: 'low' | 'medium' | 'high' }>
  risks: Array<{ risk: string; trigger: string; horizon: string }>
  watchNext: string[]
  contradictions: string[]
  confidenceScore: number
}

interface AssetAnalysisResponse {
  ok: true
  cache_hit: boolean
  provider: 'groq' | 'anthropic'
  model: string
  insight: AssetInsight
  disclaimer: string
  generated_at: string
}

export function AssetDetailLayout({ assetId }: { assetId: string }) {
  const router = useRouter()
  const [payload, setPayload] = useState<DetailPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ai, setAi] = useState<AssetAnalysisResponse | null>(null)
  const [aiState, setAiState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  useEffect(() => {
    if (!isAuthenticated()) router.push('/login')
  }, [router])

  useEffect(() => {
    if (!assetId) return
    let alive = true
    setLoading(true)
    fetch(`/api/macro/mercados-activos/asset/${encodeURIComponent(assetId)}`, { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return
        if (!j?.ok) {
          setError(j?.error || 'asset_not_found')
          return
        }
        setPayload(j as DetailPayload)
      })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [assetId])

  // Disparar análisis Groq tras recibir snapshot
  useEffect(() => {
    if (!payload || aiState !== 'idle') return
    if (payload.snapshot.price == null) return // sin precio no analizamos
    setAiState('loading')
    fetch('/api/macro/ai/analyze-asset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        asset: payload.asset,
        snapshot: payload.snapshot,
      }),
    })
      .then((r) => r.json())
      .then((j) => {
        if (!j?.ok) {
          setAiState('error')
          return
        }
        setAi(j as AssetAnalysisResponse)
        setAiState('success')
      })
      .catch(() => setAiState('error'))
  }, [payload, aiState])

  const peers = payload
    ? listAssetsByClass(payload.asset.assetClass).filter((a) => a.id !== payload.asset.id).slice(0, 6)
    : []

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <AppHeader />
      <main style={{ maxWidth: 1320, margin: '0 auto', padding: '16px 20px 40px' }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 14, fontSize: 12, color: '#64748b' }}>
          <Link href="/macro" style={{ color: '#0F766E', textDecoration: 'none', fontWeight: 600 }}>Macro</Link>
          <span>·</span>
          <Link href="/macro/mercados-activos" style={{ color: '#0F766E', textDecoration: 'none', fontWeight: 600 }}>Mercados</Link>
          <span>·</span>
          <span style={{ color: '#0f172a', fontWeight: 600 }}>{payload?.asset?.label || assetId}</span>
        </div>

        {loading && <div style={{ padding: 30, color: '#94a3b8' }}>Cargando snapshot de {assetId}…</div>}
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: 14, borderRadius: 8, color: '#991b1b', fontSize: 12 }}>
            Activo no encontrado · {error}.{' '}
            <Link href="/macro/mercados-activos" style={{ color: '#7c3aed' }}>Volver a Mercados</Link>
          </div>
        )}

        {payload && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Header activo */}
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
                    {payload.asset.assetClass.replace('_', ' ')} · {payload.asset.geography || 'Global'}
                  </p>
                  <h1 style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 700, color: '#0f172a', letterSpacing: -0.5 }}>
                    {payload.asset.label}
                  </h1>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: '#64748b', maxWidth: 700 }}>
                    {payload.asset.description}
                  </p>
                </div>
                <div style={{ textAlign: 'right', minWidth: 220 }}>
                  <p style={{ margin: 0, fontSize: 11, color: '#94a3b8' }}>Último valor</p>
                  <p
                    style={{
                      margin: '2px 0 0',
                      fontSize: 36,
                      fontWeight: 700,
                      color: payload.snapshot.changePct != null && payload.snapshot.changePct >= 0 ? '#16a34a' : '#dc2626',
                      fontVariantNumeric: 'tabular-nums',
                      lineHeight: 1.1,
                    }}
                  >
                    {payload.snapshot.price != null ? payload.snapshot.price.toFixed(2) : '—'}
                  </p>
                  <p
                    style={{
                      margin: '2px 0 0',
                      fontSize: 14,
                      fontWeight: 600,
                      color: payload.snapshot.changePct != null && payload.snapshot.changePct >= 0 ? '#16a34a' : '#dc2626',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {payload.snapshot.changePct != null
                      ? `${payload.snapshot.changePct >= 0 ? '+' : ''}${payload.snapshot.changePct.toFixed(2)}%`
                      : '—'}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8' }}>{payload.asset.unit}</p>
                </div>
              </div>

              {/* OHLC */}
              <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
                <Stat label="Apertura" value={payload.snapshot.open} />
                <Stat label="Máximo" value={payload.snapshot.high} />
                <Stat label="Mínimo" value={payload.snapshot.low} />
                <Stat
                  label="Volumen"
                  value={payload.snapshot.volume}
                  format={(v) => v.toLocaleString('es-ES')}
                />
              </div>
            </section>

            {/* Señal macro */}
            <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderLeft: '4px solid #0F766E', borderRadius: 10, padding: 16 }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: '#0F766E', textTransform: 'uppercase' }}>
                Señal macroeconómica
              </p>
              <p style={{ margin: '6px 0 0', fontSize: 14, color: '#334155', lineHeight: 1.55 }}>{payload.asset.macroSignal}</p>
              <p style={{ marginTop: 8, fontSize: 11, color: '#94a3b8' }}>
                Subtabs relacionados:{' '}
                {payload.asset.relatedSubtabs.map((s, i) => (
                  <span key={s}>
                    <Link href={`/macro/${s}`} style={{ color: '#7c3aed', textDecoration: 'underline' }}>{s}</Link>
                    {i < payload.asset.relatedSubtabs.length - 1 ? ' · ' : ''}
                  </span>
                ))}
              </p>
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
                ✦ Lectura IA · qué está descontando este activo
              </p>
              {aiState === 'loading' && (
                <p style={{ margin: '8px 0 0', fontSize: 12, color: '#64748b' }}>
                  Groq está leyendo el snapshot ({payload.snapshot.price?.toFixed(2)} {payload.asset.unit}) y conectándolo con el canal macro…
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
                      RÉGIMEN · {ai.insight.marketRegime.toUpperCase().replace('_', '-')}
                    </span>
                  </p>
                  <p style={{ margin: '10px 0 0' }}>{ai.insight.whatItDiscounts}</p>

                  {ai.insight.macroChannels?.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: '#7c3aed', textTransform: 'uppercase' }}>
                        Canales macro activados
                      </p>
                      <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>
                        {ai.insight.macroChannels.map((c, i) => (
                          <li key={i}>
                            <strong>{c.channel}</strong>: {c.explanation}{' '}
                            <span style={{ fontSize: 10, padding: '1px 5px', background: c.severity === 'high' ? '#fee2e2' : c.severity === 'medium' ? '#fef3c7' : '#f1f5f9', color: c.severity === 'high' ? '#991b1b' : c.severity === 'medium' ? '#92400e' : '#475569', borderRadius: 3, fontWeight: 700, marginLeft: 4 }}>
                              {c.severity}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {ai.insight.risks?.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: '#7c3aed', textTransform: 'uppercase' }}>Riesgos</p>
                      <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>
                        {ai.insight.risks.map((r, i) => (
                          <li key={i}><strong>{r.risk}</strong> · trigger: {r.trigger} · horizonte: {r.horizon}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {ai.insight.watchNext?.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: '#7c3aed', textTransform: 'uppercase' }}>A vigilar</p>
                      <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>
                        {ai.insight.watchNext.map((w, i) => <li key={i}>{w}</li>)}
                      </ul>
                    </div>
                  )}

                  {ai.insight.contradictions?.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 0.6, color: '#7c3aed', textTransform: 'uppercase' }}>Señales contradictorias</p>
                      <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>
                        {ai.insight.contradictions.map((c, i) => <li key={i}>{c}</li>)}
                      </ul>
                    </div>
                  )}

                  <p style={{ marginTop: 12, fontSize: 10, color: '#94a3b8', fontStyle: 'italic' }}>{ai.disclaimer}</p>
                </div>
              )}
            </section>

            {/* Peers */}
            {peers.length > 0 && (
              <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderLeft: '4px solid #0891b2', borderRadius: 10, padding: 16 }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: '#0891b2', textTransform: 'uppercase' }}>
                  Activos relacionados · {payload.asset.assetClass.replace('_', ' ')}
                </p>
                <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
                  {peers.map((p) => (
                    <Link
                      key={p.id}
                      href={`/macro/mercados-activos/asset/${p.id}`}
                      style={{
                        display: 'block',
                        background: '#f0f9ff',
                        border: '1px solid #bae6fd',
                        borderRadius: 8,
                        padding: 10,
                        textDecoration: 'none',
                        color: '#0f172a',
                      }}
                    >
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 600 }}>{p.label}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 10, color: '#64748b' }}>{p.ticker} · {p.currency}</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Catálogo completo */}
            <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: '#475569', textTransform: 'uppercase' }}>
                Catálogo completo · {ASSET_CATALOG.length} activos
              </p>
              <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 6 }}>
                {ASSET_CATALOG.map((a) => (
                  <Link key={a.id} href={`/macro/mercados-activos/asset/${a.id}`} style={{ fontSize: 11, color: a.id === payload.asset.id ? '#0f172a' : '#475569', textDecoration: a.id === payload.asset.id ? 'none' : 'underline dotted', fontWeight: a.id === payload.asset.id ? 700 : 400 }}>
                    {a.shortLabel}
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

function Stat({ label, value, format }: { label: string; value: number | null; format?: (v: number) => string }) {
  return (
    <div style={{ background: '#f8fafc', borderRadius: 6, padding: 8 }}>
      <p style={{ margin: 0, fontSize: 9, color: '#94a3b8', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>{label}</p>
      <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 600, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
        {value != null ? (format ? format(value) : value.toFixed(2)) : '—'}
      </p>
    </div>
  )
}

export default AssetDetailLayout
