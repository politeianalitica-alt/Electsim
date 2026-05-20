'use client'
import { useMemo, useState } from 'react'
import { useApi } from '@/lib/useApi'

type Lifecycle = 'emergence' | 'peak' | 'decline'
type Narrative = {
  id: string
  frame_label?: string
  title?: string
  central_claim?: string
  lifecycle?: Lifecycle | string
  velocity?: 'up' | 'down' | 'flat' | string
  article_count?: number
  dominant_emotion?: string
  promoters?: string[]
  recommended_action?: string
  emergence_date?: string
  peak_date?: string
  decline_date?: string
}

const STEPS: Lifecycle[] = ['emergence', 'peak', 'decline']
const STEP_LABELS: Record<Lifecycle, string> = {
  emergence: 'Emergencia',
  peak: 'Pico',
  decline: 'Declive',
}

const FALLBACK: Narrative[] = [
  {
    id: 'n1', frame_label: 'Crisis migratoria Canarias',
    central_claim: 'La oleada migratoria en Canarias supera capacidad de acogida y refleja fracaso del pacto UE.',
    lifecycle: 'peak', velocity: 'up', article_count: 142,
    dominant_emotion: 'alarma', promoters: ['VOX', 'PP'],
    recommended_action: 'Preparar respuesta del Gobierno con datos de coordinación con FRONTEX.',
    emergence_date: '2026-04-22', peak_date: '2026-05-06',
  },
  {
    id: 'n2', frame_label: 'Bloqueo presupuestario · Junts',
    central_claim: 'Junts condiciona Presupuestos a transferencia fiscal completa antes de junio.',
    lifecycle: 'peak', velocity: 'up', article_count: 98,
    dominant_emotion: 'tensión', promoters: ['Junts', 'PP', 'oposición'],
    recommended_action: 'Activar mensaje de estabilidad económica y plan B presupuestario.',
    emergence_date: '2026-04-29', peak_date: '2026-05-07',
  },
  {
    id: 'n3', frame_label: 'Vivienda · Ley andaluza',
    central_claim: 'La Junta de Andalucía propone modelo alternativo a la Ley estatal de Vivienda.',
    lifecycle: 'emergence', velocity: 'up', article_count: 47,
    dominant_emotion: 'expectativa', promoters: ['PP', 'patronal vivienda'],
    recommended_action: 'Anticipar respuesta del Ministerio y datos de impacto en alquileres.',
    emergence_date: '2026-05-04',
  },
  {
    id: 'n4', frame_label: 'BCE actas hawkish',
    central_claim: 'Las actas de abril del BCE retrasan recortes de tipos al cuarto trimestre.',
    lifecycle: 'decline', velocity: 'down', article_count: 28,
    dominant_emotion: 'incertidumbre', promoters: ['analistas'],
    recommended_action: 'Comunicación tranquilizadora sobre euríbor hipotecario.',
    emergence_date: '2026-04-30', peak_date: '2026-05-02', decline_date: '2026-05-06',
  },
  {
    id: 'n5', frame_label: 'Sanidad · listas de espera',
    central_claim: 'Las listas de espera quirúrgicas marcan máximos históricos en 7 CCAA.',
    lifecycle: 'emergence', velocity: 'up', article_count: 53,
    dominant_emotion: 'preocupación', promoters: ['PSOE', 'Sumar', 'sindicatos'],
    recommended_action: 'Respuesta del Ministerio de Sanidad con plan de choque y financiación.',
    emergence_date: '2026-05-05',
  },
  {
    id: 'n6', frame_label: 'Sentencia TS amnistía',
    central_claim: 'TS confirma anulación parcial de la amnistía a Puigdemont; recurso al TC.',
    lifecycle: 'decline', velocity: 'flat', article_count: 31,
    dominant_emotion: 'desgaste', promoters: ['judicatura', 'oposición'],
    recommended_action: 'Foco en agenda económica para desplazar atención mediática.',
    emergence_date: '2026-05-01', peak_date: '2026-05-03', decline_date: '2026-05-07',
  },
]

function lifecycleColor(lc?: string) {
  if (lc === 'peak') return '#c42c2c'
  if (lc === 'emergence') return '#b25000'
  if (lc === 'decline') return '#6e6e73'
  return '#1F4E8C'
}

export default function NarrativeLifecycle() {
  const [expanded, setExpanded] = useState<string | null>(null)
  const { data } = useApi<{ items?: Narrative[] } | Narrative[]>('/api/media/narratives', { refreshInterval: 300_000 })

  const arr = (Array.isArray(data) ? data : data?.items) ?? []
  const items = arr.length > 0 ? arr : FALLBACK

  const stats = useMemo(() => ({
    total: items.length,
    peak: items.filter(n => n.lifecycle === 'peak').length,
    emergence: items.filter(n => n.lifecycle === 'emergence').length,
    decline: items.filter(n => n.lifecycle === 'decline').length,
  }), [items])

  return (
 <section style={{ background: '#fff', border: '1px solid #e8e8ed', borderRadius: 22, padding: '24px 28px', marginTop: 22 }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
 <div>
 <p style={{ fontSize: 10, color: '#6e6e73', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, margin: '0 0 4px' }}>
            Inteligencia narrativa
 </p>
 <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em' }}>
            Narrativas activas · ciclo de vida
 </h3>
 <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6e6e73' }}>
            Click en cada tarjeta para expandir el ciclo, promotores y acción recomendada.
 </p>
 </div>
 <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { l: 'Total', v: stats.total, c: '#1d1d1f' },
            { l: 'En peak', v: stats.peak, c: '#c42c2c' },
            { l: 'Emergentes', v: stats.emergence, c: '#b25000' },
            { l: 'En declive', v: stats.decline, c: '#6e6e73' },
          ].map(p => (
 <span key={p.l} style={{
              padding: '5px 12px', borderRadius: 999, background: `${p.c}10`, border: `1px solid ${p.c}30`,
              fontSize: 11, color: '#1d1d1f',
            }}>
              {p.l}: <strong style={{ color: p.c, fontFamily: 'var(--font-display,system-ui)', fontWeight: 700 }}>{p.v}</strong>
 </span>
          ))}
 </div>
 </div>

 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {items.map(n => {
          const isExpanded = expanded === n.id
          const stepIdx = STEPS.indexOf((n.lifecycle as Lifecycle) ?? 'emergence')
          const lcColor = lifecycleColor(n.lifecycle)
          return (
 <div key={n.id}
              onClick={() => setExpanded(isExpanded ? null : n.id)}
              style={{
                padding: '16px 18px', borderRadius: 14,
                background: '#fff', border: `1px solid ${isExpanded ? lcColor + '60' : '#f0f0f3'}`,
                cursor: 'pointer', transition: 'border-color 200ms ease, box-shadow 200ms ease',
                boxShadow: isExpanded ? `0 4px 16px ${lcColor}18` : 'none',
              }}>
 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
 <h4 style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#1d1d1f', lineHeight: 1.3 }}>
                  {n.frame_label ?? n.title ?? n.id}
 </h4>
 <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
 <span style={{
                    padding: '2px 8px', borderRadius: 999, background: `${lcColor}18`, color: lcColor,
                    fontSize: 9.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                  }}>{n.lifecycle}</span>
 <span style={{ fontSize: 10, color: '#6e6e73' }}>{isExpanded ? '▼' : '▶'}</span>
 </div>
 </div>

              {!isExpanded && n.central_claim && (
 <p style={{
                  margin: '0 0 10px', fontSize: 11.5, color: '#424245', lineHeight: 1.5,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>{n.central_claim}</p>
              )}

 <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: '#6e6e73', flexWrap: 'wrap', marginBottom: isExpanded ? 12 : 0 }}>
 <span>{n.article_count ?? 0} artículos</span>
 <span>·</span>
 <span style={{ color: n.velocity === 'up' ? '#c42c2c' : n.velocity === 'down' ? '#2d8a39' : '#6e6e73' }}>
                  {n.velocity === 'up' ? '▲ subiendo' : n.velocity === 'down' ? '▼ bajando' : '→ estable'}
 </span>
                {n.dominant_emotion && (
 <>
 <span>·</span>
 <span style={{
                      padding: '2px 8px', borderRadius: 999, background: 'rgba(31,78,140,0.10)', color: '#1F4E8C', fontWeight: 600,
                    }}>{n.dominant_emotion}</span>
 </>
                )}
 </div>

              {isExpanded && (
 <div style={{ marginTop: 4 }}>
                  {n.central_claim && (
 <blockquote style={{
                      borderLeft: `3px solid ${lcColor}`, paddingLeft: 12, margin: '0 0 14px',
                      fontSize: 12, color: '#424245', fontStyle: 'italic', lineHeight: 1.5,
                    }}>
                      {n.central_claim}
 </blockquote>
                  )}

                  {(n.promoters?.length ?? 0) > 0 && (
 <div style={{ marginBottom: 14 }}>
 <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em', color: '#6e6e73', textTransform: 'uppercase', marginBottom: 6 }}>
                        Promotores
 </div>
 <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                        {n.promoters!.map(p => (
 <span key={p} style={{
                            fontSize: 10.5, padding: '3px 9px', borderRadius: 999,
                            background: 'rgba(31,78,140,0.10)', color: '#1F4E8C', fontWeight: 600,
                          }}>{p}</span>
                        ))}
 </div>
 </div>
                  )}

                  {n.recommended_action && (
 <div style={{
                      padding: '10px 14px', background: '#f5f9ff', border: '1px solid #cfe0f3', borderRadius: 10, marginBottom: 14,
                    }}>
 <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em', color: '#1F4E8C', textTransform: 'uppercase', marginBottom: 4 }}>
                        Acción recomendada
 </div>
 <div style={{ fontSize: 12, color: '#1d1d1f', lineHeight: 1.5 }}>{n.recommended_action}</div>
 </div>
                  )}

                  {/* 3-step lifecycle progress */}
 <div>
 <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.08em', color: '#6e6e73', textTransform: 'uppercase', marginBottom: 8 }}>
                      Ciclo de vida
 </div>
 <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {STEPS.map((step, i) => {
                        const reached = i <= stepIdx
                        const isCurrent = i === stepIdx
                        const dateKey = step === 'emergence' ? n.emergence_date : step === 'peak' ? n.peak_date : n.decline_date
                        return (
 <div key={step} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
 <div style={{ flex: 1, textAlign: 'center' }}>
 <div style={{
                                width: 26, height: 26, borderRadius: '50%',
                                background: reached ? lcColor : '#fff',
                                border: `2px solid ${reached ? lcColor : '#e8e8ed'}`,
                                color: reached ? '#fff' : '#6e6e73',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-display,system-ui)',
                                margin: '0 auto', boxShadow: isCurrent ? `0 0 0 4px ${lcColor}25` : 'none',
                                transition: 'all 200ms ease',
                              }}>
                                {i + 1}
 </div>
 <div style={{ fontSize: 10, color: reached ? '#1d1d1f' : '#6e6e73', marginTop: 4, fontWeight: isCurrent ? 600 : 400 }}>
                                {STEP_LABELS[step]}
 </div>
                              {dateKey && (
 <div style={{ fontSize: 9, color: '#6e6e73', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
                                  {dateKey}
 </div>
                              )}
 </div>
                            {i < 2 && (
 <div style={{
                                flex: 0.6, height: 2,
                                background: i < stepIdx ? lcColor : '#e8e8ed',
                                marginTop: -28, // align with circle center
                              }} />
                            )}
 </div>
                        )
                      })}
 </div>
 </div>
 </div>
              )}
 </div>
          )
        })}
 </div>
 </section>
  )
}
