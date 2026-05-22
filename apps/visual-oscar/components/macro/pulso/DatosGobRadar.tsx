'use client'
/**
 * `<DatosGobRadar subtabSlug=... />` · panel de descubrimiento de
 * datasets en datos.gob.es relevantes al subtab.
 *
 * Consume `/api/macro/datagob/discovery?subtab=...`. Permite al analista
 * encontrar fuentes oficiales adicionales sin abandonar la pantalla.
 */
import { useEffect, useState } from 'react'

interface DatasetHit {
  title: string
  description?: string
  publisher?: string
  url: string
  modified?: string
  formats?: string[]
}

interface Props {
  subtabSlug: string
  /** Si quieres sobreescribir los términos de búsqueda */
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
          Radar datos.gob.es · datasets relacionados
        </p>
        <p style={{ margin: '2px 0 0', fontSize: 11, color: '#94a3b8' }}>
          Catálogo CKAN del Gobierno de España · ministerios, organismos y CCAA · clic abre el dataset oficial
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
          Sin datasets relevantes en datos.gob.es para este subtab. La búsqueda CKAN puede tardar en
          indexar nuevos publicadores.
        </p>
      )}
      {hits.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
          {hits.slice(0, 8).map((h, i) => (
            <a
              key={i}
              href={h.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block',
                background: '#f0fdfa',
                border: '1px solid #99f6e4',
                borderRadius: 8,
                padding: 12,
                textDecoration: 'none',
                color: '#0f172a',
              }}
            >
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#0F766E', lineHeight: 1.3 }}>
                {h.title}
              </p>
              {h.description && (
                <p style={{ margin: '4px 0 0', fontSize: 11, color: '#475569', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {h.description.length > 200 ? `${h.description.slice(0, 200)}…` : h.description}
                </p>
              )}
              <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4, fontSize: 9, color: '#64748b' }}>
                {h.publisher && (
                  <span style={{ background: '#fff', padding: '2px 6px', borderRadius: 4, border: '1px solid #cbd5e1' }}>
                    {h.publisher}
                  </span>
                )}
                {h.formats?.slice(0, 4).map((f, j) => (
                  <span
                    key={j}
                    style={{ background: '#e0f2fe', padding: '2px 6px', borderRadius: 4, color: '#075985', fontWeight: 600 }}
                  >
                    {f}
                  </span>
                ))}
                {h.modified && <span>· {h.modified.slice(0, 10)}</span>}
              </div>
            </a>
          ))}
        </div>
      )}
    </section>
  )
}

export default DatosGobRadar
