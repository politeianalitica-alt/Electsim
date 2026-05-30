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

/**
 * Sprint Cuaderno N2 · extrae menciones de entidades reconocidas en el
 * entity-registry · descarta wikilinks que apunten a notas internas.
 *
 * Devuelve los slugs canónicos del registry (resueltos por nombre/alias).
 */
export function extractEntityMentions(content: string): string[] {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { resolveEntity } = require('./entity-registry')
  const out = new Set<string>()
  const re = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g
  let m: RegExpExecArray | null
  while ((m = re.exec(content)) !== null) {
    const entity = resolveEntity(m[1].trim())
    if (entity) out.add(entity.slug)
  }
  return Array.from(out)
}

/**
 * Sprint Cuaderno N2 · todas las notas que mencionan una entidad concreta.
 * Útil para el panel "Otras notas con esta entidad" en el sidebar.
 */
export function notesByEntitySlug(entitySlug: string): CuadernoNote[] {
  if (!entitySlug) return []
  return loadAll().filter((n) => {
    const ents = extractEntityMentions(n.content)
    return ents.includes(entitySlug)
  })
}

/**
 * Sprint Cuaderno N2 · mapa global · entidad → notas que la mencionan.
 * Útil para mostrar contadores en el grafo o estadísticas globales.
 */
export function entityMentionCounts(): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const n of loadAll()) {
    const ents = extractEntityMentions(n.content)
    for (const e of ents) {
      counts[e] = (counts[e] ?? 0) + 1
    }
  }
  return counts
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

/**
 * Sprint Cuaderno N5 · grafo HÍBRIDO con entidades como nodos de primera clase.
 *
 * Nodos:
 *   - kind="note"  · nota del usuario
 *   - kind="person|party|ccaa|sector|company|institution|country"
 *                  · entidad del registry mencionada en ≥1 nota
 *
 * Aristas:
 *   - kind="note-note"   · wikilink interno entre notas
 *   - kind="note-entity" · mención de entidad en una nota
 *
 * Esto permite ver el cuerpo del Cuaderno como una "constelación" de qué
 * personas/partidos/sectores ha mirado el analista, con qué notas, y cómo
 * se conectan entre ellos. Equivalente al grafo de Obsidian pero enriquecido
 * con el dominio político español.
 */
export type HybridNodeKind =
  | 'note'
  | 'person'
  | 'party'
  | 'ccaa'
  | 'sector'
  | 'company'
  | 'institution'
  | 'country'

export interface HybridGraphNode {
  id:           string // 'note:<slug>' | 'ent:<slug>'
  kind:         HybridNodeKind
  label:        string
  degree:       number
  // Solo notas
  folder?:      string
  source?:      'manual' | 'auto'
  // Solo entidades
  entitySlug?:  string
  entityLink?:  string
  entityRole?:  string
}

export interface HybridGraphEdge {
  from:   string
  to:     string
  kind:   'note-note' | 'note-entity'
}

export interface HybridGraphData {
  nodes: HybridGraphNode[]
  edges: HybridGraphEdge[]
}

export function buildHybridGraph(): HybridGraphData {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { resolveEntity } = require('./entity-registry') as typeof import('./entity-registry')

  const notes = loadAll()
  const bySlug = new Map(notes.map((n) => [n.slug, n]))
  const degree = new Map<string, number>()
  const edges: HybridGraphEdge[] = []
  const seenEntities = new Set<string>() // slugs

  // 1) Aristas note → note (wikilinks que apuntan a otra nota existente)
  for (const n of notes) {
    for (const link of n.links) {
      if (!bySlug.has(link)) continue
      edges.push({ from: 'note:' + n.slug, to: 'note:' + link, kind: 'note-note' })
      degree.set('note:' + n.slug, (degree.get('note:' + n.slug) ?? 0) + 1)
      degree.set('note:' + link, (degree.get('note:' + link) ?? 0) + 1)
    }
  }

  // 2) Aristas note → entity (menciones de entidades del registry)
  for (const n of notes) {
    const ents = extractEntityMentions(n.content)
    for (const slug of ents) {
      seenEntities.add(slug)
      const id = 'ent:' + slug
      edges.push({ from: 'note:' + n.slug, to: id, kind: 'note-entity' })
      degree.set('note:' + n.slug, (degree.get('note:' + n.slug) ?? 0) + 1)
      degree.set(id, (degree.get(id) ?? 0) + 1)
    }
  }

  // 3) Construir nodos: notas + entidades únicas vistas
  const nodes: HybridGraphNode[] = []
  for (const n of notes) {
    nodes.push({
      id: 'note:' + n.slug,
      kind: 'note',
      label: n.title,
      folder: n.folder,
      source: n.source,
      degree: degree.get('note:' + n.slug) ?? 0,
    })
  }
  for (const slug of seenEntities) {
    const e = resolveEntity(slug)
    if (!e) continue
    nodes.push({
      id: 'ent:' + slug,
      kind: e.kind,
      label: e.name,
      entitySlug: e.slug,
      entityLink: e.link,
      entityRole: e.role,
      degree: degree.get('ent:' + slug) ?? 0,
    })
  }

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

// ── Daily Notes / Plantillas ────────────────────────────────────────────────

/**
 * Devuelve la nota Bitácora de hoy creándola si no existe.
 * La instancia desde la plantilla `daily` para que tenga estructura útil.
 */
export function getOrCreateDailyNote(): CuadernoNote | null {
  if (!isBrowser()) return null
  const today = new Date().toISOString().slice(0,10)
  const slug = slugify(`Bitácora · ${today}`)
  const existing = findBySlug(slug)
  if (existing) return existing
  // Lazy require para evitar dependencia circular
  const { instantiate, getTemplate } = require('./templates') as typeof import('./templates')
  const tpl = getTemplate('daily')
  if (!tpl) return null
  const data = instantiate(tpl)
  return createNote({ ...data, source: 'auto' })
}

/**
 * Crea una nota nueva desde una plantilla.
 */
export function createFromTemplate(templateId: string, title?: string): CuadernoNote | null {
  if (!isBrowser()) return null
  const { instantiate, getTemplate } = require('./templates') as typeof import('./templates')
  const tpl = getTemplate(templateId)
  if (!tpl) return null
  const data = instantiate(tpl, title)
  return createNote(data)
}

// ── Seed: notas iniciales si el cuaderno está vacío ──────────────────────────

const SEED_NOTES: Array<Partial<CuadernoNote> & { title: string }> = [
  {
    title:  'Bienvenida al Cuaderno',
    folder: 'Inicio',
    pinned: true,
    content: `# Bienvenida al Cuaderno

Este es tu **segundo cerebro** dentro de Politeia — un PKM completo inspirado
en Obsidian, pero **integrado con tu trabajo de analista**.

## El método del analista, en un cuaderno

Toda investigación seria tiene estructura. Aquí la estandarizas con
**plantillas**:

- [[Análisis · ejemplo bloqueo Junts|Análisis]] — pregunta, hipótesis,
  evidencia a favor / en contra, sesgos, conclusión con confianza explícita.
- [[Decisión · ejemplo apoyo a presupuestos|Decisión]] — opciones,
  criterios, reversibilidad, cuándo revisar.
- [[Reunión · ejemplo coordinación gabinete|Reunión]] — acta con acciones,
  responsables y fechas.
- [[Actor · Pedro Sánchez|Actor político]] — ficha viva con posición,
  intereses reales, red, leverage.
- **Fuente** — registro con fiabilidad y citas literales.
- **Briefing** — BLUF, situación, análisis, recomendación.
- **Hipótesis** — afirmación falsable que evalúas con evidencia entrante.

Crea con \`Cmd+N\` y elige plantilla. Si solo quieres un papel en blanco,
también vale.

## Cómo funciona

- **Markdown** — escribes natural, sin distracciones.
- **Wikilinks** \`[[doble corchete]]\` — enlaces bidireccionales; en cada
  nota ves quién te apunta (backlinks).
- **Tags** \`#etiqueta\` — clasificación transversal a las carpetas.
- **Frontmatter YAML** \`---\` al inicio — metadatos que las consultas leen.
- **Tareas** \`- [ ] hacer X\` — se agregan en el panel **Tareas**, con
  responsable \`**[Nombre]**\` y fecha \`\`\`YYYY-MM-DD\`\`\`.
- **Bitácora diaria** — un \`Cmd+D\` te lleva al diario del día; se rellena
  solo con tu actividad en Politeia.
- **Grafo** — el mapa visual de tu pensamiento.
- **Local-first** — todo vive en tu navegador. Tu cuaderno es tuyo.

## Tu cerebro, externalizado

Cuanto más uses Politeia, más se enriquece el cuaderno solo: cada visita
a un módulo, cada alerta crítica, cada query a la IA, se registra como un
bullet en tu [[Bitácora]] del día. El grafo crece sin que hagas nada.

> Pulsa \`Cmd+K\` para buscar. \`Cmd+G\` para el grafo. \`Cmd+D\` para hoy.

#método #pkm
`,
  },
  {
    title:  'Atajos del Cuaderno',
    folder: 'Inicio',
    content: `# Atajos

| Acción                       | Atajo            |
|------------------------------|------------------|
| Buscar nota                  | Cmd+K            |
| Nueva nota (con plantilla)   | Cmd+N            |
| Ir al diario de hoy          | Cmd+D            |
| Alternar grafo               | Cmd+G            |
| Vista de tareas              | Cmd+T            |
| Calendario                   | Cmd+1            |
| Volver a notas               | Esc              |
| Marcar tarea                 | Click en \`[ ]\`   |
| Crear wikilink               | [[Nombre nota]]  |
| Etiqueta                     | #etiqueta        |
| Frontmatter                  | --- al inicio    |

#método
`,
  },
  {
    title:  'Análisis · ejemplo bloqueo Junts',
    folder: 'Análisis',
    content: `---
tipo: analisis
fecha: 2026-05-15
estado: en-curso
confianza: media-alta
---

# Análisis — ¿Junts bloquea los presupuestos?

## Pregunta clave

¿Va Junts a tumbar los presupuestos generales en la votación de la
próxima semana, o es ruido para forzar nueva negociación?

## Hipótesis principal

> **Junts presiona pero acaba apoyando** una vez consiga concesiones
> visibles sobre competencias autonómicas en migración.

## Hipótesis alternativas

1. **Tumba** — busca elecciones anticipadas favorables a su narrativa.
2. **Abstención** — fórmula intermedia que no rompe ni apoya.

## Evidencia a favor

| Fuente | Fuerza | Nota |
|--------|--------|------|
| [[Reunión · ejemplo coordinación gabinete]] | media | Lectura de Bolaños |
| Tracking medios catalanes ([[Pulso de Prensa]]) | alta | Tono cede vs. semana pasada |

## Evidencia en contra

| Fuente | Fuerza | Nota |
|--------|--------|------|
| Declaración Turull martes | alta | Línea roja explícita |

## Sesgos a vigilar

- [ ] Confirmación: ya esperaba que apoyara, ¿busco solo señales que lo confirmen?
- [x] Recencia: la declaración de Turull es muy reciente, no sobreponderar.

## Conclusión provisional

> Apoyo con concesiones, confianza 65%. Revisar tras Pleno del martes.

## Lo que falta saber

- [ ] **[Ana Gómez]** · Sondear gabinete Vox sobre enmiendas conjuntas · vence \`2026-05-19\`
- [ ] Confirmar agenda Turull para fin de semana · vence \`2026-05-17\`

## Conexiones

- Actores: [[Actor · Pedro Sánchez]]
- Temas: [[Decisión · ejemplo apoyo a presupuestos]]

#analisis #junts #presupuestos
`,
  },
  {
    title:  'Decisión · ejemplo apoyo a presupuestos',
    folder: 'Decisiones',
    content: `---
tipo: decision
fecha: 2026-05-15
estado: tomada
reversibilidad: dos-vias
revisar: 2026-05-22
---

# Decisión — Postura pública del cliente sobre los PGE

## Contexto

El cliente pregunta qué postura comunicar antes del Pleno. Si no decidimos,
cada portavoz improvisa y se rompe el mensaje.

## Opciones consideradas

### Opción A · Apoyo condicionado público
- Pros: marca posición, presiona a Junts.
- Contras: si Junts tumba, queda como apoyo a un fracaso.

### Opción B · Silencio estratégico hasta el martes
- Pros: máxima flexibilidad.
- Contras: huecos en la conversación los rellena el rival.

### Opción C · Crítica técnica sin pronunciarse sobre voto
- Pros: visibilidad sin compromiso.
- Contras: percibido como ambiguo.

## Decisión tomada

> **Opción C**. Marca presencia experta sin atarse al desenlace.

## Reversibilidad

- [x] Dos vías — el martes podemos pivotar a apoyo o rechazo según señal.

## Riesgos asumidos

- Si Junts apoya y nosotros no celebramos, perdemos la ola.

## Cuándo revisar

\`2026-05-22\` (post-Pleno). Señales para cambiar:
- Junts publica enmiendas pactadas → pivotar a apoyo.
- Pleno se aplaza → mantener crítica técnica.

## Conexiones

- [[Análisis · ejemplo bloqueo Junts]]

#decision #presupuestos
`,
  },
  {
    title:  'Reunión · ejemplo coordinación gabinete',
    folder: 'Reuniones',
    content: `---
tipo: reunion
fecha: 2026-05-14
hora: 09:30
participantes: [Cliente, Ana Gómez, Luis Martín]
estado: completada
---

# Reunión — Coordinación semanal gabinete

## Contexto

Punto de situación semanal antes de comunicados.

## Participantes

- [[Cliente]] — decisor
- [[Ana Gómez]] — política
- [[Luis Martín]] — comunicación

## Agenda

1. Lectura situación PGE
2. Calendario medios
3. Riesgos próximos 7 días

## Decisiones

- Posición pública = [[Decisión · ejemplo apoyo a presupuestos|Opción C]].
- Sondeos territoriales para revisar el viernes.

## Acciones

- [ ] **[Ana Gómez]** · Sondear gabinete Vox · vence \`2026-05-19\` !alto
- [x] **[Luis Martín]** · Preparar tarjetas mensaje · vence \`2026-05-15\`
- [ ] **[Clara Ruiz]** · Crisis bulos financiación — nota fact-check · vence \`2026-05-16\` !critico

## Riesgos / Disensos

- Vox publica antes que nosotros y nos roba el frame.

#reunion
`,
  },
  {
    title:  'Actor · Pedro Sánchez',
    folder: 'Actores',
    content: `---
tipo: actor
nivel: estatal
partido: PSOE
cargo: Presidente del Gobierno
actualizado: 2026-05-15
---

# Pedro Sánchez

## Identidad

- **Cargo**: Presidente del Gobierno
- **Partido**: [[PSOE]]
- **Trayectoria**: SecGen PSOE 2014-2016, 2017-, Presidente desde 2018.

## Posición pública

Defensa del bloque de investidura, agenda social, integración europea.

## Intereses reales

Aguantar la legislatura completa para consolidar legado. Evitar elecciones
en escenario adverso. Mantener cohesión interna PSOE post-Ferraz.

## Red de relaciones

- **Aliados**: [[María Jesús Montero]], [[Félix Bolaños]]
- **Equilibrios**: bloque investidura (Sumar, ERC, Junts, EH Bildu, PNV)
- **Rivales**: Feijóo, Abascal

## Historial relevante

- \`2026-05-12\` · Intervención en pleno sobre vivienda
- \`2026-04-29\` · Reunión bilateral con Turull (Junts)

## Patrones observados

- Suele anunciar concesiones tácticas el día anterior a votaciones difíciles.
- Las amnistías y la financiación catalana son los dos ejes que no toca a la ligera.

## Leverage

- Calendario europeo (presidencia rotatoria, fondos): condiciona los movimientos.
- Tiempos parlamentarios: usa el reglamento del Congreso para ganar tiempo.

## Notas en curso

- [[Análisis · ejemplo bloqueo Junts]]

#actor #psoe
`,
  },
]

export function seedIfEmpty(): void {
  if (!isBrowser()) return
  if (loadAll().length > 0) return
  for (const s of SEED_NOTES) createNote(s)
}
