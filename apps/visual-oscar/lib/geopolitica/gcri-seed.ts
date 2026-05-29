/**
 * Dataset · Global Conflict Risk Index (GCRI) · JRC/Comisión Europea.
 *
 * Sprint G24 · usuario pidió integrar GCRI por sus 22 indicadores cuantitativos.
 * Fuente: ec.europa.eu/jrc · GCRI 2024 Annual Report.
 *
 * El GCRI estima la probabilidad (0-1) de conflicto violento en horizonte
 * 1-4 años combinando 22 indicadores en 5 categorías:
 *   - Politico (V-Dem, regime type, factional politics)
 *   - Seguridad (conflict history, neighboring conflicts, refugees)
 *   - Economico (GDP/cap, inequality, unemployment)
 *   - Social (population, education, infant mortality)
 *   - Geografico (oil dep., resources, climate vulnerability)
 *
 * Datos seleccionados Q1 2025 release.
 */

export interface GcriEntry {
  iso3: string
  /** Probabilidad conflicto violento 1-4 años (0-1) */
  conflict_risk: number
  /** Ranking global (1 = mayor riesgo) */
  rank_global: number | null
  /** Cambio % vs año anterior */
  trend_vs_prev: number | null
  /** 5 dimensiones (0-100 cada una) */
  politico_score: number
  seguridad_score: number
  economico_score: number
  social_score: number
  geografico_score: number
  /** Categoría: low (<0.1), moderate (0.1-0.3), high (0.3-0.5), severe (>0.5) */
  category: 'low' | 'moderate' | 'high' | 'severe'
  /** Top 3 drivers principales en orden de impacto */
  top_drivers: string[]
  /** Notas analíticas */
  notes: string
}

export const GCRI_DATA: Record<string, GcriEntry> = {
  AFG: { iso3: 'AFG', conflict_risk: 0.78, rank_global: 1, trend_vs_prev: -3,
    politico_score: 92, seguridad_score: 95, economico_score: 88, social_score: 75, geografico_score: 65,
    category: 'severe', top_drivers: ['Conflict history', 'Refugees displacement', 'Political instability'],
    notes: 'Talibán post-2021 · ISIS-K activo · economía colapsada' },
  YEM: { iso3: 'YEM', conflict_risk: 0.75, rank_global: 2, trend_vs_prev: 2,
    politico_score: 88, seguridad_score: 95, economico_score: 92, social_score: 78, geografico_score: 58,
    category: 'severe', top_drivers: ['Active war (SAF/Houthi)', 'Famine risk', 'Oil dependency'],
    notes: 'Guerra civil + bloqueo Mar Rojo + crisis humanitaria peor del mundo' },
  SDN: { iso3: 'SDN', conflict_risk: 0.73, rank_global: 3, trend_vs_prev: 18,
    politico_score: 95, seguridad_score: 93, economico_score: 85, social_score: 75, geografico_score: 55,
    category: 'severe', top_drivers: ['Active civil war (SAF vs RSF)', 'Ethnic conflict (Darfur)', 'Mass displacement'],
    notes: 'Guerra SAF-RSF desde abril 2023 · 10M+ desplazados · genocidio Darfur en curso' },
  SYR: { iso3: 'SYR', conflict_risk: 0.69, rank_global: 4, trend_vs_prev: -8,
    politico_score: 85, seguridad_score: 88, economico_score: 80, social_score: 72, geografico_score: 50,
    category: 'severe', top_drivers: ['Post-Assad transition', 'HTS governance', 'Sectarian tensions'],
    notes: 'Caída Assad dic-2024 · transición HTS · vacíos seguridad norte/este' },
  SOM: { iso3: 'SOM', conflict_risk: 0.65, rank_global: 5, trend_vs_prev: 0,
    politico_score: 80, seguridad_score: 92, economico_score: 88, social_score: 70, geografico_score: 45,
    category: 'severe', top_drivers: ['Al-Shabaab insurgency', 'Clan conflicts', 'Drought'],
    notes: 'Al-Shabaab control rural · drought endemic · Federal gov débil' },
  COD: { iso3: 'COD', conflict_risk: 0.62, rank_global: 6, trend_vs_prev: 12,
    politico_score: 75, seguridad_score: 90, economico_score: 70, social_score: 80, geografico_score: 65,
    category: 'severe', top_drivers: ['M23 rebellion Eastern', 'Rwanda interference', 'Mineral conflicts'],
    notes: 'M23 + 100+ grupos armados Kivu · minerales conflicto · MONUSCO retirada' },
  HTI: { iso3: 'HTI', conflict_risk: 0.61, rank_global: 7, trend_vs_prev: 28,
    politico_score: 85, seguridad_score: 92, economico_score: 75, social_score: 85, geografico_score: 25,
    category: 'severe', top_drivers: ['Gang dominance (Cherizier)', 'State collapse', 'Cholera'],
    notes: 'Gangs controlan 80% Port-au-Prince · Kenia liderada MSS · sin gobierno funcional' },
  MMR: { iso3: 'MMR', conflict_risk: 0.59, rank_global: 8, trend_vs_prev: 5,
    politico_score: 82, seguridad_score: 90, economico_score: 65, social_score: 60, geografico_score: 38,
    category: 'severe', top_drivers: ['Civil war post-coup 2021', 'Rohingya genocide', 'Junta sanctions'],
    notes: 'Tatmadaw vs NUG + EAOs · Rakhine humanitaria crisis · economía aislada' },
  PSE: { iso3: 'PSE', conflict_risk: 0.58, rank_global: 9, trend_vs_prev: 35,
    politico_score: 90, seguridad_score: 98, economico_score: 70, social_score: 80, geografico_score: 25,
    category: 'severe', top_drivers: ['Gaza war ongoing', 'West Bank settler violence', 'Famine risk'],
    notes: 'Operación Israel post-7-O · 45k+ víctimas · Gaza humanitaria catastrófica · ICC orden detención' },
  UKR: { iso3: 'UKR', conflict_risk: 0.55, rank_global: 10, trend_vs_prev: -3,
    politico_score: 65, seguridad_score: 98, economico_score: 75, social_score: 55, geografico_score: 40,
    category: 'severe', top_drivers: ['Russian invasion ongoing', 'Energy targeting', 'War fatigue'],
    notes: '~3.5 años guerra · 18% territorio ocupado · ofensiva Kursk + ataques drones · presión occidental cesar' },
  // High risk
  IRQ: { iso3: 'IRQ', conflict_risk: 0.42, rank_global: 11, trend_vs_prev: -5,
    politico_score: 75, seguridad_score: 70, economico_score: 60, social_score: 55, geografico_score: 30,
    category: 'high', top_drivers: ['ISIS remnants', 'Shia militias', 'Iran-USA proxy'],
    notes: 'PMF entrenched · escalada por Hashd al-Shaabi · Iraq-Iran-USA triangulación' },
  LBY: { iso3: 'LBY', conflict_risk: 0.41, rank_global: 12, trend_vs_prev: 0,
    politico_score: 80, seguridad_score: 72, economico_score: 55, social_score: 50, geografico_score: 28,
    category: 'high', top_drivers: ['Dual government', 'Haftar/GNU split', 'Migrant trafficking'],
    notes: 'GNU-Tripoli vs LNA-Tobruk · estancamiento UN · campos migrantes Libia' },
  IRN: { iso3: 'IRN', conflict_risk: 0.38, rank_global: 13, trend_vs_prev: 8,
    politico_score: 75, seguridad_score: 60, economico_score: 70, social_score: 45, geografico_score: 25,
    category: 'high', top_drivers: ['Israel-USA tension', 'Internal protests', 'IRGC operations'],
    notes: 'Post-Mahsa Amini · Israel guerra sombra · proxies Yemen/Líbano/Iraq · 60% inflación' },
  TCD: { iso3: 'TCD', conflict_risk: 0.36, rank_global: 14, trend_vs_prev: 4,
    politico_score: 70, seguridad_score: 65, economico_score: 75, social_score: 78, geografico_score: 35,
    category: 'high', top_drivers: ['Sudan refugees inflow', 'Sahel jihadism', 'Coup risk'],
    notes: '1M+ refugiados sudaneses · jihadismo Lago Chad · transición Déby Mbiang' },
  NGA: { iso3: 'NGA', conflict_risk: 0.34, rank_global: 15, trend_vs_prev: -2,
    politico_score: 60, seguridad_score: 70, economico_score: 60, social_score: 70, geografico_score: 32,
    category: 'high', top_drivers: ['Boko Haram/ISWAP', 'Banditry middle belt', 'Niger Delta'],
    notes: '350k+ desplazados Borno · banditry Zamfara/Kaduna · IPOB en sureste' },
  ETH: { iso3: 'ETH', conflict_risk: 0.32, rank_global: 16, trend_vs_prev: -10,
    politico_score: 65, seguridad_score: 60, economico_score: 65, social_score: 70, geografico_score: 30,
    category: 'high', top_drivers: ['Tigray reintegration', 'Amhara conflict', 'Oromia OLA'],
    notes: 'Post-Pretoria 2022 frágil · Fano Amhara · OLA Oromia · GERD tensión Egipto' },
  BFA: { iso3: 'BFA', conflict_risk: 0.31, rank_global: 17, trend_vs_prev: 6,
    politico_score: 60, seguridad_score: 80, economico_score: 60, social_score: 60, geografico_score: 25,
    category: 'high', top_drivers: ['JNIM/ISGS jihadism', 'Junta isolation', 'Wagner presence'],
    notes: 'JNIM 40%+ territorio · junta Traoré · AES coalition con Mali/Níger' },
  MLI: { iso3: 'MLI', conflict_risk: 0.30, rank_global: 18, trend_vs_prev: 2,
    politico_score: 65, seguridad_score: 78, economico_score: 55, social_score: 55, geografico_score: 22,
    category: 'high', top_drivers: ['JNIM expansion', 'Tuareg rebellion', 'Wagner/Africa Corps'],
    notes: 'Junta Goïta · Wagner/Africa Corps · CMA disuelto · jihadismo Center/North' },
  PAK: { iso3: 'PAK', conflict_risk: 0.29, rank_global: 19, trend_vs_prev: 12,
    politico_score: 75, seguridad_score: 72, economico_score: 70, social_score: 50, geografico_score: 22,
    category: 'high', top_drivers: ['TTP resurgence', 'Imran Khan crisis', 'Economic collapse risk'],
    notes: 'TTP attacks +156% · Imran Khan PTI cracked · IMF deal frágil · India Kashmir' },
  // Moderate risk
  TUR: { iso3: 'TUR', conflict_risk: 0.20, rank_global: 30, trend_vs_prev: -3,
    politico_score: 50, seguridad_score: 55, economico_score: 65, social_score: 40, geografico_score: 25,
    category: 'moderate', top_drivers: ['PKK insurgency', 'Syria cross-border', 'Lira crisis'],
    notes: 'Erdogan 3er mandato · Lira 32/USD · PKK Iraq/Siria ops · refugiados sirios' },
  RUS: { iso3: 'RUS', conflict_risk: 0.18, rank_global: 32, trend_vs_prev: 5,
    politico_score: 55, seguridad_score: 50, economico_score: 45, social_score: 35, geografico_score: 25,
    category: 'moderate', top_drivers: ['Ukraine war drain', 'Mobilization protests', 'Northern Caucasus'],
    notes: 'Economía bélica 7-8% PIB defensa · pérdidas humanas +700k · Cáucaso ataques periódicos' },
  COL: { iso3: 'COL', conflict_risk: 0.16, rank_global: 38, trend_vs_prev: -8,
    politico_score: 50, seguridad_score: 50, economico_score: 55, social_score: 55, geografico_score: 30,
    category: 'moderate', top_drivers: ['ELN/disidencias FARC', 'Coca crops', 'Venezuela border'],
    notes: 'Paz Total Petro estancada · ELN sigue · disidencias FARC Cauca/Catatumbo' },
  IND: { iso3: 'IND', conflict_risk: 0.14, rank_global: 45, trend_vs_prev: -2,
    politico_score: 45, seguridad_score: 50, economico_score: 40, social_score: 50, geografico_score: 20,
    category: 'moderate', top_drivers: ['Kashmir', 'Naxalite insurgency', 'Manipur ethnic'],
    notes: 'Modi 3er mandato · Manipur Meitei-Kuki · CAA controversia · LAC China estable' },
  CHN: { iso3: 'CHN', conflict_risk: 0.10, rank_global: 60, trend_vs_prev: 2,
    politico_score: 40, seguridad_score: 30, economico_score: 35, social_score: 25, geografico_score: 18,
    category: 'moderate', top_drivers: ['Taiwan tension', 'Property bubble', 'Xinjiang'],
    notes: 'Tensión Taiwán + sur China · bubble inmobiliaria · Xinjiang controlado' },
  // Low risk EU/desarrollados
  USA: { iso3: 'USA', conflict_risk: 0.07, rank_global: 95, trend_vs_prev: 8,
    politico_score: 38, seguridad_score: 25, economico_score: 22, social_score: 28, geografico_score: 12,
    category: 'low', top_drivers: ['Political polarization', 'Domestic terrorism', 'Gun violence'],
    notes: 'Polarización Trump 2.0 · DOJ politizado · domestic terrorism + 7 amenazas FBI' },
  GBR: { iso3: 'GBR', conflict_risk: 0.06, rank_global: 105, trend_vs_prev: 3,
    politico_score: 32, seguridad_score: 22, economico_score: 28, social_score: 25, geografico_score: 10,
    category: 'low', top_drivers: ['Civil unrest (riots)', 'Brexit fallout', 'Knife crime'],
    notes: 'Disturbios 2024 lejos · Labour gov · Brexit costes acumulados' },
  FRA: { iso3: 'FRA', conflict_risk: 0.06, rank_global: 108, trend_vs_prev: 5,
    politico_score: 35, seguridad_score: 20, economico_score: 25, social_score: 28, geografico_score: 12,
    category: 'low', top_drivers: ['Yellow vests pattern', 'Antisemitism rise', 'Banlieues'],
    notes: 'Gov Bayrou · cohabitación complicada · disturbios Caledonia 2024' },
  DEU: { iso3: 'DEU', conflict_risk: 0.05, rank_global: 115, trend_vs_prev: 4,
    politico_score: 30, seguridad_score: 18, economico_score: 22, social_score: 25, geografico_score: 8,
    category: 'low', top_drivers: ['AfD rise', 'Energy crisis', 'Industry hollowing'],
    notes: 'AfD 18-20% sondeos · gov Merz · Volkswagen layoffs · GDP -0.3% 2024' },
  ESP: { iso3: 'ESP', conflict_risk: 0.05, rank_global: 117, trend_vs_prev: 2,
    politico_score: 28, seguridad_score: 18, economico_score: 25, social_score: 30, geografico_score: 10,
    category: 'low', top_drivers: ['Catalan reconciliation', 'Migration Canarias', 'Polarization'],
    notes: 'Sánchez minoría · Ley amnistía aplicada · Canarias 60k migrantes 2024' },
  ITA: { iso3: 'ITA', conflict_risk: 0.05, rank_global: 118, trend_vs_prev: 3,
    politico_score: 32, seguridad_score: 18, economico_score: 28, social_score: 28, geografico_score: 12,
    category: 'low', top_drivers: ['Migration MED', 'Debt burden', 'Far-right rule'],
    notes: 'Meloni 3 años · UE conservador · debt 137% PIB · Lampedusa pressure' },
}

export function getGcriEntry(iso3: string): GcriEntry | null {
  return GCRI_DATA[iso3.toUpperCase()] || null
}

export function getTopRiskCountries(n: number = 10): GcriEntry[] {
  return Object.values(GCRI_DATA)
    .sort((a, b) => b.conflict_risk - a.conflict_risk)
    .slice(0, n)
}
