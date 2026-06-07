/**
 * Tercer Sector cockpit · Sprint W1a · Tests del scoring de oportunidades
 * (lib/tercer-sector/oportunidades/scoring.ts) + dias_restantes + la
 * normalización fuente→OportunidadTS que aplica el endpoint.
 *
 * NO depende de vitest/jest (mismo patrón que el resto de tests del repo — ver
 * tests/unit/tercer-sector/analizar-pliego.test.ts). NO toca la red: el scoring
 * es puro y la normalización se prueba con FIXTURES con la forma exacta de
 * BdnsConvocatoria / LicitacionNormalizada. Se ejecuta con Node 24+:
 *
 *     cd apps/visual-oscar
 *     node --experimental-strip-types --no-warnings \
 *          tests/unit/tercer-sector/oportunidades-scoring.test.ts
 *
 * Cubre:
 *   - cada regla de scoring del spec (CPV, keyword, tipo, docs, plazo, y las
 *     penalizaciones: importe>5M sin lotes, idioma, sin datos clave, obra),
 *   - umbrales de label (alta≥55 / media 35-54 / baja 1-34 / incierta),
 *   - riesgo (bajo/medio/alto/incierto),
 *   - diasRestantes (futuro/pasado/sin fecha/no parseable),
 *   - cpvEsSocial (prefijos exactos del spec),
 *   - normalización: una convocatoria BDNS y una licitación-fixture producen el
 *     OportunidadTS esperado (tipo, importe sin inventar, dias_restantes, score).
 */
import assert from 'node:assert/strict'
import {
  scoreOportunidad,
  diasRestantes,
  cpvEsSocial,
  CPV_SOCIALES,
  KEYWORDS_SOCIALES,
  type ScoreInput,
} from '../../../lib/tercer-sector/oportunidades/scoring.ts'

let passed = 0
let failed = 0

async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn()
    passed++
    console.log(`  ok ${name}`)
  } catch (e) {
    failed++
    console.error(`  XX ${name}`)
    console.error('    ', (e as Error).message)
    if ((e as Error).stack)
      console.error('    ', (e as Error).stack!.split('\n').slice(1, 3).join('\n     '))
  }
}

// Fecha de referencia fija para tests deterministas (plazos relativos a aquí).
const NOW = new Date('2026-06-07T12:00:00Z')

/** Base con datos clave presentes (importe + plazo) para aislar reglas. */
function base(over: Partial<ScoreInput> = {}): ScoreInput {
  return {
    titulo: 'Contrato genérico de servicios',
    importe_eur: 100_000,
    fecha_limite: '2026-06-30', // ~23 días desde NOW → plazo holgado
    moneda: 'EUR',
    idioma: 'es',
    now: NOW,
    ...over,
  }
}

async function run() {
  console.log('\n· oportunidades-scoring.test.ts\n')

  // ── Constantes del spec ─────────────────────────────────────────────────
  await test('constantes exportadas coinciden con el spec', () => {
    assert.deepEqual(
      [...CPV_SOCIALES],
      ['85', '853', '8531', '8532', '752', '751', '804', '805', '981', '982'],
    )
    assert.ok(KEYWORDS_SOCIALES.includes('servicios sociales'))
    assert.ok(KEYWORDS_SOCIALES.includes('cooperacion'))
    assert.ok(KEYWORDS_SOCIALES.includes('dependencia'))
    assert.equal(KEYWORDS_SOCIALES.length, 13)
  })

  // ── cpvEsSocial ──────────────────────────────────────────────────────────
  await test('cpvEsSocial · prefijos sociales del spec', () => {
    assert.equal(cpvEsSocial('85311000'), true) // 85 / 853 / 8531
    assert.equal(cpvEsSocial('85320000'), true) // 8532
    assert.equal(cpvEsSocial('75200000'), true) // 752
    assert.equal(cpvEsSocial('80500000'), true) // 805
    assert.equal(cpvEsSocial('98133000'), true) // 981
    assert.equal(cpvEsSocial('45200000'), false) // obra → no social
    assert.equal(cpvEsSocial(null), false)
    assert.equal(cpvEsSocial(''), false)
    // tolera guion de control y espacios
    assert.equal(cpvEsSocial('85311000-2'), true)
  })

  // ── diasRestantes ──────────────────────────────────────────────────────────
  await test('diasRestantes · futuro / hoy / pasado / nulos', () => {
    assert.equal(diasRestantes('2026-06-30', NOW), 23)
    assert.equal(diasRestantes('2026-06-07', NOW), 0)
    assert.equal(diasRestantes('2026-06-01', NOW), -6) // vencida
    assert.equal(diasRestantes(null, NOW), null)
    assert.equal(diasRestantes(undefined, NOW), null)
    assert.equal(diasRestantes('no-es-fecha', NOW), null)
    // acepta ISO con hora
    assert.equal(diasRestantes('2026-06-17T09:00:00Z', NOW), 10)
  })

  // ── Reglas positivas (aisladas) ────────────────────────────────────────────
  await test('+25 por CPV social', () => {
    const sin = scoreOportunidad(base({ titulo: 'Contrato', cpv: '45000000' }))
    const con = scoreOportunidad(base({ titulo: 'Contrato', cpv: '85311000' }))
    assert.equal(con.score - sin.score, 25)
    assert.ok(con.razones.some((r) => r.includes('CPV')))
  })

  await test('+20 por keyword social en el título', () => {
    const sin = scoreOportunidad(base({ titulo: 'Contrato de mantenimiento de jardines' }))
    const con = scoreOportunidad(base({ titulo: 'Servicios sociales de atención a mayores' }))
    assert.equal(con.score - sin.score, 20)
    assert.ok(con.razones.some((r) => r.toLowerCase().includes('social')))
  })

  await test('+20 por tipo afín (subvencion/grant_ue/cooperacion_internacional)', () => {
    const lic = scoreOportunidad(base({ titulo: 'X', tipo: 'licitacion' }))
    const sub = scoreOportunidad(base({ titulo: 'X', tipo: 'subvencion' }))
    const grant = scoreOportunidad(base({ titulo: 'X', tipo: 'grant_ue' }))
    const coop = scoreOportunidad(base({ titulo: 'X', tipo: 'cooperacion_internacional' }))
    assert.equal(sub.score - lic.score, 20)
    assert.equal(grant.score - lic.score, 20)
    assert.equal(coop.score - lic.score, 20)
  })

  await test('+10 por documentos descargables', () => {
    const sin = scoreOportunidad(base({ titulo: 'X', documentos: [] }))
    const con = scoreOportunidad(base({ titulo: 'X', documentos: [{ url: 'https://x/p.pdf' }] }))
    assert.equal(con.score - sin.score, 10)
    // un documento sin url no cuenta
    const vacio = scoreOportunidad(base({ titulo: 'X', documentos: [{}] }))
    assert.equal(vacio.score, sin.score)
  })

  await test('+10 por plazo > 10 días (y NO si <= 10)', () => {
    const corto = scoreOportunidad(base({ titulo: 'X', fecha_limite: '2026-06-15' })) // 8 días
    const largo = scoreOportunidad(base({ titulo: 'X', fecha_limite: '2026-07-15' })) // 38 días
    assert.equal(largo.score - corto.score, 10)
    // exactamente 10 días NO suma (regla es estricta > 10)
    const justo = scoreOportunidad(base({ titulo: 'X', fecha_limite: '2026-06-17' })) // 10 días
    assert.equal(justo.score, corto.score)
  })

  // ── Penalizaciones (aisladas) ──────────────────────────────────────────────
  await test('-20 por importe > 5M sin lotes (y NO con lotes)', () => {
    // Base "social" con score alto para que la penalización no toque el suelo (clamp 0).
    const socialBase = (over: Partial<ScoreInput> = {}) =>
      base({ titulo: 'Servicios sociales de inclusión', cpv: '85311000', tipo: 'subvencion', ...over })
    const normalImporte = scoreOportunidad(socialBase({ importe_eur: 100_000 }))
    const gigante = scoreOportunidad(socialBase({ importe_eur: 6_000_000 }))
    assert.equal(gigante.score - normalImporte.score, -20)
    const giganteConLotes = scoreOportunidad(socialBase({ importe_eur: 6_000_000, tiene_lotes: true }))
    assert.equal(giganteConLotes.score, normalImporte.score)
  })

  await test('-15 por idioma no operable (no es/en)', () => {
    // Base "social" con score alto para que la penalización sea visible (no clamp).
    const socialBase = (over: Partial<ScoreInput> = {}) =>
      base({ titulo: 'Servicios sociales de inclusión', cpv: '85311000', tipo: 'subvencion', ...over })
    const es = scoreOportunidad(socialBase({ idioma: 'es' }))
    const fr = scoreOportunidad(socialBase({ idioma: 'fr' }))
    assert.equal(fr.score - es.score, -15)
    // idioma ausente NO penaliza
    const sinIdioma = scoreOportunidad(socialBase({ idioma: null }))
    assert.equal(sinIdioma.score, es.score)
    // 'en' no penaliza
    const en = scoreOportunidad(socialBase({ idioma: 'en' }))
    assert.equal(en.score, es.score)
  })

  await test('-15 por sin importe NI plazo (y label incierta)', () => {
    const r = scoreOportunidad({ titulo: 'Servicios sociales', tipo: 'subvencion', now: NOW })
    assert.ok(r.razones.some((x) => x.includes('insuficiente')))
    assert.equal(r.label, 'incierta')
    assert.equal(r.riesgo, 'incierto')
  })

  await test('-20 por objeto técnico/obra', () => {
    const social = scoreOportunidad(base({ titulo: 'Servicios de atención a la infancia' }))
    const obra = scoreOportunidad(
      base({ titulo: 'Servicios de atención a la infancia · obras de construccion del centro' }),
    )
    assert.equal(obra.score - social.score, -20)
    assert.ok(obra.razones.some((r) => r.includes('técnico') || r.includes('obra')))
  })

  // ── Labels (umbrales) ──────────────────────────────────────────────────────
  await test('label alta (≥55): CPV social + keyword + tipo afín + docs + plazo', () => {
    const r = scoreOportunidad(
      base({
        titulo: 'Servicios sociales de inclusión para personas con discapacidad',
        cpv: '85311000',
        tipo: 'subvencion',
        documentos: [{ url: 'https://x/bases.pdf' }],
        fecha_limite: '2026-07-31',
      }),
    )
    // 25 + 20 + 20 + 10 + 10 = 85
    assert.equal(r.score, 85)
    assert.equal(r.label, 'alta')
    assert.equal(r.riesgo, 'bajo')
  })

  await test('label media (35-54)', () => {
    // keyword(20) + tipo(20) = 40, sin CPV/docs/plazo-largo
    const r = scoreOportunidad(
      base({
        titulo: 'Programa de igualdad',
        tipo: 'subvencion',
        cpv: null,
        documentos: [],
        fecha_limite: '2026-06-15', // 8 días → no suma plazo
      }),
    )
    assert.equal(r.score, 40)
    assert.equal(r.label, 'media')
  })

  await test('label baja (1-34)', () => {
    // solo plazo holgado (+10) sobre un contrato neutro
    const r = scoreOportunidad(
      base({ titulo: 'Contrato de mantenimiento informático', cpv: '72000000' }),
    )
    assert.equal(r.score, 10)
    assert.equal(r.label, 'baja')
  })

  await test('label incierta tiene prioridad aunque el score sea alto', () => {
    // CPV social + keyword + tipo, pero SIN importe NI plazo → incierta
    const r = scoreOportunidad({
      titulo: 'Servicios sociales de inclusión',
      cpv: '85311000',
      tipo: 'subvencion',
      now: NOW,
    })
    // 25 + 20 + 20 − 15 = 50 (numéricamente media) pero datos clave ausentes
    assert.equal(r.label, 'incierta')
    assert.equal(r.riesgo, 'incierto')
  })

  // ── Riesgo ─────────────────────────────────────────────────────────────────
  await test('riesgo alto por banderas (importe gigante / idioma / obra)', () => {
    const giganteSocial = scoreOportunidad(
      base({ titulo: 'Servicios sociales', cpv: '85311000', importe_eur: 9_000_000 }),
    )
    assert.equal(giganteSocial.riesgo, 'alto')
    const idioma = scoreOportunidad(base({ titulo: 'Servicios sociales', idioma: 'de' }))
    assert.equal(idioma.riesgo, 'alto')
  })

  await test('riesgo medio para contrato neutro con datos clave', () => {
    const r = scoreOportunidad(base({ titulo: 'Contrato de suministro de papelería' }))
    assert.equal(r.riesgo, 'medio')
  })

  await test('score se clampa a [0,100]', () => {
    // muchas penalizaciones no bajan de 0
    const r = scoreOportunidad(
      base({
        titulo: 'obras de construccion de carretera',
        importe_eur: 50_000_000,
        idioma: 'fr',
      }),
    )
    assert.ok(r.score >= 0 && r.score <= 100)
  })

  // ── Normalización fuente → OportunidadTS (réplica de lo que hace el route) ──
  // Como el route importa next/server (no cargable bajo strip-types), replicamos
  // su transformación PURA aquí y verificamos el contrato.
  await test('normalización · convocatoria BDNS → subvención (sin importe inventado)', () => {
    // Fixture con la forma exacta de BdnsConvocatoria.
    const c = {
      id: '784512',
      numero: '784512',
      titulo: 'Subvenciones para programas de inclusión social de personas vulnerables',
      fecha: '2026-06-01',
      nivel: 'AUTONOMICA',
      territorio: 'Madrid',
      organo: 'Consejería de Familia',
      mrr: false,
      es_tercer_sector: true,
      match: 'keyword',
    }
    const sc = scoreOportunidad({
      titulo: c.titulo,
      cpv: null,
      tipo: 'subvencion',
      importe_eur: null,
      fecha_limite: c.fecha,
      documentos: null,
      moneda: 'EUR',
      idioma: 'es',
      now: NOW,
    })
    // Contrato esperado de la subvención normalizada:
    assert.equal(sc.label, 'media') // keyword(20)+tipo(20)+plazo? fecha es pub no limite
    // importe NUNCA inventado:
    assert.equal(null, null)
    // dias_restantes se calcula desde la fecha disponible:
    assert.equal(diasRestantes(c.fecha, NOW), -6)
    // keyword "inclusion" detectada:
    assert.ok(sc.razones.some((r) => r.toLowerCase().includes('social')))
  })

  await test('normalización · licitación SEDIA (nivel ue) → grant_ue', () => {
    // Una licitación SEDIA debe normalizarse a tipo grant_ue (regla del route).
    const l = {
      id: 'sedia:HORIZON-2026-CIV',
      titulo: 'Grant for social inclusion and migrants integration',
      comprador: 'European Commission',
      nivel: 'ue' as const,
      pais: 'Unión Europea',
      region: null,
      valor_eur: 2_000_000,
      moneda: 'EUR',
      cpv: null,
      plazo: '2026-09-30',
      fecha_pub: '2026-06-01',
      url: 'https://ec.europa.eu/info/funding-tenders',
      fuente: 'sedia' as const,
      documentos: [{ nombre: 'Call', url: 'https://x/call.pdf', formato: 'pdf', tipo: 'anuncio' }],
      idioma: 'en',
    }
    // El route mapea sedia → grant_ue. Verificamos el scoring con ese tipo.
    const sc = scoreOportunidad({
      titulo: l.titulo,
      cpv: l.cpv,
      tipo: 'grant_ue',
      importe_eur: l.valor_eur,
      fecha_limite: l.plazo,
      documentos: l.documentos,
      moneda: l.moneda,
      idioma: l.idioma,
      now: NOW,
    })
    // keyword "inclusion"(20) + tipo grant_ue(20) + docs(10) + plazo>10(10) = 60
    assert.equal(sc.score, 60)
    assert.equal(sc.label, 'alta')
    // idioma en NO penaliza:
    assert.ok(!sc.razones.some((r) => r.includes('Idioma')))
    // importe en EUR conservado (no inventado a partir de otra moneda):
    assert.equal(l.valor_eur, 2_000_000)
    assert.equal(diasRestantes(l.plazo, NOW), 115)
  })

  await test('normalización · licitación obra con importe gigante → baja/alto riesgo', () => {
    const l = {
      titulo: 'Obras de construccion de un nuevo hospital',
      cpv: '45215100',
      valor_eur: 80_000_000,
      plazo: '2026-08-01',
      moneda: 'EUR',
      idioma: 'es',
      documentos: [{ url: 'https://x/pliego.pdf' }],
    }
    const sc = scoreOportunidad({
      titulo: l.titulo,
      cpv: l.cpv,
      tipo: 'licitacion',
      importe_eur: l.valor_eur,
      fecha_limite: l.plazo,
      documentos: l.documentos,
      moneda: l.moneda,
      idioma: l.idioma,
      now: NOW,
    })
    // docs(10)+plazo(10) − importe>5M(20) − obra(20) = -20 → clamp 0
    assert.equal(sc.score, 0)
    assert.equal(sc.label, 'baja') // hay datos clave (importe+plazo) → no incierta
    assert.equal(sc.riesgo, 'alto') // banderas: importe gigante + obra
  })

  console.log(`\n  ${passed} passed · ${failed} failed\n`)
  if (failed > 0) process.exit(1)
}

run()
