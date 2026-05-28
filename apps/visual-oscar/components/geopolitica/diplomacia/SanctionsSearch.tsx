'use client'
/**
 * <SanctionsSearch /> · Sprint GEO-DIP C2
 *
 * Búsqueda fuzzy de entidades sancionadas usando /api/diplomacia/screening
 * (proxy OpenSanctions). Permite buscar por nombre persona/empresa/buque.
 *
 * Resultado: lista de coincidencias con datasets que designan + países +
 * aliases + programas + fecha.
 */
import { useState } from 'react'
import { isoToName } from '@/lib/geopolitica/country-coords'

interface Entity {
  id: string
  caption: string
  schema: string
  countries: string[]
  topics: string[]
  datasets: string[]
  aliases: string[]
  sanctions_programs: string[]
  first_seen?: string
  last_seen?: string
}

interface SearchResp {
  ok: boolean
  query: string
  results: Entity[]
  error?: string
}

const SCHEMA_LABEL: Record<string, { label: string; emoji: string }> = {
  Person: { label: 'Persona', emoji: '👤' },
  Organization: { label: 'Organización', emoji: '🏢' },
  Vessel: { label: 'Buque', emoji: '🚢' },
  Aircraft: { label: 'Aeronave', emoji: '✈' },
}

export function SanctionsSearch() {
  const [q, setQ] = useState('')
  const [data, setData] = useState<SearchResp | null>(null)
  const [loading, setLoading] = useState(false)

  async function doSearch() {
    if (q.length < 2) return
    setLoading(true)
    try {
      const r = await fetch(`/api/diplomacia/screening?q=${encodeURIComponent(q)}&limit=15`)
      const j = await r.json()
      setData(j)
    } catch {
      setData({ ok: false, query: q, results: [], error: 'fetch_failed' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <section style={{
      background: '#fff', border: '1px solid #ECECEF', borderRadius: 14,
      padding: '16px 18px',
    }}>
      <header style={{ marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
          Screening de entidades sancionadas
        </h3>
        <p style={{ margin: '2px 0 0', fontSize: 10, color: '#6e6e73' }}>
          Búsqueda fuzzy en 333+ fuentes consolidadas (OFAC SDN, EU FSF, UNSC, UK OFSI, otros) · OpenSanctions API
        </p>
      </header>

      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <input
          type="text"
          placeholder="Nombre de persona, empresa, buque..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') doSearch() }}
          style={{
            flex: 1, padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 6,
            fontSize: 12, fontFamily: 'inherit',
          }}
        />
        <button
          onClick={doSearch}
          disabled={loading || q.length < 2}
          style={{
            padding: '8px 16px', background: '#0f172a', color: '#fff', border: 'none',
            borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: q.length < 2 ? 'not-allowed' : 'pointer',
            opacity: q.length < 2 ? 0.5 : 1,
          }}
        >{loading ? 'Buscando…' : 'Buscar'}</button>
      </div>

      {data && !data.ok && (
        <p style={{ fontSize: 11, color: '#dc2626' }}>Error: {data.error}</p>
      )}

      {data?.ok && data.results.length === 0 && (
        <p style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>Sin coincidencias para "{data.query}".</p>
      )}

      {data?.ok && data.results.length > 0 && (
        <>
          <p style={{ margin: '0 0 8px', fontSize: 10, color: '#475569' }}>
            {data.results.length} resultado(s) para <strong>{data.query}</strong>
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {data.results.map((e) => {
              const schema = SCHEMA_LABEL[e.schema] || { label: e.schema, emoji: '⚫' }
              return (
                <div key={e.id} style={{
                  padding: '10px 12px', background: '#fff', borderRadius: 6,
                  borderLeft: '3px solid #dc2626', border: '1px solid #f1f5f9',
                }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'baseline', marginBottom: 4 }}>
                    <span style={{ fontSize: 14 }}>{schema.emoji}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{e.caption}</span>
                    <span style={{ fontSize: 9, color: '#94a3b8' }}>· {schema.label}</span>
                    <span style={{ marginLeft: 'auto', padding: '1px 6px', background: '#fef2f2', color: '#7f1d1d', borderRadius: 3, fontSize: 9, fontWeight: 700 }}>SANCIONADO</span>
                  </div>
                  {e.aliases.length > 0 && (
                    <p style={{ margin: '2px 0', fontSize: 10, color: '#475569' }}>
                      Aliases: <em>{e.aliases.slice(0, 3).join(', ')}{e.aliases.length > 3 ? `, +${e.aliases.length - 3}` : ''}</em>
                    </p>
                  )}
                  {e.countries.length > 0 && (
                    <p style={{ margin: '2px 0', fontSize: 10, color: '#475569' }}>
                      País: {e.countries.slice(0, 5).map((c) => isoToName(c.toUpperCase())).join(', ')}
                    </p>
                  )}
                  {e.datasets.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                      {e.datasets.slice(0, 6).map((d) => (
                        <span key={d} style={{ padding: '1px 6px', background: '#f1f5f9', color: '#475569', borderRadius: 3, fontSize: 9, fontFamily: 'ui-monospace, monospace' }}>{d}</span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {!data && (
        <p style={{ fontSize: 10, color: '#94a3b8', fontStyle: 'italic' }}>
          Escribe ≥2 caracteres y pulsa Buscar o Enter. Ejemplos: "Putin", "Rosneft", "IRISL", "Khamenei".
        </p>
      )}
    </section>
  )
}

export default SanctionsSearch
