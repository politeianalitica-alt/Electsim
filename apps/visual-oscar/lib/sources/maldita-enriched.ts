/**
 * Enriquecedor de bulos en vivo (Maldita.es + Newtral RSS) al shape
 * rico `Bulo` que espera la página /desinformacion.
 *
 * El RSS solo trae: titulo + descripcion + link + fecha + categoria + veredicto.
 * Aquí derivamos heurísticamente los demás campos (timeline, paciente_cero,
 * amplificadores, alcance, viralidad) usando reglas plausibles basadas en:
 *   - antigüedad del bulo (más viejo → más alcance acumulado)
 *   - categoría detectada (Política/Sanidad/etc → canales típicos)
 *   - source del fact-checker (Maldita o Newtral)
 *
 * Estos campos derivados se muestran como estimaciones (UI debe indicarlo
 * cuando aplique). El TITULAR, FECHA, LINK y FACT-CHECKER son siempre
 * REALES y trazables al RSS de origen.
 */

import type { BuloDetectado } from "./maldita";

// ─── Tipos compatibles con el endpoint /api/desinformacion/bulos ────

export type EstadoBulo = "CONFIRMADO_FALSO" | "DESMENTIDO" | "EN_INVESTIGACION" | "PARCIAL";
export type CanalBulo = "X" | "Facebook" | "Telegram" | "WhatsApp" | "TikTok" | "YouTube" | "Instagram" | "Foros" | "Prensa" | "TV" | "Radio" | "Mail";
export type CategoriaBulo = "Política" | "Migración" | "Sanidad" | "Económica" | "Electoral" | "Climática" | "Internacional" | "Justicia";
export type OrigenBulo = "Cuenta anónima" | "Foro" | "Bot/granja" | "Medio extranjero" | "Político" | "Influencer" | "Telegram channel" | "Mensaje WhatsApp" | "Operación coordinada";

export interface EventoTimeline {
  t: string;
  tipo: "origen" | "viral" | "pico" | "factcheck" | "desmentido" | "replica";
  canal: CanalBulo | string;
  desc: string;
  reach?: number;
}

export interface Amplificador {
  nombre: string;
  canal: CanalBulo;
  seguidores: number;
  reach_aportado: number;
  perfil: "Bot" | "Anónimo" | "Medio" | "Influencer" | "Político" | "Periodista" | "Cuenta verificada";
  posicion: "Origen" | "Amplificador" | "Replicador";
}

export interface FactChecker {
  nombre: string;
  fecha: string;
  veredicto: "FALSO" | "ENGAÑOSO" | "PARCIAL" | "EN ANÁLISIS";
  url?: string;
}

export interface BuloRich {
  id: string;
  titulo: string;
  categoria: CategoriaBulo;
  estado: EstadoBulo;
  primera_deteccion: string;
  ultima_actividad: string;
  texto_principal: string;
  variantes: string[];
  alcance_estimado: number;
  paciente_cero: {
    cuenta: string;
    canal: CanalBulo;
    perfil: string;
    seguidores: number;
    fecha_primer_post: string;
    pais_origen: string;
  };
  origen_tipo: OrigenBulo;
  similar_a?: string;
  pais_aparicion_previa?: string;
  timeline: EventoTimeline[];
  amplificadores: Amplificador[];
  canales_activos: Array<{ canal: CanalBulo; menciones: number; pico_h: string }>;
  factcheckers: FactChecker[];
  beneficiarios: string[];
  daño_estimado: number;
  viralidad: number;
  /** Indica que el bulo proviene del feed RSS en vivo (no del catálogo curado). */
  fuente_origen: "rss-live";
  source_rss: "maldita" | "newtral";
  link_factcheck: string;
}

// ─── Heurísticas de categorización por keywords ─────────────────────

const CATEGORIA_KEYWORDS: Array<{ cat: CategoriaBulo; words: string[] }> = [
  { cat: "Sanidad", words: ["vacuna", "covid", "virus", "salud", "hospital", "médic", "epidemia", "pandemia", "antibiótic", "cáncer"] },
  { cat: "Migración", words: ["inmigra", "mena", "frontera", "ceuta", "melilla", "subsahar", "refugiado", "menor extranjero"] },
  { cat: "Electoral", words: ["elecc", "voto", "encuesta", "sondeo", "censo", "urna", "candidat"] },
  { cat: "Económica", words: ["impuesto", "ipc", "inflación", "salario", "pensión", "autónom", "fiscal", "hacienda", "aeat", "iva", "euro", "subida", "bajada"] },
  { cat: "Climática", words: ["clima", "calentamiento", "co2", "energía", "renovable", "co₂"] },
  { cat: "Internacional", words: ["ucrania", "rusia", "putin", "trump", "biden", "israel", "palest", "gaza", "europa", "ue", "otan"] },
  { cat: "Justicia", words: ["juicio", "sentencia", "tribunal", "supremo", "constitucional", "fiscal", "juez", "abogado", "denuncia"] },
  { cat: "Política", words: ["gobierno", "sánchez", "feijóo", "ayuso", "vox", "psoe", "podemos", "sumar", "junts", "presidente", "ministr", "congreso"] },
];

function detectCategoria(titulo: string, descripcion: string): CategoriaBulo {
  const text = (titulo + " " + descripcion).toLowerCase();
  for (const { cat, words } of CATEGORIA_KEYWORDS) {
    if (words.some((w) => text.includes(w))) return cat;
  }
  return "Política";
}

// ─── Canales típicos por categoría ──────────────────────────────────

const CANALES_POR_CATEGORIA: Record<CategoriaBulo, CanalBulo[]> = {
  "Política": ["X", "WhatsApp", "Telegram", "Prensa", "TV"],
  "Sanidad": ["TikTok", "WhatsApp", "Telegram", "YouTube"],
  "Migración": ["X", "Telegram", "Facebook", "WhatsApp"],
  "Electoral": ["X", "Telegram", "Prensa", "WhatsApp"],
  "Económica": ["WhatsApp", "Telegram", "X", "Mail"],
  "Climática": ["TikTok", "YouTube", "X", "Telegram"],
  "Internacional": ["X", "Telegram", "Prensa"],
  "Justicia": ["X", "Prensa", "Telegram"],
};

// ─── Estado según veredicto del RSS ────────────────────────────────

function veredictoToEstado(v?: BuloDetectado["veredicto"]): EstadoBulo {
  switch (v) {
    case "FALSO":     return "CONFIRMADO_FALSO";
    case "ENGAÑOSO":  return "DESMENTIDO";
    case "PARCIAL":   return "PARCIAL";
    case "EN ANÁLISIS": return "EN_INVESTIGACION";
    default:          return "DESMENTIDO";
  }
}

// ─── Alcance y viralidad heurísticos según antigüedad ──────────────

function estimateAlcance(fechaIso: string): number {
  const ageHours = Math.max(0, (Date.now() - new Date(fechaIso).getTime()) / 3600_000);
  // Crece rápido las primeras 48h, satura después
  if (ageHours < 6) return Math.round(50_000 + ageHours * 30_000);
  if (ageHours < 48) return Math.round(200_000 + (ageHours - 6) * 35_000);
  if (ageHours < 168) return Math.round(1_700_000 + (ageHours - 48) * 8_000);
  return Math.round(2_700_000 + (ageHours - 168) * 1_500);
}

function estimateViralidad(fechaIso: string, categoria: CategoriaBulo): number {
  const ageHours = Math.max(0, (Date.now() - new Date(fechaIso).getTime()) / 3600_000);
  const baseFromAge = Math.max(20, Math.min(95, 95 - Math.log2(ageHours + 1) * 6));
  const catBoost: Partial<Record<CategoriaBulo, number>> = {
    Sanidad: 10, Migración: 8, Política: 6, Electoral: 5, Internacional: 4,
  };
  return Math.round(Math.min(99, baseFromAge + (catBoost[categoria] ?? 0)));
}

// ─── Constructor principal ─────────────────────────────────────────

const FACTCHECKER_HOMES: Record<"maldita" | "newtral", string> = {
  maldita: "https://maldita.es",
  newtral: "https://www.newtral.es",
};

const FACTCHECKER_NAMES: Record<"maldita" | "newtral", string> = {
  maldita: "Maldita.es",
  newtral: "Newtral",
};

export function enrichBulo(b: BuloDetectado): BuloRich {
  const categoria = (b.categoria as CategoriaBulo) || detectCategoria(b.titulo, b.descripcion);
  const estado = veredictoToEstado(b.veredicto);
  const alcance = estimateAlcance(b.fecha);
  const viralidad = estimateViralidad(b.fecha, categoria);
  const canalesCat = CANALES_POR_CATEGORIA[categoria];
  const fcName = FACTCHECKER_NAMES[b.source];

  // Timeline mínimo: origen + factcheck (datos reales del RSS)
  const ageHours = Math.max(1, (Date.now() - new Date(b.fecha).getTime()) / 3600_000);
  const origenHoras = Math.round(ageHours + 12); // origen estimado 12h antes del fact-check
  const origenIso = new Date(Date.now() - origenHoras * 3600_000).toISOString();

  const timeline: EventoTimeline[] = [
    {
      t: origenIso,
      tipo: "origen",
      canal: canalesCat[0],
      desc: "Primera circulación detectada en redes sociales (estimación)",
      reach: Math.round(alcance * 0.05),
    },
    {
      t: new Date(new Date(origenIso).getTime() + (origenHoras / 2) * 3600_000).toISOString(),
      tipo: "viral",
      canal: canalesCat[1] || "WhatsApp",
      desc: `Difusión en ${canalesCat[1] || "redes"} y replicación en cadenas`,
      reach: Math.round(alcance * 0.4),
    },
    {
      t: b.fecha,
      tipo: "factcheck",
      canal: fcName,
      desc: `${fcName} verifica y publica desmentido`,
      reach: Math.round(alcance * 0.15),
    },
  ];

  // Canales activos: top 3 de la categoría con menciones decrecientes
  const canalesActivos = canalesCat.slice(0, 3).map((canal, i) => ({
    canal,
    menciones: Math.round(alcance * (0.25 / (i + 1)) / 100),
    pico_h: new Date(Date.now() - (ageHours * 0.6 * 3600_000)).toISOString(),
  }));

  return {
    id: `live-${b.source}-${b.id}`,
    titulo: b.titulo,
    categoria,
    estado,
    primera_deteccion: origenIso,
    ultima_actividad: b.fecha,
    texto_principal: b.descripcion || b.titulo,
    variantes: [], // RSS no provee variantes
    alcance_estimado: alcance,
    paciente_cero: {
      cuenta: "(no identificado en RSS público)",
      canal: canalesCat[0],
      perfil: `Origen no trazado · primera detección por ${fcName}`,
      seguidores: 0,
      fecha_primer_post: origenIso,
      pais_origen: "España (probable)",
    },
    origen_tipo: "Cuenta anónima",
    timeline,
    amplificadores: [], // Sin datos de amplificadores específicos en RSS
    canales_activos: canalesActivos,
    factcheckers: [
      {
        nombre: fcName,
        fecha: b.fecha,
        veredicto: b.veredicto || "FALSO",
        url: b.link,
      },
    ],
    beneficiarios: [], // No inferible del RSS
    daño_estimado: Math.min(95, Math.round(viralidad * 0.85)),
    viralidad,
    fuente_origen: "rss-live",
    source_rss: b.source,
    link_factcheck: b.link,
  };
}

/**
 * Enriquece una lista de bulos del RSS y los ordena por fecha desc.
 */
export function enrichBulosList(bulos: BuloDetectado[]): BuloRich[] {
  return bulos
    .map(enrichBulo)
    .sort((a, b) => new Date(b.ultima_actividad).getTime() - new Date(a.ultima_actividad).getTime());
}
