/**
 * Fixtures Sprint G14 extra · china-coverage-baseline + detector anomalías
 *
 * Verifica lookup + scoring contra dataset CFC v.1 (62 países × 2013-2022)
 * con casos canónicos: España, EE.UU., China (self-coverage), Argentina,
 * Marruecos + Sahara como casos de detección anómala simulada.
 *
 * Ejecutar:
 *   npx tsx lib/geopolitica/__fixtures__/china-coverage-baseline.fixtures.ts
 */
import {
  lookupChinaBaseline,
  detectChinaCoverageAnomaly,
  getChinaBaselineStats,
} from '../china-coverage-baseline'

interface FixtureCase {
  id: string
  iso3: string
  current_count: number
  period_days: number
  expect_baseline_found: boolean
  expect_band?: 'normal' | 'elevated' | 'anomalous' | 'extreme'
  expect_z_min?: number
  expect_z_max?: number
  notes: string
}

const CASES: FixtureCase[] = [
  {
    id: 'spain-normal',
    iso3: 'ESP',
    current_count: 3,     // 3 items en 7 días = ~156 anual = baseline normal
    period_days: 7,
    expect_baseline_found: true,
    expect_band: 'normal',
    notes: 'España con cobertura típica · 3 items/sem extrapola a 156 anual ≈ baseline',
  },
  {
    id: 'spain-anomalous-up',
    iso3: 'ESP',
    current_count: 15,    // 15/sem = 782 anual = +13σ del baseline (mean 156, std 46)
    period_days: 7,
    expect_baseline_found: true,
    expect_band: 'extreme',
    expect_z_min: 5,
    notes: 'España con cobertura anómala alta · 15 items/sem >> baseline · shift evidente',
  },
  {
    id: 'spain-elevated',
    iso3: 'ESP',
    current_count: 6,     // 6/sem = 313 anual = +3.4σ
    period_days: 7,
    expect_baseline_found: true,
    notes: 'España con cobertura moderadamente elevada · band depende de redondeo',
  },
  {
    id: 'usa-normal',
    iso3: 'USA',
    current_count: 30,    // 30/sem = 1565 anual ≈ baseline 1749
    period_days: 7,
    expect_baseline_found: true,
    expect_band: 'normal',
    notes: 'EE.UU. siempre cubierto masivamente · 30 items/sem es normal',
  },
  {
    id: 'argentina-anomalous',
    iso3: 'ARG',
    current_count: 8,     // 8/sem = 417 anual >> baseline Argentina (~80-150)
    period_days: 7,
    expect_baseline_found: true,
    expect_z_min: 2,
    notes: 'Argentina con spike anómalo · señal de shift diplomático CN→ARG',
  },
  {
    id: 'egypt-baseline-low',
    iso3: 'EGY',
    current_count: 1,
    period_days: 7,
    expect_baseline_found: true,
    notes: 'Egipto · sí en dataset (a diferencia de Marruecos/Argelia/Túnez/Libia)',
  },
  {
    id: 'morocco-NOT-in-dataset',
    iso3: 'MAR',
    current_count: 1,
    period_days: 7,
    expect_baseline_found: false,
    notes: 'LIMITACIÓN DOCUMENTADA: CFC v.1 NO cubre Marruecos · Argelia · Túnez · Libia · Venezuela · Colombia · Nigeria',
  },
  {
    id: 'country-not-in-dataset',
    iso3: 'XXX',
    current_count: 5,
    period_days: 7,
    expect_baseline_found: false,
    notes: 'País inexistente · debe devolver null sin error',
  },
  {
    id: 'andorra-not-in-dataset',
    iso3: 'AND',
    current_count: 1,
    period_days: 7,
    expect_baseline_found: false,
    notes: 'Andorra · país pequeño no incluido en CFC v.1',
  },
]

function runFixtures() {
  let passed = 0
  let failed = 0
  const failures: string[] = []

  const stats = getChinaBaselineStats()
  console.log(`\n=== china-coverage-baseline fixtures ===`)
  console.log(`Dataset: ${stats.n_countries} países · window ${stats.baseline_window}`)
  console.log(`Top 5: ${stats.top_5_coverage.map((c) => `${c.iso3}=${c.mean}`).join(' · ')}\n`)

  for (const fx of CASES) {
    const errors: string[] = []
    const baseline = lookupChinaBaseline(fx.iso3)
    const anomaly = detectChinaCoverageAnomaly(fx.iso3, fx.current_count, fx.period_days)

    if (fx.expect_baseline_found && !baseline) {
      errors.push(`expected baseline for ${fx.iso3} but null`)
    }
    if (!fx.expect_baseline_found && baseline) {
      errors.push(`expected null for ${fx.iso3} but found ${baseline.country}`)
    }
    if (fx.expect_baseline_found && anomaly) {
      if (fx.expect_band && anomaly.band !== fx.expect_band) {
        errors.push(`band: expected ${fx.expect_band}, got ${anomaly.band} (z=${anomaly.z_score})`)
      }
      if (fx.expect_z_min !== undefined && Math.abs(anomaly.z_score) < fx.expect_z_min) {
        errors.push(`|z| < ${fx.expect_z_min}: got ${anomaly.z_score}`)
      }
      if (fx.expect_z_max !== undefined && Math.abs(anomaly.z_score) > fx.expect_z_max) {
        errors.push(`|z| > ${fx.expect_z_max}: got ${anomaly.z_score}`)
      }
    }

    if (errors.length === 0) {
      passed++
      if (anomaly) {
        console.log(`  ✓ ${fx.id} · ${fx.iso3} z=${anomaly.z_score} band=${anomaly.band}`)
      } else {
        console.log(`  ✓ ${fx.id} · ${fx.iso3} (no baseline, esperado)`)
      }
    } else {
      failed++
      console.log(`  ✗ ${fx.id} · ${fx.iso3}`)
      console.log(`    notes: ${fx.notes}`)
      for (const e of errors) console.log(`    · ${e}`)
      if (anomaly) console.log(`    got: z=${anomaly.z_score} band=${anomaly.band} interp=${anomaly.interpretation}`)
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
