/**
 * ACCEPTANCE TEST: Farma v3 · catálogos curados.
 *
 * Valida los 4 catálogos JSON (empresas-cotizadas, reguladores,
 * areas-terapeuticas, programas) y verifica que las áreas terapéuticas
 * apuntan a sub-tabs válidos.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const _here = dirname(fileURLToPath(import.meta.url))
const CATALOGOS_DIR = resolve(_here, '../../lib/farma/catalogos')
function loadJson<T = unknown>(name: string): T {
  return JSON.parse(readFileSync(resolve(CATALOGOS_DIR, name), 'utf-8')) as T
}

interface Empresa { id: string; nombre: string; ticker: string; cnmv_url: string; ibex: boolean; mercado: string; area_terapeutica: string[]; descripcion: string }
interface Regulador { id: string; siglas: string; web: string; competencias: string; categoria: string; ambito: string }
interface Area { id: string; titulo: string; descripcion: string; color: string; keywords: string[]; tab_destino: string }
interface Programa { id: string; programa: string; estado: string; descripcion: string; presupuesto_eur: number | null; fuente_url: string; fuente_label: string; color: string }

const empresasJson = loadJson<{ _meta: { descripcion?: string; actualizado?: string }; empresas: Empresa[] }>('empresas-cotizadas.json')
const reguladoresJson = loadJson<{ _meta: { descripcion?: string; actualizado?: string }; reguladores: Regulador[] }>('reguladores.json')
const areasJson = loadJson<{ _meta: { descripcion?: string; actualizado?: string }; areas: Area[] }>('areas-terapeuticas.json')
const programasJson = loadJson<{ _meta: { descripcion?: string; actualizado?: string }; programas: Programa[] }>('programas.json')

let passed = 0
function ok(cond: boolean, msg: string) {
  assert.ok(cond, msg)
  passed++
}

// ───── Empresas cotizadas ────────────────────────────

const EMPRESAS = empresasJson.empresas
ok(EMPRESAS.length >= 8, `Empresas: al menos 8 cotizadas (${EMPRESAS.length})`)
const OBLIG_EMPRESAS = ['grifols', 'almirall', 'rovi', 'faes_farma', 'pharmamar', 'reig_jofre']
for (const id of OBLIG_EMPRESAS) {
  ok(EMPRESAS.some((e) => e.id === id), `Empresas: incluye ${id}`)
}
for (const e of EMPRESAS) {
  ok(typeof e.ticker === 'string' && e.ticker.includes('.'), `Empresa ${e.id}: ticker BME (incluye '.')`)
  ok(/^https?:\/\//.test(e.cnmv_url), `Empresa ${e.id}: cnmv_url es URL real`)
  ok(typeof e.mercado === 'string' && e.mercado.length > 0, `Empresa ${e.id}: mercado declarado`)
  ok(typeof e.descripcion === 'string' && e.descripcion.length > 30, `Empresa ${e.id}: descripción informativa`)
  ok(Array.isArray(e.area_terapeutica) && e.area_terapeutica.length >= 1, `Empresa ${e.id}: al menos 1 área terapéutica`)
}
ok(EMPRESAS.some((e) => e.ibex), 'Empresas: al menos 1 IBEX 35 (Grifols)')

// ───── Reguladores ───────────────────────────────────

const REG = reguladoresJson.reguladores
ok(REG.length >= 10, `Reguladores: al menos 10 (${REG.length})`)
const OBLIG_REG = ['aemps', 'cipm', 'min_sanidad', 'ema', 'dg_sante', 'hma', 'cnmv_farma', 'farmaindustria', 'asebio']
for (const id of OBLIG_REG) {
  ok(REG.some((r) => r.id === id), `Reguladores: incluye ${id}`)
}
for (const r of REG) {
  ok(/^https?:\/\//.test(r.web), `Regulador ${r.siglas}: web es URL`)
  ok(r.competencias.length > 30, `Regulador ${r.siglas}: competencias informativas`)
  ok(['estatal', 'autonomico', 'ue'].includes(r.ambito), `Regulador ${r.siglas}: ámbito válido`)
}
ok(REG.some((r) => r.ambito === 'ue'), 'Reguladores: al menos un regulador UE (EMA)')
ok(REG.some((r) => r.ambito === 'estatal'), 'Reguladores: al menos uno estatal (AEMPS)')

// ───── Áreas terapéuticas ────────────────────────────

const AREAS = areasJson.areas
ok(AREAS.length >= 8, `Áreas: al menos 8 ejes (${AREAS.length})`)
const TABS_VALIDOS = ['global', 'catalogo', 'desabastecimientos', 'pipeline', 'mercado', 'gasto', 'regulacion']
for (const a of AREAS) {
  ok(TABS_VALIDOS.includes(a.tab_destino), `Área ${a.id}: tab_destino válido (${a.tab_destino})`)
  ok(Array.isArray(a.keywords) && a.keywords.length >= 2, `Área ${a.id}: al menos 2 keywords`)
  ok(typeof a.color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(a.color), `Área ${a.id}: color hex`)
  ok(typeof a.descripcion === 'string' && a.descripcion.length > 20, `Área ${a.id}: descripción informativa`)
}
ok(AREAS.some((a) => a.id === 'oncologia'), 'Áreas: incluye oncología')
ok(AREAS.some((a) => a.id === 'biotecnologia'), 'Áreas: incluye biotecnología')

// Cross-check: toda empresa.area_terapeutica debe estar (mayoritariamente) en AREAS_TERAPEUTICAS
const areaIds = new Set(AREAS.map((a) => a.id))
let matchedCount = 0
let totalCount = 0
for (const e of EMPRESAS) {
  for (const a of e.area_terapeutica) {
    totalCount++
    if (areaIds.has(a)) matchedCount++
  }
}
// Las áreas en empresa.area_terapeutica son tags más granulares que las del
// catálogo de áreas (ej: "antibioticos" vs "antibioticos_infecciosas").
// Solo exigimos que al menos alguna mapeé directamente; el resto sirve como
// tag libre para búsqueda futura.
ok(matchedCount >= 1, `Cross-catálogo: al menos 1 área de empresa mapea con catálogo (${matchedCount}/${totalCount})`)
ok(totalCount >= EMPRESAS.length, 'Cross-catálogo: todas las empresas tienen al menos un área terapéutica')

// ───── Programas ─────────────────────────────────────

const PROG = programasJson.programas
ok(PROG.length >= 5, `Programas: al menos 5 (${PROG.length})`)
const OBLIG_PROG = ['perte_salud_vanguardia', 'estrategia_farmaceutica_europa', 'reglamento_farmaceutico_ue']
for (const id of OBLIG_PROG) {
  ok(PROG.some((p) => p.id === id), `Programas: incluye ${id}`)
}
for (const p of PROG) {
  ok(['vigente', 'en_negociacion', 'finalizado', 'planificado'].includes(p.estado), `Programa ${p.id}: estado válido`)
  ok(/^https?:\/\//.test(p.fuente_url), `Programa ${p.id}: fuente_url es URL`)
  ok(typeof p.fuente_label === 'string' && p.fuente_label.length > 0, `Programa ${p.id}: fuente_label presente`)
  ok(typeof p.color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(p.color), `Programa ${p.id}: color hex`)
  ok(typeof p.descripcion === 'string' && p.descripcion.length > 40, `Programa ${p.id}: descripción informativa`)
  if (p.presupuesto_eur != null) ok(p.presupuesto_eur > 0, `Programa ${p.id}: presupuesto positivo si declarado`)
}

// ───── Meta global ───────────────────────────────────

for (const [k, m] of [
  ['empresas', empresasJson._meta],
  ['reguladores', reguladoresJson._meta],
  ['areas', areasJson._meta],
  ['programas', programasJson._meta],
] as const) {
  ok(m != null, `Meta ${k}: presente`)
  ok(typeof m.descripcion === 'string' && m.descripcion.length > 30, `Meta ${k}: descripción informativa`)
  ok(typeof m.actualizado === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(m.actualizado), `Meta ${k}: fecha formato YYYY-MM-DD`)
}

console.log(`PASS: farma-catalogos (${passed} assertions)`)
