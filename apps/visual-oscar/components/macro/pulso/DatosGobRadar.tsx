'use client'
/**
 * `<DatosGobRadar subtabSlug=... />` · panel de descubrimiento de
 * datasets en datos.gob.es relevantes al subtab.
 *
 * Sprint L F4: cada dataset es ahora un `<details>` colapsable que al
 * expandirse renderiza `<DatasetAnalyzer>` (extrae el CSV, infiere
 * columnas, muestra mini chart + tabla 5 filas + stats inline). Antes
 * eran sólo cards-link a la página externa.
 */
import { useEffect, useState } from 'react'
import { DatasetAnalyzer } from './DatasetAnalyzer'

interface DatasetHit {
  title: string
  description?: string
  publisher?: string
  url: string
  modified?: string
  formats?: string[]
  csvUrl?: string | null
  csvByteSize?: number | null
}

interface Props {
  subtabSlug: string
  keywords?: string[]
}

export function DatosGobRadar({ subtabSlug, keywords }: Props) {
  const [hits, setHits] = useState<DatasetHit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    const url = new URL('/api/macro/datagob/discovery', window.location.origin)
    url.searchParams.set('subtab', subtabSlug)
    if (keywords && keywords.length > 0) url.searchParams.set('q', keywords.join(','))
    fetch(url.toString(), { cache: 'force-cache' })
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return
        if (!j?.ok) {
          setError(j?.error || 'discovery_failed')
          return
        }
        setHits(j?.results || [])
      })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [subtabSlug, keywords])

  const withCsv = hits.filter((h) => h.csvUrl).length

  return (
    <section
      style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderLeft: '4px solid #0F766E',
        borderRadius: 10,
        padding: 16,
      }}
    >
      <header style={{ marginBottom: 12 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: '#0F766E', textTransform: 'uppercase' }}>
          Radar datos.gob.es · {hits.length} datasets · {withCsv} con CSV analizable
        </p>
        <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8' }}>
          Catálogo CKAN del Gobierno · click sobre un dataset para extraer CSV y mostrar mini chart + filas + stats.
        </p>
      </header>
      {loading && <p style={{ fontSize: 11, color: '#94a3b8' }}>Buscando en datos.gob.es…</p>}
      {error && (
        <p style={{ fontSize: 11, color: '#94a3b8' }}>
          Radar no disponible · {error}
        </p>
      )}
      {!loading && hits.length === 0 && !error && (
        <p style={{ fontSize: 11, color: '#94a3b8' }}>
          Sin datasets relevantes en datos.gob.es para este subtab.
        </p>
      )}
      {hits.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {hits.slice(0, 8).map((h, i) => (
            <details
              key={i}
              style={{
                background: '#f0fdfa',
                border: '1px solid #99f6e4',
                borderRadius: 6,
                padding: '6px 10px',
              }}
            >
              <summary style={{ cursor: 'pointer', fontSize: 12, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, color: '#0F766E' }}>{h.title}</span>
                {h.csvUrl && (
                  <span style={{ background: '#0F766E', color: '#fff', fontSize: 8, padding: '1px 5px', borderRadius: 3, fontWeight: 700 }}>
                    CSV
                  </span>
                )}
                {h.publisher && (
                  <span style={{ fontSize: 9, color: '#475569', background: '#fff', padding: '1px 5px', border: '1px solid #cbd5e1', borderRadius: 3 }}>
                    {h.publisher.length > 50 ? h.publisher.slice(0, 47) + '…' : h.publisher}
                  </span>
                )}
                {h.modified && (
                  <span style={{ fontSize: 9, color: '#94a3b8' }}>
                    · {h.modified.slice(0, 10)}
                  </span>
                )}
                {h.formats?.slice(0, 3).map((f, j) => (
                  <span key={j} style={{ background: '#e0f2fe', padding: '1px 5px', borderRadius: 3, color: '#075985', fontSize: 8, fontWeight: 600 }}>
                    {f}
                  </span>
                ))}
              </summary>
              {h.description && (
                <p style={{ margin: '8px 0 4px', fontSize: 11, color: '#475569', lineHeight: 1.4 }}>
                  {h.description.length > 250 ? h.description.slice(0, 250) + '…' : h.description}
                </p>
              )}
              <DatasetAnalyzer dataset={h} accent="#0F766E" />
            </details>
          ))}
        </div>
      )}
    </section>
  )
}

export default DatosGobRadar
