/**
 * lib/tercer-sector/territorio-core.ts · Núcleo PURO de la capa territorial del
 * cockpit de Tercer Sector · Sprint TS-Cockpit W1c.
 *
 * Contiene SOLO lógica sin red: los tipos del contrato (`TerritorioTS`), los
 * helpers de atribución por CCAA, el agregador `buildTerritorio` y las reglas de
 * alerta `computeAlertas`. Se separa del orquestador (`territorio.ts`, que sí
 * hace fetch) para que el harness de tests Node (--experimental-strip-types)
 * pueda cargarlo directamente: este módulo solo hace imports de TIPOS de los
 * conectores (erasure en compilación) + el valor `ccaaKey`/`sectorLabel`/`CCAA`
 * de `shared.ts` (un leaf sin red). Mismo patrón que
 * `iati-enriched-parsers.ts` (puro) frente a `iati-enriched.ts` (red).
 *
 * IMPORTES: regla CLAUDE.md — NO se inventan. Agregado sin dato → `null` (no 0).
 * Un `null` = "no se conoce"; un `0` afirmaría "se conoce y es cero". Los
 * CONTADORES (entidades, concesiones, licitaciones) sí son enteros reales:
 * contamos filas, no euros.
 */
import type { Organizacion } from './organizaciones-catalog'
import type { BdnsConcesion, BdnsConvocatoria } from './bdns'
import type { LicitacionNormalizada } from './licitaciones/types'
// Import de VALOR con extensión .ts: lo exige el harness de tests Node
// (--experimental-strip-types) para resolver el módulo de forma directa; tsc lo
// admite por `allowImportingTsExtensions` + `moduleResolution: bundler`. Los
// imports de TIPO de arriba se borran en compilación, así que van sin extensión.
import { CCAA, CCAA_BY_KEY, ccaaKey, sectorLabel } from './shared.ts'

// ─────────────────────────────────────────────────────────────────────────
// Contrato (spec · TerritorioTS)
// ─────────────────────────────────────────────────────────────────────────

/** Item de ranking genérico (sector / comprador / beneficiario). */
export interface TerritorioRankItem {
  nombre: string
  count: number
  /** Importe agregado en euros; null si NINGUNA fila aportó importe. */
  importe_eur: number | null
}

/**
 * Snapshot territorial de UNA comunidad autónoma. Shape EXACTO del spec
 * (sección "TerritorioTS"). Los importes son null cuando no se conocen.
 */
export interface TerritorioTS {
  /** Clave estable de CCAA (ej. "comunidad-valenciana"); "desconocida" para el cubo residual. */
  ccaa: string
  /** Nombre legible de la CCAA (para la UI). */
  ccaa_nombre: string
  /** Provincia, si en el futuro se desagrega; hoy siempre ausente. */
  provincia?: string
  /** Nº de entidades del catálogo con sede en esta CCAA. */
  entidades: number
  /** Suma de ingresos anuales de las entidades (solo las que lo publican); null si ninguna. */
  ingresos_eur: number | null
  /** Suma de empleados de las entidades (solo las que lo publican); null si ninguna. */
  empleados: number | null
  /** Suma de subvenciones BDNS recientes concedidas en/por esta CCAA; null si ninguna con importe. */
  subvenciones_eur: number | null
  /** Nº de concesiones BDNS recientes atribuidas a esta CCAA. */
  concesiones: number
  /** Nº de convocatorias BDNS recientes/abiertas atribuidas a esta CCAA. */
  convocatorias_abiertas: number
  /** Nº de licitaciones (contratos) atribuidas a esta CCAA. */
  licitaciones: number
  /** Suma del valor estimado de las licitaciones; null si ninguna con importe. */
  licitaciones_valor_eur: number | null
  /** Sectores del tercer sector más presentes (por nº de entidades del catálogo). */
  sectores_top: TerritorioRankItem[]
  /** Órganos compradores/convocantes más activos (concesiones + licitaciones). */
  compradores_top: TerritorioRankItem[]
  /** Beneficiarios de subvención más recurrentes (de las concesiones BDNS). */
  beneficiarios_top: TerritorioRankItem[]
  /** Alertas de hueco/oportunidad (texto, cero emojis). */
  alertas: string[]
}

/** Inputs del agregador puro. Cada lista ya viene descargada y normalizada. */
export interface BuildTerritorioInputs {
  organizaciones: Organizacion[]
  concesiones: BdnsConcesion[]
  convocatorias: BdnsConvocatoria[]
  licitaciones: LicitacionNormalizada[]
  /** Opciones de tuning de las alertas/rankings (todas con defaults sensatos). */
  opts?: BuildTerritorioOpts
}

/** Parámetros de las heurísticas de alerta y del tamaño de los rankings. */
export interface BuildTerritorioOpts {
  /** Tamaño de cada ranking top (sectores/compradores/beneficiarios). Default 5. */
  topN?: number
  /**
   * Umbral de "muchas entidades" para la alerta de financiación. Default: se
   * calcula como la mediana de entidades por CCAA (con suelo 3). Si se pasa un
   * número, se usa tal cual.
   */
  entidadesAltoUmbral?: number
  /** Umbral de "muchas convocatorias" para la alerta de presencia. Default: mediana (suelo 3). */
  convocatoriasAltoUmbral?: number
  /** Por debajo de este nº de concesiones recientes se considera "poca financiación". Default 2. */
  pocaFinanciacionMaxConcesiones?: number
  /** Por debajo de este nº de entidades del catálogo se considera "poca presencia". Default 2. */
  pocaPresenciaMaxEntidades?: number
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers PUROS de atribución territorial + suma null-safe
// ─────────────────────────────────────────────────────────────────────────

/** Cubo residual para filas cuya CCAA no se puede resolver. */
export const CCAA_DESCONOCIDA = 'desconocida'
const CCAA_DESCONOCIDA_LABEL = 'Sin CCAA identificada'

/**
 * Resuelve la CCAA de una concesión/convocatoria BDNS. Su `territorio` es el
 * nivel2 (nombre de CCAA del convocante) cuando el nivel es AUTONOMICA/LOCAL.
 * Si no resuelve a una CCAA conocida → cubo residual. Pura.
 */
export function ccaaDeBdns(territorio: string | null | undefined): string {
  return ccaaKey(territorio ?? null) ?? CCAA_DESCONOCIDA
}

/**
 * Resuelve la CCAA de una licitación. Intenta primero `region` (CityName /
 * CountrySubentity de PLACE, comunidadAutonoma de BDNS); si no resuelve y el
 * comprador menciona una CCAA, cae a eso. Solo cuenta licitaciones de España
 * (las internacionales no tienen CCAA española). Pura.
 */
export function ccaaDeLicitacion(lic: LicitacionNormalizada): string {
  // Las licitaciones no españolas no aportan a la foto territorial CCAA.
  if (lic.pais && lic.pais !== 'España') return CCAA_DESCONOCIDA
  const byRegion = ccaaKey(lic.region)
  if (byRegion) return byRegion
  const byComprador = ccaaKey(lic.comprador)
  if (byComprador) return byComprador
  return CCAA_DESCONOCIDA
}

/**
 * Suma null-safe que distingue "sin dato" de "cero". Acumula solo valores
 * numéricos; si NINGUNO lo era, devuelve null. Pura.
 */
function sumOrNull(values: Array<number | null | undefined>): number | null {
  let acc = 0
  let any = false
  for (const v of values) {
    if (typeof v === 'number' && Number.isFinite(v)) {
      acc += v
      any = true
    }
  }
  return any ? acc : null
}

/** Mediana de una lista de números (entero hacia abajo). 0 si vacía. Pura. */
function median(nums: number[]): number {
  if (nums.length === 0) return 0
  const sorted = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? Math.floor((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid]
}

/**
 * Agrupa filas en un ranking por clave, sumando count e importe null-safe.
 * `keyFn` da la etiqueta visible; filas con etiqueta vacía se ignoran. Pura.
 */
function rank<T>(
  rows: T[],
  keyFn: (row: T) => string | null | undefined,
  importeFn: (row: T) => number | null | undefined,
  topN: number,
): TerritorioRankItem[] {
  const byKey = new Map<string, { count: number; importe: number | null }>()
  for (const row of rows) {
    const label = (keyFn(row) ?? '').trim()
    if (!label) continue
    const cur = byKey.get(label) ?? { count: 0, importe: null }
    cur.count += 1
    const imp = importeFn(row)
    if (typeof imp === 'number' && Number.isFinite(imp)) {
      cur.importe = (cur.importe ?? 0) + imp
    }
    byKey.set(label, cur)
  }
  return Array.from(byKey.entries())
    .map(([nombre, v]) => ({ nombre, count: v.count, importe_eur: v.importe }))
    .sort((a, b) => {
      // Orden: por importe conocido desc, luego por count desc, luego alfabético.
      const ai = a.importe_eur ?? -1
      const bi = b.importe_eur ?? -1
      if (bi !== ai) return bi - ai
      if (b.count !== a.count) return b.count - a.count
      return a.nombre.localeCompare(b.nombre)
    })
    .slice(0, Math.max(1, topN))
}

// ─────────────────────────────────────────────────────────────────────────
// Agregador PURO · buildTerritorio (testeable con fixtures)
// ─────────────────────────────────────────────────────────────────────────

interface CcaaAccumulator {
  ccaa: string
  organizaciones: Organizacion[]
  concesiones: BdnsConcesion[]
  convocatorias: BdnsConvocatoria[]
  licitaciones: LicitacionNormalizada[]
}

/** Etiqueta humana de una clave de CCAA (incluye el cubo residual). */
function ccaaLabel(key: string): string {
  if (key === CCAA_DESCONOCIDA) return CCAA_DESCONOCIDA_LABEL
  return CCAA_BY_KEY[key]?.name ?? key
}

/**
 * Construye el array de snapshots territoriales agregando los cuatro inputs
 * por CCAA. PURO (sin red): el route lo alimenta con datos ya descargados, los
 * tests con fixtures. Devuelve una fila por cada CCAA con CUALQUIER señal
 * (entidades, concesiones, convocatorias o licitaciones); el cubo residual
 * `desconocida` solo aparece si recibió alguna fila no atribuible.
 *
 * Orden de salida: por nº de entidades desc, luego por nº de concesiones desc,
 * luego alfabético; el cubo residual SIEMPRE al final.
 */
export function buildTerritorio(inputs: BuildTerritorioInputs): TerritorioTS[] {
  const {
    organizaciones = [],
    concesiones = [],
    convocatorias = [],
    licitaciones = [],
    opts = {},
  } = inputs
  const topN = Math.max(1, opts.topN ?? 5)

  // 1) Bucketize por CCAA.
  const buckets = new Map<string, CcaaAccumulator>()
  const ensure = (key: string): CcaaAccumulator => {
    let b = buckets.get(key)
    if (!b) {
      b = { ccaa: key, organizaciones: [], concesiones: [], convocatorias: [], licitaciones: [] }
      buckets.set(key, b)
    }
    return b
  }

  for (const org of organizaciones) {
    const key = ccaaKey(org.ccaa ?? null) ?? CCAA_DESCONOCIDA
    ensure(key).organizaciones.push(org)
  }
  for (const c of concesiones) {
    ensure(ccaaDeBdns(c.territorio)).concesiones.push(c)
  }
  for (const v of convocatorias) {
    ensure(ccaaDeBdns(v.territorio)).convocatorias.push(v)
  }
  for (const l of licitaciones) {
    ensure(ccaaDeLicitacion(l)).licitaciones.push(l)
  }

  // 2) Construir snapshot por bucket. (Array.from para no depender de
  //    downlevelIteration en la config de tsc.)
  const rows: TerritorioTS[] = []
  for (const b of Array.from(buckets.values())) {
    const entidades = b.organizaciones.length
    const ingresos_eur = sumOrNull(b.organizaciones.map((o) => o.ingresos_eur))
    const empleados = sumOrNull(b.organizaciones.map((o) => o.empleados))
    const subvenciones_eur = sumOrNull(b.concesiones.map((c) => c.importe_eur))
    const licitaciones_valor_eur = sumOrNull(b.licitaciones.map((l) => l.valor_eur))

    // Sectores top: por nº de entidades del catálogo (la financiación BDNS no
    // trae sector fiable; mantenemos honestidad y usamos el catálogo).
    const sectores_top = rank(
      b.organizaciones,
      (o) => sectorLabel(o.sector),
      (o) => o.ingresos_eur,
      topN,
    )

    // Compradores top: órganos que MUEVEN dinero/contratos en la CCAA →
    // unimos órganos convocantes de concesiones + compradores de licitaciones.
    const compradorRows: Array<{ nombre: string; importe: number | null }> = [
      ...b.concesiones.map((c) => ({ nombre: c.organo ?? '', importe: c.importe_eur })),
      ...b.licitaciones.map((l) => ({ nombre: l.comprador ?? '', importe: l.valor_eur })),
    ]
    const compradores_top = rank(
      compradorRows,
      (r) => r.nombre,
      (r) => r.importe,
      topN,
    )

    // Beneficiarios top: quién recibe las subvenciones (de las concesiones).
    const beneficiarios_top = rank(
      b.concesiones,
      (c) => c.beneficiario_nombre || c.beneficiario_nif || '',
      (c) => c.importe_eur,
      topN,
    )

    rows.push({
      ccaa: b.ccaa,
      ccaa_nombre: ccaaLabel(b.ccaa),
      entidades,
      ingresos_eur,
      empleados,
      subvenciones_eur,
      concesiones: b.concesiones.length,
      convocatorias_abiertas: b.convocatorias.length,
      licitaciones: b.licitaciones.length,
      licitaciones_valor_eur,
      sectores_top,
      compradores_top,
      beneficiarios_top,
      alertas: [], // se rellenan abajo (necesitan visión global de umbrales)
    })
  }

  // 3) Alertas de hueco — necesitan los umbrales relativos al conjunto de CCAA
  //    reales (excluimos el cubo residual del cálculo de medianas).
  const realRows = rows.filter((r) => r.ccaa !== CCAA_DESCONOCIDA)
  const entidadesAlto =
    opts.entidadesAltoUmbral ??
    Math.max(3, median(realRows.map((r) => r.entidades)))
  const convocatoriasAlto =
    opts.convocatoriasAltoUmbral ??
    Math.max(3, median(realRows.map((r) => r.convocatorias_abiertas)))
  const pocaFinanciacionMax = opts.pocaFinanciacionMaxConcesiones ?? 2
  const pocaPresenciaMax = opts.pocaPresenciaMaxEntidades ?? 2

  for (const r of rows) {
    if (r.ccaa === CCAA_DESCONOCIDA) continue // sin sentido sobre datos no atribuidos
    r.alertas = computeAlertas(r, {
      entidadesAlto,
      convocatoriasAlto,
      pocaFinanciacionMax,
      pocaPresenciaMax,
    })
  }

  // 4) Orden: entidades desc, concesiones desc, alfabético; residual al final.
  rows.sort((a, b) => {
    if (a.ccaa === CCAA_DESCONOCIDA) return 1
    if (b.ccaa === CCAA_DESCONOCIDA) return -1
    if (b.entidades !== a.entidades) return b.entidades - a.entidades
    if (b.concesiones !== a.concesiones) return b.concesiones - a.concesiones
    return a.ccaa_nombre.localeCompare(b.ccaa_nombre)
  })

  return rows
}

/** Umbrales resueltos para las alertas (todos enteros). */
export interface AlertaThresholds {
  entidadesAlto: number
  convocatoriasAlto: number
  pocaFinanciacionMax: number
  pocaPresenciaMax: number
}

/**
 * Calcula las alertas de hueco de UNA fila territorial. Pura: testeable de
 * forma aislada. Devuelve textos (cero emojis).
 */
export function computeAlertas(r: TerritorioTS, th: AlertaThresholds): string[] {
  const out: string[] = []

  // Regla 1 · "muchas entidades, poca financiación reciente".
  // Tejido social notable pero subvenciones recientes escasas → hueco de captación.
  const muchasEntidades = r.entidades >= th.entidadesAlto
  const pocaFinanciacion =
    r.concesiones <= th.pocaFinanciacionMax &&
    (r.subvenciones_eur == null || r.subvenciones_eur === 0)
  if (muchasEntidades && pocaFinanciacion) {
    out.push(
      `Hueco de financiación: ${r.entidades} entidades del catálogo con sede en ${r.ccaa_nombre} pero apenas ${r.concesiones} concesión(es) reciente(s) detectada(s). Posible captación de subvenciones infra-aprovechada.`,
    )
  }

  // Regla 2 · "muchas convocatorias, poca presencia de entidades del catálogo".
  // Oferta de convocatorias pero pocas entidades de referencia → oportunidad de implantación.
  const muchasConvocatorias = r.convocatorias_abiertas >= th.convocatoriasAlto
  const pocaPresencia = r.entidades <= th.pocaPresenciaMax
  if (muchasConvocatorias && pocaPresencia) {
    out.push(
      `Oportunidad territorial: ${r.convocatorias_abiertas} convocatoria(s) reciente(s) en ${r.ccaa_nombre} con solo ${r.entidades} entidad(es) del catálogo presentes. Territorio con oferta y poca competencia conocida del tercer sector.`,
    )
  }

  return out
}

/** Re-export de utilidades de CCAA para consumidores (UI / route / tests). */
export { CCAA }
