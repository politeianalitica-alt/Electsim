/**
 * Catálogo de rutas conocidas del dashboard de Politeia + extractor de
 * rutas mencionadas en respuestas del Brain.
 *
 * Cuando Claude menciona algo como "Para más detalle: /huella-legislativa",
 * detectamos la ruta y renderizamos un botón CTA prominente "→ Huella
 * Legislativa" debajo del mensaje, que navega directamente al módulo.
 *
 * Si la ruta no está en el catálogo, mostramos un botón genérico con la
 * ruta como label.
 */

interface RouteInfo {
  label: string;
  description?: string;
  icon?: string;
}

export const KNOWN_ROUTES: Record<string, RouteInfo> = {
  // Home / dashboard general
  "/dashboard": { label: "Dashboard", description: "Vista ejecutiva principal", icon: "🏠" },
  "/": { label: "Inicio", icon: "🏠" },

  // Riesgo y crisis
  "/riesgo": { label: "Termómetro de Riesgo", description: "Índice de riesgo político (6 dimensiones)", icon: "🌡" },
  "/crisis": { label: "Crisis Intelligence", description: "Monitor de crisis activa", icon: "⚠" },
  "/deteccion-ataques": { label: "Detección de Ataques", description: "Ataques narrativos en curso", icon: "🛡" },

  // Actores y mapa
  "/mapa-actores": { label: "Mapa de Actores", description: "399 actores · relaciones · métricas de red", icon: "🗺" },
  "/actores": { label: "Actores", description: "Catálogo de actores políticos", icon: "👥" },
  "/adversarios": { label: "Inteligencia Adversarios", description: "Perfiles estratégicos rivales", icon: "🎯" },

  // Medios
  "/prensa": { label: "Pulso de Prensa", description: "Titulares + sentimiento", icon: "📰" },
  "/medios-narrativa": { label: "Mapa de Medios", description: "Narrativa por cabecera", icon: "📡" },
  "/desinformacion": { label: "Desinformación", description: "Bulos detectados + paciente cero", icon: "🔍" },
  "/ataques-narrativos": { label: "Desinformación", description: "Bulos detectados", icon: "🔍" }, // legacy alias

  // Electoral
  "/nowcasting": { label: "Módulo Electoral", description: "Estimación electoral en tiempo real", icon: "📊" },
  "/escenarios": { label: "Simulador Estratégico", description: "Escenarios de coalición", icon: "🎲" },
  "/microdatos": { label: "Perfiles de Votante", description: "Microdatos demográficos", icon: "📈" },

  // Geopolítica y macro
  "/geopolitica": { label: "Geopolítica y RRII", description: "OSINT + presencia internacional", icon: "🌍" },
  "/macro": { label: "Macro & Economía", description: "Indicadores macroeconómicos", icon: "💹" },

  // Legislativo y normativo
  "/huella-legislativa": { label: "Huella Legislativa", description: "BOE · Congreso · EUR-Lex", icon: "📜" },
  "/legislativo": { label: "Monitor Legislativo", icon: "📜" },
  "/monitor-legislativo": { label: "Monitor Legislativo", icon: "📜" },

  // Contratación
  "/licitaciones": { label: "Licitaciones", description: "Oportunidades de contratación pública", icon: "💼" },
  "/adjudicaciones": { label: "Adjudicaciones", description: "Inteligencia sobre adjudicaciones", icon: "📋" },
  "/contratos-vigentes": { label: "Contratos Vigentes", icon: "📋" },

  // Alertas e inteligencia
  "/alertas": { label: "Alertas", description: "Sala de Control · señales críticas", icon: "🚨" },
  "/inteligencia": { label: "Inteligencia", icon: "🧠" },

  // Workspaces
  "/workspaces": { label: "Workspaces", description: "Espacios de trabajo", icon: "📁" },
  "/workspaces/ws_espana_2026/overview": {
    label: "Workspace España 2026",
    description: "Overview ejecutivo + 10 secciones",
    icon: "🇪🇸",
  },

  // Estudio
  "/estudio": { label: "Estudio Politeia", description: "Centro de operaciones del analista", icon: "🎯" },
  "/war-room": { label: "War Room", description: "Sala de operaciones", icon: "⚔" },

  // Termómetro / IA
  "/termometro": { label: "Termómetro", icon: "🌡" },
  "/agente-ia": { label: "Agente IA", description: "Chat completo con el Brain", icon: "🤖" },

  // Sectoriales
  "/sector-energia": { label: "Sector Energía & Utilities", icon: "⚡" },
  "/sector-farma": { label: "Sector Farma & Salud", icon: "💊" },
  "/sector-defensa": { label: "Sector Defensa & Industria", icon: "🛡" },
  "/sector-vivienda": { label: "Sector Vivienda", icon: "🏘" },
  "/sector-banca": { label: "Sector Banca & Seguros", icon: "🏦" },
  "/sector-agro": { label: "Sector Agro", icon: "🌾" },
  "/sector-telecom": { label: "Sector Telecom & Digital", icon: "📡" },
  "/sector-infraestructuras": { label: "Sector Infraestructuras", icon: "🛣" },
  "/sector-turismo": { label: "Sector Turismo", icon: "🏖" },

  // Fondos europeos
  "/fondos-europeos": { label: "Fondos Europeos", icon: "💶" },
};

/**
 * Extrae rutas únicas mencionadas en un texto. Match `/` + alfanum/guiones.
 * Devuelve un array deduplicado en orden de aparición.
 */
export function extractRoutes(text: string): string[] {
  // Regex: / seguido de [a-z0-9_-]+ y opcionales segmentos /[a-z0-9_-]+
  // Termina antes de ./ ,? ; ) ] espacio o fin de string
  const ROUTE_REGEX = /\/[a-z][a-z0-9_-]*(?:\/[a-z][a-z0-9_-]*)*/gi;
  const matches = text.match(ROUTE_REGEX) || [];
  // Limpia trailing slashes y filtra rutas evidentemente no de la app
  // (URLs externas, paths absolutos de sistema, etc.)
  const cleaned = matches
    .map((r) => r.replace(/\/+$/, ""))
    .filter((r) => r.length > 1 && !r.includes("//") && !r.startsWith("/usr") && !r.startsWith("/var"));
  // Dedupe preservando orden
  return Array.from(new Set(cleaned));
}

/**
 * Devuelve la info de display de una ruta (label + descripción).
 * Si la ruta no está en el catálogo, intenta inferir el label del último
 * segmento (p.ej. /sector-nuevo → "Sector Nuevo").
 */
export function getRouteInfo(route: string): RouteInfo {
  if (KNOWN_ROUTES[route]) return KNOWN_ROUTES[route];

  // Búsqueda parcial: ¿hay una ruta del catálogo que sea prefix?
  for (const [k, v] of Object.entries(KNOWN_ROUTES)) {
    if (route.startsWith(k) && k !== "/") return v;
  }

  // Fallback: inferir label del último segmento
  const lastSegment = route.split("/").filter(Boolean).pop() || route;
  const label = lastSegment
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return { label, icon: "→" };
}
