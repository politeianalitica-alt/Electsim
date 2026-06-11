/**
 * Preinformes — store local (browser) + catálogo de plantillas y fuentes.
 *
 *   - Mismo patrón que lib/cuaderno/store.ts y lib/cama/store.ts:
 *     localStorage + CustomEvent para sincronizar componentes.
 *   - Las fuentes disponibles del paso 2 cruzan datos REALES de los otros
 *     módulos locales (notas del Cuaderno, macroargumentos de la Cama)
 *     más el catálogo estático de paneles/vigilantes del Estudio.
 *   - buildMarkdown() compone el documento final a partir de las
 *     secciones incluidas + metadatos de fuentes.
 */

import type {
  FuentePreinforme,
  Preinforme,
  PreinformePlantilla,
  PreinformePlantillaId,
  PreinformePublico,
  EspacioPreinforme,
} from '@/types/preinforme'
import { safeSetItem } from '@/lib/storage/safe'

const STORAGE_KEY = 'politeia.preinformes.v1'

export const PREINFORMES_CHANGE_EVENT = 'preinformes:change'

// ── Plantillas ───────────────────────────────────────────────────────────────

export const PLANTILLAS: PreinformePlantilla[] = [
  {
    id: 'ejecutivo',
    nombre: 'Ejecutivo',
    descripcion: 'BLUF + situación + recomendaciones. Para dirección o cliente C-level.',
    secciones: [
      { titulo: 'BLUF · conclusión primero', guia: 'Una frase: qué pasa, qué recomendamos, para cuándo.' },
      { titulo: 'Situación', guia: 'Contexto en 3-5 líneas. Qué ha cambiado desde el último informe.' },
      { titulo: 'Datos clave', guia: 'Indicadores de los paneles y vigilantes seleccionados.' },
      { titulo: 'Recomendaciones', guia: 'Acciones concretas, con responsable y horizonte temporal.' },
    ],
  },
  {
    id: 'campana',
    nombre: 'Campaña',
    descripcion: 'Mensaje, terreno y adversario. Para el equipo del War Room.',
    secciones: [
      { titulo: 'Mensaje de la semana', guia: 'Macroargumento activo y cómo aterrizarlo en cada canal.' },
      { titulo: 'Estado del terreno', guia: 'Encuestas, territorios calientes, agenda de los próximos días.' },
      { titulo: 'Movimientos del adversario', guia: 'Qué está haciendo el rival y cómo respondemos.' },
      { titulo: 'Riesgos y contingencias', guia: 'Qué puede salir mal esta semana y plan B.' },
    ],
  },
  {
    id: 'riesgo',
    nombre: 'Riesgo / Crisis',
    descripcion: 'Nota rápida de situación con escenarios y triggers. Para comités de crisis.',
    secciones: [
      { titulo: 'Qué ha pasado', guia: 'Hechos verificados, sin adjetivos. Hora y fuente de cada uno.' },
      { titulo: 'Escenarios', guia: '2-3 escenarios con probabilidad e impacto.' },
      { titulo: 'Señales a vigilar', guia: 'Triggers que cambiarían la evaluación.' },
      { titulo: 'Posición recomendada', guia: 'Qué decir, qué no decir, quién habla.' },
    ],
  },
  {
    id: 'sectorial',
    nombre: 'Sectorial',
    descripcion: 'Análisis con datos de un sector (energía, vivienda, banca…).',
    secciones: [
      { titulo: 'Resumen del sector', guia: 'Estado regulatorio y de mercado en 5 líneas.' },
      { titulo: 'Indicadores', guia: 'Series de los datasets/paneles seleccionados.' },
      { titulo: 'Actores y movimientos', guia: 'Quién se ha movido este periodo y qué significa.' },
      { titulo: 'Implicaciones para el cliente', guia: 'Oportunidades y riesgos accionables.' },
    ],
  },
]

export function getPlantilla(id: PreinformePlantillaId): PreinformePlantilla {
  return PLANTILLAS.find(p => p.id === id) ?? PLANTILLAS[0]
}

export const PUBLICO_LABEL: Record<PreinformePublico, string> = {
  direccion: 'Dirección',
  cliente:   'Cliente',
  equipo:    'Equipo interno',
  prensa:    'Prensa / externo',
}

// ── Catálogo de fuentes disponibles (paso 2 del asistente) ──────────────────

/** Catálogo estático del Estudio (paneles/vigilantes/consultas demo). */
const FUENTES_ESTUDIO: FuentePreinforme[] = [
  { id: 'panel-tracking',    tipo: 'panel',     label: 'Tracking de encuestas',        detalle: 'Estudio · Mis paneles' },
  { id: 'panel-medios',      tipo: 'panel',     label: 'Pulso de Prensa',              detalle: 'Estudio · Mis paneles' },
  { id: 'panel-riesgo',      tipo: 'panel',     label: 'Termómetro de riesgo',         detalle: 'Estudio · Mis paneles' },
  { id: 'vig-boe',           tipo: 'vigilante', label: 'Vigilante BOE · subvenciones', detalle: 'Estudio · Vigilantes' },
  { id: 'vig-adversario',    tipo: 'vigilante', label: 'Vigilante menciones adversario', detalle: 'Estudio · Vigilantes' },
  { id: 'query-vivienda',    tipo: 'consulta',  label: 'Consulta · precio vivienda por CCAA', detalle: 'Pregúntale a tus datos' },
]

/**
 * Fuentes seleccionables: catálogo del Estudio + notas reales del Cuaderno
 * + macroargumentos reales de la Cama. Llamar SOLO en cliente.
 */
export function fuentesDisponibles(): FuentePreinforme[] {
  const out = [...FUENTES_ESTUDIO]
  try {
    const { loadActive } = require('@/lib/cuaderno/store') as typeof import('@/lib/cuaderno/store')
    for (const n of loadActive().slice(0, 25)) {
      out.push({ id: 'nota-' + n.slug, tipo: 'nota', label: n.title, detalle: `Cuaderno · ${n.folder}` })
    }
  } catch { /* cuaderno no disponible (SSR) */ }
  try {
    const cama = require('@/lib/cama/store') as typeof import('@/lib/cama/store')
    for (const m of cama.loadAll()) {
      out.push({ id: 'cama-' + m.id, tipo: 'macroargumento', label: m.titulo, detalle: `Cama · v${m.version} · ${m.estado}` })
    }
  } catch { /* cama no disponible (SSR) */ }
  return out
}

// ── Persistencia ─────────────────────────────────────────────────────────────

function isBrowser(): boolean {
  return typeof window !== 'undefined' && !!window.localStorage
}

/** TODOS los items, incluidos tombstones (uso interno del CRUD y del sync). */
export function loadRaw(): Preinforme[] {
  if (!isBrowser()) return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as Preinforme[]) : []
  } catch {
    return []
  }
}

/** Items vivos (sin tombstones) — lo que consume la UI. */
export function loadAll(): Preinforme[] {
  return loadRaw().filter(p => !p.deletedAt)
}

const TOMBSTONE_TTL_MS = 30 * 24 * 3600 * 1000   // 30 días

export function saveAll(items: Preinforme[]): void {
  if (!isBrowser()) return
  const limpio = items.filter(p => !p.deletedAt || Date.now() - p.deletedAt < TOMBSTONE_TTL_MS)
  // safeSetItem notifica (banner global) si la cuota está llena, en lugar
  // de perder trabajo en silencio.
  safeSetItem(STORAGE_KEY, JSON.stringify(limpio))
  window.dispatchEvent(new CustomEvent(PREINFORMES_CHANGE_EVENT))
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

function makeId(): string {
  return 'pre-' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4)
}

export function createPreinforme(input: {
  titulo:    string
  plantilla: PreinformePlantillaId
  publico:   PreinformePublico
  fuentes:   FuentePreinforme[]
  espacio:   EspacioPreinforme
}): Preinforme {
  const tpl = getPlantilla(input.plantilla)
  const now = Date.now()
  const item: Preinforme = {
    id:        makeId(),
    titulo:    input.titulo.trim() || 'Preinforme sin título',
    plantilla: input.plantilla,
    publico:   input.publico,
    fuentes:   input.fuentes,
    secciones: tpl.secciones.map((s, i) => ({
      id:        `sec-${i}`,
      titulo:    s.titulo,
      contenido: '',
      incluida:  true,
    })),
    estado:    'borrador',
    espacio:   input.espacio,
    createdAt: now,
    updatedAt: now,
  }
  saveAll([item, ...loadRaw()])
  return item
}

export function updatePreinforme(id: string, patch: Partial<Preinforme>): Preinforme | null {
  const items = loadRaw()
  const idx = items.findIndex(p => p.id === id && !p.deletedAt)
  if (idx === -1) return null
  const next: Preinforme = { ...items[idx], ...patch, id, updatedAt: Date.now() }
  items[idx] = next
  saveAll(items)
  return next
}

export function deletePreinforme(id: string): void {
  // Borrado lógico (tombstone): se propaga via sync; purga a los 30 días.
  saveAll(loadRaw().map(p => p.id === id ? { ...p, deletedAt: Date.now() } : p))
}

export function findById(id: string): Preinforme | null {
  return loadAll().find(p => p.id === id) ?? null
}

// ── Generación ───────────────────────────────────────────────────────────────

const TIPO_FUENTE_LABEL: Record<FuentePreinforme['tipo'], string> = {
  panel:          'Panel',
  vigilante:      'Vigilante',
  consulta:       'Consulta',
  nota:           'Nota del Cuaderno',
  macroargumento: 'Macroargumento',
}

/** Compone el Markdown final del preinforme a partir de secciones incluidas. */
export function buildMarkdown(p: Preinforme): string {
  const tpl = getPlantilla(p.plantilla)
  const fecha = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })
  const lines: string[] = [
    `# ${p.titulo}`,
    '',
    `> Preinforme · plantilla ${tpl.nombre} · público: ${PUBLICO_LABEL[p.publico]} · ${fecha}`,
    `> Generado desde ${p.espacio} · Politeia Analítica`,
    '',
  ]
  for (const s of p.secciones.filter(x => x.incluida)) {
    lines.push(`## ${s.titulo}`, '', s.contenido.trim() || '_Pendiente de redactar._', '')
  }
  if (p.fuentes.length) {
    lines.push('## Fuentes utilizadas', '')
    for (const f of p.fuentes) {
      lines.push(`- ${TIPO_FUENTE_LABEL[f.tipo]} · ${f.label}${f.detalle ? ` (${f.detalle})` : ''}`)
    }
    lines.push('')
  }
  lines.push('---', '_Borrador preliminar · requiere validación del analista antes de distribución._')
  return lines.join('\n') + '\n'
}

/** Marca el preinforme como generado y persiste su Markdown final. */
export function generarPreinforme(id: string): Preinforme | null {
  const p = findById(id)
  if (!p) return null
  return updatePreinforme(id, { estado: 'generado', markdown: buildMarkdown(p) })
}
