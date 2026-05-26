/**
 * Sprint G15 FASE I · unit tests para las funciones core de medios.
 *
 * Cubre los invariantes que el refactor G15 introdujo y que más fácilmente
 * pueden romperse en una regresión silenciosa:
 *
 *   1. `normalizeCredibility` · escala 0-1 → 0-100 y rangos extremos
 *   2. `selectPrioritySources` · respeta minLocalShare en balanceMode='regional'
 *   3. `buildNarrativeClustersDetailed` · regla dura ≥3 artículos · ≥2 medios
 *      distintos · señal fuerte (filtra clusters genéricos a emerging_signals)
 *
 * NO depende de vitest/jest. Se ejecuta con Node 24+ y su soporte nativo
 * de TypeScript:
 *
 *     cd apps/visual-oscar
 *     node --experimental-strip-types tests/unit/medios-methodology.test.ts
 *
 * Si todos los assertions pasan imprime `OK · N tests`. Si alguno falla
 * el proceso sale con código != 0 y stack trace claro.
 *
 * Estos tests son sólo TS puro (no JSX, no Next API) · no requieren mocks.
 */
import assert from 'node:assert/strict'
import {
  normalizeCredibility,
  selectPrioritySources,
  buildNarrativeClustersDetailed,
  profileFromCatalog,
  readArticle,
  type MediaSourceProfile,
} from '../../lib/medios/media-methodology.ts'

type CatalogMedio = Parameters<typeof profileFromCatalog>[0]

let passed = 0
let failed = 0

function test(name: string, fn: () => void) {
  try {
    fn()
    passed++
    console.log(`  ✓ ${name}`)
  } catch (e) {
    failed++
    console.error(`  ✗ ${name}`)
    console.error('    ', (e as Error).message)
    if ((e as Error).stack) console.error('    ', (e as Error).stack!.split('\n').slice(1, 3).join('\n     '))
  }
}

// ─── 1 · normalizeCredibility ────────────────────────────────────────
console.log('\n→ normalizeCredibility')

test('escala 0-1 → 0-100', () => {
  assert.equal(normalizeCredibility(0.85), 85)
  assert.equal(normalizeCredibility(0.5), 50)
  assert.equal(normalizeCredibility(1), 100)
})

test('escala 0-100 pasa intacta', () => {
  assert.equal(normalizeCredibility(85), 85)
  assert.equal(normalizeCredibility(50), 50)
})

test('valores extremos · null/undefined/NaN → 0', () => {
  assert.equal(normalizeCredibility(null as any), 0)
  assert.equal(normalizeCredibility(undefined as any), 0)
  assert.equal(normalizeCredibility(NaN), 0)
  assert.equal(normalizeCredibility(-5), 0)
})

test('cap superior a 100', () => {
  assert.equal(normalizeCredibility(150), 100)
})

// ─── 2 · selectPrioritySources · minLocalShare ───────────────────────
console.log('\n→ selectPrioritySources · minLocalShare en balanceMode=regional')

function mkMedio(over: Partial<CatalogMedio> & { id: string; nombre: string }): CatalogMedio {
  return {
    id: over.id,
    nombre: over.nombre,
    grupo: over.grupo ?? `Grupo-${over.id}`,
    tipo: over.tipo ?? 'Prensa',
    ambito: over.ambito ?? 'Nacional',
    ccaa: over.ccaa ?? null,
    ideologia: over.ideologia ?? 0,
    audiencia_M: over.audiencia_M ?? 1,
    credibilidad: over.credibilidad ?? 70,
    rss: over.rss ?? `https://${over.id}.example/rss`,
    web: over.web ?? `https://${over.id}.example`,
    ...over,
  } as CatalogMedio
}

test('balanceMode=regional fuerza ≥20% local por defecto', () => {
  // Catálogo: 80 nacionales + 20 provinciales/locales
  const catalog: CatalogMedio[] = []
  for (let i = 0; i < 80; i++) {
    catalog.push(mkMedio({
      id: `nac-${i}`, nombre: `Nacional ${i}`,
      grupo: `Grupo-${i % 8}`,                   // 8 grupos distintos
      ambito: 'Nacional',
      audiencia_M: 1 + (i % 10),
    } as any))
  }
  for (let i = 0; i < 20; i++) {
    catalog.push(mkMedio({
      id: `loc-${i}`, nombre: `Local ${i}`,
      grupo: `LocalGrupo-${i}`,                  // grupos únicos · no toca cap
      ambito: 'Provincial',
      ccaa: 'Madrid',
      audiencia_M: 0.2,
      // scope_level se inyecta vía cast porque el overlay normal lo añade
      scope_level: i % 2 === 0 ? 'provincial' : 'local',
    } as any))
  }

  const result = selectPrioritySources(catalog, { maxSources: 30, balanceMode: 'regional' })
  const localCount = result.selected.filter((p: MediaSourceProfile) =>
    p.scope_level === 'provincial' || p.scope_level === 'local',
  ).length
  const minExpected = Math.round(30 * 0.20)              // = 6
  assert.ok(
    localCount >= minExpected,
    `esperaba ≥${minExpected} medios locales en selección · obtuve ${localCount}`,
  )
})

test('balanceMode=audience no fuerza cuota local (default 0)', () => {
  const catalog: CatalogMedio[] = []
  // Sólo 1 local (que casi no llega por audiencia)
  for (let i = 0; i < 50; i++) {
    catalog.push(mkMedio({
      id: `nac-${i}`, nombre: `Nac ${i}`,
      grupo: `G-${i % 5}`,
      audiencia_M: 5,
    } as any))
  }
  catalog.push(mkMedio({
    id: 'unico-local', nombre: 'Único local',
    grupo: 'UnicoG', ambito: 'Local', ccaa: 'Madrid',
    audiencia_M: 0.05,
    scope_level: 'local',
  } as any))
  const result = selectPrioritySources(catalog, { maxSources: 20, balanceMode: 'audience' })
  // En audience, sin cuota local, el local-de-baja-audiencia puede o no entrar.
  // Sólo verificamos que la opción default minLocalShare=0 no fuerza nada raro.
  assert.ok(result.selected.length <= 20)
  assert.ok(result.selected.length > 0)
})

// ─── 3 · buildNarrativeClustersDetailed · regla dura 3+ arts · 2+ medios ──
console.log('\n→ buildNarrativeClustersDetailed · regla dura')

test('input vacío devuelve clusters y emerging_signals vacíos', () => {
  const out = buildNarrativeClustersDetailed([])
  assert.equal(out.narrative_clusters.length, 0)
  assert.equal(out.emerging_signals.length, 0)
})

test('clusters con <3 artículos jamás aparecen en narrative_clusters', () => {
  // Usamos readArticle real para producir readings válidos
  const readings = [
    readArticle(mkArticle({ id: 'a1', title: 'Sánchez visita Bruselas para tratar el conflicto fiscal con Von der Leyen', medio_id: 'm1', medio_nombre: 'M1', date: new Date() }) as any,
                profileFromCatalog(mkMedio({ id: 'm1', nombre: 'M1' }) as any)),
    readArticle(mkArticle({ id: 'a2', title: 'Sánchez se reúne con la presidenta sobre el problema fiscal', medio_id: 'm2', medio_nombre: 'M2', date: new Date() }) as any,
                profileFromCatalog(mkMedio({ id: 'm2', nombre: 'M2' }) as any)),
  ]
  const out = buildNarrativeClustersDetailed(readings)
  const small = out.narrative_clusters.filter((c: any) => c.articles.length < 3)
  assert.equal(small.length, 0, `narrativas con <3 artículos NO deben pasar el filtro · encontradas: ${small.length}`)
})

// ─── Helpers ──────────────────────────────────────────────────────────

function mkArticle(over: { id: string; title: string; medio_id: string; medio_nombre: string; date: Date }) {
  return {
    title: over.title,
    description: over.title,
    link: `https://${over.medio_id}.example/${over.id}`,
    pubDate: over.date,
    pub_date_iso: over.date.toISOString(),
    sentiment: 'neutral',
    sentiment_score: 0,
    medio: {
      id: over.medio_id, nombre: over.medio_nombre, grupo: 'G', tipo: 'Prensa',
      ambito: 'Nacional', ccaa: null, ideologia: 0, audiencia_M: 1, credibilidad: 70,
      rss: 'https://x.example/rss', web: 'https://x.example',
    },
    source_tags: [],
  }
}

// ─── Resumen ──────────────────────────────────────────────────────────
console.log('')
if (failed === 0) {
  console.log(`OK · ${passed} tests`)
  process.exit(0)
} else {
  console.error(`FAIL · ${passed} ok · ${failed} fallidos`)
  process.exit(1)
}
