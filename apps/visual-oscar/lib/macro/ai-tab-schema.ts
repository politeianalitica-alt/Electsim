/**
 * Schema y tipos para `/api/macro/ai/analyze-tab` y `/analyze-detail`.
 *
 * - `analyze-tab` produce un "Hero ejecutivo" del subtab completo:
 *   diagnóstico transversal del estado macro a partir de N indicadores.
 * - `analyze-detail` produce el análisis enriquecido de un solo
 *   indicador para la página /macro/pulso/indicator/[id].
 */

export interface TabAnalysisInput {
  tabSlug: string;
  tabLabel: string;
  /** Termómetro 0-100 calculado server-side. */
  termometroScore: number;
  /** Resumen compacto por indicador (no la serie completa, sólo last/family/threshold). */
  signals: Array<{
    id: string;
    family: string;
    label: string;
    unit: string;
    lastValue: number | null;
    lastPeriod: string | null;
    source: string;
    sourceCode: string;
    threshold?: {
      amber?: number;
      red?: number;
      goodAbove?: boolean;
    };
    status: "live" | "stale" | "missing";
  }>;
  tier?: "premium" | "fast";
}

export interface MacroTabInsight {
  headline: string;
  diagnosis: string;
  strengths: Array<{ family: string; description: string }>;
  vulnerabilities: Array<{ family: string; description: string; severity: "low" | "medium" | "high" }>;
  policyImplications: string[];
  watchNext: string[];
  confidenceScore: number;
}

export interface TabAnalysisResponse {
  ok: true;
  cache_hit: boolean;
  generated_at: string;
  generated_by_llm: true;
  provider: "groq" | "anthropic";
  model: string;
  tabSlug: string;
  termometroScore: number;
  insight: MacroTabInsight;
  disclaimer: string;
}

export interface TabAnalysisError {
  ok: false;
  error: string;
  detail?: string;
}

export const MACRO_TAB_INSIGHT_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: [
    "headline",
    "diagnosis",
    "strengths",
    "vulnerabilities",
    "policyImplications",
    "watchNext",
    "confidenceScore",
  ],
  properties: {
    headline: { type: "string", maxLength: 200 },
    diagnosis: { type: "string", maxLength: 900 },
    strengths: {
      type: "array",
      minItems: 0,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["family", "description"],
        properties: {
          family: { type: "string", maxLength: 60 },
          description: { type: "string", maxLength: 280 },
        },
      },
    },
    vulnerabilities: {
      type: "array",
      minItems: 0,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["family", "description", "severity"],
        properties: {
          family: { type: "string", maxLength: 60 },
          description: { type: "string", maxLength: 280 },
          severity: { type: "string", enum: ["low", "medium", "high"] },
        },
      },
    },
    policyImplications: {
      type: "array",
      minItems: 1,
      maxItems: 5,
      items: { type: "string", maxLength: 240 },
    },
    watchNext: {
      type: "array",
      minItems: 1,
      maxItems: 5,
      items: { type: "string", maxLength: 200 },
    },
    confidenceScore: { type: "number", minimum: 0, maximum: 1 },
  },
};

// ─── analyze-detail ─────────────────────────────────────────────────────

export interface DetailAnalysisInput {
  indicatorId: string;
  indicatorLabel: string;
  tabSlug: string;
  unit: string;
  source: string;
  sourceCode: string;
  series: Array<{ period: string; value: number; forecast?: boolean }>;
  /** Comparativa peers UE (último valor por país). */
  peers?: Array<{ country: string; lastValue: number | null; lastPeriod: string | null }>;
  threshold?: { amber?: number; red?: number; goodAbove?: boolean };
  notes?: string[];
  windowLabel?: string;
  tier?: "premium" | "fast";
}

export interface MacroDetailInsight {
  headline: string;
  longExplanation: string;
  cyclePhase: "expansion" | "peak" | "deceleration" | "contraction" | "trough" | "recovery" | "unclear";
  inflectionPoints: Array<{ period: string; description: string }>;
  drivers: Array<{ driver: string; evidence: string; confidence: number }>;
  internationalContext: string;
  forecastReading: string;
  politicalEconomySignals: string[];
  watchlist: Array<{ indicatorId: string; label: string; reason: string }>;
  confidenceScore: number;
}

export interface DetailAnalysisResponse {
  ok: true;
  cache_hit: boolean;
  generated_at: string;
  generated_by_llm: true;
  provider: "groq" | "anthropic";
  model: string;
  indicatorId: string;
  insight: MacroDetailInsight;
  disclaimer: string;
}

export const MACRO_DETAIL_INSIGHT_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: [
    "headline",
    "longExplanation",
    "cyclePhase",
    "inflectionPoints",
    "drivers",
    "internationalContext",
    "forecastReading",
    "politicalEconomySignals",
    "watchlist",
    "confidenceScore",
  ],
  properties: {
    headline: { type: "string", maxLength: 200 },
    longExplanation: { type: "string", maxLength: 1400 },
    cyclePhase: {
      type: "string",
      enum: [
        "expansion",
        "peak",
        "deceleration",
        "contraction",
        "trough",
        "recovery",
        "unclear",
      ],
    },
    inflectionPoints: {
      type: "array",
      minItems: 0,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["period", "description"],
        properties: {
          period: { type: "string", maxLength: 40 },
          description: { type: "string", maxLength: 280 },
        },
      },
    },
    drivers: {
      type: "array",
      minItems: 1,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["driver", "evidence", "confidence"],
        properties: {
          driver: { type: "string", maxLength: 140 },
          evidence: { type: "string", maxLength: 300 },
          confidence: { type: "number", minimum: 0, maximum: 1 },
        },
      },
    },
    internationalContext: { type: "string", maxLength: 600 },
    forecastReading: { type: "string", maxLength: 500 },
    politicalEconomySignals: {
      type: "array",
      minItems: 0,
      maxItems: 4,
      items: { type: "string", maxLength: 240 },
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
          label: { type: "string", maxLength: 140 },
          reason: { type: "string", maxLength: 260 },
        },
      },
    },
    confidenceScore: { type: "number", minimum: 0, maximum: 1 },
  },
};

export const MACRO_AI_DISCLAIMER =
  "Análisis generado por IA (Groq GPT-OSS / Anthropic Claude). Revisar antes de citar. Las inferencias no son recomendaciones de inversión ni implican causalidad.";

export function hashKey(parts: (string | number)[]): string {
  const raw = parts.join("::");
  let h = 0x811c9dc5;
  for (let i = 0; i < raw.length; i++) {
    h ^= raw.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16);
}
