/**
 * ACCEPTANCE TEST: Agro v3 · catálogos curados.
 *
 * Valida los 5 catálogos JSON (empresas, reguladores, programas, áreas,
 * productos-agro).
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const _here = dirname(fileURLToPath(import.meta.url))
const CATALOGOS_DIR = resolve(_here, '../../lib/agro/catalogos')
function loadJson<T = unknown>(name: string): T {
  return JSON.parse(readFileSync(resolve(CATALOGOS_DIR, name), 'utf-8')) as T
}

interface Empresa { id: string; nombre: string; ticker: string | null; segmento: string; ibex: boolean; mercado: string; cnmv_url: string; web: string; cooperativa: boolean; descripcion: string }
interface Regulador { id: string; siglas: string; web: string; competencias: string; categoria: string; ambito: 'estatal' | 'autonomico' | 'ue' }
interface Programa { id: string; programa: string; estado: string; descripcion: string; presupuesto_eur: number | null; fuente_url: string; fuente_label: string; color: string }
interface Area { id: string; titulo: string; descripcion: string; color: string; keywords: string[]; tab_destino: string }
interface Producto { id: string; nombre: string; ticker: string | null; categoria: string; unidad: string; contrato: string; rol_espana: string; color: string }

const empresasJson = loadJson<{ _meta: { descripcion?: string; actualizado?: string }; empresas: Empresa[] }>('empresas.json')
const reguladoresJson = loadJson<{ _meta: { descripcion?: string; actualizado?: string }; reguladores: Regulador[] }>('reguladores.json')
const programasJson = loadJson<{ _meta: { descripcion?: string; actualizado?: string }; programas: Programa[] }>('programas.json')
const areasJson = loadJson<{ _meta: { descripcion?: string; actualizado?: string }; areas: Area[] }>('areas.json')
const productosJson = loadJson<{ _meta: { descripcion?: string; actualizado?: string }; categorias: Array<{ id: string }>; productos: Producto[] }>('productos-agro.json')

let passed = 0
function ok(cond: boolean, msg: string) {
  assert.ok(cond, msg)
  passed++
}

// ─── Empresas ────────────────────────────────────────
const EMP = empresasJson.empresas
ok(EMP.length >= 10, `Empresas: al menos 10 (${EMP.length})`)
const OBLIG_EMP = ['ebro_foods', 'viscofan', 'deoleo', 'borges', 'mercadona', 'damm']
for (const id of OBLIG_EMP) ok(EMP.some((e) => e.id === id), `Empresas: incluye ${id}`)
for (const e of EMP) {
  ok(typeof e.descripcion === 'string' && e.descripcion.length > 30, `Empresa ${e.id}: descripción informativa`)
  ok(/^https?:\/\//.test(e.cnmv_url), `Empresa ${e.id}: cnmv_url es URL`)
  ok(typeof e.mercado === 'string' && e.mercado.length > 0, `Empresa ${e.id}: mercado declarado`)
}
ok(EMP.some((e) => e.cooperativa), 'Empresas: al menos una cooperativa (Coren / COVAP / Anecoop)')
ok(EMP.some((e) => e.ticker == null), 'Empresas: al menos una no cotizada (Mercadona / Damm)')

// ─── Reguladores ─────────────────────────────────────
const REG = reguladoresJson.reguladores
ok(REG.length >= 10, `Reguladores: al menos 10 (${REG.length})`)
const OBLIG_REG = ['mapa', 'fega', 'aica', 'aesan', 'enesa', 'miteco', 'dg_agri', 'efsa', 'asaja', 'coag', 'upa']
for (const id of OBLIG_REG) ok(REG.some((r) => r.id === id), `Reguladores: incluye ${id}`)
for (const r of REG) {
  ok(/^https?:\/\//.test(r.web), `Regulador ${r.siglas}: web es URL`)
  ok(r.competencias.length > 30, `Regulador ${r.siglas}: competencias informativas`)
  ok(['estatal', 'autonomico', 'ue'].includes(r.ambito), `Regulador ${r.siglas}: ámbito válido`)
}
ok(REG.some((r) => r.ambito === 'ue'), 'Reguladores: al menos un regulador UE (DG AGRI o EFSA)')

// ─── Programas ───────────────────────────────────────
const PROG = programasJson.programas
ok(PROG.length >= 5, `Programas: al menos 5 (${PROG.length})`)
const OBLIG_PROG = ['pac_2023_2027', 'perte_agroalimentario', 'ley_cadena_alimentaria', 'plan_choque_sequia']
for (const id of OBLIG_PROG) ok(PROG.some((p) => p.id === id), `Programas: incluye ${id}`)
for (const p of PROG) {
  ok(/^https?:\/\//.test(p.fuente_url), `Programa ${p.id}: fuente_url es URL`)
  ok(typeof p.fuente_label === 'string' && p.fuente_label.length > 0, `Programa ${p.id}: fuente_label presente`)
  ok(typeof p.color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(p.color), `Programa ${p.id}: color hex`)
  if (p.presupuesto_eur != null) ok(p.presupuesto_eur > 0, `Programa ${p.id}: presupuesto positivo si declarado`)
}
// El presupuesto del PAC para España debe estar en torno a 47 bn €
const pac = PROG.find((p) => p.id === 'pac_2023_2027')
ok(pac != null && pac.presupuesto_eur != null && pac.presupuesto_eur > 40_000_000_000 && pac.presupuesto_eur < 60_000_000_000, 'PAC 2023-2027: presupuesto España entre 40 y 60 bn €')

// ─── Áreas ───────────────────────────────────────────
const AREAS = areasJson.areas
ok(AREAS.length >= 8, `Áreas: al menos 8 (${AREAS.length})`)
const TABS_VALIDOS = ['global', 'precios', 'cadena', 'produccion', 'politica', 'sequia']
for (const a of AREAS) {
  ok(TABS_VALIDOS.includes(a.tab_destino), `Área ${a.id}: tab_destino válido (${a.tab_destino})`)
  ok(Array.isArray(a.keywords) && a.keywords.length >= 2, `Área ${a.id}: al menos 2 keywords`)
}
ok(AREAS.some((a) => a.id === 'pac_ecoesquemas'), 'Áreas: incluye PAC ecorregímenes')
ok(AREAS.some((a) => a.id === 'sequia_agua'), 'Áreas: incluye sequía')

// ─── Productos agrícolas ─────────────────────────────
const PROD = productosJson.productos
const CATEG = productosJson.categorias.map((c) => c.id)
ok(PROD.length >= 15, `Productos agro: al menos 15 (${PROD.length})`)
const OBLIG_PROD = ['trigo_cbot', 'maiz_cbot', 'soja_cbot', 'porcino', 'azucar', 'cafe', 'cacao', 'gas_natural']
for (const id of OBLIG_PROD) ok(PROD.some((p) => p.id === id), `Productos: incluye ${id}`)
const CATEG_OBLIG = ['cereales', 'oleaginosas', 'ganado', 'softs', 'inputs']
for (const cid of CATEG_OBLIG) ok(CATEG.includes(cid), `Categorías: incluye ${cid}`)
for (const p of PROD) {
  ok(CATEG.includes(p.categoria), `Producto ${p.id}: categoría declarada en catálogo (${p.categoria})`)
  ok(typeof p.unidad === 'string' && p.unidad.length > 0, `Producto ${p.id}: unidad declarada`)
  ok(typeof p.contrato === 'string' && p.contrato.length > 20, `Producto ${p.id}: descripción contrato`)
  ok(typeof p.rol_espana === 'string' && p.rol_espana.length > 30, `Producto ${p.id}: rol España descrito`)
  ok(typeof p.color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(p.color), `Producto ${p.id}: color hex`)
}
ok(PROD.filter((p) => p.ticker != null).length >= 12, 'Productos: al menos 12 con ticker Yahoo')

// ─── Meta global ─────────────────────────────────────
for (const [k, m] of [
  ['empresas', empresasJson._meta],
  ['reguladores', reguladoresJson._meta],
  ['programas', programasJson._meta],
  ['areas', areasJson._meta],
  ['productos', productosJson._meta],
] as const) {
  ok(m != null, `Meta ${k}: presente`)
  ok(typeof m.descripcion === 'string' && m.descripcion.length > 30, `Meta ${k}: descripción informativa`)
  ok(typeof m.actualizado === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(m.actualizado), `Meta ${k}: fecha YYYY-MM-DD`)
}

console.log(`PASS: agro-catalogos (${passed} assertions)`)
