/**
 * Fetcher genérico para indicadores geo-OSINT · Sprint G1.
 *
 * Similar a lib/macro/pulso-fetcher.ts pero adaptado a los endpoints
 * heterogéneos `/api/geopolitica/*`, `/api/acled/*`, `/api/gdelt/*`.
 *
 * Cada GeoIndicatorMeta declara su parser; este módulo sabe cómo extraer
 * el valor del JSON variable de cada endpoint.
 */
import type { GeoIndicatorMeta } from "./geo-indicators";

export interface GeoSnapshot {
  ok: boolean;
  id: string;
  value: number | null;
  period?: string;
  source: string;
  sourceCode: string;
  status: "live" | "stale" | "missing";
  error?: string;
}

/**
 * Lee un campo dotted (ej. "alertas_count.CRITICO") de un objeto.
 */
function readDotted(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  const parts = path.split(".");
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

function absoluteUrl(path: string, baseUrl?: string): string {
  if (path.startsWith("http")) return path;
  const base = baseUrl || (process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3001");
  return `${base}${path}`;
}

export async function fetchGeoIndicator(
  ind: GeoIndicatorMeta,
  opts?: { baseUrl?: string; signal?: AbortSignal },
): Promise<GeoSnapshot> {
  const url = absoluteUrl(ind.endpoint, opts?.baseUrl);
  const period = new Date().toISOString().slice(0, 10);
  try {
    const res = await fetch(url, {
      cache: "force-cache",
      next: { revalidate: 300 }, // 5 min · geo es near-realtime
      signal: opts?.signal,
    });
    if (!res.ok) {
      return {
        ok: false, id: ind.id, value: null, period,
        source: ind.source, sourceCode: ind.sourceCode,
        status: "missing", error: `HTTP ${res.status}`,
      };
    }
    const json = await res.json();

    let value: number | null = null;

    switch (ind.parser) {
      case "geo-stats-field": {
        const raw = readDotted(json, ind.parserKey || "");
        if (typeof raw === "number" && Number.isFinite(raw)) {
          value = raw;
        }
        break;
      }
      case "geo-list-count": {
        const key = ind.parserKey || "data";
        const list = json?.[key];
        if (Array.isArray(list)) {
          value = list.length;
        } else if (typeof json?.total === "number") {
          value = json.total;
        }
        break;
      }
      case "geo-list-mean": {
        const key = ind.parserKey || "value";
        const list = json?.data || json?.items || [];
        if (Array.isArray(list) && list.length > 0) {
          const nums = list
            .map((it: any) => Number(it?.[key]))
            .filter((n: number) => Number.isFinite(n));
          if (nums.length > 0) {
            value = nums.reduce((a: number, b: number) => a + b, 0) / nums.length;
          }
        }
        break;
      }
      case "acled-count": {
        // /api/acled/spain-context shape: { ok, by_country: {...}, n_events_total }
        if (typeof json?.n_events_total === "number") {
          value = json.n_events_total;
        } else if (Array.isArray(json?.data)) {
          value = json.data.length;
        }
        break;
      }
      case "gdelt-tone": {
        // /api/gdelt/tone shape: { ok, tone_mean, tone_recent }
        const raw = json?.tone_mean ?? json?.mean_tone ?? json?.tone;
        if (typeof raw === "number" && Number.isFinite(raw)) {
          value = raw;
        }
        break;
      }
      case "static-snapshot": {
        const snap = json?.snapshot || json;
        const raw = ind.parserKey ? snap?.[ind.parserKey] : null;
        if (typeof raw === "number" && Number.isFinite(raw)) {
          value = raw;
        }
        break;
      }
    }

    const status: GeoSnapshot["status"] = value != null ? "live" : "missing";
    return {
      ok: true, id: ind.id, value, period,
      source: ind.source, sourceCode: ind.sourceCode, status,
    };
  } catch (err) {
    return {
      ok: false, id: ind.id, value: null, period,
      source: ind.source, sourceCode: ind.sourceCode,
      status: "missing", error: (err as Error).message,
    };
  }
}

/**
 * Termómetro geo 0-100 análogo a pulso. 0=todo mal, 100=todo en verde.
 * Indicadores sin umbral votan neutral 60.
 */
export function computeGeoTermometro(
  indicators: GeoIndicatorMeta[],
  results: Record<string, GeoSnapshot>,
): { score: number; bySignal: { id: string; vote: number; reason: string }[] } {
  const bySignal: { id: string; vote: number; reason: string }[] = [];
  for (const ind of indicators) {
    const r = results[ind.id];
    if (!r || r.value == null) {
      bySignal.push({ id: ind.id, vote: 50, reason: "sin dato" });
      continue;
    }
    const v = r.value;
    if (!ind.threshold) {
      bySignal.push({ id: ind.id, vote: 60, reason: "sin umbral · neutral+" });
      continue;
    }
    const { amber, red, goodAbove } = ind.threshold;
    let vote = 50;
    if (goodAbove === true) {
      if (amber != null && v >= amber) vote = 90;
      else if (red != null && v <= red) vote = 10;
      else if (amber != null && red != null) {
        vote = 10 + ((v - red) / (amber - red)) * 80;
        vote = Math.max(10, Math.min(90, vote));
      } else vote = 60;
    } else if (goodAbove === false) {
      if (amber != null && v <= amber) vote = 90;
      else if (red != null && v >= red) vote = 10;
      else if (amber != null && red != null) {
        vote = 90 - ((v - amber) / (red - amber)) * 80;
        vote = Math.max(10, Math.min(90, vote));
      } else vote = 50;
    }
    bySignal.push({ id: ind.id, vote, reason: `${v.toFixed?.(2) ?? v}${ind.unit}` });
  }
  const score = bySignal.length
    ? Math.round(bySignal.reduce((s, x) => s + x.vote, 0) / bySignal.length)
    : 50;
  return { score, bySignal };
}
