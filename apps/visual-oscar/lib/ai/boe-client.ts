/**
 * Cliente para la API pública del BOE (Boletín Oficial del Estado).
 *
 * Sin auth, gratis, sin rate limit duro. Endpoints:
 *   · /datosabiertos/api/boe/sumario/{YYYYMMDD} — sumario de un día
 *   · /datosabiertos/api/legislacion-consolidada/... — leyes consolidadas
 *
 * Para el chat usamos principalmente el sumario diario, que nos da TODAS
 * las normas publicadas (departamento, sección, título, URL al PDF).
 * Filtramos por keywords en el título cuando el usuario pregunta sobre
 * un tema concreto.
 *
 * Caché in-memory por día (TTL 1h, ya que el BOE no se modifica una vez
 * publicado).
 */

const BOE_BASE = "https://www.boe.es/datosabiertos/api";

interface BoeItem {
  identificador: string;
  titulo: string;
  url_pdf?: string;
  url_html?: string;
  departamento?: string;
  rango?: string;
  seccion?: string;
  fecha_publicacion?: string;
  fecha_disposicion?: string;
  numero_oficial?: string;
}

interface BoeRawItem {
  identificador?: string;
  titulo?: string;
  url_pdf?: { texto?: string } | string;
  url_html?: string;
  departamento?: { nombre?: string; texto?: string } | string;
  rango?: { nombre?: string; texto?: string } | string;
  fecha_publicacion?: string;
  fecha_disposicion?: string;
  numero_oficial?: string;
}

interface BoeSumarioResponse {
  status?: { code?: string; text?: string };
  data?: {
    sumario?: {
      metadatos?: { publicacion?: string; fecha_publicacion?: string };
      diario?: Array<{
        numero?: string;
        sumario_diario?: { identificador?: string; url_pdf?: { texto?: string } };
        seccion?: BoeSection | BoeSection[];
      }>;
    };
  };
}

interface BoeSection {
  codigo?: string;
  nombre?: string;
  texto?: string;
  departamento?: BoeDepartamento | BoeDepartamento[];
  // Algunos sumarios tienen items directamente en sección
  item?: BoeRawItem | BoeRawItem[];
}

interface BoeDepartamento {
  codigo?: string;
  nombre?: string;
  texto?: string;
  epigrafe?: BoeEpigrafe | BoeEpigrafe[];
  item?: BoeRawItem | BoeRawItem[];
}

interface BoeEpigrafe {
  nombre?: string;
  texto?: string;
  item?: BoeRawItem | BoeRawItem[];
}

// ─── Cache in-memory por fecha (TTL 1h) ────────────────────────────────

interface CacheEntry {
  items: BoeItem[];
  builtAt: number;
}
const _cache = new Map<string, CacheEntry>();
const TTL_MS = 60 * 60 * 1000;

// ─── Helpers ────────────────────────────────────────────────────────────

function ensureArray<T>(x: T | T[] | undefined): T[] {
  if (x == null) return [];
  return Array.isArray(x) ? x : [x];
}

function unwrap(field: { texto?: string; nombre?: string } | string | undefined): string {
  if (!field) return "";
  if (typeof field === "string") return field;
  return field.texto || field.nombre || "";
}

function unwrapUrl(field: { texto?: string } | string | undefined): string {
  if (!field) return "";
  if (typeof field === "string") return field;
  return field.texto || "";
}

/**
 * Aplana el árbol de secciones del sumario en una lista de items normalizados.
 */
function flattenSumario(json: BoeSumarioResponse): BoeItem[] {
  const items: BoeItem[] = [];
  const diario = json.data?.sumario?.diario;
  if (!diario) return items;
  const fechaPub = json.data?.sumario?.metadatos?.fecha_publicacion;

  for (const d of diario) {
    const seccionList = ensureArray(d.seccion);
    for (const seccion of seccionList) {
      const seccionNombre = unwrap(seccion);

      // Items directos en sección
      for (const item of ensureArray(seccion.item)) {
        items.push(normalizeItem(item, seccionNombre, "", fechaPub));
      }

      // Items dentro de departamento
      for (const dep of ensureArray(seccion.departamento)) {
        const depNombre = unwrap(dep);
        for (const item of ensureArray(dep.item)) {
          items.push(normalizeItem(item, seccionNombre, depNombre, fechaPub));
        }
        // Items dentro de epígrafe del departamento
        for (const ep of ensureArray(dep.epigrafe)) {
          for (const item of ensureArray(ep.item)) {
            items.push(normalizeItem(item, seccionNombre, depNombre, fechaPub));
          }
        }
      }
    }
  }

  return items;
}

function normalizeItem(
  raw: BoeRawItem,
  seccion: string,
  departamento: string,
  fechaPub?: string
): BoeItem {
  return {
    identificador: raw.identificador || "",
    titulo: (raw.titulo || "").trim(),
    url_pdf: unwrapUrl(raw.url_pdf),
    url_html: raw.identificador ? `https://www.boe.es/diario_boe/txt.php?id=${raw.identificador}` : undefined,
    departamento: departamento || unwrap(raw.departamento),
    rango: unwrap(raw.rango),
    seccion,
    fecha_publicacion: fechaPub,
    fecha_disposicion: raw.fecha_disposicion,
    numero_oficial: raw.numero_oficial,
  };
}

// ─── API pública ────────────────────────────────────────────────────────

/**
 * Fecha en formato YYYYMMDD.
 */
function toBoeDate(date: Date): string {
  return (
    date.getFullYear().toString() +
    String(date.getMonth() + 1).padStart(2, "0") +
    String(date.getDate()).padStart(2, "0")
  );
}

/**
 * Devuelve todos los items del sumario del BOE para una fecha (o hoy).
 * Cacheado 1h.
 */
export async function getBoeSumario(date?: Date): Promise<BoeItem[]> {
  const d = date ?? new Date();
  const ymd = toBoeDate(d);

  const cached = _cache.get(ymd);
  if (cached && Date.now() - cached.builtAt < TTL_MS) {
    return cached.items;
  }

  try {
    const res = await fetch(`${BOE_BASE}/boe/sumario/${ymd}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(6000),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const json = (await res.json()) as BoeSumarioResponse;
    const items = flattenSumario(json);
    _cache.set(ymd, { items, builtAt: Date.now() });
    return items;
  } catch {
    return [];
  }
}

/**
 * Busca normas del BOE de los últimos N días que contengan keyword(s)
 * en el título. Devuelve un máximo de `limit` items ordenados por fecha
 * descendente.
 *
 * Si el BOE no devuelve datos para una fecha (festivos, fines de semana),
 * lo salta silenciosamente.
 */
export async function searchBoeRecent(
  keywords: string,
  daysBack: number = 14,
  limit: number = 10
): Promise<BoeItem[]> {
  const kws = keywords
    .toLowerCase()
    .split(/[ ,;|]+/)
    .filter((k) => k.length >= 3);

  const allItems: BoeItem[] = [];
  const today = new Date();

  // Fetch en paralelo (capado en 7 días concurrentes para no saturar)
  const fetches: Promise<BoeItem[]>[] = [];
  for (let i = 0; i < Math.min(daysBack, 30); i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    fetches.push(getBoeSumario(d));
  }

  const results = await Promise.all(fetches);
  for (const dayItems of results) {
    allItems.push(...dayItems);
  }

  if (kws.length === 0) {
    return allItems.slice(0, limit);
  }

  // Filtra por al menos UN keyword en título o departamento
  const filtered = allItems.filter((item) => {
    const haystack = (item.titulo + " " + (item.departamento || "")).toLowerCase();
    return kws.some((k) => haystack.includes(k));
  });

  return filtered.slice(0, limit);
}

/**
 * Devuelve un resumen compacto de los items del BOE para entregar a Claude.
 */
export function formatBoeItemsForLLM(items: BoeItem[]): string {
  if (items.length === 0) {
    return "Sin resultados en el BOE para esos criterios.";
  }
  return JSON.stringify(
    {
      total: items.length,
      items: items.map((i) => ({
        id: i.identificador,
        fecha: i.fecha_publicacion,
        rango: i.rango,
        departamento: i.departamento,
        titulo: i.titulo.length > 200 ? i.titulo.slice(0, 200) + "…" : i.titulo,
        url: i.url_html,
      })),
    },
    null,
    0
  );
}
