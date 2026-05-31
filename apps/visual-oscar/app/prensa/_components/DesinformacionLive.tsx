'use client'
/**
 * `<DesinformacionLive />` · Tab 9 · Verificación + claims via Google Fact Check Tools.
 */
import { useEffect, useState } from 'react'

const ACCENT = '#B91C1C'

interface Claim {
  text: string
  claimant: string
  publisher: { name: string; site: string }
  review_url: string
  review_title: string
  review_date: string
  rating: string
  language: string
}

export function DesinformacionLive() {
  const [query, setQuery] = useState('España')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async (q: string) => {
    setLoading(true); setError(null); setData(null)
    try {
      const r = await fetch(`/api/factcheck/search?query=${encodeURIComponent(q)}&languageCode=es&pageSize=30`)
      const d = await r.json()
      if (!d.ok) setError(d.error || `HTTP ${r.status}`)
      else setData(d)
    } catch (e: any) { setError(String(e?.message ?? e)) }
    finally { setLoading(false) }
  }

  useEffect(() => { run(query) /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [])

  // Group by rating
  const byRating = (data?.claims || []).reduce((acc: Record<string, Claim[]>, c: Claim) => {
    const k = (c.rating || 'sin rating').toLowerCase()
    if (!acc[k]) acc[k] = []
    acc[k].push(c)
    return acc
  }, {})

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 14, borderLeft: `4px solid ${ACCENT}` }}>
        <p style={{ fontSize: 11, color: ACCENT, fontWeight: 700, letterSpacing: 0.6, margin: 0, textTransform: 'uppercase' }}>
          Desinformación & verificación · Google Fact Check Tools API
        </p>
        <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 12px', lineHeight: 1.5 }}>
          Claims verificados por fact-checkers ES + globales (Maldita, Newtral, EFE Verifica, Verificat, AFP, Snopes...).
          Datos live del índice Google · sin hardcoded.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') run(query) }}
            placeholder="Tema · actor · keyword"
            style={{ flex: 1, padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 6, fontFamily: 'inherit', fontSize: 13 }}
          />
          <button
            onClick={() => run(query)}
            disabled={loading}
            style={{ background: ACCENT, color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            {loading ? 'Buscando…' : 'Verificar →'}
          </button>
          <a
            href="/prensa/desinformacion"
            style={{ background: '#fff', color: ACCENT, border: `1px solid ${ACCENT}`, borderRadius: 6, padding: '8px 16px', fontSize: 12, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}
          >
            Observatorio →
          </a>
        </div>
      </section>

      {error && (
        <section style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: 14 }}>
          <p style={{ fontSize: 12, color: '#991b1b', margin: 0, fontWeight: 600 }}>▲ {error}</p>
          {error === 'no_api_key' && (
            <div style={{ marginTop: 10, padding: 10, background: '#fff', borderRadius: 6, fontSize: 11, color: '#64748b' }}>
              <p style={{ margin: 0 }}>
                <strong>Activación pendiente:</strong> Configura <code style={{ background: '#f1f5f9', padding: '1px 4px', borderRadius: 3 }}>GOOGLE_FACTCHECK_KEY</code> en Vercel env vars.
              </p>
              <ol style={{ margin: '6px 0 0 0', paddingLeft: 18, lineHeight: 1.6 }}>
                <li>Crea proyecto en <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" style={{ color: ACCENT }}>console.cloud.google.com</a></li>
                <li>Activa "Fact Check Tools API"</li>
                <li>Genera API key restringida</li>
                <li>Vercel → Settings → Environment Variables · key=GOOGLE_FACTCHECK_KEY value=AIza...</li>
                <li>Redeploy</li>
              </ol>
            </div>
          )}
        </section>
      )}

      {data?.ok && (
        <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 14 }}>
          <p style={{ fontSize: 10, color: '#64748b', margin: 0, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>
            {data.n_claims} claims verificados · "{data.query}"
          </p>
          {Object.keys(byRating).length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
              {Object.entries(byRating).map(([rating, claims]: any) => {
                const isFalse = /falso|false|incorrect|engañoso/i.test(rating)
                const isTrue = /verdadero|true|correct/i.test(rating)
                return (
                  <span key={rating} style={{
                    fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999,
                    background: isFalse ? '#fee2e2' : isTrue ? '#dcfce7' : '#f1f5f9',
                    color: isFalse ? '#991b1b' : isTrue ? '#166534' : '#475569',
                  }}>
                    {rating}: <strong>{(claims as Claim[]).length}</strong>
                  </span>
                )
              })}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
            {(data.claims || []).map((c: Claim, i: number) => {
              const isFalse = /falso|false|incorrect|engañoso/i.test(c.rating || '')
              const accentColor = isFalse ? '#dc2626' : '#0f766e'
              return (
                <div key={i} style={{ padding: 12, background: '#f8fafc', borderRadius: 6, borderLeft: `3px solid ${accentColor}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', margin: 0, lineHeight: 1.4, flex: '1 1 60%' }}>
                      "{c.text}"
                    </p>
                    <span style={{ fontSize: 10, fontWeight: 700, color: accentColor, padding: '2px 8px', background: '#fff', borderRadius: 999, border: `1px solid ${accentColor}33` }}>
                      {c.rating}
                    </span>
                  </div>
                  <p style={{ fontSize: 10, color: '#64748b', margin: '6px 0 0' }}>
                    <strong>Atribuido a:</strong> {c.claimant || 'desconocido'}
                  </p>
                  <p style={{ fontSize: 10, color: '#64748b', margin: '2px 0 0' }}>
                    <strong>Verificado por:</strong> <a href={c.review_url} target="_blank" rel="noopener noreferrer" style={{ color: accentColor, textDecoration: 'underline' }}>{c.publisher?.name}</a>
                    {c.review_date && ` · ${new Date(c.review_date).toLocaleDateString('es-ES')}`}
                  </p>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}

export default DesinformacionLive
