'use client'
/**
 * `<GeoSpainWatchlist />` · Sprint G9.
 *
 * Cruza convergence alerts × presencia España → identifica países donde
 * España tiene exposición Y la convergencia multi-source está elevada.
 * Output: lista priorizada por urgency = (presencia/100) × convergence_score.
 *
 * Data-driven · 100% live · sin listas hardcodeadas.
 */
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { GeoAuditDrawer, buildAuditFromWatchlist, type GeoAuditPayload } from './GeoAuditDrawer'

interface Signal { source: string; level: 'HIGH' | 'CRITICAL'; detail: string }
interface WatchEntry {
  iso3: string
  iso2: string
  country: string
  region: string
  convergence_score: number
  band: string
  signal_count: number
  critical_count: number
  spain_presence: { intensity: number; category: string; country_label_es: string }
  urgency_score: number
  top_signals: Signal[]
  // Sprint G13 FASE 7 · campos orientados a decisión
  impact_channels?: string[]
  primary_impact_channel?: string
  exposure_type?: string
  exposure_confidence?: number
  likely_time_horizon?: '24-72h' | '7d' | '30d' | 'structural'
  monitoring_question?: string
  recommended_sources_to_check?: string[]
  confidence?: number
  explanation?: string
  caveats?: string[]
}
interface Resp {
  ok: boolean
  n_watchlist?: number
  n_convergence_alerts?: number
  n_presencia_countries?: number
  summary?: { critical_for_spain: number; high_for_spain: number; moderate_for_spain: number }
  watchlist?: WatchEntry[]
  methodology?: string
  what_it_means?: string
  what_it_does_not_mean?: string
  error?: string
}

const CHANNEL_COLOR: Record<string, string> = {
  migration: '#0ea5e9', energy: '#f59e0b', military: '#dc2626',
  diplomatic: '#7c3aed', business: '#10b981', consular: '#f97316',
  humanitarian: '#ec4899', narrative: '#94a3b8',
}
const HORIZON_LABEL: Record<string, string> = {
  '24-72h': '24-72 horas', '7d': '7 días', '30d': '30 días', 'structural': 'Estructural',
}

const URGENCY_COLOR = (u: number): { bg: string; track: string; label: string } => {
  if (u >= 6) return { bg: '#7f1d1d', track: '#dc2626', label: 'CRÍTICO PARA ES' }
  if (u >= 3) return { bg: '#f97316', track: '#f97316', label: 'ALTO PARA ES' }
  return { bg: '#f59e0b', track: '#f59e0b', label: 'MODERADO' }
}
const SOURCE_COLOR: Record<string, string> = {
  ACLED: '#dc2626', UCDP: '#7c3aed', ReliefWeb: '#0ea5e9', Travel: '#f97316', Baseline: '#64748b',
}

export function GeoSpainWatchlist() {
  const router = useRouter()
  const [data, setData] = useState<Resp | null>(null)
  const [loading, setLoading] = useState(true)
  const [auditPayload, setAuditPayload] = useState<GeoAuditPayload | null>(null)

  useEffect(() => {
    let alive = true
    fetch('/api/geopolitica/spain-watchlist', { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j) => { if (alive) setData(j) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  return (
    <section style={{
      background: 'linear-gradient(180deg, #fff7ed 0%, #fff 60%)',
      border: '1px solid #fed7aa',
      borderLeft: '4px solid #ea580c',
      borderRadius: 12,
      padding: 18,
    }}>
      <header style={{ marginBottom: 12 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: '#ea580c', textTransform: 'uppercase' }}>
          ◆ Spain Watchlist · convergencia × presencia ES
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>
          Países donde España tiene exposición Y la convergencia multi-source apunta a
          deterioro. Urgency = (presencia/100) × convergence_score. Todo live · sin listas
          curadas a mano.
        </p>
      </header>

      {loading && <p style={{ fontSize: 11, color: '#94a3b8' }}>Cruzando convergencia × presencia…</p>}

      {data?.ok && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8, marginBottom: 14 }}>
            <Kpi label="Watchlist" value={String(data.n_watchlist ?? 0)} color="#0f172a" />
            <Kpi label="Crítico para ES" value={String(data.summary?.critical_for_spain ?? 0)} color="#7f1d1d" />
            <Kpi label="Alto para ES" value={String(data.summary?.high_for_spain ?? 0)} color="#dc2626" />
            <Kpi label="Moderado" value={String(data.summary?.moderate_for_spain ?? 0)} color="#f59e0b" />
          </div>

          {data.watchlist && data.watchlist.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 560, overflowY: 'auto' }}>
              {data.watchlist.map((w) => {
                const uc = URGENCY_COLOR(w.urgency_score)
                return (
                  <button
                    key={w.iso3}
                    onClick={() => router.push(`/geopolitica/pais/${w.iso3}`)}
                    style={{
                      textAlign: 'left',
                      padding: 12,
                      background: '#fff',
                      border: `1px solid ${uc.track}30`,
                      borderLeft: `4px solid ${uc.track}`,
                      borderRadius: 6,
                      cursor: 'pointer',
                      transition: 'background 0.15s, transform 0.1s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#fff7ed'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.transform = 'translateY(0)' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 6, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{w.spain_presence.country_label_es || w.country}</span>
                        <span style={{ fontSize: 9, color: '#94a3b8', letterSpacing: 0.5 }}>{w.iso3} · {w.region}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 4, background: uc.bg, color: '#fff', letterSpacing: 0.5 }}>{uc.label}</span>
                        <span style={{ fontSize: 18, fontWeight: 700, color: uc.track, fontFamily: 'ui-monospace, monospace' }}>{w.urgency_score.toFixed(1)}</span>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginBottom: 6, fontSize: 10 }}>
                      <span style={{ color: '#64748b' }}>Presencia ES: <strong style={{ color: '#0f172a' }}>{w.spain_presence.intensity}/100</strong></span>
                      <span style={{ color: '#64748b' }}>Convergencia: <strong style={{ color: '#0f172a' }}>{w.convergence_score} ({w.band})</strong></span>
                      <span style={{ color: '#64748b' }}>Categoría: <strong style={{ color: '#0f172a' }}>{w.spain_presence.category}</strong></span>
                    </div>
                    {/* Top signals */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                      {w.top_signals.map((s, i) => {
                        const sc = SOURCE_COLOR[s.source.split(' ')[0]] || SOURCE_COLOR[s.source] || '#94a3b8'
                        return (
                          <span key={i} style={{
                            fontSize: 9,
                            padding: '2px 6px',
                            borderRadius: 3,
                            background: `${sc}15`,
                            color: sc,
                            border: `1px solid ${sc}40`,
                          }}>
                            <strong>{s.source}</strong>{s.level === 'CRITICAL' ? ' ●' : ''} · {s.detail.slice(0, 50)}
                          </span>
                        )
                      })}
                    </div>

                    {/* Sprint G13 FASE 7 · impact channels + horizonte */}
                    {(w.impact_channels && w.impact_channels.length > 0) && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontSize: 9, color: '#64748b', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>Canal impacto:</span>
                        {w.impact_channels.map((ch) => (
                          <span key={ch} style={{
                            fontSize: 9,
                            padding: '2px 7px',
                            borderRadius: 999,
                            background: `${CHANNEL_COLOR[ch] || '#94a3b8'}20`,
                            color: CHANNEL_COLOR[ch] || '#475569',
                            border: `1px solid ${CHANNEL_COLOR[ch] || '#94a3b8'}50`,
                            fontWeight: 600,
                            letterSpacing: 0.3,
                            textTransform: 'uppercase',
                          }}>{ch}</span>
                        ))}
                        {w.likely_time_horizon && (
                          <>
                            <span style={{ fontSize: 9, color: '#94a3b8' }}>·</span>
                            <span style={{ fontSize: 9, color: '#64748b', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>Horizonte:</span>
                            <span style={{
                              fontSize: 9,
                              padding: '2px 7px',
                              borderRadius: 999,
                              background: '#fef3c7',
                              color: '#92400e',
                              border: '1px solid #fcd34d',
                              fontWeight: 600,
                            }}>{HORIZON_LABEL[w.likely_time_horizon] || w.likely_time_horizon}</span>
                          </>
                        )}
                        {typeof w.confidence === 'number' && (
                          <>
                            <span style={{ fontSize: 9, color: '#94a3b8' }}>·</span>
                            <span style={{ fontSize: 9, color: '#64748b', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>Conf:</span>
                            <span style={{ fontSize: 9, color: '#0f172a', fontWeight: 700 }}>{Math.round(w.confidence * 100)}%</span>
                          </>
                        )}
                      </div>
                    )}

                    {/* Sprint G13 FASE 7 · pregunta de monitoreo (lo más importante) */}
                    {w.monitoring_question && (
                      <div style={{ padding: 8, background: '#fffbeb', borderLeft: '3px solid #f59e0b', borderRadius: 3, marginBottom: 6 }}>
                        <p style={{ margin: 0, fontSize: 10, color: '#92400e', fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 3 }}>
                          ◐ Pregunta de monitoreo
                        </p>
                        <p style={{ margin: 0, fontSize: 11, color: '#0f172a', lineHeight: 1.5, fontStyle: 'italic' }}>
                          {w.monitoring_question}
                        </p>
                      </div>
                    )}

                    {/* Fuentes recomendadas para validar */}
                    {w.recommended_sources_to_check && w.recommended_sources_to_check.length > 0 && (
                      <p style={{ margin: '4px 0 0', fontSize: 9, color: '#64748b' }}>
                        ↗ Validar con: <strong style={{ color: '#475569' }}>{w.recommended_sources_to_check.join(' · ')}</strong>
                      </p>
                    )}
                    {/* Sprint G13 FASE 8 · botón auditar (no navega · abre drawer) */}
                    <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                      <span
                        onClick={(e) => {
                          e.stopPropagation()
                          setAuditPayload(buildAuditFromWatchlist(w))
                        }}
                        role="button"
                        style={{
                          display: 'inline-flex', alignItems: 'center', padding: '2px 8px',
                          background: 'transparent', color: '#9a3412', border: '1px solid #fed7aa',
                          borderRadius: 999, fontSize: 9, fontWeight: 700, letterSpacing: 0.4,
                          textTransform: 'uppercase', cursor: 'pointer',
                        }}
                        title="Auditar este país · ver fuentes, confianza, limitaciones"
                      >◇ Auditar</span>
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <p style={{ fontSize: 11, color: '#94a3b8' }}>Sin países en watchlist · ningún solapamiento entre convergence alerts y presencia ES.</p>
          )}

          {/* Sprint G13 FASE 7 · what_it_means / does_not_mean */}
          {(data.what_it_means || data.what_it_does_not_mean) && (
            <div style={{ marginTop: 14, padding: 10, background: '#fff', border: '1px dashed #fed7aa', borderRadius: 4 }}>
              {data.what_it_means && (
                <p style={{ margin: 0, fontSize: 10, color: '#0f172a', lineHeight: 1.5 }}>
                  <strong style={{ color: '#16a34a' }}>Qué mide:</strong> {data.what_it_means}
                </p>
              )}
              {data.what_it_does_not_mean && (
                <p style={{ margin: '6px 0 0', fontSize: 10, color: '#475569', lineHeight: 1.5, fontStyle: 'italic' }}>
                  <strong style={{ color: '#dc2626' }}>Qué NO mide:</strong> {data.what_it_does_not_mean}
                </p>
              )}
            </div>
          )}

          <p style={{ margin: '12px 0 0', fontSize: 9, color: '#64748b', borderTop: '1px solid #fed7aa', paddingTop: 8 }}>
            {data.methodology}
          </p>
        </>
      )}

      {data && !data.ok && (
        <p style={{ fontSize: 11, color: '#dc2626' }}>Watchlist no disponible · {data.error}</p>
      )}

      {/* Sprint G13 FASE 8 · audit drawer compartido */}
      <GeoAuditDrawer
        open={!!auditPayload}
        onClose={() => setAuditPayload(null)}
        payload={auditPayload}
      />
    </section>
  )
}

function Kpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ padding: 8, background: '#fff', borderRadius: 4, border: '1px solid #fed7aa' }}>
      <p style={{ margin: 0, fontSize: 8, color: '#64748b', letterSpacing: 0.5, textTransform: 'uppercase' }}>{label}</p>
      <p style={{ margin: '2px 0 0', fontSize: 20, fontWeight: 700, color, fontFamily: 'ui-monospace, monospace' }}>{value}</p>
    </div>
  )
}

export default GeoSpainWatchlist
