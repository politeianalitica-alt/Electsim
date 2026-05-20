'use client'

/**
 * NewsCard · tarjeta de pulso informativo con el mismo lenguaje visual que
 * AlertCard (sala de control). Diseñada para que la lista del "Pulso
 * informativo" del dashboard tenga el mismo peso e identidad que las
 * alertas: barra de color a la izquierda, badge de tonalidad + medio en una
 * columna fija, titular + partidos + meta en la columna principal, y CTA
 * "Abrir →" a la derecha.
 *
 * Sentimiento (sentiment ∈ [-1, +1]) se mapea a 4 niveles:
 *   · ≥ +0.40  → POSITIVO (verde)
 *   · ≥ +0.10  → FAVORABLE (verde suave)
 *   · |·| < 0.10 → NEUTRO (gris)
 *   · ≤ -0.10  → DESFAVORABLE (rojo suave)
 *   · ≤ -0.40  → NEGATIVO (rojo)
 *
 * Importante: NewsKeyframes() no se necesita porque las noticias no
 * "parpadean" como las alertas críticas; mantenemos la API por simetría.
 */

export type NewsTone = 'positivo' | 'favorable' | 'neutro' | 'desfavorable' | 'negativo'

export interface NewsItem {
  id: string
  title: string
  source: string
  sentiment: number
  relevance: number
  url?: string | null
  parties?: string | null
  /** Timestamp legible o ISO; se pinta tal cual. */
  ts?: string | null
}

export const NEWS_TONE_META: Record<NewsTone, { label: string; color: string; bg: string; ring: string }> = {
  'positivo':     { label: 'POSITIVO',     color: '#15803D', bg: 'rgba(22,163,74,0.10)',  ring: 'rgba(22,163,74,0.45)' },
  'favorable':    { label: 'FAVORABLE',    color: '#16A34A', bg: 'rgba(22,163,74,0.07)',  ring: 'rgba(22,163,74,0.30)' },
  'neutro':       { label: 'NEUTRO',       color: '#6E6E73', bg: 'rgba(110,110,115,0.06)', ring: 'rgba(110,110,115,0.30)' },
  'desfavorable': { label: 'DESFAVORABLE', color: '#DC2626', bg: 'rgba(220,38,38,0.07)',  ring: 'rgba(220,38,38,0.30)' },
  'negativo':     { label: 'NEGATIVO',     color: '#B91C1C', bg: 'rgba(185,28,28,0.10)',  ring: 'rgba(185,28,28,0.45)' },
}

export function sentimentToTone(s: number): NewsTone {
  if (s >= 0.40) return 'positivo'
  if (s >= 0.10) return 'favorable'
  if (s <= -0.40) return 'negativo'
  if (s <= -0.10) return 'desfavorable'
  return 'neutro'
}

interface NewsCardProps {
  item: NewsItem
  /** Compacto = paddings reducidos · pensado para listas embebidas (dashboard). */
  compact?: boolean
  /** Si el item tiene URL, esta función se llama si el usuario hace click fuera del titular. */
  onOpen?: () => void
}

export default function NewsCard({ item, compact = false, onOpen }: NewsCardProps) {
  const tone = sentimentToTone(item.sentiment)
  const m = NEWS_TONE_META[tone]
  const relPct = Math.round(item.relevance * 100)
  const sentLabel = (item.sentiment > 0 ? '+' : '') + item.sentiment.toFixed(2)

  return (
    <article style={{
      display: 'grid',
      gridTemplateColumns: '6px 110px 1fr auto',
      gap: 14,
      alignItems: 'center',
      padding: compact ? '10px 14px 10px 0' : '14px 18px 14px 0',
      borderRadius: 14,
      background: m.bg,
      border: `1px solid ${m.ring}`,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Barra de color (izquierda) */}
      <div style={{ background: m.color, height: '100%' }}/>

      {/* Columna 2: badge tonalidad + medio */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 5, paddingLeft: 6 }}>
        <span style={{
          fontSize: 9.5, fontWeight: 800, letterSpacing: '0.1em',
          color: '#fff', background: m.color,
          padding: '3px 8px', borderRadius: 999,
          display: 'inline-flex', alignItems: 'center', gap: 5,
        }}>
          {m.label}
        </span>
        <span style={{
          fontSize: 10.5, fontWeight: 600, color: '#6e6e73', letterSpacing: '0.04em',
          textTransform: 'uppercase', maxWidth: 104,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {item.source}
        </span>
      </div>

      {/* Columna 3: titular + meta */}
      <div style={{ minWidth: 0 }}>
        {item.url ? (
          <a href={item.url} target="_blank" rel="noopener noreferrer" style={{
            display: 'block', margin: 0,
            fontFamily: 'var(--font-display)',
            fontSize: compact ? 13.5 : 15, fontWeight: 600,
            letterSpacing: '-0.012em', color: '#1d1d1f',
            lineHeight: 1.3, textDecoration: 'none',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#0071e3' }}
          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#1d1d1f' }}
          >
            {item.title}
            <span style={{ marginLeft: 6, color: '#0071e3', fontSize: 11.5 }}>↗</span>
          </a>
        ) : (
          <h3 style={{
            margin: 0, fontFamily: 'var(--font-display)',
            fontSize: compact ? 13.5 : 15, fontWeight: 600,
            letterSpacing: '-0.012em', color: '#1d1d1f', lineHeight: 1.3,
          }}>{item.title}</h3>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 5 }}>
          {item.parties && (
            <span style={{ fontSize: 11.5, color: '#3a3a3d', fontWeight: 500 }}>
              {item.parties}
            </span>
          )}
          <span style={{ fontSize: 11, color: '#6e6e73' }}>
            Relevancia <span style={{ fontWeight: 700, color: '#3a3a3d' }}>{relPct}%</span>
            <span style={{ margin: '0 6px', color: '#d2d2d7' }}>·</span>
            Sentimiento <span style={{ fontWeight: 700, color: m.color }}>{sentLabel}</span>
            {item.ts && <>
              <span style={{ margin: '0 6px', color: '#d2d2d7' }}>·</span>
              <span style={{ fontWeight: 600 }}>{item.ts}</span>
            </>}
          </span>
        </div>
      </div>

      {/* Columna 4: CTA */}
      {item.url && (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onOpen}
          style={{
            background: '#fff', border: '1px solid #ECECEF', borderRadius: 8,
            padding: '6px 12px', fontSize: 11.5, fontWeight: 600, color: '#3a3a3d',
            cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
            textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4,
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLAnchorElement).style.borderColor = '#0071e3'
            ;(e.currentTarget as HTMLAnchorElement).style.color = '#0071e3'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLAnchorElement).style.borderColor = '#ECECEF'
            ;(e.currentTarget as HTMLAnchorElement).style.color = '#3a3a3d'
          }}
        >
          Abrir →
        </a>
      )}
    </article>
  )
}
