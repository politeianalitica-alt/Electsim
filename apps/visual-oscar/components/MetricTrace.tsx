'use client'

/**
 * MetricTrace · trazabilidad mínima visible en cualquier métrica o afirmación.
 *
 * Muestra:
 *   - Fuentes utilizadas
 *   - Fecha/hora de última actualización
 *   - Periodo analizado
 *   - Tamaño de muestra o volumen
 *   - Nivel de confianza
 *   - Variación frente al periodo anterior (delta)
 *   - Método de cálculo (tooltip)
 *   - Botón "Ver evidencia" (despliega items citados)
 *
 * Se puede usar inline debajo de un KPI o expandible como tarjeta.
 */

import { useState, type CSSProperties, type ReactNode } from 'react'

export interface MetricTraceSource {
  name: string
  href?: string
}

export interface MetricTraceEvidence {
  title: string
  source?: string
  href?: string
  excerpt?: string
}

export interface MetricTraceProps {
  /** Fuentes utilizadas · puede pasarse como string (separado por ·) o array */
  sources?: string | MetricTraceSource[]
  /** ISO datetime o texto relativo */
  updatedAt?: string | null
  /** Periodo analizado · ej. "últimas 24h", "30 días" */
  period?: string
  /** Tamaño de muestra · ej. "142 artículos · 31 medios" */
  sampleSize?: string
  /** Confianza · 0-100 */
  confidence?: number
  /** Variación · ej. "+18%" o "-3.2 pp" */
  delta?: string
  /** Método de cálculo · texto largo · aparece en tooltip ? */
  methodology?: string
  /** Items de evidencia · si se pasa, aparece botón "Ver evidencia" */
  evidenceItems?: MetricTraceEvidence[]
  /** Compact · 1 línea con · separadores */
  compact?: boolean
  /** Color base de los acentos */
  accent?: string
  /** Override de estilo del contenedor */
  style?: CSSProperties
}

function relativeTime(iso: string | null | undefined): string {
  if (!iso) return ''
  if (!/^\d{4}-/.test(iso)) return iso
  try {
    const d = new Date(iso).getTime()
    if (!Number.isFinite(d)) return iso
    const diffMin = Math.round((Date.now() - d) / 60000)
    if (diffMin < 1) return 'hace <1 min'
    if (diffMin < 60) return `hace ${diffMin} min`
    const h = Math.round(diffMin / 60)
    if (h < 24) return `hace ${h} h`
    const days = Math.round(h / 24)
    return `hace ${days} d`
  } catch { return iso }
}

function normalizeSources(sources: MetricTraceProps['sources']): MetricTraceSource[] {
  if (!sources) return []
  if (typeof sources === 'string') {
    return sources.split('·').map(s => s.trim()).filter(Boolean).map(name => ({ name }))
  }
  return sources
}

function InfoTip({ text }: { text: string }) {
  return (
 <span
      title={text}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 12, height: 12, borderRadius: '50%',
        background: '#F0F0F2', color: '#6e6e73',
        fontSize: 8, fontWeight: 700, cursor: 'help',
        marginLeft: 5, lineHeight: 1, verticalAlign: 'middle',
      }}
    >?</span>
  )
}

export default function MetricTrace({
  sources, updatedAt, period, sampleSize, confidence, delta, methodology,
  evidenceItems, compact = false, accent = '#0071e3', style,
}: MetricTraceProps) {
  const [evidenceOpen, setEvidenceOpen] = useState(false)
  const srcs = normalizeSources(sources)
  const updatedStr = relativeTime(updatedAt)
  const hasEvidence = !!(evidenceItems && evidenceItems.length > 0)

  // ── Compact · una sola línea con · separadores
  if (compact) {
    return (
 <div style={{
        fontSize: 11, color: '#86868b', lineHeight: 1.5,
        display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center',
        ...style,
      }}>
        {srcs.length > 0 && (
 <span>
 <span style={{ fontWeight: 600, color: '#6e6e73' }}>Fuentes ·</span>{' '}
            {srcs.map((s, i) => (
 <span key={i}>
                {i > 0 && ' · '}
                {s.href
                  ? <a href={s.href} target="_blank" rel="noopener noreferrer" style={{ color: accent, textDecoration: 'none', borderBottom: `1px dotted ${accent}55` }}>{s.name}</a>
                  : <span>{s.name}</span>}
 </span>
            ))}
 </span>
        )}
        {sampleSize && <span>· <span style={{ fontWeight: 600, color: '#6e6e73' }}>{sampleSize}</span></span>}
        {period && <span>· {period}</span>}
        {confidence != null && <span>· confianza <span style={{ fontWeight: 600, color: '#1d1d1f' }}>{confidence}%</span>{methodology && <InfoTip text={methodology}/>}</span>}
        {delta && <span style={{ fontWeight: 600, color: delta.startsWith('-') ? '#16A34A' : '#DC2626' }}>· {delta}</span>}
        {updatedStr && <span>· {updatedStr}</span>}
        {hasEvidence && (
 <button onClick={() => setEvidenceOpen(o => !o)} style={{
            background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            color: accent, fontSize: 11, fontWeight: 600, padding: 0, marginLeft: 4,
          }}>
            {evidenceOpen ? 'Ocultar evidencia ↑' : 'Ver evidencia →'}
 </button>
        )}
        {hasEvidence && evidenceOpen && (
 <EvidenceList items={evidenceItems!} accent={accent}/>
        )}
 </div>
    )
  }

  // ── Full · tarjeta con grid de meta + acción evidencia
  return (
 <div style={{
      borderTop: '1px solid #F0F0F2', paddingTop: 10, marginTop: 10,
      fontSize: 11.5, color: '#86868b',
      ...style,
    }}>
 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
        {srcs.length > 0 && (
 <TraceField label="Fuentes">
            {srcs.map((s, i) => (
 <span key={i}>
                {i > 0 && ' · '}
                {s.href
                  ? <a href={s.href} target="_blank" rel="noopener noreferrer" style={{ color: accent, textDecoration: 'none', borderBottom: `1px dotted ${accent}55`, fontWeight: 600 }}>{s.name}</a>
                  : <span style={{ fontWeight: 600, color: '#1d1d1f' }}>{s.name}</span>}
 </span>
            ))}
 </TraceField>
        )}
        {(sampleSize || period) && (
 <TraceField label="Muestra y periodo">
 <span style={{ color: '#1d1d1f' }}>
              {sampleSize}{sampleSize && period && ' · '}{period}
 </span>
 </TraceField>
        )}
        {confidence != null && (
 <TraceField label={<>Confianza{methodology && <InfoTip text={methodology}/>}</>}>
 <span style={{ color: '#1d1d1f', fontWeight: 600, fontFamily: 'var(--font-display)' }}>{confidence}%</span>
 </TraceField>
        )}
        {delta && (
 <TraceField label="Variación vs anterior">
 <span style={{ color: delta.startsWith('-') ? '#16A34A' : '#DC2626', fontWeight: 700, fontFamily: 'var(--font-display)' }}>{delta}</span>
 </TraceField>
        )}
        {updatedStr && (
 <TraceField label="Última actualización">
 <span style={{ color: '#1d1d1f' }}>{updatedStr}</span>
 </TraceField>
        )}
 </div>
      {hasEvidence && (
 <div style={{ marginTop: 10 }}>
 <button onClick={() => setEvidenceOpen(o => !o)} style={{
            background: evidenceOpen ? `${accent}12` : '#FAFAFA',
            border: `1px solid ${evidenceOpen ? accent + '40' : '#ECECEF'}`,
            borderRadius: 8, padding: '6px 12px',
            fontSize: 12, fontWeight: 600, color: accent,
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'inline-flex', alignItems: 'center', gap: 5,
          }}>
 <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
 <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
 </svg>
            {evidenceOpen ? 'Ocultar evidencia' : `Ver evidencia · ${evidenceItems!.length}`}
 </button>
          {evidenceOpen && <EvidenceList items={evidenceItems!} accent={accent}/>}
 </div>
      )}
 </div>
  )
}

function TraceField({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
 <div>
 <div style={{ fontSize: 9.5, fontWeight: 700, color: '#6e6e73', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 3 }}>
        {label}
 </div>
 <div style={{ fontSize: 12 }}>{children}</div>
 </div>
  )
}

function EvidenceList({ items, accent }: { items: MetricTraceEvidence[]; accent: string }) {
  return (
 <ul style={{
      marginTop: 10, marginBottom: 0, paddingLeft: 0, listStyle: 'none',
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      {items.map((it, i) => (
 <li key={i} style={{
          padding: '8px 12px', background: '#FAFAFA', border: '1px solid #ECECEF',
          borderRadius: 8, fontSize: 12, color: '#3a3a3d', lineHeight: 1.45,
        }}>
          {it.href ? (
 <a href={it.href} target="_blank" rel="noopener noreferrer" style={{
              color: '#1d1d1f', fontWeight: 600, textDecoration: 'none',
              borderBottom: `1px dotted ${accent}55`,
            }}>{it.title} <span style={{ color: accent, fontSize: 10 }}>↗</span></a>
          ) : (
 <span style={{ color: '#1d1d1f', fontWeight: 600 }}>{it.title}</span>
          )}
          {(it.source || it.excerpt) && (
 <div style={{ fontSize: 11, color: '#86868b', marginTop: 3 }}>
              {it.source && <span style={{ fontWeight: 600 }}>{it.source}</span>}
              {it.source && it.excerpt && ' · '}
              {it.excerpt}
 </div>
          )}
 </li>
      ))}
 </ul>
  )
}
