/**
 * Heurística pura de riesgo de seguridad de suministro energético · S10.
 *
 * Sintetiza señales reales (precio spot eléctrico, Brent, almacenamiento de gas,
 * dependencia exterior, cuota renovable) en vectores de riesgo clasificados +
 * un nivel global. Es el FALLBACK determinista del endpoint
 * /api/energia/supply-risk-brief cuando Gemini no está disponible, y también la
 * base factual que se le pasa a Gemini para que redacte el resumen (así el LLM
 * nunca inventa los números — solo narra los vectores ya calculados).
 *
 * Función pura, sin I/O, testeable. Umbrales documentados por vector.
 */

export type RiskBand = 'bajo' | 'medio' | 'alto' | 'critico' | 'pendiente'

export interface SupplyRiskInput {
  /** Precio spot OMIE €/MWh (ESIOS 600). */
  spotPriceEurMwh?: number | null
  /** Brent $/bbl (commodities). */
  brentUsd?: number | null
  /** % lleno almacenamiento de gas UE (AGSI). */
  gasStoragePctEu?: number | null
  /** % lleno almacenamiento de gas ES (AGSI). */
  gasStoragePctEs?: number | null
  /** Dependencia energética exterior % (estructural Eurostat, ~70-73). */
  dependenciaPct?: number | null
  /** Cuota renovable en generación eléctrica % (ESIOS mix). */
  renovablePct?: number | null
}

export interface RiskVector {
  nombre: string
  banda: RiskBand
  /** 0..100, null si pendiente/sin dato. */
  score: number | null
  nota: string
}

export interface SupplyRiskResult {
  /** 0..100 agregado de los vectores con dato (más alto = más riesgo). */
  score: number | null
  nivel_global: RiskBand
  vectores: RiskVector[]
}

function bandFromScore(score: number): RiskBand {
  if (score >= 80) return 'critico'
  if (score >= 65) return 'alto'
  if (score >= 45) return 'medio'
  return 'bajo'
}

/** Exposición a precios eléctricos: bandas €/MWh ref. MIBEL 2021-2022. */
function vectorPreciosElectricos(spot: number | null | undefined): RiskVector {
  if (spot == null || !Number.isFinite(spot)) {
    return { nombre: 'Exposición a precios eléctricos', banda: 'pendiente', score: null, nota: 'Spot OMIE no disponible (sin ESIOS_API_KEY)' }
  }
  let score: number
  let nota: string
  if (spot < 60) { score = 22; nota = `Spot OMIE ${spot.toFixed(0)} €/MWh · holgado` }
  else if (spot < 100) { score = 48; nota = `Spot OMIE ${spot.toFixed(0)} €/MWh · normal` }
  else if (spot < 180) { score = 74; nota = `Spot OMIE ${spot.toFixed(0)} €/MWh · tensión` }
  else { score = 92; nota = `Spot OMIE ${spot.toFixed(0)} €/MWh · crisis de precios` }
  return { nombre: 'Exposición a precios eléctricos', banda: bandFromScore(score), score, nota }
}

/** Exposición al crudo: bandas $/bbl Brent. */
function vectorPrecioCrudo(brent: number | null | undefined): RiskVector {
  if (brent == null || !Number.isFinite(brent)) {
    return { nombre: 'Exposición al precio del crudo', banda: 'pendiente', score: null, nota: 'Brent no disponible' }
  }
  let score: number
  if (brent < 70) score = 28
  else if (brent < 90) score = 48
  else if (brent < 110) score = 70
  else score = 88
  return { nombre: 'Exposición al precio del crudo', banda: bandFromScore(score), score, nota: `Brent ${brent.toFixed(0)} $/bbl` }
}

/** Almacenamiento de gas: más lleno = menos riesgo (score invertido). */
function vectorAlmacenamientoGas(pctEu: number | null | undefined, pctEs: number | null | undefined): RiskVector {
  const pct = pctEu ?? pctEs
  if (pct == null || !Number.isFinite(pct)) {
    return { nombre: 'Almacenamiento de gas', banda: 'pendiente', score: null, nota: 'Sin dato AGSI (configurar GIE_API_KEY)' }
  }
  // % lleno alto = riesgo bajo. Invertir: score = 100 - pct (acotado).
  const score = Math.max(0, Math.min(100, Math.round(100 - pct)))
  const ambito = pctEu != null ? 'UE' : 'ES'
  return { nombre: 'Almacenamiento de gas', banda: bandFromScore(score), score, nota: `Almacenamiento ${ambito} ${pct.toFixed(0)}% lleno` }
}

/** Dependencia energética exterior: estructural, alto en España. */
function vectorDependencia(dep: number | null | undefined): RiskVector {
  if (dep == null || !Number.isFinite(dep)) {
    return { nombre: 'Dependencia energética exterior', banda: 'pendiente', score: null, nota: 'Sin dato' }
  }
  // 0% autosuficiente, 100% importa todo. Mapeo directo a riesgo.
  const score = Math.max(0, Math.min(100, Math.round(dep)))
  return { nombre: 'Dependencia energética exterior', banda: bandFromScore(score), score, nota: `España importa ~${dep.toFixed(0)}% de su energía primaria` }
}

/** Cuota renovable: más renovable = menos riesgo de suministro (score invertido). */
function vectorRenovable(pct: number | null | undefined): RiskVector {
  if (pct == null || !Number.isFinite(pct)) {
    return { nombre: 'Penetración renovable (resiliencia)', banda: 'pendiente', score: null, nota: 'Sin dato de mix' }
  }
  const score = Math.max(0, Math.min(100, Math.round(100 - pct)))
  return { nombre: 'Penetración renovable (resiliencia)', banda: bandFromScore(score), score, nota: `Renovable ${pct.toFixed(0)}% del mix eléctrico actual` }
}

export function computeSupplyRisk(input: SupplyRiskInput): SupplyRiskResult {
  const vectores: RiskVector[] = [
    vectorDependencia(input.dependenciaPct ?? 73),
    vectorPreciosElectricos(input.spotPriceEurMwh),
    vectorPrecioCrudo(input.brentUsd),
    vectorAlmacenamientoGas(input.gasStoragePctEu, input.gasStoragePctEs),
    vectorRenovable(input.renovablePct),
  ]
  const reales = vectores.filter((v): v is RiskVector & { score: number } => v.score != null)
  const score = reales.length
    ? Math.round(reales.reduce((s, v) => s + v.score, 0) / reales.length)
    : null
  const nivel_global: RiskBand = score == null ? 'pendiente' : bandFromScore(score)
  return { score, nivel_global, vectores }
}

/** Resumen heurístico (fallback sin LLM). Texto factual a partir de los vectores. */
export function heuristicSummary(result: SupplyRiskResult): string {
  if (result.score == null) {
    return 'Sin datos en vivo suficientes para evaluar el riesgo de suministro. Configura las claves de API (ESIOS, commodities, GIE AGSI) para activar la evaluación.'
  }
  const altos = result.vectores.filter((v) => v.banda === 'alto' || v.banda === 'critico')
  const nivelTxt: Record<RiskBand, string> = {
    bajo: 'bajo', medio: 'moderado', alto: 'elevado', critico: 'crítico', pendiente: 'indeterminado',
  }
  const cabecera = `Riesgo de suministro ${nivelTxt[result.nivel_global]} (${result.score}/100).`
  if (altos.length === 0) {
    return `${cabecera} Ningún vector en zona de alerta; las variables de mercado y dependencia se mantienen dentro de rangos manejables.`
  }
  const detalle = altos.map((v) => `${v.nombre.toLowerCase()} (${v.nota})`).join('; ')
  return `${cabecera} Vectores en alerta: ${detalle}. Vigilar evolución de precios y suministro.`
}
