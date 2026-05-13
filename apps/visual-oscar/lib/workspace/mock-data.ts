import type {
  Workspace,
  WorkspaceMember,
  AgentContextItem,
  WorkspaceIssue,
  WorkspaceAction,
  WorkspaceDecision,
  WorkspaceAlert,
  WorkspaceDocument,
  WorkspaceDataset,
  WorkspaceResearchThread,
  WorkspaceProject,
  WorkspaceAutomation,
  WorkspaceKnowledgeItem,
  WorkspaceOpportunity,
  WorkspaceActivityEvent,
  WorkspaceCanvasSummary,
  AgentMessage,
} from "@/types/workspace";

// ─────────────────────────────────────────────────────────────────────
//  WORKSPACE & MEMBERS
// ─────────────────────────────────────────────────────────────────────

export const workspaces: Workspace[] = [
  {
    id: "ws_espana_2026",
    name: "España 2026",
    tenantId: "demo",
    description: "Workspace principal — Elecciones Generales 2026",
    mode: "real",
    createdAt: "2026-05-01T08:00:00Z",
    sector: "politica-nacional",
    tags: ["elecciones", "estrategia", "crisis"],
    issueCount: 6,
    pendingActions: 8,
    decisionsThisWeek: 4,
    teamMembers: 5,
  },
];

export const members: WorkspaceMember[] = [
  { id: "u1", name: "Ana Gómez",      initials: "AG", role: "Dir. Estratégica",         status: "online",  currentFocus: "Moción de censura" },
  { id: "u2", name: "Luis Martín",    initials: "LM", role: "Analista Legislativo",     status: "busy",    currentFocus: "Negociación presupuestos" },
  { id: "u3", name: "Clara Ruiz",     initials: "CR", role: "Dir. Comunicación",        status: "online",  currentFocus: "Crisis bulos financiación" },
  { id: "u4", name: "Javier Ortega",  initials: "JO", role: "Analista Electoral",       status: "offline", currentFocus: "Sondeos territoriales" },
  { id: "u5", name: "Marta León",     initials: "ML", role: "Coordinadora de Campaña",  status: "online",  currentFocus: "Plan junio 2026" },
];

// ─────────────────────────────────────────────────────────────────────
//  ISSUES (6) — primer ancla de relaciones
// ─────────────────────────────────────────────────────────────────────

export const issues: WorkspaceIssue[] = [
  {
    id: "iss_001",
    workspaceId: "ws_espana_2026",
    title: "Bulos sobre financiación del partido",
    summary: "Narrativa hostil amplificada en redes con alto alcance y riesgo reputacional.",
    status: "open",
    severity: "critical",
    createdAt: "2026-05-01T08:00:00Z",
    ownerId: "u3",
    dueDate: "2026-05-14",
    relatedDocumentIds: ["doc_001", "doc_002"],
    relatedResearchIds: ["res_001"],
    relatedCanvasId: "canvas_demo_mocion_2026",
  },
  {
    id: "iss_002",
    workspaceId: "ws_espana_2026",
    title: "Ley de vivienda — riesgo de bloqueo Junts",
    summary: "Junts condiciona su apoyo a enmiendas sobre competencia autonómica.",
    status: "open",
    severity: "critical",
    createdAt: "2026-05-03T10:00:00Z",
    ownerId: "u1",
    dueDate: "2026-05-15",
    relatedDocumentIds: ["doc_004"],
    relatedResearchIds: ["res_002"],
    relatedCanvasId: "canvas_demo_mocion_2026",
  },
  {
    id: "iss_003",
    workspaceId: "ws_espana_2026",
    title: "Negociación presupuestos CC.AA.",
    summary: "Tensión con CC.AA. del PP por transferencias del FLA.",
    status: "monitoring",
    severity: "high",
    createdAt: "2026-04-28T14:00:00Z",
    ownerId: "u2",
    dueDate: "2026-05-20",
    relatedDocumentIds: ["doc_005"],
    relatedResearchIds: [],
  },
  {
    id: "iss_004",
    workspaceId: "ws_espana_2026",
    title: "Crisis comunicacional sondeos PP",
    summary: "Sondeos territoriales muestran caída en Andalucía y Cataluña.",
    status: "open",
    severity: "high",
    createdAt: "2026-05-05T09:00:00Z",
    ownerId: "u4",
    dueDate: "2026-05-13",
    relatedDocumentIds: ["doc_003"],
    relatedResearchIds: ["res_003"],
  },
  {
    id: "iss_005",
    workspaceId: "ws_espana_2026",
    title: "Plan reforma fiscal Sumar",
    summary: "Anuncio de propuesta fiscal de Sumar genera ruido interno.",
    status: "monitoring",
    severity: "normal",
    createdAt: "2026-05-06T12:00:00Z",
    ownerId: "u2",
    dueDate: "2026-05-22",
    relatedDocumentIds: [],
    relatedResearchIds: ["res_004"],
  },
  {
    id: "iss_006",
    workspaceId: "ws_espana_2026",
    title: "Pacto PP-VOX Galicia",
    summary: "Posible pacto de coalición autonómica con implicaciones nacionales.",
    status: "monitoring",
    severity: "normal",
    createdAt: "2026-05-07T16:00:00Z",
    ownerId: "u4",
    dueDate: "2026-05-25",
    relatedDocumentIds: [],
    relatedResearchIds: [],
  },
];

// ─────────────────────────────────────────────────────────────────────
//  ACTIONS (8)
// ─────────────────────────────────────────────────────────────────────

export const actions: WorkspaceAction[] = [
  { id: "act_001", workspaceId: "ws_espana_2026", title: "Preparar Q&A entrevista TVE viernes", priority: "critical", responsibleId: "u3", dueDate: "2026-05-16", status: "in_progress", issueId: "iss_001" },
  { id: "act_002", workspaceId: "ws_espana_2026", title: "Reunión interna análisis sondeos territoriales", priority: "high", responsibleId: "u4", dueDate: "2026-05-14", status: "pending", issueId: "iss_004" },
  { id: "act_003", workspaceId: "ws_espana_2026", title: "Briefing para socio de coalición sobre vivienda", priority: "high", responsibleId: "u1", dueDate: "2026-05-15", status: "pending", issueId: "iss_002" },
  { id: "act_004", workspaceId: "ws_espana_2026", title: "Revisar marco legal amnistía", priority: "normal", responsibleId: "u2", dueDate: "2026-05-17", status: "pending" },
  { id: "act_005", workspaceId: "ws_espana_2026", title: "Informe mensual seguimiento legislativo", priority: "normal", responsibleId: "u2", dueDate: "2026-05-20", status: "pending" },
  { id: "act_006", workspaceId: "ws_espana_2026", title: "Activar mensaje sobre vivienda en redes", priority: "high", responsibleId: "u3", dueDate: "2026-05-13", status: "done", issueId: "iss_002" },
  { id: "act_007", workspaceId: "ws_espana_2026", title: "Llamada bilateral con portavoz Junts", priority: "critical", responsibleId: "u1", dueDate: "2026-05-13", status: "pending", issueId: "iss_002" },
  { id: "act_008", workspaceId: "ws_espana_2026", title: "Coordinar publicación nota fact-check", priority: "high", responsibleId: "u3", dueDate: "2026-05-14", status: "in_progress", issueId: "iss_001" },
];

// ─────────────────────────────────────────────────────────────────────
//  DECISIONS (4)
// ─────────────────────────────────────────────────────────────────────

export const decisions: WorkspaceDecision[] = [
  { id: "dec_001", workspaceId: "ws_espana_2026", title: "No responder al ataque de OK Diario sobre alto cargo", decisionMade: "Silencio estratégico durante 72h y monitorización", decidedBy: "Comité de comunicación", decidedAt: "2026-05-12T18:30:00Z", context: "Amplificaría narrativa rival y daría timeline.", linkedIssueId: "iss_001" },
  { id: "dec_002", workspaceId: "ws_espana_2026", title: "Activar mensaje sobre vivienda con propuestas concretas", decisionMade: "Comunicado conjunto con datos del Plan Vive", decidedBy: "Estrategia", decidedAt: "2026-05-11T11:00:00Z", context: "Capturar agenda mediática antes que la oposición.", linkedIssueId: "iss_002" },
  { id: "dec_003", workspaceId: "ws_espana_2026", title: "Aplazar reforma fiscal hasta cierre semestre", decisionMade: "Posponer anuncio formal a octubre 2026", decidedBy: "Hacienda", decidedAt: "2026-05-10T09:15:00Z", context: "Mejor coyuntura macro tras datos IPC.", linkedIssueId: "iss_005" },
  { id: "dec_004", workspaceId: "ws_espana_2026", title: "Aceptar 3 de 7 enmiendas de Junts", decisionMade: "Negociar enmiendas técnicas, rechazar políticas", decidedBy: "Mesa estrategia", decidedAt: "2026-05-09T16:00:00Z", context: "Mantener bloque legislativo sin ceder símbolos.", linkedIssueId: "iss_002" },
];

// ─────────────────────────────────────────────────────────────────────
//  ALERTS (5)
// ─────────────────────────────────────────────────────────────────────

export const alerts: WorkspaceAlert[] = [
  { id: "alr_001", workspaceId: "ws_espana_2026", title: "Pico de menciones sobre 'financiación PSOE' en X", severity: "critical", source: "Monitor redes", createdAt: "2026-05-13T07:42:00Z", status: "active" },
  { id: "alr_002", workspaceId: "ws_espana_2026", title: "BOE publica nueva orden vivienda autonómica", severity: "high",     source: "BOE feed",     createdAt: "2026-05-13T06:15:00Z", status: "active" },
  { id: "alr_003", workspaceId: "ws_espana_2026", title: "Caída 2.3pp PP en barómetro Andalucía",         severity: "high",     source: "Sondeos",      createdAt: "2026-05-12T18:00:00Z", status: "active" },
  { id: "alr_004", workspaceId: "ws_espana_2026", title: "Junts convoca rueda de prensa urgente",         severity: "normal",   source: "Agenda inst.", createdAt: "2026-05-13T08:10:00Z", status: "active" },
  { id: "alr_005", workspaceId: "ws_espana_2026", title: "Mention spike sobre 'amnistía' EuroNews",       severity: "low",      source: "Monitor UE",   createdAt: "2026-05-12T22:30:00Z", status: "dismissed" },
];

// ─────────────────────────────────────────────────────────────────────
//  DOCUMENTS (10)
// ─────────────────────────────────────────────────────────────────────

export const documents: WorkspaceDocument[] = [
  { id: "doc_001", workspaceId: "ws_espana_2026", title: "Nota de respuesta a bulos financiación",          kind: "crisis-note",   status: "review",    updatedAt: "2026-05-13T09:00:00Z", authorId: "u3", tags: ["crisis","comunicación"], summary: "Q&A defensivo para portavoces y red de comunicación territorial.", relatedIssueIds: ["iss_001"], wordCount: 1240 },
  { id: "doc_002", workspaceId: "ws_espana_2026", title: "Estrategia comunicación mayo 2026",              kind: "positioning",   status: "draft",     updatedAt: "2026-05-13T08:15:00Z", authorId: "u3", tags: ["estrategia","mes"],     summary: "Mensajes clave del mes y mapeo de portavoces.",                    relatedIssueIds: ["iss_001","iss_002"], wordCount: 2400 },
  { id: "doc_003", workspaceId: "ws_espana_2026", title: "Análisis sondeos territoriales Cataluña",        kind: "analysis",      status: "published", updatedAt: "2026-05-12T16:30:00Z", authorId: "u4", tags: ["sondeo","cataluña"],    summary: "Lectura cruzada CIS y barómetros propios.",                        relatedIssueIds: ["iss_004"], wordCount: 3200 },
  { id: "doc_004", workspaceId: "ws_espana_2026", title: "Q&A vivienda — preparación pleno",                kind: "briefing",      status: "review",    updatedAt: "2026-05-12T14:00:00Z", authorId: "u1", tags: ["vivienda","pleno"],     summary: "Preguntas previsibles + respuestas argumentadas.",                  relatedIssueIds: ["iss_002"], wordCount: 1800 },
  { id: "doc_005", workspaceId: "ws_espana_2026", title: "Briefing presupuestos CC.AA. mayo",              kind: "briefing",      status: "published", updatedAt: "2026-05-11T19:00:00Z", authorId: "u2", tags: ["presupuestos","ccaa"], summary: "Estado del FLA y posiciones por CC.AA.",                            relatedIssueIds: ["iss_003"], wordCount: 2100 },
  { id: "doc_006", workspaceId: "ws_espana_2026", title: "Marco legal reforma amnistía",                   kind: "analysis",      status: "published", updatedAt: "2026-05-10T17:20:00Z", authorId: "u2", tags: ["legal","amnistía"],     summary: "Marco jurídico y precedentes TC.",                                  relatedIssueIds: [], wordCount: 4100 },
  { id: "doc_007", workspaceId: "ws_espana_2026", title: "Posicionamiento Sumar — reforma fiscal",          kind: "positioning",   status: "draft",     updatedAt: "2026-05-09T11:00:00Z", authorId: "u2", tags: ["sumar","fiscal"],        summary: "Mapa de incentivos de Sumar y costes electorales.",                 relatedIssueIds: ["iss_005"], wordCount: 1500 },
  { id: "doc_008", workspaceId: "ws_espana_2026", title: "Talking points entrevista TVE viernes",          kind: "talking-points",status: "draft",     updatedAt: "2026-05-13T07:00:00Z", authorId: "u3", tags: ["tve","entrevista"],     summary: "Mensaje principal + 3 secundarios + qué evitar.",                    relatedIssueIds: ["iss_001"], wordCount: 900 },
  { id: "doc_009", workspaceId: "ws_espana_2026", title: "Memo análisis adversarios PP-VOX Galicia",       kind: "memo",          status: "published", updatedAt: "2026-05-08T12:00:00Z", authorId: "u4", tags: ["adversarios","galicia"], summary: "Lectura interna del posible pacto autonómico.",                     relatedIssueIds: ["iss_006"], wordCount: 1700 },
  { id: "doc_010", workspaceId: "ws_espana_2026", title: "Informe cliente — Sector Vivienda Q2",            kind: "client-report", status: "draft",     updatedAt: "2026-05-07T18:00:00Z", authorId: "u1", tags: ["cliente","vivienda"],   summary: "Resumen ejecutivo Q2 sector vivienda para cliente.",                relatedIssueIds: ["iss_002"], wordCount: 5200 },
];

// ─────────────────────────────────────────────────────────────────────
//  DATASETS (5)
// ─────────────────────────────────────────────────────────────────────

export const datasets: WorkspaceDataset[] = [
  { id: "ds_001", workspaceId: "ws_espana_2026", name: "Sondeos — intención de voto (may 2026)",   kind: "polling",     updatedAt: "2026-05-13T06:00:00Z", rowCount: 1842,  fields: ["partido","ccaa","intención","fecha","muestra"], source: "CIS / Metroscopia" },
  { id: "ds_002", workspaceId: "ws_espana_2026", name: "Resultados electorales históricos",        kind: "polling",     updatedAt: "2026-05-01T00:00:00Z", rowCount: 52340, fields: ["año","circ","partido","votos","escaños"], source: "INE / BOE" },
  { id: "ds_003", workspaceId: "ws_espana_2026", name: "Cobertura mediática (RSS 69 fuentes)",     kind: "media",       updatedAt: "2026-05-13T08:00:00Z", rowCount: 894,   fields: ["medio","fecha","tono","actores","menciones"], source: "Scrapers RSS" },
  { id: "ds_004", workspaceId: "ws_espana_2026", name: "Actores políticos — perfil completo",      kind: "actors",      updatedAt: "2026-05-12T00:00:00Z", rowCount: 340,   fields: ["nombre","partido","cargo","influencia"], source: "Politeia DB" },
  { id: "ds_005", workspaceId: "ws_espana_2026", name: "Matriz de riesgos políticos (RAJI)",       kind: "risk",        updatedAt: "2026-05-11T00:00:00Z", rowCount: 128,   fields: ["categoria","probabilidad","impacto","tendencia"], source: "Análisis interno" },
];

// ─────────────────────────────────────────────────────────────────────
//  RESEARCH (6)
// ─────────────────────────────────────────────────────────────────────

export const researchThreads: WorkspaceResearchThread[] = [
  { id: "res_001", workspaceId: "ws_espana_2026", title: "Narrativa financiación partido",         query: "bulos financiación PSOE redes",          updatedAt: "2026-05-13T08:30:00Z", status: "active",   sourceCount: 47, citations: 12, summary: "Mapeo de actores que amplifican la narrativa y cronología de la campaña.", linkedIssueIds: ["iss_001"] },
  { id: "res_002", workspaceId: "ws_espana_2026", title: "Posición de Junts en Ley Vivienda",      query: "Junts vivienda enmiendas mayo 2026",     updatedAt: "2026-05-12T15:00:00Z", status: "active",   sourceCount: 23, citations:  8, summary: "Análisis de declaraciones y votaciones previas para anticipar la moción.", linkedIssueIds: ["iss_002"] },
  { id: "res_003", workspaceId: "ws_espana_2026", title: "Sondeos territoriales — análisis 2026",  query: "sondeos andalucía cataluña 2026",        updatedAt: "2026-05-12T11:00:00Z", status: "active",   sourceCount: 61, citations: 19, summary: "Cruce de barómetros públicos y privados con explicación de desviaciones.", linkedIssueIds: ["iss_004"] },
  { id: "res_004", workspaceId: "ws_espana_2026", title: "Reforma fiscal Sumar — precedentes UE",  query: "fiscalidad progresiva UE precedentes",   updatedAt: "2026-05-09T17:00:00Z", status: "active",   sourceCount: 34, citations:  6, summary: "Modelos comparados Francia/Alemania y posibles costes electorales.",     linkedIssueIds: ["iss_005"] },
  { id: "res_005", workspaceId: "ws_espana_2026", title: "Coaliciones PP-VOX en CC.AA.",            query: "coaliciones PP VOX autonómicas 2025",    updatedAt: "2026-05-08T13:00:00Z", status: "active",   sourceCount: 29, citations: 11, summary: "Análisis de patrones de pacto y narrativa de incompatibilidad.",          linkedIssueIds: ["iss_006"] },
  { id: "res_006", workspaceId: "ws_espana_2026", title: "Precedentes mociones de censura 1977-",  query: "moción censura España historia",         updatedAt: "2026-05-05T10:00:00Z", status: "archived", sourceCount: 18, citations:  5, summary: "Histórico de las 6 mociones presentadas y umbrales legales.",              linkedIssueIds: [] },
];

// ─────────────────────────────────────────────────────────────────────
//  PROJECTS (4)
// ─────────────────────────────────────────────────────────────────────

export const projects: WorkspaceProject[] = [
  { id: "prj_001", workspaceId: "ws_espana_2026", name: "Campaña legislativa mayo–junio 2026", client: "PSOE Federal",   type: "campaign", status: "active",    progress: 62, riskLevel: "high",     dueDate: "2026-06-30", membersIds: ["u1","u3","u2"], linkedIssueIds: ["iss_001","iss_002"] },
  { id: "prj_002", workspaceId: "ws_espana_2026", name: "Análisis territorial CC.AA.",          client: "Interno",         type: "analysis", status: "active",    progress: 30, riskLevel: "normal",   dueDate: "2026-06-15", membersIds: ["u4"],          linkedIssueIds: ["iss_003"] },
  { id: "prj_003", workspaceId: "ws_espana_2026", name: "Plan comunicación junio 2026",          client: "PSOE Federal",   type: "campaign", status: "active",    progress: 12, riskLevel: "low",       dueDate: "2026-06-01", membersIds: ["u3","u1","u5"],linkedIssueIds: [] },
  { id: "prj_004", workspaceId: "ws_espana_2026", name: "Respuesta a crisis de bulos",          client: "Comité crisis",  type: "crisis",   status: "active",    progress: 78, riskLevel: "critical",  dueDate: "2026-05-20", membersIds: ["u3","u5"],     linkedIssueIds: ["iss_001"] },
];

// ─────────────────────────────────────────────────────────────────────
//  AUTOMATIONS (5)
// ─────────────────────────────────────────────────────────────────────

export const automations: WorkspaceAutomation[] = [
  { id: "auto_001", workspaceId: "ws_espana_2026", name: "Briefing matinal automático",      triggerLabel: "Cada día 07:30",            actionLabel: "Generar briefing + notificar equipo",         status: "active", lastRunAt: "2026-05-13T07:30:00Z", runCount: 142, category: "reports" },
  { id: "auto_002", workspaceId: "ws_espana_2026", name: "Alerta de riesgo alto",            triggerLabel: "Risk Index > 70",            actionLabel: "Crear issue crítico + notificar Dir. Estrat.", status: "active", lastRunAt: "2026-05-13T07:42:00Z", runCount:   8, category: "alerts" },
  { id: "auto_003", workspaceId: "ws_espana_2026", name: "Seguimiento BOE semanal",          triggerLabel: "Lunes 09:00",                actionLabel: "Indexar nuevas normas + añadir a Knowledge",  status: "active", lastRunAt: "2026-05-13T09:00:00Z", runCount:  23, category: "ingest" },
  { id: "auto_004", workspaceId: "ws_espana_2026", name: "Alerta de narrativa adversarial",  triggerLabel: "Detección ≥ 3 medios",       actionLabel: "Crear issue alto + preparar Q&A",             status: "paused", lastRunAt: "2026-05-08T14:00:00Z", runCount:   5, category: "alerts" },
  { id: "auto_005", workspaceId: "ws_espana_2026", name: "Resumen semanal de decisiones",    triggerLabel: "Viernes 18:00",              actionLabel: "Generar acta + compartir con equipo",         status: "active", lastRunAt: "2026-05-10T18:00:00Z", runCount:  19, category: "reports" },
];

// ─────────────────────────────────────────────────────────────────────
//  KNOWLEDGE (8)
// ─────────────────────────────────────────────────────────────────────

export const knowledgeItems: WorkspaceKnowledgeItem[] = [
  { id: "kw_001", workspaceId: "ws_espana_2026", title: "Precedentes moción de censura España 1977-2023",  entityType: "event",     updatedAt: "2026-05-10T00:00:00Z", confidence: 0.94, relatedIds: ["iss_002","res_006"], summary: "Histórico de las 6 mociones y umbrales clave.",            tags: ["legislativo","histórico"] },
  { id: "kw_002", workspaceId: "ws_espana_2026", title: "Mecánica parlamentaria: investidura y confianza", entityType: "law",       updatedAt: "2026-05-05T00:00:00Z", confidence: 0.98, relatedIds: ["iss_002"],          summary: "Procedimiento detallado de los arts. 99 y 113 CE.",        tags: ["legislativo","procedimiento"] },
  { id: "kw_003", workspaceId: "ws_espana_2026", title: "Posición histórica Junts sobre presupuestos",     entityType: "actor",     updatedAt: "2026-05-12T00:00:00Z", confidence: 0.86, relatedIds: ["iss_002","iss_003"],summary: "Patrones de negociación de Junts en 2023-2025.",           tags: ["actor","Junts","presupuestos"] },
  { id: "kw_004", workspaceId: "ws_espana_2026", title: "Efectos económicos reformas fiscales 2010",        entityType: "event",     updatedAt: "2026-05-04T00:00:00Z", confidence: 0.78, relatedIds: ["iss_005"],          summary: "Análisis comparado de las reformas fiscales recientes.",   tags: ["economía","fiscal"] },
  { id: "kw_005", workspaceId: "ws_espana_2026", title: "Ataques desde medios afines al PP — patrones",    entityType: "narrative", updatedAt: "2026-05-13T00:00:00Z", confidence: 0.82, relatedIds: ["iss_001","iss_004"],summary: "Vocabulario, ciclos y amplificadores recurrentes.",        tags: ["medios","narrativa"] },
  { id: "kw_006", workspaceId: "ws_espana_2026", title: "Mapa de coaliciones PP-VOX en CC.AA.",            entityType: "project",   updatedAt: "2026-05-08T00:00:00Z", confidence: 0.90, relatedIds: ["iss_006","res_005"],summary: "8 pactos vigentes y patrones de incompatibilidad.",        tags: ["adversarios","coaliciones"] },
  { id: "kw_007", workspaceId: "ws_espana_2026", title: "Perfil completo de Carlos Núñez Feijóo",          entityType: "actor",     updatedAt: "2026-05-09T00:00:00Z", confidence: 0.92, relatedIds: [],                    summary: "Trayectoria, posiciones y red de relaciones.",             tags: ["actor","PP","líder"] },
  { id: "kw_008", workspaceId: "ws_espana_2026", title: "Ley de Vivienda — análisis técnico completo",     entityType: "law",       updatedAt: "2026-05-11T00:00:00Z", confidence: 0.96, relatedIds: ["iss_002"],          summary: "Articulado, votos esperados y zonas de fricción.",         tags: ["ley","vivienda"] },
];

// ─────────────────────────────────────────────────────────────────────
//  OPPORTUNITIES (4)
// ─────────────────────────────────────────────────────────────────────

export const opportunities: WorkspaceOpportunity[] = [
  { id: "opp_001", workspaceId: "ws_espana_2026", title: "Capturar agenda mediática en vivienda esta semana", area: "Comunicación",     score: 87, windowStart: "2026-05-13", windowEnd: "2026-05-18", rationale: "Pico de búsqueda y baja saturación competitiva.",                          recommendedAction: "Lanzar dossier con datos del Plan Vive en lunes 13.",         relatedKnowledgeIds: ["kw_008"] },
  { id: "opp_002", workspaceId: "ws_espana_2026", title: "Negociar con Junts 3 enmiendas técnicas",          area: "Estrategia",      score: 78, windowStart: "2026-05-13", windowEnd: "2026-05-19", rationale: "Junts necesita mostrar avances ante su base.",                              recommendedAction: "Reunión bilateral con portavoz Junts esta semana.",            relatedKnowledgeIds: ["kw_003"] },
  { id: "opp_003", workspaceId: "ws_espana_2026", title: "Aprovechar dato barómetro UE sobre amnistía",       area: "Narrativa",       score: 66, windowStart: "2026-05-12", windowEnd: "2026-05-16", rationale: "Cobertura UE positiva permite reposicionar marco.",                         recommendedAction: "Artículo de opinión en medio europeo de referencia.",          relatedKnowledgeIds: ["kw_005"] },
  { id: "opp_004", workspaceId: "ws_espana_2026", title: "Anticipar movimiento Sumar fiscal con propuesta propia", area: "Política económica", score: 71, windowStart: "2026-05-14", windowEnd: "2026-05-25", rationale: "Sumar aún no concreta su propuesta. Margen para fijar marco.",          recommendedAction: "Borrador propuesta fiscal moderada antes 22 mayo.",            relatedKnowledgeIds: ["kw_004"] },
];

// ─────────────────────────────────────────────────────────────────────
//  ACTIVITY EVENTS (12)
// ─────────────────────────────────────────────────────────────────────

export const activityEvents: WorkspaceActivityEvent[] = [
  { id: "act_evt_001", workspaceId: "ws_espana_2026", type: "alert",      title: "Pico menciones financiación PSOE", createdAt: "2026-05-13T07:42:00Z", actorName: "Monitor redes",  meta: "Severidad crítica" },
  { id: "act_evt_002", workspaceId: "ws_espana_2026", type: "automation", title: "Briefing matinal generado",        createdAt: "2026-05-13T07:30:00Z", actorName: "ARIA",            meta: "6 señales procesadas" },
  { id: "act_evt_003", workspaceId: "ws_espana_2026", type: "doc",        title: "Nota de respuesta a bulos · actualizada", createdAt: "2026-05-13T09:00:00Z", actorName: "Clara Ruiz",     meta: "Estado: revisión" },
  { id: "act_evt_004", workspaceId: "ws_espana_2026", type: "research",   title: "Hilo de research 'Narrativa financiación' actualizado", createdAt: "2026-05-13T08:30:00Z", actorName: "Clara Ruiz", meta: "47 fuentes · 12 citas" },
  { id: "act_evt_005", workspaceId: "ws_espana_2026", type: "issue",      title: "Issue 'Bulos financiación' marcado como crítico", createdAt: "2026-05-13T08:00:00Z", actorName: "Ana Gómez", meta: "Severidad: crítico" },
  { id: "act_evt_006", workspaceId: "ws_espana_2026", type: "action",     title: "Acción 'Activar mensaje vivienda' completada", createdAt: "2026-05-13T12:00:00Z", actorName: "Clara Ruiz", meta: "Issue iss_002" },
  { id: "act_evt_007", workspaceId: "ws_espana_2026", type: "decision",   title: "Decisión: aplazar reforma fiscal a octubre", createdAt: "2026-05-12T18:30:00Z", actorName: "Hacienda",   meta: "Issue iss_005" },
  { id: "act_evt_008", workspaceId: "ws_espana_2026", type: "alert",      title: "Caída 2.3pp PP en barómetro Andalucía",      createdAt: "2026-05-12T18:00:00Z", actorName: "Sondeos",     meta: "Severidad alta" },
  { id: "act_evt_009", workspaceId: "ws_espana_2026", type: "doc",        title: "Q&A vivienda · publicado",                    createdAt: "2026-05-12T14:00:00Z", actorName: "Ana Gómez",    meta: "Briefing" },
  { id: "act_evt_010", workspaceId: "ws_espana_2026", type: "automation", title: "Indexación BOE completada",                   createdAt: "2026-05-12T09:00:00Z", actorName: "Sistema",      meta: "18 normas · 3 relevantes" },
  { id: "act_evt_011", workspaceId: "ws_espana_2026", type: "research",   title: "Nuevo hilo: 'Coaliciones PP-VOX'",            createdAt: "2026-05-08T13:00:00Z", actorName: "Javier Ortega", meta: "29 fuentes" },
  { id: "act_evt_012", workspaceId: "ws_espana_2026", type: "issue",      title: "Issue 'Pacto PP-VOX Galicia' abierto",        createdAt: "2026-05-07T16:00:00Z", actorName: "Javier Ortega", meta: "Severidad: normal" },
];

// ─────────────────────────────────────────────────────────────────────
//  CANVAS SUMMARY
// ─────────────────────────────────────────────────────────────────────

export const canvasSummaries: WorkspaceCanvasSummary[] = [
  {
    id: "canvas_demo_mocion_2026",
    workspaceId: "ws_espana_2026",
    title: "Análisis Moción de Censura 2026",
    objectCount: 14,
    connectionCount: 18,
    hypothesisCount: 4,
    openHypotheses: 2,
    updatedAt: "2026-05-12T10:00:00Z",
  },
];

// ─────────────────────────────────────────────────────────────────────
//  CONTEXTO Y CHAT DEL AGENTE
// ─────────────────────────────────────────────────────────────────────

export const demoAgentContext: AgentContextItem[] = [
  { type: "issue",    id: "iss_001",                  title: "Bulos sobre financiación del partido", meta: "Crítico · abierto" },
  { type: "canvas",   id: "canvas_demo_mocion_2026",  title: "Análisis Moción de Censura 2026",       meta: "2 hipótesis abiertas" },
  { type: "document", id: "doc_002",                  title: "Estrategia comunicación mayo 2026",     meta: "Actualizado hoy" },
];

export const demoAgentMessages: AgentMessage[] = [
  { id: "m1", role: "assistant", content: "Detecté 3 señales de riesgo nuevas relacionadas con la negociación presupuestaria. ¿Te preparo un briefing?", timestamp: new Date("2026-05-13T08:30:00") },
  { id: "m2", role: "user",      content: "Sí, enfócate en el impacto en Cataluña.",                                                                  timestamp: new Date("2026-05-13T08:31:00") },
  { id: "m3", role: "assistant", content: "Preparando briefing. Incluiré posiciones de Junts y ERC, votaciones clave y proyecciones de escaños.",      timestamp: new Date("2026-05-13T08:31:30") },
];

// ─────────────────────────────────────────────────────────────────────
//  Compatibilidad con Sprint 0 (alias de los nuevos arrays)
// ─────────────────────────────────────────────────────────────────────

export const demoWorkspace = workspaces[0];
export const demoMembers = members;
export const demoIssues = issues;
export const demoActions = actions;
export const demoDecisions = decisions;
