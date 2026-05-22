/**
 * Schemas y tipos compartidos para el módulo de razonamiento Groq sobre
 * gráficas macroeconómicas.
 *
 * - `MacroChartInsight`: respuesta tipada que devuelve `/api/macro/ai/analyze-chart`.
 * - `MACRO_CHART_INSIGHT_SCHEMA`: JSON Schema (Draft 2020-12 subset) que
 *   pasamos a Groq Structured Outputs con `strict: true`.
 * - `ChartAnalysisInput`: payload que envía el cliente al endpoint.
 *
 * Reglas de contenido (system prompt las refuerza):
 *   - Sólo cita números presentes en `series` o `metadata`.
 *   - No recomienda inversiones.
 *   - No presenta correlaciones como causalidad.
 *   - Diferencia hecho observado · inferencia · riesgo potencial.
 */

export type TrendDirection =
  | "up"
  | "down"
  | "flat"
  | "volatile"
  | "turning_point";

export type ConsequenceArea =
  | "growth"
  | "inflation"
  | "monetary_policy"
  | "fiscal_policy"
  | "labor_market"
  | "external_sector"
  | "financial_stability"
  | "households"
  | "businesses"
  | "political"
  | "other";

export type RiskHorizon = "days" | "weeks" | "months" | "quarters" | "years";
export type Severity = "low" | "medium" | "high" | "critical";
export type Confidence = "low" | "medium" | "high";

export interface SeriesPoint {
  period: string;
  value: number;
  forecast?: boolean;
}

export interface ChartMetadata {
  /** Unidad legible: "%", "€", "índice base 2015=100", etc. */
  unit: string;
  /** Fuente principal humana: "INE WSTempus", "IMF DataMapper". */
  source: string;
  /** Código interno de la fuente (CNTR6654, NGDP_RPCH, ...). */
  sourceCode: string;
  /** Última actualización ISO o etiqueta de período. */
  lastUpdate?: string;
  /** Frecuencia: monthly | quarterly | annual. */
  frequency?: "monthly" | "quarterly" | "annual" | "daily" | "weekly";
  /** Umbrales conocidos del indicador. */
  threshold?: {
    amber?: number;
    red?: number;
    goodAbove?: boolean;
  };
  /** Comparativa con otros países (último valor). */
  benchmarkPeers?: Array<{ country: string; value: number }>;
  /** Notas adicionales contextuales (cambios metodológicos, breaks). */
  notes?: string[];
}

export interface ChartAnalysisInput {
  /** Identificador human-readable: "PIB volumen YoY · INE CNTR6654". */
  indicator: string;
  /** Slug estable, sirve como clave de caché. */
  indicatorId: string;
  /** Pestaña macro de origen ("pulso-macro", "regimen-monetario"...). */
  tabSlug?: string;
  /** Serie temporal completa. */
  series: SeriesPoint[];
  /** Metadata estructurada. */
  metadata: ChartMetadata;
  /** Etiqueta del rango (p. ej. "20 años + forecast 5y"). */
  windowLabel?: string;
  /** Tier de razonamiento. Por defecto 'premium'. */
  tier?: "premium" | "fast";
}

export interface MacroChartInsight {
  headline: string;
  executiveSummary: string;
  trend: {
    direction: TrendDirection;
    label: string;
    explanation: string;
  };
  why: Array<{
    driver: string;
    evidence: string;
    confidence: number;
  }>;
  consequences: Array<{
    area: ConsequenceArea;
    explanation: string;
    severity: Severity;
  }>;
  risks: Array<{
    risk: string;
    trigger: string;
    horizon: RiskHorizon;
    severity: Severity;
  }>;
  watchlist: Array<{
    indicatorId: string;
    label: string;
    reason: string;
  }>;
  contradictions: Array<{
    signal: string;
    explanation: string;
  }>;
  analystQuestions: string[];
  sourceNotes: string[];
  confidenceScore: number;
}

export interface ChartAnalysisResponse {
  ok: true;
  cache_hit: boolean;
  generated_at: string;
  generated_by_llm: true;
  provider: "groq" | "anthropic";
  model: string;
  indicator: string;
  indicatorId: string;
  insight: MacroChartInsight;
  disclaimer: string;
}

export interface ChartAnalysisError {
  ok: false;
  error: string;
  detail?: string;
}

/**
 * JSON Schema para Groq Structured Outputs (strict mode).
 * Draft 2020-12 subset · sin $ref · sin anyOf complejo.
 */
export const MACRO_CHART_INSIGHT_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: [
    "headline",
    "executiveSummary",
    "trend",
    "why",
    "consequences",
    "risks",
    "watchlist",
    "contradictions",
    "analystQuestions",
    "sourceNotes",
    "confidenceScore",
  ],
  properties: {
    headline: {
      type: "string",
      description: "Frase de 1 línea (<140 chars) que resume el chart.",
      maxLength: 200,
    },
    executiveSummary: {
      type: "string",
      description:
        "Resumen ejecutivo 2-4 frases, lenguaje analítico, cita números reales del payload.",
      maxLength: 800,
    },
    trend: {
      type: "object",
      additionalProperties: false,
      required: ["direction", "label", "explanation"],
      properties: {
        direction: {
          type: "string",
          enum: ["up", "down", "flat", "volatile", "turning_point"],
        },
        label: { type: "string", maxLength: 80 },
        explanation: { type: "string", maxLength: 400 },
      },
    },
    why: {
      type: "array",
      minItems: 1,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["driver", "evidence", "confidence"],
        properties: {
          driver: { type: "string", maxLength: 120 },
          evidence: { type: "string", maxLength: 300 },
          confidence: { type: "number", minimum: 0, maximum: 1 },
        },
      },
    },
    consequences: {
      type: "array",
      minItems: 1,
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["area", "explanation", "severity"],
        properties: {
          area: {
            type: "string",
            enum: [
              "growth",
              "inflation",
              "monetary_policy",
              "fiscal_policy",
              "labor_market",
              "external_sector",
              "financial_stability",
              "households",
              "businesses",
              "political",
              "other",
            ],
          },
          explanation: { type: "string", maxLength: 300 },
          severity: {
            type: "string",
            enum: ["low", "medium", "high"],
          },
        },
      },
    },
    risks: {
      type: "array",
      minItems: 0,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["risk", "trigger", "horizon", "severity"],
        properties: {
          risk: { type: "string", maxLength: 200 },
          trigger: { type: "string", maxLength: 200 },
          horizon: {
            type: "string",
            enum: ["days", "weeks", "months", "quarters", "years"],
          },
          severity: {
            type: "string",
            enum: ["low", "medium", "high", "critical"],
          },
        },
      },
    },
    watchlist: {
      type: "array",
      minItems: 0,
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["indicatorId", "label", "reason"],
        properties: {
          indicatorId: { type: "string", maxLength: 80 },
          label: { type: "string", maxLength: 120 },
          reason: { type: "string", maxLength: 240 },
        },
      },
    },
    contradictions: {
      type: "array",
      minItems: 0,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["signal", "explanation"],
        properties: {
          signal: { type: "string", maxLength: 160 },
          explanation: { type: "string", maxLength: 300 },
        },
      },
    },
    analystQuestions: {
      type: "array",
      minItems: 1,
      maxItems: 5,
      items: { type: "string", maxLength: 200 },
    },
    sourceNotes: {
      type: "array",
      minItems: 0,
      maxItems: 6,
      items: { type: "string", maxLength: 220 },
    },
    confidenceScore: {
      type: "number",
      minimum: 0,
      maximum: 1,
      description:
        "Confianza global del análisis (0-1) basada en n puntos, antigüedad y volatilidad.",
    },
  },
};

export const MACRO_AI_DISCLAIMER =
  "Análisis generado por modelo de lenguaje (Groq GPT-OSS / Claude). Revisar antes de citar. Las inferencias no son recomendaciones de inversión ni implican causalidad.";

/**
 * Hash determinista para usar como clave de caché.
 * Considera: id, último período, último valor, lastUpdate.
 */
export function computeChartCacheKey(input: ChartAnalysisInput): string {
  const last = input.series[input.series.length - 1];
  const head = input.series[0];
  const len = input.series.length;
  const peers =
    input.metadata.benchmarkPeers
      ?.map((p) => `${p.country}:${p.value.toFixed(2)}`)
      .join("|") ?? "";
  const raw = [
    input.indicatorId,
    input.tier ?? "premium",
    head?.period ?? "",
    last?.period ?? "",
    last?.value?.toFixed?.(4) ?? "",
    len,
    input.metadata.lastUpdate ?? "",
    input.metadata.sourceCode,
    peers,
  ].join("::");
  // Hash FNV-1a 32-bit
  let h = 0x811c9dc5;
  for (let i = 0; i < raw.length; i++) {
    h ^= raw.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return `macro:chart:${input.indicatorId}:${h.toString(16)}`;
}
