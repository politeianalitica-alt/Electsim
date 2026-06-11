'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  GLOSSARY,
  CATEGORY_LABELS,
  type GlossaryEntry,
  type GlossaryCategory,
} from '@/lib/glossary'

const CATS: GlossaryCategory[] = [
  'macro',
  'energia',
  'geopolitica',
  'medios',
  'finanzas',
  'institucional',
  'estadistica',
]

/**
 * Cliente de /glosario · buscador + lista por categoría.
 *
 * UX:
 *   - Buscador focusea automáticamente al cargar (analista llega aquí porque
 *     quiere buscar algo concreto).
 *   - Filtra por término, alias, definición corta y categoría (case-insensitive).
 *   - Sticky table-of-contents lateral en >900px.
 *   - Cada tarjeta es anclable (`#PVPC`) y revela definición extendida + fuente
 *     + enlace a la URL oficial cuando aplica.
 *   - Si llega con `#PVPC` en URL, hace scroll suave y resalta brevemente.
 */
export default function GlosarioClient() {
  const [q, setQ] = useState('')
  const [activeAnchor, setActiveAnchor] = useState<string | null>(null)

  // Si el usuario llega con #ANCHOR, lo resaltamos brevemente
  useEffect(() => {
    if (typeof window === 'undefined') return
    const hash = window.location.hash?.slice(1)
    if (!hash) return
    const decoded = decodeURIComponent(hash)
    setActiveAnchor(decoded)
    const t = setTimeout(() => {
      const el = document.getElementById(decoded)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 80)
    const fade = setTimeout(() => setActiveAnchor(null), 2400)
    return () => { clearTimeout(t); clearTimeout(fade) }
  }, [])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return GLOSSARY
    return GLOSSARY.filter((e) => {
      if (e.term.toLowerCase().includes(needle)) return true
      if (e.short.toLowerCase().includes(needle)) return true
      if (e.aliases?.some((a) => a.toLowerCase().includes(needle))) return true
      if (CATEGORY_LABELS[e.category].toLowerCase().includes(needle)) return true
      return false
    })
  }, [q])

  const grouped = useMemo(() => {
    const g: Record<GlossaryCategory, GlossaryEntry[]> = {
      macro: [], energia: [], geopolitica: [], medios: [], finanzas: [],
      institucional: [], estadistica: [],
    }
    for (const e of filtered) g[e.category].push(e)
    for (const k of Object.keys(g) as GlossaryCategory[]) {
      g[k].sort((a, b) => a.term.localeCompare(b.term, 'es'))
    }
    return g
  }, [filtered])

  const totalCount = filtered.length

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px 80px' }}>
      <header style={{ marginBottom: 24 }}>
        <p
          style={{
            fontSize: 10.5,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'var(--color-ink-4, #6e6e73)',
            margin: 0,
            fontWeight: 600,
          }}
        >
          Politeia Analítica · Referencia
        </p>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 36,
            letterSpacing: '-0.022em',
            margin: '4px 0 6px',
          }}
        >
          Glosario
        </h1>
        <p style={{ fontSize: 14.5, color: 'var(--color-ink-3, #515154)', margin: 0, lineHeight: 1.5 }}>
          Definiciones de los términos técnicos del dashboard: macroeconomía,
          energía, geopolítica, medios, mercados, instituciones y estadística.
          Cada entrada incluye fuente cuando aplica.
        </p>
      </header>

      {/* Buscador */}
      <div style={{ marginBottom: 28 }}>
        <input
          autoFocus
          type="search"
          aria-label="Buscar en el glosario"
          placeholder="Busca un término, alias o categoría (ej: PVPC, NAIRU, sanciones, fact-checking…)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{
            width: '100%',
            padding: '14px 16px',
            fontSize: 14,
            borderRadius: 12,
            border: '1px solid var(--color-hairline, #d2d2d7)',
            background: '#fff',
            fontFamily: 'inherit',
            outline: 'none',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
          }}
        />
        <p style={{ fontSize: 12, color: 'var(--color-ink-4, #6e6e73)', margin: '8px 4px 0' }}>
          {totalCount} {totalCount === 1 ? 'término' : 'términos'}
          {q.trim() && ` · filtrando por "${q.trim()}"`}
        </p>
      </div>

      {/* Layout 2 col en desktop · 1 col en mobile */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr)',
          gap: 24,
        }}
        className="glosario-layout"
      >
        {/* Categorías */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
          {CATS.map((cat) => {
            const items = grouped[cat]
            if (items.length === 0) return null
            return (
              <section key={cat} aria-labelledby={`cat-${cat}`}>
                <h2
                  id={`cat-${cat}`}
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    color: 'var(--color-ink-4, #6e6e73)',
                    margin: '0 0 14px',
                    paddingBottom: 8,
                    borderBottom: '1px solid var(--color-hairline-soft, #e8e8ed)',
                  }}
                >
                  {CATEGORY_LABELS[cat]} · {items.length}
                </h2>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {items.map((e) => {
                    const isActive = activeAnchor?.toLowerCase() === e.term.toLowerCase()
                    return (
                      <li
                        key={e.term}
                        id={e.term}
                        style={{
                          background: isActive ? 'rgba(31,78,140,0.06)' : '#fff',
                          border: `1px solid ${isActive ? 'rgba(31,78,140,0.35)' : 'var(--color-hairline-soft, #e8e8ed)'}`,
                          borderRadius: 12,
                          padding: '14px 16px',
                          transition: 'background 240ms, border-color 240ms',
                          scrollMarginTop: 80,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{e.term}</h3>
                          {e.aliases && e.aliases.length > 0 && (
                            <span style={{ fontSize: 11.5, color: 'var(--color-ink-4, #6e6e73)' }}>
                              · también: {e.aliases.join(' · ')}
                            </span>
                          )}
                        </div>
                        <p
                          style={{
                            margin: '6px 0 0',
                            fontSize: 13.5,
                            lineHeight: 1.55,
                            color: 'var(--color-ink-2, #3a3a3d)',
                          }}
                        >
                          {e.long}
                        </p>
                        {(e.source || e.url) && (
                          <p style={{ margin: '8px 0 0', fontSize: 11.5, color: 'var(--color-ink-4, #6e6e73)' }}>
                            {e.source && <>Fuente: {e.source}</>}
                            {e.source && e.url && ' · '}
                            {e.url && (
                              <a
                                href={e.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: 'var(--color-accent, #1F4E8C)', textDecoration: 'none' }}
                              >
                                Sitio oficial →
                              </a>
                            )}
                          </p>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
          {totalCount === 0 && (
            <p style={{ color: 'var(--color-ink-4, #6e6e73)', fontSize: 14 }}>
              Sin resultados. Prueba con otro término o palabra clave.
            </p>
          )}
        </div>
      </div>
    </main>
  )
}
