/**
 * Agregador unificado de iniciativas y comisiones legislativas españolas.
 * Caché 30 min para iniciativas, 6h para comisiones.
 */

import type { LegislativeInitiative, Commission } from './types'
import { fetchCongresoInitiatives, fetchCongresoComisiones } from './congreso'
import { fetchSenadoInitiatives, fetchSenadoComisiones, fetchSenadoApprovedLaws } from './senado'
import { fetchCCAAInitiatives } from './ccaa-parliaments'
import { fetchAllCCAACommissions } from './ccaa-commissions'

interface Cache<T> { ts: number; data: T }
const TTL_MS = 30 * 60 * 1000
const COMM_TTL_MS = 6 * 60 * 60 * 1000
let initCache: Cache<LegislativeInitiative[]> | null = null
let comisCache: Cache<Commission[]> | null = null

export async function getAllInitiatives(): Promise<{
  initiatives: LegislativeInitiative[]
  stats: {
    total: number
    porAmbito: Record<string, number>
    porKind: Record<string, number>
    porMateria: Record<string, number>
    porStage: Record<string, number>
    porCCAA: Record<string, number>
    enTramitacion: number
    aprobadas: number
    fetchedAt: string
    sourcesOk: Record<string, number>
  }
}> {
  if (initCache && Date.now() - initCache.ts < TTL_MS) {
    return { initiatives: initCache.data, stats: computeStats(initCache.data) }
  }

  const settled = await Promise.allSettled([
    fetchCongresoInitiatives(),
    fetchSenadoInitiatives(),
    fetchCCAAInitiatives(40),
  ])
  const sourcesOk: Record<string, number> = {
    congreso: settled[0].status === 'fulfilled' ? (settled[0].value as LegislativeInitiative[]).length : 0,
    senado:   settled[1].status === 'fulfilled' ? (settled[1].value as LegislativeInitiative[]).length : 0,
    ccaa:     settled[2].status === 'fulfilled' ? (settled[2].value as LegislativeInitiative[]).length : 0,
  }

  const initiatives: LegislativeInitiative[] = []
  for (const r of settled) {
    if (r.status === 'fulfilled') initiatives.push(...r.value)
  }

  const seen = new Map<string, LegislativeInitiative>()
  for (const it of initiatives) {
    if (!seen.has(it.id)) seen.set(it.id, it)
  }
  const unique = Array.from(seen.values())

  initCache = { ts: Date.now(), data: unique }
  return { initiatives: unique, stats: { ...computeStats(unique), sourcesOk } }
}

function computeStats(items: LegislativeInitiative[]) {
  const porAmbito: Record<string, number> = {}
  const porKind: Record<string, number> = {}
  const porMateria: Record<string, number> = {}
  const porStage: Record<string, number> = {}
  const porCCAA: Record<string, number> = {}
  let enTramitacion = 0
  let aprobadas = 0

  for (const it of items) {
    porAmbito[it.ambito] = (porAmbito[it.ambito] || 0) + 1
    porKind[it.kind] = (porKind[it.kind] || 0) + 1
    porMateria[it.materia] = (porMateria[it.materia] || 0) + 1
    porStage[it.stage] = (porStage[it.stage] || 0) + 1
    if (it.ccaa) porCCAA[it.ccaa] = (porCCAA[it.ccaa] || 0) + 1
    if (it.stage === 'aprobado' || it.stage === 'publicado') aprobadas++
    else if (it.stage !== 'rechazado' && it.stage !== 'caducado') enTramitacion++
  }

  return {
    total: items.length,
    porAmbito, porKind, porMateria, porStage, porCCAA,
    enTramitacion, aprobadas,
    fetchedAt: new Date().toISOString(),
    sourcesOk: {} as Record<string, number>,
  }
}

export async function getAllCommissions(): Promise<{
  commissions: Commission[]
  stats: {
    total: number
    porCamara: Record<string, number>
    porKind: Record<string, number>
    investigacion: number
    fetchedAt: string
  }
}> {
  if (comisCache && Date.now() - comisCache.ts < COMM_TTL_MS) {
    return { commissions: comisCache.data, stats: computeCommStats(comisCache.data) }
  }

  const settled = await Promise.allSettled([
    fetchCongresoComisiones(),
    fetchSenadoComisiones(),
    fetchAllCCAACommissions(),
  ])

  const all: Commission[] = []
  for (const r of settled) {
    if (r.status === 'fulfilled') all.push(...r.value)
  }

  comisCache = { ts: Date.now(), data: all }
  return { commissions: all, stats: computeCommStats(all) }
}

function computeCommStats(items: Commission[]) {
  const porCamara: Record<string, number> = {}
  const porKind: Record<string, number> = {}
  let investigacion = 0
  for (const c of items) {
    porCamara[c.camara] = (porCamara[c.camara] || 0) + 1
    porKind[c.kind] = (porKind[c.kind] || 0) + 1
    if (c.isInvestigation) investigacion++
  }
  return { total: items.length, porCamara, porKind, investigacion, fetchedAt: new Date().toISOString() }
}

export async function findInitiative(id: string): Promise<LegislativeInitiative | null> {
  const { initiatives } = await getAllInitiatives()
  return initiatives.find(it => it.id === id) || null
}

export async function findCommission(id: string): Promise<Commission | null> {
  const { commissions } = await getAllCommissions()
  return commissions.find(c => c.id === id) || null
}

export { fetchSenadoApprovedLaws }
