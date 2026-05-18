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
 *   · "Detalle →"       → "Leer →" con link al medio si hay URL
 *
 * Reutiliza los keyframes globales `alertPulse`, `alertDot`, `alertCard`
 * de AlertCard · monta <AlertKeyframes/> una vez por página.
 */

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

export default function NewsPulseCard({ item, compact = false }: NewsPulseCardProps) {
  const level = sentimentToLevel(item.sentiment)
  const m = SENT_META[level]
  const sentStr = item.sentiment > 0 ? `+${item.sentiment.toFixed(2)}` : item.sentiment.toFixed(2)
  const relPct = Math.round((item.relevance ?? 0) * 100)
  const dateStr = item.date
    ? new Date(item.date).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : ''

  return (
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
        <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: compact ? 13.5 : 15, fontWeight: 600, letterSpacing: '-0.012em', color: '#1d1d1f' }}>
          {item.title}
        </h3>
        <p style={{ margin: '3px 0 6px', fontSize: compact ? 11.5 : 12.5, color: '#3a3a3d', lineHeight: 1.45 }}>
          {item.parties && item.parties.trim().length > 0 ? item.parties : 'Sin partidos mencionados'}
        </p>
        <span style={{ fontSize: 11, color: '#6e6e73' }}>
          Sentiment <span style={{ fontWeight: 600, color: m.color }}>{sentStr}</span> ·
          relevancia <span style={{ fontWeight: 600 }}>{relPct}%</span>
          {dateStr && <> · {dateStr}</>}
        </span>
      </div>
      {item.url ? (
        <a href={item.url} target="_blank" rel="noopener noreferrer" style={{
          background: '#fff', border: '1px solid #ECECEF', borderRadius: 8,
          padding: '6px 12px', fontSize: 11.5, fontWeight: 600, color: '#3a3a3d',
          cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, textDecoration: 'none',
        }}>Leer →</a>
      ) : (
        <span style={{
          background: '#F5F5F7', border: '1px solid #ECECEF', borderRadius: 8,
          padding: '6px 12px', fontSize: 11.5, fontWeight: 600, color: '#86868b',
          flexShrink: 0,
        }}>—</span>
      )}
    </article>
  )
}
