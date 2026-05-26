/**
 * Fixtures Sprint G14 FASE 2 · media-bias-registry
 *
 * Verifica lookup MBFC sobre 12 medios canónicos (España, USA, China, Rusia,
 * Qatar, UK, France, Israel, India). El objetivo es confirmar que:
 *  - Dominios principales se encuentran (incluso con subdominios o www.).
 *  - Régimen "authoritarian" detectado para state-media régimen autoritario.
 *  - Bias clasificado correctamente para medios de referencia.
 *
 * Ejecutar:
 *   npx tsx lib/geopolitica/__fixtures__/media-bias-registry.fixtures.ts
 */
import {
  lookupMediaBias,
  canonicalizeDomain,
  regimeTagFromPressFreedom,
  getRegistryStats,
} from '../media-bias-registry'

interface FixtureCase {
  id: string
  input: string
  expect_found: boolean
  expect_country_in?: string[]
  expect_bias_in?: string[]
  expect_press_freedom_in?: string[]
  expect_regime?: 'free' | 'hybrid' | 'authoritarian' | 'unknown'
  notes: string
}

const CASES: FixtureCase[] = [
  // Casos de match esperado (medios grandes en MBFC dataset)
  {
    id: 'reuters', input: 'https://www.reuters.com/world/europe/article-123',
    expect_found: true,
    expect_press_freedom_in: ['mostly_free', 'free', 'partly_free', 'unknown'],
    notes: 'Reuters · medio de referencia internacional · debería estar en MBFC',
  },
  {
    id: 'bbc-subdomain', input: 'bbc.co.uk',
    expect_found: true,
    expect_country_in: ['united kingdom'],
    notes: 'BBC UK · prensa pública británica',
  },
  {
    id: 'nyt', input: 'nytimes.com',
    expect_found: true,
    expect_country_in: ['usa'],
    expect_bias_in: ['left_center', 'left', 'center'],
    notes: 'NYT · bias center-left esperado',
  },
  {
    id: 'rt-russian-state', input: 'rt.com',
    expect_found: true,
    expect_country_in: ['russia'],
    expect_regime: 'authoritarian',
    notes: 'RT (Russia Today) · state-media régimen Rusia · debería ser authoritarian',
  },
  {
    id: 'xinhua', input: 'xinhuanet.com',
    expect_found: true,
    expect_country_in: ['china'],
    expect_regime: 'authoritarian',
    notes: 'Xinhua · agencia oficial China · authoritarian',
  },
  {
    id: 'aljazeera', input: 'aljazeera.com',
    expect_found: true,
    expect_country_in: ['qatar'],
    notes: 'Al Jazeera · Qatar · authoritarian o hybrid',
  },
  {
    id: 'lemonde', input: 'lemonde.fr',
    expect_found: true,
    expect_country_in: ['france', 'usa'],  // dataset MBFC mis-tagged como usa, conocido
    notes: 'Le Monde · prensa Francia · MBFC source CSV tiene country=usa por error',
  },
  {
    id: 'haaretz', input: 'haaretz.com',
    expect_found: true,
    expect_country_in: ['israel'],
    notes: 'Haaretz · prensa Israel',
  },
  // Subdomain handling
  {
    id: 'cnn-edition-subdomain', input: 'edition.cnn.com',
    expect_found: true,
    expect_country_in: ['usa'],
    notes: 'edition.cnn.com → fallback debería resolver a cnn.com',
  },
  {
    id: 'sputnik-spanish', input: 'mundo.sputniknews.com',
    expect_found: true,
    expect_country_in: ['russia'],
    expect_regime: 'authoritarian',
    notes: 'mundo.sputniknews.com → fallback resolver a sputniknews.com · authoritarian',
  },
  // Missing (silencio informativo)
  {
    id: 'inexistente', input: 'fake-domain-12345-xyz.com',
    expect_found: false,
    notes: 'Dominio falso · debe devolver null sin error',
  },
  {
    id: 'vacio', input: '',
    expect_found: false,
    notes: 'Input vacío · null sin error',
  },
]

function runFixtures() {
  let passed = 0
  let failed = 0
  const failures: string[] = []

  console.log('\n=== media-bias-registry fixtures ===')
  const stats = getRegistryStats()
  console.log(`Registry: ${stats.total} medios · top países: ${Object.entries(stats.byCountry).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([c, n]) => `${c}(${n})`).join(', ')}\n`)

  for (const fx of CASES) {
    const errors: string[] = []
    const entry = lookupMediaBias(fx.input)
    const domain = canonicalizeDomain(fx.input)

    if (fx.expect_found && !entry) {
      errors.push(`expected to find domain "${domain}", got null`)
    } else if (!fx.expect_found && entry) {
      errors.push(`expected null, got entry for ${entry.domain}`)
    }

    if (entry && fx.expect_country_in && !fx.expect_country_in.includes(entry.country)) {
      errors.push(`country: expected one of [${fx.expect_country_in.join(',')}], got "${entry.country}"`)
    }
    if (entry && fx.expect_bias_in && !fx.expect_bias_in.includes(entry.bias)) {
      errors.push(`bias: expected one of [${fx.expect_bias_in.join(',')}], got "${entry.bias}"`)
    }
    if (entry && fx.expect_press_freedom_in && !fx.expect_press_freedom_in.includes(entry.press_freedom)) {
      errors.push(`press_freedom: expected one of [${fx.expect_press_freedom_in.join(',')}], got "${entry.press_freedom}"`)
    }
    if (entry && fx.expect_regime) {
      const regime = regimeTagFromPressFreedom(entry.press_freedom)
      if (regime !== fx.expect_regime) {
        errors.push(`regime: expected ${fx.expect_regime}, got ${regime} (from press_freedom=${entry.press_freedom})`)
      }
    }

    if (errors.length === 0) {
      passed++
      console.log(`  ✓ ${fx.id}${entry ? ` (${entry.domain} · ${entry.country} · ${entry.bias} · ${entry.press_freedom})` : ''}`)
    } else {
      failed++
      console.log(`  ✗ ${fx.id} (input=${fx.input})`)
      console.log(`    notes: ${fx.notes}`)
      for (const e of errors) console.log(`    · ${e}`)
      if (entry) console.log(`    got: ${JSON.stringify({ domain: entry.domain, country: entry.country, bias: entry.bias, press_freedom: entry.press_freedom })}`)
      failures.push(fx.id)
    }
  }

  console.log(`\n=== ${passed} passed · ${failed} failed ===`)
  if (failed > 0) {
    console.log(`Failing: ${failures.join(', ')}`)
    if (typeof process !== 'undefined' && process.exit) process.exit(1)
  }
}

if (typeof require !== 'undefined' && require.main === module) runFixtures()
