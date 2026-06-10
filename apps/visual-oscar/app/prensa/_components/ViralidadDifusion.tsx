'use client'
/**
 * `<ViralidadDifusion />` · Tab 8 · Velocidad y difusión de la cobertura.
 *
 * Combina:
 *  - NewsAPI sortBy=popularity → titulares con más engagement aproximado
 *  - Detección de duplicados/replicaciones entre medios (story clusters)
 *  - First-mover analysis (qué medio publica primero)
 */
import { useEffect, useState } from 'react'
import CollapsibleArticle from '@/components/medios/CollapsibleArticle'

const ACCENT = '#EAB308'

interface Article { title: string; source: string; url: string; published: string; description?: string }

export function ViralidadDifusion() {
  const [query, setQuery] = useState('España')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runSearch = async (q: string) => {
    setLoading(true); setError(null)
    try {
      const r = await fetch('/api/medios/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, sortBy: 'popularity', pageSize: 50, language: 'es' }),
      })
      const d = await r.json()
      if (!r.ok || !d.ok) {
        setError(d.error || `HTTP ${r.status}`)
      } else {
        setData(d)
      }
    } catch (e: any) { setError(String(e?.message ?? e)) }
    finally { setLoading(false) }
  }

  useEffect(() => { runSearch(query) /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [])

  // Group similar titles to detect replication (>=70% word overlap)
  const groups: { lead: Article; replicas: Article[] }[] = []
  if (data?.articles) {
    const seen = new Set<number>()
    const arts: Article[] = data.articles
    for (let i = 0; i < arts.length; i++) {
      if (seen.has(i)) continue
      const lead = arts[i]
      const leadWords = new Set(lead.title.toLowerCase().split(/\s+/).filter((w) => w.length > 3))
      const replicas: Article[] = []
      for (let j = i + 1; j < arts.length; j++) {
        if (seen.has(j)) continue
        const other = arts[j]
        const otherWords = other.title.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
        let overlap = 0
        for (const w of otherWords) if (leadWords.has(w)) overlap++
        const ratio = overlap / Math.max(leadWords.size, otherWords.length)
        if (ratio >= 0.55) {
          replicas.push(other); seen.add(j)
        }
      }
      seen.add(i)
      if (replicas.length > 0) groups.push({ lead, replicas })
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 14, borderLeft: `4px solid ${ACCENT}` }}>
        <p style={{ fontSize: 11, color: ACCENT, fontWeight: 700, letterSpacing: 0.6, margin: 0, textTransform: 'uppercase' }}>
          Viralidad & difusión · velocidad de propagación
        </p>
        <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 12px', lineHeight: 1.5 }}>
          NewsAPI sortBy=popularity + análisis de duplicación entre medios. Pendiente: NewsWhip engagement social, GDELT volumen TV.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') runSearch(query) }}
            placeholder="Tema o palabra clave"
            style={{ flex: 1, padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontFamily: 'inherit', fontSize: 13 }}
          />
          <button
            onClick={() => runSearch(query)}
            disabled={loading}
            style={{ background: ACCENT, color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            {loading ? 'Cargando…' : 'Analizar viralidad'}
          </button>
        </div>
      </section>

      {error && (
        <section style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: 14 }}>
          <p style={{ fontSize: 12, color: '#991b1b', margin: 0 }}>▲ {error}</p>
        </section>
      )}

      {data?.ok && (
        <>
          <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 14 }}>
            <p style={{ fontSize: 10, color: '#64748b', margin: 0, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>
              Top titulares por popularidad · NewsAPI
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
              {(data.articles || []).slice(0, 15).map((a: Article, i: number) => (
                <CollapsibleArticle
                  key={i}
                  title={a.title}
                  href={a.url}
                  medio={a.source}
                  accent={ACCENT}
                  titleSize={12.5}
                >
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: ACCENT, background: '#fefce8', border: '1px solid #fde68a', borderRadius: 4, padding: '2px 7px', fontVariantNumeric: 'tabular-nums' }}>
                      #{i + 1} por popularidad
                    </span>
                    {a.published && (
                      <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>
                        {new Date(a.published).toLocaleString('es-ES')}
                      </span>
                    )}
                  </div>
                  {a.description && (
                    <p style={{ fontSize: 11.5, color: '#475569', margin: '8px 0 0', lineHeight: 1.5 }}>
                      {a.description}
                    </p>
                  )}
                </CollapsibleArticle>
              ))}
            </div>
          </section>

          {groups.length > 0 && (
            <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 14 }}>
              <p style={{ fontSize: 10, color: '#64748b', margin: 0, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                Replicaciones detectadas · titulares similares en múltiples medios
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                {groups.slice(0, 8).map((g, i) => {
                  const allArticles = [g.lead, ...g.replicas]
                  const sortedByDate = [...allArticles].sort((a, b) => new Date(a.published).getTime() - new Date(b.published).getTime())
                  const firstMover = sortedByDate[0]
                  return (
                    <div key={i} style={{ padding: 12, background: '#fefce8', border: '1px solid #fde68a', borderRadius: 8 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', margin: 0, lineHeight: 1.4 }}>
                        {g.lead.title}
                      </p>
                      <p style={{ fontSize: 10, color: '#92400e', margin: '6px 0 0', fontWeight: 600 }}>
                        First mover: <strong>{firstMover.source}</strong> · {new Date(firstMover.published).toLocaleString('es-ES')}
                      </p>
                      <p style={{ fontSize: 10, color: '#78716c', margin: '4px 0 0' }}>
                        Replicado por: {g.replicas.map((r) => r.source).join(' · ')}
                      </p>
                    </div>
                  )
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

export default ViralidadDifusion
