/**
 * Agregador de contexto en vivo para el chat del Brain.
 *
 * Llama en paralelo a las APIs internas más relevantes y construye un
 * texto compacto (~800-1500 tokens) que se inyecta como system prompt en
 * cada conversación, dándole a Claude visibilidad de los datos actuales:
 *
 *   · KPIs del dashboard (riesgo, alertas activas, volumen informativo)
 *   · Top 8 actores políticos por relevancia
 *   · Tendencias narrativas (5 más calientes)
 *   · Alertas críticas (top 5)
 *   · Última encuesta (PP, PSOE, VOX, Sumar, otros)
 *   · Score de riesgo + breakdown
 *   · Pulso de prensa (5 titulares más relevantes)
 *
 * Cache in-memory por TTL (5min) para evitar pegarle al backend en cada
 * mensaje del chat. La cache es global del proceso (cold-start friendly).
 */

import { backendUrl, backendConfigured } from "../backend";

interface CacheEntry {
  text: string;
  builtAt: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 min
let _cache: CacheEntry | null = null;

// ─── Helpers de fetch internos ──────────────────────────────────────────

async function fetchInternal<T = unknown>(path: string, timeoutMs = 4000): Promise<T | null> {
  // En runtime serverless de Vercel, las funciones API no pueden llamarse a
  // sí mismas vía HTTP fácilmente. Mejor llamamos al backend directamente
  // si está configurado, o devolvemos null y dejamos que el contexto se
  // construya con solo los datos disponibles.
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

// ─── Tipos compactos para los datos que extraemos ──────────────────────

interface KpiSnapshot {
  label: string;
  value: string | number;
  delta?: string;
  sub?: string;
}

interface ActorSnapshot {
  nombre: string;
  partido?: string;
  rol?: string;
  exposicion?: number;
  sentimiento?: string;
  mencion_24h?: number;
}

interface TrendSnapshot {
  topic: string;
  velocidad?: string;
  categoria?: string;
  fuente?: string;
}

interface AlertSnapshot {
  nivel: string;
  titulo: string;
  fuente?: string;
}

interface NewsSnapshot {
  titulo: string;
  medio: string;
  sentimiento?: number;
  partidos?: string;
}

// ─── Constructor del contexto ──────────────────────────────────────────

/**
 * Construye un texto compacto con los datos vivos del backend.
 * Devuelve string vacío si no hay datos accesibles (gracefully degrades).
 */
export async function buildLiveContext(): Promise<string> {
  // Cache hit
  if (_cache && Date.now() - _cache.builtAt < CACHE_TTL_MS) {
    return _cache.text;
  }

  // Si no hay backend, devolvemos un contexto mínimo con la fecha
  if (!backendConfigured()) {
    const minimal = buildMinimalContext();
    _cache = { text: minimal, builtAt: Date.now() };
    return minimal;
  }

  // Fetch en paralelo de todos los datos
  const [dashboard, actores, trends, alerts, briefing] = await Promise.all([
    fetchInternal<{
      kpis?: KpiSnapshot[];
      risk?: { score: number; semaforo: string };
      parties?: Array<{ siglas?: string; nombre?: string; intencion_voto?: number; escanos?: number; delta_intencion?: number }>;
      news_pulse?: NewsSnapshot[];
      last_updated?: string;
    }>("/api/dashboard/home"),
    fetchInternal<{ items?: ActorSnapshot[] } | ActorSnapshot[]>("/api/actores"),
    fetchInternal<{ items?: TrendSnapshot[] } | TrendSnapshot[]>("/api/trends"),
    fetchInternal<{ signals?: AlertSnapshot[] }>("/api/intelligence/signals?legacy=1"),
    fetchInternal<{ executive_summary?: string; analyst_note?: string }>(
      "/api/briefings/morning?workspace_id=default"
    ),
  ]);

  const sections: string[] = [];

  // Fecha y hora actuales (importante: Claude no sabe la fecha real)
  const now = new Date();
  const fecha = now.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const hora = now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  sections.push(`## CONTEXTO ACTUAL\nFecha: ${fecha}\nHora: ${hora}`);

  // Briefing ejecutivo del día (si hay)
  if (briefing?.executive_summary) {
    sections.push(`## BRIEFING DEL DÍA\n${briefing.executive_summary.slice(0, 500)}`);
  }

  // Riesgo + KPIs principales
  if (dashboard?.risk || dashboard?.kpis) {
    const lines: string[] = ["## KPIs ACTUALES"];
    if (dashboard.risk) {
      lines.push(
        `Riesgo Político: ${dashboard.risk.score}/100 (semáforo ${dashboard.risk.semaforo})`
      );
    }
    if (dashboard.kpis) {
      for (const k of dashboard.kpis.slice(0, 6)) {
        const delta = k.delta ? ` (${k.delta})` : "";
        lines.push(`- ${k.label}: ${k.value}${delta}`);
      }
    }
    sections.push(lines.join("\n"));
  }

  // Última encuesta consolidada
  if (dashboard?.parties && dashboard.parties.length > 0) {
    const lines = ["## ÚLTIMA ENCUESTA CONSOLIDADA (intención de voto)"];
    for (const p of dashboard.parties.slice(0, 8)) {
      const siglas = p.siglas || p.nombre || "?";
      const iv = p.intencion_voto != null ? `${p.intencion_voto.toFixed(1)}%` : "?";
      const esc = p.escanos != null ? ` (${p.escanos} esc.)` : "";
      const delta = p.delta_intencion != null ? ` Δ${p.delta_intencion > 0 ? "+" : ""}${p.delta_intencion.toFixed(1)}pp` : "";
      lines.push(`- ${siglas}: ${iv}${esc}${delta}`);
    }
    sections.push(lines.join("\n"));
  }

  // Top actores por relevancia
  const actoresArr = Array.isArray(actores) ? actores : actores?.items ?? [];
  if (actoresArr.length > 0) {
    const top = actoresArr
      .slice()
      .sort((a, b) => (b.exposicion ?? 0) - (a.exposicion ?? 0))
      .slice(0, 8);
    const lines = ["## ACTORES MÁS RELEVANTES (24h)"];
    for (const a of top) {
      const sent = a.sentimiento ? ` [${a.sentimiento}]` : "";
      const exp = a.exposicion != null ? ` exp=${a.exposicion}` : "";
      const men = a.mencion_24h != null ? ` ${a.mencion_24h} menc.` : "";
      lines.push(`- ${a.nombre}${a.partido ? ` (${a.partido})` : ""}${sent}${exp}${men}`);
    }
    sections.push(lines.join("\n"));
  }

  // Tendencias narrativas
  const trendsArr = Array.isArray(trends) ? trends : trends?.items ?? [];
  if (trendsArr.length > 0) {
    const lines = ["## TENDENCIAS NARRATIVAS (top 5)"];
    for (const t of trendsArr.slice(0, 5)) {
      const cat = t.categoria ? ` [${t.categoria}]` : "";
      const vel = t.velocidad ? ` velocidad=${t.velocidad}` : "";
      lines.push(`- ${t.topic}${cat}${vel}`);
    }
    sections.push(lines.join("\n"));
  }

  // Alertas críticas
  if (alerts?.signals && alerts.signals.length > 0) {
    const lines = ["## ALERTAS ACTIVAS (top 5)"];
    for (const a of alerts.signals.slice(0, 5)) {
      lines.push(`- [${a.nivel?.toUpperCase()}] ${a.titulo}${a.fuente ? ` · ${a.fuente}` : ""}`);
    }
    sections.push(lines.join("\n"));
  }

  // Pulso de prensa
  if (dashboard?.news_pulse && dashboard.news_pulse.length > 0) {
    const lines = ["## PULSO DE PRENSA (top 5 titulares)"];
    for (const n of dashboard.news_pulse.slice(0, 5)) {
      const sent =
        n.sentimiento != null
          ? n.sentimiento > 0.2
            ? " [+]"
            : n.sentimiento < -0.2
              ? " [-]"
              : " [neutro]"
          : "";
      lines.push(`- "${n.titulo}" · ${n.medio}${sent}`);
    }
    sections.push(lines.join("\n"));
  }

  // Última actualización
  if (dashboard?.last_updated) {
    sections.push(`Última ingesta de datos: ${dashboard.last_updated}`);
  }

  const text = sections.join("\n\n");
  _cache = { text, builtAt: Date.now() };
  return text;
}

/**
 * Contexto mínimo cuando no hay backend (solo fecha).
 */
function buildMinimalContext(): string {
  const now = new Date();
  const fecha = now.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const hora = now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  return [
    "## CONTEXTO ACTUAL",
    `Fecha: ${fecha}`,
    `Hora: ${hora}`,
    "",
    "## DATOS DEL BACKEND",
    "(No disponibles en este momento. Responde con tu conocimiento general sobre política española, indicando que no tienes datos en vivo.)",
  ].join("\n");
}

/**
 * Invalida el cache (útil tras un cron de refresh).
 */
export function invalidateContext(): void {
  _cache = null;
}
