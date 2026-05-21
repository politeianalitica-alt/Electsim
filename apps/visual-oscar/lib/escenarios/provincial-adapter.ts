/**
 * Adapter del endpoint /api/electoral/provincial al shape `Party` que
 * espera la página /nowcasting (Módulo Electoral).
 *
 * Garantiza que /nowcasting y /escenarios consumen EXACTAMENTE los
 * mismos seats y pct, derivando las bandas IC con la misma heurística σ
 * del Monte Carlo. Antes /nowcasting usaba /api/analytics/nowcast que
 * daba números distintos.
 */

// ─── Tipos ──────────────────────────────────────────────────────────────

export interface ProvincialApiResponse {
  totales_por_partido?: Record<string, number>;
  estimacion_pct?: Record<string, number>;
  n_provincias?: number;
  total_escanos?: number;
  n_sondeos?: number;
  last_update?: string;
  metodologia?: string;
  fuente?: string;
}

export interface NowcastingParty {
  siglas: string;
  nombre: string;
  pct: number;
  ci_inf: number;
  ci_sup: number;
  seats: number;
  seats_low: number;
  seats_high: number;
  color: string;
  bloque: "derecha" | "izquierda" | "otros";
  delta: number;
  n_enc: number;
}

// ─── Catálogos compartidos ──────────────────────────────────────────────

const SIGLAS_DISPLAY: Record<string, string> = {
  PP: "PP", PSOE: "PSOE", VOX: "VOX", SUMAR: "Sumar",
  ERC: "ERC", JUNTS: "Junts", PNV: "PNV",
  BILDU: "EH Bildu", "EH BILDU": "EH Bildu",
  CC: "CC", BNG: "BNG", UPN: "UPN", OTROS: "Otros",
};

const NOMBRES: Record<string, string> = {
  PP: "Partido Popular",
  PSOE: "PSOE",
  VOX: "VOX",
  Sumar: "Sumar",
  Junts: "Junts per Catalunya",
  ERC: "Esquerra Republicana",
 "EH Bildu": "EH Bildu",
  PNV: "Partido Nacionalista Vasco",
  CC: "Coalición Canaria",
  BNG: "Bloque Nacionalista Galego",
  UPN: "UPN",
  Otros: "Otros",
};

const BLOQUE: Record<string, "derecha" | "izquierda" | "otros"> = {
  PP: "derecha", VOX: "derecha", CC: "derecha", UPN: "derecha",
  PSOE: "izquierda", Sumar: "izquierda", ERC: "izquierda",
 "EH Bildu": "izquierda", BNG: "izquierda",
  Junts: "otros", PNV: "otros", Otros: "otros",
};

const COLORS: Record<string, string> = {
  PP: "#009FDB", PSOE: "#E30613", VOX: "#63BE21", Sumar: "#E4007C",
  Junts: "#00AEEF", ERC: "#F4B20A", "EH Bildu": "#A9C55A",
  PNV: "#007A3D", CC: "#FFC107", BNG: "#73C6EE", UPN: "#0E7D8C",
  Otros: "#9E9E9E",
};

// ─── Helpers ────────────────────────────────────────────────────────────

function normalizeSiglas(raw: string): string {
  return SIGLAS_DISPLAY[raw.toUpperCase().trim()] || raw;
}

/**
 * σ heurística por escaños (igual que computeMonteCarlo).
 * IC 80% ≈ ±1.282σ · IC 95% ≈ ±1.96σ
 */
function sigmaForSeats(seats: number): number {
  if (seats >= 100) return 8;
  if (seats >= 40) return 6;
  if (seats >= 15) return 4;
  return 2;
}

/** σ heurística para pct (≈ seats/3 hasta una décima razonable). */
function sigmaForPct(pct: number): number {
  if (pct >= 25) return 2.0;
  if (pct >= 10) return 1.4;
  if (pct >= 3) return 0.7;
  return 0.4;
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

// ─── Adapter principal ──────────────────────────────────────────────────

const Z80 = 1.282;
const Z95 = 1.96;

/**
 * Convierte la respuesta del endpoint provincial al shape Party[] del
 * Módulo Electoral. Las bandas IC se derivan de la misma σ heurística
 * que usa computeMonteCarlo() para garantizar coherencia visual entre
 * /nowcasting y /escenarios.
 */
export function provincialToParties(
  provincial: ProvincialApiResponse | null | undefined
): NowcastingParty[] {
  if (!provincial?.totales_por_partido) return [];
  const totales = provincial.totales_por_partido;
  const pctMap = provincial.estimacion_pct || {};

  return Object.entries(totales)
    .filter(([, seats]) => seats > 0)
    .map(([rawSiglas, seats]) => {
      const siglas = normalizeSiglas(rawSiglas);
      const pct = Number((pctMap[rawSiglas] || pctMap[siglas] || 0).toFixed(2));
      const seatsSigma = sigmaForSeats(seats);
      const pctSigma = sigmaForPct(pct);
      return {
        siglas,
        nombre: NOMBRES[siglas] || siglas,
        pct,
        ci_inf: Number(clamp(pct - Z95 * pctSigma, 0, 100).toFixed(1)),
        ci_sup: Number(clamp(pct + Z95 * pctSigma, 0, 100).toFixed(1)),
        seats,
        seats_low: clamp(Math.round(seats - Z80 * seatsSigma), 0, 350),
        seats_high: clamp(Math.round(seats + Z80 * seatsSigma), 0, 350),
        color: COLORS[siglas] || COLORS.Otros,
        bloque: BLOQUE[siglas] || "otros",
        delta: 0, // sin histórico semanal en el endpoint provincial
        n_enc: provincial.n_sondeos || 0,
      };
    })
    .sort((a, b) => b.seats - a.seats);
}
