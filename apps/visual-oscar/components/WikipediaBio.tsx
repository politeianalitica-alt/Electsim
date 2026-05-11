'use client'
import { useEffect, useState } from 'react'

interface WikiBio {
  ok: boolean
  source: 'wikipedia' | 'wikidata' | 'none'
  title?: string
  summary?: string
  description?: string
  thumbnail_url?: string
  url?: string
  birth_date?: string
  error?: string
}

interface Props {
  /** Name of the actor (used to query Wikipedia REST summary endpoint). */
  name: string
  /** Optional party as a hint for disambiguation. */
  party?: string
}

export default function WikipediaBio({ name, party }: Props) {
  const [bio, setBio] = useState<WikiBio | null>(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (!name) return
    let cancelled = false
    setLoading(true)
    // Slugify name for the API path
    const slug = encodeURIComponent(name)
    fetch(`/api/actores/${slug}/wikipedia`)
      .then(r => r.json())
      .then(j => { if (!cancelled) setBio(j) })
      .catch(() => { if (!cancelled) setBio({ ok: false, source: 'none', error: 'fetch_failed' }) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [name])

  if (loading) {
    return (
      <div style={{
        padding: '14px 16px', borderRadius: 12,
        background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
        border: '1px solid rgba(0,0,0,0.05)', marginBottom: 14,
      }}>
        <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          📖 Wikipedia
        </div>
        <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>Buscando entrada para «{name}»…</div>
      </div>
    )
  }
  if (!bio || !bio.ok || !bio.summary) {
    return null
  }

  const truncated = bio.summary.length > 380 && !expanded
  const display = truncated ? bio.summary.slice(0, 380) + '…' : bio.summary

  return (
    <div style={{
      padding: '16px 18px', borderRadius: 12,
      background: 'linear-gradient(180deg, #fefce8 0%, #fef9c3 100%)',
      border: '1px solid rgba(202,138,4,0.18)',
      marginBottom: 16,
      display: 'flex', gap: 16,
    }}>
      {bio.thumbnail_url && (
        <img
          src={bio.thumbnail_url}
          alt={bio.title}
          style={{
            width: 80, height: 100, objectFit: 'cover', borderRadius: 8,
            border: '1.5px solid rgba(202,138,4,0.25)', flexShrink: 0,
            background: 'white',
          }}
        />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 10, color: '#854d0e', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            📖 Wikipedia
          </span>
          {bio.birth_date && (
            <span style={{ fontSize: 10, color: '#a16207' }}>
              n. {bio.birth_date}
            </span>
          )}
          {bio.url && (
            <a href={bio.url} target="_blank" rel="noopener noreferrer" style={{
              marginLeft: 'auto', fontSize: 10, color: '#0c4a6e', textDecoration: 'none', fontWeight: 600,
            }}>Ver en Wikipedia →</a>
          )}
        </div>
        {bio.description && (
          <div style={{ fontSize: 11, color: '#854d0e', fontStyle: 'italic', marginBottom: 6 }}>
            {bio.description}
          </div>
        )}
        <p style={{ fontSize: 12.5, color: '#422006', lineHeight: 1.6, margin: 0 }}>
          {display}
        </p>
        {bio.summary.length > 380 && (
          <button onClick={() => setExpanded(e => !e)} style={{
            background: 'transparent', border: 'none', color: '#854d0e',
            fontSize: 11, fontWeight: 700, cursor: 'pointer', padding: 0, marginTop: 6,
          }}>
            {expanded ? '← Resumir' : 'Leer más →'}
          </button>
        )}
      </div>
    </div>
  )
}
