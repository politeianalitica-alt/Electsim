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
import type Anthropic from "@anthropic-ai/sdk";

// ─── Definiciones de tools (schema para Claude) ────────────────────────

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
      "Devuelve actividad legislativa reciente (BOE, votaciones del Congreso, " +
      "tramitación de leyes). Filtrable por tema (vivienda, energía, etc.) y " +
      "tipo (boe, congreso, eur_lex). Útil para preguntas sobre leyes en trámite.",
    input_schema: {
      type: "object",
      properties: {
        topic: { type: "string", description: "Tema/sector (opcional)." },
        tipo: {
          type: "string",
          enum: ["boe", "congreso", "eur_lex", "todas"],
          description: "Tipo de fuente legislativa (default 'todas').",
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

async function execGetActorProfile(input: { nombre: string }): Promise<ToolResult> {
  const data = await fetchInternal<{ items?: ActorRow[] } | ActorRow[]>("/api/actores");
  if (!data) return "No hay datos del backend disponibles para buscar actores.";
  const arr = Array.isArray(data) ? data : data.items ?? [];
  const needle = input.nombre.toLowerCase().trim();
  const found = arr.find(
    (a) => (a.nombre || a.name || "").toLowerCase().includes(needle)
  );
  if (!found) {
    return `Actor "${input.nombre}" no encontrado en la base de ${arr.length} actores. Sugerencia: revisa el nombre exacto en /mapa-actores.`;
  }
  return JSON.stringify(
    {
      nombre: found.nombre || found.name,
      partido: found.partido || found.party,
      rol: found.rol || found.role,
      exposicion_24h: found.exposicion,
      sentimiento: found.sentimiento,
      menciones_24h: found.mencion_24h,
      menciones_7d: found.mencion_7d,
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
  tipo?: string;
}): Promise<ToolResult> {
  const data = await fetchInternal<unknown>("/api/huella-legislativa");
  if (!data) return "No hay datos legislativos disponibles.";
  // Estructura puede variar; devolvemos truncado para que Claude lo parsee
  const str = JSON.stringify(data);
  return JSON.stringify(
    {
      topic_filter: input.topic ?? null,
      tipo_filter: input.tipo ?? "todas",
      data_preview: str.slice(0, 1500) + (str.length > 1500 ? "...[truncado]" : ""),
    },
    null,
    0
  );
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
        return await execGetLegislativeActivity(input as { topic?: string; tipo?: string });
      case "get_narrative_trends":
        return await execGetNarrativeTrends(input as { limit?: number });
      case "get_coalition_status":
        return await execGetCoalitionStatus();
      default:
        return `Tool desconocida: ${name}`;
    }
  } catch (err) {
    return `Error ejecutando tool ${name}: ${(err as Error).message}`;
  }
}
