import type { RiskKpi, RiskSignal, RiskHeatmapEntry } from "@/lib/types/risk";

export const DEMO_GLOBAL_RISK = 67;

export const DEMO_KPIS: RiskKpi[] = [
  { label: "Riesgo electoral", value: 72, color: "amber" },
  { label: "Riesgo legislativo", value: 81, color: "red" },
  { label: "Riesgo mediático", value: 58, color: "amber" },
  { label: "Riesgo geopolítico", value: 49, color: "blue" },
];

export const DEMO_DIMENSIONS = ["Electoral", "Comunicación", "Legislativo", "Geopolítico", "Económico"];

export const DEMO_SEVERITIES = ["Alta", "Media", "Baja"];

export const DEMO_HEATMAP: Record<string, RiskHeatmapEntry> = {
  Electoral:    { Alta: 3, Media: 5, Baja: 8 },
  Comunicación: { Alta: 4, Media: 7, Baja: 12 },
  Legislativo:  { Alta: 6, Media: 4, Baja: 5 },
  Geopolítico:  { Alta: 2, Media: 6, Baja: 9 },
  Económico:    { Alta: 1, Media: 3, Baja: 11 },
};

export const DEMO_SIGNALS: RiskSignal[] = [
  { title: "Bloqueo presupuestario por Junts", probability: 78, impact: "Alto", description: "Negociación estancada en partidas autonómicas. Riesgo de no aprobación en plazo.", area: "legislativo" },
  { title: "Erosión voto urbano joven PSOE", probability: 64, impact: "Medio", description: "Tres oleadas consecutivas muestran caída de 4pp en 18-29 años en grandes ciudades.", area: "electoral" },
  { title: "Narrativa lawfare amplificándose", probability: 71, impact: "Alto", description: "Volumen de menciones +35% semanal con sentimiento crecientemente negativo.", area: "media" },
  { title: "Tensión Marruecos-Sahara", probability: 52, impact: "Medio", description: "Movimientos diplomáticos sugieren posible crisis bilateral en próximas 4 semanas.", area: "geopolitico" },
  { title: "Ruptura coalición autonómica PP-VOX", probability: 47, impact: "Medio", description: "Desacuerdos públicos en 2 CCAA podrían replicarse en otras tres comunidades.", area: "electoral" },
];

export const DEMO_SPARK: number[] = [62, 64, 61, 65, 68, 67, 66, 69, 71, 70, 68, 65, 64, 66, 67, 70, 72, 71, 68, 67, 65, 66, 68, 70, 71, 69, 67, 66, 67, 67];
