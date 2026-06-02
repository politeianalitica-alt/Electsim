'use client'
/**
 * `<GeoAuditDrawer />` · Sprint G13 FASE 8.
 *
 * Drawer lateral SOBRIO que muestra el lineage completo de una señal/card/
 * insight geopolítico. Debe poder abrirse desde:
 *   - GeoTermometro (Spain Risk Index)
 *   - Convergence Alerts (un país)
 *   - Spain Watchlist (un país)
 *   - OSINT item
 *   - Country card
 *   - Theme Cluster
 *   - GDELT TV item
 *
 * Renderiza, según campos presentes:
 *   - título + resumen
 *   - source_mode + geo_layer + temporal_scope (badges)
 *   - endpoint consultado
 *   - timestamp generación
 *   - países y roles (si aplica)
 *   - score breakdown (componentes con peso, confianza, caveat)
 *   - confidence overall + componentes (source_quality, freshness, ...)
 *   - evidence (frases que dispararon las inferencias)
 *   - limitations / what_it_does_not_mean
 *   - transformations + rules_triggered (si vienen)
 *   - fallback_used + llm_used flags
 *   - what_this_means + what_this_does_not_mean
 *
 * Sin librerías de UI. Sólo portal manual con position:fixed.
 */
import { useEffect } from 'react'
import type { GeoEndpointMode, GeoLayer, GeoTemporalScope } from '@/lib/geopolitica/geo-methodology'
import { GeoSourceBadge } from './GeoSourceBadge'
// Sprint Q-C.3 · G3 · humanizer para snake_case que se filtraba a UI.
import { humanizeTemporalScope, humanizeSourceMode } from '@/lib/geopolitica/label-mappings'

export interface GeoAuditPayload {
  // Identificación
  title: string
  subtitle?: string
  summary?: string

  // Procedencia
  source_mode?: GeoEndpointMode
  geo_layer?: GeoLayer
  temporal_scope?: GeoTemporalScope
  endpoint?: string
  source_name?: string
  generated_at?: string
  generated_by?: string

  // Datos
  countries?: Array<{ country: string; role: string; confidence?: number; evidence?: string }>
  score?: { value: number; band?: string; what?: string }
  score_breakdown?: Array<{
    key: string
    label: string
    weight?: number
    norm?: number | null
    source?: string
    source_mode?: string
    layer?: string
    confidence?: number
    caveat?: string
    interpretation?: string
  }>
  confidence?: {
    overall?: number
    source_quality?: number
    freshness?: number
    triangulation?: number
    specificity?: number
    evidence_strength?: number
    reasons?: string[]
    warnings?: string[]
  }
  evidence?: string[]
  limitations?: string[]
  transformations?: string[]
  rules_triggered?: string[]

  // Flags
  fallback_used?: boolean
  llm_used?: boolean
  double_counting_warning?: string | null

  // Semántica auditable
  what_it_means?: string
  what_it_does_not_mean?: string

  // Sources usadas (para hybrid endpoints)
  sources_used?: string[]
  // Métadatos técnicos
  latency_ms?: number
  methodology_version?: string
}

export interface GeoAuditDrawerProps {
  open: boolean
  onClose: () => void
  payload: GeoAuditPayload | null
}

export function GeoAuditDrawer({ open, onClose, payload }: GeoAuditDrawerProps) {
  // ESC para cerrar
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || !payload) return null

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)',
          zIndex: 9998, backdropFilter: 'blur(2px)',
        }}
      />
      {/* Drawer */}
      <aside
        role="dialog"
        aria-label="Auditoría de señal geopolítica"
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: 'min(560px, 95vw)',
          background: '#fff', boxShadow: '-12px 0 32px rgba(15,23,42,0.18)',
          zIndex: 9999, display: 'flex', flexDirection: 'column',
          fontFamily: 'inherit',
        }}
      >
        {/* Header */}
        <header style={{ padding: '14px 18px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 9, fontWeight: 700, letterSpacing: 0.6, color: '#64748b', textTransform: 'uppercase' }}>
              ◆ Auditoría de señal geopolítica
            </p>
            <h2 style={{ margin: '4px 0 0', fontSize: 15, fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>{payload.title}</h2>
            {payload.subtitle && <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748b' }}>{payload.subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 18, color: '#64748b', padding: 0, lineHeight: 1, marginTop: 2 }}
          >×</button>
        </header>

        {/* Body scroll */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Badges procedencia */}
          {(payload.source_mode || payload.geo_layer || payload.temporal_scope) && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {payload.source_mode && (
                <GeoSourceBadge mode={payload.source_mode} layer={payload.geo_layer} confidence={payload.confidence?.overall} />
              )}
              {payload.temporal_scope && (
                // Sprint Q-C.3 · G3 · ANTES renderizaba el slug crudo (`last_30d`,
                // `annual`, `realtime`) en el badge UI. AHORA pasa por humanizer.
                <span style={{
                  fontSize: 9, padding: '2px 7px', borderRadius: 999, fontWeight: 700, letterSpacing: 0.3, textTransform: 'uppercase',
                  background: payload.temporal_scope === 'annual' || payload.temporal_scope === 'historical' ? '#f3e8ff' : payload.temporal_scope === 'last_30d' ? '#dbeafe' : payload.temporal_scope === 'realtime' ? '#dcfce7' : '#f1f5f9',
                  color: payload.temporal_scope === 'annual' || payload.temporal_scope === 'historical' ? '#6b21a8' : payload.temporal_scope === 'last_30d' ? '#1e40af' : payload.temporal_scope === 'realtime' ? '#166534' : '#475569',
                }}>{humanizeTemporalScope(payload.temporal_scope)}</span>
              )}
              {payload.fallback_used && (
                <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 999, fontWeight: 700, background: '#fee2e2', color: '#991b1b', letterSpacing: 0.3, textTransform: 'uppercase' }}>
                  Fallback usado
                </span>
              )}
              {payload.llm_used && (
                <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 999, fontWeight: 700, background: '#fae8ff', color: '#86198f', letterSpacing: 0.3, textTransform: 'uppercase' }}>
                  IA usado{payload.generated_by ? ` · ${payload.generated_by}` : ''}
                </span>
              )}
            </div>
          )}

          {payload.summary && (
            <p style={{ margin: 0, fontSize: 12, color: '#0f172a', lineHeight: 1.5 }}>{payload.summary}</p>
          )}

          {/* Qué mide / qué NO mide · siempre prominente */}
          {(payload.what_it_means || payload.what_it_does_not_mean) && (
            <Section title="Lectura epistemológica">
              {payload.what_it_means && (
                <p style={{ margin: 0, fontSize: 11, color: '#0f172a', lineHeight: 1.5 }}>
                  <strong style={{ color: '#16a34a' }}>Qué mide:</strong> {payload.what_it_means}
                </p>
              )}
              {payload.what_it_does_not_mean && (
                <p style={{ margin: '6px 0 0', fontSize: 11, color: '#475569', lineHeight: 1.5, fontStyle: 'italic' }}>
                  <strong style={{ color: '#dc2626' }}>Qué NO mide:</strong> {payload.what_it_does_not_mean}
                </p>
              )}
            </Section>
          )}

          {/* Double counting warning */}
          {payload.double_counting_warning && (
            <Section title="▲ Double counting detectado">
              <p style={{ margin: 0, fontSize: 11, color: '#92400e', lineHeight: 1.5 }}>{payload.double_counting_warning}</p>
            </Section>
          )}

          {/* Score */}
          {payload.score && (
            <Section title="Score">
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <span style={{ fontSize: 28, fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' as const }}>{payload.score.value}</span>
                {payload.score.band && <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.4 }}>{payload.score.band}</span>}
              </div>
              {payload.score.what && (
                <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b' }}>{payload.score.what}</p>
              )}
            </Section>
          )}

          {/* Score breakdown */}
          {payload.score_breakdown && payload.score_breakdown.length > 0 && (
            <Section title="Descomposición del score">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {payload.score_breakdown.map((c) => (
                  <div key={c.key} style={{ padding: 8, background: '#f8fafc', borderRadius: 4, border: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
                      <strong style={{ fontSize: 11, color: '#0f172a' }}>{c.label}</strong>
                      <span style={{ fontSize: 10, color: '#475569', fontFamily: 'ui-monospace, monospace' }}>
                        {typeof c.norm === 'number' ? `${c.norm.toFixed(0)}/100` : '—'}
                        {typeof c.weight === 'number' && ` · peso ${Math.round(c.weight * 100)}%`}
                      </span>
                    </div>
                    {c.source && (
                      // Sprint Q-C.3 · G3 · source_mode pasaba por uppercase pero
                      // mantenía el slug crudo · ahora se humaniza primero.
                      <p style={{ margin: '2px 0 0', fontSize: 9, color: '#64748b' }}>
                        <strong>Fuente:</strong> {c.source}
                        {c.source_mode && <> · <span>{humanizeSourceMode(c.source_mode)}</span></>}
                        {c.layer && <> · {c.layer}</>}
                        {typeof c.confidence === 'number' && <> · conf {Math.round(c.confidence * 100)}%</>}
                      </p>
                    )}
                    {c.caveat && (
                      <p style={{ margin: '4px 0 0', fontSize: 10, color: '#92400e', fontStyle: 'italic' }}>
                        ▲ {c.caveat}
                      </p>
                    )}
                    {c.interpretation && (
                      <p style={{ margin: '3px 0 0', fontSize: 10, color: '#475569' }}>
                        {c.interpretation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Países y roles */}
          {payload.countries && payload.countries.length > 0 && (
            <Section title="Países y roles">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {payload.countries.map((c, i) => (
                  <div key={`${c.country}-${i}`} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 60px', gap: 8, padding: '4px 8px', background: '#f8fafc', borderRadius: 3, fontSize: 11 }}>
                    <strong style={{ color: '#0f172a' }}>{c.country}</strong>
                    <span style={{ color: '#475569', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.3 }}>{c.role}</span>
                    <span style={{ color: '#64748b', textAlign: 'right', fontSize: 10, fontFamily: 'ui-monospace, monospace' }}>
                      {typeof c.confidence === 'number' ? `${Math.round(c.confidence * 100)}%` : '—'}
                    </span>
                    {c.evidence && (
                      <p style={{ gridColumn: '1 / -1', margin: '2px 0 0', fontSize: 9, color: '#64748b', fontStyle: 'italic' }}>
                        ↳ {c.evidence}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Confidence components */}
          {payload.confidence && (
            <Section title={`Confianza · ${typeof payload.confidence.overall === 'number' ? Math.round(payload.confidence.overall * 100) + '%' : '—'}`}>
              {(typeof payload.confidence.source_quality === 'number' || typeof payload.confidence.freshness === 'number') && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 6, marginBottom: 8 }}>
                  {[
                    ['source_quality', 'Calidad fuente'],
                    ['freshness', 'Frescura'],
                    ['triangulation', 'Triangulación'],
                    ['specificity', 'Especificidad'],
                    ['evidence_strength', 'Evidencia'],
                  ].map(([k, label]) => {
                    const v = payload.confidence?.[k as keyof typeof payload.confidence]
                    if (typeof v !== 'number') return null
                    return (
                      <div key={k} style={{ padding: '4px 8px', background: '#f1f5f9', borderRadius: 3 }}>
                        <p style={{ margin: 0, fontSize: 9, color: '#64748b', letterSpacing: 0.3, textTransform: 'uppercase' }}>{label}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 12, fontWeight: 700, color: '#0f172a', fontVariantNumeric: 'tabular-nums' as const }}>{Math.round(v * 100)}%</p>
                      </div>
                    )
                  })}
                </div>
              )}
              {payload.confidence.reasons && payload.confidence.reasons.length > 0 && (
                <details>
                  <summary style={{ fontSize: 10, color: '#475569', cursor: 'pointer', fontWeight: 700, letterSpacing: 0.3, textTransform: 'uppercase' }}>
                    Razones del cálculo ({payload.confidence.reasons.length})
                  </summary>
                  <ul style={{ margin: '6px 0 0 16px', padding: 0, fontSize: 10, color: '#475569', lineHeight: 1.5 }}>
                    {payload.confidence.reasons.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </details>
              )}
              {payload.confidence.warnings && payload.confidence.warnings.length > 0 && (
                <div style={{ marginTop: 6, padding: 6, background: '#fef3c7', borderRadius: 3 }}>
                  <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: '#92400e', letterSpacing: 0.3, textTransform: 'uppercase' }}>▲ Advertencias</p>
                  <ul style={{ margin: '4px 0 0 16px', padding: 0, fontSize: 10, color: '#92400e', lineHeight: 1.5 }}>
                    {payload.confidence.warnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              )}
            </Section>
          )}

          {/* Evidence */}
          {payload.evidence && payload.evidence.length > 0 && (
            <Section title={`Evidencia (${payload.evidence.length})`}>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: '#475569', lineHeight: 1.5 }}>
                {payload.evidence.slice(0, 12).map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </Section>
          )}

          {/* Limitations */}
          {payload.limitations && payload.limitations.length > 0 && (
            <Section title="Limitaciones">
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: '#92400e', lineHeight: 1.5 }}>
                {payload.limitations.map((l, i) => <li key={i}>{l}</li>)}
              </ul>
            </Section>
          )}

          {/* Transformations + Rules */}
          {((payload.transformations && payload.transformations.length > 0) || (payload.rules_triggered && payload.rules_triggered.length > 0)) && (
            <Section title="Transformaciones aplicadas">
              {payload.transformations && payload.transformations.length > 0 && (
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 10, color: '#475569', lineHeight: 1.4 }}>
                  {payload.transformations.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              )}
              {payload.rules_triggered && payload.rules_triggered.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: '#475569', letterSpacing: 0.3, textTransform: 'uppercase' }}>Reglas activadas</p>
                  <ul style={{ margin: '4px 0 0 18px', padding: 0, fontSize: 10, color: '#475569', lineHeight: 1.4 }}>
                    {payload.rules_triggered.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}
            </Section>
          )}

          {/* Sources used */}
          {payload.sources_used && payload.sources_used.length > 0 && (
            <Section title={`Fuentes consultadas (${payload.sources_used.length})`}>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 10, color: '#475569', lineHeight: 1.5, fontFamily: 'ui-monospace, monospace' }}>
                {payload.sources_used.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </Section>
          )}

          {/* Metadata técnico */}
          <Section title="Metadatos técnicos">
            <table style={{ width: '100%', fontSize: 10, color: '#475569', fontFamily: 'ui-monospace, monospace', borderCollapse: 'collapse' }}>
              <tbody>
                {payload.endpoint && <tr><td style={{ padding: '2px 8px 2px 0', color: '#94a3b8', whiteSpace: 'nowrap' }}>endpoint</td><td>{payload.endpoint}</td></tr>}
                {payload.source_name && <tr><td style={{ padding: '2px 8px 2px 0', color: '#94a3b8', whiteSpace: 'nowrap' }}>source_name</td><td>{payload.source_name}</td></tr>}
                {payload.generated_at && <tr><td style={{ padding: '2px 8px 2px 0', color: '#94a3b8', whiteSpace: 'nowrap' }}>generated_at</td><td>{payload.generated_at}</td></tr>}
                {payload.generated_by && <tr><td style={{ padding: '2px 8px 2px 0', color: '#94a3b8', whiteSpace: 'nowrap' }}>generated_by</td><td>{payload.generated_by}</td></tr>}
                {typeof payload.latency_ms === 'number' && <tr><td style={{ padding: '2px 8px 2px 0', color: '#94a3b8', whiteSpace: 'nowrap' }}>latency_ms</td><td>{payload.latency_ms}</td></tr>}
                {payload.methodology_version && <tr><td style={{ padding: '2px 8px 2px 0', color: '#94a3b8', whiteSpace: 'nowrap' }}>methodology</td><td>{payload.methodology_version}</td></tr>}
              </tbody>
            </table>
          </Section>

          {/* Disclaimer al pie */}
          <p style={{ margin: '8px 0 0', padding: 8, background: '#f8fafc', borderRadius: 4, fontSize: 10, color: '#64748b', fontStyle: 'italic', lineHeight: 1.5 }}>
            Esta auditoría refleja lo que el sistema calculó automáticamente. NO sustituye lectura humana de las fuentes primarias. Validar conclusiones críticas con artículos completos antes de citar o decidir.
          </p>
        </div>
      </aside>
    </>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <p style={{ margin: '0 0 6px', fontSize: 9, fontWeight: 700, letterSpacing: 0.6, color: '#0f172a', textTransform: 'uppercase' }}>{title}</p>
      {children}
    </section>
  )
}

/**
 * Helpers para componer payloads desde respuestas conocidas.
 * Sprint G13 FASE 8 · cada endpoint puede traducir su shape al payload del drawer.
 */

export function buildAuditFromRiskIndex(data: any): GeoAuditPayload {
  const meta = data?._geo_meta
  return {
    title: 'Spain Composite Risk Index',
    subtitle: data?.band ? `BANDA · ${data.band}` : undefined,
    source_mode: meta?.source_mode,
    geo_layer: meta?.layer,
    endpoint: '/api/geopolitica/risk-index',
    generated_at: data?.generated_at,
    score: typeof data?.score === 'number' ? { value: data.score, band: data?.band, what: data?.interpretation } : undefined,
    score_breakdown: Array.isArray(data?.components) ? data.components : undefined,
    confidence: typeof data?.confidence === 'number'
      ? { overall: data.confidence, reasons: undefined, warnings: meta?.warnings }
      : undefined,
    double_counting_warning: data?.double_counting_warning,
    what_it_means: data?.what_it_means,
    what_it_does_not_mean: data?.what_it_does_not_mean,
    sources_used: meta?.sources_used,
    llm_used: meta?.source_mode === 'llm_cluster',
    fallback_used: meta?.source_mode === 'fallback',
    latency_ms: meta?.latency_ms,
    methodology_version: meta?.methodology_version,
  }
}

export function buildAuditFromConvergence(country: any, sourcesTemporalScope?: any, meta?: any): GeoAuditPayload {
  return {
    title: `Convergencia · ${country?.name || country?.iso3}`,
    subtitle: country?.band ? `${country.band} · score ${country?.convergence_score}` : undefined,
    summary: country?.explanation,
    source_mode: meta?.source_mode || 'analytical_model',
    geo_layer: 'analytical_model',
    endpoint: '/api/geopolitica/convergence',
    score: typeof country?.convergence_score === 'number' ? { value: country.convergence_score, band: country?.band } : undefined,
    score_breakdown: Array.isArray(country?.signals) ? country.signals.map((s: any) => ({
      key: s.source, label: s.source, norm: null, source: s.detail,
      source_mode: s.source_type, layer: s.layer, confidence: s.confidence, caveat: s.caveat,
    })) : undefined,
    limitations: country?.caveats,
    what_it_does_not_mean: 'NO sumar señales heterogéneas · cada capa mide cosa distinta · UCDP es estructural, ReliefWeb 30d, Travel realtime, Baseline curado.',
    sources_used: meta?.sources_used,
    methodology_version: meta?.methodology_version,
  }
}

export function buildAuditFromWatchlist(entry: any, meta?: any): GeoAuditPayload {
  return {
    title: `Watchlist · ${entry?.country}`,
    subtitle: entry?.band ? `Urgencia ${entry?.urgency_score} · ${entry.band}` : undefined,
    summary: entry?.explanation,
    source_mode: meta?.source_mode || 'analytical_model',
    geo_layer: 'analytical_model',
    endpoint: '/api/geopolitica/spain-watchlist',
    confidence: typeof entry?.confidence === 'number' ? { overall: entry.confidence, warnings: meta?.warnings } : undefined,
    countries: entry?.iso3 ? [{ country: entry.country, role: entry.primary_impact_channel || 'spain_interest', confidence: entry.exposure_confidence, evidence: entry.exposure_type }] : undefined,
    limitations: entry?.caveats,
    what_it_means: meta?.what_it_means,
    what_it_does_not_mean: meta?.what_it_does_not_mean || 'NO es una lista de amenazas a España · es prioridad de seguimiento basada en exposición declarada.',
    sources_used: meta?.sources_used,
    methodology_version: meta?.methodology_version,
  }
}

export function buildAuditFromTheme(theme: any, top?: any): GeoAuditPayload {
  return {
    title: `Tema IA · ${theme?.name}`,
    subtitle: `Relevancia ${theme?.relevance} · ${theme?.n_members} items en ${theme?.n_sources} fuentes`,
    summary: theme?.summary,
    source_mode: 'llm_cluster',
    geo_layer: 'qualitative_osint',
    endpoint: '/api/geopolitica/themes',
    generated_by: top?.generated_by,
    generated_at: top?.generated_at,
    llm_used: true,
    confidence: typeof theme?.confidence === 'number' ? { overall: theme.confidence } : undefined,
    limitations: theme?.limitations,
    evidence: Array.isArray(theme?.member_evidence)
      ? theme.member_evidence.slice(0, 8).map((m: any) => `[${m.source}] ${m.title}`)
      : undefined,
    what_it_means: top?.what_it_means,
    what_it_does_not_mean: top?.what_it_does_not_mean || 'NO ES FUENTE FACTUAL · validar con artículos primarios.',
    sources_used: Array.isArray(theme?.sources) ? theme.sources.map((s: string) => `RSS feed · ${s}`) : undefined,
  }
}
