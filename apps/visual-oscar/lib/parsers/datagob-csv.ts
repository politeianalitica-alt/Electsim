/**
 * Parser CSV para datos.gob.es y datasets españoles en general.
 *
 * datos.gob.es publica enormes catálogos en CSV (BDNS, contratación
 * pública, INE, IGAE, OEPM, FEGA, Catastro, MITECO, etc.). Este helper
 * normaliza la descarga + parsing en una API minimalista sin
 * dependencias externas (CSV es simple suficiente).
 *
 * Soporta:
 *  - Detección automática de separador (`,` | `;` | `\t` | `|`)
 *  - Comillas dobles con escape RFC 4180
 *  - Encoding utf-8, latin1 (fallback común en datos.gob.es)
 *  - Limit y skipRows para datasets enormes
 *  - Schema inference simple (numeric / date / string)
 *
 * No usa stream — todo en memoria. Para CSVs >50MB usar paginación.
 */

export interface CSVParseOptions {
  /** URL del CSV. Acepta https:// y rutas locales. */
  url: string;
  /** Encoding. Default: utf-8. Fallback latin1 si hay caracteres rotos. */
  encoding?: "utf-8" | "latin1" | "auto";
  /** Separador. Si null, autodetecta. */
  separator?: "," | ";" | "\t" | "|" | null;
  /** Líneas a saltar al principio (metadata BOE/INE típicas). */
  skipRows?: number;
  /** Limita filas devueltas (no incluye header). */
  limit?: number;
  /** Si true, intenta convertir cifras a number. */
  inferTypes?: boolean;
  /** Timeout en ms. */
  timeoutMs?: number;
}

export interface CSVField {
  name: string;
  /** Tipo inferido. Heurística simple sobre primeras 100 filas. */
  type: "string" | "number" | "date" | "boolean";
  /** % filas no nulas con valor del tipo inferido. */
  fillRate: number;
}

export interface CSVParseResult {
  ok: true;
  url: string;
  rows: Array<Record<string, string | number | boolean | null>>;
  fields: CSVField[];
  totalRows: number;
  /** Header crudo tal como vino. */
  header: string[];
  separator: string;
  encoding: string;
  truncated: boolean;
  fetchedBytes: number;
  fetchedAt: string;
}

export interface CSVParseError {
  ok: false;
  url: string;
  error: string;
  detail?: string;
}

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_FETCH_BYTES = 25 * 1024 * 1024; // 25 MB

function detectSeparator(sampleLine: string): string {
  const counts = {
    ",": (sampleLine.match(/,/g) || []).length,
    ";": (sampleLine.match(/;/g) || []).length,
    "\t": (sampleLine.match(/\t/g) || []).length,
    "|": (sampleLine.match(/\|/g) || []).length,
  };
  const max = Object.entries(counts).reduce(
    (best, [sep, n]) => (n > best[1] ? [sep, n] : best),
    [",", 0] as [string, number]
  );
  return max[1] > 0 ? max[0] : ",";
}

/**
 * Parser RFC 4180 mínimo para una fila CSV.
 * Maneja comillas dobles, escapes y separadores arbitrarios.
 */
function parseLine(line: string, sep: string): string[] {
  const fields: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === sep) {
        fields.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
  }
  fields.push(cur);
  return fields;
}

/**
 * Convierte CSV completo en filas. Maneja saltos de línea dentro de
 * comillas correctamente (parser de dos estados).
 */
function splitCsvRows(text: string): string[] {
  const rows: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"' && (i + 1 >= text.length || text[i + 1] !== '"')) {
      inQuotes = !inQuotes;
      cur += ch;
    } else if (ch === '"' && text[i + 1] === '"') {
      cur += '""';
      i++;
    } else if ((ch === "\n" || ch === "\r") && !inQuotes) {
      // Salto de línea fuera de comillas → fin de fila
      if (cur.length > 0) {
        rows.push(cur);
        cur = "";
      }
      // Saltar \r\n
      if (ch === "\r" && text[i + 1] === "\n") i++;
    } else {
      cur += ch;
    }
  }
  if (cur.length > 0) rows.push(cur);
  return rows;
}

function tryParseNumber(s: string): number | null {
  if (!s || !s.trim()) return null;
  // Acepta formato europeo (1.234,56) y angloamericano (1,234.56)
  const trimmed = s.trim();
  let n: number;
  if (/^-?\d+([.,]\d+)?$/.test(trimmed)) {
    // Simple: un sólo separador decimal
    n = Number(trimmed.replace(",", "."));
  } else if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(trimmed)) {
    // Europeo: 1.234.567,89
    n = Number(trimmed.replace(/\./g, "").replace(",", "."));
  } else if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(trimmed)) {
    // Anglo: 1,234,567.89
    n = Number(trimmed.replace(/,/g, ""));
  } else {
    return null;
  }
  return Number.isFinite(n) ? n : null;
}

function tryParseDate(s: string): string | null {
  if (!s || !s.trim()) return null;
  const trimmed = s.trim();
  // ISO YYYY-MM-DD o YYYY-MM
  if (/^\d{4}-\d{2}(-\d{2})?(T.*)?$/.test(trimmed)) {
    const d = new Date(trimmed);
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }
  // DD/MM/YYYY (formato español típico)
  const m = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) {
    const [, d, mo, y] = m;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

function inferFieldType(values: string[]): { type: CSVField["type"]; fillRate: number } {
  const nonEmpty = values.filter((v) => v !== null && v !== "");
  if (nonEmpty.length === 0) return { type: "string", fillRate: 0 };
  const sampleSize = Math.min(100, nonEmpty.length);
  const sample = nonEmpty.slice(0, sampleSize);

  let numCount = 0;
  let dateCount = 0;
  let boolCount = 0;
  for (const v of sample) {
    if (tryParseNumber(v) != null) numCount++;
    if (tryParseDate(v) != null) dateCount++;
    if (/^(true|false|sí|si|no|s|n)$/i.test(v)) boolCount++;
  }
  const fillRate = nonEmpty.length / values.length;
  if (numCount / sampleSize > 0.85) return { type: "number", fillRate };
  if (dateCount / sampleSize > 0.85) return { type: "date", fillRate };
  if (boolCount / sampleSize > 0.85) return { type: "boolean", fillRate };
  return { type: "string", fillRate };
}

export async function parseDatosGobCSV(
  opts: CSVParseOptions
): Promise<CSVParseResult | CSVParseError> {
  const url = opts.url;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  let bytes = 0;
  let encoding = opts.encoding ?? "utf-8";

  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        "User-Agent": "Politeia/1.0 (analytics; datos.gob.es csv parser)",
        Accept: "text/csv, application/csv, text/plain, */*",
      },
      next: { revalidate: 3600 },
    });
    clearTimeout(timer);

    if (!res.ok) {
      return { ok: false, url, error: `HTTP ${res.status}`, detail: res.statusText };
    }

    // Detectar encoding del header content-type
    const ct = res.headers.get("content-type") || "";
    if (ct.toLowerCase().includes("iso-8859-1") || ct.toLowerCase().includes("latin1")) {
      encoding = "latin1";
    }

    const ab = await res.arrayBuffer();
    bytes = ab.byteLength;
    if (bytes > MAX_FETCH_BYTES) {
      return {
        ok: false,
        url,
        error: "csv_too_large",
        detail: `${bytes} bytes > ${MAX_FETCH_BYTES} bytes limit`,
      };
    }

    // Intentar decodificar como UTF-8 primero; si falla, latin1
    let text: string;
    try {
      const dec = new TextDecoder(encoding === "auto" ? "utf-8" : encoding, { fatal: false });
      text = dec.decode(ab);
      // Heurística: si abundan los caracteres reemplazo, probar latin1
      const replacements = (text.match(/�/g) || []).length;
      if (encoding !== "latin1" && replacements > text.length * 0.005) {
        text = new TextDecoder("latin1").decode(ab);
        encoding = "latin1";
      }
    } catch {
      text = new TextDecoder("latin1").decode(ab);
      encoding = "latin1";
    }

    // Quitar BOM si está
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

    // Saltar filas iniciales si se piden
    const allRows = splitCsvRows(text);
    if (allRows.length === 0) {
      return { ok: false, url, error: "empty_csv" };
    }
    const skip = opts.skipRows ?? 0;
    const trimmed = allRows.slice(skip);
    if (trimmed.length === 0) {
      return { ok: false, url, error: "all_rows_skipped" };
    }

    // Detectar separador en la primera fila
    const sep = opts.separator ?? detectSeparator(trimmed[0]);
    const headerCells = parseLine(trimmed[0], sep).map((h) => h.trim());
    const dataRows = trimmed.slice(1);
    const limit = opts.limit ?? dataRows.length;
    const truncated = limit < dataRows.length;
    const limited = dataRows.slice(0, limit);

    // Parsear cada fila
    const parsedRows: string[][] = limited.map((r) => parseLine(r, sep));

    // Inferir tipos por columna
    const fields: CSVField[] = headerCells.map((name, idx) => {
      const colValues = parsedRows.map((r) => r[idx] ?? "");
      const { type, fillRate } = inferFieldType(colValues);
      return { name, type, fillRate };
    });

    // Convertir filas a objetos tipados
    const rowObjects = parsedRows.map((cells) => {
      const obj: Record<string, string | number | boolean | null> = {};
      headerCells.forEach((name, idx) => {
        const raw = cells[idx] ?? "";
        if (!opts.inferTypes) {
          obj[name] = raw === "" ? null : raw;
          return;
        }
        const f = fields[idx];
        if (raw === "") {
          obj[name] = null;
        } else if (f.type === "number") {
          obj[name] = tryParseNumber(raw);
        } else if (f.type === "date") {
          obj[name] = tryParseDate(raw);
        } else if (f.type === "boolean") {
          obj[name] = /^(true|sí|si|s)$/i.test(raw);
        } else {
          obj[name] = raw;
        }
      });
      return obj;
    });

    return {
      ok: true,
      url,
      rows: rowObjects,
      fields,
      totalRows: dataRows.length,
      header: headerCells,
      separator: sep === "\t" ? "TAB" : sep,
      encoding,
      truncated,
      fetchedBytes: bytes,
      fetchedAt: new Date().toISOString(),
    };
  } catch (err) {
    clearTimeout(timer);
    return {
      ok: false,
      url,
      error: (err as Error).name === "AbortError" ? "timeout" : "fetch_failed",
      detail: (err as Error).message?.slice(0, 200),
    };
  }
}
