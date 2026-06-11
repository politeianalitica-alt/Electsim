/**
 * lib/maritimo/cargo.ts · Capa de CARGO / MERCANCÍAS
 *
 * Responde a la pregunta "¿qué se transporta por mar?" cruzando dos planos:
 *
 *  1. Comercio declarado real (UN Comtrade · capítulos HS2) de un reporter
 *     (default España, ISO numeric 724). Se descarga el ranking de capítulos
 *     HS2 exportados + importados y se mapea cada capítulo a una de las grandes
 *     categorías de carga marítima (contenedor, granel seco, granel líquido
 *     crudo, productos petrolíferos, GNL, GLP, químicos, ro-ro/vehículos,
 *     reefer). Los capítulos no marítimos (servicios, electricidad por cable,
 *     arte, etc.) se descartan o agregan a 'otros'.
 *
 *  2. Catálogo curado de TIPOS DE CARGA MARÍTIMA (dry bulk, container, crude,
 *     products, LNG, LPG, ro-ro, reefer, chemicals) con descripción, buque
 *     típico, unidad de medida y ejemplos de mercancía. Este catálogo NO
 *     depende de la red: es conocimiento de dominio estable.
 *
 * Degradación honesta:
 *  - Sin COMTRADE_API_KEY igualmente se intenta el tier anónimo (~100/día).
 *  - Si Comtrade falla / rate-limita / devuelve vacío, `por_categoria` y
 *    `top_productos` quedan como arrays vacíos y `ok=false`, pero el `catalogo`
 *    curado SIEMPRE se devuelve (es seed, no red). Nunca se inventan cifras.
 *
 * No exporta componentes React ni toca el DOM: es lib de datos pura, consumida
 * por app/api/maritimo/cargo/route.ts.
 */

// ─────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────

/** Clave canónica de categoría de carga marítima. */
export type CargoCategoryKey =
  | 'container'
  | 'dry_bulk'
  | 'crude'
  | 'products'
  | 'lng'
  | 'lpg'
  | 'chemicals'
  | 'roro'
  | 'reefer'
  | 'general'
  | 'otros'

/** Entrada del catálogo curado de tipos de carga marítima. */
export interface CargoCatalogEntry {
  key: CargoCategoryKey
  /** Nombre en español para UI. */
  label: string
  /** Término inglés estándar del sector (dry bulk, container…). */
  label_en: string
  /** Glifo Unicode para badge (sin emojis). */
  glyph: string
  /** Descripción de qué se transporta y cómo. */
  descripcion: string
  /** Tipo de buque que mueve esta carga. */
  buque_tipo: string
  /** Unidad de medida habitual del tráfico (TEU, toneladas, m³…). */
  unidad: string
  /** Ejemplos de mercancías concretas. */
  ejemplos: string[]
  /** Capítulos HS2 (string de 2 dígitos) que mapean a esta categoría. */
  hs2: string[]
}

/** Producto comerciado (capítulo HS2) enriquecido con su categoría marítima. */
export interface CargoProduct {
  hs2: string
  hs2_desc: string
  flow: 'export' | 'import'
  value_usd: number
  value_fmt: string
  category: CargoCategoryKey
  category_label: string
  /** % sobre el total del flujo (export o import) del reporter. */
  share_pct: number
}

/** Agregado por categoría de carga marítima. */
export interface CargoCategoryAggregate {
  key: CargoCategoryKey
  label: string
  label_en: string
  glyph: string
  export_usd: number
  import_usd: number
  total_usd: number
  total_fmt: string
  /** % sobre el comercio marítimo-mapeable total. */
  share_pct: number
  /** Nº de capítulos HS2 que cayeron en esta categoría. */
  n_chapters: number
}

export interface CargoQuality {
  source_type: 'live' | 'cache' | 'seed' | 'missing' | 'rate_limited'
  source_name: string
  note?: string
}

export interface CargoFlowsResult {
  ok: boolean
  reporter: string
  reporter_iso: string
  year: number
  por_categoria: CargoCategoryAggregate[]
  top_productos: CargoProduct[]
  catalogo: CargoCatalogEntry[]
  data_quality: CargoQuality
  source_url: string
  error?: string
}

// ─────────────────────────────────────────────────────────────────
// Catálogo curado de tipos de carga marítima · seed (sin red)
// ─────────────────────────────────────────────────────────────────

/**
 * Mapeo capítulo HS2 → categoría marítima. Basado en cómo se mueve físicamente
 * la mercancía por mar, no en su sector económico. Un capítulo puede ser
 * borderline (p.ej. 39 plásticos viaja en contenedor pero la materia prima
 * petroquímica a granel); se asigna a la modalidad dominante en tráfico ES.
 */
export const CARGO_CATALOG: CargoCatalogEntry[] = [
  {
    key: 'container',
    label: 'Contenedor',
    label_en: 'Container',
    glyph: '⊞',
    descripcion:
      'Mercancía general unitizada en contenedores ISO de 20/40 pies. Es el modo dominante del comercio manufacturado: ropa, electrónica, maquinaria, bienes de consumo y semielaborados.',
    buque_tipo: 'Portacontenedores (feeder a ULCV >24.000 TEU)',
    unidad: 'TEU',
    ejemplos: ['Maquinaria', 'Electrónica', 'Textil y calzado', 'Manufacturas diversas', 'Mobiliario'],
    hs2: [
      '84', '85', '61', '62', '63', '64', '94', '95', '42', '43', '49', '90', '91', '92',
      '96', '65', '66', '67', '57', '58', '59', '60', '82', '83', '70', '69', '46', '48',
      '50', '51', '52', '53', '54', '55', '56',
    ],
  },
  {
    key: 'dry_bulk',
    label: 'Granel sólido',
    label_en: 'Dry bulk',
    glyph: '⬡',
    descripcion:
      'Cargas a granel no embaladas que se cargan/descargan por grúa o cinta: minerales, carbón, cereales, fertilizantes, cemento y chatarra. Se mueven en grandes volúmenes y son sensibles al Baltic Dry Index.',
    buque_tipo: 'Bulk carrier (Handysize a Capesize)',
    unidad: 'Toneladas',
    ejemplos: ['Cereales', 'Mineral de hierro', 'Carbón', 'Fertilizantes', 'Chatarra metálica', 'Cemento y clínker'],
    hs2: ['10', '11', '12', '25', '26', '31', '72', '73', '74', '75', '76', '78', '79', '80', '81', '23'],
  },
  {
    key: 'crude',
    label: 'Crudo (granel líquido)',
    label_en: 'Crude oil',
    glyph: '◐',
    descripcion:
      'Petróleo crudo transportado a granel líquido. Define los grandes flujos energéticos y la dependencia de importación; se mueve en buques tanque de muy gran porte hacia refinerías.',
    buque_tipo: 'Petrolero crudo (Aframax / Suezmax / VLCC)',
    unidad: 'Barriles / toneladas',
    ejemplos: ['Petróleo crudo'],
    hs2: ['2709' /* placeholder · HS4, ver nota crudo vs productos */],
  },
  {
    key: 'products',
    label: 'Productos petrolíferos',
    label_en: 'Oil products',
    glyph: '◑',
    descripcion:
      'Derivados refinados del petróleo a granel líquido: gasolina, gasóleo, fuelóleo, queroseno. Incluye también el capítulo HS 27 cuando no se desagrega crudo de refinados.',
    buque_tipo: 'Petrolero de productos (MR / LR1 / LR2)',
    unidad: 'Toneladas',
    ejemplos: ['Gasóleo', 'Gasolina', 'Fuelóleo', 'Queroseno de aviación', 'Naftas'],
    hs2: ['27'],
  },
  {
    key: 'lng',
    label: 'GNL (gas natural licuado)',
    label_en: 'LNG',
    glyph: '◇',
    descripcion:
      'Gas natural licuado a -162 °C transportado en buques metaneros criogénicos. Clave en la seguridad de suministro energético tras la diversificación post-2022.',
    buque_tipo: 'Metanero (membrana / Moss)',
    unidad: 'm³ / toneladas',
    ejemplos: ['Gas natural licuado'],
    hs2: ['2711' /* HS4 · gas, se desagrega de químicos */],
  },
  {
    key: 'lpg',
    label: 'GLP / gases licuados',
    label_en: 'LPG',
    glyph: '◈',
    descripcion:
      'Gases licuados del petróleo (propano, butano) y otros gases a presión transportados en buques gaseros más pequeños que los metaneros.',
    buque_tipo: 'Gasero LPG (semirrefrigerado / presurizado)',
    unidad: 'm³ / toneladas',
    ejemplos: ['Propano', 'Butano', 'Amoníaco'],
    hs2: [],
  },
  {
    key: 'chemicals',
    label: 'Químicos a granel',
    label_en: 'Chemicals',
    glyph: '◆',
    descripcion:
      'Productos químicos orgánicos e inorgánicos a granel líquido (ácidos, alcoholes, intermedios petroquímicos) en buques quimiqueros de tanques especializados. La química manufacturada empaquetada viaja en contenedor.',
    buque_tipo: 'Quimiquero (IMO tipo 1/2/3)',
    unidad: 'Toneladas',
    ejemplos: ['Productos químicos orgánicos', 'Plásticos en materia prima', 'Abonos químicos', 'Aceites esenciales'],
    hs2: ['28', '29', '38', '39', '34', '32', '33', '35', '36', '37', '40'],
  },
  {
    key: 'roro',
    label: 'Ro-Ro / vehículos',
    label_en: 'Ro-Ro & vehicles',
    glyph: '⛴',
    descripcion:
      'Carga rodante: automóviles, camiones, maquinaria autopropulsada y remolques que embarcan por sus propios medios. España es gran exportador de vehículos (FACTORÍA SEAT, Stellantis, Ford).',
    buque_tipo: 'Car carrier (PCTC) / Ro-Ro',
    unidad: 'Unidades / m lineales',
    ejemplos: ['Automóviles', 'Vehículos industriales', 'Maquinaria autopropulsada', 'Material ferroviario'],
    hs2: ['87', '86', '88', '89'],
  },
  {
    key: 'reefer',
    label: 'Refrigerada (reefer)',
    label_en: 'Reefer',
    glyph: '◦',
    descripcion:
      'Carga perecedera con cadena de frío: frutas, hortalizas, pescado, carne y lácteos. España es potencia exportadora hortofrutícola; viaja en contenedores reefer o buques frigoríficos.',
    buque_tipo: 'Contenedor reefer / buque frigorífico',
    unidad: 'Toneladas / TEU reefer',
    ejemplos: ['Frutas y hortalizas', 'Pescado y marisco', 'Carne', 'Productos lácteos', 'Flores'],
    hs2: ['07', '08', '03', '02', '04', '06', '01', '05', '16'],
  },
  {
    key: 'general',
    label: 'Carga general / agroalimentaria',
    label_en: 'General & agri',
    glyph: '●',
    descripcion:
      'Mercancía no perecedera de origen agroalimentario y otras cargas que se reparten entre contenedor y granel: vino y bebidas, aceite de oliva, conservas, tabaco. España lidera la exportación de aceite y vino.',
    buque_tipo: 'Portacontenedores / multipropósito',
    unidad: 'Toneladas / TEU',
    ejemplos: ['Aceite de oliva', 'Vino y bebidas', 'Conservas', 'Frutos secos', 'Café, té y cacao'],
    hs2: ['09', '13', '14', '15', '17', '18', '19', '20', '21', '22', '24'],
  },
  {
    key: 'otros',
    label: 'Otros / no marítimo',
    label_en: 'Other / non-maritime',
    glyph: '◌',
    descripcion:
      'Capítulos residuales o que viajan mayoritariamente por aire/cable (obras de arte, perlas y piedras preciosas de alto valor, armamento, partidas especiales). Se agregan para no distorsionar las grandes categorías.',
    buque_tipo: 'Variable',
    unidad: 'Variable',
    ejemplos: ['Perlas y gemas', 'Obras de arte', 'Armamento', 'Partidas especiales'],
    hs2: ['71', '93', '97', '98', '99'],
  },
]

// HS2 → categoría · índice invertido derivado del catálogo (capítulos de 2 dígitos)
const HS2_TO_CATEGORY: Record<string, CargoCategoryKey> = (() => {
  const map: Record<string, CargoCategoryKey> = {}
  for (const entry of CARGO_CATALOG) {
    for (const code of entry.hs2) {
      if (code.length === 2) map[code] = entry.key
    }
  }
  return map
})()

const CATEGORY_BY_KEY: Record<CargoCategoryKey, CargoCatalogEntry> = (() => {
  const map = {} as Record<CargoCategoryKey, CargoCatalogEntry>
  for (const entry of CARGO_CATALOG) map[entry.key] = entry
  return map
})()

/** Clasifica un capítulo HS2 a su categoría marítima. Default → 'otros'. */
export function classifyHs2(hs2: string): CargoCategoryKey {
  const code = String(hs2 || '').padStart(2, '0').slice(0, 2)
  return HS2_TO_CATEGORY[code] ?? 'otros'
}

// ─────────────────────────────────────────────────────────────────
// Comtrade fetch · capítulos HS2 reales
// ─────────────────────────────────────────────────────────────────

const COMTRADE_API = 'https://comtradeapi.un.org/data/v1/get'
const COMTRADE_VIEWER = 'https://comtradeplus.un.org/'

/** Reporters soportados · alpha-3 → ISO numeric (los más relevantes). */
const REPORTER_ISO: Record<string, string> = {
  ESP: '724', ES: '724',
  DEU: '276', DE: '276',
  FRA: '251', FR: '251',
  ITA: '380', IT: '380',
  PRT: '620', PT: '620',
  NLD: '528', NL: '528',
  GBR: '826', GB: '826',
  USA: '842', US: '842',
  CHN: '156', CN: '156',
}

function reporterIso(reporter: string): string {
  return REPORTER_ISO[(reporter || 'ESP').toUpperCase()] ?? '724'
}

function fmtUSD(v: number): string {
  if (!v || isNaN(v)) return '—'
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`
  return v.toFixed(0)
}

/** Fetch de capítulos HS2 (cmdCode=AG2) para un flujo dado. */
async function fetchHs2Chapters(
  reporterCode: string,
  period: string,
  flowCode: 'X' | 'M',
): Promise<{ rows: any[]; error?: string }> {
  const apiKey = process.env.COMTRADE_API_KEY
  const params: Record<string, string> = {
    reporterCode,
    partnerCode: '0', // World agregado
    cmdCode: 'AG2', // todos los capítulos HS2
    flowCode,
    motCode: '0',
    customsCode: 'C00',
    partner2Code: '0',
    period,
  }
  const qs = new URLSearchParams(params)
  if (apiKey) qs.set('subscription-key', apiKey)
  const url = `${COMTRADE_API}/C/A/HS?${qs}`
  try {
    const r = await fetch(url, {
      headers: {
        Accept: 'application/json',
        ...(apiKey ? { 'Ocp-Apim-Subscription-Key': apiKey } : {}),
      },
      next: { revalidate: 43200 }, // 12h
    } as RequestInit)
    if (r.status === 429) return { rows: [], error: 'rate_limited' }
    if (r.status === 401 || r.status === 403) return { rows: [], error: `unauthorized HTTP ${r.status}` }
    if (!r.ok) return { rows: [], error: `HTTP ${r.status}` }
    const data = await r.json()
    return { rows: Array.isArray(data?.data) ? data.data : [] }
  } catch (e: any) {
    return { rows: [], error: String(e?.message ?? e).slice(0, 160) }
  }
}

// ─────────────────────────────────────────────────────────────────
// fetchCargoFlows · API pública de la lib
// ─────────────────────────────────────────────────────────────────

/**
 * Top productos comerciados por mar para `reporter` (default España) en `year`
 * (default año anterior), agregados a grandes categorías de carga marítima.
 *
 * El catálogo curado SIEMPRE se devuelve. Las cifras (por_categoria,
 * top_productos) provienen de Comtrade real; si falla, quedan vacías y ok=false.
 */
export async function fetchCargoFlows(
  reporter: string = 'ESP',
  year?: number,
): Promise<CargoFlowsResult> {
  const reporterUp = (reporter || 'ESP').toUpperCase()
  const rIso = reporterIso(reporterUp)
  const y = year && year > 1990 && year <= new Date().getFullYear()
    ? year
    : new Date().getFullYear() - 1
  const period = String(y)

  // Siempre disponible · seed
  const base: Omit<CargoFlowsResult, 'ok' | 'por_categoria' | 'top_productos' | 'data_quality' | 'error'> = {
    reporter: reporterUp,
    reporter_iso: rIso,
    year: y,
    catalogo: CARGO_CATALOG,
    source_url: COMTRADE_VIEWER,
  }

  const [exp, imp] = await Promise.all([
    fetchHs2Chapters(rIso, period, 'X'),
    fetchHs2Chapters(rIso, period, 'M'),
  ])

  // Degradación honesta · ninguna respuesta con datos
  if (exp.rows.length === 0 && imp.rows.length === 0) {
    const err = exp.error || imp.error || 'sin datos'
    const isRate = err === 'rate_limited'
    return {
      ...base,
      ok: false,
      por_categoria: [],
      top_productos: [],
      error: err,
      data_quality: {
        source_type: isRate ? 'rate_limited' : 'missing',
        source_name: 'UN Comtrade',
        note: isRate
          ? 'UN Comtrade rate-limited (tier anónimo ~100/día). Catálogo de tipos de carga sí disponible.'
          : `Comtrade no devolvió capítulos HS2 (${err}). Catálogo de tipos de carga sí disponible.`,
      },
    }
  }

  // Normaliza filas → productos
  function toProducts(rows: any[], flow: 'export' | 'import'): CargoProduct[] {
    return rows
      .map((r) => {
        const hs2 = String(r.cmdCode || '').padStart(2, '0').slice(0, 2)
        const value = Number(r.primaryValue) || 0
        const cat = classifyHs2(hs2)
        return {
          hs2,
          hs2_desc: r.cmdDesc || '',
          flow,
          value_usd: value,
          value_fmt: fmtUSD(value),
          category: cat,
          category_label: CATEGORY_BY_KEY[cat].label,
          share_pct: 0, // se rellena tras conocer el total
        } as CargoProduct
      })
      .filter((p) => p.value_usd > 0 && /^\d{2}$/.test(p.hs2))
  }

  const expProducts = toProducts(exp.rows, 'export')
  const impProducts = toProducts(imp.rows, 'import')

  const expTotal = expProducts.reduce((s, p) => s + p.value_usd, 0)
  const impTotal = impProducts.reduce((s, p) => s + p.value_usd, 0)
  for (const p of expProducts) p.share_pct = expTotal > 0 ? Math.round((p.value_usd / expTotal) * 1000) / 10 : 0
  for (const p of impProducts) p.share_pct = impTotal > 0 ? Math.round((p.value_usd / impTotal) * 1000) / 10 : 0

  // Top productos · unión de ambos flujos, ordenado por valor
  const top_productos = [...expProducts, ...impProducts]
    .sort((a, b) => b.value_usd - a.value_usd)
    .slice(0, 24)

  // Agregado por categoría marítima
  const aggByKey = new Map<CargoCategoryKey, CargoCategoryAggregate>()
  const chaptersSeen = new Map<CargoCategoryKey, Set<string>>()
  for (const entry of CARGO_CATALOG) {
    aggByKey.set(entry.key, {
      key: entry.key,
      label: entry.label,
      label_en: entry.label_en,
      glyph: entry.glyph,
      export_usd: 0,
      import_usd: 0,
      total_usd: 0,
      total_fmt: '—',
      share_pct: 0,
      n_chapters: 0,
    })
    chaptersSeen.set(entry.key, new Set())
  }
  for (const p of expProducts) {
    const agg = aggByKey.get(p.category)!
    agg.export_usd += p.value_usd
    chaptersSeen.get(p.category)!.add(p.hs2)
  }
  for (const p of impProducts) {
    const agg = aggByKey.get(p.category)!
    agg.import_usd += p.value_usd
    chaptersSeen.get(p.category)!.add(p.hs2)
  }
  const grandTotal = expTotal + impTotal
  const por_categoria = [...aggByKey.values()]
    .map((agg) => {
      agg.total_usd = agg.export_usd + agg.import_usd
      agg.total_fmt = fmtUSD(agg.total_usd)
      agg.n_chapters = chaptersSeen.get(agg.key)!.size
      agg.share_pct = grandTotal > 0 ? Math.round((agg.total_usd / grandTotal) * 1000) / 10 : 0
      return agg
    })
    .filter((agg) => agg.total_usd > 0)
    .sort((a, b) => b.total_usd - a.total_usd)

  const partialError = exp.error || imp.error
  return {
    ...base,
    ok: true,
    por_categoria,
    top_productos,
    error: partialError || undefined,
    data_quality: {
      source_type: 'live',
      source_name: 'UN Comtrade',
      note: partialError
        ? `Datos oficiales año ${y} · un flujo incompleto (${partialError}). Categorías marítimas mapeadas desde capítulos HS2.`
        : `Comercio declarado oficial año ${y} · capítulos HS2 mapeados a tipos de carga marítima.`,
    },
  }
}
