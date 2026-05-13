import type { ResearchThread, RssFeed, RssItem, KnowledgeItem } from "@/types/research";

export const researchMockData: ResearchThread[] = [
  {
    id: "thread_mocion_analisis",
    workspaceId: "ws_espana_2026",
    title: "Análisis cobertura mediática moción de censura",
    query: "moción de censura mayo 2026 cobertura narrativa",
    status: "active",
    tags: ["moción", "medios", "narrativa"],
    relatedIssueIds: ["iss_001"],
    relatedCanvasId: "canvas_demo_mocion_2026",
    createdAt: "2026-05-10T09:00:00Z",
    updatedAt: "2026-05-10T10:30:00Z",
    sources: [
      {
        id: "src_001",
        type: "url",
        url: "https://elpais.com",
        title: "El País — Análisis de la votación",
        content: "El partido gobernante enfrenta la votación más ajustada de la legislatura. Junts mantiene su posición ambigua mientras la oposición moviliza recursos comunicacionales.",
        domain: "elpais.com",
        relevanceScore: 0.92,
        tags: ["prensa", "votación"],
        addedAt: "2026-05-10T09:00:00Z",
      },
      {
        id: "src_002",
        type: "pdf",
        title: "Informe CIS — Barómetro Abril 2026",
        content: "Los datos del barómetro muestran una caída de 2.3 puntos en intención de voto del partido gobernante respecto al mes anterior.",
        relevanceScore: 0.88,
        tags: ["encuesta", "CIS"],
        addedAt: "2026-05-10T10:00:00Z",
      },
    ],
    syntheses: [
      {
        id: "syn_001",
        sourceIds: ["src_001", "src_002"],
        type: "summary",
        content: "La cobertura mediática de la moción refleja una narrativa dividida. Los medios afines a la oposición enfatizan el desgaste del gobierno mientras los datos del CIS apuntan a una caída moderada pero significativa.",
        entities: [
          { id: "e1", label: "Pedro Sánchez", type: "person", relevance: 9, mentions: 14 },
          { id: "e2", label: "PP", type: "organization", relevance: 8, mentions: 11 },
          { id: "e3", label: "Junts", type: "organization", relevance: 7, mentions: 8 },
        ],
        generatedAt: "2026-05-10T10:30:00Z",
        model: "claude-sonnet-4-5",
        tokenCount: 847,
      },
    ],
  },
  {
    id: "thread_junts_vivienda",
    workspaceId: "ws_espana_2026",
    title: "Posición Junts en Ley de Vivienda",
    query: "Junts vivienda enmiendas",
    status: "active",
    tags: ["junts", "vivienda"],
    relatedIssueIds: ["iss_002"],
    createdAt: "2026-05-08T12:00:00Z",
    updatedAt: "2026-05-12T15:00:00Z",
    sources: [
      {
        id: "src_003",
        type: "url",
        url: "https://www.lavanguardia.com",
        title: "La Vanguardia — Junts plantea siete enmiendas",
        content: "Junts ha registrado siete enmiendas a la Ley de Vivienda centradas en competencias autonómicas.",
        domain: "lavanguardia.com",
        relevanceScore: 0.85,
        tags: ["prensa"],
        addedAt: "2026-05-08T12:00:00Z",
      },
    ],
    syntheses: [],
  },
];

export const rssFeedsMockData: RssFeed[] = [
  { id: "feed_elpais",    workspaceId: "ws_espana_2026", name: "El País — Política",   url: "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/section/politica/portada", category: "prensa",      active: true },
  { id: "feed_elmundo",   workspaceId: "ws_espana_2026", name: "El Mundo — España",     url: "https://rss.elmundo.es/rss/descarga.htm?b=14",                                     category: "prensa",      active: true },
  { id: "feed_boe",       workspaceId: "ws_espana_2026", name: "BOE — Sumario",         url: "https://www.boe.es/rss/boe.php",                                                    category: "legislativo", active: true },
  { id: "feed_congreso",  workspaceId: "ws_espana_2026", name: "Congreso — Agenda",     url: "https://www.congreso.es/rss/agenda.xml",                                            category: "legislativo", active: false },
  { id: "feed_europarl",  workspaceId: "ws_espana_2026", name: "Europarlamento ES",     url: "https://www.europarl.europa.eu/rss/es/pressreleases.xml",                           category: "europa",      active: true },
];

const now = Date.now();
export const rssItemsMockData: RssItem[] = [
  { id: "rss_001", feedId: "feed_elpais",   title: "Sánchez plantea diálogo con Junts para evitar bloqueo presupuestario", link: "https://elpais.com/x1",   snippet: "El presidente del Gobierno ha mostrado disposición a negociar enmiendas técnicas.", publishedAt: new Date(now - 3*3600_000).toISOString(),  categories: ["política"], relevanceScore: 0.92, read: false, saved: false },
  { id: "rss_002", feedId: "feed_elmundo",  title: "Feijóo: la moción busca recuperar la confianza democrática",            link: "https://elmundo.es/x1",   snippet: "El líder del PP defiende la oportunidad política de la moción.",                      publishedAt: new Date(now - 5*3600_000).toISOString(),  categories: ["política"], relevanceScore: 0.85, read: false, saved: false },
  { id: "rss_003", feedId: "feed_boe",       title: "RD-Ley sobre medidas urgentes en materia de vivienda",                  link: "https://boe.es/x1",       snippet: "Publicación oficial del nuevo Real Decreto-Ley.",                                       publishedAt: new Date(now - 8*3600_000).toISOString(),  categories: ["legislativo"], relevanceScore: 0.88, read: true, saved: true },
  { id: "rss_004", feedId: "feed_europarl",  title: "Parlamento Europeo aprueba directiva sobre IA generativa",              link: "https://europarl.eu/x1",  snippet: "La normativa entrará en vigor en 2027.",                                                publishedAt: new Date(now - 12*3600_000).toISOString(), categories: ["europa"], relevanceScore: 0.62, read: false, saved: false },
  { id: "rss_005", feedId: "feed_elpais",   title: "Análisis: las tres claves de la negociación con Junts",                  link: "https://elpais.com/x2",   snippet: "Tres puntos de fricción en la negociación.",                                            publishedAt: new Date(now - 18*3600_000).toISOString(), categories: ["análisis"], relevanceScore: 0.74, read: false, saved: false },
  { id: "rss_006", feedId: "feed_elmundo",  title: "Vox endurece su discurso sobre amnistía",                                 link: "https://elmundo.es/x2",   snippet: "El partido amenaza con romper el pacto autonómico.",                                  publishedAt: new Date(now - 22*3600_000).toISOString(), categories: ["política"], relevanceScore: 0.68, read: true, saved: false },
  { id: "rss_007", feedId: "feed_boe",       title: "Convocatoria de elecciones autonómicas en Andalucía",                    link: "https://boe.es/x2",       snippet: "Publicación del decreto de convocatoria.",                                              publishedAt: new Date(now - 28*3600_000).toISOString(), categories: ["legislativo"], relevanceScore: 0.81, read: false, saved: true },
  { id: "rss_008", feedId: "feed_europarl",  title: "España defiende su postura sobre regulación criptoactivos",              link: "https://europarl.eu/x2",  snippet: "El gobierno español traslada su posición.",                                              publishedAt: new Date(now - 32*3600_000).toISOString(), categories: ["europa"], relevanceScore: 0.55, read: false, saved: false },
  { id: "rss_009", feedId: "feed_elpais",   title: "Sondeo: la moción tendría apenas 165 votos a favor",                      link: "https://elpais.com/x3",   snippet: "El barómetro especial CIS proyecta el resultado.",                                       publishedAt: new Date(now - 40*3600_000).toISOString(), categories: ["sondeos"], relevanceScore: 0.95, read: false, saved: false },
  { id: "rss_010", feedId: "feed_elmundo",  title: "Junts: 'No daremos votos gratis al Gobierno'",                            link: "https://elmundo.es/x3",   snippet: "Declaraciones del portavoz en el Congreso.",                                            publishedAt: new Date(now - 48*3600_000).toISOString(), categories: ["política"], relevanceScore: 0.79, read: false, saved: false },
];

export const knowledgeBaseMockData: KnowledgeItem[] = [
  { id: "kb_001", workspaceId: "ws_espana_2026", title: "Precedentes de mociones de censura 1977-2023", content: "Histórico completo de las 6 mociones presentadas.", sourceType: "manual",       tags: ["histórico"], entities: [], linkedCanvasObjectIds: [], linkedDocIds: [], linkedTableIds: [], createdAt: "2026-05-05T00:00:00Z" },
  { id: "kb_002", workspaceId: "ws_espana_2026", title: "Posición histórica Junts sobre presupuestos",   content: "Patrones de negociación de Junts en 2023-2025.",  sourceType: "agent_finding",tags: ["actor"],     entities: [], linkedCanvasObjectIds: [], linkedDocIds: [], linkedTableIds: [], createdAt: "2026-05-08T00:00:00Z" },
  { id: "kb_003", workspaceId: "ws_espana_2026", title: "Análisis cobertura medios PP",                  content: "Vocabulario, ciclos y amplificadores recurrentes.",sourceType: "agent_finding",tags: ["medios"],    entities: [], linkedCanvasObjectIds: [], linkedDocIds: [], linkedTableIds: [], createdAt: "2026-05-10T00:00:00Z" },
  { id: "kb_004", workspaceId: "ws_espana_2026", title: "Ley de Vivienda 2026 — articulado",             content: "Texto completo del proyecto de ley.",             sourceType: "doc_extract",  tags: ["ley"],       entities: [], linkedCanvasObjectIds: [], linkedDocIds: [], linkedTableIds: [], createdAt: "2026-05-09T00:00:00Z" },
  { id: "kb_005", workspaceId: "ws_espana_2026", title: "Mapa de coaliciones autonómicas PP-VOX",         content: "8 pactos vigentes y patrones de incompatibilidad.",sourceType: "manual",      tags: ["coaliciones"],entities: [], linkedCanvasObjectIds: [], linkedDocIds: [], linkedTableIds: [], createdAt: "2026-05-08T00:00:00Z" },
];
