/**
 * Cálculo de indicadores técnicos en cliente (sin dependencias).
 * Mantenemos paridad con backend etl/sources/commodities/prices.py.
 */

export function sma(values: (number | null)[], window: number): (number | null)[] {
  const out: (number | null)[] = []
  for (let i = 0; i < values.length; i++) {
    if (i < window - 1) {
      out.push(null)
      continue
    }
    let sum = 0
    let count = 0
    for (let j = i - window + 1; j <= i; j++) {
      const v = values[j]
      if (v != null) {
        sum += v
        count += 1
      }
    }
    out.push(count === window ? sum / window : null)
  }
  return out
}

export function ema(values: (number | null)[], window: number): (number | null)[] {
  const out: (number | null)[] = []
  const k = 2 / (window + 1)
  let prev: number | null = null
  for (let i = 0; i < values.length; i++) {
    const v = values[i]
    if (v == null) {
      out.push(prev)
      continue
    }
    prev = prev == null ? v : prev + k * (v - prev)
    out.push(prev)
  }
  return out
}

export function bollinger(values: (number | null)[], window = 20, k = 2): {
  upper: (number | null)[]
  middle: (number | null)[]
  lower: (number | null)[]
} {
  const middle = sma(values, window)
  const upper: (number | null)[] = []
  const lower: (number | null)[] = []
  for (let i = 0; i < values.length; i++) {
    if (i < window - 1) {
      upper.push(null)
      lower.push(null)
      continue
    }
    const slice = values.slice(i - window + 1, i + 1).filter((v): v is number => v != null)
    const mean = (middle[i] as number) || 0
    const variance = slice.reduce((acc, v) => acc + (v - mean) ** 2, 0) / slice.length
    const sigma = Math.sqrt(variance)
    upper.push(mean + k * sigma)
    lower.push(mean - k * sigma)
  }
  return { upper, middle, lower }
}
