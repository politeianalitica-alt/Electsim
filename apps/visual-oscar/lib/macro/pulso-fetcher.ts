/**
 * Fetcher genérico para los indicadores Pulso macro v3.
 *
 * Toma un `PulsoIndicatorMeta` y devuelve `{ series, last, source, status }`
 * normalizado, sin importar si la fuente es INE, IMF o Eurostat.
 *
 * Se usa tanto en el endpoint server `/api/macro/pulso/overview` (donde se
 * llama vía fetch absoluto) como en la página detalle (donde se llama el
 * proxy local). Se evita duplicar la lógica de parsing.
 */

import type { PulsoIndicatorMeta } from "./pulso-indicators";

export interface PulsoPoint {
  period: string;
  value: number | null;
  forecast?: boolean;
}

export interface PulsoFetchResult {
  ok: boolean;
  id: string;
  series: PulsoPoint[];
  last: PulsoPoint | null;
  source: string;
  sourceCode: string;
  status: "live" | "stale" | "missing";
  error?: string;
}

function reverseInePoints(pts: any[] | undefined): PulsoPoint[] {
  if (!Array.isArray(pts)) return [];
  return pts
    .slice()
    .reverse()
    .map((p) => ({ period: String(p.period ?? p.label ?? ""), value: p.value ?? null }));
}

function splitImfSeries(series: any[] | undefined): PulsoPoint[] {
  if (!Array.isArray(series)) return [];
  const cy = new Date().getFullYear();
  return series
    .filter((s) => s.value != null && Number.isFinite(s.value))
    .map((s) => ({
      period: String(s.year),
      value: Number(s.value),
      forecast: Number(s.year) > cy,
    }));
}

function pickLast(series: PulsoPoint[]): PulsoPoint | null {
  // Para series con forecast, el "último observado" es el último no-forecast.
  const obs = series.filter((p) => !p.forecast && p.value != null);
  return obs[obs.length - 1] || series[series.length - 1] || null;
}

/**
 * Devuelve la URL absoluta a llamar (server-side debe ser absoluta).
 */
function absoluteUrl(path: string, baseUrl: string | undefined): string {
  if (path.startsWith("http")) return path;
  const base = baseUrl || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";
  return `${base}${path}`;
}

export async function fetchPulsoIndicator(
  ind: PulsoIndicatorMeta,
  opts?: { baseUrl?: string; signal?: AbortSignal }
): Promise<PulsoFetchResult> {
  const url = absoluteUrl(ind.endpoint, opts?.baseUrl);
  try {
    const res = await fetch(url, {
      cache: "force-cache",
      next: { revalidate: 3600 },
      signal: opts?.signal,
    });
    if (!res.ok) {
      return {
        ok: false,
        id: ind.id,
        series: [],
        last: null,
        source: ind.source,
        sourceCode: ind.sourceCode,
        status: "missing",
        error: `HTTP ${res.status}`,
      };
    }
    const json = await res.json();

    let series: PulsoPoint[] = [];

    switch (ind.parser) {
      case "ine-cnt-desglose": {
        const points = json?.components?.[ind.parserKey ?? ""]?.points;
        series = reverseInePoints(points);
        break;
      }
      case "ine-cnt-extra": {
        const points = json?.[ind.parserKey ?? ""]?.points;
        series = reverseInePoints(points);
        break;
      }
      case "ine-ipc": {
        const points = json?.[ind.parserKey ?? ""]?.points;
        series = reverseInePoints(points);
        break;
      }
      case "ine-epa": {
        const points = json?.[ind.parserKey ?? ""]?.points;
        series = reverseInePoints(points);
        break;
      }
      case "imf-country": {
        series = splitImfSeries(json?.series);
        break;
      }
      case "eurostat-simple": {
        const points = json?.points ?? json?.series ?? [];
        series = (Array.isArray(points) ? points : []).map((p: any) => ({
          period: String(p.period ?? p.date ?? ""),
          value: p.value ?? null,
        }));
        break;
      }
      case "ine-frontur": {
        // /api/ine/frontur · output: { total: { points: [...] } }
        const points = json?.total?.points;
        series = reverseInePoints(points);
        break;
      }
      case "ine-dirce": {
        // /api/ine/dirce-creacion · output: { series_top: [{ points: [...] }, ...] }
        // parserKey = índice (string) de la serie a usar. Default 0.
        const idx = ind.parserKey ? Number(ind.parserKey) : 0;
        const points = json?.series_top?.[Number.isFinite(idx) ? idx : 0]?.points;
        series = reverseInePoints(points);
        break;
      }
      case "datos-gob-csv": {
        // Output del endpoint /api/datos-gob/csv: { ok, rows: [...], fields: [...] }
        const rows = Array.isArray(json?.rows) ? json.rows : [];
        const cfg = ind.csv;
        if (cfg) {
          const dateField = cfg.dateField;
          const valueField = cfg.valueField;
          let filtered = rows;
          if (cfg.filter) {
            filtered = rows.filter(
              (r: any) => String(r[cfg.filter!.column] ?? "") === cfg.filter!.equals
            );
          }
          series = filtered
            .map((r: any) => {
              const periodRaw = r[dateField as any];
              const valueRaw = r[valueField as any];
              const period = periodRaw == null ? "" : String(periodRaw);
              const value =
                typeof valueRaw === "number"
                  ? valueRaw
                  : Number.isFinite(Number(valueRaw))
                  ? Number(valueRaw)
                  : null;
              return { period, value } as PulsoPoint;
            })
            .filter((p: PulsoPoint) => p.period && p.value != null);
          if (cfg.reverse) series = series.slice().reverse();
        }
        break;
      }
    }

    const last = pickLast(series);
    const status: PulsoFetchResult["status"] = last
      ? series.length > 4
        ? "live"
        : "stale"
      : "missing";

    return {
      ok: true,
      id: ind.id,
      series,
      last,
      source: ind.source,
      sourceCode: ind.sourceCode,
      status,
    };
  } catch (err) {
    return {
      ok: false,
      id: ind.id,
      series: [],
      last: null,
      source: ind.source,
      sourceCode: ind.sourceCode,
      status: "missing",
      error: (err as Error).message,
    };
  }
}

/**
 * Calcula un score 0-100 (0 = todo malo, 100 = todo en verde) en base a
 * los umbrales definidos en el catálogo. Si un indicador no tiene umbral,
 * vota neutro (50).
 */
export function computePulsoTermometro(
  indicators: PulsoIndicatorMeta[],
  results: Record<string, PulsoFetchResult>
): { score: number; bySignal: { id: string; vote: number; reason: string }[] } {
  const bySignal: { id: string; vote: number; reason: string }[] = [];
  for (const ind of indicators) {
    const r = results[ind.id];
    if (!r || !r.last || r.last.value == null) {
      bySignal.push({ id: ind.id, vote: 50, reason: "sin dato" });
      continue;
    }
    const v = r.last.value;
    if (!ind.threshold) {
      bySignal.push({ id: ind.id, vote: 60, reason: "sin umbral · neutral+" });
      continue;
    }
    const { amber, red, goodAbove } = ind.threshold;
    const a = amber ?? null;
    const rr = red ?? null;
    let vote = 50;
    let reason = `${v.toFixed?.(2) ?? v}${ind.unit}`;
    if (goodAbove === true) {
      // Mejor si > amber. Peor si < red.
      if (a != null && v >= a) vote = 90;
      else if (rr != null && v <= rr) vote = 10;
      else if (a != null && rr != null) {
        vote = 10 + ((v - rr) / (a - rr)) * 80;
        vote = Math.max(10, Math.min(90, vote));
      } else {
        vote = 60;
      }
      reason = `${reason} vs amber ${a ?? "-"} / red ${rr ?? "-"}`;
    } else if (goodAbove === false) {
      // Mejor si < amber. Peor si > red.
      if (a != null && v <= a) vote = 90;
      else if (rr != null && v >= rr) vote = 10;
      else if (a != null && rr != null) {
        vote = 90 - ((v - a) / (rr - a)) * 80;
        vote = Math.max(10, Math.min(90, vote));
      } else {
        vote = 50;
      }
      reason = `${reason} vs amber ${a ?? "-"} / red ${rr ?? "-"}`;
    }
    bySignal.push({ id: ind.id, vote, reason });
  }
  const score =
    bySignal.length > 0
      ? Math.round(bySignal.reduce((s, x) => s + x.vote, 0) / bySignal.length)
      : 50;
  return { score, bySignal };
}
