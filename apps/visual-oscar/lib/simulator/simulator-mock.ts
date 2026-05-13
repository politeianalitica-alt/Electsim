import type { DecisionSimulation, DecisionOutcome, CounterMove } from "@/types/simulator";

export function buildMockSimulation(scenario: string, workspaceId: string): DecisionSimulation {
  const outcomes: DecisionOutcome[] = [
    {
      id: "base",
      label: "Escenario base",
      probability: 55,
      likelihood: "moderate",
      narrative: "La iniciativa avanza con desgaste mediático leve. Junts mantiene su ambigüedad, ERC presiona por nuevos términos. Sin movimientos disruptivos.",
      impactPublic: -5,
      impactInternal: -10,
      signals: ["Cobertura TVE estable", "Mensajes informales Junts no rupturistas"],
    },
    {
      id: "optimo",
      label: "Escenario óptimo",
      probability: 25,
      likelihood: "low",
      narrative: "El movimiento abre espacio narrativo y consolida apoyos. Junts entra en negociación bilateral. La opinión pública premia el liderazgo.",
      impactPublic: 35,
      impactInternal: 25,
      signals: ["Editoriales favorables en >2 cabeceras", "Reunión bilateral confirmada en 72h"],
    },
    {
      id: "adverso",
      label: "Escenario adverso",
      probability: 20,
      likelihood: "low",
      narrative: "La oposición consigue capitalizar el movimiento como prueba de debilidad. Ruptura con Junts y arrastre mediático adverso de 7-10 días.",
      impactPublic: -40,
      impactInternal: -45,
      signals: ["Tono adverso en TVE y SER simultáneo", "Junts emite comunicado de distanciamiento"],
    },
  ];
  const counterMoves: CounterMove[] = [
    { actor: "PP",    move: "Discurso en pleno señalando «improvisación»",          rationale: "Aprovechará el primer día para fijar el frame de inestabilidad." },
    { actor: "Junts", move: "Pedirá reunión bilateral antes de fijar posición",     rationale: "Maximiza palanca negociadora sin coste reputacional." },
    { actor: "Vox",   move: "Amplificará vía redes el adverso de la base social",   rationale: "Consistente con su patrón de estrategia digital ofensiva." },
  ];
  return {
    id: `sim_${Date.now()}`,
    workspaceId,
    scenario,
    generatedAt: new Date().toISOString(),
    source: "mock",
    context: "Mock determinista — configura OLLAMA_URL para análisis real.",
    outcomes,
    counterMoves,
    recommendation: "Avanzar con cautela. Activar canal bilateral con Junts antes del movimiento público. Tener Q&A defensivo listo para las 24h siguientes.",
    riskFlags: [
      "Cobertura adversa concentrada en una sola cabecera puede desencadenar cascada.",
      "Junts puede usar el movimiento como excusa para forzar reapertura de la agenda.",
    ],
  };
}
