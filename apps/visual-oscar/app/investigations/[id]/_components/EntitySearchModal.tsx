'use client'
import { useEffect, useRef, useState } from 'react'
import { entitiesApi } from '@/lib/api/entities'
import type { EntitySearchResult } from '@/types/ontology'
import { KIND_LABEL, KIND_COLOR } from '@/types/ontology'

/** Modal Cmd+P · busca entidades en la ontología y permite fijar a la investigación activa. */
export function EntitySearchModal({
  onClose, onSelect,
}: {
  onClose: () => void
  onSelect: (r: EntitySearchResult) => void
}) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<EntitySearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [sel, setSel] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  // Debounced search
  useEffect(() => {
    if (q.length < 2) { setResults([]); return }
    setLoading(true)
    setError(null)
    const tid = setTimeout(async () => {
      try {
        const out = await entitiesApi.search(q, { limit: 20 })
        setResults(out)
        setSel(0)
      } catch (e) {
        setError(String(e).slice(0, 200))
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 220)
    return () => clearTimeout(tid)
  }, [q])

  // Atajos
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.preventDefault(); onClose() }
      else if (e.key === 'ArrowDown') {
        e.preventDefault(); setSel(s => Math.min(s + 1, results.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault(); setSel(s => Math.max(0, s - 1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const r = results[sel]
        if (r) onSelect(r)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [results, sel, onClose, onSelect])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)',
        display: 'flex', justifyContent: 'center', paddingTop: '8vh',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--color-surface)', borderRadius: 14,
          width: '100%', maxWidth: 640,
          maxHeight: '76vh', boxShadow: 'var(--shadow-xl)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          border: '1px solid var(--color-hairline)',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '14px 18px', borderBottom: '1px solid var(--color-hairline-soft)',
        }}>
          <span style={{ fontSize: 16, color: 'var(--color-ink-4)' }}>⌕</span>
          <input
            ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar actor, partido, ley, territorio…"
            style={{
              flex: 1, border: 'none', outline: 'none',
              fontSize: 15, fontFamily: 'inherit',
              color: 'var(--color-ink)', background: 'transparent',
            }}
          />
          {loading && <span style={{ fontSize: 11, color: 'var(--color-ink-5)' }}>buscando…</span>}
          <kbd style={{
            fontSize: 10, padding: '2px 6px',
            background: 'var(--color-surface-sunken)',
            border: '1px solid var(--color-hairline)',
            borderRadius: 4, color: 'var(--color-ink-4)',
          }}>Esc</kbd>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {error && (
            <div style={{ padding: 16, fontSize: 12, color: 'var(--color-danger)' }}>
              {error}
            </div>
          )}
          {q.length < 2 && !error && (
            <div style={{ padding: 24, fontSize: 13, color: 'var(--color-ink-5)', lineHeight: 1.5 }}>
              Escribe al menos 2 caracteres. La búsqueda usa scoring híbrido
              sobre slug, QID Wikidata, nombre y aliases.
            </div>
          )}
          {q.length >= 2 && results.length === 0 && !loading && !error && (
            <div style={{ padding: 24, fontSize: 13, color: 'var(--color-ink-5)' }}>
              Sin resultados para «<strong>{q}</strong>». Si esta entidad no está en
              la ontología todavía, ejecuta el backfill o créala manualmente.
            </div>
          )}
          {results.map((r, i) => (
            <button
              key={r.entity.id}
              onClick={() => onSelect(r)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 18px', border: 'none', textAlign: 'left',
                background: i === sel ? 'var(--color-surface-raised)' : 'transparent',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <span style={{
                fontSize: 9.5, fontWeight: 800, letterSpacing: '0.06em',
                padding: '3px 7px', borderRadius: 4, color: '#fff',
                background: KIND_COLOR[r.entity.kind], flexShrink: 0,
                textTransform: 'uppercase',
              }}>
                {KIND_LABEL[r.entity.kind].slice(0, 4)}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-ink)',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.entity.display_name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-ink-5)' }}>
                  {r.entity.slug}{r.entity.qid && ` · ${r.entity.qid}`}
                  {r.entity.tags.length > 0 && ` · ${r.entity.tags.slice(0, 2).join(', ')}`}
                </div>
              </div>
              <span style={{
                fontSize: 10, color: 'var(--color-ink-5)',
                fontFamily: 'var(--font-mono)',
              }}>
                {(r.score * 100).toFixed(0)}
              </span>
            </button>
          ))}
        </div>

        <div style={{
          padding: '8px 18px', borderTop: '1px solid var(--color-hairline-soft)',
          fontSize: 11, color: 'var(--color-ink-5)',
          display: 'flex', justifyContent: 'space-between',
        }}>
          <span>
            <kbd style={kbdStyle}>↑</kbd><kbd style={kbdStyle}>↓</kbd> navegar
            <kbd style={{ ...kbdStyle, marginLeft: 8 }}>↵</kbd> fijar entidad
          </span>
          <span>{results.length} resultado{results.length === 1 ? '' : 's'}</span>
        </div>
      </div>
    </div>
  )
}

const kbdStyle: React.CSSProperties = {
  fontSize: 10, padding: '1px 5px', marginRight: 4,
  background: 'var(--color-surface-sunken)',
  border: '1px solid var(--color-hairline)',
  borderRadius: 4, color: 'var(--color-ink-4)',
}
