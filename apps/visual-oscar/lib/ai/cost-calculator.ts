/**
 * Calculador de coste por llamada LLM.
 *
 * Mantiene el pricing actualizado de cada modelo y calcula el coste real
 * de una respuesta basándose en tokens consumidos (input billed, cache
 * hit/write, output).
 *
 * Devuelve el coste en USD y en céntimos para mostrar en la UI sin
 * decimales raros.
 */

interface PricePerMillionTokens {
  input: number; // dollars per 1M tokens
  output: number;
  cacheRead: number; // 0.10x el precio de input
  cacheWrite: number; // 1.25x el precio de input
}

const PRICING: Record<string, PricePerMillionTokens> = {
  // Claude pricing oficial (https://www.anthropic.com/pricing)
 "claude-sonnet-4-5-20250929": {
    input: 3,
    output: 15,
    cacheRead: 0.3,
    cacheWrite: 3.75,
  },
 "claude-haiku-4-5-20251001": {
    input: 1,
    output: 5,
    cacheRead: 0.1,
    cacheWrite: 1.25,
  },
 "claude-opus-4-5-20251001": {
    input: 15,
    output: 75,
    cacheRead: 1.5,
    cacheWrite: 18.75,
  },
};

export interface TokenUsage {
  input_billed: number;
  cache_read: number;
  cache_write: number;
  output: number;
}

export interface CostBreakdown {
  /** Coste total en USD (centavos visibles, p.ej. 0.0023). */
  usd: number;
  /** Coste en mils (milésimas de centavo, para mostrar "0.23¢"). */
  cents: number;
  /** Desglose por categoría en USD. */
  breakdown: {
    input: number;
    cache_read: number;
    cache_write: number;
    output: number;
  };
  /** Modelo usado. */
  model: string;
}

export function calculateCost(model: string, usage: TokenUsage): CostBreakdown {
  const price = PRICING[model];
  if (!price) {
    // Modelo desconocido: usamos Haiku como base conservadora
    return calculateCost("claude-haiku-4-5-20251001", usage);
  }

  const inputCost = (usage.input_billed * price.input) / 1_000_000;
  const cacheReadCost = (usage.cache_read * price.cacheRead) / 1_000_000;
  const cacheWriteCost = (usage.cache_write * price.cacheWrite) / 1_000_000;
  const outputCost = (usage.output * price.output) / 1_000_000;
  const total = inputCost + cacheReadCost + cacheWriteCost + outputCost;

  return {
    usd: total,
    cents: total * 100,
    breakdown: {
      input: inputCost,
      cache_read: cacheReadCost,
      cache_write: cacheWriteCost,
      output: outputCost,
    },
    model,
  };
}

/**
 * Formato humano del coste:
 *   0.00012 → "0,01¢"
 *   0.0034  → "0,3¢"
 *   0.045   → "4,5¢"
 *   0.12    → "12¢"
 *   1.23    → "$1,23"
 */
export function formatCost(usd: number): string {
  if (usd <= 0) return "—";
  if (usd < 0.01) return `${(usd * 100).toFixed(2).replace(".", ",")}¢`;
  if (usd < 1) return `${(usd * 100).toFixed(1).replace(".", ",")}¢`;
  return `$${usd.toFixed(2).replace(".", ",")}`;
}

/**
 * Formato compacto para chip pequeño (1 char extra):
 *   0.00012 → "<1¢"
 *   0.045   → "5¢"
 */
export function formatCostShort(usd: number): string {
  if (usd <= 0) return "—";
  if (usd < 0.001) return "<0,1¢";
  if (usd < 0.01) return `${(usd * 100).toFixed(1).replace(".", ",")}¢`;
  if (usd < 1) return `${Math.round(usd * 100)}¢`;
  return `$${usd.toFixed(2)}`;
}
