import type { InvestigationCanvas } from "@/types/canvas";

const T = "2026-05-01T00:00:00Z";

export const canvasMockData: InvestigationCanvas[] = [
  {
    id: "canvas_demo_mocion_2026",
    workspaceId: "ws_espana_2026",
    title: "Análisis Moción de Censura 2026",
    description: "Mapa de actores, movimientos y hipótesis sobre la moción.",
    createdAt: T,
    updatedAt: "2026-05-12T10:00:00Z",
    objects: [
      { id: "obj_001", canvasId: "canvas_demo_mocion_2026", type: "actor",        label: "Pedro Sánchez",                position: { x: 400, y: 200 }, tags: ["PSOE","gobierno"],     confidence: 0.95, createdAt: T, updatedAt: T },
      { id: "obj_002", canvasId: "canvas_demo_mocion_2026", type: "actor",        label: "Alberto Núñez Feijóo",         position: { x: 700, y: 200 }, tags: ["PP","oposición"],      confidence: 0.95, createdAt: T, updatedAt: T },
      { id: "obj_003", canvasId: "canvas_demo_mocion_2026", type: "event",        label: "Votación presupuestos fallida",position: { x: 550, y: 400 }, tags: ["legislativo","crítico"], confidence: 1.0,  createdAt: T, updatedAt: T },
      { id: "obj_004", canvasId: "canvas_demo_mocion_2026", type: "narrative",    label: "Bulos financiación partido",   position: { x: 200, y: 350 }, tags: ["desinformación"],       confidence: 0.85, createdAt: T, updatedAt: T },
      { id: "obj_005", canvasId: "canvas_demo_mocion_2026", type: "organization", label: "Junts",                         position: { x: 550, y: 100 }, tags: ["independentismo","clave"], confidence: 0.9, createdAt: T, updatedAt: T },
    ],
    connections: [
      { id: "conn_001", canvasId: "canvas_demo_mocion_2026", sourceId: "obj_003", targetId: "obj_001", type: "caused_by",  label: "cataliza",        weight: 0.9,  bidirectional: false, confidence: 0.85, createdAt: T },
      { id: "conn_002", canvasId: "canvas_demo_mocion_2026", sourceId: "obj_005", targetId: "obj_003", type: "influences", label: "bloqueó",         weight: 0.95, bidirectional: false, confidence: 0.95, createdAt: T },
      { id: "conn_003", canvasId: "canvas_demo_mocion_2026", sourceId: "obj_004", targetId: "obj_001", type: "opposes",    label: "daña reputación", weight: 0.7,  bidirectional: false, confidence: 0.8,  createdAt: T },
    ],
    hypotheses: [
      {
        id: "hyp_001",
        canvasId: "canvas_demo_mocion_2026",
        title: "Junts ha coordinado los bulos con el PP",
        statement: "Existe coordinación entre Junts y sectores del PP para difundir narrativas sobre financiación ilegal del partido gobernante.",
        status: "investigating",
        confidence: 0.45,
        supportingObjectIds: ["obj_004", "obj_005"],
        refutingObjectIds: [],
        createdAt: T,
        updatedAt: "2026-05-10T00:00:00Z",
      },
      {
        id: "hyp_002",
        canvasId: "canvas_demo_mocion_2026",
        title: "La moción fracasará por falta de votos",
        statement: "El PP no alcanza los 176 votos necesarios sin Vox y Junts simultáneamente.",
        status: "supported",
        confidence: 0.78,
        supportingObjectIds: ["obj_002", "obj_005"],
        refutingObjectIds: [],
        createdAt: T,
        updatedAt: "2026-05-11T00:00:00Z",
      },
    ],
    timeline: [
      { id: "te_001", canvasId: "canvas_demo_mocion_2026", date: "2026-04-15", title: "Fallo votación presupuestos",         linkedObjectIds: ["obj_003"],          significance: "critical" },
      { id: "te_002", canvasId: "canvas_demo_mocion_2026", date: "2026-04-22", title: "PP anuncia moción de censura",         linkedObjectIds: ["obj_002"],          significance: "high" },
      { id: "te_003", canvasId: "canvas_demo_mocion_2026", date: "2026-05-01", title: "Inicia campaña de bulos",               linkedObjectIds: ["obj_004"],          significance: "high" },
      { id: "te_004", canvasId: "canvas_demo_mocion_2026", date: "2026-05-20", title: "Votación moción prevista",             linkedObjectIds: ["obj_001","obj_002"], significance: "critical" },
    ],
    clusters: [],
  },
];
