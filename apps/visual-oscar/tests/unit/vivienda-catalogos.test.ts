/**
 * ACCEPTANCE TEST: Vivienda v3 · catálogos curados.
 *
 * Valida que los 5 catálogos JSON (programas, reguladores, empresas,
 * areas-tematicas, ongs-vivienda, zmt-ccaa) cumplan las invariantes que
 * la UI espera. Sin estos invariantes, los componentes renderizarían
 * undefined o el principio Politeia "cada dato con fuente" se rompería.
 *
 * Ejecutar: node --experimental-strip-types --no-warnings tests/unit/vivienda-catalogos.test.ts
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

// Carga los JSON con fs (Node no soporta JSON imports sin import attributes
// y el index.ts del paquete los importa sin attributes porque está pensado
// para el bundler de Next.js; tolerable porque los tests son del propio paquete).
const _here = dirname(fileURLToPath(import.meta.url))
const CATALOGOS_DIR = resolve(_here, '../../lib/vivienda/catalogos')
function loadJson<T = unknown>(name: string): T {
  return JSON.parse(readFileSync(resolve(CATALOGOS_DIR, name), 'utf-8')) as T
}

const programasJson = loadJson<{ _meta: { descripcion?: string; actualizado?: string }; programas: Programa[] }>('programas.json')
const reguladoresJson = loadJson<{ _meta: { descripcion?: string; actualizado?: string }; reguladores: Regulador[] }>('reguladores.json')
const empresasJson = loadJson<{ _meta: { descripcion?: string; actualizado?: string }; empresas: Empresa[] }>('empresas.json')
const areasJson = loadJson<{ _meta: { descripcion?: string; actualizado?: string }; areas: AreaTematica[] }>('areas-tematicas.json')
const ongsJson = loadJson<{ _meta: { descripcion?: string; actualizado?: string }; ongs: OngVivienda[] }>('ongs-vivienda.json')
const zmtJson = loadJson<{ ccaa: Array<{ id: string; estado: string; zmt_declaradas: number | null; fuente_url: string }> }>('zmt-ccaa.json')

const PROGRAMAS = programasJson.programas
const REGULADORES = reguladoresJson.reguladores
const EMPRESAS = empresasJson.empresas
const AREAS_TEMATICAS = areasJson.areas
const ONGS_VIVIENDA = ongsJson.ongs
const CATALOGOS_META = {
  programas: programasJson._meta,
  reguladores: reguladoresJson._meta,
  empresas: empresasJson._meta,
  areas: areasJson._meta,
  ongs: ongsJson._meta,
}

interface Programa { id: string; programa: string; estado: string; descripcion: string; presupuesto_eur: number | null; fuente_url: string; fuente_label: string; color: string }
interface Regulador { id: string; siglas: string; web: string; competencias: string; categoria: string }
interface Empresa { id: string; ticker: string; cnmv_url: string }
interface AreaTematica { id: string; keywords: string[]; tab_destino: string }
interface OngVivienda { id: string; tipo: string; scope: string[]; keywords_bdns: string[]; web: string; ambito_geografico: string[] }

let passed = 0
function ok(cond: boolean, msg: string) {
  assert.ok(cond, msg)
  passed++
}

// ───── Programas ─────────────────────────────────────────────

ok(PROGRAMAS.length >= 5, 'Programas: al menos 5 entradas curadas')
for (const p of PROGRAMAS) {
  ok(typeof p.id === 'string' && p.id.length > 0, `Programa ${p.programa}: id válido`)
  ok(typeof p.programa === 'string' && p.programa.length > 0, `Programa ${p.id}: nombre válido`)
  ok(typeof p.descripcion === 'string' && p.descripcion.length > 40, `Programa ${p.id}: descripción informativa`)
  ok(typeof p.fuente_url === 'string' && /^https?:\/\//.test(p.fuente_url), `Programa ${p.id}: fuente_url es URL real`)
  ok(typeof p.fuente_label === 'string' && p.fuente_label.length > 0, `Programa ${p.id}: fuente_label presente`)
  ok(['vigente', 'mercado', 'finalizado', 'planificado'].includes(p.estado), `Programa ${p.id}: estado válido`)
  ok(typeof p.color === 'string' && /^#[0-9A-Fa-f]{6}$/.test(p.color), `Programa ${p.id}: color hex`)
  // presupuesto puede ser null pero si hay valor, debe ser positivo
  if (p.presupuesto_eur != null) ok(p.presupuesto_eur > 0, `Programa ${p.id}: presupuesto positivo si declarado`)
}

// ───── Reguladores ───────────────────────────────────────────

ok(REGULADORES.length >= 10, 'Reguladores: al menos 10 entradas (cubre el ecosistema institucional)')
const SIGLAS_OBLIGATORIAS = ['MIVAU', 'MITMA', 'SAREB', 'SEPES', 'BdE', 'CNMV', 'AVS', 'CGPJ', 'IDAE']
for (const sigla of SIGLAS_OBLIGATORIAS) {
  ok(REGULADORES.some((r) => r.siglas === sigla), `Reguladores: incluye ${sigla}`)
}
for (const r of REGULADORES) {
  ok(/^https?:\/\//.test(r.web), `Regulador ${r.siglas}: web es URL real`)
  ok(r.competencias.length > 30, `Regulador ${r.siglas}: competencias informativas`)
  ok(['ministerio', 'sociedad_publica', 'supervisor', 'asociacion_publica', 'asociacion_privada', 'corporacion_publica', 'agencia_publica'].includes(r.categoria), `Regulador ${r.siglas}: categoría válida`)
}

// ───── Empresas ──────────────────────────────────────────────

ok(EMPRESAS.length >= 8, 'Empresas: al menos 8 cotizadas representativas')
const SOCIMI_OBLIGATORIAS = ['colonial', 'merlin']
for (const id of SOCIMI_OBLIGATORIAS) {
  ok(EMPRESAS.some((e) => e.id === id), `Empresas: incluye SOCIMI ${id}`)
}
for (const e of EMPRESAS) {
  ok(typeof e.ticker === 'string' && e.ticker.includes('.'), `Empresa ${e.id}: ticker tiene formato BME (incluye '.')`)
  ok(/^https?:\/\//.test(e.cnmv_url), `Empresa ${e.id}: cnmv_url es URL`)
  // No inventar capitalización: si no hay web/ticker, otros campos deben llenarse
}

// ───── Áreas temáticas ───────────────────────────────────────

ok(AREAS_TEMATICAS.length >= 8, 'Áreas temáticas: al menos 8 ejes')
const TABS_VALIDOS = ['global', 'precios', 'mercado', 'alquiler', 'politica', 'social', 'turistica', 'sostenibilidad']
for (const a of AREAS_TEMATICAS) {
  ok(a.keywords.length >= 2, `Área ${a.id}: al menos 2 keywords`)
  ok(TABS_VALIDOS.includes(a.tab_destino), `Área ${a.id}: tab_destino válido (${a.tab_destino})`)
}

// ───── ONGs vivienda (BLOQUE PRINCIPAL del usuario) ──────────

ok(ONGS_VIVIENDA.length >= 10, 'ONGs vivienda: al menos 10 entradas curadas')
const ONGS_OBLIGATORIAS = ['provivienda', 'hogar_si', 'caritas_espanola', 'foessa']
for (const id of ONGS_OBLIGATORIAS) {
  ok(ONGS_VIVIENDA.some((o) => o.id === id), `ONGs: incluye ${id} (entidad de referencia)`)
}
for (const o of ONGS_VIVIENDA) {
  ok(o.scope.length >= 1, `ONG ${o.id}: al menos 1 scope`)
  ok(o.keywords_bdns.length >= 1, `ONG ${o.id}: keywords_bdns no vacío (necesario para cruce BDNS en V9)`)
  ok(/^https?:\/\//.test(o.web), `ONG ${o.id}: web es URL real`)
  ok(o.ambito_geografico.length >= 1, `ONG ${o.id}: ámbito geográfico definido`)
  ok(['asociacion', 'fundacion', 'confederacion', 'orden_religiosa', 'red_de_redes'].includes(o.tipo), `ONG ${o.id}: tipo válido`)
}

// ───── ZMT por CCAA ──────────────────────────────────────────

const ccaa = zmtJson.ccaa
ok(ccaa.length >= 17, `ZMT CCAA: cubre las 17 CCAA (${ccaa.length} entradas)`)
const ESTADOS_VALIDOS = ['activa', 'en_estudio', 'rechaza', 'no_aplica']
for (const c of ccaa) {
  ok(ESTADOS_VALIDOS.includes(c.estado), `CCAA ${c.id}: estado válido (${c.estado})`)
  ok(/^https?:\/\//.test(c.fuente_url), `CCAA ${c.id}: fuente_url es URL`)
  if (c.zmt_declaradas != null) ok(c.zmt_declaradas >= 0, `CCAA ${c.id}: ZMT >= 0 si declarado`)
}
ok(ccaa.some((c) => c.estado === 'activa'), 'ZMT CCAA: al menos una CCAA aplica la Ley 12/2023')
ok(ccaa.some((c) => c.estado === 'rechaza' || c.estado === 'no_aplica'), 'ZMT CCAA: refleja desacuerdo territorial real')

// ───── Meta global ───────────────────────────────────────────

const META_KEYS = ['programas', 'reguladores', 'empresas', 'areas', 'ongs']
for (const k of META_KEYS) {
  const meta = (CATALOGOS_META as Record<string, { descripcion?: string; actualizado?: string }>)[k]
  ok(meta != null, `Meta ${k}: presente`)
  ok(typeof meta.descripcion === 'string', `Meta ${k}: descripcion presente`)
  ok(typeof meta.actualizado === 'string', `Meta ${k}: fecha de actualización presente`)
}

// ───── Cross-catálogo: áreas-tematicas apuntan a sub-tabs reales ──

for (const a of AREAS_TEMATICAS) {
  ok(TABS_VALIDOS.includes(a.tab_destino), `Cross: área ${a.id} navega a tab válido`)
}

console.log(`PASS: vivienda-catalogos (${passed} assertions)`)
