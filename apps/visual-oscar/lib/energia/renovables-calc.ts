/**
 * Cálculos puros de la vista Renovables · Sprint Energía S5.
 *
 * Extraídos de `app/sector-energia/_components/LoadFactorChart.tsx` para que
 * la lógica del factor de carga sea testeable sin montar React ni hacer fetch.
 * Sin dependencias (usable en componentes cliente y en tests Node con
 * `--experimental-strip-types`).
 *
 * FACTOR DE CARGA (capacity factor)
 * ─────────────────────────────────
 * Mide qué fracción de su potencia instalada produce de media una tecnología:
 *
 *     factor_carga = generación_media (MW)  /  capacidad_instalada (MW)
 *
 * Ambas magnitudes en MW (potencia), así que el cociente es adimensional
 * (0..1). Una eólica con factor 0,27 produce de media el 27 % de su máximo
 * teórico. Valores típicos ES: eólica ~25-30 %, solar FV ~18-22 %, hidráulica
 * variable según hidraulicidad, biomasa alta (gestionable).
 *
 * Generación media: la potencia media observada en ESIOS (avg_24h_mw o now_mw).
 * Capacidad: la potencia instalada del catálogo (CAPACIDAD_RENOVABLE_ES).
 */

/** Resultado del cálculo de factor de carga de una tecnología. */
export interface LoadFactorResult {
  /** Generación media observada (MW). */
  gen_media_mw: number
  /** Capacidad instalada (MW). */
  capacidad_mw: number
  /** Factor de carga en fracción 0..1 (null si no calculable). */
  factor: number | null
  /** Factor de carga en porcentaje 0..100 (null si no calculable). */
  factor_pct: number | null
}

/**
 * Factor de carga = generación media / capacidad instalada.
 *
 * Devuelve `factor`/`factor_pct` a `null` cuando los datos no permiten un
 * cálculo válido (capacidad ≤ 0, valores nulos o no finitos). Nunca lanza.
 * Para robustez clamp al rango [0, 1]: la generación instantánea puede exceder
 * puntualmente la capacidad nominal del catálogo (redondeos, repotenciaciones),
 * pero un factor de carga > 100 % no tiene sentido físico como media.
 */
export function computeLoadFactor(
  genMediaMw: number | null | undefined,
  capacidadMw: number | null | undefined,
): LoadFactorResult {
  const gen = typeof genMediaMw === 'number' && Number.isFinite(genMediaMw) ? genMediaMw : NaN
  const cap = typeof capacidadMw === 'number' && Number.isFinite(capacidadMw) ? capacidadMw : NaN

  if (!Number.isFinite(gen) || !Number.isFinite(cap) || cap <= 0 || gen < 0) {
    return {
      gen_media_mw: Number.isFinite(gen) ? gen : 0,
      capacidad_mw: Number.isFinite(cap) ? cap : 0,
      factor: null,
      factor_pct: null,
    }
  }

  const raw = gen / cap
  const clamped = Math.min(1, Math.max(0, raw))
  return {
    gen_media_mw: gen,
    capacidad_mw: cap,
    factor: clamped,
    factor_pct: Math.round(clamped * 1000) / 10, // 1 decimal
  }
}
