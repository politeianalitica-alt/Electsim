/**
 * Distribución Monte Carlo derivada del nowcast actual.
 *
 * El array MC_SIMS hardcoded de /escenarios/page.tsx ahora se computa
 * dinámicamente a partir de los escaños actuales, modelando la
 * incertidumbre con una varianza típica por partido (más grande para
 * partidos grandes, más estrecha para los pequeños).
 *
 * Las bandas IC 80% y IC 95% se calculan asumiendo distribución normal
 * truncada en [0, 350] (escaños totales del Congreso).
 *
 * σ por escaños (heurística calibrada con históricos):
 *   · seats >= 100 → σ = 8
 *   · seats >= 40  → σ = 6
 *   · seats >= 15  → σ = 4
 *   · seats < 15   → σ = 2
 */

import type { NowcastParty } from "./compute";

export interface McRow {
  siglas: string;
  mean: number;
  ic80l: number;
  ic80h: number;
  ic95l: number;
  ic95h: number;
  color: string;
}

const SIGMA_TABLE: Array<{ minSeats: number; sigma: number }> = [
  { minSeats: 100, sigma: 8 },
  { minSeats: 40, sigma: 6 },
  { minSeats: 15, sigma: 4 },
  { minSeats: 0, sigma: 2 },
];

function sigmaFor(seats: number): number {
  for (const t of SIGMA_TABLE) {
    if (seats >= t.minSeats) return t.sigma;
  }
  return 2;
}

const MIN_SEATS = 0;
const MAX_SEATS = 350;

/**
 * Z-score para 80% y 95% en distribución normal:
 *   IC 80% → z = 1.282 (cuantil 0.9)
 *   IC 95% → z = 1.960 (cuantil 0.975)
 */
const Z80 = 1.282;
const Z95 = 1.960;

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

/**
 * Calcula la distribución MC a partir de los partidos del nowcast.
 * Devuelve hasta los `topN` partidos con más escaños.
 */
export function computeMonteCarlo(
  parties: NowcastParty[] | null | undefined,
  topN: number = 8
): McRow[] {
  if (!parties || parties.length === 0) return [];

  // Ordenar por escaños desc y tomar topN
  const top = parties
    .slice()
    .sort((a, b) => b.seats - a.seats)
    .slice(0, topN)
    .filter((p) => p.seats > 0);

  return top.map((p) => {
    const mean = p.seats;
    const sigma = sigmaFor(mean);
    const ic80l = clamp(Math.round(mean - Z80 * sigma), MIN_SEATS, MAX_SEATS);
    const ic80h = clamp(Math.round(mean + Z80 * sigma), MIN_SEATS, MAX_SEATS);
    const ic95l = clamp(Math.round(mean - Z95 * sigma), MIN_SEATS, MAX_SEATS);
    const ic95h = clamp(Math.round(mean + Z95 * sigma), MIN_SEATS, MAX_SEATS);
    return {
      siglas: p.siglas,
      mean,
      ic80l,
      ic80h,
      ic95l,
      ic95h,
      color: p.color,
    };
  });
}
