'use client'
/**
 * <NarrativeClustersView /> · Sprint M2.
 *
 * Renderiza NarrativeCluster[] generado por buildNarrativeClusters() ·
 * separa topic (asunto) / frame (encuadre) / narrative (combinación
 * estable de ambos + actores + medios + tiempo).
 *
 * Cada narrativa es AUDITABLE:
 *   - "¿por qué esta narrativa?" → why_this_is_a_narrative
 *   - "¿qué titulares la sustentan?" → evidence
 *   - "¿qué medios la empujan?" → source_diversity + evidence
 *   - "¿qué confianza tiene?" → confidence badge
 *   - "¿qué sesgo de muestra puede haber?" → confidence.reasons + warnings
 */

import { useState } from 'react'
import {
  ConfidenceBadge, ActorImpactPill, MethodologyWarnings, NarrativeEvidence,
} from './MethodologyComponents'

interface NarrativeCluster {
  id: string
  title: string
  short_summary: string
  frame_type: string
  main_topic: string
  secondary_topics: string[]
  articles: string[]
  representative_titles: string[]
  first_seen: string
  last_seen: string
  velocity_score: number
  acceleration_score: number
  reach_estimate: number
  source_diversity?: { warnings?: string[]; ideological_balance_score?: number }
  ideological_spread: { left: number; center: number; right: number; balanced: boolean }
  territorial_spread: string[]
  dominant_actors: string[]
  benefited_actors: string[]
  harmed_actors: string[]
  emotional_register: string
  controversy_score: number
  confidence: { overall: number; reasons: string[] }
  why_this_is_a_narrative: string
  evidence: Array<{ title: string; medium: string; url: string; ideology: string }>
}

const FRAME_COLORS: Record<string, string> = {
  crisis: '#dc2626',
  corrupción: '#7f1d1d',
  amenaza: '#ea580c',
  oportunidad: '#16a34a',
  gestión: '#0891b2',
  identidad: '#7c3aed',
  seguridad: '#b91c1c',
  economía: '#10b981',
  territorial: '#f59e0b',
  institucional: '#1e40af',
  electoral: '#a855f7',
  internacional: '#0ea5e9',
  social: '#84cc16',
  judicial: '#be123c',
  desinformación: '#9333ea',
  otro: '#64748b',
}

function fmtDateShort(iso: string): string {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) } catch { return iso.slice(0, 10) }
}

function fmtVelocity(v: number): string {
  if (v >= 1) return `${v.toFixed(1)} art/h`
  return `${(v * 24).toFixed(1)} art/día`
}

function fmtAcceleration(a: number): { label: string; color: string } {
  if (a >= 0.5) return { label: `↑ ${(a * 100).toFixed(0)}%`, color: '#dc2626' }
  if (a >= 0.1) return { label: `↑ ${(a * 100).toFixed(0)}%`, color: '#f59e0b' }
  if (a <= -0.3) return { label: `↓ ${(a * 100).toFixed(0)}%`, color: '#16a34a' }
  return { label: '→ estable', color: '#64748b' }
}

export function NarrativeClustersView({ clusters }: { clusters: NarrativeCluster[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (!clusters || clusters.length === 0) {
    return (
      <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 11 }}>
        Sin narrativas detectadas en esta ventana · ventana muy estrecha o pocas señales.
      </section>
    )
  }

  return (
    <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderLeft: '4px solid #7c3aed', borderRadius: 10, padding: 14 }}>
      <header style={{ marginBottom: 10 }}>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: 0.7, color: '#7c3aed', textTransform: 'uppercase' }}>
          ◆ Narrativas detectadas · clustering metodológico
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>
          <strong>Topic</strong> · asunto · <strong>Frame</strong> · cómo se encuadra · <strong>Narrativa</strong> ·
          combinación estable de topic + frame + actores + medios + tiempo. Cada narrativa es auditable: click
          para ver titulares, medios que la empujan y por qué se considera narrativa.
        </p>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {clusters.map((c) => {
          const frameColor = FRAME_COLORS[c.frame_type] || '#64748b'
          const accel = fmtAcceleration(c.acceleration_score)
          const isOpen = expandedId === c.id
          return (
            <article key={c.id} style={{
              border: `1px solid ${frameColor}30`,
              borderLeft: `4px solid ${frameColor}`,
              background: isOpen ? '#fafafa' : '#fff',
              borderRadius: 6,
              padding: 12,
            }}>
              <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: 0.5, padding: '2px 7px', borderRadius: 3,
                      background: frameColor, color: '#fff', textTransform: 'uppercase',
                    }}>{c.frame_type}</span>
                    <span style={{
                      fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 3,
                      background: '#f1f5f9', color: '#475569', letterSpacing: 0.3,
                    }}>topic · {c.main_topic}</span>
                    <span style={{ fontSize: 9, color: '#94a3b8', letterSpacing: 0.3 }}>
                      {c.articles.length} artículos · {c.territorial_spread.length > 0 ? `${c.territorial_spread.length} territorios` : 'sin territorio'} · alcance ~{c.reach_estimate}
                    </span>
                  </div>
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>{c.title}</h3>
                  <p style={{ margin: '4px 0 0', fontSize: 11, color: '#475569', lineHeight: 1.45 }}>{c.short_summary}</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
                  <ConfidenceBadge value={c.confidence.overall} label="conf narrativa" size="xs" reasons={c.confidence.reasons} />
                  <span style={{ fontSize: 9, color: accel.color, fontWeight: 700, letterSpacing: 0.3, fontFamily: 'ui-monospace, monospace' }}>
                    {fmtVelocity(c.velocity_score)} · {accel.label}
                  </span>
                  <span style={{ fontSize: 9, color: '#94a3b8' }}>
                    {fmtDateShort(c.first_seen)} → {fmtDateShort(c.last_seen)}
                  </span>
                </div>
              </header>

              {/* Strip · actors, beneficiarios, perjudicados */}
              {(c.dominant_actors.length > 0 || c.harmed_actors.length > 0 || c.benefited_actors.length > 0) && (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
                  {c.dominant_actors.slice(0, 4).map((a) => (
                    <span key={`d-${a}`} style={{ fontSize: 9, padding: '2px 7px', borderRadius: 3, background: '#1e293b', color: '#f1f5f9', letterSpacing: 0.3 }}>
                      ● {a}
                    </span>
                  ))}
                  {c.harmed_actors.slice(0, 3).map((a) => (
                    <ActorImpactPill key={`h-${a}`} actor={a} impact="harmful" confidence={0.7} reason="objeto de acciones negativas en la narrativa" />
                  ))}
                  {c.benefited_actors.slice(0, 2).map((a) => (
                    <ActorImpactPill key={`b-${a}`} actor={a} impact="beneficial" confidence={0.65} reason="objeto/sujeto de acciones positivas" />
                  ))}
                </div>
              )}

              {/* Strip ideológico mini */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8, fontSize: 9, color: '#64748b' }}>
                <span style={{ fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase' }}>Cobertura ideológica:</span>
                <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', flex: 1, maxWidth: 240 }}>
                  <div style={{ width: `${c.ideological_spread.left * 100}%`, background: '#dc2626' }} title={`Izquierda ${(c.ideological_spread.left * 100).toFixed(0)}%`} />
                  <div style={{ width: `${c.ideological_spread.center * 100}%`, background: '#94a3b8' }} title={`Centro ${(c.ideological_spread.center * 100).toFixed(0)}%`} />
                  <div style={{ width: `${c.ideological_spread.right * 100}%`, background: '#1e40af' }} title={`Derecha ${(c.ideological_spread.right * 100).toFixed(0)}%`} />
                </div>
                {c.ideological_spread.balanced ? (
                  <span style={{ color: '#16a34a', fontWeight: 600 }}>balanceada</span>
                ) : (
                  <span style={{ color: '#f59e0b', fontWeight: 600 }}>sesgada</span>
                )}
                <span style={{ marginLeft: 'auto', color: '#94a3b8' }}>
                  emoción: <strong style={{ color: '#0f172a' }}>{c.emotional_register}</strong> · controv. {c.controversy_score}/100
                </span>
                <button
                  onClick={() => setExpandedId(isOpen ? null : c.id)}
                  style={{
                    background: isOpen ? '#7c3aed' : '#f1f5f9',
                    color: isOpen ? '#fff' : '#475569',
                    border: 'none', borderRadius: 3, fontSize: 9, fontWeight: 700,
                    padding: '3px 8px', cursor: 'pointer', letterSpacing: 0.4,
                  }}
                >
                  {isOpen ? '× cerrar' : 'auditar narrativa'}
                </button>
              </div>

              {/* Expandido · evidencia + por qué + warnings */}
              {isOpen && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #e5e7eb' }}>
                  <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: '#475569', letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 4 }}>
                    ¿Por qué se considera narrativa?
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: '#0f172a', lineHeight: 1.5, fontStyle: 'italic' }}>
                    {c.why_this_is_a_narrative}
                  </p>

                  {c.secondary_topics.length > 0 && (
                    <p style={{ margin: '10px 0 0', fontSize: 10, color: '#64748b' }}>
                      <strong>Temas secundarios:</strong> {c.secondary_topics.join(', ')}
                    </p>
                  )}

                  {c.territorial_spread.length > 0 && (
                    <p style={{ margin: '4px 0 0', fontSize: 10, color: '#64748b' }}>
                      <strong>Territorios mencionados:</strong> {c.territorial_spread.join(' · ')}
                    </p>
                  )}

                  <p style={{ margin: '10px 0 6px', fontSize: 9, fontWeight: 700, color: '#475569', letterSpacing: 0.4, textTransform: 'uppercase' }}>
                    Evidencia · titulares de medios diversos
                  </p>
                  <NarrativeEvidence evidence={c.evidence} />

                  {c.confidence.reasons.length > 0 && (
                    <div style={{ marginTop: 10 }}>
                      <MethodologyWarnings warnings={c.confidence.reasons} title="Limitaciones de esta narrativa" />
                    </div>
                  )}
                </div>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}

export default NarrativeClustersView
