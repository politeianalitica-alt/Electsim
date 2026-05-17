/**
 * Generador de trazabilidad legislativa.
 *
 * Para iniciativas del Congreso: usa TRAMITACIONSEGUIDA real (campo del open data
 * que contiene los pasos cronológicos con fechas separados por \n).
 *
 * Para Senado y CCAA: sintetiza desde el estado actual + fechas conocidas.
 */

import type {
  LegislativeInitiative,
  InitiativeTraceability,
  TraceStep,
  Stage,
} from './types'
import { fetchCongresoInitiativeDetail } from './congreso'
import { summarizeDocument } from '@/lib/documents'

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

function addDays(iso: string | null, days: number): string | null {
  if (!iso) return null
  try {
    const d = new Date(iso)
    d.setDate(d.getDate() + days)
    return d.toISOString().slice(0, 10)
  } catch { return null }
}

/**
 * Parsea una línea de TRAMITACIONSEGUIDA del Congreso.
 * Formato típico: "DD/MM/YYYY - Descripción del paso. Órgano: XXX. Resultado: ..."
 */
function parseTramitacionLine(line: string): { date: string | null; description: string; forum: string } {
  // Buscar fecha DD/MM/YYYY al inicio
  const dateMatch = line.match(/^(\d{2})\/(\d{2})\/(\d{4})\s*[-.:]?\s*/)
  let date: string | null = null
  let rest = line
  if (dateMatch) {
    date = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`
    rest = line.slice(dateMatch[0].length).trim()
  }
  // Buscar órgano
  const forumMatch = rest.match(/Órgano:\s*([^.]+?)(?:\.|$)/i) || rest.match(/Comisión[^.]*?:\s*([^.]+?)(?:\.|$)/i)
  const forum = forumMatch ? forumMatch[1].trim() : 'Cámara'
  return { date, description: rest, forum }
}

function inferStepKindFromText(text: string): import('./types').TraceStepKind {
  const t = text.toLowerCase()
  if (/publicad.*boe/.test(t)) return 'publicacion-boe'
  if (/aprobad.*pleno|aprobad.*definitiv/.test(t)) return 'aprobacion-final'
  if (/sancion.*real|sanci[oó]n.*rey/.test(t)) return 'sancion-real'
  if (/remit.*senado|remit.*cámara/.test(t)) return 'remision-camara'
  if (/votaci[oó]n.*pleno/.test(t)) return 'pleno-votacion'
  if (/debate.*pleno/.test(t)) return 'pleno-debate'
  if (/dictamen/.test(t)) return 'dictamen-comision'
  if (/ponenci/.test(t)) return 'ponencia'
  if (/comparece/.test(t)) return 'comparecencias'
  if (/enmienda.*articulado/.test(t)) return 'enmiendas-articulado'
  if (/enmienda.*totalidad|enmiendas/.test(t)) return 'enmiendas-totalidad'
  if (/toma.*consideraci/.test(t)) return 'toma-consideracion'
  if (/calific/.test(t)) return 'calificacion'
  if (/present|registr/.test(t)) return 'presentacion'
  if (/recurso.*inconstituc/.test(t)) return 'recurso-inconstitucionalidad'
  if (/sentencia.*tc|tribunal constituc/.test(t)) return 'sentencia-tc'
  return 'otro'
}

/**
 * Trazabilidad para iniciativas del Congreso usando TRAMITACIONSEGUIDA real.
 */
async function buildCongresoTraceability(init: LegislativeInitiative): Promise<InitiativeTraceability | null> {
  if (!init.expediente) return null
  const detail = await fetchCongresoInitiativeDetail(init.expediente)
  if (!detail || detail.tramitacionSeguida.length === 0) return null

  // Parsear cada línea de TRAMITACIONSEGUIDA en un step real
  const steps: TraceStep[] = detail.tramitacionSeguida.map((line, i) => {
    const parsed = parseTramitacionLine(line)
    return {
      order: i + 1,
      kind: inferStepKindFromText(parsed.description),
      label: parsed.description.length > 100 ? parsed.description.slice(0, 97) + '…' : parsed.description,
      date: parsed.date,
      forum: parsed.forum,
      outcome: 'Completado',
      url: null,
    } satisfies TraceStep
  })

  // Añadir enlaces a BOCG con metadata real extraída del PDF si es posible
  const enlacesUrls = detail.enlacesBOCG
    .map(s => s.match(/https?:\/\/\S+/)?.[0])
    .filter((u): u is string => !!u)
    .slice(0, 5)

  for (const bocgUrl of enlacesUrls) {
    let label = 'Publicación BOCG'
    // Intentar enriquecer con metadata real del PDF
    try {
      const summary = await summarizeDocument({ url: bocgUrl, format: 'pdf' })
      if (summary.metadata.title) {
        label = `BOCG · ${summary.metadata.title.slice(0, 80)}`
      } else if (summary.units > 0) {
        label = `BOCG · ${summary.units} páginas`
      }
    } catch {/* fallback */}
    steps.push({
      order: steps.length + 1,
      kind: 'otro',
      label,
      date: null,
      forum: 'Boletín Oficial de las Cortes Generales',
      outcome: 'Disponible',
      url: bocgUrl,
    })
  }

  // Lo mismo para Diarios de Sesiones
  const dsUrls = detail.enlacesDS
    .map(s => s.match(/https?:\/\/\S+/)?.[0])
    .filter((u): u is string => !!u)
    .slice(0, 3)
  for (const dsUrl of dsUrls) {
    let label = 'Diario de Sesiones'
    try {
      const summary = await summarizeDocument({ url: dsUrl, format: 'pdf' })
      if (summary.units > 0) {
        label = `DS · ${summary.units} páginas` + (summary.metadata.title ? ` · ${summary.metadata.title.slice(0, 60)}` : '')
      }
    } catch {/* fallback */}
    steps.push({
      order: steps.length + 1,
      kind: 'pleno-debate',
      label,
      date: null,
      forum: 'Diario de Sesiones',
      outcome: 'Disponible',
      url: dsUrl,
    })
  }

  // Añadir pasos pendientes hasta publicación
  const currentIdx = stageIndex(init.stage)
  for (let i = currentIdx + 1; i < STAGE_ORDER.length; i++) {
    const stage = STAGE_ORDER[i]
    if (init.stage === 'rechazado' || init.stage === 'caducado') break
    const meta = STAGE_TO_TRACE[stage]
    if (!meta) continue
    steps.push({
      order: steps.length + 1,
      kind: meta.kind,
      label: meta.label,
      date: null,
      forum: meta.forum,
      outcome: 'Pendiente',
      url: null,
    })
  }

  const startDate = init.fechaRegistro
  const daysSinceStart = startDate
    ? Math.floor((Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))
    : null

  const next = steps.find(s => s.outcome === 'Pendiente')

  return {
    initiative: { ...init, titulo: detail.objeto, promotor: detail.autor.split('\n')[0] || init.promotor },
    steps,
    summary: {
      totalSteps: steps.length,
      currentStage: init.stage,
      daysSinceStart,
      nextExpected: next?.label || null,
    },
  }
}

/**
 * Trazabilidad sintetizada para Senado/CCAA cuando no hay TRAMITACIONSEGUIDA.
 */
function buildSyntheticTraceability(init: LegislativeInitiative): InitiativeTraceability {
  const steps: TraceStep[] = []
  const startDate = init.fechaRegistro || init.fechaActualizacion
  const currentIdx = stageIndex(init.stage)

  for (let i = 0; i <= currentIdx; i++) {
    const stage = STAGE_ORDER[i]
    const meta = STAGE_TO_TRACE[stage]
    if (!meta) continue
    const estimatedDays = i * 14
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

export async function buildTraceability(init: LegislativeInitiative): Promise<InitiativeTraceability> {
  // Para Congreso: intentar usar TRAMITACIONSEGUIDA real
  if (init.ambito === 'nacional-congreso') {
    const real = await buildCongresoTraceability(init)
    if (real) return real
  }
  return buildSyntheticTraceability(init)
}
