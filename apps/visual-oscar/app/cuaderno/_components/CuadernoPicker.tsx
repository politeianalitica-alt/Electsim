'use client'

/**
 * <CuadernoPicker> · modal de selección rápida para insertar entidades
 * o data embeds en el editor del Cuaderno.
 *
 * UX inspirado en Cmd+K palettes (Linear/Notion):
 *   - Input arriba con focus auto
 *   - Lista filtrada en tiempo real
 *   - ↑↓ para navegar, Enter para insertar, Esc para cerrar
 *   - Mouse hover/click también funcionan
 *
 * Sprint Cuaderno N1.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  searchEntities,
  KIND_COLORS,
  type CuadEntity,
  type EntityKind,
} from '@/lib/cuaderno/entity-registry'
import {
  searchDataEmbeds,
  type DataEmbedSpec,
  type DataSource,
} from '@/lib/cuaderno/data-registry'

type PickerMode = 'entity' | 'data'

interface Props {
  mode: PickerMode
  onPick: (insertText: string) => void
  onClose: () => void
}

export function CuadernoPicker({ mode, onPick, onClose }: Props) {
  const [q, setQ] = useState('')
  const [idx, setIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const items = useMemo<Array<{ key: string; primary: string; secondary: string; tertiary?: string; insert: string; tag: string; color: { bg: string; fg: string; border: string; glyph: string } }>>(() => {
    if (mode === 'entity') {
      return searchEntities(q, 50).map((e) => ({
        key: `${e.kind}:${e.slug}`,
        primary: e.name,
        secondary: e.role ?? '',
        tertiary: e.kind,
        insert: `[[${e.name}]]`,
        tag: e.kind,
        color: KIND_COLORS[e.kind],
      }))
    }
    return searchDataEmbeds(q, 50).map((d) => ({
      key: `${d.source}:${d.key}`,
      primary: d.label,
      secondary: `${d.hint}${d.unit ? ' · ' + d.unit : ''}`,
      tertiary: d.source,
      insert: `{${d.source}:${d.key}}`,
      tag: d.source,
      color: dataSourceColor(d.source),
    }))
  }, [mode, q])

  useEffect(() => {
    setIdx(0)
  }, [q])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setIdx((i) => Math.min(items.length - 1, i + 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setIdx((i) => Math.max(0, i - 1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const it = items[idx]
        if (it) onPick(it.insert)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [items, idx, onPick, onClose])

  // Auto-scroll selected into view
  useEffect(() => {
    const el = listRef.current?.children[idx] as HTMLElement | undefined
    if (el) el.scrollIntoView({ block: 'nearest' })
  }, [idx])

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)',
        display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '12vh',
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 560, maxWidth: '90vw', maxHeight: '70vh', overflow: 'hidden',
          background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0',
          boxShadow: '0 25px 60px rgba(15,23,42,0.25)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        <div style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
            {mode === 'entity' ? 'Insertar entidad' : 'Insertar dato'}
          </span>
          <span style={{ fontSize: 10, color: '#64748b' }}>
            {mode === 'entity'
              ? 'Persona · Partido · CCAA · Sector · Empresa · Institución · País'
              : 'Macro · CIS · Stats · Governance · UNDP · World Bank'}
          </span>
          <button
            onClick={onClose}
            style={{ marginLeft: 'auto', border: 0, background: 'transparent', cursor: 'pointer', color: '#64748b', fontSize: 14 }}
          >
            ✕
          </button>
        </div>
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={mode === 'entity' ? 'Buscar Pedro Sánchez, PSOE, Madrid, IBEX35...' : 'Buscar SMI, IPC, CIS vivienda, deuda...'}
          style={{
            width: '100%', padding: '14px 16px', border: 0, borderBottom: '1px solid #f1f5f9',
            fontSize: 15, outline: 'none', fontFamily: 'inherit',
          }}
        />
        <ul
          ref={listRef}
          style={{
            margin: 0, padding: 0, listStyle: 'none', overflowY: 'auto', flex: 1,
          }}
        >
          {items.length === 0 && (
            <li style={{ padding: '24px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
              Sin resultados para "{q}"
            </li>
          )}
          {items.map((it, i) => (
            <li
              key={it.key}
              onMouseEnter={() => setIdx(i)}
              onClick={() => onPick(it.insert)}
              style={{
                padding: '10px 16px', cursor: 'pointer',
                background: idx === i ? '#f8fafc' : 'transparent',
                borderLeft: idx === i ? `3px solid ${it.color.fg}` : '3px solid transparent',
                display: 'flex', alignItems: 'center', gap: 10,
              }}
            >
              <span
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 28, height: 28, borderRadius: 6,
                  background: it.color.bg, color: it.color.fg,
                  fontSize: 14, flexShrink: 0,
                }}
              >
                {it.color.glyph}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {it.primary}
                </div>
                <div style={{ fontSize: 10, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {it.secondary}
                </div>
              </div>
              {it.tertiary && (
                <span style={{ fontSize: 9, color: it.color.fg, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                  {it.tertiary}
                </span>
              )}
              <code style={{ fontSize: 9, color: '#94a3b8', fontFamily: 'ui-monospace,monospace' }}>
                {it.insert}
              </code>
            </li>
          ))}
        </ul>
        <div style={{ padding: '6px 14px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10, color: '#94a3b8' }}>
          <span>↑↓ navegar · Enter insertar · Esc cerrar</span>
          <span>{items.length} resultados</span>
        </div>
      </div>
    </div>
  )
}

function dataSourceColor(s: DataSource): { bg: string; fg: string; border: string; glyph: string } {
  switch (s) {
    case 'macro': return { bg: 'rgba(15,118,110,0.10)', fg: '#0F766E', border: 'rgba(15,118,110,0.3)', glyph: '⌖' }
    case 'cis': return { bg: 'rgba(220,38,38,0.10)', fg: '#dc2626', border: 'rgba(220,38,38,0.3)', glyph: '◐' }
    case 'stats': return { bg: 'rgba(124,58,237,0.10)', fg: '#7C3AED', border: 'rgba(124,58,237,0.3)', glyph: '⬡' }
    case 'gov': return { bg: 'rgba(8,145,178,0.10)', fg: '#0891B2', border: 'rgba(8,145,178,0.3)', glyph: '◉' }
    case 'wb': return { bg: 'rgba(245,158,11,0.10)', fg: '#d97706', border: 'rgba(245,158,11,0.3)', glyph: '⊞' }
    case 'undp': return { bg: 'rgba(22,163,74,0.10)', fg: '#16a34a', border: 'rgba(22,163,74,0.3)', glyph: '✦' }
  }
}
