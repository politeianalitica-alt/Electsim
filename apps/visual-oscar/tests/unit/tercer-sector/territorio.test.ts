/**
 * TS-Cockpit W1c · Tests de la capa territorial (`lib/tercer-sector/territorio.ts`).
 *
 * Ejecutar:
 *   cd apps/visual-oscar
 *   node --experimental-strip-types --no-warnings \
 *        tests/unit/tercer-sector/territorio.test.ts
 *
 * Cubre las funciones PURAS (sin red):
 *   1. ccaaDeBdns / ccaaDeLicitacion · atribución territorial
 *   2. buildTerritorio · agregación correcta por CCAA (contadores + importes
 *      null-safe + rankings) con fixtures
 *   3. computeAlertas / buildTerritorio · reglas de alerta de hueco
 */
import assert from 'node:assert/strict'
// Importamos del NÚCLEO puro (sin red) para que el harness Node lo resuelva
// directamente; `territorio.ts` (orquestador con fetch) re-exporta lo mismo.
import {
  buildTerritorio,
  computeAlertas,
  ccaaDeBdns,
  ccaaDeLicitacion,
  CCAA_DESCONOCIDA,
  type TerritorioTS,
} from '../../../lib/tercer-sector/territorio-core.ts'

let passed = 0
let failed = 0

async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn()
    passed++
    console.log(`  OK ${name}`)
  } catch (e) {
    failed++
    console.log(`  XX ${name}`)
    console.log(`    ${(e as Error)?.message ?? e}`)
  }
}

// ── Helpers de fixtures (shapes mínimos válidos) ───────────────────────────

function org(over: Record<string, unknown>) {
  return {
    slug: 's',
    nombre: 'Entidad',
    tipo: 'fundacion',
    sector: 'asistencia_social',
    ambito: 'estatal',
    ...over,
  } as any
}

function conc(over: Record<string, unknown>) {
  return {
    id: 'c1',
    beneficiario_nif: null,
    beneficiario_nombre: 'Fundación X',
    importe_eur: null,
    instrumento: null,
    convocatoria: null,
    nivel: 'AUTONOMICA',
    territorio: null,
    organo: null,
    fecha: '2026-01-01',
    es_tercer_sector: true,
    match: 'nif',
    ...over,
  } as any
}

function convo(over: Record<string, unknown>) {
  return {
    id: 'v1',
    numero: null,
    titulo: 'Convocatoria',
    fecha: '2026-01-01',
    nivel: 'AUTONOMICA',
    territorio: null,
    organo: null,
    mrr: false,
    es_tercer_sector: true,
    match: 'keyword',
    ...over,
  } as any
}

function lic(over: Record<string, unknown>) {
  return {
    id: 'place:1',
    titulo: 'Servicio',
    comprador: 'Órgano',
    nivel: 'ccaa',
    pais: 'España',
    region: null,
    valor_eur: null,
    moneda: 'EUR',
    cpv: null,
    plazo: null,
    fecha_pub: '2026-01-01',
    url: 'https://x',
    fuente: 'place',
    documentos: [],
    idioma: 'es',
    ...over,
  } as any
}

function byCcaa(rows: TerritorioTS[], key: string): TerritorioTS {
  const r = rows.find((x) => x.ccaa === key)
  assert.ok(r, `falta fila CCAA ${key}`)
  return r as TerritorioTS
}

async function run() {
  console.log('\n-> tercer-sector · territorio\n')

  // ── 1. Atribución territorial ───────────────────────────────────────────
  await test('ccaaDeBdns · nombre de CCAA del nivel2 BDNS → clave estable', () => {
    assert.equal(ccaaDeBdns('Comunidad de Madrid'), 'madrid')
    assert.equal(ccaaDeBdns('Cataluña'), 'cataluna')
    assert.equal(ccaaDeBdns('Comunitat Valenciana'), 'comunidad-valenciana')
    assert.equal(ccaaDeBdns(null), CCAA_DESCONOCIDA)
    assert.equal(ccaaDeBdns('Ministerio de no-sé-qué'), CCAA_DESCONOCIDA)
  })

  await test('ccaaDeLicitacion · region prioritaria; comprador fallback; no-España → desconocida', () => {
    // Region es la señal fuerte.
    assert.equal(ccaaDeLicitacion(lic({ region: 'Andalucía' })), 'andalucia')
    // Fallback por comprador SOLO cuando el comprador resuelve a una CCAA
    // (nombre de CCAA contenido); comportamiento honesto de ccaaKey.
    assert.equal(
      ccaaDeLicitacion(lic({ region: null, comprador: 'Comunidad de Madrid' })),
      'madrid',
    )
    // Comprador que NO contiene un nombre de CCAA resoluble → residual (no se fuerza).
    assert.equal(
      ccaaDeLicitacion(lic({ region: null, comprador: 'Ayuntamiento de no-sé-dónde' })),
      CCAA_DESCONOCIDA,
    )
    // País extranjero: no aporta CCAA española aunque la región despiste.
    assert.equal(
      ccaaDeLicitacion(lic({ pais: 'Reino Unido', region: 'Madrid' })),
      CCAA_DESCONOCIDA,
    )
    // Sin pistas → residual.
    assert.equal(ccaaDeLicitacion(lic({ region: null, comprador: 'XYZ' })), CCAA_DESCONOCIDA)
  })

  // ── 2. buildTerritorio · agregación ─────────────────────────────────────
  await test('buildTerritorio · cuenta entidades y suma ingresos/empleados por CCAA de sede', () => {
    const rows = buildTerritorio({
      organizaciones: [
        org({ slug: 'a', ccaa: 'madrid', ingresos_eur: 100, empleados: 10 }),
        org({ slug: 'b', ccaa: 'madrid', ingresos_eur: 50, empleados: null }),
        org({ slug: 'c', ccaa: 'cataluna', ingresos_eur: null, empleados: 5 }),
      ],
      concesiones: [],
      convocatorias: [],
      licitaciones: [],
    })
    const mad = byCcaa(rows, 'madrid')
    assert.equal(mad.entidades, 2)
    assert.equal(mad.ingresos_eur, 150)
    assert.equal(mad.empleados, 10) // solo una entidad publica empleados
    const cat = byCcaa(rows, 'cataluna')
    assert.equal(cat.entidades, 1)
    // Ninguna entidad de Cataluña publica ingresos → null (NO 0).
    assert.equal(cat.ingresos_eur, null)
    assert.equal(cat.empleados, 5)
  })

  await test('buildTerritorio · importes null cuando NINGUNA fila aporta (no inventar 0)', () => {
    const rows = buildTerritorio({
      organizaciones: [org({ ccaa: 'galicia', ingresos_eur: null, empleados: null })],
      concesiones: [conc({ territorio: 'Galicia', importe_eur: null })],
      convocatorias: [],
      licitaciones: [lic({ region: 'Galicia', valor_eur: null })],
    })
    const gal = byCcaa(rows, 'galicia')
    assert.equal(gal.entidades, 1)
    assert.equal(gal.ingresos_eur, null)
    assert.equal(gal.empleados, null)
    assert.equal(gal.concesiones, 1)
    assert.equal(gal.subvenciones_eur, null) // concesión sin importe → null
    assert.equal(gal.licitaciones, 1)
    assert.equal(gal.licitaciones_valor_eur, null) // licitación sin importe → null
  })

  await test('buildTerritorio · suma subvenciones y valor licitaciones cuando hay importes', () => {
    const rows = buildTerritorio({
      organizaciones: [org({ ccaa: 'andalucia' })],
      concesiones: [
        conc({ id: 'c1', territorio: 'Andalucía', importe_eur: 1000 }),
        conc({ id: 'c2', territorio: 'Andalucía', importe_eur: 500 }),
        conc({ id: 'c3', territorio: 'Andalucía', importe_eur: null }), // ignorada en suma
      ],
      convocatorias: [
        convo({ id: 'v1', territorio: 'Andalucía' }),
        convo({ id: 'v2', territorio: 'Andalucía' }),
      ],
      licitaciones: [
        lic({ id: 'place:1', region: 'Andalucía', valor_eur: 2000 }),
        lic({ id: 'place:2', region: 'Andalucía', valor_eur: null }),
      ],
    })
    const and = byCcaa(rows, 'andalucia')
    assert.equal(and.concesiones, 3)
    assert.equal(and.subvenciones_eur, 1500) // 1000+500, null ignorado
    assert.equal(and.convocatorias_abiertas, 2)
    assert.equal(and.licitaciones, 2)
    assert.equal(and.licitaciones_valor_eur, 2000)
  })

  await test('buildTerritorio · rankings beneficiarios/compradores ordenados por importe', () => {
    const rows = buildTerritorio({
      organizaciones: [org({ ccaa: 'madrid', sector: 'infancia' })],
      concesiones: [
        conc({ id: 'c1', territorio: 'Madrid', beneficiario_nombre: 'ONG A', organo: 'Consejería 1', importe_eur: 100 }),
        conc({ id: 'c2', territorio: 'Madrid', beneficiario_nombre: 'ONG B', organo: 'Consejería 2', importe_eur: 900 }),
        conc({ id: 'c3', territorio: 'Madrid', beneficiario_nombre: 'ONG B', organo: 'Consejería 2', importe_eur: 100 }),
      ],
      convocatorias: [],
      licitaciones: [lic({ region: 'Madrid', comprador: 'Consejería 2', valor_eur: 50 })],
    })
    const mad = byCcaa(rows, 'madrid')
    // Beneficiario top por importe: ONG B (1000) antes que ONG A (100).
    assert.equal(mad.beneficiarios_top[0].nombre, 'ONG B')
    assert.equal(mad.beneficiarios_top[0].importe_eur, 1000)
    assert.equal(mad.beneficiarios_top[0].count, 2)
    // Comprador top: Consejería 2 agrega concesiones (900+100) + licitación (50) = 1050.
    assert.equal(mad.compradores_top[0].nombre, 'Consejería 2')
    assert.equal(mad.compradores_top[0].importe_eur, 1050)
    assert.equal(mad.compradores_top[0].count, 3)
    // Sector top: por etiqueta humana del sector del catálogo.
    assert.equal(mad.sectores_top[0].nombre, 'Infancia')
    assert.equal(mad.sectores_top[0].count, 1)
  })

  await test('buildTerritorio · filas no atribuibles van al cubo residual al final', () => {
    const rows = buildTerritorio({
      organizaciones: [org({ ccaa: 'madrid' }), org({ slug: 'x', ccaa: undefined })],
      concesiones: [conc({ territorio: 'Ministerio del Estado' })],
      convocatorias: [],
      licitaciones: [],
    })
    const last = rows[rows.length - 1]
    assert.equal(last.ccaa, CCAA_DESCONOCIDA)
    // El residual recibe la org sin CCAA + la concesión no atribuible.
    assert.equal(last.entidades, 1)
    assert.equal(last.concesiones, 1)
    // El residual NO genera alertas.
    assert.deepEqual(last.alertas, [])
  })

  // ── 3. Reglas de alerta ─────────────────────────────────────────────────
  await test('computeAlertas · regla 1 · muchas entidades + poca financiación', () => {
    const r = {
      ccaa: 'madrid',
      ccaa_nombre: 'Comunidad de Madrid',
      entidades: 10,
      ingresos_eur: 1000,
      empleados: 50,
      subvenciones_eur: null, // sin financiación reciente conocida
      concesiones: 0,
      convocatorias_abiertas: 0,
      licitaciones: 0,
      licitaciones_valor_eur: null,
      sectores_top: [],
      compradores_top: [],
      beneficiarios_top: [],
      alertas: [],
    } as TerritorioTS
    const alertas = computeAlertas(r, {
      entidadesAlto: 5,
      convocatoriasAlto: 5,
      pocaFinanciacionMax: 2,
      pocaPresenciaMax: 2,
    })
    assert.equal(alertas.length, 1)
    assert.match(alertas[0], /Hueco de financiación/)
  })

  await test('computeAlertas · regla 2 · muchas convocatorias + poca presencia', () => {
    const r = {
      ccaa: 'extremadura',
      ccaa_nombre: 'Extremadura',
      entidades: 1,
      ingresos_eur: null,
      empleados: null,
      subvenciones_eur: 500,
      concesiones: 1,
      convocatorias_abiertas: 8,
      licitaciones: 0,
      licitaciones_valor_eur: null,
      sectores_top: [],
      compradores_top: [],
      beneficiarios_top: [],
      alertas: [],
    } as TerritorioTS
    const alertas = computeAlertas(r, {
      entidadesAlto: 5,
      convocatoriasAlto: 5,
      pocaFinanciacionMax: 2,
      pocaPresenciaMax: 2,
    })
    assert.equal(alertas.length, 1)
    assert.match(alertas[0], /Oportunidad territorial/)
  })

  await test('computeAlertas · sin condiciones → sin alertas (no falsos positivos)', () => {
    const r = {
      ccaa: 'cataluna',
      ccaa_nombre: 'Cataluña',
      entidades: 4,
      ingresos_eur: 9999,
      empleados: 200,
      subvenciones_eur: 100000,
      concesiones: 12,
      convocatorias_abiertas: 3,
      licitaciones: 5,
      licitaciones_valor_eur: 50000,
      sectores_top: [],
      compradores_top: [],
      beneficiarios_top: [],
      alertas: [],
    } as TerritorioTS
    const alertas = computeAlertas(r, {
      entidadesAlto: 5,
      convocatoriasAlto: 5,
      pocaFinanciacionMax: 2,
      pocaPresenciaMax: 2,
    })
    assert.deepEqual(alertas, [])
  })

  await test('buildTerritorio · cablea alertas con umbrales por defecto (medianas, suelo 3)', () => {
    // CCAA "hueco financiación": muchas entidades (8 ≥ suelo 3), 0 concesiones.
    // CCAA "oportunidad": 1 entidad, muchas convocatorias (6 ≥ suelo 3).
    const organizaciones = [
      ...Array.from({ length: 8 }, (_, i) => org({ slug: `m${i}`, ccaa: 'madrid' })),
      org({ slug: 'e1', ccaa: 'extremadura' }),
    ]
    const convocatorias = Array.from({ length: 6 }, (_, i) =>
      convo({ id: `v${i}`, territorio: 'Extremadura' }),
    )
    const rows = buildTerritorio({
      organizaciones,
      concesiones: [],
      convocatorias,
      licitaciones: [],
    })
    const mad = byCcaa(rows, 'madrid')
    assert.ok(
      mad.alertas.some((a) => /Hueco de financiación/.test(a)),
      'Madrid debería tener alerta de hueco de financiación',
    )
    const ext = byCcaa(rows, 'extremadura')
    assert.ok(
      ext.alertas.some((a) => /Oportunidad territorial/.test(a)),
      'Extremadura debería tener alerta de oportunidad territorial',
    )
  })

  await test('buildTerritorio · sin inputs → array vacío (no rompe)', () => {
    const rows = buildTerritorio({
      organizaciones: [],
      concesiones: [],
      convocatorias: [],
      licitaciones: [],
    })
    assert.deepEqual(rows, [])
  })

  // ── Cierre ──────────────────────────────────────────────────────────────
  console.log(`\n${passed} passed, ${failed} failed\n`)
  if (failed > 0) process.exit(1)
}

run()
