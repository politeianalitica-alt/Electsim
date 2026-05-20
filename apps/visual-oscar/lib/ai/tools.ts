/**
 * Definiciones de tools (function calling) que Claude puede invocar
 * desde el chat del Brain. Cada tool es una función backend que ejecuta
 * una consulta concreta y devuelve datos compactos.
 *
 * Flujo:
 *   1. Usuario pregunta algo específico ("¿qué leyes de vivienda hay
 *      activas en el Congreso?")
 *   2. Claude detecta que necesita más datos que los del contexto y
 *      llama a la tool `get_legislative({ topic: "vivienda" })`
 *   3. Ejecutamos la tool, devolvemos resultado
 *   4. Claude integra el resultado en su respuesta final
 *
 * Las tools se definen siguiendo el formato de Anthropic Messages API.
 * El ejecutor (executeTool) hace el dispatch a las funciones reales,
 * que a su vez llaman al backend FastAPI con fallback graceful.
 */

import { backendUrl, backendConfigured } from "../backend";
import { searchBoeRecent, getBoeSumario, formatBoeItemsForLLM } from "./boe-client";
import type Anthropic from "@anthropic-ai/sdk";

// ─── Definiciones de tools (schema para Claude) ────────────────────────

// Server tool de Anthropic — web search nativo. Anthropic ejecuta la
// búsqueda server-side y devuelve resultados como bloques `web_search_tool_result`.
// Se incluye al final del array junto a nuestras tools custom.
//
// Limitamos a 3 búsquedas por respuesta para controlar coste (cada búsqueda
// añade ~$0.01 al input según pricing).
export const WEB_SEARCH_TOOL: Anthropic.Messages.WebSearchTool20260209 = {
  type: "web_search_20260209",
  name: "web_search",
  max_uses: 3,
};

export const BRAIN_TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: "get_actor_profile",
    description:
      "Obtiene el perfil detallado de un actor político específico por nombre " +
      "(ej: 'Núñez Feijóo', 'Yolanda Díaz', 'Ayuso'). Devuelve partido, rol, " +
      "exposición mediática 24h, sentimiento, menciones, y eventos recientes.",
    input_schema: {
      type: "object",
      properties: {
        nombre: {
          type: "string",
          description: "Nombre del actor político (puede ser nombre o apellido).",
        },
      },
      required: ["nombre"],
    },
  },
  {
    name: "search_news",
    description:
      "Busca titulares recientes filtrados por tema, partido o keyword. " +
      "Útil para preguntas tipo 'qué dicen los medios sobre X' o " +
      "'titulares sobre vivienda esta semana'.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Tema, partido o keyword a buscar." },
        limit: { type: "number", description: "Número máximo de titulares (default 5)." },
      },
      required: ["query"],
    },
  },
  {
    name: "get_polls",
    description:
      "Devuelve la última encuesta consolidada (media de 14 casas encuestadoras) " +
      "con intención de voto, escaños estimados y delta vs encuesta anterior. " +
      "Útil para preguntas tipo 'cómo va la encuesta', 'última intención de voto'.",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_risk_breakdown",
    description:
      "Devuelve el desglose del Índice de Riesgo Político (6 dimensiones: " +
      "institucional, electoral, geopolítico, económico, mediático, social) " +
      "con score por dimensión y deltas. Útil para preguntas tipo 'cómo está el " +
      "riesgo', '¿qué dimensión ha subido más?'.",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_alert_details",
    description:
      "Devuelve el detalle completo de las alertas activas críticas (categoría, " +
      "descripción, fuente, timestamp, severidad). Útil para 'cuáles son las " +
      "alertas críticas', 'qué pasa esta mañana'.",
    input_schema: {
      type: "object",
      properties: {
        nivel: {
          type: "string",
          enum: ["todas", "rojo", "naranja", "amarillo"],
          description: "Filtro por nivel de severidad. Default 'todas'.",
        },
      },
    },
  },
  {
    name: "get_legislative_activity",
    description:
      "Devuelve normas publicadas en el BOE (Boletín Oficial del Estado) " +
      "de los últimos 14 días filtradas por keyword. SIEMPRE úsala para " +
      "preguntas tipo 'normas BOE sobre X', 'últimas leyes de Y', " +
      "'qué dice el BOE de vivienda', 'tramitación de Z'. Datos reales " +
      "vía API pública del BOE — no inventes nada, llama esta tool.",
    input_schema: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          description:
            "Tema/keyword a buscar en títulos de normas (ej: 'vivienda', " +
            "'energía', 'IA', 'inmigración', 'fiscal'). Puede ser varios " +
            "separados por espacios.",
        },
        days_back: {
          type: "number",
          description: "Cuántos días atrás buscar (default 14, max 30).",
        },
        limit: {
          type: "number",
          description: "Número máximo de normas a devolver (default 8).",
        },
      },
      required: ["topic"],
    },
  },
  {
    name: "get_boe_today",
    description:
      "Devuelve TODAS las normas publicadas en el BOE del día actual " +
      "(o de una fecha específica). Útil para preguntas tipo 'qué hay " +
      "hoy en el BOE', 'normas publicadas esta mañana', 'sumario BOE'. " +
      "Datos reales vía API pública del BOE.",
    input_schema: {
      type: "object",
      properties: {
        fecha: {
          type: "string",
          description:
            "Fecha en formato YYYY-MM-DD (opcional, default hoy). Ejemplo: '2026-05-20'.",
        },
        limit: {
          type: "number",
          description: "Número máximo de items a devolver (default 15).",
        },
      },
    },
  },
  {
    name: "get_narrative_trends",
    description:
      "Devuelve las narrativas en aceleración (top temas detectados con " +
      "velocidad de propagación, drivers, canales). Útil para 'qué está " +
      "subiendo en redes', 'narrativas calientes'.",
    input_schema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Número máximo (default 5)." },
      },
    },
  },
  {
    name: "get_coalition_status",
    description:
      "Devuelve el estado del gobierno de coalición (estabilidad, tensiones, " +
      "votaciones recientes, posición de Junts/PNV/ERC/Bildu). Útil para " +
      "preguntas sobre la coalición progresista.",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_morning_briefing",
    description:
      "Devuelve el briefing matinal del día completo (resumen ejecutivo, " +
      "nota del analista, 3 preguntas clave, score de riesgo). Úsala cuando " +
      "el usuario pregunta '¿qué pasa hoy?', 'resumen del día', 'briefing'.",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "compare_parties",
    description:
      "Compara dos partidos políticos en intención de voto, escaños y delta. " +
      "Útil cuando el usuario pide 'compara X y Y' o 'PP vs PSOE'.",
    input_schema: {
      type: "object",
      properties: {
        p1: { type: "string", description: "Primer partido (siglas o nombre)." },
        p2: { type: "string", description: "Segundo partido." },
      },
      required: ["p1", "p2"],
    },
  },
  {
    name: "get_calendar",
    description:
      "Devuelve los próximos eventos políticos en una ventana de días " +
      "(votaciones, plenos, citas institucionales). Útil para 'qué viene esta " +
      "semana', 'agenda parlamentaria'.",
    input_schema: {
      type: "object",
      properties: {
        days: { type: "number", description: "Ventana en días (default 7, max 30)." },
      },
    },
  },
  {
    name: "get_territory_status",
    description:
      "Devuelve el estado de una Comunidad Autónoma específica (riesgo, " +
      "narrativas, actores). Útil para 'cómo va Cataluña', 'qué pasa en " +
      "Andalucía'.",
    input_schema: {
      type: "object",
      properties: {
        ccaa: { type: "string", description: "Nombre de la CCAA (ej: 'Cataluña', 'Madrid')." },
      },
      required: ["ccaa"],
    },
  },
];

// ─── Executor de tools ──────────────────────────────────────────────────
//
// Cada tool tiene un implementador async que devuelve un string (o JSON
// stringified) compacto para Claude. Si la tool falla o el backend no
// está disponible, devolvemos un mensaje claro para que Claude pueda
// informarle al usuario.

async function fetchInternal<T = unknown>(path: string, timeoutMs = 5000): Promise<T | null> {
  if (!backendConfigured()) return null;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(`${backendUrl()}${path}`, {
      signal: ctrl.signal,
      cache: "no-store",
      headers: process.env.BACKEND_API_KEY
        ? { "X-API-Key": process.env.BACKEND_API_KEY }
        : {},
    });
    clearTimeout(t);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

type ToolResult = string;

interface ActorRow {
  nombre?: string;
  name?: string;
  partido?: string;
  party?: string;
  rol?: string;
  role?: string;
  exposicion?: number;
  sentimiento?: string;
  mencion_24h?: number;
  mencion_7d?: number;
}

/**
 * Normaliza un string: lowercase, sin tildes/diacríticos, sin puntuación.
 * Permite que "ayuso" matchee con "Isabel Díaz Ayuso", o "feijoo" con "Feijóo".
 */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove diacritics (combining marks)
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Fuzzy score: cuántos tokens del needle aparecen en el haystack
 * (normalizados). Útil para "ayuso" → "Isabel Díaz Ayuso".
 */
function fuzzyScore(needle: string, haystack: string): number {
  const n = normalize(needle);
  const h = normalize(haystack);
  if (h.includes(n)) return 100; // exact substring match
  const nTokens = n.split(" ");
  const hTokens = new Set(h.split(" "));
  const matched = nTokens.filter((t) => hTokens.has(t)).length;
  return Math.round((matched / nTokens.length) * 80); // partial: 0-80
}

async function execGetActorProfile(input: { nombre: string }): Promise<ToolResult> {
  const data = await fetchInternal<{ items?: ActorRow[] } | ActorRow[]>("/api/actores");
  if (!data) return "No hay datos del backend disponibles para buscar actores.";
  const arr = Array.isArray(data) ? data : data.items ?? [];

  // Fuzzy match con score: aceptamos cualquier match >= 50
  const ranked = arr
    .map((a) => ({
      actor: a,
      score: Math.max(
        fuzzyScore(input.nombre, a.nombre || a.name || ""),
        fuzzyScore(input.nombre, (a.partido || a.party || "") + " " + (a.nombre || a.name || "")),
      ),
    }))
    .filter((r) => r.score >= 50)
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 0) {
    // Sugerir 3 actores que CASI matchean (score 20-49)
    const fuzzy = arr
      .map((a) => ({ actor: a, score: fuzzyScore(input.nombre, a.nombre || a.name || "") }))
      .filter((r) => r.score >= 20)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((r) => r.actor.nombre || r.actor.name);
    const sugerencias = fuzzy.length > 0
      ? ` Sugerencias parecidas: ${fuzzy.join(", ")}.`
      : "";
    return `Actor "${input.nombre}" no encontrado entre ${arr.length} actores.${sugerencias} Para búsqueda visual, /mapa-actores.`;
  }

  const found = ranked[0].actor;
  return JSON.stringify(
    {
      nombre: found.nombre || found.name,
      partido: found.partido || found.party,
      rol: found.rol || found.role,
      exposicion_24h: found.exposicion,
      sentimiento: found.sentimiento,
      menciones_24h: found.mencion_24h,
      menciones_7d: found.mencion_7d,
      match_score: ranked[0].score,
    },
    null,
    0
  );
}

// ─── Tools nuevas ───────────────────────────────────────────────────────

async function execGetMorningBriefing(): Promise<ToolResult> {
  const data = await fetchInternal<{
    executive_summary?: string;
    analyst_note?: string;
    three_questions?: string[];
    risk_score?: number;
    last_updated?: string;
  }>("/api/briefings/morning?workspace_id=default");
  if (!data) return "Briefing matinal no disponible.";
  return JSON.stringify(
    {
      executive_summary: data.executive_summary?.slice(0, 800),
      analyst_note: data.analyst_note?.slice(0, 400),
      three_questions: data.three_questions,
      risk_score: data.risk_score,
      last_updated: data.last_updated,
    },
    null,
    0
  );
}

async function execCompareParties(input: { p1: string; p2: string }): Promise<ToolResult> {
  const data = await fetchInternal<{
    parties?: Array<{
      siglas?: string;
      nombre?: string;
      intencion_voto?: number;
      escanos?: number;
      delta_intencion?: number;
    }>;
  }>("/api/dashboard/home");
  if (!data?.parties) return "No hay datos de partidos disponibles.";

  const findParty = (q: string) => {
    const target = normalize(q);
    return data.parties!.find(
      (p) =>
        normalize(p.siglas || "") === target ||
        normalize(p.nombre || "").includes(target) ||
        normalize(p.siglas || "").includes(target)
    );
  };

  const a = findParty(input.p1);
  const b = findParty(input.p2);
  if (!a || !b) {
    return `Partido no encontrado: ${!a ? input.p1 : ""} ${!b ? input.p2 : ""}. Partidos disponibles: ${data.parties.map((p) => p.siglas).filter(Boolean).join(", ")}`;
  }

  const gap = (a.intencion_voto ?? 0) - (b.intencion_voto ?? 0);
  return JSON.stringify(
    {
      partido_1: {
        siglas: a.siglas,
        intencion: a.intencion_voto,
        escanos: a.escanos,
        delta: a.delta_intencion,
      },
      partido_2: {
        siglas: b.siglas,
        intencion: b.intencion_voto,
        escanos: b.escanos,
        delta: b.delta_intencion,
      },
      diferencia_intencion_pp: gap.toFixed(1),
      lider: gap > 0 ? a.siglas : b.siglas,
      diferencia_escanos: Math.abs((a.escanos ?? 0) - (b.escanos ?? 0)),
    },
    null,
    0
  );
}

async function execGetCalendar(input: { days?: number }): Promise<ToolResult> {
  const days = Math.min(input.days ?? 7, 30);
  // El backend tiene agenda en varios endpoints; intentamos varios
  const data =
    (await fetchInternal<{ events?: unknown[] }>(`/api/agenda?days=${days}`)) ||
    (await fetchInternal<{ items?: unknown[] }>("/api/eventos/proximos"));
  if (!data) return "No hay datos de agenda institucional disponibles.";
  const events =
    (data as { events?: unknown[]; items?: unknown[] }).events ??
    (data as { items?: unknown[] }).items ??
    [];
  return JSON.stringify(
    {
      ventana_dias: days,
      total_eventos: events.length,
      eventos: events.slice(0, 10),
    },
    null,
    0
  );
}

async function execGetTerritoryStatus(input: { ccaa: string }): Promise<ToolResult> {
  // No tenemos un endpoint específico por CCAA; usamos datos generales
  // y filtramos. El backend puede tener algo en /api/territorio o
  // /api/ccaa/[id].
  const ccaaNorm = normalize(input.ccaa);
  const data =
    (await fetchInternal<{ ccaa?: unknown[] }>("/api/territorio")) ||
    (await fetchInternal<unknown>(`/api/ccaa/${encodeURIComponent(input.ccaa)}`));
  if (!data) {
    return `No hay datos territoriales específicos para "${input.ccaa}" en este momento. Sugerencia: revisa el mapa territorial en /dashboard.`;
  }
  const str = JSON.stringify(data);
  return JSON.stringify(
    {
      ccaa_query: input.ccaa,
      ccaa_normalized: ccaaNorm,
      data_preview: str.slice(0, 1500) + (str.length > 1500 ? "...[truncado]" : ""),
    },
    null,
    0
  );
}

async function execSearchNews(input: { query: string; limit?: number }): Promise<ToolResult> {
  const data = await fetchInternal<{
    news_pulse?: Array<{ titulo?: string; title?: string; medio?: string; source?: string; sentimiento?: number }>;
  }>("/api/dashboard/home");
  if (!data?.news_pulse) return "No hay datos de pulso de prensa disponibles.";
  const limit = input.limit ?? 5;
  const q = input.query.toLowerCase();
  const filtered = data.news_pulse
    .filter((n) =>
      ((n.titulo || n.title || "") + " " + (n.medio || n.source || ""))
        .toLowerCase()
        .includes(q)
    )
    .slice(0, limit)
    .map((n) => ({
      titulo: n.titulo || n.title,
      medio: n.medio || n.source,
      sentimiento: n.sentimiento,
    }));
  if (filtered.length === 0) return `Sin titulares encontrados con keyword "${input.query}".`;
  return JSON.stringify({ query: input.query, results: filtered }, null, 0);
}

async function execGetPolls(): Promise<ToolResult> {
  const data = await fetchInternal<{
    parties?: Array<{
      siglas?: string;
      nombre?: string;
      intencion_voto?: number;
      escanos?: number;
      delta_intencion?: number;
    }>;
  }>("/api/dashboard/home");
  if (!data?.parties) return "No hay datos de encuesta disponibles.";
  return JSON.stringify(
    {
      fuente: "Media de 14 casas encuestadoras",
      partidos: data.parties.map((p) => ({
        siglas: p.siglas || p.nombre,
        intencion_voto: p.intencion_voto,
        escanos: p.escanos,
        delta: p.delta_intencion,
      })),
    },
    null,
    0
  );
}

async function execGetRiskBreakdown(): Promise<ToolResult> {
  const data = await fetchInternal<{
    risk?: { score: number; semaforo: string; dimensiones?: unknown[] };
  }>("/api/dashboard/home");
  if (!data?.risk) return "No hay datos de riesgo disponibles.";
  return JSON.stringify(
    {
      score_total: data.risk.score,
      semaforo: data.risk.semaforo,
      dimensiones: data.risk.dimensiones ?? [],
    },
    null,
    0
  );
}

async function execGetAlertDetails(input: { nivel?: string }): Promise<ToolResult> {
  const data = await fetchInternal<{
    signals?: Array<{
      level?: string;
      nivel?: string;
      title?: string;
      titulo?: string;
      category?: string;
      categoria?: string;
      source?: string;
      ts?: string;
    }>;
  }>("/api/intelligence/signals?legacy=1");
  if (!data?.signals) return "No hay alertas disponibles.";
  const nivel = (input.nivel || "todas").toLowerCase();
  const filtered = data.signals.filter(
    (s) => nivel === "todas" || (s.level || s.nivel || "").toLowerCase().includes(nivel)
  );
  return JSON.stringify(
    {
      total: filtered.length,
      alertas: filtered.slice(0, 10).map((s) => ({
        nivel: s.level || s.nivel,
        titulo: s.title || s.titulo,
        categoria: s.category || s.categoria,
        fuente: s.source,
        ts: s.ts,
      })),
    },
    null,
    0
  );
}

async function execGetLegislativeActivity(input: {
  topic?: string;
  days_back?: number;
  limit?: number;
}): Promise<ToolResult> {
  const topic = (input.topic || "").trim();
  if (!topic) {
    return "Necesito un keyword/tema para buscar en el BOE. Ejemplo: 'vivienda', 'IA', 'energía'.";
  }
  const items = await searchBoeRecent(
    topic,
    Math.min(input.days_back ?? 14, 30),
    Math.min(input.limit ?? 8, 15)
  );
  return formatBoeItemsForLLM(items);
}

async function execGetBoeToday(input: { fecha?: string; limit?: number }): Promise<ToolResult> {
  let date: Date | undefined;
  if (input.fecha) {
    const m = input.fecha.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    }
  }
  const items = await getBoeSumario(date);
  const limited = items.slice(0, Math.min(input.limit ?? 15, 25));
  return formatBoeItemsForLLM(limited);
}

async function execGetNarrativeTrends(input: { limit?: number }): Promise<ToolResult> {
  const data = await fetchInternal<{
    items?: Array<{ topic?: string; categoria?: string; velocidad?: string; fuente?: string }>;
  } | Array<{ topic?: string; categoria?: string; velocidad?: string; fuente?: string }>>("/api/trends");
  if (!data) return "No hay datos de tendencias disponibles.";
  const arr = Array.isArray(data) ? data : data.items ?? [];
  return JSON.stringify(
    {
      tendencias: arr.slice(0, input.limit ?? 5).map((t) => ({
        topic: t.topic,
        categoria: t.categoria,
        velocidad: t.velocidad,
        fuente: t.fuente,
      })),
    },
    null,
    0
  );
}

async function execGetCoalitionStatus(): Promise<ToolResult> {
  const data = await fetchInternal<unknown>("/api/gobierno-coalicion");
  if (!data) return "No hay datos de coalición disponibles.";
  const str = JSON.stringify(data);
  return str.slice(0, 1500) + (str.length > 1500 ? "...[truncado]" : "");
}

// ─── Dispatch principal ──────────────────────────────────────────────────

export async function executeTool(
  name: string,
  input: Record<string, unknown>
): Promise<ToolResult> {
  // eslint-disable-next-line no-console
  console.log(`[ai-tool] ${name}(${JSON.stringify(input).slice(0, 100)})`);
  try {
    switch (name) {
      case "get_actor_profile":
        return await execGetActorProfile(input as { nombre: string });
      case "search_news":
        return await execSearchNews(input as { query: string; limit?: number });
      case "get_polls":
        return await execGetPolls();
      case "get_risk_breakdown":
        return await execGetRiskBreakdown();
      case "get_alert_details":
        return await execGetAlertDetails(input as { nivel?: string });
      case "get_legislative_activity":
        return await execGetLegislativeActivity(input as { topic?: string; days_back?: number; limit?: number });
      case "get_boe_today":
        return await execGetBoeToday(input as { fecha?: string; limit?: number });
      case "get_narrative_trends":
        return await execGetNarrativeTrends(input as { limit?: number });
      case "get_coalition_status":
        return await execGetCoalitionStatus();
      case "get_morning_briefing":
        return await execGetMorningBriefing();
      case "compare_parties":
        return await execCompareParties(input as { p1: string; p2: string });
      case "get_calendar":
        return await execGetCalendar(input as { days?: number });
      case "get_territory_status":
        return await execGetTerritoryStatus(input as { ccaa: string });
      default:
        return `Tool desconocida: ${name}`;
    }
  } catch (err) {
    return `Error ejecutando tool ${name}: ${(err as Error).message}`;
  }
}
