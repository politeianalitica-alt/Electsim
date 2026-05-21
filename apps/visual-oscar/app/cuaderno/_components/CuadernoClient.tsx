'use client'

/**
 * CuadernoClient — el editor + sidebar + grafo del Cuaderno.
 *
 * Inspirado en Obsidian:
 *   - Notas Markdown locales en localStorage del navegador
 *   - Wikilinks [[…]] con backlinks auto
 *   - Tags #foo
 *   - Vista grafo (canvas con simulación de fuerzas)
 *   - Búsqueda full-text + atajos
 *   - Acciones del analista se loguean en "Bitácora/"
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import styles from './Cuaderno.module.css'
import {
  loadAll, createNote, updateNote, deleteNote, findBySlug, backlinks, buildGraph,
  seedIfEmpty, slugify, logAction,
  type CuadernoNote,
} from '@/lib/cuaderno/store'
import { renderMarkdown } from '@/lib/cuaderno/markdown'

const GraphView = dynamic(() => import('./GraphView'), { ssr: false })

type Mode = 'edit' | 'read' | 'split'
type View = 'notes' | 'graph'

export default function CuadernoClient() {
  const [notes, setNotes] = useState<CuadernoNote[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [query, setQuery]       = useState('')
  const [mode, setMode]         = useState<Mode>('split')
  const [view, setView]         = useState<View>('notes')

  // ── Inicialización: seed + carga ──────────────────────────────────────────
  useEffect(() => {
    seedIfEmpty()
    refresh()
    // Registra que el analista abrió el cuaderno
    logAction({ kind: 'visit', title: 'Abriste el Cuaderno', href: '/cuaderno' })
  }, [])

  // Re-render si otro tab del navegador o el resto de la app actualiza notas
  useEffect(() => {
    function handler() { refresh() }
    window.addEventListener('cuaderno:change', handler)
    return () => window.removeEventListener('cuaderno:change', handler)
  }, [])

  function refresh() {
    setNotes(loadAll())
  }

  // ── Selección / acciones de notas ─────────────────────────────────────────
  const active = useMemo(() => notes.find(n => n.id === activeId) ?? null, [notes, activeId])

  // Si no hay nota seleccionada, escoge la primera
  useEffect(() => {
    if (!activeId && notes.length > 0) setActiveId(notes[0].id)
  }, [activeId, notes])

  const handleNew = useCallback(() => {
    const note = createNote({
      title:  'Nueva nota',
      folder: 'Notas',
      content: '# Nueva nota\n\nEscribe aquí. Usa `[[doble corchete]]` para enlazar otras notas.\n',
    })
    refresh()
    setActiveId(note.id)
    setMode('edit')
    setView('notes')
  }, [])

  const handleSelectSlug = useCallback((slug: string) => {
    const note = findBySlug(slug)
    if (note) {
      setActiveId(note.id)
      setView('notes')
    } else {
      // Crear stub de nota nueva en el destino — comportamiento Obsidian
      const created = createNote({
        title:  slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        folder: 'Notas',
        content: `# ${slug.replace(/-/g, ' ')}\n\n*(nota nueva creada al hacer click en un enlace)*\n`,
      })
      refresh()
      setActiveId(created.id)
      setView('notes')
    }
  }, [])

  const handleEdit = useCallback((patch: Partial<CuadernoNote>) => {
    if (!active) return
    const next = updateNote(active.id, patch)
    if (next) refresh()
  }, [active])

  const handleDelete = useCallback(() => {
    if (!active) return
    if (!window.confirm(`¿Borrar la nota "${active.title}"? No se puede deshacer.`)) return
    deleteNote(active.id)
    refresh()
    setActiveId(null)
  }, [active])

  const handlePin = useCallback(() => {
    if (!active) return
    updateNote(active.id, { pinned: !active.pinned })
    refresh()
  }, [active])

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const k = e.key.toLowerCase()
      if ((e.metaKey || e.ctrlKey) && k === 'n') { e.preventDefault(); handleNew() }
      if ((e.metaKey || e.ctrlKey) && k === 'g') { e.preventDefault(); setView(v => v === 'graph' ? 'notes' : 'graph') }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleNew])

  // ── Filtrado ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return notes
    return notes.filter(n =>
      n.title.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q) ||
      n.tags.some(t => t.includes(q))
    )
  }, [notes, query])

  // Pinned + Folders
  const grouped = useMemo(() => {
    const pinned = filtered.filter(n => n.pinned)
    const folders = new Map<string, CuadernoNote[]>()
    for (const n of filtered) {
      if (!folders.has(n.folder)) folders.set(n.folder, [])
      folders.get(n.folder)!.push(n)
    }
    // Sort folders: 'Inicio' first, 'Bitácora' last
    const folderArr = Array.from(folders.entries()).sort((a, b) => {
      if (a[0] === 'Inicio') return -1
      if (b[0] === 'Inicio') return 1
      if (a[0] === 'Bitácora') return 1
      if (b[0] === 'Bitácora') return -1
      return a[0].localeCompare(b[0])
    })
    return { pinned, folderArr }
  }, [filtered])

  // ── Wikilink click handler en preview ─────────────────────────────────────
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const t = e.target as HTMLElement
      if (t.classList.contains('cuad-wikilink')) {
        e.preventDefault()
        const slug = t.getAttribute('data-slug')
        if (slug) handleSelectSlug(slug)
      }
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [handleSelectSlug])

  // ── Backlinks of active ───────────────────────────────────────────────────
  const back = useMemo(() => active ? backlinks(active.slug) : [], [active, notes])

  const graphData = useMemo(() => buildGraph(), [notes])

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={styles.shell}>
      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHead}>
          <h2 className={styles.title}>
            <span style={{ color: 'var(--accent,#0071e3)' }}>⬡</span>
            Cuaderno
            <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--ink-4,#9ca3af)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {notes.length} notas
            </span>
          </h2>
          <input
            className={styles.search}
            type="search"
            placeholder="Buscar en tus notas…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <button className={styles.newBtn} onClick={handleNew}>
            <span>+</span> Nueva nota
          </button>
        </div>

        <div className={styles.viewSwitch}>
          <button
            className={`${styles.viewBtn} ${view === 'notes' ? styles.active : ''}`}
            onClick={() => setView('notes')}
          >Notas</button>
          <button
            className={`${styles.viewBtn} ${view === 'graph' ? styles.active : ''}`}
            onClick={() => setView('graph')}
            title="Cmd+G"
          >Grafo</button>
        </div>

        <div className={styles.noteList}>
          {grouped.pinned.length > 0 && (
            <div className={styles.folder}>
              <div className={styles.folderHead}>⌃ Fijadas</div>
              {grouped.pinned.map(n => (
                <NoteListItem key={n.id} note={n} active={n.id === activeId} onClick={() => { setActiveId(n.id); setView('notes') }} />
              ))}
            </div>
          )}

          {grouped.folderArr.map(([folder, list]) => (
            <div key={folder} className={styles.folder}>
              <div className={styles.folderHead}>{folder}</div>
              {list.map(n => (
                <NoteListItem key={n.id} note={n} active={n.id === activeId} onClick={() => { setActiveId(n.id); setView('notes') }} />
              ))}
            </div>
          ))}

          {notes.length === 0 && (
            <div style={{ padding: 16, fontSize: 12, color: 'var(--ink-4,#6e6e73)' }}>
              No tienes ninguna nota aún. Pulsa "+ Nueva nota" para empezar.
            </div>
          )}
        </div>
      </aside>

      {/* ── Editor / Grafo ─────────────────────────────────────── */}
      {view === 'graph' ? (
        <div className={styles.graphWrap}>
          <GraphView data={graphData} onSelect={handleSelectSlug} activeSlug={active?.slug} />
          <div className={styles.graphLegend}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Grafo de notas</div>
            <div className={styles.row}><span className={styles.swatch} style={{ background: '#0071e3' }} /> Inicio</div>
            <div className={styles.row}><span className={styles.swatch} style={{ background: '#7C3AED' }} /> Investigación</div>
            <div className={styles.row}><span className={styles.swatch} style={{ background: '#2d8a39' }} /> Bitácora</div>
            <div className={styles.row}><span className={styles.swatch} style={{ background: '#525258' }} /> Notas</div>
          </div>
          <div className={styles.graphHelp}>
            Click en un nodo para abrir · arrastra para mover · Cmd+G para volver
          </div>
        </div>
      ) : active ? (
        <div className={styles.editor}>
          <div className={styles.editorBar}>
            <input
              className={styles.titleInput}
              value={active.title}
              onChange={e => handleEdit({ title: e.target.value, slug: slugify(e.target.value) })}
              placeholder="Título de la nota"
            />
            <div className={styles.modeSwitch}>
              <button className={`${styles.modeBtn} ${mode === 'edit' ? styles.active : ''}`} onClick={() => setMode('edit')}>Editar</button>
              <button className={`${styles.modeBtn} ${mode === 'split' ? styles.active : ''}`} onClick={() => setMode('split')}>Split</button>
              <button className={`${styles.modeBtn} ${mode === 'read' ? styles.active : ''}`} onClick={() => setMode('read')}>Leer</button>
            </div>
            <button className={styles.toolbarBtn} onClick={handlePin}>
              {active.pinned ? '★ Fijada' : '☆ Fijar'}
            </button>
            <button className={`${styles.toolbarBtn} ${styles.danger}`} onClick={handleDelete}>
              Borrar
            </button>
          </div>

          <div className={styles.meta}>
            <span className={styles.pill}>📁 {active.folder}</span>
            <span className={styles.pill}>↻ {new Date(active.updatedAt).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
            {active.tags.length > 0 && (
              <span className={styles.pill}>{active.tags.join(' ')}</span>
            )}
            {active.links.length > 0 && (
              <span className={styles.pill}>⇢ {active.links.length} enlaces</span>
            )}
            {active.source === 'auto' && (
              <span className={styles.pill} style={{ background: 'rgba(45,138,57,0.10)', color: '#2d8a39' }}>AUTO</span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: mode === 'split' ? '1fr 1fr' : '1fr', flex: 1 }}>
            {(mode === 'edit' || mode === 'split') && (
              <textarea
                className={styles.editArea}
                value={active.content}
                onChange={e => handleEdit({ content: e.target.value })}
                placeholder="Escribe en Markdown. Usa [[wikilinks]] y #tags."
                spellCheck={false}
              />
            )}
            {(mode === 'read' || mode === 'split') && (
              <div
                className={styles.preview}
                dangerouslySetInnerHTML={{ __html: renderMarkdown(active.content) }}
              />
            )}
          </div>

          {back.length > 0 && (
            <div className={styles.backlinksBox}>
              <h3 className={styles.backlinksTitle}>← Backlinks · {back.length} nota{back.length === 1 ? '' : 's'} apuntan aquí</h3>
              {back.map(b => (
                <div key={b.id} className={styles.backlinkItem} onClick={() => setActiveId(b.id)}>
                  <strong>{b.title}</strong>
                  <span style={{ color: 'var(--ink-4,#9ca3af)', marginLeft: 8, fontSize: 11.5 }}>{b.folder}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className={styles.empty}>
          <h2>Tu Cuaderno está vacío</h2>
          <p>
            Crea tu primera nota para empezar a construir tu segundo cerebro. Todo se
            guarda <strong>en tu navegador</strong> — tus notas nunca salen de tu equipo.
          </p>
          <button className={styles.newBtn} style={{ width: 'auto', padding: '10px 20px' }} onClick={handleNew}>
            + Crear primera nota
          </button>
        </div>
      )}
    </div>
  )
}

function NoteListItem({ note, active, onClick }: { note: CuadernoNote; active: boolean; onClick: () => void }) {
  const preview = note.content.replace(/^#+\s*.*\n?/, '').replace(/[\[\]#`*>]/g, '').trim().slice(0, 64)
  return (
    <div
      className={`${styles.noteItem} ${active ? styles.active : ''}`}
      onClick={onClick}
      title={note.title}
    >
      <div>
        {note.pinned && <span className={styles.pinDot} />}
        {note.title}
        {note.source === 'auto' && <span className={styles.autoBadge}>AUTO</span>}
      </div>
      {preview && <span className={styles.noteSub}>{preview}</span>}
    </div>
  )
}
