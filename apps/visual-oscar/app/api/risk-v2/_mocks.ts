/**
 * Mocks de demostración para el motor de Riesgo Estructural v2.
 *
 * Cuando el backend FastAPI no está disponible, los endpoints API
 * devuelven estos datos para que el dashboard se vea operativo en
 * lugar de la pantalla "Motor sin datos · Migración Alembic…".
 *
 * Los valores están calibrados para España (ES) y reflejan un escenario
 * de riesgo medio-alto plausible: tensión institucional moderada,
 * volatilidad mediática creciente, geopolítica elevada por Ucrania,
 * y elecciones cercanas en el índice electoral.
 *
 * Cada índice se construye con jitter pequeño basado en el día del año
 * para que los valores "respiren" entre sesiones sin saltar bruscamente.
 */
import type { RiskIndexCard, RiskIndicesPayload } from './indices/route'
import type { RiskScenario } from './scenarios/route'
import type { RiskAlert } from './alerts/route'

const COLORS = { low: '#16A34A', medium: '#D97706', high: '#DC2626', critical: '#7F1D1D' }

function labelFor(score: number): RiskIndexCard['label'] {
  if (score < 30) return 'BAJO'
  if (score < 55) return 'MEDIO'
  if (score < 75) return 'ALTO'
  return 'CRÍTICO'
}

function dayJitter(seed: number, range = 4): number {
  const d = new Date()
  const doy = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86400000)
  return ((doy + seed * 13) % 17 - 8) / 8 * range
}

export function mockIndices(country = 'ES'): RiskIndicesPayload {
  const baseIndices: Array<Pick<RiskIndexCard, 'index_id' | 'display_name' | 'display_order' | 'icon' | 'description'> & { base: number; n_used: number; n_total: number }> = [
    { index_id: 'institutional', display_name: 'Institucional',  display_order: 1, icon: '', description: 'Calidad democrática · WGI · V-Dem · independencia judicial', base: 38, n_used: 7, n_total: 8 },
    { index_id: 'electoral',     display_name: 'Electoral',      display_order: 2, icon: '', description: 'Volatilidad CIS · Pedersen · margen entre bloques', base: 64, n_used: 5, n_total: 6 },
    { index_id: 'geopolitical',  display_name: 'Geopolítico',    display_order: 3, icon: '', description: 'GPR Caldara · ACLED proximidad · tensión OTAN', base: 71, n_used: 6, n_total: 7 },
    { index_id: 'economic',      display_name: 'Económico',      display_order: 4, icon: '', description: 'EPU España · prima de riesgo · BCE rates · inflación', base: 52, n_used: 8, n_total: 9 },
    { index_id: 'media',         display_name: 'Mediático',      display_order: 5, icon: '', description: 'RSUI · sentiment 487 fuentes · polarización tweets', base: 58, n_used: 6, n_total: 6 },
    { index_id: 'social',        display_name: 'Social',         display_order: 6, icon: '', description: 'CIS confianza · protestas ACLED · paro juvenil INE', base: 47, n_used: 5, n_total: 6 },
  ]

  const indices: RiskIndexCard[] = baseIndices.map((b, i) => {
    const score = Math.round(Math.max(0, Math.min(100, b.base + dayJitter(i, 5))) * 10) / 10
    return {
      index_id: b.index_id,
      display_name: b.display_name,
      display_order: b.display_order,
      icon: b.icon,
      description: b.description,
      score,
      label: labelFor(score),
      delta_7d: Math.round(dayJitter(i + 100, 6) * 10) / 10,
      delta_30d: Math.round(dayJitter(i + 200, 12) * 10) / 10,
      colors: COLORS,
      source: 'demo',
      warnings: [],
      n_components_used: b.n_used,
      n_components_configured: b.n_total,
      components: mockComponents(b.index_id, b.n_used),
    }
  })

  return { country, n_indices: indices.length, indices }
}

function mockComponents(index_id: string, n: number): RiskIndexCard['components'] {
  const COMPONENTS_BY_INDEX: Record<string, Array<{ src: string; metric: string; raw: number }>> = {
    institutional: [
      { src: 'WGI',     metric: 'Voice & Accountability',         raw: 1.12 },
      { src: 'WGI',     metric: 'Government Effectiveness',       raw: 1.05 },
      { src: 'V-Dem',   metric: 'Liberal Democracy Index',         raw: 0.78 },
      { src: 'WJP',     metric: 'Rule of Law Index',                raw: 0.71 },
      { src: 'TI',      metric: 'Corruption Perceptions Index',    raw: 60   },
      { src: 'Freedom', metric: 'Civil Liberties (1-7)',            raw: 1.5  },
      { src: 'CGRI',    metric: 'Judicial Independence',           raw: 6.2  },
    ],
    electoral: [
      { src: 'CIS',  metric: 'Volatilidad de voto (Pedersen)',  raw: 12.4 },
      { src: 'CIS',  metric: 'Indecisos %',                      raw: 28.1 },
      { src: 'INE',  metric: 'Margen PP-PSOE (pp)',              raw: 5.3  },
      { src: 'CIS',  metric: 'Confianza partidos políticos',     raw: 2.4  },
      { src: 'JEC',  metric: 'Días hasta próximas generales',    raw: 540  },
    ],
    geopolitical: [
      { src: 'GPR',   metric: 'Geopolitical Índice de Riesgo Político (Caldara)', raw: 152 },
      { src: 'ACLED', metric: 'Eventos violencia política · 30d',  raw: 8   },
      { src: 'NATO',  metric: 'Tensión otan (índice 0-10)',         raw: 6.8 },
      { src: 'EU',    metric: 'Sanciones activas Rusia',            raw: 13  },
      { src: 'IISS',  metric: 'Conflictos activos vecindad',         raw: 4   },
      { src: 'Stockholm', metric: 'Gasto militar % PIB',          raw: 1.32 },
    ],
    economic: [
      { src: 'EPU',  metric: 'Economic Policy Uncertainty ESP',  raw: 187 },
      { src: 'ECB',  metric: 'Prima de riesgo 10Y vs Bund (pb)',  raw: 96  },
      { src: 'ECB',  metric: 'Tipo facilidad depósito (DFR)',     raw: 3.25 },
      { src: 'INE',  metric: 'IPC interanual %',                  raw: 3.1 },
      { src: 'INE',  metric: 'Paro EPA %',                        raw: 11.4 },
      { src: 'BdE',  metric: 'PIB previsto 2026 %',               raw: 1.9 },
      { src: 'IBEX', metric: 'VIBEX (volatilidad implícita)',     raw: 14.7 },
      { src: 'AIReF',metric: 'Brecha déficit % objetivo UE',      raw: 0.8 },
    ],
    media: [
      { src: 'RSUI', metric: 'Reuters Survey Uncertainty Index', raw: 0.72 },
      { src: 'NewsAPI', metric: 'Sentiment medio 487 fuentes',    raw: -0.18 },
      { src: 'X',    metric: 'Polarización política (0-1)',       raw: 0.68 },
      { src: 'GDELT', metric: 'Tone España últimas 24h',          raw: -2.4 },
      { src: 'Brain', metric: 'Densidad noticias críticas/día',   raw: 17  },
      { src: 'Trends', metric: 'Búsquedas "elecciones" 7d',        raw: 84  },
    ],
    social: [
      { src: 'CIS',   metric: 'Confianza institucional (0-10)',  raw: 4.1 },
      { src: 'ACLED', metric: 'Protestas no violentas · 30d',     raw: 23  },
      { src: 'INE',   metric: 'Paro juvenil 16-24 %',             raw: 27.8 },
      { src: 'CIS',   metric: 'Pesimismo económico hogares %',     raw: 51  },
      { src: 'INE',   metric: 'Coeficiente Gini',                  raw: 33.0 },
    ],
  }
  const list = COMPONENTS_BY_INDEX[index_id] || []
  const used = list.slice(0, n)
  const equalWeight = 1 / used.length
  return used.map(c => ({
    source_id: c.src,
    metric_name: c.metric,
    weight: equalWeight,
    raw_value: c.raw,
    score_0_100: 30 + Math.random() * 60,
    contribution: 0,
  }))
}

export function mockScenarios(country = 'ES'): { country: string; n_scenarios: number; scenarios: RiskScenario[] } {
  const now = new Date().toISOString()
  const scenarios: RiskScenario[] = [
    {
      scenario_id: 'sc_eleccion_anticipada',
      name: 'Elecciones anticipadas Q3 2026',
      description: 'Probabilidad de adelanto electoral por bloqueo parlamentario o pérdida de cuestión de confianza.',
      index_id: 'electoral', index_name: 'Electoral',
      probability: 0.34, confidence_low: 0.22, confidence_high: 0.46,
      key_drivers: { 'Volatilidad CIS': 0.42, 'Margen PP-PSOE': 0.28, 'Tensión parlamentaria': 0.30 },
      horizon_days: 180, model: 'logistic_lasso',
      calculated_at: now, status: 'fresh',
    },
    {
      scenario_id: 'sc_crisis_institucional',
      name: 'Crisis institucional grave',
      description: 'Escalada de conflicto entre poderes (CGPJ, TC, gobierno) con cobertura mediática crítica.',
      index_id: 'institutional', index_name: 'Institucional',
      probability: 0.18, confidence_low: 0.10, confidence_high: 0.27,
      key_drivers: { 'WGI Voice': 0.36, 'Cobertura crítica medios': 0.34, 'Polarización X': 0.30 },
      horizon_days: 365, model: 'random_forest',
      calculated_at: now, status: 'fresh',
    },
    {
      scenario_id: 'sc_recesion_tecnica',
      name: 'Recesión técnica (2 trim. PIB negativo)',
      description: 'Probabilidad de recesión técnica en próximos 12 meses combinando EPU, prima riesgo y BCE.',
      index_id: 'economic', index_name: 'Económico',
      probability: 0.22, confidence_low: 0.12, confidence_high: 0.34,
      key_drivers: { 'EPU España': 0.38, 'Prima riesgo': 0.32, 'BCE DFR': 0.30 },
      horizon_days: 365, model: 'bayesian_var',
      calculated_at: now, status: 'fresh',
    },
    {
      scenario_id: 'sc_escalada_geopolitica',
      name: 'Escalada geopolítica regional',
      description: 'Aumento significativo del GPR Caldara o eventos ACLED de alta intensidad cerca de fronteras UE.',
      index_id: 'geopolitical', index_name: 'Geopolítico',
      probability: 0.41, confidence_low: 0.30, confidence_high: 0.53,
      key_drivers: { 'GPR Caldara': 0.45, 'ACLED proximidad': 0.30, 'NATO tensión': 0.25 },
      horizon_days: 180, model: 'logistic_lasso',
      calculated_at: now, status: 'fresh',
    },
    {
      scenario_id: 'sc_protesta_amplia',
      name: 'Movilización social amplia',
      description: 'Protestas de gran magnitud (>50k participantes) en próximas 12 semanas.',
      index_id: 'social', index_name: 'Social',
      probability: 0.27, confidence_low: 0.15, confidence_high: 0.40,
      key_drivers: { 'CIS confianza': 0.36, 'Paro juvenil': 0.34, 'ACLED protestas': 0.30 },
      horizon_days: 90, model: 'random_forest',
      calculated_at: now, status: 'fresh',
    },
  ]
  return { country, n_scenarios: scenarios.length, scenarios }
}

export function mockAlerts(country = 'ES'): { country: string; n_active: number; n_total: number; by_severity: Record<string, number>; alerts: RiskAlert[] } {
  const now = Date.now()
  const fired = (hoursAgo: number) => new Date(now - hoursAgo * 3600 * 1000).toISOString()

  const alerts: RiskAlert[] = [
    {
      id: 1, alert_id: 'alert_geo_gpr_critical',
      index_id: 'geopolitical', index_name: 'Geopolítico',
      severity: 'critical', score: 78.2, delta: 8.4,
      message: 'GPR Caldara supera el umbral crítico (78). Tensión geopolítica elevada: ACLED registra 12 eventos próximos en 7d.',
      fired_at: fired(2), acknowledged: false,
    },
    {
      id: 2, alert_id: 'alert_media_polarization_high',
      index_id: 'media', index_name: 'Mediático',
      severity: 'warning', score: 64.1, delta: 5.7,
      message: 'Polarización X alcanza 0.68. Densidad de noticias críticas/día sube a 17 (media 7d: 11).',
      fired_at: fired(8), acknowledged: false,
    },
    {
      id: 3, alert_id: 'alert_elec_volatility_warning',
      index_id: 'electoral', index_name: 'Electoral',
      severity: 'warning', score: 64.3, delta: 3.2,
      message: 'Volatilidad CIS sube a 12.4. Indecisos en 28.1%. Margen PP-PSOE se estrecha a 5.3 pp.',
      fired_at: fired(18), acknowledged: false,
    },
    {
      id: 4, alert_id: 'alert_econ_epu_rising',
      index_id: 'economic', index_name: 'Económico',
      severity: 'info', score: 52.0, delta: 2.1,
      message: 'EPU España sube a 187 (media histórica: 132). VIBEX en 14.7. Prima riesgo estable en 96 pb.',
      fired_at: fired(36), acknowledged: false,
    },
    {
      id: 5, alert_id: 'alert_inst_judicial_warning',
      index_id: 'institutional', index_name: 'Institucional',
      severity: 'info', score: 38.0, delta: -1.2,
      message: 'Independencia judicial estable (CGRI 6.2). WGI Government Effectiveness en rango medio-alto.',
      fired_at: fired(50), acknowledged: true,
    },
    {
      id: 6, alert_id: 'alert_social_unemployment_youth',
      index_id: 'social', index_name: 'Social',
      severity: 'warning', score: 47.0, delta: 1.4,
      message: 'Paro juvenil 16-24 sube a 27.8% (EPA Q1). Pesimismo económico hogares 51%.',
      fired_at: fired(72), acknowledged: false,
    },
  ]

  const by_severity = alerts.reduce<Record<string, number>>((acc, a) => {
    if (!a.acknowledged) acc[a.severity] = (acc[a.severity] || 0) + 1
    return acc
  }, {})
  const n_active = alerts.filter(a => !a.acknowledged).length

  return { country, n_active, n_total: alerts.length, by_severity, alerts }
}
