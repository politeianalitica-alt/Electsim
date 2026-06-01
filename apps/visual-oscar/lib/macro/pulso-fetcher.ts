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
  // Sprint W.1 · BUG corregido: la precedencia anterior era
  //   `baseUrl || process.env.VERCEL_URL ? ... : ...`
  // que evaluaba la disyunción ANTES de la ternaria. Si pasabas baseUrl
  // pero VERCEL_URL no estaba (caso local + script), el resultado era
  // `https://undefined` → fetch fallaba con "fetch failed" en TODOS los
  // 277 indicadores cuando se llamaba desde scripts/data-probe.ts.
  // AHORA: precedencia explícita y orden correcto baseUrl > VERCEL_URL > localhost.
  let base: string;
  if (baseUrl) base = baseUrl;
  else if (process.env.VERCEL_URL) base = `https://${process.env.VERCEL_URL}`;
  else base = "http://localhost:3000";
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
    // Sprint Quality-Data · ANTES `await res.json()` se ejecutaba sin
    // comprobar content-type. Si la fuente responde 200 con HTML (sucede
    // por ej. cuando IMF/Eurostat/INE devuelven una landing en lugar de
    // datos por throttling, mantenimiento o User-Agent bloqueado), la
    // promesa rechaza con "Unexpected token '<'" y el error baja por
    // catch crudo, perdiendo trazabilidad.
    // AHORA: verificamos content-type y, si no es JSON, devolvemos un
    // error tipado que el frontend puede traducir a copy útil.
    const contentType = (res.headers.get("content-type") || "").toLowerCase();
    if (!contentType.includes("json")) {
      const preview = (await res.text()).slice(0, 80);
      return {
        ok: false,
        id: ind.id,
        series: [],
        last: null,
        source: ind.source,
        sourceCode: ind.sourceCode,
        status: "missing",
        error: `non_json_response (ct=${contentType || "unknown"}, preview="${preview.replace(/\s+/g, " ").trim()}")`,
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
      case "finnhub-quote": {
        // Sprint N12 · Finnhub /quote devuelve snapshot live: { c, d, dp, h, l, o, pc, t }
        // c=current, pc=previous_close, t=timestamp. Construimos serie sintética de 2
        // puntos (ayer y hoy) para que el sparkline tenga al menos algo y se vea
        // la variación intradía vs cierre anterior. No es historia real (Finnhub free
        // tier no expone /stock/candle), pero da nivel live + delta diario al analista.
        if (json?.ok && typeof json.price === "number") {
          const today = new Date(json.timestamp ? json.timestamp * 1000 : Date.now());
          const yesterday = new Date(today.getTime() - 86400000);
          const fmt = (d: Date) => d.toISOString().slice(0, 10);
          if (typeof json.previous_close === "number") {
            series.push({ period: fmt(yesterday), value: json.previous_close });
          }
          series.push({ period: fmt(today), value: json.price });
        }
        break;
      }
      case "bde-series": {
        // Sprint N15 · /api/bde/series/{code}?n=24 devuelve { ok, points: [{period, value}] }
        const pts = Array.isArray(json?.points) ? json.points : [];
        series = pts
          .map((p: any) => ({
            period: String(p.period || ''),
            value: typeof p.value === 'number' ? p.value : null,
          }) as PulsoPoint)
          .filter((p: PulsoPoint) => p.period && p.value != null);
        break;
      }
      case "spanish-stats-points": {
        // Sprint W.2 · /api/spanish-stats/<key> devuelve snapshots ministeriales:
        //   { ok, points: [{ time: '2024', value: 28842.10 }], last: {...}, n_points }
        // El campo del periodo es `time` (no `period`). 24 indicadores estaban
        // mapeados a `ine-ipc` por error → ninguno parseaba.
        const pts = Array.isArray(json?.points) ? json.points : [];
        series = pts
          .map((p: any) => ({
            period: String(p.time ?? p.period ?? ''),
            value: typeof p.value === 'number' ? p.value : null,
          }) as PulsoPoint)
          .filter((p: PulsoPoint) => p.period && p.value != null);
        break;
      }
      case "tesoro-snapshot": {
        // Sprint N15 · /api/tesoro/snapshot devuelve un objeto puntual con
        // métricas estáticas del último boletín. Convertimos a serie de 1 punto.
        // parserKey indica qué campo del snapshot extraer.
        const snap = json?.snapshot || {};
        const key = ind.parserKey || 'vida_media_deuda_anios';
        const value = snap[key];
        const period = String(json?.reference_period || new Date().toISOString().slice(0, 7));
        if (typeof value === 'number') {
          series.push({ period, value });
        }
        break;
      }
      case "aemet-precipitacion": {
        // Sprint N16 · /api/aemet/precipitacion-ccaa?ccaa=XYZ devuelve
        // { ok, items: [{ fecha:'2024-1', p_mes:'45.2', tm_mes:'15.3', ... }] }
        // Construimos serie temporal por mes-año. parserKey opcional:
        //  - 'precip'  → campo p_mes  (precipitación mensual en mm)  · default
        //  - 'tm'      → campo tm_mes (temperatura media mensual ºC)
        //  - 'tmax'    → campo ta_max (temp máxima mes)
        //  - 'tmin'    → campo ti_min (temp mínima mes)
        const items = Array.isArray(json?.items) ? json.items : [];
        const fieldMap: Record<string, string> = {
          precip: 'p_mes',
          tm: 'tm_mes',
          tmax: 'ta_max',
          tmin: 'ti_min',
        };
        const wanted = fieldMap[ind.parserKey || 'precip'] || 'p_mes';
        series = items
          .map((it: any) => {
            // AEMET fechas vienen como "2024-1" (año-mes) o "2024-1-15" (año-mes-día)
            const fecha = String(it.fecha || '').trim();
            const periodMatch = fecha.match(/^(\d{4})-(\d{1,2})/);
            if (!periodMatch) return null;
            const period = `${periodMatch[1]}-${String(periodMatch[2]).padStart(2, '0')}`;
            const raw = it[wanted];
            // AEMET devuelve valores como string "45.2" o "Ip" (inapreciable) o vacío
            const value = typeof raw === 'string'
              ? (raw === 'Ip' ? 0 : Number(raw.replace(',', '.')))
              : (typeof raw === 'number' ? raw : null);
            if (value == null || !Number.isFinite(value)) return null;
            return { period, value } as PulsoPoint;
          })
          .filter((p: PulsoPoint | null): p is PulsoPoint => p !== null)
          .sort((a: PulsoPoint, b: PulsoPoint) => a.period.localeCompare(b.period));
        break;
      }
      case "cis-catalogo": {
        // Sprint N12 · /api/cis/catalogo devuelve metadata de barómetros CIS
        // publicados (via CKAN datos.gob.es). No son series numéricas (CIS no
        // expone valores agregados por API), pero podemos representar cada
        // barómetro publicado como un "evento" con period=fecha_modified y
        // value=1 (ocurrió). Sirve para ver cadencia de publicaciones + linkar
        // al PDF/microdato. El parserKey opcional puede filtrar el catálogo.
        const items = Array.isArray(json?.items) ? json.items : [];
        const titleFilter = ind.parserKey?.toLowerCase();
        const filtered = titleFilter
          ? items.filter((it: any) =>
              String(it.title || "").toLowerCase().includes(titleFilter)
            )
          : items;
        series = filtered
          .map((it: any) => {
            const dateRaw = it.modified || it.issued || "";
            const period = String(dateRaw).slice(0, 10);
            return period ? ({ period, value: 1 } as PulsoPoint) : null;
          })
          .filter((p: PulsoPoint | null): p is PulsoPoint => p !== null)
          .sort((a: PulsoPoint, b: PulsoPoint) => a.period.localeCompare(b.period));
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
