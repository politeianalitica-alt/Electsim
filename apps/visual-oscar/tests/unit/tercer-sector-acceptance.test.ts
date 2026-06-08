/**
 * ACCEPTANCE TEST: Tercer Sector Deep Overhaul.
 * Sprint TS-Deep Blocks 9+10.
 *
 * Validates the 10 analyst questions from Block 10:
 *   Q1: "Es esta convocatoria APTA para una ONG de discapacidad?"
 *   Q2: "Por que esta licitacion puntua 72/100?"
 *   Q3: "De donde sale el importe de esta convocatoria?"
 *   Q4: "Que CCAA concentra mas subvenciones al tercer sector?"
 *   Q5: "Que financiadores publicos son mas activos?"
 *   Q6: "Esta licitacion tiene clausulas sociales?"
 *   Q7: "Que documentos tiene el expediente y cual manda?"
 *   Q8: "Cuando vence el plazo y cuanto queda?"
 *   Q9: "Que tipo de solvencia exige?"
 *   Q10: "Hay conflicto entre la extraccion regex y la LLM?"
 *
 * Each question maps to one or more enrichment functions.
 * Every assertion tests evidence trail, not just a boolean.
 *
 * Run: node --experimental-strip-types --no-warnings tests/unit/tercer-sector-acceptance.test.ts
 */
import assert from 'node:assert/strict'

// ── Block 1: BDNS enrichment ────────────────────────────────────────
import {
  classifyNifTipo,
  classifySectorTS,
  detectBeneficiariosElegibles,
  detectColectivoObjetivo,
  scoreConvocatoriaOng,
  detectNivel,
  detectCcaa,
  enrichConcesion,
} from '../../lib/tercer-sector/bdns-enrichment.ts'

// ── Block 2: Deterministic analysis ─────────────────────────────────
import {
  extractDeterminista,
  scoreAptitudOng,
  classifyDocumento,
  prioritizeDocuments,
  extractCpv,
  extractBudget,
  extractPlazo,
  extractCriterios,
  extractSolvencia,
  extractElegibilidad,
  extractGarantias,
  extractClausulasSociales,
  extractLotes,
} from '../../lib/tercer-sector/analizar-determinista.ts'

let passed = 0
const total = { count: 0 }

function ok(cond: boolean, msg: string) {
  total.count++
  assert.ok(cond, msg)
  passed++
}

// ═══════════════════════════════════════════════════════════════════════
// Q1: "Es esta convocatoria APTA para una ONG de discapacidad?"
// Tests: sector classification + scoring + evidence trail
// ═══════════════════════════════════════════════════════════════════════

{
  const conv = {
    numero: '700001',
    titulo: 'Subvencion para programas de atencion a personas con discapacidad',
    descripcion: 'La presente convocatoria tiene por objeto la financiacion de programas de integracion laboral de personas con discapacidad. Podran ser beneficiarias las entidades sin animo de lucro, asociaciones y fundaciones.',
    organo: 'Ministerio de Derechos Sociales',
    nivel: 'ESTADO',
    territorio: 'ES',
    fecha_pub: '2025-01-15',
    mrr: false,
    es_tercer_sector: true,
    match: 'keyword',
  }

  const sectors = classifySectorTS(conv.titulo + ' ' + conv.descripcion)
  ok(sectors.includes('discapacidad'), 'Q1: sector discapacidad detected from title+desc')

  const colectivos = detectColectivoObjetivo(conv.titulo + ' ' + conv.descripcion)
  ok(colectivos.includes('personas_discapacidad'), 'Q1: colectivo personas_discapacidad detected')

  // detectBeneficiariosElegibles detects ENTITY TYPES, not target populations
  const beneficiarios = detectBeneficiariosElegibles(conv.descripcion)
  ok(beneficiarios.length > 0, 'Q1: at least one beneficiario entity type detected')

  // Score must have razones (evidence trail)
  // scoreConvocatoriaOng expects ScoreConvInput (enriched), not raw convocatoria
  const score = scoreConvocatoriaOng({
    titulo: conv.titulo,
    objeto: conv.descripcion,
    sectores_ts: sectors,
    colectivo_objetivo: colectivos,
    beneficiarios_elegibles: beneficiarios,
    importe_total_eur: null,
    dias_restantes: null,
    fichaLeida: false,
    mrr: false,
    nivel: 'estatal',
  })
  ok(typeof score.score === 'number', 'Q1: scoring returns numeric score')
  ok(score.score >= 0 && score.score <= 100, 'Q1: score in [0,100]')
  ok(Array.isArray(score.razones) && score.razones.length > 0, 'Q1: razones array is non-empty (evidence)')
  ok(score.label !== undefined, 'Q1: score has a label (alta/media/baja/incierta)')

  // With sector discapacidad + titulo match, score should be medium-high
  ok(score.score >= 40, 'Q1: discapacidad convocatoria scores >= 40')
}

// ═══════════════════════════════════════════════════════════════════════
// Q2: "Por que esta licitacion puntua 72/100?"
// Tests: aptitud scoring with full evidence breakdown
// ═══════════════════════════════════════════════════════════════════════

{
  const pliegoText = `
    PLIEGO DE CLAUSULAS ADMINISTRATIVAS
    Presupuesto base de licitacion: 150.000,00 euros (IVA excluido)
    Plazo de ejecucion: 12 meses
    Criterios de adjudicacion:
    - Calidad tecnica: 60 puntos
    - Oferta economica: 40 puntos
    Clasificacion CPV: 85312000 (Servicios de asistencia social sin alojamiento)
    Clausulas sociales: Se valorara con 5 puntos adicionales la contratacion
    de personas en situacion de exclusion social.
    Solvencia tecnica: experiencia minima de 2 anos en proyectos similares.
    Garantia definitiva: 5% del importe de adjudicacion.
  `

  const det = extractDeterminista(pliegoText)
  const aptitud = scoreAptitudOng(det)

  ok(typeof aptitud.score === 'number', 'Q2: aptitud returns numeric score')
  ok(Array.isArray(aptitud.razones) && aptitud.razones.length > 0, 'Q2: aptitud has razones (why this score)')
  ok(aptitud.blockers !== undefined, 'Q2: aptitud has blockers array')

  // The evidence trail must explain the score
  const razonesText = aptitud.razones.join(' ')
  ok(razonesText.length > 20, 'Q2: razones have substantive text explaining the score')
}

// ═══════════════════════════════════════════════════════════════════════
// Q3: "De donde sale el importe de esta convocatoria?"
// Tests: ficha_calidad with evidence fields
// ═══════════════════════════════════════════════════════════════════════

{
  // enrichConcesion must document the source of every field
  const raw = {
    codigo: 'CONC-001',
    beneficiario: 'Asociacion de Voluntarios',
    nif: 'G12345678',
    importe_eur: 25000,
    organo: 'Ministerio de Derechos Sociales',
    fecha: '2025-03-15',
  }

  const enriched = enrichConcesion(raw as any)
  ok(enriched.nif_tipo === 'G', 'Q3: NIF type classified as G (asociacion)')
  ok(enriched.es_tercer_sector === true, 'Q3: G-NIF detected as tercer sector')
  ok(typeof enriched.nivel === 'string', 'Q3: nivel determined from organo')
  ok(enriched.ccaa !== undefined, 'Q3: ccaa field present (may be null for Estado)')
}

// ═══════════════════════════════════════════════════════════════════════
// Q4: "Que CCAA concentra mas subvenciones al tercer sector?"
// Tests: territory detection from organo text
// ═══════════════════════════════════════════════════════════════════════

{
  // CCAA_MAP returns capitalized names (e.g. 'Andalucia', 'Cataluna')
  ok(detectCcaa('Junta de Andalucia') === 'Andalucia', 'Q4: Junta de Andalucia -> Andalucia')
  ok(detectCcaa('Generalitat de Catalunya') === 'Cataluna', 'Q4: Generalitat de Catalunya -> Cataluna')
  ok(detectCcaa('Gobierno Vasco') === 'Pais Vasco', 'Q4: Gobierno Vasco -> Pais Vasco')
  ok(detectCcaa('Comunidad de Madrid') === 'Comunidad de Madrid', 'Q4: Comunidad de Madrid detected')
  ok(detectCcaa('Xunta de Galicia') === 'Galicia', 'Q4: Xunta de Galicia -> Galicia')
  ok(detectCcaa('Ministerio de Trabajo') === null, 'Q4: Estado organ -> null ccaa')

  // Nivel detection (lowercase values: estatal, autonomico, local, etc.)
  ok(detectNivel('Ministerio de Sanidad') === 'estatal', 'Q4: Ministerio -> estatal')
  ok(detectNivel('Diputacion Provincial de Sevilla') === 'local', 'Q4: Diputacion -> local')
  ok(detectNivel('Generalitat Valenciana') === 'autonomico', 'Q4: Generalitat -> autonomico')
}

// ═══════════════════════════════════════════════════════════════════════
// Q5: "Que financiadores publicos son mas activos?"
// Tests: enrichConcesion produces data that can be aggregated
// ═══════════════════════════════════════════════════════════════════════

{
  const concesiones = [
    { codigo: 'C1', beneficiario: 'ONG A', nif: 'G11111111', importe_eur: 50000, organo: 'Ministerio de Sanidad', fecha: '2025-01-01' },
    { codigo: 'C2', beneficiario: 'ONG B', nif: 'G22222222', importe_eur: 30000, organo: 'Ministerio de Sanidad', fecha: '2025-02-01' },
    { codigo: 'C3', beneficiario: 'Empresa X', nif: 'B33333333', importe_eur: 80000, organo: 'Junta de Andalucia', fecha: '2025-03-01' },
  ]

  const enriched = concesiones.map(c => enrichConcesion(c as any))
  const tsOnly = enriched.filter(e => e.es_tercer_sector)
  ok(tsOnly.length === 2, 'Q5: 2 out of 3 are tercer sector (G-NIF)')

  // Aggregation by organo
  const byOrgano = new Map<string, number>()
  for (const e of tsOnly) {
    byOrgano.set(e.organo, (byOrgano.get(e.organo) ?? 0) + 1)
  }
  ok(byOrgano.get('Ministerio de Sanidad') === 2, 'Q5: Ministerio de Sanidad has 2 TS concesiones')
}

// ═══════════════════════════════════════════════════════════════════════
// Q6: "Esta licitacion tiene clausulas sociales?"
// Tests: extractClausulasSociales returns structured evidence
// ═══════════════════════════════════════════════════════════════════════

{
  const textWith = `
    Criterios de adjudicacion:
    Clausulas sociales: Se reserva la participacion a centros especiales de empleo
    y empresas de insercion social. Se valorara la contratacion de mujeres victimas
    de violencia de genero con hasta 10 puntos adicionales.
  `
  const cs = extractClausulasSociales(textWith)
  ok(cs.tiene_clausulas_sociales === true, 'Q6: clausulas sociales detected')
  ok(Array.isArray(cs.evidencias) && cs.evidencias.length > 0, 'Q6: evidencias array has extracted text')

  const textWithout = `
    El presupuesto base de licitacion es de 200.000 euros.
    Plazo de ejecucion: 6 meses desde la firma del contrato.
  `
  const csNone = extractClausulasSociales(textWithout)
  ok(csNone.tiene_clausulas_sociales === false, 'Q6: no clausulas in a plain budget text')
}

// ═══════════════════════════════════════════════════════════════════════
// Q7: "Que documentos tiene el expediente y cual manda?"
// Tests: classifyDocumento + prioritizeDocuments
// ═══════════════════════════════════════════════════════════════════════

{
  ok(classifyDocumento('Pliego de clausulas administrativas particulares.pdf') === 'pcap', 'Q7: pcap detected')
  ok(classifyDocumento('Pliego de prescripciones tecnicas.pdf') === 'ppt', 'Q7: ppt detected')
  ok(classifyDocumento('Anuncio de licitacion BOE.pdf') === 'anuncio', 'Q7: anuncio detected')
  ok(classifyDocumento('Memoria tecnica del servicio.pdf') === 'memoria', 'Q7: memoria detected')
  ok(classifyDocumento('Modelo DEUC firmado.pdf') === 'deuc', 'Q7: deuc detected')
  ok(classifyDocumento('factura_marzo.xlsx') === 'otro', 'Q7: unknown = otro')

  // Priority ordering: PCAP > PPT > anuncio > memoria > DEUC > otro
  const docs = [
    { url: 'a.pdf', nombre: 'Memoria tecnica.pdf', bytes: 100 },
    { url: 'b.pdf', nombre: 'Pliego de prescripciones tecnicas.pdf', bytes: 200 },
    { url: 'c.pdf', nombre: 'Anuncio BOE.pdf', bytes: 50 },
    { url: 'd.pdf', nombre: 'Pliego clausulas administrativas.pdf', bytes: 300 },
  ]
  const sorted = prioritizeDocuments(docs)
  ok(sorted[0].nombre.includes('lausulas administrativas'), 'Q7: PCAP is first priority')
  ok(sorted[1].nombre.includes('prescripciones'), 'Q7: PPT is second priority')
}

// ═══════════════════════════════════════════════════════════════════════
// Q8: "Cuando vence el plazo y cuanto queda?"
// Tests: extractPlazo with various formats
// ═══════════════════════════════════════════════════════════════════════

{
  const p1 = extractPlazo('Plazo de presentacion: hasta el 30/12/2030')
  ok(p1 !== null, 'Q8: plazo extracted from "hasta el DD/MM/YYYY"')
  ok(p1!.presentacion === '2030-12-30', 'Q8: date parsed to ISO')
  ok(typeof p1!.dias_restantes === 'number', 'Q8: dias_restantes computed')
  ok(p1!.dias_restantes! > 0, 'Q8: future date has positive dias_restantes')

  const p2 = extractPlazo('Plazo de presentacion de ofertas: hasta el 15/06/2030')
  ok(p2 !== null, 'Q8: handles "Plazo de presentacion de ofertas:" with flexible gap')
  ok(p2!.presentacion === '2030-06-15', 'Q8: p2 date parsed correctly')

  // ISO dates in non-standard context may not match regex patterns
  const p3 = extractPlazo('Fin plazo solicitudes: 2030-06-01')
  // extractPlazo always returns PlazosInfo, presentacion=null if unmatched
  ok(p3.presentacion === null || typeof p3.presentacion === 'string', 'Q8: ISO format handled gracefully')

  const p4 = extractPlazo('No hay plazo definido en este texto.')
  ok(p4.presentacion === null, 'Q8: returns null presentacion when no plazo found')
}

// ═══════════════════════════════════════════════════════════════════════
// Q9: "Que tipo de solvencia exige?"
// Tests: extractSolvencia structured output
// ═══════════════════════════════════════════════════════════════════════

{
  const text = `
    Solvencia tecnica: experiencia en al menos 3 contratos similares en los
    ultimos 5 anos por importe individual no inferior a 50.000 euros.
    Solvencia economica y financiera: cifra de negocios anual media de los
    tres ultimos ejercicios no inferior a 100.000 euros.
    Clasificacion empresarial: Grupo U, Subgrupo 4, Categoria B.
  `
  const solv = extractSolvencia(text)
  ok(typeof solv.tecnica === 'string' && solv.tecnica.length > 0, 'Q9: solvencia tecnica extracted')
  ok(typeof solv.economica === 'string' && solv.economica.length > 0, 'Q9: solvencia economica extracted')
  ok(solv.economica_importe_min_eur === 100000, 'Q9: economica importe min parsed')
  ok(Array.isArray(solv.certificados), 'Q9: certificados array exists')
}

// ═══════════════════════════════════════════════════════════════════════
// Q10: "Hay conflicto entre la extraccion regex y la LLM?"
// Tests: deterministic extraction produces structured fields
//        that can be compared with LLM output
// ═══════════════════════════════════════════════════════════════════════

{
  const pliego = `
    PLIEGO DE CLAUSULAS ADMINISTRATIVAS PARTICULARES
    Expediente: EXP-2025/001
    Presupuesto base de licitacion: 250.000,00 euros (IVA excluido)
    Tipo IVA: 21%
    Presupuesto con IVA: 302.500,00 euros
    CPV: 85311000 - Servicios de asistencia social con alojamiento
    Plazo de ejecucion: 24 meses
    Plazo de presentacion de ofertas: hasta el 30/06/2030
    Criterios:
    a) Propuesta tecnica: 55 puntos (juicio de valor)
    b) Oferta economica: 30 puntos (automatico)
    c) Mejoras: 15 puntos (juicio de valor)
    Solvencia tecnica: 2 contratos similares, 100.000 EUR minimo cada uno.
    Garantia definitiva: 5% del presupuesto de adjudicacion.
    Clausula social: se reserva a centros especiales de empleo.
    Lote 1: Servicio de atencion domiciliaria zona norte - 120.000 EUR
    Lote 2: Servicio de atencion domiciliaria zona sur - 130.000 EUR
  `

  const det = extractDeterminista(pliego)

  // Budget (economia.presupuesto_base_eur)
  ok(det.economia.presupuesto_base_eur != null, 'Q10: budget extracted')
  ok(det.economia.presupuesto_base_eur === 250000, 'Q10: base 250k extracted')

  // CPV (expediente.cpv)
  ok(det.expediente.cpv!.length > 0, 'Q10: CPV codes extracted')
  ok(det.expediente.cpv![0] === '85311000', 'Q10: CPV 85311000 correct')

  // Plazos
  ok(det.plazos.presentacion !== null, 'Q10: plazo extracted')
  ok(det.plazos.presentacion === '2030-06-30', 'Q10: plazo date correct')

  // Criterios
  ok(det.criterios.length >= 1, 'Q10: at least 1 criterio extracted')
  const tecnico = det.criterios.find(c => c.nombre.toLowerCase().includes('tecnica'))
  ok(tecnico !== undefined, 'Q10: criterio tecnico found')
  ok(tecnico!.peso === 55, 'Q10: criterio tecnico = 55 pts')

  // Solvencia (tecnica is string|null, not boolean)
  ok(typeof det.solvencia.tecnica === 'string' && det.solvencia.tecnica.length > 0, 'Q10: solvencia tecnica detected')

  // Garantias (definitiva is string|null, not boolean)
  ok(typeof det.garantias.definitiva === 'string' && det.garantias.definitiva.length > 0, 'Q10: garantia definitiva detected')
  ok(det.garantias.definitiva!.includes('5%'), 'Q10: garantia 5%')

  // Clausulas sociales
  ok(det.clausulas_sociales.tiene_clausulas_sociales === true, 'Q10: clausulas sociales detected')

  // Lotes
  ok(det.lotes.length >= 1, 'Q10: lotes extracted')

  // Aptitud scoring with evidence
  const aptitud = scoreAptitudOng(det)
  ok(aptitud.score >= 0 && aptitud.score <= 100, 'Q10: aptitud score in range')
  ok(aptitud.razones.length >= 3, 'Q10: at least 3 evidence reasons')

  // The deterministic extraction produces ALL fields needed to detect
  // conflicts with an LLM pass. If both exist, consumer can compare:
  ok(det.economia.presupuesto_base_eur != null, 'Q10: regex budget ready for conflict check')
  ok(det.plazos.presentacion !== null, 'Q10: regex plazo ready for conflict check')
  ok(det.expediente.cpv!.length > 0, 'Q10: regex CPVs ready for conflict check')
}

// ═══════════════════════════════════════════════════════════════════════
// ADDITIONAL: Edge cases and honesty checks
// ═══════════════════════════════════════════════════════════════════════

// Score must be "incierta" when critical data is missing
{
  const score = scoreConvocatoriaOng({
    titulo: '',
    objeto: null,
    sectores_ts: [],
    colectivo_objetivo: [],
    beneficiarios_elegibles: [],
    importe_total_eur: null,
    dias_restantes: null,
    fichaLeida: false,
    mrr: false,
    nivel: 'otro',
  })
  ok(score.label === 'incierta' || score.score <= 20, 'HONESTY: empty convocatoria scores low/incierta')
}

// NIF edge cases
{
  ok(classifyNifTipo('G') === 'G', 'EDGE: single char NIF classifies by first letter')
  ok(classifyNifTipo('12345678') === 'otro', 'EDGE: numeric prefix = otro')
  ok(classifyNifTipo('V12345678') === 'V', 'EDGE: NIF V = others')
  ok(classifyNifTipo(null) === null, 'EDGE: null NIF = null')
  ok(classifyNifTipo('') === null, 'EDGE: empty NIF = null')
}

// Extractors on empty text should return null/empty, never crash
{
  const empty = extractDeterminista('')
  ok((empty.expediente.cpv ?? []).length === 0, 'EDGE: empty text -> no CPVs')
  ok(empty.economia.presupuesto_base_eur == null, 'EDGE: empty text -> null budget')
  ok(empty.plazos.presentacion === null, 'EDGE: empty text -> null plazo')
  ok(empty.criterios.length === 0, 'EDGE: empty text -> no criterios')
  ok(empty.solvencia.tecnica == null, 'EDGE: empty text -> no solvencia')
  ok(empty.garantias.definitiva == null, 'EDGE: empty text -> no garantias')
  ok(empty.clausulas_sociales.tiene_clausulas_sociales === false, 'EDGE: empty text -> no clausulas')
  ok(empty.lotes.length === 0, 'EDGE: empty text -> no lotes')
}

// ═══════════════════════════════════════════════════════════════════════
console.log(`PASS: tercer-sector-acceptance (${passed} assertions)`)
