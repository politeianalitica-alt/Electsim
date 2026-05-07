// Risk types — mirrors the shape from apps/web/app/riesgo/page.tsx

export interface RiskKpi {
  label: string;
  value: number;
  color: string;
}

export interface RiskSignal {
  title: string;
  probability: number;
  impact: string;
  description: string;
  area: string;
}

export interface RiskHeatmapEntry {
  Alta: number;
  Media: number;
  Baja: number;
}
