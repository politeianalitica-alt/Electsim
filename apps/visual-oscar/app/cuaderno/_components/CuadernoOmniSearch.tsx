'use client'

/**
 * <CuadernoOmniSearch> · búsqueda unificada Cmd+K · notas + entidades + datos.
 *
 * Sprint Cuaderno N9 · sustituye el QuickSwitcher (sólo notas) por un picker
 * tipo Linear/Raycast que cruza los tres ejes del Cuaderno:
 *
 *   📝 Notas        · matching por título · folder · tags · contenido
 *   ◉ Entidades    · 159 del registry · personas/partidos/CCAA/sectores/empresas/instituciones/países
 *   ⌖ Datos        · 50 datapoints macro/CIS/UNDP/WB
 *
 * Acción según tipo seleccionado:
 *   - Nota     → onSelectNote(id)              · abre en el editor
 *   - Entidad  → router.push(entity.link)       · navega a /figuras/X · /partidos/X · etc
 *   - Dato     → onInsertEmbed("{source:key}") · inserta en cursor del editor activo
 *
 * Navegación:
 *   ↑↓     · mueve por todos los resultados (cruza grupos)
 *   ⏎      · acción del item activo
 *   esc    · cierra
 *   tab    · cicla filtros (todo / notas / entidades / datos)
 *
 * Si la query no matchea ninguna nota existente, ofrece "+ Crear «query» como nota".
 */

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { searchEntities, KIND_COLORS } from '@/lib/cuaderno/entity-registry'
import { searchDataEmbeds } from '@/lib/cuaderno/data-registry'
import type { CuadernoNote } from '@/lib/cuaderno/store'

type Filter = 'all' | 'note' | 'entity' | 'data'

interface NoteHit { kind: 'note'; id: string; title: string; folder: string; score: number }
interface EntityHit {
  kind: 'entity'; slug: string; name: string; entityKind: string; role: string; link: string
}
interface DataHit { kind: 'data'; source: string; key: string; label: string }
type Hit = NoteHit | EntityHit | DataHit

interface Props {
  notes:        CuadernoNote[]
  onSelectNote: (id: string) => void
  onCreateNew:  (title: string) => void
  onInsertEmbed:(text: string) => void
  onClose:      () => void
}

function scoreNote(n: CuadernoNote, lo: string): number {
  // Bonus si el match está al principio del título · luego título completo · luego contenido
  let s = 0
  const t = n.title.toLowerCase()
  if (t.startsWith(lo)) s += 100
  if (t.includes(lo)) s += 40
  if (n.folder.toLowerCase().includes(lo)) s += 10
  if (n.tags.some((tag) => tag.toLowerCase().includes(lo))) s += 20
  if (n.content.toLowerCase().includes(lo)) s += 5
  return s
}

export function CuadernoOmniSearch({
  notes,
  onSelectNote,
  onCreateNew,
  onInsertEmbed,
  onClose,
}: Props) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [idx, setIdx] = useState(0)

  // Compone los hits según filter + query
  const hits = useMemo<Hit[]>(() => {
    const lo = q.trim().toLowerCase()
    const out: Hit[] = []

    // Notas
    if (filter === 'all' || filter === 'note') {
      const noteHits: NoteHit[] = lo === ''
        ? notes.slice(0, 8).map((n) => ({
            kind: 'note', id: n.id, title: n.title, folder: n.folder, score: 1,
          }))
        : notes
            .map((n) => ({ n, s: scoreNote(n, lo) }))
            .filter((x) => x.s > 0)
            .sort((a, b) => b.s - a.s)
            .slice(0, 8)
            .map(({ n, s }) => ({
              kind: 'note' as const, id: n.id, title: n.title, folder: n.folder, score: s,
            }))
      out.push(...noteHits)
    }

    // Entidades
    if (filter === 'all' || filter === 'entity') {
      const ents = searchEntities(lo, lo === '' ? 6 : 8)
      ents.forEach((e) =>
        out.push({
          kind: 'entity', slug: e.slug, name: e.name,
          entityKind: e.kind, role: e.role ?? '', link: e.link,
        }),
      )
    }

    // Datos
    if (filter === 'all' || filter === 'data') {
      const ds = searchDataEmbeds(lo, lo === '' ? 4 : 8)
      ds.forEach((d) =>
        out.push({ kind: 'data', source: d.source, key: d.key, label: d.label }),
      )
    }

    return out
  }, [q, notes, filter])

  // Reset cursor al cambiar query/filter
  useEffect(() => {
    setIdx(0)
  }, [q, filter])

  function performAction(h: Hit) {
    if (h.kind === 'note') {
      onSelectNote(h.id)
    } else if (h.kind === 'entity') {
      router.push(h.link)
      onClose()
    } else {
      onInsertEmbed(`{${h.source}:${h.key}}`)
      onClose()
    }
  }

  // Total para el "+Crear" cuando no hay matches
  const hasNoteMatch = hits.some((h) => h.kind === 'note')
  const showCreate = q.trim().length > 0 && !hasNoteMatch
  const totalRows = hits.length + (showCreate ? 1 : 0)

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIdx((i) => Math.min(i + 1, totalRows - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Tab') {
      e.preventDefault()
      const order: Filter[] = ['all', 'note', 'entity', 'data']
      const cur = order.indexOf(filter)
      const next = order[(cur + (e.shiftKey ? -1 + order.length : 1)) % order.length]
      setFilter(next)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (idx < hits.length) performAction(hits[idx])
      else if (showCreate) onCreateNew(q.trim())
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)',
        zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: 80,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 12, width: 'min(640px, 92%)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.25)',
          fontFamily: '-apple-system, system-ui, sans-serif',
          overflow: 'hidden',
        }}
      >
        {/* Filtros */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb' }}>
          {(['all', 'note', 'entity', 'data'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                flex: 1, padding: '8px 0', fontSize: 11,
                background: filter === f ? '#0071e3' : '#fff',
                color: filter === f ? '#fff' : '#64748b',
                border: 'none', cursor: 'pointer', fontWeight: 600,
                borderBottom: filter === f ? '2px solid #0071e3' : '2px solid transparent',
              }}
            >
              {f === 'all' && 'Todo'}
              {f === 'note' && '📝 Notas'}
              {f === 'entity' && '◉ Entidades'}
              {f === 'data' && '⌖ Datos'}
            </button>
          ))}
        </div>

        {/* Input */}
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={handleKey}
          placeholder={
            filter === 'note' ? 'Buscar nota o escribir nombre para crear…' :
            filter === 'entity' ? 'Buscar entidad (Pedro Sánchez, PSOE, Energía, Madrid…)' :
            filter === 'data' ? 'Buscar dato (macro, CIS, UNDP, World Bank…)' :
            'Busca notas, entidades o datos · ⇥ filtros · ↑↓ navega · ⏎ abrir'
          }
          style={{
            width: '100%', padding: '14px 18px', fontSize: 14,
            border: 'none', borderBottom: '1px solid #f1f5f9', outline: 'none',
            fontFamily: 'inherit',
          }}
        />

        {/* Resultados */}
        <div style={{ maxHeight: 380, overflow: 'auto' }}>
          {hits.length === 0 && !showCreate && (
            <div style={{ padding: 20, fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
              {q.trim() ? 'Sin resultados' : 'Empieza a escribir…'}
            </div>
          )}
          {hits.map((h, i) => (
            <button
              key={
                h.kind === 'note' ? 'n:' + h.id :
                h.kind === 'entity' ? 'e:' + h.slug :
                'd:' + h.source + ':' + h.key
              }
              onClick={() => performAction(h)}
              onMouseEnter={() => setIdx(i)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '8px 14px',
                background: i === idx ? '#f0f9ff' : '#fff',
                border: 'none', borderLeft: i === idx ? '3px solid #0071e3' : '3px solid transparent',
                cursor: 'pointer', textAlign: 'left',
                fontFamily: 'inherit',
              }}
            >
              {h.kind === 'note' && (
                <>
                  <span style={{ fontSize: 14, width: 18 }}>📝</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {h.title}
                    </div>
                    <div style={{ fontSize: 10, color: '#94a3b8' }}>{h.folder}</div>
                  </div>
                  <span style={{ fontSize: 9, color: '#cbd5e1' }}>Nota</span>
                </>
              )}
              {h.kind === 'entity' && (() => {
                const c = KIND_COLORS[h.entityKind as keyof typeof KIND_COLORS]
                return (
                  <>
                    <span
                      style={{
                        fontSize: 14, width: 18, color: c?.fg ?? '#64748b',
                      }}
                    >
                      {c?.glyph ?? '◉'}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                        {h.name}
                      </div>
                      <div style={{ fontSize: 10, color: '#94a3b8' }}>
                        {h.entityKind}{h.role ? ' · ' + h.role.slice(0, 60) : ''}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 9, padding: '1px 6px', borderRadius: 3,
                        background: c?.bg, color: c?.fg, border: `1px solid ${c?.border}`,
                        fontWeight: 600,
                      }}
                    >
                      {h.entityKind}
                    </span>
                  </>
                )
              })()}
              {h.kind === 'data' && (
                <>
                  <span style={{ fontSize: 14, width: 18, color: '#0F766E' }}>⌖</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                      {h.label}
                    </div>
                    <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'ui-monospace, monospace' }}>
                      {`{${h.source}:${h.key}}`}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: 9, padding: '1px 6px', borderRadius: 3,
                      background: '#f0fdfa', color: '#0F766E', border: '1px solid #99f6e4',
                      fontWeight: 600,
                    }}
                  >
                    {h.source}
                  </span>
                </>
              )}
            </button>
          ))}
          {showCreate && (
            <button
              onClick={() => onCreateNew(q.trim())}
              onMouseEnter={() => setIdx(hits.length)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '8px 14px',
                background: idx === hits.length ? '#f0f9ff' : '#fff',
                border: 'none',
                borderLeft: idx === hits.length ? '3px solid #0071e3' : '3px solid transparent',
                cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
              }}
            >
              <span style={{ fontSize: 14, width: 18, color: '#0071e3' }}>+</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0071e3' }}>
                  Crear «{q.trim()}»
                </div>
                <div style={{ fontSize: 10, color: '#94a3b8' }}>Nueva nota</div>
              </div>
            </button>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '6px 14px', borderTop: '1px solid #e5e7eb',
            fontSize: 10, color: '#94a3b8',
            display: 'flex', justifyContent: 'space-between',
          }}
        >
          <span>↑↓ navegar · ⏎ abrir · ⇥ filtro · esc cerrar</span>
          <span>
            {hits.length} resultado{hits.length === 1 ? '' : 's'}
            {filter !== 'all' && ` · filtro ${filter}`}
          </span>
        </div>
      </div>
    </div>
  )
}
