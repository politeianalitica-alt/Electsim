/**
 * TiposCatalog · Turismo v3 · Sprint T7
 *
 * Catálogo de la vista "Tipos de turismo":
 *   1) `TIPOS_NAV` · orden + metadata de la sub-nav (id, label, glyph, live?).
 *   2) Datasets CURADOS + DATADOS (fuente + fecha obligatorias) para los tipos
 *      sin endpoint vivo: MICE, salud/wellness, deportivo (esquí/golf),
 *      gastronómico, religioso (Camino), idiomático, shopping, y el contexto
 *      curado que complementa cultural.
 *
 * Principio (CLAUDE.md): NO se inventan cifras. Cada dato curado lleva su
 * organismo emisor y su año/fecha de referencia, son cifras públicas verificables
 * (Oficina del Peregrino, ATUDEM/estaciones, RFEG, IFEMA/Fira, ICCA, Instituto
 * Cervantes, Global Blue, Spaincares, etc.). Si una cifra no se puede datar con
 * fuente pública, NO se incluye.
 *
 * Este fichero es datos puros (sin JSX) → se importa tanto en TiposNav como en
 * los paneles. Cero emojis · Unicode.
 */
import type { FichaProps } from './TiposShared'

// ─────────────────────────────────────────────────────────────────────────
// Identificadores + sub-nav
// ─────────────────────────────────────────────────────────────────────────

export type TipoId =
  | 'solplaya'
  | 'urbano'
  | 'rural'
  | 'cruceros'
  | 'cultural'
  | 'mice'
  | 'salud'
  | 'deportivo'
  | 'gastronomico'
  | 'religioso'
  | 'idiomatico'
  | 'shopping'

export interface TipoNavItem {
  id: TipoId
  label: string
  glyph: string
  /** true si el panel consume un endpoint con dato vivo. */
  live: boolean
  desc: string
}

export const TIPOS_NAV: TipoNavItem[] = [
  { id: 'solplaya', label: 'Sol y playa', glyph: '☼', live: true, desc: 'CCAA costeras · pernoctaciones + clima (AEMET)' },
  { id: 'urbano', label: 'Urbano', glyph: '◳', live: true, desc: 'Grandes ciudades · pernoctaciones por destino' },
  { id: 'rural', label: 'Rural y naturaleza', glyph: '⬡', live: true, desc: 'EOTR ocupación rural + destinos de naturaleza' },
  { id: 'cruceros', label: 'Cruceros', glyph: '⚓', live: true, desc: 'Pasajeros de crucero por puerto → /puertos' },
  { id: 'cultural', label: 'Cultural', glyph: '◈', live: true, desc: 'Destinos culturales + patrimonio UNESCO' },
  { id: 'mice', label: 'MICE / negocios', glyph: '◰', live: false, desc: 'Congresos y ferias (ICCA, IFEMA, Fira)' },
  { id: 'salud', label: 'Salud y wellness', glyph: '✚', live: false, desc: 'Turismo médico y de bienestar' },
  { id: 'deportivo', label: 'Deportivo', glyph: '⛷', live: false, desc: 'Esquí y golf' },
  { id: 'gastronomico', label: 'Gastronómico', glyph: '◐', live: false, desc: 'Enoturismo y alta cocina' },
  { id: 'religioso', label: 'Religioso', glyph: '✦', live: false, desc: 'Camino de Santiago · peregrinos' },
  { id: 'idiomatico', label: 'Idiomático', glyph: '◵', live: false, desc: 'Español como lengua extranjera' },
  { id: 'shopping', label: 'Shopping', glyph: '◇', live: false, desc: 'Compras de turistas extracomunitarios' },
]

// ─────────────────────────────────────────────────────────────────────────
// MICE / negocios · congresos y ferias (curado + datado)
// ─────────────────────────────────────────────────────────────────────────

export const MICE_FICHAS: FichaProps[] = [
  {
    titulo: 'España en el ranking ICCA de congresos internacionales',
    metrics: [
      { label: 'Reuniones internac. (país)', value: '~600/año' },
      { label: 'Posición mundial', value: 'Top 4-5' },
    ],
    cuerpo:
      'España es de forma estable uno de los cinco países del mundo con más reuniones internacionales asociativas, según el ranking anual de la ICCA. Madrid y Barcelona se sitúan habitualmente entre las primeras ciudades del mundo por número de congresos.',
    fuente: 'ICCA · Statistics Report (ranking por país y ciudad)',
    fecha: '2023',
    url: 'https://www.iccaworld.org/',
  },
  {
    titulo: 'IFEMA Madrid · recinto ferial',
    metrics: [
      { label: 'Visitantes/año', value: '~4M' },
      { label: 'Eventos/año', value: '~600' },
    ],
    cuerpo:
      'IFEMA Madrid es uno de los mayores operadores feriales de Europa (FITUR, ARCO, Fruit Attraction, etc.). Genera un fuerte impacto en pernoctaciones y gasto en hostelería y transporte de la Comunidad de Madrid.',
    fuente: 'IFEMA Madrid · memoria de actividad',
    fecha: '2023',
    url: 'https://www.ifema.es/',
  },
  {
    titulo: 'Fira de Barcelona · recinto ferial',
    metrics: [
      { label: 'Recinto Gran Via', value: '240.000 m²' },
      { label: 'Evento ancla', value: 'MWC' },
    ],
    cuerpo:
      'Fira de Barcelona opera Gran Via y Montjuïc y acoge el Mobile World Congress, uno de los eventos profesionales con mayor impacto económico de Europa (cientos de millones de euros y decenas de miles de asistentes internacionales por edición).',
    fuente: 'Fira de Barcelona / GSMA (MWC)',
    fecha: '2024',
    url: 'https://www.firabarcelona.com/',
  },
  {
    titulo: 'Perfil del turismo de negocios',
    cuerpo:
      'El viajero MICE tiene un gasto medio diario superior al de ocio y desestacionaliza la demanda (picos en primavera y otoño). El detalle de gasto por concepto del conjunto de turistas internacionales se puede consultar en la pestaña con datos de EGATUR.',
    fuente: 'INE EGATUR (gasto) · Turespaña (segmentación MICE)',
    fecha: '2024',
    url: 'https://www.ine.es/',
  },
]

// ─────────────────────────────────────────────────────────────────────────
// Salud y wellness (curado + datado)
// ─────────────────────────────────────────────────────────────────────────

export const SALUD_FICHAS: FichaProps[] = [
  {
    titulo: 'Turismo de salud en España',
    cuerpo:
      'España combina turismo médico (cirugía, fertilidad, oftalmología, dental) y de bienestar (balnearios, talasoterapia, spa). El clúster Spaincares agrupa a la industria para la promoción internacional del segmento médico.',
    fuente: 'Spaincares (clúster español de turismo de salud)',
    fecha: '2023',
    url: 'https://www.spaincares.com/',
  },
  {
    titulo: 'Balnearios y termalismo',
    metrics: [{ label: 'Balnearios en activo', value: '~100' }],
    cuerpo:
      'España cuenta con un centenar de balnearios con aguas mineromedicinales declaradas, repartidos por Galicia, Cataluña, Aragón, Andalucía y Castilla. El programa de Termalismo del Imserso sostiene buena parte de la demanda nacional fuera de temporada alta.',
    fuente: 'ANBAL (Asoc. Nacional de Balnearios) · Imserso',
    fecha: '2023',
    url: 'https://www.balnearios.org/',
  },
  {
    titulo: 'Turismo médico (fertilidad)',
    cuerpo:
      'España es uno de los principales destinos europeos de reproducción asistida por su marco legal y la calidad de sus clínicas, atrayendo pacientes internacionales (especialmente de Francia, Italia y Reino Unido). Las cifras precisas de pacientes extranjeros no se publican de forma oficial agregada.',
    fuente: 'SEF (Sociedad Española de Fertilidad)',
    fecha: '2022',
    url: 'https://www.sefertilidad.net/',
  },
]

// ─────────────────────────────────────────────────────────────────────────
// Deportivo · esquí + golf (curado + datado)
// ─────────────────────────────────────────────────────────────────────────

export const DEPORTIVO_FICHAS: FichaProps[] = [
  {
    titulo: 'Esquí · estaciones de España',
    metrics: [
      { label: 'Estaciones (ATUDEM)', value: '~30' },
      { label: 'Forfaits/temporada', value: '~5-6M' },
    ],
    cuerpo:
      'La asociación ATUDEM agrupa las estaciones de esquí españolas (Pirineo aragonés y catalán, Sierra Nevada, Cordillera Cantábrica, Sistema Central). El volumen de jornadas de esquí depende fuertemente de la nieve y la meteorología de cada campaña.',
    fuente: 'ATUDEM (Asoc. Turística de Estaciones de Esquí y Montaña)',
    fecha: '2023/24',
    url: 'https://www.atudem.es/',
  },
  {
    titulo: 'Sierra Nevada y Baqueira',
    cuerpo:
      'Sierra Nevada (Andalucía) y Baqueira Beret (Val d’Aran) son las estaciones líderes por afluencia y facturación; concentran buena parte del esquí de fin de semana y del turismo de nieve internacional de gama alta del país.',
    fuente: 'Cetursa Sierra Nevada · Baqueira Beret',
    fecha: '2024',
    url: 'https://sierranevada.es/',
  },
  {
    titulo: 'Golf · campos y licencias',
    metrics: [
      { label: 'Campos de golf', value: '~440' },
      { label: 'Federados (RFEG)', value: '~270.000' },
    ],
    cuerpo:
      'España es uno de los principales destinos de golf de Europa: concentra campos en la Costa del Sol, Costa Blanca, Murcia, Canarias y Baleares. El golf desestacionaliza (otoño-primavera) y atrae un turista de gasto elevado, sobre todo británico, nórdico y alemán.',
    fuente: 'RFEG (Real Federación Española de Golf)',
    fecha: '2023',
    url: 'https://www.rfegolf.es/',
  },
]

// ─────────────────────────────────────────────────────────────────────────
// Gastronómico (curado + datado · complementa la señal de gasto EGATUR)
// ─────────────────────────────────────────────────────────────────────────

export const GASTRO_FICHAS: FichaProps[] = [
  {
    titulo: 'Alta cocina · estrellas Michelin',
    metrics: [
      { label: 'Restaurantes con estrella', value: '~270' },
      { label: 'Tres estrellas', value: '~13' },
    ],
    cuerpo:
      'España es una potencia gastronómica mundial: País Vasco, Cataluña, Madrid y la Comunitat Valenciana concentran la mayoría de restaurantes estrellados. La gastronomía es un motor reconocido de turismo de gama alta y de promoción de marca-país.',
    fuente: 'Guía Michelin España & Portugal',
    fecha: '2024',
    url: 'https://guide.michelin.com/es/es',
  },
  {
    titulo: 'Enoturismo · Rutas del Vino de España',
    metrics: [{ label: 'Rutas certificadas (ACEVIN)', value: '~35' }],
    cuerpo:
      'Las Rutas del Vino de España (ACEVIN) certifican destinos enoturísticos (Rioja, Ribera del Duero, Jerez, Penedès, Rías Baixas, etc.). Combinan bodega, gastronomía y patrimonio, y desestacionalizan el turismo de interior.',
    fuente: 'ACEVIN · Rutas del Vino de España',
    fecha: '2023',
    url: 'https://www.wineroutesofspain.com/',
  },
  {
    titulo: 'Gasto en restauración del turista',
    cuerpo:
      'La restauración es una de las principales partidas del gasto turístico internacional. El desglose de gasto por concepto del conjunto de turistas internacionales (que incluye restauración y alimentación) se puede consultar con datos vivos de INE EGATUR.',
    fuente: 'INE EGATUR · gasto por conceptos',
    fecha: '2024',
    url: 'https://www.ine.es/',
  },
]

// ─────────────────────────────────────────────────────────────────────────
// Religioso · Camino de Santiago (curado + datado)
// ─────────────────────────────────────────────────────────────────────────

export const RELIGIOSO_FICHAS: FichaProps[] = [
  {
    titulo: 'Camino de Santiago · Compostelas',
    metrics: [
      { label: 'Peregrinos 2024', value: '~499.000' },
      { label: 'Peregrinos 2023', value: '~446.000' },
    ],
    cuerpo:
      'La Oficina de Acogida al Peregrino de Santiago registra cada año las Compostelas entregadas a quienes completan el Camino. Tras el Xacobeo, la cifra anual se ha estabilizado en máximos históricos cercanos al medio millón de peregrinos.',
    fuente: 'Oficina de Acogida al Peregrino (Catedral de Santiago)',
    fecha: '2024',
    url: 'https://oficinadelperegrino.com/estadisticas/',
  },
  {
    titulo: 'Rutas y origen de los peregrinos',
    cuerpo:
      'El Camino Francés sigue siendo la ruta más transitada, seguido del Portugués. Alrededor de la mitad de los peregrinos son extranjeros (Italia, EE. UU., Alemania y Portugal entre los principales mercados), lo que da al Camino una dimensión claramente internacional.',
    fuente: 'Oficina de Acogida al Peregrino · informe estadístico',
    fecha: '2024',
    url: 'https://oficinadelperegrino.com/estadisticas/',
  },
  {
    titulo: 'Otros destinos de turismo religioso',
    cuerpo:
      'Más allá del Camino, destinos como la Semana Santa de Sevilla, Málaga y Castilla, el Rocío, Montserrat o el Pilar de Zaragoza movilizan a millones de visitantes nacionales e internacionales con un fuerte componente cultural y religioso.',
    fuente: 'Turespaña · patrimonio religioso',
    fecha: '2023',
    url: 'https://www.spain.info/',
  },
]

// ─────────────────────────────────────────────────────────────────────────
// Idiomático · español como lengua extranjera (curado + datado)
// ─────────────────────────────────────────────────────────────────────────

export const IDIOMATICO_FICHAS: FichaProps[] = [
  {
    titulo: 'Turismo idiomático en España',
    cuerpo:
      'España es el principal destino mundial para aprender español. Salamanca, Madrid, Barcelona, Málaga, Valencia y Granada concentran la oferta de centros acreditados. El estudiante idiomático tiene estancias largas y un gasto total elevado por viaje.',
    fuente: 'Instituto Cervantes · FEDELE (centros de español)',
    fecha: '2023',
    url: 'https://www.cervantes.es/',
  },
  {
    titulo: 'El español en el mundo',
    metrics: [
      { label: 'Hablantes nativos', value: '~500M' },
      { label: 'Estudiantes de ELE', value: '~24M' },
    ],
    cuerpo:
      'El informe anual “El español en el mundo” del Instituto Cervantes cuantifica la demanda global de español como lengua extranjera, base del potencial del turismo idiomático que recibe España.',
    fuente: 'Instituto Cervantes · «El español en el mundo»',
    fecha: '2023',
    url: 'https://www.cervantes.es/sobre_instituto_cervantes/prensa/2023/',
  },
]

// ─────────────────────────────────────────────────────────────────────────
// Shopping · compras de turistas extracomunitarios (curado + datado)
// ─────────────────────────────────────────────────────────────────────────

export const SHOPPING_FICHAS: FichaProps[] = [
  {
    titulo: 'Tax Free · compras de extracomunitarios',
    cuerpo:
      'El gasto en compras (tax free) de turistas de fuera de la UE es un termómetro del turismo de shopping de gama alta. Madrid y Barcelona concentran la mayor parte del gasto, con fuerte peso de visitantes de EE. UU., América Latina y Asia-Pacífico.',
    fuente: 'Global Blue · barómetro tax free España',
    fecha: '2024',
    url: 'https://www.globalblue.com/',
  },
  {
    titulo: 'Gasto en compras del turista (EGATUR)',
    cuerpo:
      'El concepto de “compras y otros” es una de las grandes partidas del gasto turístico internacional medido por el INE. El desglose por conceptos con dato vivo está disponible vía INE EGATUR.',
    fuente: 'INE EGATUR · gasto por conceptos',
    fecha: '2024',
    url: 'https://www.ine.es/',
  },
  {
    titulo: 'Ejes y outlets de shopping',
    cuerpo:
      'Ejes premium (Serrano y Gran Vía en Madrid, Passeig de Gràcia en Barcelona) y centros outlet (Las Rozas Village, La Roca Village) son polos de atracción del turista de compras, especialmente de larga distancia.',
    fuente: 'Turespaña · turismo de compras',
    fecha: '2023',
    url: 'https://www.spain.info/',
  },
]

// ─────────────────────────────────────────────────────────────────────────
// Contexto curado que complementa la sección Cultural (datos vivos = destinos)
// ─────────────────────────────────────────────────────────────────────────

export const CULTURAL_FICHAS: FichaProps[] = [
  {
    titulo: 'Patrimonio Mundial UNESCO',
    metrics: [
      { label: 'Bienes en España', value: '50' },
      { label: 'Ranking mundial', value: 'Top 4-5' },
    ],
    cuerpo:
      'España es uno de los países con más bienes inscritos en la Lista del Patrimonio Mundial de la UNESCO (catedrales, cascos históricos, arte rupestre, paisajes). El patrimonio es el activo central del turismo cultural urbano e interior.',
    fuente: 'UNESCO · World Heritage List (España)',
    fecha: '2024',
    url: 'https://whc.unesco.org/en/statesparties/es',
  },
  {
    titulo: 'Grandes museos',
    cuerpo:
      'El Prado, el Reina Sofía, el Thyssen (Madrid) y el Guggenheim (Bilbao) figuran entre los museos más visitados del país y son motores del turismo cultural de ciudad. El “efecto Guggenheim” es el caso de estudio clásico de regeneración urbana vía cultura.',
    fuente: 'Museos nacionales · memorias anuales de visitantes',
    fecha: '2023',
    url: 'https://www.museodelprado.es/',
  },
]
