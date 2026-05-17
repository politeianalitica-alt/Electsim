/**
 * Cuaderno · Queries (Dataview-lite)
 *
 * Permite consultar la bóveda como si fuera una base de datos: extrae tareas,
 * notas por etiqueta, notas por fecha, frontmatter, propiedades. Sin SQL real,
 * pero con la misma filosofía de "tus notas son una base de datos".
 */

import { loadAll, type CuadernoNote } from './store'

// ── Frontmatter (YAML simple) ──────────────────────────────────────────────

export interface Frontmatter {
  [key: string]: string | number | boolean | string[]
}

/** Extrae frontmatter YAML simple (`--- ... ---`). No soporta nested objects. */
export function parseFrontmatter(content: string): { frontmatter: Frontmatter; body: string } {
  const fm: Frontmatter = {}
  const m = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/)
  if (!m) return { frontmatter: fm, body: content }
  const [, head, body] = m
  for (const line of head.split('\n')) {
    const kv = line.match(/^(\w[\w-]*)\s*:\s*(.*)$/)
    if (!kv) continue
    const k = kv[1]
    const raw = kv[2].trim()
    if (raw === 'true')       fm[k] = true
    else if (raw === 'false') fm[k] = false
    else if (raw.startsWith('[') && raw.endsWith(']')) {
      fm[k] = raw.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean)
    }
    else if (/^-?\d+(?:\.\d+)?$/.test(raw)) fm[k] = Number(raw)
    else fm[k] = raw.replace(/^["']|["']$/g, '')
  }
  return { frontmatter: fm, body }
}

// ── Tareas ──────────────────────────────────────────────────────────────────

export interface NoteTask {
  noteId:    string
  noteSlug:  string
  noteTitle: string
  folder:    string
  text:      string
  done:      boolean
  responsible?: string         // si contiene **[Nombre]**
  dueDate?:  string            // si contiene `YYYY-MM-DD`
  priority?: 'critico' | 'alto' | 'medio' | 'bajo'
  lineIdx:   number
}

const TASK_RE = /^(\s*)-\s+\[( |x|X)\]\s+(.+)$/

function extractDueDate(text: string): string | undefined {
  const m = text.match(/`(\d{4}-\d{2}-\d{2})`/)
  return m ? m[1] : undefined
}

function extractResponsible(text: string): string | undefined {
  const m = text.match(/\*\*\[([^\]]+)\]\*\*/)
  return m ? m[1] : undefined
}

function extractPriority(text: string): NoteTask['priority'] {
  const lower = text.toLowerCase()
  if (/!crítico|!critico|#critico|crítico:/i.test(lower)) return 'critico'
  if (/!alto|#alto|alto:/i.test(lower)) return 'alto'
  if (/!medio|#medio/i.test(lower)) return 'medio'
  if (/!bajo|#bajo/i.test(lower)) return 'bajo'
  return undefined
}

/** Extrae todas las tareas de una nota. */
export function extractTasksFromNote(note: CuadernoNote): NoteTask[] {
  const lines = note.content.split('\n')
  const out: NoteTask[] = []
  lines.forEach((line, i) => {
    const m = line.match(TASK_RE)
    if (!m) return
    const [, , mark, text] = m
    out.push({
      noteId:    note.id,
      noteSlug:  note.slug,
      noteTitle: note.title,
      folder:    note.folder,
      text:      text.trim(),
      done:      mark.toLowerCase() === 'x',
      responsible: extractResponsible(text),
      dueDate:     extractDueDate(text),
      priority:    extractPriority(text),
      lineIdx:   i,
    })
  })
  return out
}

/** Todas las tareas de toda la bóveda. */
export function allTasks(): NoteTask[] {
  return loadAll().flatMap(extractTasksFromNote)
}

export interface TaskSummary {
  total:    number
  pending:  number
  done:     number
  overdue:  number
  dueToday: number
  byPriority: { critico: number; alto: number; medio: number; bajo: number; sin: number }
}

export function summarizeTasks(tasks: NoteTask[]): TaskSummary {
  const today = new Date().toISOString().slice(0,10)
  const sum: TaskSummary = {
    total: tasks.length, pending: 0, done: 0, overdue: 0, dueToday: 0,
    byPriority: { critico: 0, alto: 0, medio: 0, bajo: 0, sin: 0 },
  }
  for (const t of tasks) {
    if (t.done) { sum.done++; continue }
    sum.pending++
    if (t.dueDate) {
      if (t.dueDate < today)  sum.overdue++
      if (t.dueDate === today) sum.dueToday++
    }
    sum.byPriority[t.priority ?? 'sin']++
  }
  return sum
}

/** Marca/desmarca tarea (modifica la nota). */
export function toggleTask(noteId: string, lineIdx: number): boolean {
  const notes = loadAll()
  const note = notes.find(n => n.id === noteId)
  if (!note) return false
  const lines = note.content.split('\n')
  if (lineIdx >= lines.length) return false
  const m = lines[lineIdx].match(TASK_RE)
  if (!m) return false
  const isDone = m[2].toLowerCase() === 'x'
  lines[lineIdx] = lines[lineIdx].replace(/^(\s*-\s+)\[( |x|X)\]/, (_,p) => `${p}[${isDone ? ' ' : 'x'}]`)
  // Persistencia inline para no introducir dependencia circular con updateNote
  const { saveAll } = require('./store') as typeof import('./store')
  note.content = lines.join('\n')
  note.updatedAt = Date.now()
  saveAll(notes)
  return true
}

// ── Tags ────────────────────────────────────────────────────────────────────

export interface TagSummary {
  tag:    string
  count:  number
  notes:  CuadernoNote[]
}

export function allTags(): TagSummary[] {
  const map = new Map<string, CuadernoNote[]>()
  for (const n of loadAll()) {
    for (const t of n.tags) {
      if (!map.has(t)) map.set(t, [])
      map.get(t)!.push(n)
    }
  }
  return Array.from(map.entries())
    .map(([tag, notes]) => ({ tag, count: notes.length, notes }))
    .sort((a, b) => b.count - a.count)
}

// ── Daily Notes / Calendario ────────────────────────────────────────────────

const DAILY_PREFIX = 'Bitácora · '

export function isDailyNote(n: CuadernoNote): boolean {
  return n.folder === 'Bitácora' && n.title.startsWith(DAILY_PREFIX)
}

export function dailyDateOf(n: CuadernoNote): string | null {
  if (!isDailyNote(n)) return null
  const m = n.title.match(/(\d{4}-\d{2}-\d{2})/)
  return m ? m[1] : null
}

/** Mapa YYYY-MM-DD → nota (si existe). */
export function dailyMap(): Map<string, CuadernoNote> {
  const out = new Map<string, CuadernoNote>()
  for (const n of loadAll()) {
    const d = dailyDateOf(n)
    if (d) out.set(d, n)
  }
  return out
}

export interface DayActivity {
  date:    string
  daily:   CuadernoNote | null
  created: CuadernoNote[]      // notas creadas ese día
  updated: CuadernoNote[]      // notas modificadas ese día (no creadas)
  tasks:   NoteTask[]          // tareas con dueDate ese día
}

export function activityFor(yyyymmdd: string): DayActivity {
  const start = new Date(yyyymmdd + 'T00:00:00').getTime()
  const end   = start + 86_400_000
  const all = loadAll()
  const created = all.filter(n => n.createdAt >= start && n.createdAt < end)
  const updated = all.filter(n => n.updatedAt >= start && n.updatedAt < end && n.createdAt < start)
  const daily   = dailyMap().get(yyyymmdd) ?? null
  const tasks   = allTasks().filter(t => t.dueDate === yyyymmdd)
  return { date: yyyymmdd, daily, created, updated, tasks }
}

// ── Outline (TOC de una nota) ───────────────────────────────────────────────

export interface OutlineItem {
  level: number   // 1..6
  text:  string
  lineIdx: number
}

export function outlineOf(content: string): OutlineItem[] {
  const out: OutlineItem[] = []
  const lines = content.split('\n')
  let inCode = false
  lines.forEach((line, i) => {
    if (line.startsWith('```')) { inCode = !inCode; return }
    if (inCode) return
    const m = line.match(/^(#{1,6})\s+(.+)$/)
    if (m) out.push({ level: m[1].length, text: m[2].trim(), lineIdx: i })
  })
  return out
}

// ── Quick query DSL ─────────────────────────────────────────────────────────

export interface QueryOptions {
  folder?:  string | string[]
  tag?:     string | string[]
  since?:   number              // timestamp
  until?:   number
  hasLink?: string              // slug que debe aparecer en links
  contains?: string             // texto en el body (case-insensitive)
  tipo?:    string              // frontmatter `tipo`
}

export function queryNotes(opts: QueryOptions = {}): CuadernoNote[] {
  let notes = loadAll()
  if (opts.folder) {
    const fs = Array.isArray(opts.folder) ? opts.folder : [opts.folder]
    notes = notes.filter(n => fs.includes(n.folder))
  }
  if (opts.tag) {
    const ts = (Array.isArray(opts.tag) ? opts.tag : [opts.tag]).map(t => t.startsWith('#') ? t : `#${t}`)
    notes = notes.filter(n => ts.some(t => n.tags.includes(t)))
  }
  if (opts.since)    notes = notes.filter(n => n.updatedAt >= opts.since!)
  if (opts.until)    notes = notes.filter(n => n.updatedAt <= opts.until!)
  if (opts.hasLink)  notes = notes.filter(n => n.links.includes(opts.hasLink!))
  if (opts.contains) {
    const q = opts.contains.toLowerCase()
    notes = notes.filter(n =>
      n.title.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q)
    )
  }
  if (opts.tipo) {
    notes = notes.filter(n => {
      const { frontmatter } = parseFrontmatter(n.content)
      return frontmatter.tipo === opts.tipo
    })
  }
  return notes
}
