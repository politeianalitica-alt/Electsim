/**
 * Cama — Campañas y Macroargumentos · store local (browser).
 *
 *   - Mismo patrón que lib/cuaderno/store.ts: persistencia 100% local en
 *     localStorage, evento CustomEvent para re-render entre componentes
 *     y pestañas, seed inicial si está vacío.
 *   - Versionado: cada vez que cambian resumen o puntos clave se guarda
 *     un snapshot en `versiones` (máx. 20 por argumentario).
 *   - El store es compartido por TODOS los espacios (Estudio, War Room,
 *     Toolbox, Cuaderno, Command Center): un único repositorio de
 *     narrativas para toda la plataforma.
 */

import type {
  EspacioCama,
  EvidenciaCama,
  Macroargumento,
  MacroargumentoEstado,
  VersionCama,
} from '@/types/cama'

const STORAGE_KEY = 'politeia.cama.v1'
const MAX_VERSIONES = 20

export const CAMA_CHANGE_EVENT = 'cama:change'

// ── persistencia ─────────────────────────────────────────────────────────────

function isBrowser(): boolean {
  return typeof window !== 'undefined' && !!window.localStorage
}

export function loadAll(): Macroargumento[] {
  if (!isBrowser()) return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as Macroargumento[]) : []
  } catch {
    return []
  }
}

export function saveAll(items: Macroargumento[]): void {
  if (!isBrowser()) return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    window.dispatchEvent(new CustomEvent(CAMA_CHANGE_EVENT))
  } catch {
    // localStorage lleno o modo privado: silencioso
  }
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

function makeId(): string {
  return 'cama-' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4)
}

export function createMacroargumento(
  input: Partial<Macroargumento> & { titulo: string; espacio: EspacioCama },
): Macroargumento {
  const items = loadAll()
  const now = Date.now()
  const item: Macroargumento = {
    id:          makeId(),
    titulo:      input.titulo.trim() || 'Sin título',
    resumen:     input.resumen ?? '',
    puntosClave: input.puntosClave ?? [],
    evidencias:  input.evidencias ?? [],
    vinculos:    input.vinculos ?? [],
    etiquetas:   input.etiquetas ?? [],
    estado:      input.estado ?? 'borrador',
    impacto:     input.impacto ?? { penetracion: 0, resonancia: 0, riesgo: 0 },
    espacio:     input.espacio,
    version:     1,
    versiones:   [],
    createdAt:   now,
    updatedAt:   now,
  }
  saveAll([item, ...items])
  return item
}

/**
 * Actualiza un macroargumento. Si cambian `resumen` o `puntosClave`,
 * snapshotea la versión anterior antes de aplicar el parche
 * (con `notaVersion` como comentario opcional del cambio).
 */
export function updateMacroargumento(
  id: string,
  patch: Partial<Macroargumento>,
  notaVersion?: string,
): Macroargumento | null {
  const items = loadAll()
  const idx = items.findIndex(m => m.id === id)
  if (idx === -1) return null
  const prev = items[idx]

  const contentChanged =
    (patch.resumen !== undefined && patch.resumen !== prev.resumen) ||
    (patch.puntosClave !== undefined &&
      JSON.stringify(patch.puntosClave) !== JSON.stringify(prev.puntosClave))

  let versiones = prev.versiones
  let version = prev.version
  if (contentChanged) {
    const snapshot: VersionCama = {
      version:     prev.version,
      fecha:       prev.updatedAt,
      resumen:     prev.resumen,
      puntosClave: prev.puntosClave,
      nota:        notaVersion,
    }
    versiones = [snapshot, ...prev.versiones].slice(0, MAX_VERSIONES)
    version = prev.version + 1
  }

  const next: Macroargumento = {
    ...prev,
    ...patch,
    id:        prev.id,
    versiones,
    version,
    updatedAt: Date.now(),
  }
  items[idx] = next
  saveAll(items)
  return next
}

export function deleteMacroargumento(id: string): void {
  saveAll(loadAll().filter(m => m.id !== id))
}

export function setEstado(id: string, estado: MacroargumentoEstado): Macroargumento | null {
  return updateMacroargumento(id, { estado })
}

/** Restaura una versión anterior (la actual queda snapshoteada). */
export function restaurarVersion(id: string, version: number): Macroargumento | null {
  const item = loadAll().find(m => m.id === id)
  if (!item) return null
  const v = item.versiones.find(x => x.version === version)
  if (!v) return null
  return updateMacroargumento(
    id,
    { resumen: v.resumen, puntosClave: [...v.puntosClave] },
    `Restaurada v${v.version}`,
  )
}

export function findById(id: string): Macroargumento | null {
  return loadAll().find(m => m.id === id) ?? null
}

// ── Export ───────────────────────────────────────────────────────────────────

const FUERZA_LABEL: Record<EvidenciaCama['fuerza'], string> = {
  alta: 'Alta', media: 'Media', baja: 'Baja',
}

/** Markdown completo del argumentario, listo para descargar o imprimir. */
export function toMarkdown(m: Macroargumento): string {
  const fecha = new Date(m.updatedAt).toLocaleDateString('es-ES', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
  const lines: string[] = [
    `# ${m.titulo}`,
    '',
    `> Macroargumento · v${m.version} · ${fecha} · estado: ${m.estado}`,
    '',
    '## Resumen',
    '',
    m.resumen || '_Sin resumen._',
    '',
    '## Puntos clave',
    '',
    ...(m.puntosClave.length ? m.puntosClave.map(p => `- ${p}`) : ['_Sin puntos clave._']),
    '',
    '## Evidencias',
    '',
  ]
  if (m.evidencias.length) {
    lines.push('| Evidencia | Fuente | Fuerza |', '|---|---|---|')
    for (const e of m.evidencias) {
      lines.push(`| ${e.texto} | ${e.fuente || '—'} | ${FUERZA_LABEL[e.fuerza]} |`)
    }
  } else {
    lines.push('_Sin evidencias registradas._')
  }
  lines.push(
    '',
    '## Impacto',
    '',
    `- Penetración: ${m.impacto.penetracion}/100`,
    `- Resonancia: ${m.impacto.resonancia}/100`,
    `- Riesgo de contraataque: ${m.impacto.riesgo}/100`,
  )
  if (m.vinculos.length) {
    lines.push('', '## Vínculos', '')
    for (const v of m.vinculos) lines.push(`- [${v.tipo}] ${v.label}`)
  }
  if (m.etiquetas.length) {
    lines.push('', m.etiquetas.map(t => (t.startsWith('#') ? t : `#${t}`)).join(' '))
  }
  return lines.join('\n') + '\n'
}

// ── Seed ─────────────────────────────────────────────────────────────────────

export function seedIfEmpty(): void {
  if (!isBrowser()) return
  if (loadAll().length > 0) return

  createMacroargumento({
    titulo:  'Estabilidad frente a bloqueo',
    espacio: 'war-room',
    estado:  'activo',
    resumen:
      'La legislatura avanza pese al ruido: cada semana de gestión ordinaria ' +
      'desgasta la narrativa de bloqueo del adversario. El mensaje ancla es ' +
      '"gobernar en serio mientras otros gritan".',
    puntosClave: [
      'Toda comparecencia abre con un dato de gestión verificable',
      'No responder al marco "caos": pivotar siempre a agenda propia',
      'Contraste sereno: hechos propios vs. titulares ajenos',
    ],
    evidencias: [
      { id: 'ev-1', texto: 'Tracking propio: +6 pts en atributo "capacidad de gestión" en 30 días', fuente: 'Panel · Tracking encuestas', fuerza: 'alta' },
      { id: 'ev-2', texto: 'El frame "bloqueo" cae en menciones de prensa desde el debate', fuente: 'Pulso de Prensa', fuerza: 'media' },
    ],
    vinculos: [
      { tipo: 'panel', ref: '/estudio/dashboard', label: 'Tracking encuestas' },
      { tipo: 'workspace', ref: '/war-room', label: 'War Room · Mensaje del día' },
    ],
    etiquetas: ['#mensaje', '#gestion'],
    impacto: { penetracion: 62, resonancia: 48, riesgo: 35 },
  })

  createMacroargumento({
    titulo:  'Vivienda: la generación de la llave',
    espacio: 'estudio',
    estado:  'borrador',
    resumen:
      'Macroargumento de campaña sobre acceso a la vivienda para menores de 35: ' +
      'pasar del diagnóstico (precios) a la promesa verificable (llave en mano). ' +
      'Evitar cifras agregadas; hablar de casos concretos por ciudad.',
    puntosClave: [
      'Una historia concreta por provincia, no medias nacionales',
      'Promesa auditable: calendario público de entregas',
      'Anticipar el contraataque "promesas viejas" con hitos ya cumplidos',
    ],
    evidencias: [
      { id: 'ev-1', texto: 'El 71% de 25-34 señala vivienda como problema principal', fuente: 'Microdatos · Perfiles de votante', fuerza: 'alta' },
    ],
    vinculos: [
      { tipo: 'nota', ref: 'analisis-vivienda', label: 'Cuaderno · Análisis vivienda' },
    ],
    etiquetas: ['#vivienda', '#jovenes'],
    impacto: { penetracion: 28, resonancia: 55, riesgo: 42 },
  })
}
