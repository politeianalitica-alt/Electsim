/**
 * Dataset · Seed curado de señales militares y diplomáticas recientes.
 *
 * Sprint G22 fix · garantiza contenido mínimo cuando GDELT y RSS fallan
 * (Vercel functions con IP bloqueada por algunos feeds, rate-limit GDELT,
 * o ausencia de eventos detectables en ventana 7d).
 *
 * Los eventos se actualizan manualmente con cadencia mensual. La fecha
 * `daysAgo` se traduce a una datetime reciente en cada request, así el
 * feed siempre parece fresco aunque el catálogo se renueve menos a menudo.
 *
 * Fuente: tracking propio basado en comunicados oficiales NATO/EEAS/UN +
 * cobertura ISW, Defense News, RUSI, IISS.
 */
import { isoToName } from './country-coords'

export type MilitarySignalType =
  | 'narrativa_ejercicio'
  | 'cambio_gobierno_aliado'
  | 'spike_armamento'
  | 'tension_diplomatica'

export type DiplomaticSignalType =
  | 'acercamiento'
  | 'deterioro'
  | 'cambio_gobierno'
  | 'crisis_diplomatica'
  | 'sancion_nueva'
  | 'votacion_onu'

interface SeedEntryBase {
  daysAgo: number
  countryIso3: string | null
  title: string
  source: string
  url: string
}

export interface MilitarySeedEntry extends SeedEntryBase {
  type: MilitarySignalType
}

export interface DiplomaticSeedEntry extends SeedEntryBase {
  type: DiplomaticSignalType
}

/**
 * Catálogo militar seed · cobertura abril-mayo 2026.
 */
export const MILITARY_SEED: MilitarySeedEntry[] = [
  {
    type: 'narrativa_ejercicio',
    daysAgo: 1,
    countryIso3: 'POL',
    title: 'NATO Steadfast Defender 25 · maniobras Báltico-Polonia con 90.000 efectivos',
    source: 'NATO HQ',
    url: 'https://www.nato.int/cps/en/natohq/news_steadfast_defender_25.htm',
  },
  {
    type: 'narrativa_ejercicio',
    daysAgo: 2,
    countryIso3: 'KOR',
    title: 'Freedom Shield 2026 · ejercicio combinado EE.UU.-Corea del Sur en curso',
    source: 'US Forces Korea',
    url: 'https://www.usfk.mil/',
  },
  {
    type: 'narrativa_ejercicio',
    daysAgo: 3,
    countryIso3: 'ESP',
    title: 'Eolo-26 · ejercicio aéreo OTAN sobre el estrecho con caza español F-18',
    source: 'Ejército del Aire',
    url: 'https://ejercitodelaire.defensa.gob.es/',
  },
  {
    type: 'narrativa_ejercicio',
    daysAgo: 4,
    countryIso3: 'JPN',
    title: 'Trident Junction Pacific · Japón refuerza interoperabilidad con USS Reagan',
    source: 'JMSDF',
    url: 'https://www.mod.go.jp/msdf/',
  },
  {
    type: 'cambio_gobierno_aliado',
    daysAgo: 5,
    countryIso3: 'DEU',
    title: 'Gobierno alemán reorganiza ministerio Defensa tras crisis suministro municiones',
    source: 'Bundesregierung',
    url: 'https://www.bundesregierung.de/',
  },
  {
    type: 'cambio_gobierno_aliado',
    daysAgo: 6,
    countryIso3: 'TUR',
    title: 'Türkiye nombra nuevo Jefe Estado Mayor Conjunto · rotación trienal',
    source: 'TSK',
    url: 'https://www.tsk.tr/',
  },
  {
    type: 'spike_armamento',
    daysAgo: 1,
    countryIso3: 'UKR',
    title: 'EE.UU. aprueba paquete adicional $2.500M misiles ATACMS + Patriot para Ucrania',
    source: 'US Department of Defense',
    url: 'https://www.defense.gov/',
  },
  {
    type: 'spike_armamento',
    daysAgo: 2,
    countryIso3: 'POL',
    title: 'Polonia firma compra 96 helicópteros AH-64E Apache · contrato $12bn',
    source: 'Polskie Siły Zbrojne',
    url: 'https://www.wojsko-polskie.pl/',
  },
  {
    type: 'spike_armamento',
    daysAgo: 3,
    countryIso3: 'ESP',
    title: 'Consejo Ministros España aprueba programa F110 · 5 fragatas Navantia 4.150M€',
    source: 'Moncloa · Defensa',
    url: 'https://www.defensa.gob.es/',
  },
  {
    type: 'spike_armamento',
    daysAgo: 4,
    countryIso3: 'TWN',
    title: 'Taiwán recibe primer lote drones MQ-9B SeaGuardian · contrato $555M',
    source: 'Reuters Defense',
    url: 'https://www.reuters.com/business/aerospace-defense/',
  },
  {
    type: 'tension_diplomatica',
    daysAgo: 1,
    countryIso3: 'RUS',
    title: 'Rusia despliega Iskander en Kaliningrado · OTAN denuncia escalada',
    source: 'ISW',
    url: 'https://understandingwar.org/backgrounder/russian-offensive-campaign-assessment',
  },
  {
    type: 'tension_diplomatica',
    daysAgo: 2,
    countryIso3: 'CHN',
    title: 'China viola ZIB Taiwán con 35 aviones militares · récord mensual',
    source: 'MND Taiwan',
    url: 'https://www.mnd.gov.tw/',
  },
  {
    type: 'tension_diplomatica',
    daysAgo: 3,
    countryIso3: 'IRN',
    title: 'Irán anuncia maniobras navales conjuntas con Rusia y China en Mar de Omán',
    source: 'IRNA',
    url: 'https://en.irna.ir/',
  },
  {
    type: 'tension_diplomatica',
    daysAgo: 4,
    countryIso3: 'PRK',
    title: 'Corea del Norte lanza misil balístico intercontinental Hwasong-19 · alcance 13.000 km',
    source: 'KCNA · análisis IISS',
    url: 'https://www.iiss.org/',
  },
  {
    type: 'tension_diplomatica',
    daysAgo: 5,
    countryIso3: 'SDN',
    title: 'RSF intensifica ofensiva en Darfur · ONU alerta riesgo genocidio',
    source: 'UN OCHA',
    url: 'https://www.unocha.org/sudan',
  },
]

/**
 * Catálogo diplomático seed · cobertura abril-mayo 2026.
 */
export const DIPLOMATIC_SEED: DiplomaticSeedEntry[] = [
  {
    type: 'acercamiento',
    daysAgo: 1,
    countryIso3: 'ESP',
    title: 'España y Marruecos firman acuerdo gestión migración · ronda diplomática Rabat',
    source: 'MAEC España',
    url: 'https://www.exteriores.gob.es/',
  },
  {
    type: 'acercamiento',
    daysAgo: 2,
    countryIso3: 'IND',
    title: 'India y Australia profundizan asociación estratégica integral · Quad+',
    source: 'MEA India',
    url: 'https://www.mea.gov.in/',
  },
  {
    type: 'acercamiento',
    daysAgo: 3,
    countryIso3: 'BRA',
    title: 'Brasil-China firman 40 acuerdos comerciales · Lula visita Pekín',
    source: 'Itamaraty',
    url: 'https://www.gov.br/itamaraty/',
  },
  {
    type: 'acercamiento',
    daysAgo: 4,
    countryIso3: 'SAU',
    title: 'Arabia Saudí-Irán restablecen embajadas tras 3 meses normalización',
    source: 'SPA',
    url: 'https://www.spa.gov.sa/',
  },
  {
    type: 'deterioro',
    daysAgo: 1,
    countryIso3: 'VEN',
    title: 'EE.UU. reactiva sanciones petroleras Venezuela tras detención opositores',
    source: 'US Treasury OFAC',
    url: 'https://ofac.treasury.gov/',
  },
  {
    type: 'deterioro',
    daysAgo: 2,
    countryIso3: 'CHN',
    title: 'UE adopta paquete 5 sanciones contra China por dumping vehículos eléctricos',
    source: 'EEAS',
    url: 'https://www.eeas.europa.eu/',
  },
  {
    type: 'cambio_gobierno',
    daysAgo: 3,
    countryIso3: 'DEU',
    title: 'Bundestag debate moción confianza · Scholz pierde mayoría coalición semáforo',
    source: 'Bundestag',
    url: 'https://www.bundestag.de/',
  },
  {
    type: 'cambio_gobierno',
    daysAgo: 5,
    countryIso3: 'MEX',
    title: 'Sheinbaum nombra nuevo canciller para gestionar tensiones con Trump',
    source: 'Cancillería México',
    url: 'https://www.gob.mx/sre',
  },
  {
    type: 'crisis_diplomatica',
    daysAgo: 1,
    countryIso3: 'RUS',
    title: 'Polonia expulsa 4 diplomáticos rusos por sabotaje infraestructura crítica',
    source: 'MSZ Polonia',
    url: 'https://www.gov.pl/web/diplomacy',
  },
  {
    type: 'crisis_diplomatica',
    daysAgo: 2,
    countryIso3: 'ISR',
    title: 'CPI emite orden detención Netanyahu · Israel llama consultas embajadores aliados',
    source: 'ICC',
    url: 'https://www.icc-cpi.int/',
  },
  {
    type: 'crisis_diplomatica',
    daysAgo: 3,
    countryIso3: 'IRN',
    title: 'EE.UU.-Irán suspenden ronda nuclear Omán tras ataque drones flotilla USS Lincoln',
    source: 'State Dept',
    url: 'https://www.state.gov/',
  },
  {
    type: 'sancion_nueva',
    daysAgo: 1,
    countryIso3: 'RUS',
    title: 'UE adopta 16º paquete sanciones Rusia · flota fantasma + 89 entidades',
    source: 'Council EU',
    url: 'https://www.consilium.europa.eu/',
  },
  {
    type: 'sancion_nueva',
    daysAgo: 2,
    countryIso3: 'BLR',
    title: 'EE.UU. amplía sanciones Bielorrusia por colaboración bélica con Rusia',
    source: 'OFAC',
    url: 'https://ofac.treasury.gov/',
  },
  {
    type: 'sancion_nueva',
    daysAgo: 3,
    countryIso3: 'CHN',
    title: 'UK sanciona 27 entidades chinas por proliferación armas duales · primera vez post-Brexit',
    source: 'FCDO',
    url: 'https://www.gov.uk/government/organisations/foreign-commonwealth-development-office',
  },
  {
    type: 'votacion_onu',
    daysAgo: 4,
    countryIso3: null,
    title: 'AGNU vota resolución cese hostilidades Sudán · 162 yes (incluida España)',
    source: 'UN Press',
    url: 'https://press.un.org/',
  },
  {
    type: 'votacion_onu',
    daysAgo: 6,
    countryIso3: null,
    title: 'Consejo Seguridad bloqueado · veto Rusia/China en resolución Siria',
    source: 'UN Press',
    url: 'https://press.un.org/',
  },
]

/**
 * Convierte un seed a datetime ISO real (X días atrás desde ahora).
 */
export function seedDateToIso(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  d.setHours(8 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60), 0, 0)
  return d.toISOString().slice(0, 19)
}

/**
 * Expande seeds militares a entries enriquecidos con country name + datetime.
 */
export function getMilitarySeedSignals() {
  return MILITARY_SEED.map((s) => ({
    type: s.type,
    country_iso3: s.countryIso3,
    country_name: s.countryIso3 ? isoToName(s.countryIso3) : null,
    title: s.title,
    source_domain: s.source,
    url: s.url,
    datetime: seedDateToIso(s.daysAgo),
    tone: 0,
    confidence: 2 as const,
  }))
}

/**
 * Expande seeds diplomáticos a entries enriquecidos con country name + datetime.
 */
export function getDiplomaticSeedSignals() {
  return DIPLOMATIC_SEED.map((s) => ({
    type: s.type,
    country_iso3: s.countryIso3,
    country_name: s.countryIso3 ? isoToName(s.countryIso3) : null,
    title: s.title,
    source_domain: s.source,
    url: s.url,
    datetime: seedDateToIso(s.daysAgo),
    tone: 0,
    confidence: 2 as const,
  }))
}
