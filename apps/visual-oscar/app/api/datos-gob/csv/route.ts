/**
 * GET /api/datos-gob/csv?url=...&limit=&skipRows=&separator=&infer=true
 *
 * Parser CSV específico para datasets de datos.gob.es. Acepta URLs de
 * cualquier CSV público (datos.gob.es, INE, IGAE, BDNS, OEPM, MITECO,
 * Catastro, FEGA, CCAA/ayuntamientos).
 *
 * Whitelist de hosts para evitar SSRF. Por defecto cubre los principales
 * publicadores españoles de datos abiertos.
 *
 * Query params:
 *   url        URL absoluta del CSV (obligatorio)
 *   limit      Filas máximas devueltas (default 500, max 5000)
 *   skipRows   Saltar N filas iniciales (metadata INE típica)
 *   separator  ',' ';' '\t' '|' · default: autodetect
 *   infer      'true' para convertir números/fechas. Default true.
 */
import { NextRequest, NextResponse } from "next/server";
import { parseDatosGobCSV } from "@/lib/parsers/datagob-csv";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED_HOSTS = new Set([
  "datos.gob.es",
  "www.ine.es",
  "ine.es",
  "datosabiertos.malaga.eu",
  "opendata.aragon.es",
  "opendata.euskadi.eus",
  "analisi.transparenciacatalunya.cat",
  "dadesobertes.gva.es",
  "datosabiertos.canarias.es",
  "datosabiertos.jccm.es",
  "datosabiertos.bcn.cat",
  "datos.madrid.es",
  "abierto.juntadeandalucia.es",
  "transparencia.gob.es",
  "www.transparencia.gob.es",
  "datos.sepe.es",
  "www.miteco.gob.es",
  "miteco.gob.es",
  "datos.fega.es",
  "fega.es",
  "www.poderjudicial.es",
  "poderjudicial.es",
  "infosubvenciones.es",
  "www.infosubvenciones.es",
  "contrataciondelestado.es",
  "www.contrataciondelestado.es",
  "ipyme.org",
  "www.ipyme.org",
  "raw.githubusercontent.com", // útil para datasets en git público
]);

function hostAllowed(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    return ALLOWED_HOSTS.has(u.host.toLowerCase());
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  if (!url) {
    return NextResponse.json(
      { ok: false, error: "url_required" },
      { status: 400 }
    );
  }
  if (!hostAllowed(url)) {
    return NextResponse.json(
      {
        ok: false,
        error: "host_not_allowed",
        detail: "Host no está en la whitelist de publicadores españoles de datos abiertos.",
        allowedHostsSample: Array.from(ALLOWED_HOSTS).slice(0, 8),
      },
      { status: 400 }
    );
  }

  const limit = Math.min(Number(searchParams.get("limit") ?? 500), 5000);
  const skipRows = Math.max(0, Number(searchParams.get("skipRows") ?? 0));
  const sep = searchParams.get("separator");
  const infer = searchParams.get("infer") !== "false";

  const result = await parseDatosGobCSV({
    url,
    limit,
    skipRows,
    separator: (sep === "," || sep === ";" || sep === "\t" || sep === "|") ? sep : null,
    inferTypes: infer,
    encoding: "auto",
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 502 });
  }

  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
