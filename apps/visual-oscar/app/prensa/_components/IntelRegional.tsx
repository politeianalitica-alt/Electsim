'use client'
/**
 * `<IntelRegional />` · Tab 9 · Inteligencia regional CCAA.
 * Sentimiento + volumen por CCAA + medios regionales activos.
 * Usa /api/medios/intel ccaa breakdown.
 */
import { useEffect, useState } from 'react'
import SentimentMapInteractive from './SentimentMapInteractive'
import type { CCAARegionStat } from '@/lib/news-aggregator'

const ACCENT = '#16A34A'

export function IntelRegional() {
  const [ccaa, setCcaa] = useState<Record<string, CCAARegionStat> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    // Sprint G15 FASE A · sources=100 + balance_mode=regional para que el
    // agregador no tape la realidad local con grandes nacionales.
    fetch('/api/medios/intel?hours=72&sources=100&balance_mode=regional', { cache: 'force-cache' })
      .then((r) => r.json())
      .then((d) => { if (alive) { setCcaa(d?.ccaa || null); setLoading(false) } })
      .catch(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  // Sprint G15 FASE A · BUG FIX crítico
  // `byCCAA()` en lib/news-aggregator.ts devuelve {n, pos, neg, neu, sent_score, top_topics}.
  // El código previo buscaba {n_articles, sentiment_score, top_medio, count, sentiment, top_source}
  // y la tabla estaba SIEMPRE vacía (todos los campos undefined → n=0 → filter eliminaba todo).
  // La key del Record ya es el LABEL legible ("Madrid", "Cataluña"), no un código.
  const rows = ccaa
    ? Object.entries(ccaa)
        .map(([name, s]: [string, any]) => ({
          code: name,
          name,
          n: typeof s?.n === 'number' ? s.n : 0,
          sentiment: typeof s?.sent_score === 'number' ? s.sent_score : 0,
          topMedio: Array.isArray(s?.top_topics) && s.top_topics.length > 0 ? s.top_topics[0] : '—',
        }))
        .filter((r) => r.n > 0)
        .sort((a, b) => b.n - a.n)
    : []

  const total = rows.reduce((s, r) => s + r.n, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 14, borderLeft: `4px solid ${ACCENT}` }}>
        <p style={{ fontSize: 11, color: ACCENT, fontWeight: 700, letterSpacing: 0.6, margin: 0, textTransform: 'uppercase' }}>
          Inteligencia regional · 17 CCAA
        </p>
        <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0' }}>
          Volumen + sentimiento por CCAA derivado de medios regionales del agregador RSS · {total} artículos clasificados.
        </p>
      </section>

      {/* Mapa coroplético */}
      <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 14 }}>
        <p style={{ fontSize: 10, color: '#64748b', margin: 0, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>
          Mapa de sentimiento regional · click CCAA para drill
        </p>
        <div style={{ marginTop: 8 }}>
          <SentimentMapInteractive ccaaData={ccaa || undefined} />
        </div>
      </section>

      {/* Tabla CCAA */}
      {rows.length > 0 && (
        <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 14 }}>
          <p style={{ fontSize: 10, color: '#64748b', margin: 0, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>
            Ranking CCAA · volumen y sentimiento
          </p>
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse', marginTop: 8 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: 10, color: '#64748b' }}>#</th>
                <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: 10, color: '#64748b' }}>CCAA</th>
                <th style={{ padding: '6px 10px', textAlign: 'right', fontSize: 10, color: '#64748b' }}>Volumen</th>
                <th style={{ padding: '6px 10px', textAlign: 'right', fontSize: 10, color: '#64748b' }}>% total</th>
                <th style={{ padding: '6px 10px', textAlign: 'right', fontSize: 10, color: '#64748b' }}>Sentimiento</th>
                <th style={{ padding: '6px 10px', textAlign: 'left', fontSize: 10, color: '#64748b' }}>Top medio</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.code} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '6px 10px', color: '#64748b', fontVariantNumeric: 'tabular-nums' }}>{i + 1}</td>
                  <td style={{ padding: '6px 10px', color: '#0f172a', fontWeight: 500 }}>{r.name}</td>
                  <td style={{ padding: '6px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{r.n}</td>
                  <td style={{ padding: '6px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: ACCENT, fontWeight: 600 }}>
                    {total > 0 ? ((r.n / total) * 100).toFixed(1) : '—'}%
                  </td>
                  <td style={{
                    padding: '6px 10px', textAlign: 'right', fontVariantNumeric: 'tabular-nums',
                    color: r.sentiment > 0.1 ? '#16a34a' : r.sentiment < -0.1 ? '#dc2626' : '#64748b',
                    fontWeight: 600,
                  }}>
                    {r.sentiment > 0 ? '+' : ''}{(r.sentiment * 100).toFixed(0)}%
                  </td>
                  <td style={{ padding: '6px 10px', color: '#64748b', fontSize: 11 }}>{r.topMedio}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {loading && rows.length === 0 && (
        <p style={{ fontSize: 12, color: '#94a3b8' }}>Cargando intel regional…</p>
      )}
    </div>
  )
}

export default IntelRegional
