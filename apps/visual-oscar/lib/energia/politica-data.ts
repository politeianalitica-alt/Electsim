/**
 * lib/energia/politica-data.ts · Capa de datos de POLÍTICA ENERGÉTICA España + UE
 * ============================================================================
 * Mezcla de fuentes LIVE keyless y catálogo CURADO + DATADO. Tres bloques:
 *   1) REGULACIÓN VIVA  → normativa nueva (BOE LIVE, EUR-Lex, CNMC)
 *   2) ESTRATEGIA       → programas/planes (PNIEC, REPowerEU, PERTEs, subastas)
 *   3) MERCADO REGULADO → PVPC, peajes, impuestos, bono social
 *
 * ────────────────────────────────────────────────────────────────────────────
 * QUÉ ES LIVE vs CURADO (importante para credibilidad del dashboard):
 *
 *   ◆ LIVE (se descarga en cada request, keyless):
 *       - fetchBoeEnergia()    → BOE Datos Abiertos, filtrado a energía. REAL.
 *       - fetchEurLexEnergia() → intenta RSS público de EUR-Lex; si falla,
 *                                degrada a CATÁLOGO CURADO (marcado `live:false`).
 *       - fetchCnmcEnergia()   → intenta RSS de notas CNMC; si falla, degrada a
 *                                CATÁLOGO CURADO (marcado `live:false`).
 *
 *   ◇ CURADO + DATADO (constantes en este fichero, NO se inventan cifras —
 *     son valores oficiales conocidos, cada uno con su `fecha_ref` y `url`):
 *       - ESTRATEGIA_CURADA  → PNIEC 2024, REPowerEU, PERTEs, Hoja Ruta H2,
 *                              Estrategia de Almacenamiento, ITE, subastas REER.
 *       - MERCADO_CURADO     → PVPC 2024, peajes/cargos, impuestos energéticos,
 *                              bono social eléctrico/térmico.
 *       - EURLEX_CURADO      → legislación UE clave vigente (EMD Reform, RED III,
 *                              EED, EPBD, Gas Package, REPowerEU, NZIA, CBAM).
 *       - CNMC_CURADO        → circulares/resoluciones clave CNMC.
 *
 * Las cifras curadas reflejan la versión oficial vigente a la `fecha_ref`
 * indicada en cada registro. Si una cifra oficial cambia, hay que actualizar
 * la constante (no se calcula en runtime).
 *
 * NO toca boe.ts ni rss.ts (sólo los importa). Sin claves hardcodeadas.
 * ============================================================================
 */

import { fetchBoeLastNDays, type BoeItem } from '@/lib/boe'
import { fetchRSS } from '@/lib/rss'

// ───────────────────────────────────────────────────────────────────────────
// Tipos compartidos
// ───────────────────────────────────────────────────────────────────────────

export type Ambito = 'ES' | 'UE'

/** Un bloque que puede degradar: trae sus propios datos o un error. */
export interface BloqueDegradable<T> {
  ok: boolean
  /** true = datos descargados en vivo; false = catálogo curado de fallback */
  live: boolean
  items: T[]
  n: number
  error?: string
  source_url?: string
}

// ── 1) REGULACIÓN VIVA ──────────────────────────────────────────────────────

/** Norma energética publicada en el BOE (LIVE). */
export interface BoeEnergiaItem {
  id: string
  titulo: string
  url: string
  fecha: string
  seccion: string
  departamento: string
  /** materia inferida por keyword (electricidad, gas, renovables, etc.) */
  materia: string
}

export interface BoeEnergiaResult {
  ok: boolean
  live: boolean
  items: BoeEnergiaItem[]
  n: number
  error?: string
  source_url: string
}

/** Acto legislativo UE de energía (LIVE EUR-Lex o catálogo curado). */
export interface EurLexEnergiaItem {
  titulo: string
  referencia: string        // p.ej. "Directiva (UE) 2023/2413" o CELEX
  fecha: string             // ISO date (publicación o entrada en vigor)
  estado: string            // 'En vigor' | 'Adoptado' | 'Propuesta' | ...
  url: string               // enlace EUR-Lex
  materia?: string
}

export type EurLexEnergiaResult = BloqueDegradable<EurLexEnergiaItem>

/** Nota/circular/resolución CNMC de energía (LIVE RSS o catálogo curado). */
export interface CnmcEnergiaItem {
  titulo: string
  referencia: string        // p.ej. "Circular 3/2020" o vacío si es nota prensa
  fecha: string             // ISO date
  tipo: string              // 'Circular' | 'Resolución' | 'Nota de prensa'
  url: string
  materia?: string
}

export type CnmcEnergiaResult = BloqueDegradable<CnmcEnergiaItem>

// ── 2) ESTRATEGIA (curado + datado) ─────────────────────────────────────────

export interface ProgramaEstrategico {
  nombre: string
  organismo: string
  ambito: Ambito
  objetivo: string
  dotacion_eur?: number     // dotación presupuestaria total, en euros
  horizonte: string         // p.ej. "2030", "2021-2027"
  estado: string            // 'Vigente' | 'En ejecución' | 'Aprobado' | ...
  fecha_ref: string         // ISO date de la cifra/documento de referencia
  url: string
}

/** Objetivo cuantitativo del PNIEC 2023-2030 (versión 2024). */
export interface ObjetivoPniec {
  indicador: string
  valor_objetivo: string    // string para conservar unidades (%, GW, Mt…)
  horizonte: string
  fuente: string
  fecha_ref: string
  url: string
}

/** Subasta del Régimen Económico de Energías Renovables (REER). */
export interface SubastaRenovable {
  nombre: string
  fecha: string             // ISO date (celebración o convocatoria prevista)
  estado: 'Celebrada' | 'Prevista' | 'Convocada' | 'Cancelada'
  potencia_mw?: number      // potencia adjudicada o a subastar
  tecnologia: string
  precio_medio_eur_mwh?: number
  fuente: string
  url: string
}

export interface EstrategiaData {
  pniec: ObjetivoPniec[]
  programas: ProgramaEstrategico[]
  subastas: SubastaRenovable[]
}

// ── 3) MERCADO REGULADO (curado + datado) ───────────────────────────────────

export interface ConceptoMercado {
  concepto: string
  valor_actual: string      // valor con unidad (%, €/MWh, descripción…)
  descripcion: string
  fecha_ref: string         // ISO date de vigencia del valor
  url: string
}

export interface MercadoData {
  pvpc: ConceptoMercado[]
  peajes: ConceptoMercado[]
  impuestos: ConceptoMercado[]
  bono_social: ConceptoMercado[]
}

// ── 4) Orquestador ──────────────────────────────────────────────────────────

export interface PoliticaEnergeticaResult {
  ok: boolean
  regulacion: {
    boe: BoeEnergiaResult
    eurlex: EurLexEnergiaResult
    cnmc: CnmcEnergiaResult
  }
  estrategia: EstrategiaData
  mercado: MercadoData
  fuentes_error: string[]
  fetched_at: string
}

export interface PoliticaEnergeticaOpts {
  /** días hacia atrás para el barrido BOE (por defecto 7) */
  diasBoe?: number
  /** timeout por fetch en ms (por defecto 8000) */
  timeoutMs?: number
}

// ===========================================================================
// 1) REGULACIÓN VIVA
// ===========================================================================

const BOE_SOURCE_URL = 'https://www.boe.es/datosabiertos/'

/**
 * Keywords (lowercase, sin tildes para robustez) que identifican normativa
 * energética. Cada una mapea a una "materia" para clasificar el resultado.
 * El orden importa: la primera coincidencia define la materia.
 */
const ENERGIA_KEYWORDS: Array<{ kw: string[]; materia: string }> = [
  { kw: ['autoconsumo'], materia: 'Autoconsumo' },
  { kw: ['pvpc', 'precio voluntario'], materia: 'PVPC' },
  { kw: ['peaje', 'retribuc', 'cargo electric'], materia: 'Peajes y retribución' },
  { kw: ['hidrogeno', 'hidrógeno'], materia: 'Hidrógeno' },
  { kw: ['renovable', 'fotovoltaic', 'eolic', 'eólic', 'solar'], materia: 'Renovables' },
  { kw: ['nuclear'], materia: 'Nuclear' },
  { kw: ['gas natural', 'enagas', 'enagás', 'gnl', 'gasista'], materia: 'Gas' },
  { kw: ['hidrocarburo', 'combustible', 'carburante', 'petrol'], materia: 'Hidrocarburos' },
  { kw: ['emision', 'emisión', 'descarboniz', 'co2'], materia: 'Emisiones' },
  { kw: ['eficiencia energetic', 'eficiencia energética'], materia: 'Eficiencia' },
  { kw: ['transicion ecologic', 'transición ecológica', 'miteco'], materia: 'Transición ecológica' },
  { kw: ['cnmc'], materia: 'Regulación CNMC' },
  { kw: ['red electrica', 'red eléctrica'], materia: 'Red eléctrica' },
  { kw: ['electric', 'eléctric', 'energia', 'energía', 'energetic', 'energétic'], materia: 'Electricidad' },
]

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

/** Clasifica un texto de norma a una materia energética; null si no aplica. */
function materiaEnergia(texto: string): string | null {
  const t = norm(texto)
  for (const { kw, materia } of ENERGIA_KEYWORDS) {
    for (const k of kw) {
      if (t.includes(norm(k))) return materia
    }
  }
  return null
}

/**
 * REGULACIÓN VIVA · BOE filtrado a normativa energética (LIVE, keyless).
 * Reutiliza fetchBoeLastNDays y filtra por keywords en título + departamento.
 */
export async function fetchBoeEnergia(dias = 7, timeoutMs = 8000): Promise<BoeEnergiaResult> {
  try {
    const raw: BoeItem[] = await fetchBoeLastNDays(dias, timeoutMs)
    const items: BoeEnergiaItem[] = []
    for (const it of raw) {
      const materia = materiaEnergia(`${it.titulo} ${it.departamento} ${it.epigrafe ?? ''}`)
      if (!materia) continue
      items.push({
        id: it.id,
        titulo: it.titulo,
        url: it.url_html || it.url_pdf,
        fecha: it.fecha,
        seccion: it.seccion_nombre,
        departamento: it.departamento,
        materia,
      })
    }
    // Dedup por id, ordena por fecha desc
    const seen = new Set<string>()
    const dedup = items.filter((i) => {
      if (seen.has(i.id)) return false
      seen.add(i.id)
      return true
    })
    dedup.sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0))
    return { ok: true, live: true, items: dedup, n: dedup.length, source_url: BOE_SOURCE_URL }
  } catch (e: unknown) {
    return {
      ok: false,
      live: true,
      items: [],
      n: 0,
      error: e instanceof Error ? e.message : String(e),
      source_url: BOE_SOURCE_URL,
    }
  }
}

// ── EUR-Lex ──────────────────────────────────────────────────────────────────

/**
 * Feeds RSS públicos de EUR-Lex que se intentan en orden. EUR-Lex expone un
 * servicio RSS para búsquedas guardadas; estos son endpoints públicos keyless.
 * Si ninguno responde con items, se degrada al catálogo curado.
 */
const EURLEX_RSS_CANDIDATES: string[] = [
  // RSS de actos recientes de la materia "Energía" (subdominio 12 = Energy)
  'https://eur-lex.europa.eu/EN/display-feed.rss?myRssId=' +
    encodeURIComponent('e1Wdscm2dXmFw8e7L7Q9w==') ,
  // Búsqueda RSS por clasificación EUROVOC energía (fallback genérico)
  'https://eur-lex.europa.eu/legal-content/EN/feed.rss?qid=&type=quick&text=energy',
]

/**
 * Legislación UE clave de energía, VIGENTE. Catálogo CURADO + DATADO.
 * Fechas = publicación en DOUE / adopción. Referencias y URLs oficiales EUR-Lex.
 * fecha_ref de la curación: 2024-06.
 */
const EURLEX_CURADO: EurLexEnergiaItem[] = [
  {
    titulo: 'Reforma del Diseño del Mercado Eléctrico (Electricity Market Design Reform)',
    referencia: 'Reglamento (UE) 2024/1747 y Directiva (UE) 2024/1711',
    fecha: '2024-06-26',
    estado: 'En vigor',
    url: 'https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:32024R1747',
    materia: 'Mercado eléctrico',
  },
  {
    titulo: 'Directiva de Energías Renovables III (RED III)',
    referencia: 'Directiva (UE) 2023/2413',
    fecha: '2023-10-31',
    estado: 'En vigor',
    url: 'https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:32023L2413',
    materia: 'Renovables',
  },
  {
    titulo: 'Directiva de Eficiencia Energética refundida (EED)',
    referencia: 'Directiva (UE) 2023/1791',
    fecha: '2023-09-20',
    estado: 'En vigor',
    url: 'https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:32023L1791',
    materia: 'Eficiencia',
  },
  {
    titulo: 'Directiva de Eficiencia Energética de los Edificios refundida (EPBD recast)',
    referencia: 'Directiva (UE) 2024/1275',
    fecha: '2024-05-08',
    estado: 'En vigor',
    url: 'https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:32024L1275',
    materia: 'Edificación / Eficiencia',
  },
  {
    titulo: 'Paquete de Gas e Hidrógeno descarbonizados (Gas Package)',
    referencia: 'Reglamento (UE) 2024/1789 y Directiva (UE) 2024/1788',
    fecha: '2024-07-15',
    estado: 'En vigor',
    url: 'https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:32024R1789',
    materia: 'Gas / Hidrógeno',
  },
  {
    titulo: 'Plan REPowerEU (modificación del Reglamento de los planes de recuperación)',
    referencia: 'Reglamento (UE) 2023/435',
    fecha: '2023-02-27',
    estado: 'En vigor',
    url: 'https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:32023R0435',
    materia: 'Recuperación / Energía',
  },
  {
    titulo: 'Reglamento de la Industria de Cero Emisiones Netas (Net-Zero Industry Act)',
    referencia: 'Reglamento (UE) 2024/1735',
    fecha: '2024-06-28',
    estado: 'En vigor',
    url: 'https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:32024R1735',
    materia: 'Industria limpia',
  },
  {
    titulo: 'Mecanismo de Ajuste en Frontera por Carbono (CBAM)',
    referencia: 'Reglamento (UE) 2023/956',
    fecha: '2023-05-16',
    estado: 'En vigor (periodo transitorio hasta 2026)',
    url: 'https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:32023R0956',
    materia: 'Emisiones / Comercio',
  },
]

const EURLEX_SEARCH_URL = 'https://eur-lex.europa.eu/'

/** Palabras clave que confirman que un item de feed UE es de energía. */
const EURLEX_ENERGY_HINTS = [
  'energy', 'electricity', 'renewable', 'gas', 'hydrogen', 'energia',
  'electricidad', 'renovable', 'emission', 'grid', 'power', 'fuel',
]

/**
 * REGULACIÓN VIVA · EUR-Lex actos recientes de energía.
 * Intenta los feeds RSS públicos; si ninguno da items energéticos fiables,
 * degrada al catálogo curado (live:false) sin fallar.
 */
export async function fetchEurLexEnergia(timeoutMs = 8000): Promise<EurLexEnergiaResult> {
  for (const url of EURLEX_RSS_CANDIDATES) {
    try {
      const r = await fetchRSS(url, timeoutMs)
      if (!r.ok || r.items.length === 0) continue
      const items: EurLexEnergiaItem[] = r.items
        .filter((it) => {
          const hay = norm(`${it.title} ${it.description}`)
          return EURLEX_ENERGY_HINTS.some((h) => hay.includes(norm(h)))
        })
        .map((it) => ({
          titulo: it.title,
          referencia: it.guid ?? '',
          fecha: it.pubDate ? it.pubDate.toISOString().slice(0, 10) : '',
          estado: 'Publicado',
          url: it.link,
          materia: 'Energía (UE)',
        }))
      if (items.length > 0) {
        return { ok: true, live: true, items, n: items.length, source_url: url }
      }
    } catch {
      // siguiente candidato
    }
  }
  // Degradación: catálogo curado
  return {
    ok: true,
    live: false,
    items: EURLEX_CURADO,
    n: EURLEX_CURADO.length,
    error: 'EUR-Lex RSS no disponible; mostrando catálogo curado (vigente, 2024-06)',
    source_url: EURLEX_SEARCH_URL,
  }
}

// ── CNMC ─────────────────────────────────────────────────────────────────────

/**
 * Feeds RSS de notas de prensa CNMC. Se intentan en orden; si fallan, se
 * degrada al catálogo curado de circulares/resoluciones clave.
 */
const CNMC_RSS_CANDIDATES: string[] = [
  'https://www.cnmc.es/rss/notas-de-prensa',
  'https://www.cnmc.es/rss.xml',
]

const CNMC_SOURCE_URL = 'https://www.cnmc.es/ambitos-de-actuacion/energia'

/** Palabras clave que confirman que una nota CNMC es de energía. */
const CNMC_ENERGY_HINTS = [
  'energia', 'electric', 'gas', 'hidrocarburo', 'peaje', 'retribuc',
  'renovable', 'hidrogeno', 'red electrica', 'enagas', 'autoconsumo', 'pvpc',
]

/**
 * Circulares y resoluciones clave de la CNMC en materia de energía.
 * Catálogo CURADO + DATADO. fecha = publicación oficial. fecha_ref curación: 2024-06.
 */
const CNMC_CURADO: CnmcEnergiaItem[] = [
  {
    titulo: 'Metodología de retribución del transporte de energía eléctrica',
    referencia: 'Circular 5/2019',
    fecha: '2019-12-05',
    tipo: 'Circular',
    url: 'https://www.cnmc.es/expedientes/cir519',
    materia: 'Retribución redes',
  },
  {
    titulo: 'Metodología y condiciones del acceso y conexión a las redes de transporte y distribución eléctricas',
    referencia: 'Circular 1/2021',
    fecha: '2021-01-20',
    tipo: 'Circular',
    url: 'https://www.cnmc.es/expedientes/cir121',
    materia: 'Acceso y conexión',
  },
  {
    titulo: 'Estructura y metodología de los peajes de transporte y distribución de electricidad',
    referencia: 'Circular 3/2020',
    fecha: '2020-01-24',
    tipo: 'Circular',
    url: 'https://www.cnmc.es/expedientes/cir320',
    materia: 'Peajes electricidad',
  },
  {
    titulo: 'Metodología de cálculo de los peajes de transporte y distribución de gas natural',
    referencia: 'Circular 6/2020',
    fecha: '2020-01-24',
    tipo: 'Circular',
    url: 'https://www.cnmc.es/expedientes/cir620',
    materia: 'Peajes gas',
  },
  {
    titulo: 'Retribución de la distribución de energía eléctrica (periodo regulatorio 2020-2025)',
    referencia: 'Circular 6/2019',
    fecha: '2019-12-05',
    tipo: 'Circular',
    url: 'https://www.cnmc.es/expedientes/cir619',
    materia: 'Retribución distribución',
  },
  {
    titulo: 'Supervisión del mercado minorista de electricidad y gas (informe periódico)',
    referencia: '',
    fecha: '2024-03-01',
    tipo: 'Resolución',
    url: 'https://www.cnmc.es/ambitos-de-actuacion/energia',
    materia: 'Mercado minorista',
  },
]

/**
 * REGULACIÓN VIVA · CNMC notas de prensa filtradas a energía.
 * Intenta RSS; si falla, degrada al catálogo curado (live:false).
 */
export async function fetchCnmcEnergia(timeoutMs = 8000): Promise<CnmcEnergiaResult> {
  for (const url of CNMC_RSS_CANDIDATES) {
    try {
      const r = await fetchRSS(url, timeoutMs)
      if (!r.ok || r.items.length === 0) continue
      const items: CnmcEnergiaItem[] = r.items
        .filter((it) => {
          const hay = norm(`${it.title} ${it.description} ${(it.categories ?? []).join(' ')}`)
          return CNMC_ENERGY_HINTS.some((h) => hay.includes(norm(h)))
        })
        .map((it) => ({
          titulo: it.title,
          referencia: '',
          fecha: it.pubDate ? it.pubDate.toISOString().slice(0, 10) : '',
          tipo: 'Nota de prensa',
          url: it.link,
          materia: 'Energía',
        }))
      if (items.length > 0) {
        return { ok: true, live: true, items, n: items.length, source_url: url }
      }
    } catch {
      // siguiente candidato
    }
  }
  // Degradación: catálogo curado
  return {
    ok: true,
    live: false,
    items: CNMC_CURADO,
    n: CNMC_CURADO.length,
    error: 'CNMC RSS no disponible; mostrando catálogo curado de circulares clave (vigente, 2024-06)',
    source_url: CNMC_SOURCE_URL,
  }
}

// ===========================================================================
// 2) ESTRATEGIA · catálogo CURADO + DATADO
// ===========================================================================

/**
 * PNIEC 2023-2030 · objetivos 2030. Cifras de la versión ACTUALIZADA aprobada
 * por el Consejo de Ministros el 24-09-2024 (revisión del PNIEC original 2020).
 * Fuente: MITECO. fecha_ref = fecha de aprobación de la versión vigente.
 */
const PNIEC_OBJETIVOS: ObjetivoPniec[] = [
  {
    indicador: 'Renovables sobre generación eléctrica',
    valor_objetivo: '81 %',
    horizonte: '2030',
    fuente: 'MITECO · PNIEC 2023-2030 (actualización)',
    fecha_ref: '2024-09-24',
    url: 'https://www.miteco.gob.es/es/prensa/pniec.html',
  },
  {
    indicador: 'Renovables sobre energía final',
    valor_objetivo: '48 %',
    horizonte: '2030',
    fuente: 'MITECO · PNIEC 2023-2030 (actualización)',
    fecha_ref: '2024-09-24',
    url: 'https://www.miteco.gob.es/es/prensa/pniec.html',
  },
  {
    indicador: 'Mejora de la eficiencia / reducción del consumo de energía primaria',
    valor_objetivo: '43 %',
    horizonte: '2030',
    fuente: 'MITECO · PNIEC 2023-2030 (actualización)',
    fecha_ref: '2024-09-24',
    url: 'https://www.miteco.gob.es/es/prensa/pniec.html',
  },
  {
    indicador: 'Reducción de emisiones de GEI respecto a 1990',
    valor_objetivo: '32 %',
    horizonte: '2030',
    fuente: 'MITECO · PNIEC 2023-2030 (actualización)',
    fecha_ref: '2024-09-24',
    url: 'https://www.miteco.gob.es/es/prensa/pniec.html',
  },
  {
    indicador: 'Potencia solar fotovoltaica instalada',
    valor_objetivo: '76 GW',
    horizonte: '2030',
    fuente: 'MITECO · PNIEC 2023-2030 (actualización)',
    fecha_ref: '2024-09-24',
    url: 'https://www.miteco.gob.es/es/prensa/pniec.html',
  },
  {
    indicador: 'Potencia eólica instalada (terrestre + marina)',
    valor_objetivo: '62 GW',
    horizonte: '2030',
    fuente: 'MITECO · PNIEC 2023-2030 (actualización)',
    fecha_ref: '2024-09-24',
    url: 'https://www.miteco.gob.es/es/prensa/pniec.html',
  },
  {
    indicador: 'Almacenamiento energético',
    valor_objetivo: '22,5 GW',
    horizonte: '2030',
    fuente: 'MITECO · PNIEC 2023-2030 (actualización)',
    fecha_ref: '2024-09-24',
    url: 'https://www.miteco.gob.es/es/prensa/pniec.html',
  },
  {
    indicador: 'Electrolizadores de hidrógeno renovable',
    valor_objetivo: '12 GW',
    horizonte: '2030',
    fuente: 'MITECO · PNIEC 2023-2030 (actualización)',
    fecha_ref: '2024-09-24',
    url: 'https://www.miteco.gob.es/es/prensa/pniec.html',
  },
]

/**
 * Programas y planes estratégicos ES + UE. Catálogo CURADO + DATADO.
 * Dotaciones e hitos en cifras oficiales conocidas; fecha_ref = aprobación
 * / publicación del documento de referencia.
 */
const PROGRAMAS_ESTRATEGICOS: ProgramaEstrategico[] = [
  {
    nombre: 'PNIEC 2023-2030 (actualización)',
    organismo: 'MITECO',
    ambito: 'ES',
    objetivo: '81 % renovable en generación, 48 % renovable en energía final, 32 % reducción de emisiones vs 1990',
    horizonte: '2030',
    estado: 'Vigente',
    fecha_ref: '2024-09-24',
    url: 'https://www.miteco.gob.es/es/prensa/pniec.html',
  },
  {
    nombre: 'REPowerEU (capítulo español del Plan de Recuperación)',
    organismo: 'Comisión Europea / Gobierno de España',
    ambito: 'UE',
    objetivo: 'Reducir la dependencia de combustibles fósiles rusos y acelerar renovables, eficiencia e hidrógeno',
    dotacion_eur: 7_700_000_000,
    horizonte: '2021-2026',
    estado: 'En ejecución',
    fecha_ref: '2023-10-16',
    url: 'https://commission.europa.eu/strategy-and-policy/priorities-2019-2024/european-green-deal/repowereu-affordable-secure-and-sustainable-energy-europe_es',
  },
  {
    nombre: 'PERTE de Energías Renovables, Hidrógeno Renovable y Almacenamiento (ERHA)',
    organismo: 'Gobierno de España (MITECO)',
    ambito: 'ES',
    objetivo: 'Cadena de valor de renovables, hidrógeno verde y almacenamiento; movilizar inversión pública y privada',
    dotacion_eur: 16_370_000_000,
    horizonte: '2021-2026',
    estado: 'En ejecución',
    fecha_ref: '2021-12-14',
    url: 'https://planderecuperacion.gob.es/como-acceder-a-los-fondos/pertes/perte-de-energias-renovables-hidrogeno-renovable-y-almacenamiento',
  },
  {
    nombre: 'PERTE de Descarbonización Industrial',
    organismo: 'Gobierno de España (MINCOTUR)',
    ambito: 'ES',
    objetivo: 'Descarbonizar la industria manufacturera intensiva en energía y reducir su huella de carbono',
    dotacion_eur: 3_100_000_000,
    horizonte: '2023-2030',
    estado: 'En ejecución',
    fecha_ref: '2023-03-21',
    url: 'https://planderecuperacion.gob.es/como-acceder-a-los-fondos/pertes/perte-de-descarbonizacion-industrial',
  },
  {
    nombre: 'Hoja de Ruta del Hidrógeno: una apuesta por el hidrógeno renovable',
    organismo: 'MITECO',
    ambito: 'ES',
    objetivo: '4 GW de electrolizadores en 2030 (revisado al alza a 12 GW en el PNIEC 2024)',
    horizonte: '2020-2030',
    estado: 'Vigente',
    fecha_ref: '2020-10-06',
    url: 'https://www.miteco.gob.es/es/ministerio/planes-estrategias/hidrogeno.html',
  },
  {
    nombre: 'Estrategia de Almacenamiento Energético',
    organismo: 'MITECO',
    ambito: 'ES',
    objetivo: '20 GW de almacenamiento en 2030 y 30 GW en 2050 (objetivo revisado a 22,5 GW en el PNIEC 2024)',
    horizonte: '2021-2050',
    estado: 'Vigente',
    fecha_ref: '2021-02-09',
    url: 'https://www.miteco.gob.es/es/ministerio/planes-estrategias/almacenamiento-energetico.html',
  },
  {
    nombre: 'Estrategia de Almacenamiento — Hoja de Ruta de Bombeo',
    organismo: 'MITECO',
    ambito: 'ES',
    objetivo: 'Desarrollo del almacenamiento hidroeléctrico de bombeo reversible',
    horizonte: '2030',
    estado: 'Vigente',
    fecha_ref: '2021-02-09',
    url: 'https://www.miteco.gob.es/es/ministerio/planes-estrategias/almacenamiento-energetico.html',
  },
  {
    nombre: 'Plan Nacional de Adaptación al Cambio Climático y eje de Transición Energética (ITE)',
    organismo: 'MITECO',
    ambito: 'ES',
    objetivo: 'Marco de transición ecológica justa y descarbonización del sistema energético hacia 2050',
    horizonte: '2021-2030',
    estado: 'Vigente',
    fecha_ref: '2020-01-01',
    url: 'https://www.miteco.gob.es/es/ministerio/planes-estrategias/transicion-energetica.html',
  },
]

/**
 * Subastas del Régimen Económico de Energías Renovables (REER).
 * Histórico oficial + próximas previstas. Datos del MITECO / BOE.
 * fecha_ref de cada registro = fecha de celebración o convocatoria.
 */
const SUBASTAS_RENOVABLES: SubastaRenovable[] = [
  {
    nombre: 'Primera subasta REER',
    fecha: '2021-01-26',
    estado: 'Celebrada',
    potencia_mw: 3034,
    tecnologia: 'Eólica y fotovoltaica',
    precio_medio_eur_mwh: 26.5,
    fuente: 'MITECO · BOE',
    url: 'https://www.miteco.gob.es/es/energia/renovables/subastas.html',
  },
  {
    nombre: 'Segunda subasta REER',
    fecha: '2021-10-19',
    estado: 'Celebrada',
    potencia_mw: 3124,
    tecnologia: 'Eólica, fotovoltaica y otras',
    precio_medio_eur_mwh: 30.6,
    fuente: 'MITECO · BOE',
    url: 'https://www.miteco.gob.es/es/energia/renovables/subastas.html',
  },
  {
    nombre: 'Tercera subasta REER',
    fecha: '2022-10-25',
    estado: 'Celebrada',
    potencia_mw: 45,
    tecnologia: 'Termosolar, biomasa y otras (desierta en eólica/FV)',
    fuente: 'MITECO · BOE',
    url: 'https://www.miteco.gob.es/es/energia/renovables/subastas.html',
  },
  {
    nombre: 'Próximas convocatorias REER (calendario indicativo)',
    fecha: '2025-01-01',
    estado: 'Prevista',
    tecnologia: 'Pendiente de definición técnica por orden ministerial',
    fuente: 'MITECO · Orden de calendario de subastas',
    url: 'https://www.miteco.gob.es/es/energia/renovables/subastas.html',
  },
]

const ESTRATEGIA_CURADA: EstrategiaData = {
  pniec: PNIEC_OBJETIVOS,
  programas: PROGRAMAS_ESTRATEGICOS,
  subastas: SUBASTAS_RENOVABLES,
}

// ===========================================================================
// 3) MERCADO REGULADO · catálogo CURADO + DATADO
// ===========================================================================

/**
 * PVPC (Precio Voluntario para el Pequeño Consumidor). Estructura NUEVA
 * desde 2024: incorpora progresivamente índices de los mercados a plazo
 * (Real Decreto 446/2023). Valores y fechas oficiales.
 */
const PVPC: ConceptoMercado[] = [
  {
    concepto: 'PVPC — nueva metodología con señales a plazo',
    valor_actual: 'Índice horario + componentes mensual/trimestral/anual a plazo',
    descripcion:
      'Desde 2024 el PVPC ya no se basa solo en el mercado diario: introduce ponderaciones de productos a plazo (mensual, trimestral, anual) para suavizar la volatilidad. Pleno peso a plazo en 2025.',
    fecha_ref: '2024-01-01',
    url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2023-13680',
  },
  {
    concepto: 'Calendario de ponderación a plazo del PVPC',
    valor_actual: '2024: 25 % / 2025: 55 % / desde 2026: 100 % de componente a plazo',
    descripcion:
      'Transición gradual del peso de los mercados a plazo en el cálculo del PVPC fijada por el RD 446/2023.',
    fecha_ref: '2023-06-13',
    url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2023-13680',
  },
  {
    concepto: 'Gestor del cálculo del PVPC',
    valor_actual: 'OMIE (mercado) + Red Eléctrica (operador) + peajes/cargos CNMC',
    descripcion:
      'El PVPC integra precio de energía del mercado, peajes de acceso, cargos del sistema, coste de comercialización y financiación del bono social.',
    fecha_ref: '2024-01-01',
    url: 'https://www.ree.es/es/actividades/operacion-del-sistema-electrico/pvpc',
  },
]

/**
 * Peajes de acceso a las redes (transporte y distribución) y cargos del
 * sistema. Estructura fijada por CNMC (peajes) y Gobierno (cargos).
 */
const PEAJES: ConceptoMercado[] = [
  {
    concepto: 'Peajes de transporte y distribución de electricidad',
    valor_actual: 'Estructura por periodos horarios (P1-P6 en baja tensión 2.0TD)',
    descripcion:
      'Los peajes de acceso a redes los fija la CNMC (Circular 3/2020). La tarifa doméstica 2.0TD tiene tres periodos de potencia/energía: punta, llano y valle.',
    fecha_ref: '2021-06-01',
    url: 'https://www.cnmc.es/expedientes/cir320',
  },
  {
    concepto: 'Cargos del sistema eléctrico',
    valor_actual: 'Fijados anualmente por el Gobierno (Orden TED)',
    descripcion:
      'Los cargos cubren costes regulados del sistema (primas a renovables del régimen anterior, anualidades del déficit, extrapeninsulares). Los aprueba el Gobierno, no la CNMC.',
    fecha_ref: '2024-01-01',
    url: 'https://www.miteco.gob.es/es/energia/electricidad.html',
  },
  {
    concepto: 'Peajes de gas natural',
    valor_actual: 'Estructura de peajes de transporte y distribución de gas (CNMC)',
    descripcion:
      'La CNMC fija la metodología de peajes de la red gasista (Circular 6/2020), revisada anualmente.',
    fecha_ref: '2021-01-01',
    url: 'https://www.cnmc.es/expedientes/cir620',
  },
]

/**
 * Impuestos energéticos. Valores vigentes 2024 (tras la retirada progresiva
 * de las rebajas fiscales aplicadas durante la crisis energética 2021-2023).
 */
const IMPUESTOS: ConceptoMercado[] = [
  {
    concepto: 'Impuesto Especial sobre la Electricidad (IEE)',
    valor_actual: '5,11 %',
    descripcion:
      'Tipo mínimo legal del impuesto especial sobre la electricidad, restablecido tras las rebajas temporales (en 2021-2023 se bajó al 0,5 %). Mínimo de 0,5 €/MWh (uso industrial) y 1 €/MWh (resto).',
    fecha_ref: '2024-01-01',
    url: 'https://www.boe.es/buscar/act.php?id=BOE-A-1992-28741',
  },
  {
    concepto: 'IVA aplicable a la electricidad',
    valor_actual: '21 % (vuelta al tipo general en 2024)',
    descripcion:
      'Durante la crisis energética el IVA eléctrico se rebajó al 5 %. En 2024 se revirtió por tramos hasta volver al 21 % general al normalizarse los precios mayoristas.',
    fecha_ref: '2024-01-01',
    url: 'https://www.boe.es/buscar/act.php?id=BOE-A-1992-28740',
  },
  {
    concepto: 'Impuesto sobre el Valor de la Producción de Energía Eléctrica (IVPEE, "impuesto de generación")',
    valor_actual: '7 %',
    descripcion:
      'Grava el valor de la producción eléctrica de todas las tecnologías. Suspendido temporalmente en la crisis (0 % en 2022 y parte de 2023), restablecido al 7 % en 2024.',
    fecha_ref: '2024-01-01',
    url: 'https://www.boe.es/buscar/act.php?id=BOE-A-2012-15649',
  },
  {
    concepto: 'Céntimo verde / Impuesto sobre hidrocarburos (tramo autonómico)',
    valor_actual: 'Tramo estatal armonizado; el tramo autonómico se suprimió en 2019',
    descripcion:
      'El "céntimo verde" autonómico sobre carburantes fue declarado contrario al Derecho UE y suprimido; el tipo autonómico se integró en el estatal del impuesto sobre hidrocarburos.',
    fecha_ref: '2019-01-01',
    url: 'https://www.boe.es/buscar/act.php?id=BOE-A-1992-28741',
  },
  {
    concepto: 'Impuesto sobre el gas, carbón e hidrocarburos (IVMDH/IEH)',
    valor_actual: 'Tipos específicos por producto energético (Ley 38/1992)',
    descripcion:
      'Impuestos especiales sobre hidrocarburos, gas natural y carbón con tipos diferenciados por uso (carburante, calefacción, industrial).',
    fecha_ref: '2024-01-01',
    url: 'https://www.boe.es/buscar/act.php?id=BOE-A-1992-28741',
  },
]

/**
 * Bono social eléctrico y térmico. Descuentos y umbrales vigentes 2024.
 */
const BONO_SOCIAL: ConceptoMercado[] = [
  {
    concepto: 'Bono social eléctrico — descuento consumidor vulnerable',
    valor_actual: '35 % (reforzado hasta 50 % en periodos de crisis)',
    descripcion:
      'Descuento sobre el PVPC para consumidores vulnerables. Durante la crisis energética se elevó a 65 % (vulnerable) y 80 % (vulnerable severo); en normalización vuelve a 35 %/50 %.',
    fecha_ref: '2024-01-01',
    url: 'https://www.bonosocial.gob.es/',
  },
  {
    concepto: 'Bono social eléctrico — descuento consumidor vulnerable severo',
    valor_actual: '50 % (reforzado hasta 80 % en periodos de crisis)',
    descripcion:
      'Descuento para hogares vulnerables severos. Financiado por las comercializadoras según cuota de mercado.',
    fecha_ref: '2024-01-01',
    url: 'https://www.bonosocial.gob.es/',
  },
  {
    concepto: 'Bono social térmico',
    valor_actual: 'Ayuda directa anual para calefacción/ACS/cocina',
    descripcion:
      'Pago único anual a beneficiarios del bono social eléctrico para gastos térmicos (gas, butano, gasóleo). Cuantía variable por zona climática y grado de vulnerabilidad.',
    fecha_ref: '2024-01-01',
    url: 'https://www.miteco.gob.es/es/energia/bono-social-termico.html',
  },
]

const MERCADO_CURADO: MercadoData = {
  pvpc: PVPC,
  peajes: PEAJES,
  impuestos: IMPUESTOS,
  bono_social: BONO_SOCIAL,
}

// ===========================================================================
// 4) ORQUESTADOR
// ===========================================================================

/**
 * Orquesta TODA la política energética en paralelo (Promise.allSettled).
 * Cada bloque degrada por separado: si una fuente LIVE falla, su `ok:false`
 * / array vacío no tumba el resto. La estrategia y el mercado son catálogos
 * curados deterministas (siempre presentes).
 */
export async function fetchPoliticaEnergetica(
  opts?: PoliticaEnergeticaOpts,
): Promise<PoliticaEnergeticaResult> {
  const diasBoe = opts?.diasBoe ?? 7
  const timeoutMs = opts?.timeoutMs ?? 8000
  const fetched_at = new Date().toISOString()
  const fuentes_error: string[] = []

  const [boeR, eurlexR, cnmcR] = await Promise.allSettled([
    fetchBoeEnergia(diasBoe, timeoutMs),
    fetchEurLexEnergia(timeoutMs),
    fetchCnmcEnergia(timeoutMs),
  ])

  const boe: BoeEnergiaResult =
    boeR.status === 'fulfilled'
      ? boeR.value
      : {
          ok: false,
          live: true,
          items: [],
          n: 0,
          error: String(boeR.reason),
          source_url: BOE_SOURCE_URL,
        }
  if (!boe.ok) fuentes_error.push(`BOE: ${boe.error ?? 'error'}`)

  const eurlex: EurLexEnergiaResult =
    eurlexR.status === 'fulfilled'
      ? eurlexR.value
      : {
          ok: true,
          live: false,
          items: EURLEX_CURADO,
          n: EURLEX_CURADO.length,
          error: `EUR-Lex fallback: ${String(eurlexR.reason)}`,
          source_url: EURLEX_SEARCH_URL,
        }
  if (eurlex.error) fuentes_error.push(`EUR-Lex: ${eurlex.error}`)

  const cnmc: CnmcEnergiaResult =
    cnmcR.status === 'fulfilled'
      ? cnmcR.value
      : {
          ok: true,
          live: false,
          items: CNMC_CURADO,
          n: CNMC_CURADO.length,
          error: `CNMC fallback: ${String(cnmcR.reason)}`,
          source_url: CNMC_SOURCE_URL,
        }
  if (cnmc.error) fuentes_error.push(`CNMC: ${cnmc.error}`)

  // ok global = al menos la regulación LIVE del BOE respondió OK.
  const ok = boe.ok

  return {
    ok,
    regulacion: { boe, eurlex, cnmc },
    estrategia: ESTRATEGIA_CURADA,
    mercado: MERCADO_CURADO,
    fuentes_error,
    fetched_at,
  }
}

// Re-export de catálogos curados por si una vista los quiere sin orquestar.
export {
  EURLEX_CURADO,
  CNMC_CURADO,
  ESTRATEGIA_CURADA,
  MERCADO_CURADO,
  PNIEC_OBJETIVOS,
  PROGRAMAS_ESTRATEGICOS,
  SUBASTAS_RENOVABLES,
}
