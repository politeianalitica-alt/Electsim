/**
 * Sprint M5 FASE 4 · Fixtures canónicas para desambiguación de actores
 * y sentiment direccional.
 *
 * Cada fixture es un caso documentado con:
 *   - title: titular real o realista
 *   - description: bajada (opcional)
 *   - expect_actors: actores que DEBEN aparecer en la salida de detectActorsList
 *   - forbid_actors: actores que NO deben aparecer (ej. el homónimo equivocado)
 *   - notes: por qué es relevante
 *
 * Para ejecutar: `npx tsx lib/medios/__fixtures__/actor-disambiguation.fixtures.ts`
 * (requiere `tsx` global o devDep · si no está disponible, las fixtures siguen
 *  siendo documentación viva y pueden engancharse a vitest/jest cuando se
 *  añada un test runner al frontend)
 */
import { detectActorsList, assessSentiment, readArticle } from '../media-methodology'

export interface ActorFixture {
  id: string
  title: string
  description?: string
  expect_actors: string[]
  forbid_actors?: string[]
  notes: string
}

export const ACTOR_FIXTURES: ActorFixture[] = [
  // ── Sánchez: homónimo paradigmático ────────────────────────────────────
  {
    id: 'sanchez-presidente-clear',
    title: 'Pedro Sánchez convoca un consejo extraordinario en Moncloa',
    expect_actors: ['Pedro Sánchez'],
    forbid_actors: ['Sánchez (ambiguo · posiblemente Pedro Sánchez)'],
    notes: 'Full name → atribución unívoca, no debería marcarse como ambiguo',
  },
  {
    id: 'sanchez-context-psoe',
    title: 'Sánchez negociará los presupuestos con Junts',
    description: 'El PSOE busca un acuerdo antes del verano',
    expect_actors: ['Pedro Sánchez'],
    notes: 'Sólo apellido + context "psoe" en bajada → resuelve a Pedro Sánchez',
  },
  {
    id: 'sanchez-bare-ambiguous',
    title: 'Sánchez recibe el premio en una ceremonia privada',
    expect_actors: [],  // ningún actor canónico
    forbid_actors: ['Pedro Sánchez'],
    notes: 'Apellido suelto sin context político · no debería atribuirse a Pedro Sánchez · esperamos marcador ambiguo',
  },

  // ── Montero: María Jesús (PSOE) vs Irene (Podemos) ─────────────────────
  {
    id: 'montero-maria-jesus-hacienda',
    title: 'Montero defiende los nuevos tramos del IRPF en Hacienda',
    description: 'La vicepresidenta del PSOE explicó el plan',
    expect_actors: ['María Jesús Montero'],
    forbid_actors: ['Irene Montero'],
    notes: 'Context "hacienda" + "psoe" + "vicepresidenta" → María Jesús',
  },
  {
    id: 'montero-irene-podemos',
    title: 'Irene Montero critica el repliegue de Sumar en igualdad',
    expect_actors: ['Irene Montero'],
    forbid_actors: ['María Jesús Montero'],
    notes: 'Full name → Irene Montero. Sumar aquí es contexto, no debe sugerir Yolanda',
  },

  // ── Moreno: Juanma (PP Andalucía) ──────────────────────────────────────
  {
    id: 'moreno-juanma-context',
    title: 'Moreno pide al Gobierno más fondos para Andalucía',
    expect_actors: ['Juanma Moreno'],
    notes: 'Context "andalucía" → Juanma Moreno',
  },
  {
    id: 'moreno-bare-ambiguous',
    title: 'Moreno gana la carrera popular del domingo',
    expect_actors: [],
    forbid_actors: ['Juanma Moreno'],
    notes: 'Sin context político · no debe atribuirse',
  },

  // ── Díaz: Yolanda Díaz (Sumar) vs Ayuso (también "Díaz") ───────────────
  {
    id: 'diaz-yolanda-sumar',
    title: 'Yolanda Díaz lidera la reforma del SMI desde el ministerio de Trabajo',
    expect_actors: ['Yolanda Díaz'],
    notes: 'Full name unívoca',
  },
  {
    id: 'ayuso-explicit',
    title: 'Isabel Díaz Ayuso defiende la bajada de impuestos en la Comunidad de Madrid',
    expect_actors: ['Isabel Díaz Ayuso'],
    notes: 'Apellido compuesto "Ayuso" no debería confundirse con Yolanda Díaz · lastname=Ayuso',
  },

  // ── Feijóo + Abascal control caso simple ───────────────────────────────
  {
    id: 'feijoo-pp',
    title: 'Feijóo exige una comisión de investigación sobre el caso Koldo',
    description: 'El líder del PP carga contra el Gobierno',
    expect_actors: ['Alberto Núñez Feijóo'],
    notes: 'Apellido único + context "pp" → unívoco',
  },
  {
    id: 'abascal-vox',
    title: 'Vox y Abascal proponen endurecer la ley de extranjería',
    expect_actors: ['Santiago Abascal'],
    notes: 'Apellido único · no requiere desambiguación',
  },

  // ── Caso multi-actor ───────────────────────────────────────────────────
  {
    id: 'multi-presupuestos',
    title: 'Sánchez y Feijóo se reúnen en La Moncloa con Yolanda Díaz para discutir presupuestos',
    expect_actors: ['Pedro Sánchez', 'Alberto Núñez Feijóo', 'Yolanda Díaz'],
    notes: 'Tres actores claros · context moncloa + presupuestos resuelve Sánchez',
  },
]

// ── Sentiment fixtures (direccional HACIA actor) ─────────────────────────
export interface SentimentFixture {
  id: string
  title: string
  description?: string
  // Esperamos signo del actor_sentiment para este actor concreto
  expect_actor_signs: Record<string, 'positive' | 'negative' | 'neutral'>
  notes: string
}

export const SENTIMENT_FIXTURES: SentimentFixture[] = [
  {
    id: 'feijoo-acusa-sanchez',
    title: 'Feijóo acusa a Sánchez de pactar con los condenados',
    expect_actor_signs: { 'Pedro Sánchez': 'negative', 'Alberto Núñez Feijóo': 'neutral' },
    notes: '[KNOWN FAIL · subject/object polarity bug] Verbo "acusa" debería dar sentiment negativo HACIA Sánchez (objeto) y neutral hacia Feijóo (sujeto). El assessSentiment actual atribuye el tono negativo al sujeto. Fix futuro: parser sujeto/objeto sintáctico mínimo o NER posicional.',
  },
  {
    id: 'sanchez-apoya-yolanda',
    title: 'Sánchez respalda públicamente a Yolanda Díaz tras la moción',
    expect_actor_signs: { 'Yolanda Díaz': 'positive', 'Pedro Sánchez': 'neutral' },
    notes: 'Verbo "respalda" → positivo HACIA Yolanda, neutral hacia el sujeto',
  },
  {
    id: 'imputado-mazon',
    title: 'Imputan a Carlos Mazón por la gestión de la DANA',
    expect_actor_signs: { 'Carlos Mazón': 'negative' },
    notes: '[KNOWN FAIL · object-of-passive-verb] "Imputan a X" debería marcar X (objeto del verbo) como negativo. assessSentiment lo deja en neutral porque el actor no es sujeto del verbo judicial. Fix futuro: detectar patrón "verbo + a + actor".',
  },
  {
    id: 'absuelven-actor',
    title: 'El Supremo absuelve a Carles Puigdemont del delito de malversación',
    expect_actor_signs: { 'Carles Puigdemont': 'positive' },
    notes: 'Verbo "absuelve" → positivo (resultado favorable)',
  },
]

/**
 * Runner standalone · ejecuta las assertions y reporta a stdout.
 * Use: `npx tsx lib/medios/__fixtures__/actor-disambiguation.fixtures.ts`
 * No depende de framework de tests.
 */
export function runFixtures() {
  let passed = 0
  let failed = 0
  const failures: string[] = []

  console.log('\n=== Actor disambiguation fixtures ===\n')
  for (const fx of ACTOR_FIXTURES) {
    const text = `${fx.title} ${fx.description || ''}`
    const got = detectActorsList(text)
    const missing = fx.expect_actors.filter((a) => !got.includes(a))
    const forbidden = (fx.forbid_actors || []).filter((a) => got.includes(a))
    if (missing.length === 0 && forbidden.length === 0) {
      passed++
      console.log(`  ✓ ${fx.id}`)
    } else {
      failed++
      const msg = `  ✗ ${fx.id}\n    title: ${fx.title}\n    got: ${JSON.stringify(got)}\n    expected: ${JSON.stringify(fx.expect_actors)}\n    forbidden hit: ${JSON.stringify(forbidden)}\n    notes: ${fx.notes}`
      console.log(msg)
      failures.push(fx.id)
    }
  }

  console.log('\n=== Sentiment fixtures ===\n')
  for (const fx of SENTIMENT_FIXTURES) {
    const reading = readArticle({
      title: fx.title,
      description: fx.description || null,
      summary: fx.description || fx.title,
      url: `https://fixture/${fx.id}`,
      source: { name: 'fixture', id: null },
      domain: 'fixture.test',
      author: null,
      publishedAt: new Date().toISOString(),
      language: 'es',
    } as any)
    const sentiments = reading.sentiment.actor_sentiment || []
    const sentMap = new Map<string, number>()
    for (const as of sentiments) sentMap.set(as.actor, as.sentiment)
    const entries = Object.entries(fx.expect_actor_signs)
    const mismatches: string[] = []
    for (const [actor, expectedSign] of entries) {
      const score = sentMap.get(actor)
      const actualSign = typeof score !== 'number' ? 'missing' : score > 0.1 ? 'positive' : score < -0.1 ? 'negative' : 'neutral'
      if (actualSign !== expectedSign) mismatches.push(`${actor}: expected ${expectedSign}, got ${actualSign} (${score ?? 'n/a'})`)
    }
    if (mismatches.length === 0) {
      passed++
      console.log(`  ✓ ${fx.id}`)
    } else {
      failed++
      console.log(`  ✗ ${fx.id}\n    title: ${fx.title}\n    ${mismatches.join('\n    ')}\n    notes: ${fx.notes}`)
      failures.push(fx.id)
    }
  }

  console.log(`\n=== ${passed} passed · ${failed} failed ===`)
  if (failed > 0) {
    console.log(`Failing: ${failures.join(', ')}`)
    if (typeof process !== 'undefined' && process.exit) process.exit(1)
  }
}

// Ejecutar si se invoca directamente como script · `tsx`
if (typeof require !== 'undefined' && require.main === module) {
  runFixtures()
}
