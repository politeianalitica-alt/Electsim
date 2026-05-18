'use client'

/**
 * NewsPulseCard · misma visual que AlertCard pero adaptada al pulso
 * informativo de prensa.
 *
 * Mapping:
 *   · AlertLevel        → SentimentLevel (5 niveles según sentiment)
 *   · category badge    → fuente del medio
 *   · title h3          → titular de la noticia
 *   · description       → partidos mencionados
 *   · source · ts       → sentiment + relevancia + fecha
 *   · "Detalle →"       → 2 botones · "Resumen" (modal) + "Leer →" (link)
 *
 * Reutiliza los keyframes globales `alertPulse`, `alertDot`, `alertCard`
 * de AlertCard · monta <AlertKeyframes/> una vez por página.
 */

import { useState } from 'react'

export type SentimentLevel = 'muy-positivo' | 'positivo' | 'neutro' | 'negativo' | 'muy-negativo'

export interface NewsPulseItem {
  id: string
  title: string
  source: string
  sentiment: number      // -1 .. +1
  relevance: number      // 0 .. 1
  date?: string | null
  parties?: string
  url?: string
  description?: string
}

export const SENT_META: Record<SentimentLevel, { label: string; color: string; bg: string; ring: string; pulse?: boolean }> = {
  'muy-positivo': { label: 'POSITIVO', color: '#15803D', bg: 'rgba(21,128,61,0.10)',   ring: 'rgba(21,128,61,0.45)' },
  'positivo':     { label: 'POSITIVO', color: '#16A34A', bg: 'rgba(22,163,74,0.08)',   ring: 'rgba(22,163,74,0.35)' },
  'neutro':       { label: 'NEUTRO',   color: '#6E6E73', bg: 'rgba(110,110,115,0.06)', ring: 'rgba(110,110,115,0.28)' },
  'negativo':     { label: 'NEGATIVO', color: '#F97316', bg: 'rgba(249,115,22,0.10)',  ring: 'rgba(249,115,22,0.45)' },
  'muy-negativo': { label: 'CRÍTICO',  color: '#DC2626', bg: 'rgba(220,38,38,0.12)',   ring: 'rgba(220,38,38,0.55)', pulse: true },
}

export function sentimentToLevel(s: number): SentimentLevel {
  if (s >= 0.5) return 'muy-positivo'
  if (s >= 0.2) return 'positivo'
  if (s >  -0.2) return 'neutro'
  if (s >  -0.5) return 'negativo'
  return 'muy-negativo'
}

interface NewsPulseCardProps {
  item: NewsPulseItem
  compact?: boolean
}

interface SummaryState {
  loading: boolean
  text: string
  source?: string   // 'extractive' | 'llm' | 'fallback'
  error?: string
}

export default function NewsPulseCard({ item, compact = false }: NewsPulseCardProps) {
  const level = sentimentToLevel(item.sentiment)
  const m = SENT_META[level]
  const sentStr = item.sentiment > 0 ? `+${item.sentiment.toFixed(2)}` : item.sentiment.toFixed(2)
  const relPct = Math.round((item.relevance ?? 0) * 100)
  const dateStr = item.date
    ? new Date(item.date).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : ''

  const [open, setOpen] = useState(false)
  const [summary, setSummary] = useState<SummaryState>({ loading: false, text: '' })

  async function loadSummary() {
    setSummary({ loading: true, text: '' })
    try {
      const r = await fetch('/api/news/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: item.title,
          source: item.source,
          description: item.description,
          url: item.url,
        }),
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const data = await r.json() as { summary: string; source?: string }
      setSummary({ loading: false, text: data.summary, source: data.source })
    } catch (e) {
      setSummary({ loading: false, text: '', error: e instanceof Error ? e.message : 'error desconocido' })
    }
  }

  function openResumen() {
    setOpen(true)
    if (!summary.text && !summary.loading) loadSummary()
  }

  return (
    <>
      <article style={{
        display: 'grid', gridTemplateColumns: '6px 110px 1fr auto', gap: 14, alignItems: 'center',
        padding: compact ? '10px 14px 10px 0' : '14px 18px 14px 0', borderRadius: 14,
        background: m.bg, border: `1px solid ${m.ring}`,
        position: 'relative', overflow: 'hidden',
        animation: m.pulse ? 'alertCard 1.6s ease-in-out infinite' : undefined,
      }}>
        <div style={{
          background: m.color, height: '100%',
          boxShadow: m.pulse ? `0 0 12px ${m.color}` : undefined,
        }}/>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 5, paddingLeft: 6 }}>
          <span style={{
            fontSize: 9.5, fontWeight: 800, letterSpacing: '0.1em',
            color: '#fff', background: m.color,
            padding: '3px 8px', borderRadius: 999,
            display: 'inline-flex', alignItems: 'center', gap: 5,
            animation: m.pulse ? 'alertPulse 1.2s ease-in-out infinite' : undefined,
            boxShadow: m.pulse ? `0 0 10px ${m.color}` : undefined,
          }}>
            {m.pulse && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', animation: 'alertDot 1s ease-in-out infinite' }}/>}
            {m.label}
          </span>
          <span style={{ fontSize: 10.5, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.04em' }}>
            {item.source.toUpperCase()}
          </span>
        </div>
        <div style={{ minWidth: 0 }}>
          {/* Título · clickable a la noticia si hay URL */}
          {item.url ? (
            <a href={item.url} target="_blank" rel="noopener noreferrer" style={{
              display: 'block', margin: 0, fontFamily: 'var(--font-display)',
              fontSize: compact ? 13.5 : 15, fontWeight: 600, letterSpacing: '-0.012em',
              color: '#1d1d1f', textDecoration: 'none',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#0071e3' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#1d1d1f' }}
            >
              {item.title}
            </a>
          ) : (
            <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: compact ? 13.5 : 15, fontWeight: 600, letterSpacing: '-0.012em', color: '#1d1d1f' }}>
              {item.title}
            </h3>
          )}
          <p style={{ margin: '3px 0 6px', fontSize: compact ? 11.5 : 12.5, color: '#3a3a3d', lineHeight: 1.45 }}>
            {item.parties && item.parties.trim().length > 0 ? item.parties : 'Sin partidos mencionados'}
          </p>
          <span style={{ fontSize: 11, color: '#6e6e73' }}>
            Sentiment <span style={{ fontWeight: 600, color: m.color }}>{sentStr}</span> ·
            relevancia <span style={{ fontWeight: 600 }}>{relPct}%</span>
            {dateStr && <> · {dateStr}</>}
          </span>
        </div>
        {/* Acciones · Resumen + Leer */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
          <button
            onClick={openResumen}
            title="Generar resumen breve"
            style={{
              background: '#fff', border: '1px solid #ECECEF', borderRadius: 8,
              padding: '6px 12px', fontSize: 11.5, fontWeight: 600, color: '#3a3a3d',
              cursor: 'pointer', fontFamily: 'inherit',
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6"/>
              <line x1="8" y1="12" x2="21" y2="12"/>
              <line x1="8" y1="18" x2="21" y2="18"/>
              <line x1="3" y1="6" x2="3.01" y2="6"/>
              <line x1="3" y1="12" x2="3.01" y2="12"/>
              <line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
            Resumen
          </button>
          {item.url ? (
            <a href={item.url} target="_blank" rel="noopener noreferrer" style={{
              background: '#fff', border: '1px solid #ECECEF', borderRadius: 8,
              padding: '6px 12px', fontSize: 11.5, fontWeight: 600, color: '#3a3a3d',
              cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center', gap: 4,
            }}>
              Leer
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 17L17 7M9 7h8v8"/>
              </svg>
            </a>
          ) : (
            <span style={{
              background: '#F5F5F7', border: '1px solid #ECECEF', borderRadius: 8,
              padding: '6px 12px', fontSize: 11.5, fontWeight: 600, color: '#86868b',
            }}>—</span>
          )}
        </div>
      </article>

      {/* Modal del resumen */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px',
            animation: 'newsModalIn 180ms ease-out',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 16,
              maxWidth: 620, width: '100%', maxHeight: '80vh', overflowY: 'auto',
              padding: '22px 26px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontSize: 9.5, fontWeight: 800, letterSpacing: '0.1em',
                  color: '#fff', background: m.color, padding: '3px 8px', borderRadius: 999,
                  marginBottom: 8,
                }}>{m.label}</div>
                <h3 style={{
                  margin: 0, fontFamily: 'var(--font-display)',
                  fontSize: 18, fontWeight: 600, letterSpacing: '-0.012em', color: '#1d1d1f',
                  lineHeight: 1.3,
                }}>{item.title}</h3>
                <p style={{ margin: '6px 0 0', fontSize: 11.5, color: '#6e6e73' }}>
                  <span style={{ fontWeight: 700 }}>{item.source}</span>
                  {dateStr && <> · {dateStr}</>}
                  {item.parties && <> · {item.parties}</>}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                style={{
                  background: '#F5F5F7', border: '1px solid #ECECEF', borderRadius: 8,
                  padding: 6, cursor: 'pointer', fontFamily: 'inherit', color: '#3a3a3d',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div style={{ borderTop: '1px solid #ECECEF', paddingTop: 14, marginBottom: 14 }}>
              <p style={{
                fontSize: 10, color: '#6e6e73', fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 8px',
              }}>Resumen</p>

              {summary.loading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#6e6e73', fontSize: 13 }}>
                  <span style={{
                    width: 12, height: 12, border: '2px solid #ECECEF', borderTopColor: '#0071e3',
                    borderRadius: '50%', animation: 'newsModalSpin 0.8s linear infinite',
                  }}/>
                  Generando resumen…
                </div>
              )}

              {!summary.loading && summary.text && (
                <p style={{ fontSize: 13.5, color: '#1d1d1f', lineHeight: 1.55, margin: 0, whiteSpace: 'pre-wrap' }}>
                  {summary.text}
                </p>
              )}

              {!summary.loading && summary.error && (
                <p style={{ fontSize: 13, color: '#DC2626', margin: 0 }}>
                  No se pudo generar el resumen · {summary.error}
                </p>
              )}

              {!summary.loading && summary.source && (
                <p style={{ fontSize: 10, color: '#86868b', margin: '10px 0 0' }}>
                  Fuente del resumen ·{' '}
                  {summary.source === 'extractive' ? 'extractivo del feed RSS' :
                   summary.source === 'llm' ? 'generado por modelo de lenguaje' :
                   'fallback'}
                </p>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              {item.url && (
                <a href={item.url} target="_blank" rel="noopener noreferrer" style={{
                  background: '#0071e3', color: '#fff', borderRadius: 8,
                  padding: '8px 16px', fontSize: 12.5, fontWeight: 600,
                  textDecoration: 'none', fontFamily: 'inherit',
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                }}>
                  Ir al artículo
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M7 17L17 7M9 7h8v8"/>
                  </svg>
                </a>
              )}
              <button onClick={() => setOpen(false)} style={{
                background: '#fff', color: '#1d1d1f', border: '1px solid #ECECEF',
                borderRadius: 8, padding: '8px 16px', fontSize: 12.5, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>Cerrar</button>
            </div>

            <style>{`
              @keyframes newsModalSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
              @keyframes newsModalIn   { from { opacity: 0; } to { opacity: 1; } }
            `}</style>
          </div>
        </div>
      )}
    </>
  )
}
