import type { RadarOpportunity } from "@/types/radar";

/**
 * Mock determinista usado cuando OLLAMA_URL no está configurado o falla.
 * Se construye en base al workspace para tener algo de variedad.
 */
export function buildMockRadar(workspaceId: string): RadarOpportunity[] {
  const now = new Date().toISOString();
  const baseId = workspaceId.slice(-6);
  return [
    {
      id: `opp_${baseId}_01`,
      title: "Abrir canal bilateral con Junts antes del pleno",
      score: 84,
      impact: "alto",
      confidence: 0.78,
      horizon: "week",
      category: "Legislativo",
      rationale: "Junts mantiene posición ambigua y hay ventana operativa antes de la votación del miércoles.",
      actions: [
        { label: "Reunión informal con portavoz Junts", timeline: "48h", owner: "Dirección" },
        { label: "Borrador de enmienda transaccional",  timeline: "72h", owner: "Equipo legislativo" },
      ],
      relatedIds: ["iss_001"],
      generatedAt: now,
      source: "mock",
    },
    {
      id: `opp_${baseId}_02`,
      title: "Comunicado proactivo sobre Plan Vive",
      score: 72,
      impact: "medio",
      confidence: 0.7,
      horizon: "week",
      category: "Mediático",
      rationale: "El ciclo mediático en vivienda está dominado por la oposición; hay espacio para retomar narrativa.",
      actions: [
        { label: "Briefing prensa especializada", timeline: "lunes", owner: "Comunicación" },
        { label: "Talking points para portavocía", timeline: "fin de semana", owner: "Comunicación" },
      ],
      relatedIds: [],
      generatedAt: now,
      source: "mock",
    },
    {
      id: `opp_${baseId}_03`,
      title: "Reactivar Q&A defensivo TVE",
      score: 65,
      impact: "medio",
      confidence: 0.65,
      horizon: "now",
      category: "Mediático",
      rationale: "Próximas 24h con entrevistas en TVE; el Q&A actual está desfasado tras la última remodelación.",
      actions: [
        { label: "Revisar Q&A vigente y actualizar 5 preguntas críticas", timeline: "24h", owner: "Comunicación" },
      ],
      relatedIds: [],
      generatedAt: now,
      source: "mock",
    },
    {
      id: `opp_${baseId}_04`,
      title: "Coordinación CCAA presupuestos sectoriales",
      score: 58,
      impact: "alto",
      confidence: 0.6,
      horizon: "month",
      category: "Sectorial",
      rationale: "Tres CCAA mostraron disposición a alinearse en la posición sectorial.",
      actions: [
        { label: "Convocatoria informal CCAA afines", timeline: "2 semanas", owner: "Coordinación territorial" },
      ],
      relatedIds: [],
      generatedAt: now,
      source: "mock",
    },
    {
      id: `opp_${baseId}_05`,
      title: "Nota analítica trimestral riesgo regulatorio",
      score: 51,
      impact: "medio",
      confidence: 0.55,
      horizon: "quarter",
      category: "Riesgo",
      rationale: "Acumulamos seis dossieres relevantes que pueden consolidarse en una nota analítica diferenciadora.",
      actions: [
        { label: "Esquema de la nota + reparto autoría", timeline: "1 mes", owner: "Equipo análisis" },
      ],
      relatedIds: [],
      generatedAt: now,
      source: "mock",
    },
  ];
}
