'use client'
/**
 * `<GdeltGlobalPanel />` · Panel GDELT en Radar.
 * Muestra cobertura global ES en últimas 24h + tone timeline 7d.
 */
import { useEffect, useState } from 'react'

const ACCENT = '#1F4E8C'

export function GdeltGlobalPanel({ query = 'Spain' }: { query?: string }) {
  const [articles, setArticles] = useState<any>(null)
  const [tone, setTone] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    Promise.all([
      fetch(`/api/gdelt/articles?query=${encodeURIComponent(query)}&timespan=24h&maxrows=10`, { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
      fetch(`/api/gdelt/tone?query=${encodeURIComponent(query)}&timespan=7d`, { cache: 'force-cache' }).then((r) => r.json()).catch(() => null),
    ]).then(([a, t]) => {
      if (!alive) return
      setArticles(a); setTone(t); setLoading(false)
    })
    return () => { alive = false }
  }, [query])

  const points = (tone?.timeline || []).filter((p: any) => p?.tone != null)
  const avgTone = tone?.avg_tone

  return (
    <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 14, borderLeft: `4px solid ${ACCENT}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <p style={{ fontSize: 11, color: ACCENT, fontWeight: 700, letterSpacing: 0.6, margin: 0, textTransform: 'uppercase' }}>
            GDELT · cobertura global "{query}"
          </p>
          <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0 0' }}>
            Tono medio (-10 muy negativo, +10 muy positivo) últimos 7 días · 65+ idiomas indexados
          </p>
        </div>
        {avgTone != null && (
          <span style={{ fontSize: 18, fontWeight: 700, color: avgTone < 0 ? '#dc2626' : '#16a34a', fontVariantNumeric: 'tabular-nums' }}>
            {avgTone > 0 ? '+' : ''}{avgTone.toFixed(2)}
          </span>
        )}
      </div>

      {loading && <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 12 }}>Cargando GDELT…</p>}

      {!loading && points.length > 1 && (
        <ToneSpark points={points} accent={ACCENT} />
      )}

      {!loading && articles?.ok && articles.articles?.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <p style={{ fontSize: 10, color: '#64748b', margin: 0, fontWeight: 600, letterSpacing: 0.4, textTransform: 'uppercase' }}>
            Últimos 10 artículos globales · 24h
          </p>
          <ul style={{ margin: '8px 0 0 0', padding: 0, listStyle: 'none' }}>
            {articles.articles.slice(0, 10).map((a: any, i: number) => (
              <li key={i} style={{ padding: '5px 0', borderBottom: '1px solid #f1f5f9', fontSize: 12 }}>
                <a href={a.url} target="_blank" rel="noopener noreferrer" style={{ color: '#0f172a', textDecoration: 'none' }}>
                  {a.title}
                </a>
                <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 8 }}>
                  · {a.domain} · {a.sourcecountry} · {a.language}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!loading && articles && !articles.ok && (
        <div style={{ marginTop: 10, padding: 10, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6 }}>
          <p style={{ fontSize: 11, color: '#92400e', margin: 0 }}>
            <strong>GDELT no respondió.</strong> {articles.data_quality?.note}
          </p>
          <p style={{ fontSize: 10, color: '#78716c', margin: '4px 0 0', lineHeight: 1.5 }}>
            GDELT limita 1 req/5s por bloque IP · Vercel comparte IPs entre instancias serverless.
            Cache 1h activo: la próxima llamada exitosa quedará servida sin nuevo hit a GDELT.
          </p>
        </div>
      )}
    </section>
  )
}

function ToneSpark({ points, accent }: { points: { date: string; tone: number }[]; accent: string }) {
  const width = 760, height = 60
  const tones = points.map((p) => p.tone)
  const min = Math.min(...tones, -2), max = Math.max(...tones, 2)
  const range = max - min || 1
  const step = width / Math.max(points.length - 1, 1)
  const zero = height - ((0 - min) / range) * (height - 4) - 2
  const pts = points.map((p, i) => `${(i * step).toFixed(1)},${(height - ((p.tone - min) / range) * (height - 4) - 2).toFixed(1)}`).join(' ')
  return (
    <div style={{ marginTop: 10, background: '#f8fafc', borderRadius: 6, padding: 10 }}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <line x1={0} y1={zero} x2={width} y2={zero} stroke="#cbd5e1" strokeWidth={0.5} strokeDasharray="3 3" />
        <polyline points={pts} fill="none" stroke={accent} strokeWidth={2} strokeLinejoin="round" />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 9, color: '#94a3b8' }}>
        <span>{points[0]?.date}</span>
        <span>Rango tone: {min.toFixed(1)} → {max.toFixed(1)}</span>
        <span>{points[points.length - 1]?.date}</span>
      </div>
    </div>
  )
}

export default GdeltGlobalPanel
