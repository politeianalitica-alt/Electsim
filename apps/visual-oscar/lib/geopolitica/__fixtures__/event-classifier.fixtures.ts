/**
 * Fixtures Sprint G14 FASE 1 · event-classifier.ts
 * Verifica cleanText + classifyGeoEventType + classifyThreatLevel sobre 12
 * snippets representativos de feeds reales (ES/EN/mixto).
 *
 * Ejecutar:
 *   npx tsx lib/geopolitica/__fixtures__/event-classifier.fixtures.ts
 */
import {
  cleanText,
  classifyGeoEventType,
  classifyThreatLevel,
  classifyRawText,
  extractMentionedEntities,
} from '../event-classifier'

interface FixtureCase {
  id: string
  input: string
  expect_cleaned_not_contains: string[]
  expect_event_type: string
  expect_threat_level_in: string[]
  expect_entities_contain?: string[]
  notes: string
}

const CASES: FixtureCase[] = [
  {
    id: 'reuters-ukraine-shelling',
    input: `Skip to main content Subscribe Newsletter
      Reuters · Russian forces shelled Kharkiv overnight, killing at least 4 civilians.
      Related Articles · Read more · Follow us on Twitter
      Copyright 2025`,
    expect_cleaned_not_contains: ['Skip to main', 'Subscribe', 'Read more', 'Copyright 2025'],
    expect_event_type: 'armed_conflict',
    expect_threat_level_in: ['high', 'critical', 'medium'],
    notes: 'Reuters Ucrania · boilerplate limpio + armed_conflict (shelled, killed) + alta amenaza',
  },
  {
    id: 'maec-no-viajar-libano',
    input: `MAEC recomienda no viajar a Líbano. Saltar al contenido Política de privacidad
      El Ministerio de Asuntos Exteriores ha actualizado su recomendación a nivel 4: no viajar.
      Síguenos en X · Newsletter`,
    expect_cleaned_not_contains: ['Saltar al contenido', 'Política de privacidad', 'Newsletter', 'Síguenos'],
    expect_event_type: 'consular_warning',
    expect_threat_level_in: ['medium', 'high'],
    expect_entities_contain: [],
    notes: 'MAEC nivel 4 · consular_warning detectado · ES boilerplate limpio',
  },
  {
    id: 'aljazeera-gaza-airstrike',
    input: `Al Jazeera · Israeli airstrikes hit a residential building in Gaza, mass casualty reported.
      Subscribe to our newsletter · Advertisement · Terms of service`,
    expect_cleaned_not_contains: ['Subscribe', 'Advertisement', 'Terms of service'],
    expect_event_type: 'armed_conflict',
    expect_threat_level_in: ['critical', 'high'],
    notes: 'Airstrike + mass casualty → armed_conflict + critical',
  },
  {
    id: 'efe-migracion-canarias',
    input: `EFE · Una patera con 45 migrantes llega a Canarias tras 3 días en alta mar.
      Última hora · Leer más · Más leídos · Suscríbete`,
    expect_cleaned_not_contains: ['Última hora', 'Leer más', 'Suscríbete'],
    expect_event_type: 'migration_pressure',
    expect_threat_level_in: ['medium', 'low', 'info', 'high'],
    notes: 'Patera Canarias → migration_pressure ES detectado',
  },
  {
    id: 'sanctions-ofac',
    input: `OFAC announces new sanctions against Russian oligarchs, asset freeze in effect.
      Treasury Department designated 25 individuals on the SDN list.`,
    expect_cleaned_not_contains: [],
    expect_event_type: 'sanction',
    expect_threat_level_in: ['medium', 'high', 'info'],
    notes: 'OFAC + asset freeze + SDN list → sanction detectado',
  },
  {
    id: 'cyber-ransomware-spain',
    input: `Un ciberataque ransomware ha afectado a varios ayuntamientos españoles.
      El INCIBE confirma una fuga de datos masiva. Vulnerabilidad activamente explotada.`,
    expect_cleaned_not_contains: [],
    expect_event_type: 'cyber',
    expect_threat_level_in: ['medium', 'high', 'critical'],
    notes: 'Ciberataque ES · cyber detectado · alta amenaza',
  },
  {
    id: 'gdelt-tone-only-narrative',
    input: `Análisis · El nuevo libro analiza la situación geopolítica en perspectiva.
      Opinión: la editorial considera relevante el debate.`,
    expect_cleaned_not_contains: [],
    expect_event_type: 'media_narrative',
    expect_threat_level_in: ['info', 'medium'],
    notes: 'Sólo análisis/opinión, sin hecho material → media_narrative',
  },
  {
    id: 'ucdp-armed-conflict',
    input: `Heavy combat reported in Sudan as troops launch offensive against rebels.
      Casualties confirmed by humanitarian organizations.`,
    expect_cleaned_not_contains: [],
    expect_event_type: 'armed_conflict',
    expect_threat_level_in: ['high', 'critical', 'medium'],
    notes: 'UCDP Sudán · combat + offensive + casualties → armed_conflict',
  },
  {
    id: 'energy-pipeline-algeria',
    input: `Disrupción en el gasoducto MEDGAZ desde Argelia. España activa stock estratégico
      de GNL en terminales Enagás. Crisis energética temporal.`,
    expect_cleaned_not_contains: [],
    expect_event_type: 'energy_disruption',
    expect_threat_level_in: ['medium', 'high', 'critical'],
    notes: 'MEDGAZ + GNL + crisis energética → energy_disruption ES',
  },
  {
    id: 'diplomatic-condemnation',
    input: `Spain condemns Russia's invasion and recalls ambassador for consultations.
      Foreign Minister Albares announces bilateral review.`,
    expect_cleaned_not_contains: [],
    expect_event_type: 'diplomatic_warning',
    expect_threat_level_in: ['medium', 'high', 'info'],
    notes: 'Spain condemns + recalls ambassador · es acción diplomática (warning), no acción material (spain_action). Score 4-1 a favor de diplomatic_warning es correcto analíticamente.',
  },
  {
    id: 'humanitarian-sudan',
    input: `Famine spreads in Sudan, 5 million displaced. WHO declares health emergency.
      Cholera outbreak in refugee camps. Mass starvation reported.`,
    expect_cleaned_not_contains: [],
    expect_event_type: 'humanitarian_crisis',
    expect_threat_level_in: ['critical', 'high'],
    expect_entities_contain: ['WHO'],
    notes: 'Famine + WHO + cholera → humanitarian_crisis + critical',
  },
  {
    id: 'empty-input',
    input: '',
    expect_cleaned_not_contains: [],
    expect_event_type: 'media_narrative',
    expect_threat_level_in: ['medium'],
    notes: 'Entrada vacía · degrada a media_narrative + medium sin romper',
  },
]

function runFixtures() {
  let passed = 0
  let failed = 0
  const failures: string[] = []

  console.log('\n=== event-classifier fixtures ===\n')
  for (const fx of CASES) {
    const errors: string[] = []
    const result = classifyRawText(fx.input)

    // cleanText no contiene boilerplate esperado-fuera
    for (const banned of fx.expect_cleaned_not_contains) {
      if (result.cleaned_text.toLowerCase().includes(banned.toLowerCase())) {
        errors.push(`cleaned_text still contains "${banned}"`)
      }
    }

    if (result.event_type !== fx.expect_event_type) {
      errors.push(`event_type: expected ${fx.expect_event_type}, got ${result.event_type}`)
    }

    if (!fx.expect_threat_level_in.includes(result.threat_level)) {
      errors.push(`threat_level: expected one of [${fx.expect_threat_level_in.join(',')}], got ${result.threat_level}`)
    }

    for (const ent of fx.expect_entities_contain || []) {
      if (!result.entities.some((e) => e.toLowerCase().includes(ent.toLowerCase()))) {
        errors.push(`expected entity "${ent}" not extracted`)
      }
    }

    if (errors.length === 0) {
      passed++
      console.log(`  ✓ ${fx.id}`)
    } else {
      failed++
      console.log(`  ✗ ${fx.id}`)
      console.log(`    notes: ${fx.notes}`)
      for (const e of errors) console.log(`    · ${e}`)
      console.log(`    got: type=${result.event_type} threat=${result.threat_level} entities=[${result.entities.join(',')}] keywords=[${result.keywords.join(',')}]`)
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
