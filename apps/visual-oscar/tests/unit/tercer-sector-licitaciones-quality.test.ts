/**
 * Tests: Licitaciones deterministic extraction quality.
 * Sprint TS-Deep B2 · Block 9.
 *
 * Validates:
 * - Document classification (PCAP/PPT/anuncio)
 * - CPV extraction
 * - Budget extraction (Spanish number format)
 * - Deadline extraction
 * - Criteria extraction with weights
 * - Solvency extraction
 * - Eligibility extraction (sin animo de lucro, clasificacion)
 * - Social clauses detection
 * - Lots extraction
 * - Aptitud ONG scoring with evidence
 *
 * Run: node --experimental-strip-types --no-warnings tests/unit/tercer-sector-licitaciones-quality.test.ts
 */
import assert from 'node:assert/strict'

import {
  classifyDocumento,
  prioritizeDocuments,
  parseSpanishNumber,
  extractCpv,
  extractBudget,
  extractPlazo,
  extractCriterios,
  extractSolvencia,
  extractElegibilidad,
  extractGarantias,
  extractClausulasSociales,
  extractLotes,
  extractDeterminista,
  scoreAptitudOng,
} from '../../lib/tercer-sector/analizar-determinista.ts'

// ─── Document classification ────────────────────────────────────────

assert.equal(classifyDocumento('PCAP_expediente_2024.pdf'), 'pcap')
assert.equal(classifyDocumento('Pliego de clausulas administrativas.docx'), 'pcap')
assert.equal(classifyDocumento('PPT_servicio_social.pdf'), 'ppt')
assert.equal(classifyDocumento('Prescripciones tecnicas.pdf'), 'ppt')
assert.equal(classifyDocumento('Anuncio de licitacion BOE.pdf'), 'anuncio')
assert.equal(classifyDocumento('Anexo I - Formularios.xlsx'), 'anexo')
assert.equal(classifyDocumento('Memoria justificativa.pdf'), 'memoria')
assert.equal(classifyDocumento('DEUC.pdf'), 'deuc')
assert.equal(classifyDocumento('documento_generico.pdf'), 'otro')

// ─── Document prioritization ────────────────────────────────────────

const docs = [
  { nombre: 'Anexo formularios.xlsx', url: '/1' },
  { nombre: 'PCAP.pdf', url: '/2' },
  { nombre: 'PPT.pdf', url: '/3' },
  { nombre: 'Anuncio.pdf', url: '/4' },
]
const sorted = prioritizeDocuments(docs)
assert.equal(sorted[0].nombre, 'PCAP.pdf', 'PCAP first')
assert.equal(sorted[1].nombre, 'PPT.pdf', 'PPT second')
assert.equal(sorted[2].nombre, 'Anuncio.pdf', 'Anuncio third')

// ─── Spanish number parsing ─────────────────────────────────────────

assert.equal(parseSpanishNumber('1.234.567,89'), 1234567.89)
assert.equal(parseSpanishNumber('250000'), 250000)
assert.equal(parseSpanishNumber('1.500,00'), 1500)
assert.equal(parseSpanishNumber(''), null)
assert.equal(parseSpanishNumber('abc'), null)

// ─── CPV extraction ─────────────────────────────────────────────────

const cpvs = extractCpv('CPV: 85311000-3, 85312000-0 y tambien 80000000-4')
assert.ok(cpvs.includes('85311000'), 'CPV 853 detected')
assert.ok(cpvs.includes('85312000'), 'CPV 853 second detected')
assert.ok(cpvs.includes('80000000'), 'CPV 80 detected')
assert.equal(cpvs.length, 3, 'exactly 3 unique CPVs')

const cpvNone = extractCpv('No hay codigos aqui')
assert.equal(cpvNone.length, 0, 'no CPV = empty')

// ─── Budget extraction ──────────────────────────────────────────────

const b1 = extractBudget('Presupuesto base de licitacion: 1.500.000,00 euros (IVA excluido)')
assert.equal(b1.presupuesto_base_eur, 1500000, 'presupuesto base extracted')

const b2 = extractBudget('Valor estimado del contrato: 2.000.000 EUR')
assert.equal(b2.valor_estimado_eur, 2000000, 'valor estimado extracted')

const b3 = extractBudget('Sin datos economicos')
assert.equal(b3.presupuesto_base_eur, null, 'no match = null')

// ─── Deadline extraction ────────────────────────────────────────────

const pl1 = extractPlazo('Plazo de presentacion de ofertas: hasta el 30/06/2030')
assert.equal(pl1.presentacion, '2030-06-30', 'DD/MM/YYYY extracted')
assert.ok(pl1.dias_restantes !== null && pl1.dias_restantes > 0, 'future = positive days')

const pl2 = extractPlazo('Plazo de ejecucion: 12 meses desde la formalizacion')
assert.equal(pl2.ejecucion, '12 meses', 'execution period extracted')

const pl3 = extractPlazo('Sin fechas')
assert.equal(pl3.presentacion, null, 'no dates = null')

// ─── Criteria extraction ────────────────────────────────────────────

const crit = extractCriterios(
  'Criterio 1: Oferta economica - 60 puntos\n' +
  'Criterio 2: Propuesta tecnica - 30 puntos\n' +
  'Criterio 3: Clausulas sociales - 10 puntos',
)
assert.equal(crit.length, 3, '3 criteria')
assert.equal(crit[0].tipo, 'precio', 'oferta economica = precio')
assert.equal(crit[0].peso, 60, 'peso 60')
assert.equal(crit[2].tipo, 'social', 'clausulas sociales = social')
assert.equal(crit[2].peso, 10, 'peso 10')

// ─── Solvencia extraction ───────────────────────────────────────────

const solv = extractSolvencia(
  'Solvencia economica: cifra de negocios anual de 500.000 euros. ' +
  'Solvencia tecnica: experiencia en servicios similares en los ultimos 3 anos. ' +
  'Se exige certificado ISO 9001.',
)
assert.equal(solv.economica_importe_min_eur, 500000, 'economic solvency amount')
assert.ok(solv.tecnica !== null, 'technical solvency text')
assert.ok(solv.certificados.includes('ISO 9001'), 'ISO certificate detected')

// ─── Eligibility extraction ────────────────────────────────────────

const eleg1 = extractElegibilidad(
  'Podran concurrir personas juridicas publicas o privadas, incluidas entidades sin animo de lucro. ' +
  'No se exige clasificacion empresarial. Se permite la subcontratacion.',
)
assert.equal(eleg1.admite_entidades_sin_animo_lucro, true, 'nonprofit allowed')
assert.equal(eleg1.requiere_clasificacion_empresarial, false, 'no clasificacion')
assert.equal(eleg1.permite_subcontratacion, true, 'subcontratacion allowed')

const eleg2 = extractElegibilidad(
  'Se exige clasificacion empresarial grupo C, subgrupo 4.',
)
assert.equal(eleg2.requiere_clasificacion_empresarial, true, 'clasificacion required')

// ─── Social clauses ─────────────────────────────────────────────────

const soc1 = extractClausulasSociales(
  'Condiciones especiales de ejecucion de caracter social: ' +
  'insercion sociolaboral de personas en situacion de exclusion social. ' +
  'Plan de igualdad obligatorio.',
)
assert.equal(soc1.tiene_clausulas_sociales, true, 'social clauses detected')
assert.ok(soc1.evidencias.length >= 2, 'at least 2 evidence snippets')

const soc2 = extractClausulasSociales('Sin clausulas especiales')
assert.equal(soc2.tiene_clausulas_sociales, false, 'no social clauses')

// ─── Lots extraction ────────────────────────────────────────────────

const lotes = extractLotes(
  'Lote 1: Servicio de atencion domiciliaria - 200.000 euros\n' +
  'Lote 2: Servicio de teleasistencia - 150.000 euros',
)
assert.equal(lotes.length, 2, '2 lots')
assert.equal(lotes[0].numero, '1', 'lot 1')
assert.equal(lotes[0].importe_eur, 200000, 'lot 1 amount')
assert.equal(lotes[1].numero, '2', 'lot 2')

// ─── Full deterministic extraction ──────────────────────────────────

const fullText =
  'Expediente: Servicio de atencion a personas con discapacidad. ' +
  'CPV: 85311000-3. ' +
  'Presupuesto base de licitacion: 500.000,00 euros. ' +
  'Plazo de presentacion de ofertas: hasta el 15/09/2030. ' +
  'Criterio 1: Propuesta tecnica - 60 puntos. ' +
  'Criterio 2: Oferta economica - 40 puntos. ' +
  'Solvencia economica: cifra de negocios de 200.000 euros. ' +
  'Podran concurrir entidades sin animo de lucro. ' +
  'Condiciones especiales de ejecucion de caracter social. ' +
  'Garantia definitiva: 5% del presupuesto. ' +
  'Lote 1: Zona Norte - 250.000 euros.'

const det = extractDeterminista(fullText)
assert.ok(det.campos_extraidos.includes('cpv'), 'CPV extracted')
assert.ok(det.campos_extraidos.includes('presupuesto_base_eur'), 'budget extracted')
assert.ok(det.campos_extraidos.includes('plazo_presentacion'), 'deadline extracted')
assert.ok(det.campos_extraidos.includes('criterios_adjudicacion'), 'criteria extracted')
assert.ok(det.campos_extraidos.includes('admite_sin_animo_lucro'), 'eligibility extracted')
assert.ok(det.campos_extraidos.includes('clausulas_sociales'), 'social clauses extracted')
assert.ok(det.campos_extraidos.includes('lotes'), 'lots extracted')
assert.ok(det.campos_extraidos.length >= 7, `at least 7 fields, got ${det.campos_extraidos.length}`)

// ─── Scoring: CPV 853 + entidades sin animo + criterios sociales => alto ──

const scoreAlto = scoreAptitudOng(det, {
  titulo: 'Servicio de atencion a personas con discapacidad',
  hasPcap: true,
  hasPpt: true,
  hasDocumentos: true,
})
assert.ok(scoreAlto.score >= 55, `score alto expected >=55, got ${scoreAlto.score}`)
assert.equal(scoreAlto.label, 'alta', 'alta for social CPV + nonprofit + quality criteria')
assert.ok(scoreAlto.razones.length >= 3, 'multiple reasons')
assert.ok(scoreAlto.blockers.length === 0, 'no blockers')

// ─── Scoring: obra publica + garantia + clasificacion => baja ───────

const obraText =
  'Obra publica de construccion de centro deportivo. ' +
  'Se exige clasificacion empresarial grupo C subgrupo 6. ' +
  'Garantia definitiva: 5% del presupuesto base. ' +
  'Presupuesto base de licitacion: 5.000.000 euros. ' +
  'Criterio: Oferta economica 80 puntos. Calidad tecnica 20 puntos.'

const detObra = extractDeterminista(obraText)
const scoreBajo = scoreAptitudOng(detObra, {
  titulo: 'Obra publica de construccion de centro deportivo',
  hasPcap: true,
  hasPpt: true,
  hasDocumentos: true,
})
assert.ok(scoreBajo.label === 'baja' || scoreBajo.label === 'incierta',
  `obra should be baja/incierta, got ${scoreBajo.label}`)
assert.ok(scoreBajo.blockers.length >= 1, 'has blockers')

// ─── Scoring: solo anuncio sin pliegos => incierta ──────────────────

const detMinimo = extractDeterminista('Anuncio de licitacion para servicios sociales.')
const scoreIncierto = scoreAptitudOng(detMinimo, {
  titulo: 'Servicios sociales',
  hasPcap: false,
  hasPpt: false,
  hasDocumentos: false,
})
assert.equal(scoreIncierto.label, 'incierta', 'no PCAP/PPT = incierta')
assert.ok(
  scoreIncierto.blockers.some((b) => b.includes('documentos')),
  'should flag missing documents',
)

// ─── PCAP/PPT prioritized over anexos ───────────────────────────────

const docsP = prioritizeDocuments([
  { nombre: 'Anexo I.pdf', url: '/a' },
  { nombre: 'PPT servicios.pdf', url: '/b' },
  { nombre: 'PCAP administrativas.pdf', url: '/c' },
])
assert.equal(docsP[0].url, '/c', 'PCAP first')
assert.equal(docsP[1].url, '/b', 'PPT second')
assert.equal(docsP[2].url, '/a', 'Anexo last')

console.log('PASS: tercer-sector-licitaciones-quality (48 assertions)')
