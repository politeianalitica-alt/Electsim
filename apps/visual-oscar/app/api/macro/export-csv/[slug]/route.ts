/**
 * GET /api/macro/{slug}/export-csv
 *
 * Sprint N7.2 · descarga los indicadores del subtab en CSV.
 *
 * Formato CSV (dos secciones):
 *  1. METADATA · una fila por indicador con id, label, family, unit, source,
 *     sourceCode, frequency, lastPeriod, lastValue, status, threshold.
 *  2. TIME SERIES · una fila por (indicator_id, period, value, is_forecast).
 *
 * Útil para el analista: importar a Excel / Tableau / Stata / R y hacer
 * sus propios análisis sin perder fidelidad.
 */
import { NextRequest, NextResponse } from "next/server";
import { getSubtab } from "@/lib/macro/subtab-registry";
import { fetchPulsoIndicator } from "@/lib/macro/pulso-fetcher";

export const runtime = "nodejs";
export const maxDuration = 90;

interface RouteCtx { params: { slug: string } }

function csvEscape(s: string | number | boolean | null | undefined): string {
  if (s == null) return "";
  const str = String(s);
  if (str.includes(",") || str.includes("\"") || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function originFromReq(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const host = req.headers.get("host") || "localhost:3000";
  return `${proto}://${host}`;
}

export async function GET(req: NextRequest, { params }: RouteCtx) {
  const config = getSubtab(params.slug);
  if (!config) {
    return NextResponse.json({ ok: false, error: "subtab_not_found", slug: params.slug }, { status: 404 });
  }
  const origin = originFromReq(req);

  // Fetch todos los indicadores en paralelo (cache 1h)
  const results = await Promise.all(
    config.indicators.map((ind) => fetchPulsoIndicator(ind, { baseUrl: origin }))
  );
  const byId = new Map(results.map((r) => [r.id, r]));

  // ─── Sección 1 · METADATA ──────────────────────────────────────────────
  const lines: string[] = [];
  lines.push(
    "# Politeia Analítica · export macro subtab: " + config.slug
  );
  lines.push("# Generated: " + new Date().toISOString());
  lines.push("# Subtab label: " + config.label);
  lines.push("# Indicadores: " + config.indicators.length);
  lines.push("");
  lines.push("## SECTION 1 · INDICATOR METADATA");
  lines.push(
    [
      "id",
      "label",
      "shortLabel",
      "family",
      "unit",
      "source",
      "sourceCode",
      "frequency",
      "endpoint",
      "lastPeriod",
      "lastValue",
      "status",
      "thresholdAmber",
      "thresholdRed",
      "thresholdGoodAbove",
      "description",
    ]
      .map(csvEscape)
      .join(",")
  );
  for (const ind of config.indicators) {
    const r = byId.get(ind.id);
    lines.push(
      [
        ind.id,
        ind.label,
        ind.shortLabel || "",
        ind.family,
        ind.unit,
        ind.source,
        ind.sourceCode,
        ind.frequency,
        ind.endpoint,
        r?.last?.period || "",
        r?.last?.value ?? "",
        r?.status || "missing",
        ind.threshold?.amber ?? "",
        ind.threshold?.red ?? "",
        ind.threshold?.goodAbove ?? "",
        ind.description,
      ]
        .map(csvEscape)
        .join(",")
    );
  }

  // ─── Sección 2 · TIME SERIES ──────────────────────────────────────────
  lines.push("");
  lines.push("## SECTION 2 · TIME SERIES (one row per observation)");
  lines.push(["indicator_id", "period", "value", "is_forecast"].map(csvEscape).join(","));
  for (const r of results) {
    for (const p of r.series) {
      lines.push(
        [
          r.id,
          p.period,
          p.value ?? "",
          p.forecast ? "1" : "0",
        ]
          .map(csvEscape)
          .join(",")
      );
    }
  }

  const csv = lines.join("\n");
  const filename = `politeia-${config.slug}-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "public, max-age=300, stale-while-revalidate=1800",
    },
  });
}
