/**
 * GET /api/macro/datagob/discovery?subtab=pulso-macro
 *
 * Busca en datos.gob.es (CKAN) datasets relacionados con el subtab macro.
 * Mapeo subtab→keywords curado abajo.
 *
 * datos.gob.es expone CKAN search-style endpoint en:
 *   https://datos.gob.es/apidata/catalog/dataset/title/{keyword}
 *
 * Devuelve dataset card list con título, organismo, formats, fecha mod.
 */
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;
export const revalidate = 21600; // 6h

// Mapeo subtab → keywords de búsqueda en datos.gob.es
const SUBTAB_KEYWORDS: Record<string, string[]> = {
  "pulso-macro": ["pib", "epa", "contabilidad nacional"],
  "regimen-monetario": ["ipc", "inflacion", "tipos interes"],
  "margen-fiscal": ["deuda publica", "presupuestos", "AIReF"],
  "riesgo-sistemico": ["deuda", "deficit", "crisis"],
  "dependencias-externas": ["comercio exterior", "exportaciones"],
  "mercados-activos": ["mercados", "valores", "CNMV"],
  "flujos-capital": ["inversion extranjera", "balanza"],
  "productividad-competitividad": ["productividad", "I+D"],
  "empresas-beneficios": ["empresas", "DIRCE", "creacion empresas"],
  "hogares-empleo-vivienda": ["vivienda", "alquiler", "renta hogares"],
};

interface CkanResult {
  title: string
  description?: string
  publisher?: string
  url: string
  modified?: string
  formats?: string[]
}

/**
 * datos.gob.es no expone CKAN clásico. Usa NTI semantic API.
 * Endpoint: https://datos.gob.es/apidata/catalog/dataset/title/{kw}?_pageSize=8
 * Devuelve JSON con { result: { items: [...] } }
 */
async function searchDatosGob(keyword: string): Promise<CkanResult[]> {
  const url = `https://datos.gob.es/apidata/catalog/dataset/title/${encodeURIComponent(
    keyword
  )}?_pageSize=6&_sort=-modified`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 21600 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    const items = json?.result?.items || [];
    return items.map((it: any) => {
      const title = pickLang(it.title) || "Sin título";
      const description = pickLang(it.description);
      const publisher =
        (Array.isArray(it.publisher) ? it.publisher[0]?.name : it.publisher?.name) ||
        it.publisher_data_es ||
        "";
      // URL del dataset NTI: it._about
      const url = it._about || it.url || `https://datos.gob.es/es/catalogo/${encodeURIComponent(it.identifier || "")}`;
      const modified = it.modified || it.released || "";
      const formats: string[] = [];
      const distributions = it.distribution || it.distributions || [];
      if (Array.isArray(distributions)) {
        for (const d of distributions.slice(0, 5)) {
          const fmt = d?.format?.value || d?.format || d?.mediaType;
          if (typeof fmt === "string") {
            const short = fmt.split("/").pop()?.toUpperCase() || fmt;
            formats.push(short);
          }
        }
      }
      return { title, description, publisher, url, modified, formats: Array.from(new Set(formats)) };
    });
  } catch {
    return [];
  }
}

function pickLang(field: unknown): string | undefined {
  if (typeof field === "string") return field;
  if (Array.isArray(field)) {
    const es = field.find((x: any) => x?._lang === "es" || x?.lang === "es");
    if (es) return es._value || es.value || String(es);
    return String(field[0]?._value ?? field[0] ?? "");
  }
  if (typeof field === "object" && field !== null) {
    const f = field as any;
    return f._value || f.value || f.es || undefined;
  }
  return undefined;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const subtab = searchParams.get("subtab") || "pulso-macro";
  const overrideQ = searchParams.get("q");

  const keywords = overrideQ
    ? overrideQ.split(",").map((s) => s.trim()).filter(Boolean)
    : SUBTAB_KEYWORDS[subtab] || ["macroeconomia"];

  // Lanza queries en paralelo, dedup y limita a 12
  const all = await Promise.all(keywords.map((k) => searchDatosGob(k)));
  const seen = new Set<string>();
  const merged: CkanResult[] = [];
  for (const list of all) {
    for (const item of list) {
      const key = item.url || item.title;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
      if (merged.length >= 12) break;
    }
    if (merged.length >= 12) break;
  }

  return NextResponse.json(
    {
      ok: true,
      subtab,
      keywords,
      total: merged.length,
      results: merged,
      generated_at: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400",
      },
    }
  );
}
