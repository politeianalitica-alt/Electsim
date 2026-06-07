/**
 * Enriquecimiento de analista para licitaciones · Tercer Sector · Cockpit W1b
 *
 * Toma una `LicitacionNormalizada` cruda (la que devuelven los conectores) y le
 * añade los metadatos que necesita el analista para decidir rápido:
 *   - categoria_ts   · a qué línea de tercer sector pertenece (servicios sociales…)
 *   - score_ong      · encaje ONG 0-100 + label + razones (vía scoring de oportunidades)
 *   - dias_restantes · urgencia
 *   - valor_bucket   · tramo de importe (chips de filtro)
 *   - comprador_tipo · naturaleza del órgano (ayuntamiento / ccaa / age / ue / …)
 *   - riesgo_pliego  · riesgo derivado del scoring
 *
 * Todo es OPCIONAL en el tipo: una licitación sin enriquecer sigue siendo válida.
 * Estas funciones son PURAS salvo `scoreOportunidad`, que es la FUENTE ÚNICA de
 * verdad del scoring (`lib/tercer-sector/oportunidades/scoring.ts`). No se
 * duplican aquí las listas de CPV/keywords del scoring — se importan.
 *
 * El scoring se resuelve de forma perezosa y resiliente (createRequire): si el
 * módulo de oportunidades aún no existe en el entorno, el enriquecimiento degrada
 * honestamente (score_label='incierta', razones explican el porqué) en lugar de
 * lanzar. Esto mantiene la firma SÍNCRONA de `enrichLicitacionTS` y permite que
 * el wiring del endpoint sea un `.map()` simple.
 */
import type {
  CompradorTipo,
  LicitacionNormalizada,
  NivelLicitacion,
  RiesgoPliego,
  ScoreLabel,
  ValorBucket,
} from './types.ts'
// Imports de VALOR con extensión .ts explícita: lo exige el ESM loader del
// harness de tests (`node --experimental-strip-types`) y lo permite tsc gracias
// a `allowImportingTsExtensions` + `moduleResolution: bundler` en tsconfig.
import { cpvLabel, normalizeCpv } from './cpv.ts'
// Scoring · FUENTE ÚNICA de verdad (lib/tercer-sector/oportunidades/scoring.ts).
// No se duplican aquí las listas de CPV/keywords: se importa el scorer entero.
import { scoreOportunidad } from '../oportunidades/scoring.ts'
import type { ScoreInput, ScoreResult } from '../oportunidades/scoring.ts'

// ─────────────────────────────────────────────────────────────────────────
// Scoring (fuente única de verdad) · inyectable para tests
// ─────────────────────────────────────────────────────────────────────────

/** Re-export del input de scoring (W1a) para los consumidores del enrich. */
export type ScoringInput = ScoreInput
/** Re-export del resultado de scoring (W1a). */
export type ScoringResult = ScoreResult

type ScoreFn = (o: ScoreInput) => ScoreResult

// Por defecto, el scorer real. Los tests pueden inyectar un stub o simular su
// ausencia con `_setScoreFn(null)` (degradación honesta) vía `_setScoreFn`.
let _scoreFn: ScoreFn | null = scoreOportunidad

/**
 * Solo para tests: inyecta un stub de scoring, o `null` para simular ausencia
 * (degradación honesta), o `undefined` para restaurar el scorer real.
 */
export function _setScoreFn(fn: ScoreFn | null | undefined): void {
  _scoreFn = fn === undefined ? scoreOportunidad : fn
}

// ─────────────────────────────────────────────────────────────────────────
// calcDiasRestantes — PURO
// ─────────────────────────────────────────────────────────────────────────

/**
 * Días naturales desde HOY (UTC) hasta `plazo`. Negativo si ya venció, 0 si es
 * hoy. null si `plazo` es vacío o no parseable (no se inventa urgencia).
 * El cálculo es a nivel de día (se ignora la hora) para evitar off-by-one.
 */
export function calcDiasRestantes(plazo: string | null, now: Date = new Date()): number | null {
  if (!plazo) return null
  const d = new Date(plazo)
  if (Number.isNaN(d.getTime())) return null
  const MS_DAY = 86_400_000
  const startPlazo = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  const startNow = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  return Math.round((startPlazo - startNow) / MS_DAY)
}

// ─────────────────────────────────────────────────────────────────────────
// classifyComprador — PURO
// ─────────────────────────────────────────────────────────────────────────

/** Comunidades autónomas y gentilicios/órganos que delatan nivel CCAA. */
const CCAA_HINTS = [
  'andalucía',
  'andalucia',
  'aragón',
  'aragon',
  'asturias',
  'principado de asturias',
  'baleares',
  'illes balears',
  'islas baleares',
  'canarias',
  'cantabria',
  'castilla y león',
  'castilla y leon',
  'castilla-la mancha',
  'castilla la mancha',
  'cataluña',
  'cataluna',
  'catalunya',
  'comunidad valenciana',
  'comunitat valenciana',
  'generalitat valenciana',
  'extremadura',
  'galicia',
  'xunta de galicia',
  'xunta',
  'madrid',
  'comunidad de madrid',
  'región de murcia',
  'region de murcia',
  'navarra',
  'comunidad foral de navarra',
  'país vasco',
  'pais vasco',
  'euskadi',
  'gobierno vasco',
  'eusko jaurlaritza',
  'la rioja',
  'ceuta',
  'melilla',
  'generalitat',
  'junta de',
  'consejería',
  'consejeria',
  'conselleria',
  'conselleria de',
  'departament de',
  'comunidad autónoma',
  'comunidad autonoma',
  'autonómic',
  'autonomic',
]

/** Indicadores de administración general del Estado (AGE). */
const AGE_HINTS = [
  'ministerio',
  'administración general del estado',
  'administracion general del estado',
  'secretaría de estado',
  'secretaria de estado',
  'subsecretaría',
  'subsecretaria',
  'agencia estatal',
  'gobierno de españa',
  'gobierno de espana',
  'dirección general del estado',
]

/** Indicadores de entidad local (ayuntamiento). */
const LOCAL_HINTS = [
  'ayuntamiento',
  'concello', // gallego
  'ajuntament', // catalán/valenciano
  'udal', // euskera
  'cabildo',
  'consell insular',
  'consejo insular',
  'diputación',
  'diputacion',
  'diputació',
  'mancomunidad',
  'consorcio local',
  'entidad local',
]

/**
 * Clasifica la naturaleza del comprador combinando el NOMBRE del órgano y el
 * NIVEL administrativo de la licitación. Orden de prioridad pensado para no
 * etiquetar mal una entidad local como CCAA solo porque el nombre menciona una
 * comunidad: lo local (ayuntamiento/concello/ajuntament) gana primero.
 */
export function classifyComprador(comprador: string, nivel: NivelLicitacion): CompradorTipo {
  const c = (comprador || '').toLowerCase()

  // 1) Entidad local explícita en el nombre → ayuntamiento (incluso si nivel=ccaa).
  if (LOCAL_HINTS.some((h) => c.includes(h))) return 'ayuntamiento'

  // 2) Niveles supra-nacionales son inequívocos por nivel.
  if (nivel === 'ue') return 'ue'
  if (nivel === 'org_internacional') return 'org_internacional'

  // 3) AGE: ministerio / Estado en el nombre, o nivel nacional_es.
  if (AGE_HINTS.some((h) => c.includes(h))) return 'age'

  // 4) CCAA: nivel autonómico/local español, o nombre de comunidad/consejería.
  if (nivel === 'ccaa') return 'ccaa'
  if (CCAA_HINTS.some((h) => c.includes(h))) return 'ccaa'

  // 5) Nivel nacional sin pistas de local/CCAA → AGE.
  if (nivel === 'nacional_es') return 'age'

  // 6) Resto (países extranjeros, regional extranjero sin más señal) → otro.
  return 'otro'
}

// ─────────────────────────────────────────────────────────────────────────
// detectCategoriaTS — PURO
// ─────────────────────────────────────────────────────────────────────────

/**
 * Categorías de tercer sector con sus disparadores de texto. El orden importa:
 * la primera categoría cuyos keywords matcheen gana. Las categorías más
 * específicas (discapacidad, infancia…) van antes que las genéricas (servicios
 * sociales) para no absorberlas.
 */
const CATEGORIAS_TS: { categoria: string; keywords: string[] }[] = [
  {
    categoria: 'Discapacidad',
    keywords: ['discapacidad', 'discapacitad', 'diversidad funcional', 'dependencia', 'autonomía personal', 'gran dependencia'],
  },
  {
    categoria: 'Infancia y familia',
    keywords: ['infancia', 'menores', 'menor de edad', 'niños', 'familia', 'familias', 'adopción', 'acogimiento', 'protección de menores'],
  },
  {
    categoria: 'Mayores',
    keywords: ['personas mayores', 'tercera edad', 'envejecimiento', 'gerontológic', 'residencia de mayores'],
  },
  {
    categoria: 'Migración y asilo',
    keywords: ['migra', 'inmigra', 'refugiad', 'asilo', 'extranjer', 'acogida', 'solicitantes de protección'],
  },
  {
    categoria: 'Igualdad y violencia de género',
    keywords: ['igualdad', 'violencia de género', 'violencia de genero', 'violencia machista', 'mujer', 'mujeres', 'lgtbi', 'lgtb', 'feminis'],
  },
  {
    categoria: 'Empleo e inserción',
    keywords: ['empleo', 'inserción laboral', 'insercion laboral', 'inserción sociolaboral', 'formación para el empleo', 'orientación laboral', 'empleabilidad', 'taller de empleo'],
  },
  {
    categoria: 'Cooperación y ayuda humanitaria',
    keywords: ['cooperación', 'cooperacion', 'cooperación al desarrollo', 'ayuda humanitaria', 'humanitari', 'desarrollo sostenible', 'acción exterior', 'codesarrollo'],
  },
  {
    categoria: 'Voluntariado',
    keywords: ['voluntariado', 'voluntari'],
  },
  {
    categoria: 'Sinhogarismo y vivienda',
    keywords: ['sin hogar', 'sinhogar', 'personas sin hogar', 'sinhogarismo', 'housing first', 'exclusión residencial'],
  },
  {
    categoria: 'Adicciones',
    keywords: ['adicción', 'adiccion', 'drogodependencia', 'toxicoman', 'ludopatía', 'ludopatia'],
  },
  {
    categoria: 'Salud y salud mental',
    keywords: ['salud mental', 'enfermedad mental', 'atención sociosanitaria', 'sociosanitari', 'cuidados paliativos', 'enfermos crónicos'],
  },
  {
    categoria: 'Inclusión y exclusión social',
    keywords: ['inclusión social', 'inclusion social', 'exclusión social', 'exclusion social', 'vulnerabilidad', 'colectivos vulnerables', 'riesgo de exclusión', 'pobreza', 'rentas mínimas'],
  },
  {
    categoria: 'Servicios sociales',
    keywords: ['servicios sociales', 'asistencia social', 'acción social', 'accion social', 'atención social', 'intervención social', 'ayuda a domicilio', 'centro de día', 'comunitari'],
  },
]

/**
 * Infiere la categoría de tercer sector de una licitación a partir del texto
 * (título + comprador, etc.) y del CPV. Devuelve la etiqueta de categoría o
 * null si no hay señal suficiente (no se fuerza una categoría).
 *
 * El texto manda (más específico que el CPV). Si el texto no decide pero el CPV
 * es social, se cae a la etiqueta legible del CPV como categoría de respaldo.
 */
export function detectCategoriaTS(text: string, cpv: string | null): string | null {
  const t = (text || '').toLowerCase()
  if (t) {
    for (const { categoria, keywords } of CATEGORIAS_TS) {
      if (keywords.some((k) => t.includes(k))) return categoria
    }
  }
  // Respaldo por CPV: solo divisiones realmente sociales/salud/cooperación.
  const n = normalizeCpv(cpv)
  if (n) {
    const label = cpvLabel(n)
    if (label) return label
  }
  return null
}

// ─────────────────────────────────────────────────────────────────────────
// valorBucket — PURO
// ─────────────────────────────────────────────────────────────────────────

/**
 * Tramo de valor estimado en EUR:
 *   micro    < 15.000
 *   pequena  < 60.000
 *   media    < 300.000
 *   grande   < 5.000.000
 *   mega    >= 5.000.000
 *   desconocido (v == null o no finito)
 */
export function valorBucket(v: number | null): ValorBucket {
  if (v == null || !Number.isFinite(v)) return 'desconocido'
  if (v < 15_000) return 'micro'
  if (v < 60_000) return 'pequena'
  if (v < 300_000) return 'media'
  if (v < 5_000_000) return 'grande'
  return 'mega'
}

// ─────────────────────────────────────────────────────────────────────────
// enrichLicitacionTS — orquesta todo (SÍNCRONO)
// ─────────────────────────────────────────────────────────────────────────

/** Formatos considerados "analizables" por el extractor de pliegos. */
const ANALIZABLE_FORMATS = new Set(['pdf', 'docx', 'doc', 'xlsx', 'xls', 'html'])

/** ¿La licitación tiene algún documento con formato analizable? */
export function tieneDocAnalizable(l: LicitacionNormalizada): boolean {
  return (l.documentos || []).some((d) => ANALIZABLE_FORMATS.has((d.formato || '').toLowerCase()))
}

/**
 * Rellena TODOS los campos de enriquecimiento opcionales de una licitación.
 * No muta la entrada: devuelve un objeto nuevo (spread). Si el scoring no está
 * disponible, score_ong=null / score_label='incierta' con una razón honesta.
 */
export function enrichLicitacionTS(l: LicitacionNormalizada): LicitacionNormalizada {
  const dias = calcDiasRestantes(l.plazo)
  const comprador_tipo = classifyComprador(l.comprador, l.nivel)
  const valor_bucket = valorBucket(l.valor_eur)
  const texto = `${l.titulo || ''} ${l.comprador || ''}`
  const categoria_ts = detectCategoriaTS(texto, l.cpv)

  // Scoring — fuente única de verdad (W1a). `_scoreFn` apunta por defecto al
  // scorer real; los tests pueden inyectar un stub o `null` (simula ausencia).
  // Degrada honestamente: sin scorer o si lanza → 'incierta' con razón explícita.
  let score_ong: number | null = null
  let score_label: ScoreLabel = 'incierta'
  let razones_score: string[] = ['Scoring no disponible: encaje sin determinar.']
  let riesgo_pliego: RiesgoPliego = 'incierto'

  if (_scoreFn) {
    try {
      const r = _scoreFn({
        titulo: l.titulo || '',
        cpv: l.cpv ?? null,
        tipo: 'licitacion',
        importe_eur: l.valor_eur,
        fecha_limite: l.plazo,
        // El scorer solo necesita la URL del documento (señal "docs descargables").
        documentos: (l.documentos || []).map((d) => ({ url: d.url })),
        moneda: l.moneda || 'EUR',
        idioma: l.idioma || 'es',
      })
      score_ong = typeof r.score === 'number' ? r.score : null
      score_label = r.label ?? 'incierta'
      razones_score = Array.isArray(r.razones) ? r.razones : []
      riesgo_pliego = r.riesgo ?? 'incierto'
    } catch (e) {
      razones_score = [`Scoring falló: ${(e as Error)?.message ?? 'error'}.`]
    }
  }

  return {
    ...l,
    categoria_ts,
    score_ong,
    score_label,
    razones_score,
    dias_restantes: dias,
    valor_bucket,
    comprador_tipo,
    riesgo_pliego,
  }
}
