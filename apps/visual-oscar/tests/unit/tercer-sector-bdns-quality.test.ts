/**
 * Tests: BDNS enrichment quality.
 * Sprint TS-Deep B1 · Block 9.
 *
 * Validates that:
 * - NIF classification is correct
 * - Sector detection is multi-match (not first-wins)
 * - Beneficiarios elegibles detection works
 * - Scoring is transparent and evidence-based
 * - "incierta" when data is insufficient
 *
 * Run: node --experimental-strip-types --no-warnings tests/unit/tercer-sector-bdns-quality.test.ts
 */
import assert from 'node:assert/strict'

import {
  classifyNifTipo,
  classifySectorTS,
  detectBeneficiariosElegibles,
  detectColectivoObjetivo,
  extractDeadline,
  extractImporte,
  scoreConvocatoriaOng,
  detectNivel,
  detectCcaa,
  enrichConcesion,
} from '../../lib/tercer-sector/bdns-enrichment.ts'

// ─── NIF classification ─────────────────────────────────────────────

assert.equal(classifyNifTipo('G12345678'), 'G', 'NIF G = asociacion/fundacion')
assert.equal(classifyNifTipo('R1234567A'), 'R', 'NIF R = entidad religiosa')
assert.equal(classifyNifTipo('F12345678'), 'F', 'NIF F = cooperativa')
assert.equal(classifyNifTipo('Q1234567A'), 'Q', 'NIF Q = organismo publico')
assert.equal(classifyNifTipo('A12345678'), 'A', 'NIF A = sociedad anonima')
assert.equal(classifyNifTipo('B12345678'), 'B', 'NIF B = sociedad limitada')
assert.equal(classifyNifTipo(null), null, 'null NIF')
assert.equal(classifyNifTipo(''), null, 'empty NIF')

// ─── Sector classification (multi-match) ────────────────────────────

const sectors1 = classifySectorTS('Programa de atencion a personas con discapacidad e infancia')
assert.ok(sectors1.includes('discapacidad'), 'detects discapacidad')
assert.ok(sectors1.includes('infancia_juventud'), 'detects infancia')
assert.ok(sectors1.length >= 2, 'multi-match, not first-wins')

const sectors2 = classifySectorTS('Subvencion para obras de rehabilitacion de edificios')
assert.ok(sectors2.includes('otro') || sectors2.length === 1, 'construction = otro or no social sector')

const sectors3 = classifySectorTS('Cooperacion internacional para refugiados')
assert.ok(sectors3.includes('cooperacion_internacional'), 'cooperacion detected')
assert.ok(sectors3.includes('migracion_refugio'), 'migracion/refugio detected')

const sectors4 = classifySectorTS('')
assert.deepEqual(sectors4, [], 'empty text = empty')

// ─── Colectivo detection ────────────────────────────────────────────

const cols1 = detectColectivoObjetivo('Atencion a menores no acompanados y personas con discapacidad')
assert.ok(cols1.includes('menores'), 'menores detected')
assert.ok(cols1.includes('personas_discapacidad'), 'discapacidad detected')

const cols2 = detectColectivoObjetivo('Programa general de actividades')
assert.deepEqual(cols2, ['general'], 'no specific group = general')

// ─── Beneficiarios elegibles ────────────────────────────────────────

const bene1 = detectBeneficiariosElegibles('Podran ser beneficiarias entidades sin animo de lucro y asociaciones declaradas de utilidad publica')
assert.ok(bene1.includes('entidades sin animo de lucro'), 'sin animo de lucro detected')
assert.ok(bene1.includes('asociaciones'), 'asociaciones detected')

const bene2 = detectBeneficiariosElegibles('Empresas y personas fisicas')
assert.ok(bene2.includes('empresas'), 'empresas detected')
assert.ok(bene2.includes('personas fisicas'), 'personas fisicas detected')
assert.ok(!bene2.includes('entidades sin animo de lucro'), 'no nonprofit mention')

// ─── Deadline extraction ────────────────────────────────────────────

const dl1 = extractDeadline('Plazo: hasta el 30 de junio de 2030', { fecha_fin_solicitud: null })
assert.equal(dl1.fecha_fin, '2030-06-30', 'Spanish date extracted')
assert.ok(dl1.dias_restantes !== null && dl1.dias_restantes > 0, 'future date has positive days')

const dl2 = extractDeadline(null, { fecha_fin_solicitud: '2025-01-01' })
assert.equal(dl2.fecha_fin, '2025-01-01', 'explicit field used')
assert.ok(dl2.dias_restantes !== null && dl2.dias_restantes < 0, 'past date has negative days')

const dl3 = extractDeadline(null, {})
assert.equal(dl3.fecha_fin, null, 'no data = null')
assert.equal(dl3.dias_restantes, null, 'no data = null')

// ─── Importe extraction ─────────────────────────────────────────────

assert.equal(extractImporte('Importe total: 1.500.000,00 euros'), 1_500_000, 'Spanish format')
assert.equal(extractImporte('Dotacion: 250000 EUR'), 250_000, 'plain number + EUR')
assert.equal(extractImporte('Sin datos economicos'), null, 'no match = null')
assert.equal(extractImporte(''), null, 'empty = null')

// ─── Nivel detection ────────────────────────────────────────────────

assert.equal(detectNivel('Ministerio de Derechos Sociales'), 'estatal')
assert.equal(detectNivel('Junta de Andalucia'), 'autonomico')
assert.equal(detectNivel('Ayuntamiento de Madrid'), 'local')
assert.equal(detectNivel('Universidad de Sevilla'), 'universitario')
assert.equal(detectNivel('Comision Europea'), 'ue')
assert.equal(detectNivel(null), 'otro')

// ─── CCAA detection ─────────────────────────────────────────────────

assert.equal(detectCcaa('Junta de Andalucia'), 'Andalucia')
assert.equal(detectCcaa('Generalitat Valenciana'), 'Comunitat Valenciana')
assert.equal(detectCcaa('Xunta de Galicia'), 'Galicia')
assert.equal(detectCcaa('Ministerio de Hacienda'), null, 'state-level = no CCAA')

// ─── Scoring: fundacion with social keywords => alta ────────────────

const scoreAlta = scoreConvocatoriaOng({
  titulo: 'Subvenciones para entidades de accion social con personas en situacion de vulnerabilidad',
  objeto: 'Financiacion de programas de atencion integral a personas sin hogar, migrantes y menores no acompanados',
  sectores_ts: ['accion_social', 'migracion_refugio', 'vivienda_sinhogarismo'],
  colectivo_objetivo: ['personas_sin_hogar', 'migrantes', 'menores'],
  beneficiarios_elegibles: ['entidades sin animo de lucro', 'asociaciones', 'fundaciones'],
  importe_total_eur: 500_000,
  dias_restantes: 30,
  fichaLeida: true,
  mrr: false,
  nivel: 'estatal',
})
assert.ok(scoreAlta.score >= 55, `score alta expected >=55, got ${scoreAlta.score}`)
assert.equal(scoreAlta.label, 'alta', 'alta label for strong social signal')
assert.ok(scoreAlta.razones.length >= 3, 'at least 3 reasons')

// ─── Scoring: ayuntamiento with social keyword => NOT classify as ONG beneficiaria ──

const scoreAyto = scoreConvocatoriaOng({
  titulo: 'Obras de accion social en el centro de mayores',
  objeto: null,
  sectores_ts: ['accion_social'],
  colectivo_objetivo: ['general'],
  beneficiarios_elegibles: ['administraciones publicas'],
  importe_total_eur: 2_000_000,
  dias_restantes: 15,
  fichaLeida: false,
  mrr: false,
  nivel: 'local',
})
// Should NOT be alta - only public admin beneficiaries
assert.ok(scoreAyto.label !== 'alta', `ayuntamiento-only should not be alta, got ${scoreAyto.label}`)
assert.ok(
  scoreAyto.riesgos.some((r) => r.includes('empresa') || r.includes('administracion') || r.includes('insuficientes')),
  'should flag risk for non-nonprofit beneficiaries',
)

// ─── Scoring: universidad publica => not tercer sector ──────────────

const scoreUni = scoreConvocatoriaOng({
  titulo: 'Subvencion para proyectos de investigacion universitaria',
  objeto: null,
  sectores_ts: ['investigacion_social'],
  colectivo_objetivo: ['general'],
  beneficiarios_elegibles: ['universidades'],
  importe_total_eur: null,
  dias_restantes: null,
  fichaLeida: false,
  mrr: false,
  nivel: 'estatal',
})
assert.ok(scoreUni.label !== 'alta', 'university-only should not be alta')

// ─── Scoring: entidades sin animo de lucro => score alto ────────────

const scoreNonprofit = scoreConvocatoriaOng({
  titulo: 'Convocatoria para entidades sin animo de lucro',
  objeto: 'Programas de voluntariado social',
  sectores_ts: ['voluntariado', 'accion_social'],
  colectivo_objetivo: ['general'],
  beneficiarios_elegibles: ['entidades sin animo de lucro'],
  importe_total_eur: 100_000,
  dias_restantes: 45,
  fichaLeida: true,
  mrr: false,
  nivel: 'estatal',
})
assert.ok(scoreNonprofit.score >= 55, `nonprofit expected >=55, got ${scoreNonprofit.score}`)

// ─── Scoring: sin plazo/importe => incierta ─────────────────────────

const scoreIncierta = scoreConvocatoriaOng({
  titulo: 'Convocatoria',
  objeto: null,
  sectores_ts: ['otro'],
  colectivo_objetivo: ['general'],
  beneficiarios_elegibles: [],
  importe_total_eur: null,
  dias_restantes: null,
  fichaLeida: false,
  mrr: false,
  nivel: 'otro',
})
assert.equal(scoreIncierta.label, 'incierta', 'no data = incierta, not alta')
assert.ok(
  scoreIncierta.riesgos.some((r) => r.includes('insuficientes')),
  'should flag insufficient data',
)

// ─── Concesion enrichment ───────────────────────────────────────────

const conc1 = enrichConcesion({
  codigo: '123',
  beneficiario: 'Fundacion Cruz Roja',
  nif: 'G12345678',
  importe_eur: 50_000,
  organo: 'Ministerio de Derechos Sociales',
})
assert.equal(conc1.es_tercer_sector, true, 'G NIF = tercer sector')
assert.equal(conc1.confianza_ts, 'alta', 'G NIF = alta confianza')
assert.equal(conc1.nivel, 'estatal', 'ministerio = estatal')

const conc2 = enrichConcesion({
  codigo: '456',
  beneficiario: 'Empresa de Construccion SA',
  nif: 'A98765432',
  importe_eur: 200_000,
  organo: 'Ayuntamiento de Sevilla',
})
assert.equal(conc2.es_tercer_sector, false, 'A NIF empresa = not TS')
assert.equal(conc2.nivel, 'local', 'ayuntamiento = local')

const conc3 = enrichConcesion({
  codigo: '789',
  beneficiario: 'Asociacion de Vecinos La Esperanza',
  nif: null,
  importe_eur: 5_000,
  organo: 'Junta de Andalucia',
})
assert.equal(conc3.es_tercer_sector, true, 'keyword asociacion without NIF = TS')
assert.equal(conc3.confianza_ts, 'media', 'keyword-only = media confianza')

console.log('PASS: tercer-sector-bdns-quality (27 assertions)')
