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
interface Producto {
  id: string; nombre: string; ticker: string | null; categoria: string; unidad: string; contrato: string; rol_espana: string; color: string
  fred_slug?: string | null; agrifood_sector?: string | null; hs_chapter?: string | null; hs4?: string | null; demanda_label?: string | null
}

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
const TABS_VALIDOS = ['global', 'precios', 'cadena', 'produccion', 'demanda', 'politica', 'sequia']
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

// ─── Agro v4 · campos de fuentes adicionales (FRED, EU agri-food, HS comercio) ─
const AGRIFOOD_SECTORS = ['cereal', 'oilseeds', 'beef', 'pigmeat', 'poultry', 'eggs', 'dairy', 'sugar', 'oliveoil', 'wine', 'fruitAndVegetable', 'rice']
for (const p of PROD) {
  // Las 5 claves nuevas deben EXISTIR (aunque sean null) para una forma homogénea.
  for (const k of ['fred_slug', 'agrifood_sector', 'hs_chapter', 'hs4', 'demanda_label'] as const) {
    ok(k in p, `Producto ${p.id}: campo v4 '${k}' presente`)
  }
  if (p.hs4 != null) {
    ok(/^\d{4}$/.test(p.hs4), `Producto ${p.id}: hs4 es código de 4 dígitos (${p.hs4})`)
    ok(typeof p.demanda_label === 'string' && p.demanda_label!.length > 3, `Producto ${p.id}: con hs4 → demanda_label descrito`)
    ok(typeof p.hs_chapter === 'string' && /^\d{2}$/.test(p.hs_chapter!), `Producto ${p.id}: hs_chapter de 2 dígitos`)
  }
  if (p.agrifood_sector != null) {
    ok(AGRIFOOD_SECTORS.includes(p.agrifood_sector), `Producto ${p.id}: agrifood_sector válido (${p.agrifood_sector})`)
  }
}
// Cobertura mínima de comercio: la mayoría de productos agro-comerciables tienen HS4.
ok(PROD.filter((p) => p.hs4 != null).length >= 14, 'Productos: al menos 14 con código HS4 para demanda por país')
// Cobertura FRED para histórico largo.
ok(PROD.filter((p) => p.fred_slug != null).length >= 10, 'Productos: al menos 10 con serie FRED (histórico IMF)')
// Los inputs energéticos (gas, brent) NO deben tener HS agro (no son agroalimentarios).
const gas = PROD.find((p) => p.id === 'gas_natural')
const brent = PROD.find((p) => p.id === 'brent')
ok(gas != null && gas.hs4 == null, 'gas_natural: sin HS4 (input energético, no agroalimentario)')
ok(brent != null && brent.hs4 == null, 'brent: sin HS4 (input energético, no agroalimentario)')

// ─── Agro v5 · empresas productoras + PAC + legislación ──────────
interface EmpresaProd { id: string; nombre: string; tipo: string; productos: string[]; ccaa: string; rol: string; web?: string }
const empProdJson = loadJson<{ _meta: { descripcion?: string; actualizado?: string }; empresas: EmpresaProd[] }>('empresas-productoras.json')
const EMPPROD = empProdJson.empresas
ok(EMPPROD.length >= 18, `Empresas productoras: al menos 18 (${EMPPROD.length})`)
ok(EMPPROD.some((e) => e.tipo === 'cooperativa'), 'Empresas productoras: incluye cooperativas')
ok(EMPPROD.some((e) => e.tipo === 'sa'), 'Empresas productoras: incluye S.A.')
for (const e of EMPPROD) {
  ok(['cooperativa', 'sa', 'federacion', 'sat', 'mutua', 'otro'].includes(e.tipo), `EmpProd ${e.id}: tipo válido (${e.tipo})`)
  ok(Array.isArray(e.productos) && e.productos.length >= 1, `EmpProd ${e.id}: al menos 1 producto`)
  ok(typeof e.rol === 'string' && e.rol.length > 15, `EmpProd ${e.id}: rol descrito`)
  if (e.web) ok(/^https?:\/\//.test(e.web), `EmpProd ${e.id}: web es URL`)
}
for (const id of ['dcoop', 'coren', 'anecoop', 'ebro_foods', 'vall_companys']) ok(EMPPROD.some((e) => e.id === id), `EmpProd: incluye ${id}`)

const pacJson = loadJson<{ _meta: { periodo: string; total_eur: number; fuentes: string[] }; pilares: Array<{ nombre: string; eur?: number; nota: string }>; ecorregimenes: Array<{ nombre: string; practica: string }> }>('pac-detalle.json')
ok(pacJson._meta.total_eur > 40e9 && pacJson._meta.total_eur < 60e9, 'PAC: total España 40-60 bn €')
ok(pacJson.pilares.length >= 3, `PAC: al menos 3 pilares (${pacJson.pilares.length})`)
ok(pacJson.ecorregimenes.length >= 6, `PAC: al menos 6 ecorregímenes (${pacJson.ecorregimenes.length})`)
for (const e of pacJson.ecorregimenes) ok(e.practica.length > 20, `Ecorregimen ${e.nombre}: práctica descrita`)

interface Norma { titulo: string; tipo: string; ambito: string; estado: string; resumen: string; url?: string }
const legisJson = loadJson<{ _meta: object; normas: Norma[] }>('legislacion-agro.json')
ok(legisJson.normas.length >= 10, `Legislación: al menos 10 normas (${legisJson.normas.length})`)
ok(legisJson.normas.some((n) => n.ambito === 'es'), 'Legislación: incluye normativa española')
ok(legisJson.normas.some((n) => n.ambito === 'ue'), 'Legislación: incluye normativa UE')
for (const n of legisJson.normas) {
  ok(['es', 'ue'].includes(n.ambito), `Norma "${n.titulo.slice(0, 30)}": ámbito válido`)
  ok(n.resumen.length > 25, `Norma "${n.titulo.slice(0, 30)}": resumen informativo`)
  if (n.url) ok(/^https?:\/\//.test(n.url), `Norma "${n.titulo.slice(0, 30)}": url válida`)
}
ok(legisJson.normas.some((n) => n.titulo.includes('12/2013')), 'Legislación: incluye Ley 12/2013 cadena alimentaria')
ok(legisJson.normas.some((n) => n.titulo.includes('2021/2115')), 'Legislación: incluye Reglamento PAC 2021/2115')

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
