/**
 * Tercer Sector · Cockpit W1b · Tests del enriquecimiento de licitaciones
 * (lib/tercer-sector/licitaciones/enrich.ts).
 *
 * NO depende de vitest/jest (patrón tests/unit/tercer-sector/*). Ejecutar:
 *
 *     cd apps/visual-oscar
 *     node --experimental-strip-types --no-warnings \
 *          tests/unit/tercer-sector/licitaciones-enrich.test.ts
 *
 * El scoring (lib/tercer-sector/oportunidades/scoring.ts) es la fuente única de
 * verdad y lo crea W1a en paralelo. Para que estos tests sean herméticos y no
 * dependan de que ese módulo exista todavía, inyectamos un stub determinista de
 * scoreOportunidad con `_setScoreFn` y verificamos:
 *   1. calcDiasRestantes · hoy/futuro/pasado/null/no-parseable
 *   2. classifyComprador · ayuntamiento/ccaa/age/ue/org_internacional/otro + prioridad
 *   3. detectCategoriaTS · keywords específicas, respaldo CPV, null
 *   4. valorBucket · todos los tramos + límites + desconocido
 *   5. enrich completo · mapeo correcto del input de scoring + todos los campos
 *   6. degradación honesta · sin scoring → score_label='incierta', score_ong=null
 */
import assert from 'node:assert/strict'
import {
  calcDiasRestantes,
  classifyComprador,
  detectCategoriaTS,
  valorBucket,
  enrichLicitacionTS,
  tieneDocAnalizable,
  _setScoreFn,
  type ScoringInput,
} from '../../../lib/tercer-sector/licitaciones/enrich.ts'
import type { LicitacionNormalizada } from '../../../lib/tercer-sector/licitaciones/types.ts'

let passed = 0
let failed = 0

async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn()
    passed++
    console.log(`  ✓ ${name}`)
  } catch (e) {
    failed++
    console.log(`  ✗ ${name}`)
    console.log(`    ${(e as Error)?.message ?? e}`)
  }
}

// ── Fixture base de licitación cruda ────────────────────────────────────────
function baseLic(over: Partial<LicitacionNormalizada> = {}): LicitacionNormalizada {
  return {
    id: 'place:1',
    titulo: 'Servicio',
    comprador: 'Órgano',
    nivel: 'nacional_es',
    pais: 'España',
    region: null,
    valor_eur: null,
    moneda: 'EUR',
    cpv: null,
    plazo: null,
    fecha_pub: null,
    url: 'https://example.org/1',
    fuente: 'place',
    documentos: [],
    idioma: 'es',
    ...over,
  }
}

async function run() {
  console.log('\n→ tercer-sector · licitaciones-enrich\n')

  // ── 1. calcDiasRestantes ──────────────────────────────────────────────────
  await test('calcDiasRestantes · hoy=0, futuro>0, pasado<0, null/no-parseable=null', () => {
    const now = new Date('2026-06-07T12:00:00Z')
    assert.equal(calcDiasRestantes('2026-06-07T23:59:59Z', now), 0, 'mismo día → 0')
    assert.equal(calcDiasRestantes('2026-06-17', now), 10, '10 días en el futuro')
    assert.equal(calcDiasRestantes('2026-06-01', now), -6, '6 días en el pasado')
    assert.equal(calcDiasRestantes(null, now), null, 'sin plazo → null')
    assert.equal(calcDiasRestantes('', now), null, 'vacío → null')
    assert.equal(calcDiasRestantes('no-es-fecha', now), null, 'no parseable → null')
    // Solo-fecha contra hora del día: el cálculo es a nivel de día (sin off-by-one).
    assert.equal(calcDiasRestantes('2026-06-08', now), 1, 'mañana → 1')
  })

  // ── 2. classifyComprador ──────────────────────────────────────────────────
  await test('classifyComprador · entidad local gana aunque nivel sea ccaa', () => {
    assert.equal(classifyComprador('Ayuntamiento de Madrid', 'ccaa'), 'ayuntamiento')
    assert.equal(classifyComprador('Concello de Vigo', 'ccaa'), 'ayuntamiento')
    assert.equal(classifyComprador('Ajuntament de Barcelona', 'nacional_es'), 'ayuntamiento')
    assert.equal(classifyComprador('Diputación de Sevilla', 'ccaa'), 'ayuntamiento')
  })

  await test('classifyComprador · niveles supra-nacionales por nivel', () => {
    assert.equal(classifyComprador('European Commission', 'ue'), 'ue')
    assert.equal(classifyComprador('Cualquier cosa', 'ue'), 'ue')
    assert.equal(classifyComprador('World Bank', 'org_internacional'), 'org_internacional')
  })

  await test('classifyComprador · AGE por ministerio/Estado o nivel nacional', () => {
    assert.equal(classifyComprador('Ministerio de Sanidad', 'nacional_es'), 'age')
    assert.equal(
      classifyComprador('Administración General del Estado', 'nacional_es'),
      'age',
    )
    // Nivel nacional sin pistas de local/ccaa → AGE.
    assert.equal(classifyComprador('Entidad estatal X', 'nacional_es'), 'age')
  })

  await test('classifyComprador · CCAA por nivel o nombre de comunidad/consejería', () => {
    assert.equal(classifyComprador('Junta de Andalucía', 'ccaa'), 'ccaa')
    assert.equal(classifyComprador('Consejería de Educación', 'nacional_es'), 'ccaa')
    assert.equal(classifyComprador('Xunta de Galicia', 'pais_extranjero'), 'ccaa')
    assert.equal(classifyComprador('Generalitat de Catalunya', 'ue'), 'ue') // nivel ue manda
  })

  await test('classifyComprador · sin señal → otro', () => {
    assert.equal(classifyComprador('Some Foreign Authority', 'pais_extranjero'), 'otro')
    assert.equal(classifyComprador('Region of Lombardy', 'regional_extranjero'), 'otro')
    assert.equal(classifyComprador('', 'pais_extranjero'), 'otro')
  })

  // ── 3. detectCategoriaTS ──────────────────────────────────────────────────
  await test('detectCategoriaTS · keywords específicas mapean a su categoría', () => {
    assert.equal(
      detectCategoriaTS('Servicio de atención a personas con discapacidad', null),
      'Discapacidad',
    )
    assert.equal(
      detectCategoriaTS('Programa de protección de menores e infancia', null),
      'Infancia y familia',
    )
    assert.equal(
      detectCategoriaTS('Acogida de refugiados y solicitantes de asilo', null),
      'Migración y asilo',
    )
    assert.equal(
      detectCategoriaTS('Plan de inserción sociolaboral y empleo', null),
      'Empleo e inserción',
    )
    assert.equal(
      detectCategoriaTS('Proyecto de cooperación al desarrollo en el Sahel', null),
      'Cooperación y ayuda humanitaria',
    )
    assert.equal(
      detectCategoriaTS('Servicio de ayuda a domicilio y atención social', null),
      'Servicios sociales',
    )
  })

  await test('detectCategoriaTS · respaldo por CPV social cuando el texto no decide', () => {
    // Texto sin keywords TS, pero CPV de la división 85 (salud y servicios sociales).
    const cat = detectCategoriaTS('Contrato genérico XYZ', '85311000-9')
    assert.ok(cat && cat.length > 0, 'cae a la etiqueta legible del CPV')
  })

  await test('detectCategoriaTS · sin señal de texto ni CPV social → null', () => {
    assert.equal(detectCategoriaTS('Obra de pavimentación de carretera', null), null)
    assert.equal(detectCategoriaTS('Obra de pavimentación', '45233222-1'), null) // CPV obra
    assert.equal(detectCategoriaTS('', null), null)
  })

  // ── 4. valorBucket ────────────────────────────────────────────────────────
  await test('valorBucket · tramos y límites exactos', () => {
    assert.equal(valorBucket(null), 'desconocido')
    assert.equal(valorBucket(Number.NaN), 'desconocido')
    assert.equal(valorBucket(0), 'micro')
    assert.equal(valorBucket(14_999), 'micro')
    assert.equal(valorBucket(15_000), 'pequena') // límite inferior pequena
    assert.equal(valorBucket(59_999), 'pequena')
    assert.equal(valorBucket(60_000), 'media') // límite inferior media
    assert.equal(valorBucket(299_999), 'media')
    assert.equal(valorBucket(300_000), 'grande') // límite inferior grande
    assert.equal(valorBucket(4_999_999), 'grande')
    assert.equal(valorBucket(5_000_000), 'mega') // límite inferior mega
    assert.equal(valorBucket(50_000_000), 'mega')
  })

  // ── tieneDocAnalizable ──────────────────────────────────────────────────
  await test('tieneDocAnalizable · detecta pdf/docx/xlsx/html y rechaza zip/xml', () => {
    assert.equal(
      tieneDocAnalizable(
        baseLic({ documentos: [{ nombre: 'a', url: 'u', formato: 'zip', tipo: 'anexo' }] }),
      ),
      false,
    )
    assert.equal(
      tieneDocAnalizable(
        baseLic({ documentos: [{ nombre: 'p', url: 'u', formato: 'pdf', tipo: 'pliego' }] }),
      ),
      true,
    )
    assert.equal(tieneDocAnalizable(baseLic({ documentos: [] })), false)
  })

  // ── 5. enrich completo (con stub determinista de scoring) ─────────────────
  await test('enrichLicitacionTS · mapea input de scoring y rellena todos los campos', () => {
    // Stub: captura el input y devuelve un resultado fijo.
    let captured: ScoringInput | null = null
    _setScoreFn((o) => {
      captured = o
      return { score: 72, label: 'alta', razones: ['CPV social', 'plazo amplio'], riesgo: 'bajo' }
    })

    const now = new Date()
    const plazoFuturo = new Date(now.getTime() + 20 * 86_400_000).toISOString().slice(0, 10)

    const lic = baseLic({
      id: 'place:42',
      titulo: 'Servicio de atención a personas con discapacidad',
      comprador: 'Ayuntamiento de Bilbao',
      nivel: 'ccaa',
      valor_eur: 120_000,
      moneda: 'EUR',
      cpv: '85311000-9',
      plazo: plazoFuturo,
      documentos: [
        { nombre: 'Pliego', url: 'https://x/p.pdf', formato: 'pdf', tipo: 'pliego' },
      ],
      idioma: 'es',
    })

    const out = enrichLicitacionTS(lic)

    // No muta la entrada (los campos enriquecidos no aparecen en el original).
    assert.equal((lic as LicitacionNormalizada).score_ong, undefined, 'no muta la entrada')

    // Campos derivados puros.
    assert.equal(out.comprador_tipo, 'ayuntamiento', 'local gana sobre nivel ccaa')
    assert.equal(out.categoria_ts, 'Discapacidad')
    assert.equal(out.valor_bucket, 'media') // 120k ∈ [60k,300k)
    assert.equal(out.dias_restantes, 20)

    // Scoring mapeado y propagado.
    assert.equal(out.score_ong, 72)
    assert.equal(out.score_label, 'alta')
    assert.deepEqual(out.razones_score, ['CPV social', 'plazo amplio'])
    assert.equal(out.riesgo_pliego, 'bajo')

    // El input pasado al scoring es el esperado (contrato de mapeo W1a).
    assert.ok(captured, 'el scoring fue invocado')
    const cap = captured as ScoringInput
    assert.equal(cap.tipo, 'licitacion')
    assert.equal(cap.titulo, 'Servicio de atención a personas con discapacidad')
    assert.equal(cap.cpv, '85311000-9')
    assert.equal(cap.importe_eur, 120_000, 'valor_eur → importe_eur')
    assert.equal(cap.fecha_limite, plazoFuturo, 'plazo → fecha_limite')
    assert.equal(cap.moneda, 'EUR')
    assert.equal(cap.idioma, 'es')
    assert.ok(cap.documentos && cap.documentos.length === 1, 'pasa los documentos (señal docs)')
    assert.equal(cap.documentos![0].url, 'https://x/p.pdf', 'el scorer recibe la url del doc')

    _setScoreFn(undefined) // reset
  })

  // ── 6. degradación honesta (sin scoring disponible) ───────────────────────
  await test('enrichLicitacionTS · sin scoring → incierta + score_ong null, resto se rellena', () => {
    _setScoreFn(null) // simula módulo de scoring ausente

    const out = enrichLicitacionTS(
      baseLic({
        titulo: 'Obra de pavimentación de calles',
        comprador: 'Ministerio de Transportes',
        nivel: 'nacional_es',
        valor_eur: 8_000_000,
        cpv: '45233222-1',
        plazo: null,
      }),
    )

    // Scoring degrada honestamente.
    assert.equal(out.score_ong, null)
    assert.equal(out.score_label, 'incierta')
    assert.equal(out.riesgo_pliego, 'incierto')
    assert.ok(Array.isArray(out.razones_score) && out.razones_score.length > 0)

    // Campos puros siguen rellenándose.
    assert.equal(out.comprador_tipo, 'age')
    assert.equal(out.valor_bucket, 'mega') // 8M ≥ 5M
    assert.equal(out.categoria_ts, null) // obra, no TS
    assert.equal(out.dias_restantes, null) // sin plazo

    _setScoreFn(undefined) // reset
  })

  // ── 7. integración real con el scorer W1a (sin stub) ──────────────────────
  await test('enrichLicitacionTS · scorer REAL · social=alta/bajo riesgo, obra=baja/alto', () => {
    _setScoreFn(undefined) // usa el scoreOportunidad real importado

    const future = new Date(Date.now() + 25 * 86_400_000).toISOString().slice(0, 10)
    const social = enrichLicitacionTS(
      baseLic({
        titulo: 'Servicio de atención a personas con discapacidad',
        comprador: 'Ayuntamiento de Bilbao',
        nivel: 'ccaa',
        valor_eur: 120_000,
        cpv: '85311000-9',
        plazo: future,
        documentos: [{ nombre: 'Pliego', url: 'https://x/p.pdf', formato: 'pdf', tipo: 'pliego' }],
      }),
    )
    assert.equal(social.score_label, 'alta', 'licitación social → alta')
    assert.ok((social.score_ong ?? 0) >= 55, 'score alto')
    assert.equal(social.riesgo_pliego, 'bajo')

    const obra = enrichLicitacionTS(
      baseLic({
        titulo: 'Obra de pavimentación de calles',
        comprador: 'Ministerio de Transportes',
        nivel: 'nacional_es',
        valor_eur: 8_000_000,
        cpv: '45233222-1',
        plazo: future, // con plazo, no es "incierta" por datos ausentes
        documentos: [],
      }),
    )
    assert.notEqual(obra.score_label, 'alta', 'obra/industrial no es apta alta')
    assert.equal(obra.riesgo_pliego, 'alto', 'importe gigante + texto de obra → riesgo alto')
    assert.equal(obra.categoria_ts, null)
  })

  console.log(`\n  ${passed} passed · ${failed} failed\n`)
  if (failed > 0) process.exit(1)
}

run()
