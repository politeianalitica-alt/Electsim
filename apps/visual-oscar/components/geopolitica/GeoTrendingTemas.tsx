'use client'
/**
 * <GeoTrendingTemas /> · Sprint GEO-RADAR C2
 *
 * Barra horizontal de chips con los top themes geopolíticos GDELT GKG
 * trending en las últimas 24h. Cada chip muestra emoji, label y cuenta.
 *
 * Consume /api/geopolitica/trending-temas.
 */
import { useEffect, useState } from 'react'

interface Topic {
  theme: string
  label_es: string
  emoji: string
  article_count: number
  share_pct: number
}
interface Response {
  ok: boolean
  topics: Topic[]
  total_articles_24h: number
  _meta?: { source: string; cache_ttl_seconds: number }
}

interface Props {
  onTopicClick?: (theme: string) => void
}

export function GeoTrendingTemas({ onTopicClick }: Props) {
  const [data, setData] = useState<Response | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetch('/api/geopolitica/trending-temas', { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j) => { if (alive) setData(j) })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  return (
    <section style={{
      background: '#fff', border: '1px solid #ECECEF', borderRadius: 14,
      padding: '12px 14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
        <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
          Trending geopolítico · 24h
        </h3>
        {data?.total_articles_24h !== undefined && (
          <span style={{ fontSize: 9, color: '#94a3b8', fontFamily: 'ui-monospace, monospace' }}>
            {data.total_articles_24h.toLocaleString('es-ES')} artículos GDELT
          </span>
        )}
      </div>

      {loading && <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>Cargando temas trending…</p>}

      {!loading && data?.topics && data.topics.length === 0 && (
        <p style={{ fontSize: 11, color: '#94a3b8', margin: 0, fontStyle: 'italic' }}>
          Sin temas geopolíticos activos
        </p>
      )}

      {!loading && data?.topics && data.topics.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {data.topics.map((t) => (
            <button
              key={t.theme}
              onClick={() => onTopicClick?.(t.theme)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '6px 10px', borderRadius: 16,
                background: `hsl(${(t.theme.charCodeAt(0) * 7) % 360}, 35%, 95%)`,
                border: '1px solid #e2e8f0',
                fontSize: 11, fontWeight: 600, color: '#0f172a',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <span>{t.emoji}</span>
              <span>{t.label_es}</span>
              <span style={{ color: '#94a3b8', fontFamily: 'ui-monospace, monospace', fontWeight: 400 }}>
                {t.article_count}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

export default GeoTrendingTemas
