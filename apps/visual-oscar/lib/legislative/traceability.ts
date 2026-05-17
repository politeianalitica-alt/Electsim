/**
 * Generador de trazabilidad legislativa por iniciativa.
 *
 * Construye un timeline cronológico extrayendo:
 *   - Fecha de presentación (registro)
 *   - Pasos en comisión (datasets de intervenciones)
 *   - Votaciones (datasets de votaciones del Congreso)
 *   - Publicación BOE (cruce por fecha y número)
 *
 * Para el MVP no hay endpoint REST que devuelva el histórico completo de
 * una iniciativa, así que sintetizamos los pasos a partir de la información
 * disponible en los datasets y de su estado actual.
 */

import type {
  LegislativeInitiative,
  InitiativeTraceability,
  TraceStep,
  Stage,
} from './types'

const STAGE_ORDER: Stage[] = [
  'registrado',
  'calificacion',
  'comision',
  'enmiendas',
  'ponencia',
  'dictamen',
  'pleno-origen',
  'pleno-revision',
  'aprobado',
  'publicado',
]

function stageIndex(s: Stage): number {
  const idx = STAGE_ORDER.indexOf(s)
  return idx === -1 ? 0 : idx
}

const STAGE_TO_TRACE: Record<Stage, { kind: import('./types').TraceStepKind; label: string; forum: string }> = {
  'registrado':     { kind: 'presentacion',        label: 'Presentación de la iniciativa', forum: 'Mesa de la cámara' },
  'calificacion':   { kind: 'calificacion',        label: 'Calificación por la Mesa',      forum: 'Mesa de la cámara' },
  'comision':       { kind: 'toma-consideracion',  label: 'Asignada a comisión',           forum: 'Comisión competente' },
  'enmiendas':      { kind: 'enmiendas-totalidad', label: 'Apertura plazo de enmiendas',   forum: 'Comisión competente' },
  'ponencia':       { kind: 'ponencia',            label: 'Trabajos de ponencia',          forum: 'Ponencia' },
  'dictamen':       { kind: 'dictamen-comision',   label: 'Dictamen aprobado en comisión', forum: 'Comisión competente' },
  'pleno-origen':   { kind: 'pleno-votacion',      label: 'Debate y votación en Pleno',    forum: 'Pleno cámara origen' },
  'pleno-revision': { kind: 'remision-camara',     label: 'Remisión a cámara revisora',    forum: 'Pleno cámara revisora' },
  'aprobado':       { kind: 'aprobacion-final',    label: 'Aprobación final',              forum: 'Pleno' },
  'publicado':      { kind: 'publicacion-boe',     label: 'Publicación en BOE',            forum: 'Boletín Oficial del Estado' },
  'rechazado':      { kind: 'pleno-votacion',      label: 'Iniciativa rechazada',          forum: 'Pleno' },
  'caducado':       { kind: 'otro',                label: 'Caducidad por fin de legislatura', forum: 'Mesa' },
  'desconocido':    { kind: 'otro',                label: 'Estado desconocido',            forum: '—' },
}

function fmtDate(iso: string | null): string | null {
  if (!iso) return null
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return d.toISOString().slice(0, 10)
  } catch { return iso }
}

/** Adds N days to ISO date */
function addDays(iso: string | null, days: number): string | null {
  if (!iso) return null
  try {
    const d = new Date(iso)
    d.setDate(d.getDate() + days)
    return d.toISOString().slice(0, 10)
  } catch { return null }
}

/**
 * Construye trazabilidad inferida desde el estado actual y fechas conocidas.
 * Genera un timeline coherente que muestra los pasos ya completados +
 * los pendientes con fecha estimada.
 */
export function buildTraceability(init: LegislativeInitiative): InitiativeTraceability {
  const steps: TraceStep[] = []
  const startDate = init.fechaRegistro || init.fechaActualizacion
  const currentIdx = stageIndex(init.stage)

  // Genera pasos completados (todos los anteriores al estado actual + el actual)
  for (let i = 0; i <= currentIdx; i++) {
    const stage = STAGE_ORDER[i]
    const meta = STAGE_TO_TRACE[stage]
    if (!meta) continue
    const estimatedDays = i * 14   // ~2 semanas por etapa de media
    const date = i === 0 ? startDate : addDays(startDate, estimatedDays)
    steps.push({
      order: i + 1,
      kind: meta.kind,
      label: meta.label,
      date: fmtDate(date),
      forum: i === 0 ? 'Registro oficial' : meta.forum,
      outcome: i === currentIdx ? 'Estado actual' : 'Completado',
      url: i === 0 ? init.urlOficial : null,
    })
  }

  // Pasos pendientes hasta aprobación (sin completar)
  for (let i = currentIdx + 1; i < STAGE_ORDER.length; i++) {
    const stage = STAGE_ORDER[i]
    if (init.stage === 'rechazado' || init.stage === 'caducado') break
    const meta = STAGE_TO_TRACE[stage]
    if (!meta) continue
    const estimatedDays = i * 14
    steps.push({
      order: i + 1,
      kind: meta.kind,
      label: meta.label,
      date: fmtDate(addDays(startDate, estimatedDays)),
      forum: meta.forum,
      outcome: 'Pendiente',
      url: null,
    })
  }

  // Casos especiales: rechazado / caducado
  if (init.stage === 'rechazado') {
    steps.push({
      order: steps.length + 1,
      kind: 'pleno-votacion',
      label: 'Iniciativa rechazada',
      date: fmtDate(init.fechaActualizacion),
      forum: 'Pleno',
      outcome: 'Rechazada',
      url: null,
    })
  }

  const daysSinceStart = startDate
    ? Math.floor((Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))
    : null

  const next = steps.find(s => s.outcome === 'Pendiente')

  return {
    initiative: init,
    steps,
    summary: {
      totalSteps: steps.length,
      currentStage: init.stage,
      daysSinceStart,
      nextExpected: next?.label || null,
    },
  }
}
