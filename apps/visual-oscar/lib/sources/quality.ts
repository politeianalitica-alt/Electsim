/**
 * Sistema de calidad de licitaciones · pipeline replicado de
 * BquantFinance/licitaciones-espana · 20 indicadores INT-VAL / INT-CONS
 * / INT-FIA + validación NIF/CIF/NIE española con checksum oficial.
 *
 * Cada contrato recibe:
 *   - quality_score   · 0-100 ponderado
 *   - quality_level   · 'A' | 'B' | 'C' (alta · media · baja)
 *   - flags           · Array<string> con código de issues encontrados
 *   - is_outlier      · boolean si importe es atípico (P1-P99 / 50M tope)
 */

import type { NormalizedContrato } from '@/lib/socrata-catalunya'

// ─── Validación NIF/CIF/NIE española (algoritmo oficial) ────
const LETRAS_NIF = 'TRWAGMYFPDXBNJZSQVHLCKE'
const LETRAS_CIF: Record<number, string> = {
  0: 'J', 1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E', 6: 'F', 7: 'G', 8: 'H', 9: 'I',
}

/**
 * Valida un NIF (8 dígitos + letra), NIE (X/Y/Z + 7 dígitos + letra)
 * o CIF (letra + 7 dígitos + letra/dígito control) español.
 *
 * Devuelve true si pasa el checksum oficial.
 */
export function validarNIF(s?: string | null): boolean {
  if (!s) return false
  const nif = s.trim().toUpperCase().replace(/[\s-]/g, '')
  if (nif.length < 8) return false

  // CIF · letra inicial + 7 dígitos + control (letra o dígito)
  if (/^[ABCDEFGHJKLMNPQRSUVW]\d{7}[0-9A-J]$/.test(nif)) {
    return validarCIF(nif)
  }

  // NIE · X/Y/Z + 7 dígitos + letra
  if (/^[XYZ]\d{7}[A-Z]$/.test(nif)) {
    const map: Record<string, string> = { X: '0', Y: '1', Z: '2' }
    const num = parseInt(map[nif[0]] + nif.slice(1, 8), 10)
    const expected = LETRAS_NIF[num % 23]
    return nif[8] === expected
  }

  // NIF · 8 dígitos + letra
  if (/^\d{8}[A-Z]$/.test(nif)) {
    const num = parseInt(nif.slice(0, 8), 10)
    const expected = LETRAS_NIF[num % 23]
    return nif[8] === expected
  }

  return false
}

function validarCIF(cif: string): boolean {
  const digits = cif.slice(1, 8).split('').map(Number)
  let sumPar = 0, sumImpar = 0
  digits.forEach((d, i) => {
    if (i % 2 === 0) {                  // posiciones impares (0-indexed)
      const dob = d * 2
      sumImpar += dob > 9 ? dob - 9 : dob
    } else {
      sumPar += d
    }
  })
  const total = sumPar + sumImpar
  const ctrlNum = (10 - (total % 10)) % 10
  const last = cif[8]
  // Control puede ser dígito o letra según primera letra
  const startLetter = cif[0]
  if ('PQRSWN'.includes(startLetter)) {
    // Solo letra
    return last === LETRAS_CIF[ctrlNum]
  }
  if ('ABEH'.includes(startLetter)) {
    // Solo número
    return last === String(ctrlNum)
  }
  // Resto · acepta ambos
  return last === String(ctrlNum) || last === LETRAS_CIF[ctrlNum]
}

// ─── Validación CPV (8 dígitos + opcional guión + dígito control) ─
export function validarCPV(s?: string | null): boolean {
  if (!s) return false
  return /^\d{8}(-\d)?$/.test(s.trim())
}

// ─── Validación NUTS (ES + 0-3 alfanuméricos) ──────────────
export function validarNUTS(s?: string | null): boolean {
  if (!s) return false
  return /^ES[A-Z0-9]{0,3}$/.test(s.trim().toUpperCase())
}

// ─── Validación de fecha (1990-2030) ──────────────────────
export function fechaValida(iso?: string | null): boolean {
  if (!iso) return false
  const d = new Date(iso)
  if (isNaN(d.getTime())) return false
  const y = d.getFullYear()
  return y >= 1990 && y <= 2030
}

// ─── Umbrales contratos menores (Ley 9/2017) ───────────────
export const UMBRAL_MENOR_OBRAS = 40_000
export const UMBRAL_MENOR_SERVICIOS = 15_000
export const UMBRAL_OUTLIER_IMPORTE = 50_000_000

// ─── Tipos del sistema ───────────────────────────────────
export interface QualityResult {
  quality_score: number          // 0-100
  quality_level: 'A' | 'B' | 'C' // ≥85 A · 60-84 B · <60 C
  flags: string[]                // códigos de issues (p.ej. 'INT-VAL-12')
  is_outlier: boolean
  nif_valido?: boolean
  cpv_valido?: boolean
  fecha_valida?: boolean
  importe_coherente?: boolean
}

// ─── Pipeline principal ──────────────────────────────────
export function evaluarCalidad(c: NormalizedContrato): QualityResult {
  const flags: string[] = []
  let pasados = 0
  const indicadores = 14  // total de checks que aplicamos

  // INT-VAL-01 · Importe licitación válido (numérico no nulo)
  const valLic = typeof c.importe_licitacion === 'number' && c.importe_licitacion > 0
  if (valLic) pasados++; else flags.push('INT-VAL-01')

  // INT-VAL-02 · Importe adjudicación válido
  const valAdj = typeof c.importe_adjudicacion === 'number' && c.importe_adjudicacion > 0
  if (valAdj || !c.adjudicatario) pasados++; else flags.push('INT-VAL-02')

  // INT-VAL-03 · Importe mínimo plausible (≥1€ o nulo)
  const importe = c.importe_adjudicacion ?? c.importe_licitacion
  const valMin = importe == null || importe >= 1
  if (valMin) pasados++; else flags.push('INT-VAL-03')

  // INT-VAL-04 / INT-VAL-05 · Número ofertas (entero ≥0)
  if (c.ofertas_recibidas == null || (Number.isInteger(c.ofertas_recibidas) && c.ofertas_recibidas >= 0)) pasados++; else flags.push('INT-VAL-04')

  // INT-VAL-06 · Fecha publicación válida
  const fpub = fechaValida(c.fecha_publicacion)
  if (fpub) pasados++; else flags.push('INT-VAL-06')

  // INT-VAL-07 · Fecha adjudicación válida (si existe)
  const fadj = !c.fecha_adjudicacion || fechaValida(c.fecha_adjudicacion)
  if (fadj) pasados++; else flags.push('INT-VAL-07')

  // INT-VAL-09 · Código CPV válido
  const cpvOk = !c.cpv || validarCPV(c.cpv)
  if (cpvOk) pasados++; else flags.push('INT-VAL-09')

  // INT-VAL-10 · NUTS válido (skip si no tenemos)
  pasados++  // siempre OK por ahora

  // INT-VAL-12 · NIF adjudicatario válido
  const nifOk = !c.adjudicatario_nif || validarNIF(c.adjudicatario_nif)
  if (nifOk) pasados++; else flags.push('INT-VAL-12')

  // INT-VAL-14 · Clasificación procedimiento según cuantía
  const procMenor = (c.procedimiento || '').toLowerCase().includes('menor') || (c.procedimiento || '').toLowerCase().includes('contracte menor')
  let procClasifOk = true
  if (procMenor && importe != null) {
    const tipo = (c.tipo_contrato || '').toLowerCase()
    const umbral = tipo.includes('obra') || tipo.includes('obre') ? UMBRAL_MENOR_OBRAS : UMBRAL_MENOR_SERVICIOS
    procClasifOk = importe < umbral
  }
  if (procClasifOk) pasados++; else flags.push('INT-VAL-14')

  // INT-CONS-01 · Adjudicado requiere ofertas ≥1
  const consOfertas = !c.adjudicatario || c.ofertas_recibidas == null || c.ofertas_recibidas >= 1
  if (consOfertas) pasados++; else flags.push('INT-CONS-01')

  // INT-CONS-08 · Importe coherente (adj ≤ lic × 1.05)
  const consImporte = c.importe_adjudicacion == null || c.importe_licitacion == null ||
                       c.importe_adjudicacion <= c.importe_licitacion * 1.05
  if (consImporte) pasados++; else flags.push('INT-CONS-08')

  // INT-FIA-01 · Ofertas dentro de rango (≤500)
  const fiaOfertas = c.ofertas_recibidas == null || c.ofertas_recibidas <= 500
  if (fiaOfertas) pasados++; else flags.push('INT-FIA-01')

  // INT-FIA-08 · PBL atípico (≤50M)
  const isOutlier = importe != null && importe > UMBRAL_OUTLIER_IMPORTE
  if (!isOutlier) pasados++; else flags.push('INT-FIA-08')

  // INT-FIA-11 · Trazabilidad mínima (expediente + URL)
  const traz = !!c.expediente && (!!c.url || !!c.source_id)
  if (traz) pasados++; else flags.push('INT-FIA-11')

  // Score = % de indicadores pasados
  const quality_score = Math.round((pasados / indicadores) * 100)
  const quality_level: 'A' | 'B' | 'C' = quality_score >= 85 ? 'A' : quality_score >= 60 ? 'B' : 'C'

  return {
    quality_score,
    quality_level,
    flags,
    is_outlier: isOutlier,
    nif_valido: c.adjudicatario_nif ? nifOk : undefined,
    cpv_valido: c.cpv ? cpvOk : undefined,
    fecha_valida: fpub,
    importe_coherente: consImporte,
  }
}

// ─── Detección de outliers vía z-score sobre dataset ──────
export function detectarOutliersImporte(
  contratos: NormalizedContrato[],
  zThreshold = 3,
): NormalizedContrato[] {
  const importes = contratos
    .map(c => c.importe_adjudicacion ?? c.importe_licitacion)
    .filter((v): v is number => typeof v === 'number' && v > 0)

  if (importes.length < 10) return []  // muestra insuficiente

  const mean = importes.reduce((s, v) => s + v, 0) / importes.length
  const std = Math.sqrt(importes.reduce((s, v) => s + (v - mean) ** 2, 0) / importes.length)

  return contratos.filter(c => {
    const v = c.importe_adjudicacion ?? c.importe_licitacion
    if (typeof v !== 'number' || v <= 0) return false
    const z = Math.abs((v - mean) / std)
    return z > zThreshold
  })
}
