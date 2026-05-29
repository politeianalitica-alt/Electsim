/**
 * Dataset · misiones militares en el exterior + desglose presupuesto defensa.
 *
 * Sprint G23 · usuario pidió "presencia militar en el exterior" + "Desglose
 * presupuestario" en cada ficha militar.
 *
 * Fuentes:
 *   - Misiones: NATO operations + UN peacekeeping (DPKO) + acuerdos bilaterales
 *   - Presupuesto desglose: NATO Defence Expenditures + IISS Military Balance 2024
 */

export interface MilitaryMission {
  /** Nombre operativo de la misión */
  name: string
  /** Tipo · NATO, UN, EU, bilateral, multilateral_ad_hoc */
  type: 'NATO' | 'UN' | 'EU' | 'bilateral' | 'multilateral_ad_hoc'
  /** País destino · iso3 */
  host_iso3: string
  /** Efectivos desplegados (aproximado) */
  personnel: number
  /** Desde año */
  since_year: number
  /** Activo actualmente */
  active: boolean
  /** Mandato resumido */
  mandate: string
}

export interface BudgetBreakdown {
  /** Presupuesto 2024 USD bn (debe coincidir con SIPRI) */
  total_usd_bn: number
  /** % personal */
  personnel_pct: number
  /** % operaciones y mantenimiento */
  operations_maintenance_pct: number
  /** % adquisiciones (procurement) */
  procurement_pct: number
  /** % I+D defensa */
  rd_pct: number
  /** % infraestructura */
  infrastructure_pct: number
  /** % otros (jubilaciones, etc.) */
  other_pct: number
  /** Notas (e.g. "100 bn fondo especial Zeitenwende") */
  notes: string
  /** Año de la cifra */
  fiscal_year: number
}

export interface CountryMilitaryAbroad {
  iso3: string
  /** Total efectivos desplegados en el exterior */
  total_personnel_abroad: number
  /** Bases militares permanentes en el exterior */
  permanent_bases_abroad: number
  /** Misiones activas */
  missions: MilitaryMission[]
  /** Desglose presupuesto */
  budget_breakdown: BudgetBreakdown
}

export const COUNTRY_MILITARY_ABROAD: Record<string, CountryMilitaryAbroad> = {
  USA: {
    iso3: 'USA', total_personnel_abroad: 173800, permanent_bases_abroad: 750,
    budget_breakdown: { total_usd_bn: 916, personnel_pct: 26.5, operations_maintenance_pct: 32.0, procurement_pct: 17.5, rd_pct: 14.5, infrastructure_pct: 2.5, other_pct: 7.0, notes: 'Mayor presupuesto militar mundial · 3.4% PIB · incluye OCO (Overseas Contingency Operations) integrado en base budget desde 2022.', fiscal_year: 2024 },
    missions: [
      { name: 'USFK Korea', type: 'bilateral', host_iso3: 'KOR', personnel: 28500, since_year: 1957, active: true, mandate: 'Disuasión Corea del Norte · acuerdo defensa mutua 1953.' },
      { name: 'USFJ Japan', type: 'bilateral', host_iso3: 'JPN', personnel: 53700, since_year: 1952, active: true, mandate: 'Tratado seguridad mutua 1960 · bases Okinawa/Yokosuka/Misawa.' },
      { name: 'USAREUR-AF Germany', type: 'NATO', host_iso3: 'DEU', personnel: 36000, since_year: 1955, active: true, mandate: 'NATO European Reassurance + hub logístico flanco oriental.' },
      { name: 'Operation Inherent Resolve', type: 'multilateral_ad_hoc', host_iso3: 'IRQ', personnel: 2500, since_year: 2014, active: true, mandate: 'Coalición anti-Daesh · adviser-assist post-2021.' },
      { name: 'USFOR-A Afghanistan (legacy)', type: 'bilateral', host_iso3: 'AFG', personnel: 0, since_year: 2001, active: false, mandate: 'Retirada completada 2021.' },
    ],
  },
  GBR: {
    iso3: 'GBR', total_personnel_abroad: 8950, permanent_bases_abroad: 16,
    budget_breakdown: { total_usd_bn: 84.6, personnel_pct: 32.5, operations_maintenance_pct: 28.5, procurement_pct: 22.5, rd_pct: 8.5, infrastructure_pct: 3.5, other_pct: 4.5, notes: 'Aumento 2.5% PIB anunciado 2024 · AUKUS pillar 2 + nuclear deterrent (Vanguard/Dreadnought) consume 6% del presupuesto.', fiscal_year: 2024 },
    missions: [
      { name: 'BFC Cyprus (Sovereign Bases)', type: 'bilateral', host_iso3: 'CYP', personnel: 2700, since_year: 1960, active: true, mandate: 'Akrotiri + Dhekelia · ISR sobre Oriente Medio.' },
      { name: 'BATUK Kenya', type: 'bilateral', host_iso3: 'KEN', personnel: 400, since_year: 1964, active: true, mandate: 'Adiestramiento + cooperación seguridad.' },
      { name: 'BFB Belize', type: 'bilateral', host_iso3: 'BLZ', personnel: 200, since_year: 1981, active: true, mandate: 'Jungle warfare training.' },
      { name: 'Op Cabrit Estonia', type: 'NATO', host_iso3: 'EST', personnel: 900, since_year: 2017, active: true, mandate: 'eFP Battlegroup framework nation Estonia.' },
      { name: 'Op Newcombe Mali', type: 'UN', host_iso3: 'MLI', personnel: 0, since_year: 2020, active: false, mandate: 'Retirada MINUSMA junto coalición 2023.' },
    ],
  },
  FRA: {
    iso3: 'FRA', total_personnel_abroad: 7500, permanent_bases_abroad: 11,
    budget_breakdown: { total_usd_bn: 64.3, personnel_pct: 38.5, operations_maintenance_pct: 25.0, procurement_pct: 22.5, rd_pct: 8.0, infrastructure_pct: 3.5, other_pct: 2.5, notes: 'LPM 2024-2030 · 413bn EUR · enfoque alta intensidad + nuclear (Force de Frappe 12% presupuesto).', fiscal_year: 2024 },
    missions: [
      { name: 'Op Daman Lebanon (FINUL)', type: 'UN', host_iso3: 'LBN', personnel: 700, since_year: 1978, active: true, mandate: 'UNIFIL contingente francés.' },
      { name: 'FFDJ Djibouti', type: 'bilateral', host_iso3: 'DJI', personnel: 1500, since_year: 1977, active: true, mandate: 'Base permanente entrada Mar Rojo · contraterrorismo + counterpiracy.' },
      { name: 'FFEAU UAE', type: 'bilateral', host_iso3: 'ARE', personnel: 700, since_year: 2009, active: true, mandate: 'Base Camp de la Paix · pivote Golfo.' },
      { name: 'Op Chammal Iraq/Syria', type: 'multilateral_ad_hoc', host_iso3: 'IRQ', personnel: 600, since_year: 2014, active: true, mandate: 'Coalición anti-Daesh · CdG porte-avions intermitente.' },
      { name: 'eFP Romania', type: 'NATO', host_iso3: 'ROU', personnel: 500, since_year: 2022, active: true, mandate: 'Framework nation eFP+ post-2022 Ucrania.' },
      { name: 'Op Barkhane Sahel', type: 'bilateral', host_iso3: 'MLI', personnel: 0, since_year: 2014, active: false, mandate: 'Concluida 2022 · expulsada por gobiernos golpistas Mali/Burkina/Níger.' },
    ],
  },
  DEU: {
    iso3: 'DEU', total_personnel_abroad: 3200, permanent_bases_abroad: 2,
    budget_breakdown: { total_usd_bn: 66.8, personnel_pct: 34.0, operations_maintenance_pct: 26.5, procurement_pct: 22.5, rd_pct: 7.5, infrastructure_pct: 6.5, other_pct: 3.0, notes: 'Zeitenwende post-2022 · 100bn EUR fondo especial Sondervermögen aparte del presupuesto regular · meta 2% PIB alcanzada 2024.', fiscal_year: 2024 },
    missions: [
      { name: 'eFP Lithuania (brigade)', type: 'NATO', host_iso3: 'LTU', personnel: 1200, since_year: 2017, active: true, mandate: 'Framework nation · escalando a brigada permanente 5000 efectivos 2027.' },
      { name: 'KFOR Kosovo', type: 'NATO', host_iso3: 'XKX', personnel: 80, since_year: 1999, active: true, mandate: 'Componente alemán reducido (de 6000 inicial).' },
      { name: 'EU Mali Training Mission (legacy)', type: 'EU', host_iso3: 'MLI', personnel: 0, since_year: 2013, active: false, mandate: 'Retirada 2024.' },
      { name: 'UNIFIL Lebanon', type: 'UN', host_iso3: 'LBN', personnel: 130, since_year: 2006, active: true, mandate: 'Componente naval principalmente.' },
    ],
  },
  ESP: {
    iso3: 'ESP', total_personnel_abroad: 3200, permanent_bases_abroad: 0,
    budget_breakdown: { total_usd_bn: 19.7, personnel_pct: 53.5, operations_maintenance_pct: 22.5, procurement_pct: 15.5, rd_pct: 5.5, infrastructure_pct: 1.5, other_pct: 1.5, notes: '1.28% PIB 2024 · meta 2% comprometida 2029 · presupuesto extraordinario PNRR para programas estratégicos (F-110, NH90, Eurofighter Tr.4) · ~1.5bn EUR/año en operaciones internacionales.', fiscal_year: 2024 },
    missions: [
      { name: 'FINUL Lebanon', type: 'UN', host_iso3: 'LBN', personnel: 670, since_year: 2006, active: true, mandate: 'Spanish Brigade Líbano · sector Este.' },
      { name: 'eFP Latvia/Slovakia', type: 'NATO', host_iso3: 'SVK', personnel: 700, since_year: 2017, active: true, mandate: 'Framework nation Eslovaquia desde 2022 · NASAMS desplegados.' },
      { name: 'Op A/R Atlanta-Indian Ocean', type: 'EU', host_iso3: 'SOM', personnel: 280, since_year: 2008, active: true, mandate: 'EU NAVFOR counterpiracy Golfo de Adén.' },
      { name: 'EU NAVFOR Aspides Red Sea', type: 'EU', host_iso3: 'YEM', personnel: 200, since_year: 2024, active: true, mandate: 'Protección flota mercante vs ataques Houthi · fragata permanente.' },
      { name: 'Op Inherent Resolve Iraq', type: 'multilateral_ad_hoc', host_iso3: 'IRQ', personnel: 280, since_year: 2015, active: true, mandate: 'Adiestramiento fuerzas seguridad iraquíes · sector Besmayah.' },
      { name: 'KFOR Kosovo', type: 'NATO', host_iso3: 'XKX', personnel: 380, since_year: 1999, active: true, mandate: 'Battlegroup West.' },
      { name: 'EUMAM Ucrania', type: 'EU', host_iso3: 'UKR', personnel: 280, since_year: 2022, active: true, mandate: 'Asistencia militar adiestramiento · Toledo/Zaragoza/Cartagena.' },
    ],
  },
  ITA: {
    iso3: 'ITA', total_personnel_abroad: 6000, permanent_bases_abroad: 0,
    budget_breakdown: { total_usd_bn: 33.5, personnel_pct: 53.5, operations_maintenance_pct: 19.5, procurement_pct: 18.5, rd_pct: 5.0, infrastructure_pct: 2.0, other_pct: 1.5, notes: '1.49% PIB 2024 · meta 2% PIB anunciada 2027.', fiscal_year: 2024 },
    missions: [
      { name: 'UNIFIL Lebanon', type: 'UN', host_iso3: 'LBN', personnel: 1100, since_year: 1979, active: true, mandate: 'Mayor contingente UNIFIL · HQ francés-italiano-español.' },
      { name: 'eFP Latvia/Hungary', type: 'NATO', host_iso3: 'HUN', personnel: 800, since_year: 2022, active: true, mandate: 'Framework nation Hungría desde 2022.' },
      { name: 'KFOR Kosovo', type: 'NATO', host_iso3: 'XKX', personnel: 700, since_year: 1999, active: true, mandate: 'Battlegroup multinational HQ.' },
      { name: 'Op Niger', type: 'bilateral', host_iso3: 'NER', personnel: 0, since_year: 2018, active: false, mandate: 'Retirada 2024 tras golpe.' },
      { name: 'Op Prima Parthica Iraq', type: 'multilateral_ad_hoc', host_iso3: 'IRQ', personnel: 600, since_year: 2014, active: true, mandate: 'Coalición anti-Daesh.' },
    ],
  },
  TUR: {
    iso3: 'TUR', total_personnel_abroad: 35000, permanent_bases_abroad: 12,
    budget_breakdown: { total_usd_bn: 40.1, personnel_pct: 38.5, operations_maintenance_pct: 25.0, procurement_pct: 25.5, rd_pct: 7.5, infrastructure_pct: 2.5, other_pct: 1.0, notes: '3.4% PIB · gran inversor industria doméstica (Aselsan, TUSAS, Baykar) · F-35 vetado desde 2019 por compra S-400.', fiscal_year: 2024 },
    missions: [
      { name: 'TSK North Cyprus', type: 'bilateral', host_iso3: 'CYP', personnel: 35000, since_year: 1974, active: true, mandate: 'Presencia desde intervención 1974 · República Turca Norte de Chipre.' },
      { name: 'Op Peace Spring Syria', type: 'bilateral', host_iso3: 'SYR', personnel: 6000, since_year: 2019, active: true, mandate: 'Zona buffer norte Siria · contra YPG/PKK.' },
      { name: 'TUR-Iraq Operation Claw', type: 'bilateral', host_iso3: 'IRQ', personnel: 3500, since_year: 2020, active: true, mandate: 'Operaciones cross-border contra PKK norte Iraq.' },
      { name: 'TFAS Somalia (training center)', type: 'bilateral', host_iso3: 'SOM', personnel: 200, since_year: 2017, active: true, mandate: 'Mayor base TUR en el exterior · adiestramiento somalí.' },
      { name: 'Tarinkot Qatar (Qatar-Turkish Combined Joint Force)', type: 'bilateral', host_iso3: 'QAT', personnel: 5000, since_year: 2017, active: true, mandate: 'Base permanente Doha post-bloqueo 2017.' },
      { name: 'TSK Libya (presence)', type: 'bilateral', host_iso3: 'LBY', personnel: 1500, since_year: 2020, active: true, mandate: 'Apoyo GNA/GNU contra LNA Haftar.' },
    ],
  },
  RUS: {
    iso3: 'RUS', total_personnel_abroad: 280000, permanent_bases_abroad: 14,
    budget_breakdown: { total_usd_bn: 109, personnel_pct: 32.5, operations_maintenance_pct: 31.0, procurement_pct: 24.5, rd_pct: 8.5, infrastructure_pct: 2.5, other_pct: 1.0, notes: 'Economía bélica · 7-8% PIB 2024 (datos opacos) · presupuesto duplicado vs 2021 · producción intensiva munición + drones.', fiscal_year: 2024 },
    missions: [
      { name: 'SVO Ukraine (Special Military Operation)', type: 'bilateral', host_iso3: 'UKR', personnel: 470000, since_year: 2022, active: true, mandate: 'Operación principal · Donbass + sur Ucrania.' },
      { name: 'Khmeimim Air Base Syria', type: 'bilateral', host_iso3: 'SYR', personnel: 4500, since_year: 2015, active: true, mandate: 'Base aérea + Tartus naval · presencia post-2015 · reducida post-2024 caída Assad.' },
      { name: 'CSTO Armenia (Gyumri)', type: 'multilateral_ad_hoc', host_iso3: 'ARM', personnel: 5000, since_year: 1995, active: true, mandate: 'Base 102 (Gyumri) · cooperación con FFAA armenias.' },
      { name: 'Wagner/Africa Corps Sahel', type: 'bilateral', host_iso3: 'MLI', personnel: 2000, since_year: 2021, active: true, mandate: 'Tras retirada francesa · presencia indirecta vía PMC.' },
    ],
  },
  CHN: {
    iso3: 'CHN', total_personnel_abroad: 3500, permanent_bases_abroad: 1,
    budget_breakdown: { total_usd_bn: 296, personnel_pct: 30.5, operations_maintenance_pct: 29.5, procurement_pct: 25.5, rd_pct: 11.5, infrastructure_pct: 2.0, other_pct: 1.0, notes: '1.7% PIB declarado · estimaciones SIPRI 1.5-2x cifra oficial · expansión PLAN (J-20, J-35, Type 055, portaaviones).', fiscal_year: 2024 },
    missions: [
      { name: 'PLA Support Base Djibouti', type: 'bilateral', host_iso3: 'DJI', personnel: 2000, since_year: 2017, active: true, mandate: 'Única base militar permanente extranjera · counterpiracy + apoyo BRI Cuerno África.' },
      { name: 'UN Peacekeeping Mali/RDC', type: 'UN', host_iso3: 'COD', personnel: 200, since_year: 2010, active: true, mandate: 'MONUSCO contingente · expansión soft-power UN.' },
      { name: 'Counterpiracy Gulf of Aden', type: 'multilateral_ad_hoc', host_iso3: 'YEM', personnel: 800, since_year: 2008, active: true, mandate: 'Rotación destructores/fragatas · escolta mercante.' },
    ],
  },
}

export function getCountryMilitaryAbroad(iso3: string): CountryMilitaryAbroad | null {
  return COUNTRY_MILITARY_ABROAD[iso3.toUpperCase()] || null
}
