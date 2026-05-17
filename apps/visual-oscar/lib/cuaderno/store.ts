/**
 * Cuaderno — store local (browser) inspirado en Obsidian.
 *
 *   - Notas en Markdown, identificadas por slug único.
 *   - Backlinks bidireccionales detectados parseando `[[wikilink]]`.
 *   - Persistencia 100% local en localStorage (no sube nada al servidor).
 *   - Acciones del analista (visitas a páginas, queries IA, alertas creadas,
 *     paneles abiertos…) se registran como notas automáticas en el folder
 *     `Bitácora/` para que el grafo se nutra solo.
 *
 * Estructura de una nota:
 *   {
 *     id: 'note-abc123',
 *     slug: 'mapa-de-actores-pp',         // único, usado en [[wikilinks]]
 *     title: 'Mapa de actores PP',
 *     folder: 'Investigación',            // organización opcional
 *     content: '# ... markdown ...',
 *     tags: ['#pp', '#elecciones'],
 *     links: ['feijoo', 'genova-13'],     // slugs apuntados (auto)
 *     createdAt: 1747...,
 *     updatedAt: 1747...,
 *     pinned: boolean,
 *     source: 'manual' | 'auto'           // 'auto' = generada por bitácora
 *   }
 */

export interface CuadernoNote {
  id:        string
  slug:      string
  title:     string
  folder:    string
  content:   string
  tags:      string[]
  links:     string[]      // computed
  createdAt: number
  updatedAt: number
  pinned:    boolean
  source:    'manual' | 'auto'
}

const STORAGE_KEY = 'politeia.cuaderno.v1'

// ── helpers ──────────────────────────────────────────────────────────────────

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'sin-titulo'
}

/** Extrae todos los `[[wikilinks]]` de un markdown, devolviendo sus slugs. */
export function extractLinks(content: string): string[] {
  const out = new Set<string>()
  const re = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g
  let m: RegExpExecArray | null
  while ((m = re.exec(content)) !== null) {
    out.add(slugify(m[1].trim()))
  }
  return Array.from(out)
}

/** Extrae tags `#palabra` (no dentro de código). */
export function extractTags(content: string): string[] {
  const out = new Set<string>()
  // Quita bloques de código primero para no capturar tags falsos
  const sanitized = content.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '')
  const re = /(?:^|\s)(#[a-zA-Z0-9_áéíóúñ-]{2,30})/g
  let m: RegExpExecArray | null
  while ((m = re.exec(sanitized)) !== null) {
    out.add(m[1].toLowerCase())
  }
  return Array.from(out)
}

// ── persistencia ─────────────────────────────────────────────────────────────

function isBrowser(): boolean {
  return typeof window !== 'undefined' && !!window.localStorage
}

export function loadAll(): CuadernoNote[] {
  if (!isBrowser()) return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as CuadernoNote[]
  } catch {
    return []
  }
}

export function saveAll(notes: CuadernoNote[]): void {
  if (!isBrowser()) return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
    // Notifica a otras pestañas / componentes para que re-rendericen
    window.dispatchEvent(new CustomEvent('cuaderno:change'))
  } catch {
    // localStorage lleno o privado: silencioso
  }
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

function makeId(): string {
  return 'note-' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4)
}

function uniqSlug(notes: CuadernoNote[], base: string, ignoreId?: string): string {
  let s = base; let n = 2
  while (notes.some(x => x.slug === s && x.id !== ignoreId)) {
    s = `${base}-${n++}`
  }
  return s
}

export function createNote(input: Partial<CuadernoNote> & { title: string }): CuadernoNote {
  const notes = loadAll()
  const now = Date.now()
  const baseSlug = input.slug ? slugify(input.slug) : slugify(input.title)
  const content = input.content ?? ''
  const note: CuadernoNote = {
    id:        makeId(),
    slug:      uniqSlug(notes, baseSlug),
    title:     input.title.trim() || 'Sin título',
    folder:    input.folder?.trim() || 'Notas',
    content,
    tags:      extractTags(content),
    links:     extractLinks(content),
    createdAt: now,
    updatedAt: now,
    pinned:    !!input.pinned,
    source:    input.source ?? 'manual',
  }
  saveAll([note, ...notes])
  return note
}

export function updateNote(id: string, patch: Partial<CuadernoNote>): CuadernoNote | null {
  const notes = loadAll()
  const idx = notes.findIndex(n => n.id === id)
  if (idx === -1) return null
  const prev = notes[idx]
  const content = patch.content ?? prev.content
  const next: CuadernoNote = {
    ...prev,
    ...patch,
    content,
    tags:      extractTags(content),
    links:     extractLinks(content),
    slug:      patch.slug ? uniqSlug(notes, slugify(patch.slug), id) : prev.slug,
    updatedAt: Date.now(),
  }
  notes[idx] = next
  saveAll(notes)
  return next
}

export function deleteNote(id: string): void {
  saveAll(loadAll().filter(n => n.id !== id))
}

export function findBySlug(slug: string): CuadernoNote | null {
  return loadAll().find(n => n.slug === slug) ?? null
}

/** Backlinks: notas cuyo content enlaza al slug dado. */
export function backlinks(slug: string): CuadernoNote[] {
  return loadAll().filter(n => n.links.includes(slug))
}

/** Grafo: nodos = notas, aristas = wikilinks. */
export interface GraphNode { id: string; slug: string; title: string; degree: number; folder: string; source: 'manual' | 'auto' }
export interface GraphEdge { from: string; to: string }
export interface GraphData { nodes: GraphNode[]; edges: GraphEdge[] }
export function buildGraph(): GraphData {
  const notes = loadAll()
  const bySlug = new Map(notes.map(n => [n.slug, n]))
  const degree = new Map<string, number>()
  const edges: GraphEdge[] = []
  for (const n of notes) {
    for (const link of n.links) {
      if (!bySlug.has(link)) continue
      edges.push({ from: n.slug, to: link })
      degree.set(n.slug,  (degree.get(n.slug)  ?? 0) + 1)
      degree.set(link,    (degree.get(link)    ?? 0) + 1)
    }
  }
  const nodes: GraphNode[] = notes.map(n => ({
    id: n.slug, slug: n.slug, title: n.title, folder: n.folder,
    degree: degree.get(n.slug) ?? 0,
    source: n.source,
  }))
  return { nodes, edges }
}

// ── Bitácora (acciones del analista) ─────────────────────────────────────────

/**
 * Registra una acción del analista como una nota auto-generada en el folder
 * "Bitácora". Si ya existe una nota Bitácora del día, le añade un bullet.
 * Así el grafo se nutre solo: cada visita a /licitaciones, cada query
 * a la IA, cada alerta creada, queda enlazada y exploable.
 */
export function logAction(action: {
  kind: 'visit' | 'query' | 'alert' | 'panel' | 'export' | 'note'
  title: string                  // descripción humana, p.ej. 'Visitaste /licitaciones'
  link?: string                  // slug a enlazar como [[wikilink]] (opcional)
  href?: string                  // URL externa o interna a registrar
  meta?: Record<string, string>  // metadatos extra (sector, partido, etc.)
}): CuadernoNote | null {
  if (!isBrowser()) return null
  const notes = loadAll()
  const today = new Date()
  const ymd = today.toISOString().slice(0, 10)           // 2026-05-15
  const dayTitle = `Bitácora · ${ymd}`
  const daySlug = slugify(dayTitle)
  const hhmm = today.toTimeString().slice(0, 5)
  const wikilink = action.link ? ` → [[${action.link}]]` : ''
  const hrefStr = action.href ? ` (${action.href})` : ''
  const metaStr = action.meta ? ' · ' + Object.entries(action.meta).map(([k, v]) => `${k}=${v}`).join(' · ') : ''
  const icon = ICONS[action.kind] ?? '·'
  const bullet = `- \`${hhmm}\` ${icon} ${action.title}${hrefStr}${wikilink}${metaStr}\n`

  const existing = notes.find(n => n.slug === daySlug)
  if (existing) {
    return updateNote(existing.id, { content: existing.content + bullet })
  }
  return createNote({
    title:   dayTitle,
    folder:  'Bitácora',
    source:  'auto',
    content: `# ${dayTitle}\n\nRegistro automático de mi actividad en Politeia hoy.\n\n${bullet}`,
  })
}

const ICONS: Record<string, string> = {
  visit:  '◐',
  query:  '✦',
  alert:  '!',
  panel:  '⊟',
  export: '⇡',
  note:   '✎',
}

// ── Seed: notas iniciales si el cuaderno está vacío ──────────────────────────

const SEED_NOTES: Array<Partial<CuadernoNote> & { title: string }> = [
  {
    title:  'Bienvenida al Cuaderno',
    folder: 'Inicio',
    pinned: true,
    content: `# Bienvenida al Cuaderno

Este es tu **segundo cerebro** dentro de Politeia. Funciona como Obsidian
pero está integrado con tu trabajo en la plataforma:

- Escribes en **Markdown**.
- Enlazas ideas con \`[[doble corchete]]\` — se crean automáticamente las
  conexiones bidireccionales.
- El **grafo** muestra cómo se relacionan tus ideas visualmente.
- Tus **acciones diarias** en Politeia se registran solas en \`Bitácora/\`.
- Todo se guarda **en tu navegador**: tus notas no salen de tu equipo.

Empieza creando una nota desde el botón [[+ Nueva nota]] o enlaza desde
aquí a [[Tema seguimiento elecciones 2026]] para ver cómo funcionan los
backlinks.

> Tip: pulsa \`Cmd+K\` para buscar y saltar entre notas al instante.
`,
  },
  {
    title:  'Tema seguimiento elecciones 2026',
    folder: 'Investigación',
    content: `# Tema — Elecciones 2026

Investigación viva. Voy enlazando notas relacionadas:

- [[Mapa de actores PP]]
- [[Coaliciones probables]]
- [[Encuestas CIS Marzo 2026]]

Tags: #elecciones #2026 #españa
`,
  },
  {
    title:  'Atajos del Cuaderno',
    folder: 'Inicio',
    content: `# Atajos

| Acción              | Atajo            |
|---------------------|------------------|
| Buscar nota         | Cmd+K            |
| Nueva nota          | Cmd+N            |
| Guardar             | Cmd+S (auto)     |
| Crear wikilink      | [[Nombre nota]]  |
| Etiqueta            | #etiqueta        |
| Volver al grafo     | Cmd+G            |
`,
  },
]

export function seedIfEmpty(): void {
  if (!isBrowser()) return
  if (loadAll().length > 0) return
  for (const s of SEED_NOTES) createNote(s)
}
