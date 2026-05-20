/**
 * Cálculo de escenarios de gobierno a partir de los escaños actuales
 * del nowcast (datos en vivo de /api/analytics/nowcast).
 *
 * Reemplaza el array hardcoded ESCENARIOS de /escenarios/page.tsx.
 *
 * Cada escenario:
 *  - Suma los escaños de los partidos que lo componen
 *  - Marca viable si llega a 176 (mayoría absoluta)
 *  - Calcula una probabilidad estimada usando:
 *    · estabilidad histórica de la coalición (base_estabilidad)
 *    · gap a 176 (cuanto más cerca → más probable)
 *    · ajuste por viabilidad
 *
 * Las probabilidades de los 6 escenarios se normalizan a 100% al final.
 */

export interface ScenarioParty {
  s: string; // siglas (ej "PP")
  c: string; // color hex
}

export interface ScenarioComputed {
  id: string;
  nombre: string;
  partidos: ScenarioParty[];
  seats: number;
  prob: number;
  viable: boolean;
  /** Lista de siglas que componen el escenario (para tools). */
  composition: string[];
  /** Diferencia a 176 (positiva = mayoría, negativa = faltan). */
  gap: number;
  /** Categoría del escenario (para análisis IA). */
  tipo: "derecha" | "izquierda" | "izquierda+independentistas" | "gran-coalicion" | "minoria" | "bloqueo";
}

export interface NowcastParty {
  siglas: string;
  nombre: string;
  pct: number;
  seats: number;
  color: string;
  bloque?: "izquierda" | "derecha" | "otros";
  delta?: number;
}

// Colores de fallback (se usan si el nowcast no incluye el partido)
const FALLBACK_COLOR: Record<string, string> = {
  PP: "#1F4E8C", PSOE: "#E1322D", VOX: "#5BA02E", Sumar: "#D43F8D",
  ERC: "#E8A030", Junts: "#1FA89B", PNV: "#7DB94B", "EH Bildu": "#3F7A3A",
  CC: "#F2C43A", BNG: "#5BB3D9", UPN: "#0E7D8C",
};

const MAJORITY = 176;

/**
 * Devuelve los escaños y color de un partido dado el array nowcast.
 * Comparación case-insensitive + normalización ("EH Bildu" matchea "ehbildu").
 */
function getParty(
  parties: NowcastParty[],
  siglas: string
): { seats: number; color: string } {
  const norm = (s: string) => s.toLowerCase().replace(/\s/g, "").replace("ehbildu", "bildu");
  const target = norm(siglas);
  const found = parties.find((p) => norm(p.siglas) === target);
  return {
    seats: found?.seats ?? 0,
    color: found?.color ?? FALLBACK_COLOR[siglas] ?? "#9E9E9E",
  };
}

/**
 * Suma escaños de una lista de partidos.
 * Devuelve también la composición efectiva (partidos con >0 escaños).
 */
function sumSeats(
  parties: NowcastParty[],
  siglasList: string[]
): { seats: number; partidos: ScenarioParty[] } {
  let total = 0;
  const partidos: ScenarioParty[] = [];
  for (const s of siglasList) {
    const { seats, color } = getParty(parties, s);
    total += seats;
    if (seats > 0) {
      partidos.push({ s, c: color });
    }
  }
  return { seats: total, partidos };
}

/**
 * Pesos base de "estabilidad/viabilidad histórica" de cada coalición.
 * Reflejan cuán probable es que se forme realmente, dado que llega a
 * 176 escaños. P.ej. la gran coalición PP+PSOE casi nunca pasa aunque
 * matemáticamente sume.
 */
const BASE_WEIGHTS: Record<string, number> = {
  "pp-vox-cc": 0.45,                  // Histórico reciente, viable políticamente
  "pp-minoria": 0.20,                 // PP solo con abstención PSOE = poco probable
  "psoe-sumar": 0.30,                 // Sin Junts/PNV no llega
  "psoe-junts": 0.35,                 // Coalición Sánchez 2023
  "gran-coalicion": 0.05,             // Casi nunca pasa en España
  "bloqueo": 0.25,                    // Probabilidad si ningún bloque llega
};

/**
 * Calcula los 6 escenarios estándar de gobierno a partir del nowcast.
 * Si nowcast es null/vacío, devuelve array vacío.
 */
export function computeScenarios(parties: NowcastParty[] | null | undefined): ScenarioComputed[] {
  if (!parties || parties.length === 0) return [];

  // Definición de los 6 escenarios canónicos
  const RAW_SCENARIOS = [
    {
      id: "pp-vox-cc",
      nombre: "PP + VOX + CC",
      composition: ["PP", "VOX", "CC"],
      tipo: "derecha" as const,
    },
    {
      id: "psoe-junts",
      nombre: "PSOE + Sumar + ERC + Bildu + Junts + PNV",
      composition: ["PSOE", "Sumar", "ERC", "EH Bildu", "Junts", "PNV", "BNG"],
      tipo: "izquierda+independentistas" as const,
    },
    {
      id: "psoe-sumar",
      nombre: "PSOE + Sumar + bloque (sin Junts)",
      composition: ["PSOE", "Sumar", "ERC", "EH Bildu", "PNV", "BNG"],
      tipo: "izquierda" as const,
    },
    {
      id: "pp-minoria",
      nombre: "PP gobierno en minoría",
      composition: ["PP"],
      tipo: "minoria" as const,
    },
    {
      id: "gran-coalicion",
      nombre: "Gran coalición PP + PSOE",
      composition: ["PP", "PSOE"],
      tipo: "gran-coalicion" as const,
    },
    {
      id: "bloqueo",
      nombre: "Bloqueo / repetición electoral",
      composition: [],
      tipo: "bloqueo" as const,
    },
  ];

  // Calcular seats y probabilidad bruta
  const computed: ScenarioComputed[] = RAW_SCENARIOS.map((s) => {
    const { seats, partidos } = sumSeats(parties, s.composition);
    const viable = seats >= MAJORITY;
    const gap = seats - MAJORITY;
    return {
      id: s.id,
      nombre: s.nombre,
      partidos,
      composition: s.composition,
      seats,
      gap,
      viable,
      tipo: s.tipo,
      prob: 0, // se calcula a continuación
    };
  });

  // Probabilidad bruta: base_weight * factor de viabilidad
  // factor: 1.0 si llega a 176, decae rápido si está lejos
  const rawProbs = computed.map((s) => {
    const base = BASE_WEIGHTS[s.id] ?? 0.10;
    const viabilityFactor = s.viable
      ? 1.0
      : Math.max(0.05, 1 - Math.abs(s.gap) / 30); // decae con distancia
    return base * viabilityFactor;
  });

  // Caso especial: si NINGÚN escenario llega a 176, el bloqueo tiene mucha
  // más probabilidad (se sube su peso base).
  const anyViable = computed.some((s) => s.viable);
  if (!anyViable) {
    const bloqueoIdx = computed.findIndex((s) => s.id === "bloqueo");
    if (bloqueoIdx >= 0) rawProbs[bloqueoIdx] *= 2.5;
  }

  // Normalizar a 100%
  const total = rawProbs.reduce((a, b) => a + b, 0);
  if (total > 0) {
    rawProbs.forEach((p, i) => {
      computed[i].prob = Math.round((p / total) * 100);
    });
    // Ajuste de redondeo: si la suma no es 100, ajustamos el mayor
    const sumProbs = computed.reduce((a, b) => a + b.prob, 0);
    if (sumProbs !== 100 && computed.length > 0) {
      const diff = 100 - sumProbs;
      const maxIdx = computed.reduce(
        (max, s, i) => (s.prob > computed[max].prob ? i : max),
        0
      );
      computed[maxIdx].prob += diff;
    }
  }

  // Ordenar por probabilidad descendente
  return computed.sort((a, b) => b.prob - a.prob);
}

/**
 * Calcula probabilidad agregada de "mayoría de derecha" (suma probs de
 * escenarios viables del tipo "derecha" + "minoria" sumándose con CC).
 * Útil para el hero "P(Mayoría derecha) = X%".
 */
export function probMayoriaDerecha(scenarios: ScenarioComputed[]): number {
  return scenarios
    .filter((s) => s.tipo === "derecha" && s.viable)
    .reduce((acc, s) => acc + s.prob, 0);
}

export function probMayoriaIzquierda(scenarios: ScenarioComputed[]): number {
  return scenarios
    .filter(
      (s) =>
        (s.tipo === "izquierda" || s.tipo === "izquierda+independentistas") &&
        s.viable
    )
    .reduce((acc, s) => acc + s.prob, 0);
}
