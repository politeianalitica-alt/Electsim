'use client'

/**
 * CuadernoClient — el cerebro operativo del analista.
 *
 * Vistas (left-rail):
 *   - Hoy        — daily note autogenerada
 *   - Notas      — explorador de carpetas
 *   - Tareas     — agregador de `- [ ]` con responsable, prioridad, fecha
 *   - Calendario — mes con actividad: notas, tareas, daily
 *   - Tags       — browser de etiquetas
 *   - Plantillas — método del analista
 *   - Grafo      — red de conexiones
 *
 * Editor:
 *   - Título · Plantilla · Modo (edit/split/read) · Pin · Borrar
 *   - Outline panel a la derecha
 *   - Backlinks
 *   - Tareas inline editables (click en [ ] alterna)
 *
 * Persistencia: 100% localStorage. Wikilinks bidireccionales, frontmatter
 * YAML, tags, tareas con metadata.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import styles from './Cuaderno.module.css'
// Sprint Cuaderno N1 · picker (entidades / data embeds) + hidratación de embeds
import { CuadernoPicker } from './CuadernoPicker'
import { useDataEmbeds } from './DataEmbed'
import { totalEntities } from '@/lib/cuaderno/entity-registry'
import { DATA_REGISTRY } from '@/lib/cuaderno/data-registry'
// Sprint Cuaderno N2 · panel de entidades con cross-references
import { EntitiesPanel } from './EntitiesPanel'
// Sprint Cuaderno N3 · editor CodeMirror 6 con autocomplete inline + ref imperativa
import type { MarkdownEditorHandle } from './MarkdownEditor'
// Sprint Cuaderno N7 · asistente IA contextual sobre la nota activa
import { CuadernoAIPanel } from './CuadernoAIPanel'
// Sprint Cuaderno N9 · búsqueda unificada Cmd+K · notas + entidades + datos
import { CuadernoOmniSearch } from './CuadernoOmniSearch'
// Sprint Cuaderno N8 · sincronización cloud (Vercel Blob)
import { CuadernoSyncPanel } from './CuadernoSyncPanel'
import { startAutoSync, isAutoSyncEnabled } from '@/lib/cuaderno/cloud-sync'
// Sprint Cuaderno N11 · insights dashboard meta sobre el propio cuaderno
import { CuadernoInsights } from './CuadernoInsights'
// Módulos transversales · Cama (macroargumentos) y Preinformes · compartidos
// con Estudio, War Room, Toolbox y Command Center
import CamaModule from '@/app/_components/cama/CamaModule'
import PreinformesModule from '@/app/_components/preinformes/PreinformesModule'
import {
  loadAll, createNote, updateNote, deleteNote, findBySlug, backlinks, buildGraph,
  buildHybridGraph, backlinksWithContext,
  archiveNote, unarchiveNote, renameNote,
  seedIfEmpty, slugify, logAction, createFromTemplate, getOrCreateDailyNote,
  type CuadernoNote, type BacklinkWithContext,
} from '@/lib/cuaderno/store'
import {
  parseFrontmatter, allTasks, summarizeTasks, toggleTask,
  allTags, dailyMap, activityFor, outlineOf, isDailyNote,
} from '@/lib/cuaderno/queries'
import { TEMPLATES } from '@/lib/cuaderno/templates'
import { renderMarkdown } from '@/lib/cuaderno/markdown'
import { useUrlState } from '@/lib/useUrlState'

// Sprint Cuaderno N5 · grafo híbrido (notas + entidades del registry).
// El GraphView simple original se eliminó en Fase 0 (jun 2026): nunca se
// renderizaba desde que el híbrido lo sustituyó.
const HybridGraphView = dynamic(() => import('./HybridGraphView'), { ssr: false })
// Sprint Cuaderno N3 · CodeMirror necesita DOM, así que ssr:false
const MarkdownEditor = dynamic(
  () => import('./MarkdownEditor').then((m) => m.MarkdownEditor),
  {
    ssr: false,
    loading: () => (
      <div style={{ height: '100%', background: '#fafafa', padding: 16, color: '#9ca3af', fontSize: 12 }}>
        Cargando editor…
      </div>
    ),
  },
)

type Mode = 'edit' | 'read' | 'split'
type View = 'today' | 'notes' | 'tasks' | 'calendar' | 'tags' | 'templates' | 'graph' | 'insights' | 'cama' | 'preinformes'

export default function CuadernoClient() {
  // Sprint Cuaderno N5 · navegación a entity.link cuando se click en un nodo de entidad del grafo
  const router = useRouter()
  const [notes, setNotes]       = useState<CuadernoNote[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [query, setQuery]       = useState('')
  const [mode, setMode]         = useState<Mode>('split')
  // Fase 1 · vista en URL (?view=graph|tasks|cama…): enlazable entre
  // analistas y sobrevive a F5 — mismo patrón que ?section= del War Room.
  const [view, setView]         = useUrlState<View>('view', 'today')
  // Sprint Cuaderno N1 · picker mode (entity | data | null=closed) + preview ref para hidratación
  const [pickerMode, setPickerMode] = useState<'entity' | 'data' | null>(null)
  // Sprint Cuaderno N7 · asistente IA sobre la nota activa
  const [aiOpen, setAiOpen] = useState(false)
  // Cama/Preinformes · semilla al convertir la nota activa en preinforme
  const [preinformeSemilla, setPreinformeSemilla] = useState<{ titulo: string; contenido: string } | null>(null)
  // Sprint Cuaderno N8 · panel de sincronización cloud
  const [syncOpen, setSyncOpen] = useState(false)
  // Sprint Cuaderno N8 polish · status del auto-sync (idle/syncing/ok/error)
  const [autoSyncStatus, setAutoSyncStatus] = useState<'idle' | 'syncing' | 'ok' | 'error'>('idle')
  // Sprint Cuaderno N13 · save indicator visible · feedback del guardado en localStorage
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Sprint Cuaderno N13 · focus mode (Cmd+\) · oculta rail + outline + backlinks
  const [focusMode, setFocusMode] = useState(false)
  // Sprint Cuaderno N13 · vista archivadas (subset de notes view)
  const [showArchived, setShowArchived] = useState(false)
  // Sprint Cuaderno N13 · history navegación · Alt+← retrocede · Alt+→ avanza
  const navHistoryRef = useRef<string[]>([])
  const navIndexRef = useRef<number>(-1)
  const navInternalRef = useRef<boolean>(false)  // evita push cuando es la propia nav la que cambia activeId
  const previewRef = useRef<HTMLDivElement | null>(null)
  useDataEmbeds(previewRef.current)
  // Sprint Cuaderno N3 · editor ref imperativa · permite picker.insertAtCursor()
  const editorRef = useRef<MarkdownEditorHandle | null>(null)
  const [tplOpen, setTplOpen]   = useState(false)
  const [switcher, setSwitcher] = useState(false)
  const [outlineOpen, setOutlineOpen] = useState(true)

  // ── Inicialización ────────────────────────────────────────────────────────
  useEffect(() => {
    seedIfEmpty()
    refresh()
    // Garantiza que existe la nota de hoy
    const daily = getOrCreateDailyNote()
    if (daily) setActiveId(daily.id)
    logAction({ kind: 'visit', title: 'Abriste el Cuaderno', href: '/cuaderno' })
  }, [])

  useEffect(() => {
    function handler() { refresh() }
    window.addEventListener('cuaderno:change', handler)
    return () => window.removeEventListener('cuaderno:change', handler)
  }, [])

  // Sprint Cuaderno N13 · push activeId al history nav (excepto si es la nav la que cambia)
  useEffect(() => {
    if (!activeId) return
    if (navInternalRef.current) {
      navInternalRef.current = false
      return
    }
    // Drop forward stack al hacer nueva navegación
    if (navIndexRef.current < navHistoryRef.current.length - 1) {
      navHistoryRef.current = navHistoryRef.current.slice(0, navIndexRef.current + 1)
    }
    // No duplicar si ya estamos en este id
    if (navHistoryRef.current[navHistoryRef.current.length - 1] !== activeId) {
      navHistoryRef.current.push(activeId)
      navIndexRef.current = navHistoryRef.current.length - 1
      // Cap a 50 entradas para no comer memoria
      if (navHistoryRef.current.length > 50) {
        navHistoryRef.current.shift()
        navIndexRef.current--
      }
    }
  }, [activeId])

  const navBack = useCallback(() => {
    if (navIndexRef.current <= 0) return
    navIndexRef.current--
    const targetId = navHistoryRef.current[navIndexRef.current]
    navInternalRef.current = true
    setActiveId(targetId)
    setView('notes')
  }, [])

  const navForward = useCallback(() => {
    if (navIndexRef.current >= navHistoryRef.current.length - 1) return
    navIndexRef.current++
    const targetId = navHistoryRef.current[navIndexRef.current]
    navInternalRef.current = true
    setActiveId(targetId)
    setView('notes')
  }, [])

  // Sprint Cuaderno N8 polish · auto-sync opcional (toggle desde SyncPanel)
  // Se activa en mount si el usuario lo ha habilitado en localStorage.
  // El status indicator en toolbar muestra "↑↓ syncing…" mientras corre.
  useEffect(() => {
    if (!isAutoSyncEnabled()) return
    const teardown = startAutoSync({
      delay: 30_000,
      onStatus: (s) => {
        setAutoSyncStatus(s)
        if (s === 'ok' || s === 'error') {
          // Vuelve a idle tras 3s para no "sticky" el badge
          setTimeout(() => setAutoSyncStatus('idle'), 3000)
        }
      },
    })
    return teardown
  }, [syncOpen])  // re-engancha cuando se cierra el SyncPanel (toggle puede haber cambiado)

  function refresh() { setNotes(loadAll()) }

  const active = useMemo(() => notes.find(n => n.id === activeId) ?? null, [notes, activeId])

  // ── Acciones de notas ─────────────────────────────────────────────────────
  const openTemplateMenu = useCallback(() => setTplOpen(true), [])

  const handleNewBlank = useCallback(() => {
    const note = createNote({
      title:  'Nueva nota',
      folder: 'Notas',
      content: '# Nueva nota\n\nEscribe aquí. Usa `[[doble corchete]]` para enlazar y `#tags` para clasificar.\n',
    })
    refresh()
    setActiveId(note.id)
    setMode('edit')
    setView('notes')
    setTplOpen(false)
  }, [])

  const handleNewFromTemplate = useCallback((templateId: string) => {
    const note = createFromTemplate(templateId)
    if (!note) return
    refresh()
    setActiveId(note.id)
    setMode('split')
    setView('notes')
    setTplOpen(false)
  }, [])

  const handleSelectSlug = useCallback((slug: string) => {
    const note = findBySlug(slug)
    if (note) {
      setActiveId(note.id)
      setView('notes')
    } else {
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
    // Sprint N13 · indicator "Guardando…" → "Guardado · hace Xs"
    setSaveStatus('saving')
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    const next = updateNote(active.id, patch)
    if (next) refresh()
    // Pequeño delay para evitar flicker · 350ms se ve como saving brevemente
    saveTimerRef.current = setTimeout(() => {
      setSaveStatus('saved')
      // Reset a idle tras 4s (la pill ya no muestra nada)
      setTimeout(() => setSaveStatus('idle'), 4000)
    }, 350)
  }, [active])

  // Sprint Cuaderno N13 · archive / unarchive
  const handleArchive = useCallback(() => {
    if (!active) return
    if (active.archived) {
      unarchiveNote(active.id)
    } else {
      archiveNote(active.id)
    }
    refresh()
  }, [active])

  // Sprint Cuaderno N13 · rename con cascade · reescribe backlinks
  // Sólo se dispara cuando el usuario confirma con Enter o blur del input título
  const handleRename = useCallback((newTitle: string) => {
    if (!active) return
    if (newTitle.trim() === active.title) return
    const r = renameNote(active.id, newTitle)
    if (r.note) {
      refresh()
      if (r.updatedRefs > 0) {
        // Feedback silencioso · podríamos usar un toast en el futuro
        console.log(`Cuaderno: rename "${active.title}" → "${newTitle}" · ${r.updatedRefs} backlinks reescritos`)
      }
    }
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

  const handleOpenToday = useCallback(() => {
    const daily = getOrCreateDailyNote()
    if (daily) {
      refresh()
      setActiveId(daily.id)
      setView('notes')
      setMode('split')
    }
  }, [])

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const k = e.key.toLowerCase()
      const mod = e.metaKey || e.ctrlKey
      if (mod && k === 'n')   { e.preventDefault(); openTemplateMenu() }
      if (mod && k === 'g')   { e.preventDefault(); setView(view === 'graph' ? 'notes' : 'graph') }
      if (mod && k === 'd')   { e.preventDefault(); handleOpenToday() }
      if (mod && k === 't')   { e.preventDefault(); setView('tasks') }
      if (mod && k === '1')   { e.preventDefault(); setView('calendar') }
      if (mod && k === 'k')   { e.preventDefault(); setSwitcher(true) }
      if (mod && k === 'o')   { e.preventDefault(); setSwitcher(true) }
      // Sprint Cuaderno N10 · Cmd+J abre asistente IA sobre la nota activa
      if (mod && k === 'j')   { e.preventDefault(); if (active) setAiOpen(true) }
      // Sprint Cuaderno N10 · Cmd+E exporta la nota activa como .md
      if (mod && k === 'e')   { e.preventDefault(); if (active) downloadNoteAsMarkdown(active) }
      // Sprint Cuaderno N13 · Cmd+\ toggle focus mode (oculta rail + outline + backlinks)
      if (mod && e.key === '\\') { e.preventDefault(); setFocusMode((f) => !f) }
      // Sprint Cuaderno N13 · Alt+← retrocede en history nav · Alt+→ avanza
      if (e.altKey && e.key === 'ArrowLeft')  { e.preventDefault(); navBack() }
      if (e.altKey && e.key === 'ArrowRight') { e.preventDefault(); navForward() }
      if (e.key === 'Escape') {
        if (aiOpen) setAiOpen(false)
        else if (switcher) setSwitcher(false)
        else if (tplOpen) setTplOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openTemplateMenu, handleOpenToday, switcher, tplOpen, aiOpen, active?.id, navBack, navForward, view, setView])

  // ── Filtrado / Agrupado ───────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    // Sprint Cuaderno N13 · archive · sub-vista "Archivadas" muestra solo las
    // archived=true · vista normal las OCULTA. Toggle controlado por showArchived.
    const base = showArchived
      ? notes.filter(n => !!n.archived)
      : notes.filter(n => !n.archived)
    if (!q) return base
    return base.filter(n =>
      n.title.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q) ||
      n.tags.some(t => t.includes(q))
    )
  }, [notes, query, showArchived])

  const grouped = useMemo(() => {
    const pinned = filtered.filter(n => n.pinned)
    const folders = new Map<string, CuadernoNote[]>()
    for (const n of filtered) {
      if (!folders.has(n.folder)) folders.set(n.folder, [])
      folders.get(n.folder)!.push(n)
    }
    const folderArr = Array.from(folders.entries()).sort((a, b) => {
      if (a[0] === 'Inicio') return -1
      if (b[0] === 'Inicio') return 1
      if (a[0] === 'Bitácora') return 1
      if (b[0] === 'Bitácora') return -1
      return a[0].localeCompare(b[0])
    })
    // Notas dentro de cada folder: pinned primero, luego por updatedAt desc
    for (const [, list] of folderArr) {
      list.sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt)
    }
    return { pinned, folderArr }
  }, [filtered])

  // ── Wikilinks click + Tasks click ─────────────────────────────────────────
  useEffect(() => {
    function onClick(e: MouseEvent) {
      const t = e.target as HTMLElement
      if (t.classList.contains('cuad-wikilink')) {
        e.preventDefault()
        const slug = t.getAttribute('data-slug')
        if (slug) handleSelectSlug(slug)
      }
      if (t.classList.contains('cuad-task-checkbox') && active) {
        e.preventDefault()
        const line = Number(t.getAttribute('data-line'))
        if (!Number.isNaN(line)) {
          toggleTask(active.id, line)
          refresh()
        }
      }
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [handleSelectSlug, active])

  const back     = useMemo(() => active ? backlinks(active.slug) : [], [active, notes])
  // Sprint Cuaderno N13 · backlinks con contexto · 1 línea snippet por nota
  const backCtx  = useMemo<BacklinkWithContext[]>(
    () => active ? backlinksWithContext(active.slug) : [],
    [active, notes],
  )
  // Sprint Cuaderno N5 · grafo híbrido con entidades del registry como nodos
  const graphData = useMemo(() => buildHybridGraph(), [notes])
  const fm        = useMemo(() => active ? parseFrontmatter(active.content) : null, [active])
  const outline   = useMemo(() => active ? outlineOf(fm?.body ?? active.content) : [], [active, fm])

  // ── Tasks data ───────────────────────────────────────────────────────────
  const tasks       = useMemo(() => allTasks(), [notes])
  const taskSummary = useMemo(() => summarizeTasks(tasks), [tasks])

  // ── Tags data ────────────────────────────────────────────────────────────
  const tags = useMemo(() => allTags(), [notes])
  // Sprint Cuaderno N3 · lista plana de tags para autocomplete inline (#) del editor
  const tagList = useMemo(() => tags.map((t) => t.tag), [tags])

  // ── Render ────────────────────────────────────────────────────────────────
  // Sprint Cuaderno N13 · focus mode oculta toda la chrome (rail + sidebar + outline + backlinks)
  const hasSidebar = !focusMode && (view === 'notes' || view === 'today' || view === 'graph')
  return (
    <div className={`${styles.shell} ${!hasSidebar ? styles.shellNoSidebar : ''}`}>
      {/* ── Rail izquierdo: vistas · oculto en focus mode (Cmd+\) ─────── */}
      {!focusMode && (
      <nav className={styles.viewRail}>
        <RailBtn label="Hoy"        glyph="◷"  v="today"     view={view} set={setView} subtitle="Cmd+D" onClick={handleOpenToday} />
        <RailBtn label="Notas"      glyph=""  v="notes"     view={view} set={setView} subtitle={`${notes.length}`} />
        <RailBtn label="Tareas"     glyph="✓"  v="tasks"     view={view} set={setView} subtitle={`${taskSummary.pending}`} badge={taskSummary.overdue} />
        <RailBtn label="Calendario" glyph="▣"  v="calendar"  view={view} set={setView} subtitle="Cmd+1" />
        <RailBtn label="Tags"       glyph="#"  v="tags"      view={view} set={setView} subtitle={`${tags.length}`} />
        <RailBtn label="Grafo"      glyph=""  v="graph"     view={view} set={setView} subtitle="Cmd+G" />
        <RailBtn label="Insights"   glyph="◐"  v="insights"  view={view} set={setView} subtitle="meta" />
        <RailBtn label="Plantillas" glyph="✎"  v="templates" view={view} set={setView} subtitle={`${TEMPLATES.length}`} />
        {/* Módulos transversales · compartidos con Estudio, War Room y Toolbox */}
        <RailBtn label="Cama"        glyph="◈" v="cama"        view={view} set={setView} subtitle="argum." />
        <RailBtn label="Preinformes" glyph="▤" v="preinformes" view={view} set={setView} subtitle="drafts" onClick={() => setPreinformeSemilla(null)} />
        <div style={{ flex: 1 }} />
        <button className={styles.railSwitcher} onClick={() => setSwitcher(true)} title="Cmd+K">
          <span>⌕</span><span>Buscar</span>
        </button>
        {/* Fase 1 · salida común: todos los espacios enlazan al hub */}
        <Link href="/workspaces" className={styles.railSwitcher} title="Mis workspaces" style={{ textDecoration: 'none' }}>
          <span>⊞</span><span>Workspaces</span>
        </Link>
      </nav>
      )}

      {/* ── Sidebar de listado (cuando aplica) ────────────────────────── */}
      {(view === 'notes' || view === 'today' || view === 'graph') && (
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHead}>
            <h2 className={styles.title}>
              <span style={{ color: 'var(--accent,#1F4E8C)' }}>⬡</span>
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
            {/* Sprint Cuaderno N13 · toggle sub-vista archivadas · útil para limpiar inbox */}
            <button
              onClick={() => setShowArchived((v) => !v)}
              style={{
                marginTop: 4, padding: '4px 8px', fontSize: 11, borderRadius: 6,
                border: '1px solid #e5e7eb',
                background: showArchived ? 'rgba(245,158,11,0.10)' : '#fff',
                color: showArchived ? '#92400E' : '#64748b',
                fontWeight: 600, cursor: 'pointer', textAlign: 'left',
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              <span style={{ fontSize: 10 }}>{showArchived ? '⊟' : '⊞'}</span>
              {showArchived ? 'Ver activas' : 'Ver archivadas'}
              <span style={{ marginLeft: 'auto', fontSize: 10, color: '#9ca3af' }}>
                {showArchived
                  ? notes.filter((n) => !!n.archived).length
                  : notes.filter((n) => !n.archived).length}
              </span>
            </button>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className={styles.newBtn} onClick={openTemplateMenu} title="Cmd+N">
                <span>+</span> Nueva nota
              </button>
              <button className={styles.iconBtn} onClick={handleNewBlank} title="Nota en blanco">
                ⊕
              </button>
            </div>
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
                <div className={styles.folderHead}>{folder} <span className={styles.folderCount}>{list.length}</span></div>
                {list.map(n => (
                  <NoteListItem key={n.id} note={n} active={n.id === activeId} onClick={() => { setActiveId(n.id); setView('notes') }} />
                ))}
              </div>
            ))}

            {notes.length === 0 && (
              <div style={{ padding: 16, fontSize: 12, color: 'var(--ink-4,#6e6e73)' }}>
                Tu cuaderno está vacío. Pulsa "+ Nueva nota" para empezar.
              </div>
            )}
          </div>
        </aside>
      )}

      {/* ── Área principal ────────────────────────────────────────────── */}
      {view === 'graph' && (
        <div className={styles.graphWrap}>
          <HybridGraphView
            data={graphData}
            onSelectNote={handleSelectSlug}
            onSelectEntity={(_slug, link) => router.push(link)}
            activeNoteSlug={active?.slug}
          />
          {/* Sprint Cuaderno N5 · legend de carpetas (HybridGraphView ya muestra el panel de filtros por kind) */}
          <div className={styles.graphLegend}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Notas · color por carpeta</div>
            <div className={styles.row}><span className={styles.swatch} style={{ background: '#1F4E8C' }} /> Inicio</div>
            <div className={styles.row}><span className={styles.swatch} style={{ background: '#7C3AED' }} /> Investigación</div>
            <div className={styles.row}><span className={styles.swatch} style={{ background: '#2d8a39' }} /> Bitácora</div>
            <div className={styles.row}><span className={styles.swatch} style={{ background: '#525258' }} /> Notas</div>
            <div style={{ marginTop: 6, fontSize: 10, color: '#9ca3af' }}>
              Entidades del Cuaderno aparecen con su glyph y color (◆◯⊕…). Click entidad → abre su panel en el dashboard.
            </div>
          </div>
          <div className={styles.graphHelp}>Click nodo · arrastra para mover · Cmd+G volver</div>
        </div>
      )}

      {view === 'tasks' && <TasksView tasks={tasks} summary={taskSummary} onOpen={id => { setActiveId(id); setView('notes') }} onToggle={(id,line) => { toggleTask(id,line); refresh() }} />}

      {/* Sprint Cuaderno N11 · insights meta · top entidades, tags, huérfanas, lagunas, heatmap */}
      {view === 'insights' && <CuadernoInsights onOpenNote={(id) => { setActiveId(id); setView('notes') }} />}
      {view === 'calendar' && <CalendarView onOpen={id => { setActiveId(id); setView('notes') }} onCreateDaily={handleOpenToday} />}
      {view === 'tags' && <TagsView tags={tags} onOpen={id => { setActiveId(id); setView('notes') }} />}
      {view === 'templates' && <TemplatesView onPick={handleNewFromTemplate} />}

      {/* Módulos transversales · mismo repositorio que Estudio/War Room/Toolbox */}
      {view === 'cama' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: 20, background: '#fbfbfd' }}>
          <CamaModule espacio="cuaderno" embebido />
        </div>
      )}
      {view === 'preinformes' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: 20, background: '#fbfbfd' }}>
          <PreinformesModule
            key={preinformeSemilla ? `semilla-${preinformeSemilla.titulo}` : 'sin-semilla'}
            espacio="cuaderno"
            embebido
            semilla={preinformeSemilla}
          />
        </div>
      )}

      {(view === 'notes' || view === 'today') && (
        active ? (
          <div className={styles.editor}>
            <div className={styles.editorBar}>
              {/* Sprint Cuaderno N13 · onChange edita en memoria local · al Blur dispara
                  renameNote que reescribe backlinks en cascada · evita reescritura por keystroke. */}
              <input
                className={styles.titleInput}
                value={active.title}
                onChange={e => handleEdit({ title: e.target.value })}
                onBlur={e => handleRename(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleRename(e.currentTarget.value)
                    e.currentTarget.blur()
                  }
                }}
                placeholder="Título de la nota"
              />
              <div className={styles.modeSwitch}>
                <button className={`${styles.modeBtn} ${mode === 'edit' ? styles.active : ''}`} onClick={() => setMode('edit')}>Editar</button>
                <button className={`${styles.modeBtn} ${mode === 'split' ? styles.active : ''}`} onClick={() => setMode('split')}>Split</button>
                <button className={`${styles.modeBtn} ${mode === 'read' ? styles.active : ''}`} onClick={() => setMode('read')}>Leer</button>
              </div>
              <button className={styles.toolbarBtn} onClick={() => setOutlineOpen(o => !o)} title="Mostrar/ocultar índice">
                {outlineOpen ? '▣ Índice' : '□ Índice'}
              </button>
              {/* Sprint Cuaderno N1 · pickers de entidad y dato */}
              <button
                className={styles.toolbarBtn}
                onClick={() => setPickerMode('entity')}
                title={`Insertar entidad (${totalEntities()} disponibles)`}
              >
                ◉ Entidad
              </button>
              <button
                className={styles.toolbarBtn}
                onClick={() => setPickerMode('data')}
                title={`Insertar dato (${DATA_REGISTRY.length} disponibles)`}
              >
                ⌖ Dato
              </button>
              {/* Sprint Cuaderno N7 · asistente IA · resume, sugiere, critica sobre la nota */}
              <button
                className={styles.toolbarBtn}
                onClick={() => setAiOpen(true)}
                title="Asistente IA sobre esta nota · Cmd+J (contexto + entidades + backlinks)"
                style={{ background: 'rgba(31,78,140,0.10)', color: '#1F4E8C', fontWeight: 600 }}
              >
                {/* Sprint Quality-4 · sin emojis · "◈" (U+25C8) glifo geométrico Unicode permitido */}
                ◈ IA
              </button>
              {/* Sprint Cuaderno N10 · export markdown · descarga .md con frontmatter */}
              <button
                className={styles.toolbarBtn}
                onClick={() => downloadNoteAsMarkdown(active)}
                title="Descargar la nota como Markdown · Cmd+E"
              >
                ↓ Export
              </button>
              {/* Cama/Preinformes · convierte la nota en borrador de informe
                  (abre el asistente de Preinformes precargado con su contenido) */}
              <button
                className={styles.toolbarBtn}
                onClick={() => {
                  setPreinformeSemilla({ titulo: active.title, contenido: active.content })
                  setView('preinformes')
                }}
                title="Convertir esta nota en un preinforme (asistente con plantillas)"
              >
                ▤ Preinforme
              </button>
              {/* Sprint Cuaderno N13 · focus mode (Cmd+\) · oculta rail + sidebar + outline + backlinks */}
              <button
                className={styles.toolbarBtn}
                onClick={() => setFocusMode((f) => !f)}
                title={focusMode ? 'Salir de modo foco (Cmd+\\)' : 'Modo foco · sólo editor (Cmd+\\)'}
                style={focusMode ? { background: 'rgba(124,58,237,0.10)', color: '#7C3AED', fontWeight: 600 } : undefined}
              >
                {focusMode ? '✦ Foco' : '◐ Foco'}
              </button>
              {/* Sprint Cuaderno N13 · archive · soft-delete que se restaura desde la sub-vista */}
              <button
                className={styles.toolbarBtn}
                onClick={handleArchive}
                title={active.archived ? 'Restaurar nota desde archivadas' : 'Archivar nota (soft-delete · se conserva)'}
                style={active.archived ? { background: 'rgba(245,158,11,0.10)', color: '#92400E', fontWeight: 600 } : undefined}
              >
                {active.archived ? '↗ Restaurar' : '⊞ Archivar'}
              </button>
              {/* Sprint Cuaderno N8 · sincronización cloud · Vercel Blob · status indicator */}
              <button
                className={styles.toolbarBtn}
                onClick={() => setSyncOpen(true)}
                title={
                  autoSyncStatus === 'syncing' ? 'Auto-sync en curso…' :
                  autoSyncStatus === 'ok' ? 'Auto-sync completado' :
                  autoSyncStatus === 'error' ? 'Auto-sync falló · click para detalles' :
                  'Sincronizar notas con el cloud (Vercel Blob)'
                }
                style={{
                  background:
                    autoSyncStatus === 'syncing' ? 'rgba(31,78,140,0.10)' :
                    autoSyncStatus === 'ok' ? 'rgba(34,197,94,0.15)' :
                    autoSyncStatus === 'error' ? 'rgba(220,38,38,0.15)' :
                    undefined,
                  color:
                    autoSyncStatus === 'syncing' ? '#1F4E8C' :
                    autoSyncStatus === 'ok' ? '#16a34a' :
                    autoSyncStatus === 'error' ? '#dc2626' :
                    undefined,
                  fontWeight: autoSyncStatus !== 'idle' ? 700 : undefined,
                }}
              >
                {autoSyncStatus === 'syncing' ? '↻ Sync…' :
                 autoSyncStatus === 'ok' ? '✓ Sync' :
                 autoSyncStatus === 'error' ? '✗ Sync' :
                 '↑↓ Sync'}
              </button>
              <button className={styles.toolbarBtn} onClick={handlePin}>
                {active.pinned ? 'Fijada' : '☆ Fijar'}
              </button>
              <button className={`${styles.toolbarBtn} ${styles.danger}`} onClick={handleDelete}>Borrar</button>
            </div>

            <div className={styles.meta}>
              <span className={styles.pill}>⊟ {active.folder}</span>
              <span className={styles.pill}>↻ {new Date(active.updatedAt).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              {/* Sprint Cuaderno N13 · save indicator visible · feedback de persistencia */}
              {saveStatus === 'saving' && (
                <span className={styles.pill} style={{ background: 'rgba(31,78,140,0.10)', color: '#1F4E8C', fontWeight: 600 }}>
                  ↻ Guardando…
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className={styles.pill} style={{ background: 'rgba(34,197,94,0.10)', color: '#16a34a', fontWeight: 600 }}>
                  ✓ Guardado
                </span>
              )}
              {/* Sprint Cuaderno N13 · pill ARCHIVADA cuando la nota lo está */}
              {active.archived && (
                <span className={styles.pill} style={{ background: 'rgba(245,158,11,0.15)', color: '#92400E', fontWeight: 700 }}>
                  ⊞ ARCHIVADA
                </span>
              )}
              {fm?.frontmatter.tipo && (
                <span className={styles.pill} style={{ background: 'rgba(124,58,237,0.10)', color: '#7C3AED' }}>
                  tipo: {String(fm.frontmatter.tipo)}
                </span>
              )}
              {fm?.frontmatter.estado && (
                <span className={styles.pill} style={{ background: 'rgba(217,119,6,0.10)', color: '#B45309' }}>
                  {String(fm.frontmatter.estado)}
                </span>
              )}
              {active.tags.length > 0 && (
                <span className={styles.pill}>{active.tags.slice(0, 4).join(' ')}</span>
              )}
              {active.links.length > 0 && (
                <span className={styles.pill}>⇢ {active.links.length} enlaces</span>
              )}
              {isDailyNote(active) && (
                <span className={styles.pill} style={{ background: 'rgba(31,78,140,0.10)', color: '#1F4E8C' }}>DIARIO</span>
              )}
              {active.source === 'auto' && (
                <span className={styles.pill} style={{ background: 'rgba(45,138,57,0.10)', color: '#2d8a39' }}>AUTO</span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: `${mode === 'split' ? '1fr 1fr' : '1fr'} ${outlineOpen ? '220px' : '0px'}`, flex: 1, overflow: 'hidden' }}>
              {(mode === 'edit' || mode === 'split') && (
                <div className={styles.editArea} style={{ padding: 0, overflow: 'hidden' }}>
                  <MarkdownEditor
                    ref={editorRef}
                    value={active.content}
                    onChange={(v) => handleEdit({ content: v })}
                    tagList={tagList}
                    placeholder="Escribe en Markdown. Usa [[wikilinks]], #tags, - [ ] tareas y --- frontmatter."
                  />
                </div>
              )}
              {(mode === 'read' || mode === 'split') && (
                <div
                  ref={previewRef}
                  className={styles.preview}
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(fm?.body ?? active.content) }}
                />
              )}
              {outlineOpen && (
                <div className={styles.outline}>
                  <div className={styles.outlineHead}>Índice</div>
                  {outline.length === 0 ? (
                    <div className={styles.outlineEmpty}>Sin encabezados</div>
                  ) : outline.map((o, i) => (
                    <div key={i} className={styles.outlineItem} style={{ paddingLeft: 8 + (o.level - 1) * 10 }}>
                      {o.text}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sprint Cuaderno N13 · backlinks ahora con SNIPPET de contexto · 1 línea ~140 chars
                                       donde la otra nota cita esta. focus mode lo oculta. */}
            {!focusMode && back.length > 0 && (
              <div className={styles.backlinksBox}>
                <h3 className={styles.backlinksTitle}>← {back.length} nota{back.length === 1 ? '' : 's'} apunta{back.length === 1 ? '' : 'n'} aquí</h3>
                <div className={styles.backlinkRow}>
                  {backCtx.map(b => (
                    <div key={b.note.id} className={styles.backlinkItem} onClick={() => setActiveId(b.note.id)}>
                      <strong>{b.note.title}</strong>
                      <span style={{ color: 'var(--ink-4,#9ca3af)', marginLeft: 8, fontSize: 11.5 }}>{b.note.folder}</span>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, fontStyle: b.context.startsWith('(') ? 'italic' : 'normal' }}>
                        {b.context}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sprint Cuaderno N2 · Panel de entidades + cross-references */}
            <div style={{ marginTop: 12 }}>
              <EntitiesPanel
                content={active.content}
                activeNoteId={active.id}
                onOpenNote={setActiveId}
              />
            </div>
          </div>
        ) : (
          <div className={styles.empty}>
            <h2>Tu Cuaderno está vacío</h2>
            <p>
              Crea tu primera nota para empezar a construir tu segundo cerebro. Todo se
              guarda <strong>en tu navegador</strong> — tus notas nunca salen de tu equipo.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button className={styles.newBtn} style={{ width: 'auto', padding: '10px 20px' }} onClick={openTemplateMenu}>
                + Nueva nota con plantilla
              </button>
              <button className={styles.iconBtn} style={{ width: 'auto', padding: '10px 16px' }} onClick={handleNewBlank}>
                Nota en blanco
              </button>
            </div>
          </div>
        )
      )}

      {/* ── Modal: selector de plantilla ──────────────────────────────── */}
      {tplOpen && (
        <div className={styles.modalBack} onClick={() => setTplOpen(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <strong>Nueva nota — elige plantilla</strong>
              <button className={styles.iconBtn} onClick={() => setTplOpen(false)}>×</button>
            </div>
            <div className={styles.tplGrid}>
              <button className={styles.tplCard} onClick={handleNewBlank}>
                <span className={styles.tplGlyph} style={{ color: '#525258' }}>+</span>
                <strong>En blanco</strong>
                <span>Empieza de cero, sin estructura.</span>
              </button>
              {TEMPLATES.map(t => (
                <button key={t.id} className={styles.tplCard} onClick={() => handleNewFromTemplate(t.id)}>
                  <span className={styles.tplGlyph} style={{ color: '#1F4E8C' }}>{t.glyph}</span>
                  <strong>{t.name}</strong>
                  <span>{t.description}</span>
                  <span className={styles.tplFolder}>→ {t.folder}/</span>
                </button>
              ))}
            </div>
            <div className={styles.modalFoot}>
              <span>El método del analista es la suma de sus plantillas.</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Sprint Cuaderno N9 · OmniSearch (Cmd+K / Cmd+O) ──────────── */}
      {/* Búsqueda unificada cruzada · notas + entidades del registry + datos */}
      {switcher && (
        <CuadernoOmniSearch
          notes={notes}
          onSelectNote={(id) => {
            setActiveId(id)
            setSwitcher(false)
            setView('notes')
          }}
          onCreateNew={(title) => {
            const n = createNote({ title, folder: 'Notas', content: `# ${title}\n\n` })
            refresh()
            setActiveId(n.id)
            setSwitcher(false)
            setView('notes')
          }}
          onInsertEmbed={(text) => {
            // Inserta en cursor del editor activo (Sprint N3 API imperativa)
            if (editorRef.current) editorRef.current.insertAtCursor(text)
            setSwitcher(false)
          }}
          onClose={() => setSwitcher(false)}
        />
      )}

      {/* Sprint Cuaderno N7 · asistente IA contextual sobre la nota activa */}
      {aiOpen && active && (
        <CuadernoAIPanel
          note={active}
          backlinks={back.map((b) => ({ id: b.id, title: b.title }))}
          editorRef={editorRef}
          onClose={() => setAiOpen(false)}
        />
      )}

      {/* Sprint Cuaderno N8 · sincronización cloud */}
      {syncOpen && (
        <CuadernoSyncPanel onClose={() => { setSyncOpen(false); refresh() }} />
      )}

      {/* Sprint Cuaderno N1+N3 · picker para insertar entidades o data embeds */}
      {pickerMode && (
        <CuadernoPicker
          mode={pickerMode}
          onClose={() => setPickerMode(null)}
          onPick={(insert) => {
            // Sprint N3 · inserta en posición del cursor (no al final)
            // Si el editor está montado, usa la API imperativa de CodeMirror.
            // Fallback: append al final si por algún motivo no hay editor (modo read).
            if (editorRef.current) {
              editorRef.current.insertAtCursor(insert)
            } else if (active) {
              handleEdit({ content: active.content + insert })
            }
            setPickerMode(null)
          }}
        />
      )}
    </div>
  )
}

// ── Sprint Cuaderno N10 · Export ────────────────────────────────────────────

/**
 * Descarga la nota activa como archivo .md en el dispositivo del usuario.
 * Formato: frontmatter YAML con metadata + cuerpo markdown.
 */
function downloadNoteAsMarkdown(note: CuadernoNote) {
  const fm = [
    '---',
    `title: ${JSON.stringify(note.title)}`,
    `folder: ${note.folder}`,
    `created: ${new Date(note.createdAt).toISOString()}`,
    `updated: ${new Date(note.updatedAt).toISOString()}`,
    note.tags.length > 0 ? `tags: [${note.tags.map((t) => JSON.stringify(t)).join(', ')}]` : '',
    note.pinned ? 'pinned: true' : '',
    `source: ${note.source}`,
    '---',
    '',
  ].filter(Boolean).join('\n')
  // Si la nota ya empieza con frontmatter, no la duplicamos
  const body = note.content.startsWith('---\n') ? note.content : fm + note.content
  const blob = new Blob([body], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${note.slug || 'nota'}.md`
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 100)
}

// ── Subcomponentes ────────────────────────────────────────────────────────

function RailBtn({ label, glyph, v, view, set, subtitle, badge, onClick }: {
  label: string; glyph: string; v: View; view: View;
  set: (v: View) => void; subtitle?: string; badge?: number; onClick?: () => void
}) {
  return (
    <button
      className={`${styles.railBtn} ${view === v ? styles.railActive : ''}`}
      onClick={() => { onClick?.(); set(v) }}
    >
      <span className={styles.railGlyph}>{glyph}</span>
      <span className={styles.railLabel}>{label}</span>
      {subtitle && <span className={styles.railSub}>{subtitle}</span>}
      {!!badge && badge > 0 && <span className={styles.railBadge}>{badge}</span>}
    </button>
  )
}

function NoteListItem({ note, active, onClick }: { note: CuadernoNote; active: boolean; onClick: () => void }) {
  const preview = note.content.replace(/^---[\s\S]*?---\n/, '').replace(/^#+\s*.*\n?/, '').replace(/[\[\]#`*>]/g, '').trim().slice(0, 64)
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

// ── Vista TAREAS ───────────────────────────────────────────────────────────

function TasksView({ tasks, summary, onOpen, onToggle }: {
  tasks: ReturnType<typeof allTasks>
  summary: ReturnType<typeof summarizeTasks>
  onOpen: (noteId: string) => void
  onToggle: (noteId: string, line: number) => void
}) {
  const [filter, setFilter] = useState<'pendientes' | 'todas' | 'vencidas' | 'hoy' | 'hechas'>('pendientes')
  const today = new Date().toISOString().slice(0, 10)

  const visible = useMemo(() => {
    let list = tasks
    if (filter === 'pendientes') list = list.filter(t => !t.done)
    if (filter === 'vencidas')   list = list.filter(t => !t.done && t.dueDate && t.dueDate < today)
    if (filter === 'hoy')        list = list.filter(t => !t.done && t.dueDate === today)
    if (filter === 'hechas')     list = list.filter(t => t.done)
    // Sort: vencidas primero, luego por fecha, luego por prioridad
    const prio: Record<string, number> = { critico: 0, alto: 1, medio: 2, bajo: 3, sin: 4 }
    return [...list].sort((a, b) => {
      const aOver = !a.done && a.dueDate && a.dueDate < today ? 1 : 0
      const bOver = !b.done && b.dueDate && b.dueDate < today ? 1 : 0
      if (aOver !== bOver) return bOver - aOver
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate)
      if (a.dueDate) return -1
      if (b.dueDate) return 1
      return prio[a.priority ?? 'sin'] - prio[b.priority ?? 'sin']
    })
  }, [tasks, filter, today])

  return (
    <div className={styles.workArea}>
      <header className={styles.workHead}>
        <h2>Tareas</h2>
        <div className={styles.kpiRow}>
          <Kpi label="Pendientes"  value={summary.pending}  accent="#1F4E8C" />
          <Kpi label="Vencidas"    value={summary.overdue}  accent="#DC2626" />
          <Kpi label="Hoy"         value={summary.dueToday} accent="#D97706" />
          <Kpi label="Críticas"    value={summary.byPriority.critico} accent="#7C3AED" />
          <Kpi label="Completadas" value={summary.done}     accent="#2d8a39" />
        </div>
        <div className={styles.filterChips}>
          {(['pendientes','vencidas','hoy','hechas','todas'] as const).map(f => (
            <button
              key={f}
              className={`${styles.chip} ${filter === f ? styles.chipActive : ''}`}
              onClick={() => setFilter(f)}
            >{f}</button>
          ))}
        </div>
      </header>
      <div className={styles.workBody}>
        {visible.length === 0 && (
          <div className={styles.empty}>
            <h2>Sin tareas en este filtro</h2>
            <p>Crea tareas con <code>- [ ] descripción</code> dentro de cualquier nota.<br/>Añade responsable con <code>**[Nombre]**</code> y fecha con <code>`YYYY-MM-DD`</code>.</p>
          </div>
        )}
        {visible.map((t, i) => {
          const overdue = !t.done && t.dueDate && t.dueDate < today
          const dueToday = t.dueDate === today
          return (
            <div key={`${t.noteId}-${t.lineIdx}-${i}`} className={styles.taskRow}>
              <input
                type="checkbox"
                checked={t.done}
                onChange={() => onToggle(t.noteId, t.lineIdx)}
                className={styles.taskCheck}
              />
              <div className={styles.taskMain}>
                <div className={`${styles.taskText} ${t.done ? styles.taskDone : ''}`}>
                  {t.text.replace(/\*\*\[[^\]]+\]\*\*/g, '').replace(/`\d{4}-\d{2}-\d{2}`/g, '').replace(/!critico|!alto|!medio|!bajo/gi, '').trim()}
                </div>
                <div className={styles.taskMeta}>
                  {t.responsible && <span className={styles.taskPill}>{t.responsible}</span>}
                  {t.dueDate && (
                    <span className={styles.taskPill} style={{
                      background: overdue ? 'rgba(220,38,38,0.12)' : dueToday ? 'rgba(217,119,6,0.12)' : undefined,
                      color: overdue ? '#DC2626' : dueToday ? '#D97706' : undefined,
                    }}>
                      {overdue ? 'vencida · ' : dueToday ? 'hoy · ' : ''}{t.dueDate}
                    </span>
                  )}
                  {t.priority && (
                    <span className={styles.taskPill} style={{
                      background: t.priority === 'critico' ? 'rgba(124,58,237,0.12)' : 'rgba(31,78,140,0.10)',
                      color: t.priority === 'critico' ? '#7C3AED' : '#1F4E8C',
                    }}>!{t.priority}</span>
                  )}
                  <button className={styles.taskLink} onClick={() => onOpen(t.noteId)}>
                    en {t.noteTitle}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Vista CALENDARIO ───────────────────────────────────────────────────────

function CalendarView({ onOpen, onCreateDaily }: { onOpen: (id: string) => void; onCreateDaily: () => void }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const dailies = useMemo(() => dailyMap(), [])

  const monthDays = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
    const last  = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)
    const startDow = (first.getDay() + 6) % 7  // lunes=0
    const cells: Array<{ date: string; day: number; inMonth: boolean; activity: ReturnType<typeof activityFor> } | null> = []
    // Días del mes anterior para rellenar
    for (let i = 0; i < startDow; i++) cells.push(null)
    for (let d = 1; d <= last.getDate(); d++) {
      const date = new Date(cursor.getFullYear(), cursor.getMonth(), d).toISOString().slice(0,10)
      cells.push({ date, day: d, inMonth: true, activity: activityFor(date) })
    }
    return cells
  }, [cursor])

  const today = new Date().toISOString().slice(0,10)
  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

  return (
    <div className={styles.workArea}>
      <header className={styles.workHead}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className={styles.iconBtn} onClick={() => setCursor(c => new Date(c.getFullYear(), c.getMonth() - 1, 1))}>‹</button>
          <h2 style={{ margin: 0 }}>{months[cursor.getMonth()]} {cursor.getFullYear()}</h2>
          <button className={styles.iconBtn} onClick={() => setCursor(c => new Date(c.getFullYear(), c.getMonth() + 1, 1))}>›</button>
          <button className={styles.chip} onClick={() => setCursor(new Date(new Date().getFullYear(), new Date().getMonth(), 1))}>Hoy</button>
          <div style={{ flex: 1 }} />
          <button className={styles.newBtn} style={{ width: 'auto', padding: '8px 14px' }} onClick={onCreateDaily}>
            + Diario de hoy
          </button>
        </div>
      </header>
      <div className={styles.workBody}>
        <div className={styles.calGrid}>
          {['L','M','X','J','V','S','D'].map(d => (
            <div key={d} className={styles.calHead}>{d}</div>
          ))}
          {monthDays.map((cell, i) => {
            if (!cell) return <div key={i} className={`${styles.calCell} ${styles.calBlank}`} />
            const { activity } = cell
            const isToday = cell.date === today
            const hasDaily = !!activity.daily
            const total = activity.created.length + (activity.daily ? 0 : 0)
            return (
              <div
                key={i}
                className={`${styles.calCell} ${isToday ? styles.calToday : ''} ${hasDaily ? styles.calHasDaily : ''}`}
                onClick={() => activity.daily ? onOpen(activity.daily.id) : null}
                title={activity.daily ? 'Abrir diario' : 'Sin diario'}
              >
                <div className={styles.calDay}>{cell.day}</div>
                {hasDaily && <div className={styles.calBar} style={{ background: '#1F4E8C' }} />}
                {total > 0 && <div className={styles.calCount}>{total} nota{total === 1 ? '' : 's'}</div>}
                {activity.tasks.length > 0 && <div className={styles.calCount} style={{ color: '#D97706' }}>{activity.tasks.length} tarea{activity.tasks.length === 1 ? '' : 's'}</div>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Vista TAGS ─────────────────────────────────────────────────────────────

function TagsView({ tags, onOpen }: { tags: ReturnType<typeof allTags>; onOpen: (id: string) => void }) {
  const [picked, setPicked] = useState<string | null>(null)
  const sel = tags.find(t => t.tag === picked)
  return (
    <div className={styles.workArea}>
      <header className={styles.workHead}>
        <h2>Tags · {tags.length}</h2>
        <p className={styles.workSub}>Clasificación transversal. Cada nota puede tener tantos tags como quieras.</p>
      </header>
      <div className={styles.workBody} style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 18, padding: 18 }}>
        <div className={styles.tagList}>
          {tags.length === 0 && (
            <div className={styles.empty} style={{ padding: 18 }}>
              <p>Aún no hay tags. Añade <code>#etiqueta</code> en cualquier nota.</p>
            </div>
          )}
          {tags.map(t => (
            <button
              key={t.tag}
              className={`${styles.tagItem} ${picked === t.tag ? styles.tagActive : ''}`}
              onClick={() => setPicked(t.tag)}
            >
              <span>{t.tag}</span>
              <span className={styles.tagCount}>{t.count}</span>
            </button>
          ))}
        </div>
        <div>
          {sel ? (
            <div>
              <h3 style={{ marginTop: 0 }}>{sel.tag} <span style={{ fontWeight: 400, color: '#6e6e73', fontSize: 13 }}>· {sel.count} notas</span></h3>
              {sel.notes.map(n => (
                <div key={n.id} className={styles.tagNote} onClick={() => onOpen(n.id)}>
                  <strong>{n.title}</strong>
                  <span style={{ color: '#6e6e73', fontSize: 12 }}>{n.folder}</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#6e6e73' }}>Selecciona un tag a la izquierda para ver las notas.</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Vista PLANTILLAS ───────────────────────────────────────────────────────

function TemplatesView({ onPick }: { onPick: (id: string) => void }) {
  return (
    <div className={styles.workArea}>
      <header className={styles.workHead}>
        <h2>Plantillas — el método del analista</h2>
        <p className={styles.workSub}>
          Toda investigación seria tiene estructura. Estandariza la tuya: cada análisis se enuncia con
          pregunta, hipótesis, evidencia y conclusión con confianza. Cada actor tiene posición, intereses,
          red y leverage. Cada decisión deja rastro reversible.
        </p>
      </header>
      <div className={styles.workBody}>
        <div className={styles.tplGrid} style={{ padding: 18 }}>
          {TEMPLATES.map(t => (
            <button key={t.id} className={styles.tplCard} onClick={() => onPick(t.id)}>
              <span className={styles.tplGlyph} style={{ color: '#1F4E8C' }}>{t.glyph}</span>
              <strong>{t.name}</strong>
              <span>{t.description}</span>
              <span className={styles.tplFolder}>→ {t.folder}/</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function Kpi({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className={styles.kpi} style={{ borderLeftColor: accent }}>
      <span className={styles.kpiLabel}>{label}</span>
      <span className={styles.kpiValue}>{value}</span>
    </div>
  )
}

// ── Quick Switcher ─────────────────────────────────────────────────────────

function QuickSwitcher({ notes, onSelect, onClose, onCreateNew }: {
  notes: CuadernoNote[]
  onSelect: (id: string) => void
  onClose: () => void
  onCreateNew: (title: string) => void
}) {
  const [q, setQ] = useState('')
  const [idx, setIdx] = useState(0)
  const results = useMemo(() => {
    if (!q.trim()) return notes.slice(0, 12)
    const lo = q.toLowerCase()
    return notes
      .filter(n => n.title.toLowerCase().includes(lo) || n.content.toLowerCase().includes(lo) || n.tags.some(t => t.includes(lo)))
      .slice(0, 12)
  }, [q, notes])

  useEffect(() => { setIdx(0) }, [q])

  return (
    <div className={styles.modalBack} onClick={onClose}>
      <div className={styles.switcher} onClick={e => e.stopPropagation()}>
        <input
          autoFocus
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setIdx(i => Math.min(i + 1, results.length)) }
            if (e.key === 'ArrowUp')   { e.preventDefault(); setIdx(i => Math.max(i - 1, 0)) }
            if (e.key === 'Enter') {
              e.preventDefault()
              if (idx < results.length) onSelect(results[idx].id)
              else if (q.trim()) onCreateNew(q.trim())
            }
          }}
          placeholder="Buscar nota o escribir nombre para crear…"
          className={styles.switcherInput}
        />
        <div className={styles.switcherList}>
          {results.map((n, i) => (
            <div
              key={n.id}
              className={`${styles.switcherItem} ${i === idx ? styles.switcherActive : ''}`}
              onClick={() => onSelect(n.id)}
            >
              <strong>{n.title}</strong>
              <span>{n.folder}</span>
            </div>
          ))}
          {q.trim() && results.length === 0 && (
            <div
              className={`${styles.switcherItem} ${idx === 0 ? styles.switcherActive : ''}`}
              onClick={() => onCreateNew(q.trim())}
            >
              <strong>+ Crear "{q.trim()}"</strong>
              <span>nueva nota</span>
            </div>
          )}
        </div>
        <div className={styles.switcherFoot}>
          <span>↑↓ navegar · ⏎ abrir · esc cerrar</span>
        </div>
      </div>
    </div>
  )
}
