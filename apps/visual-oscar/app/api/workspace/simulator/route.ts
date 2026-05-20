import { NextRequest, NextResponse } from "next/server";
import { generateJSON, OllamaUnavailableError, isAiEnabled, AI_CONFIG } from "@/lib/ai";
import { SimulationPayloadSchema, SIM_SCHEMA_HINT } from "@/lib/simulator/simulator-schema";
import { buildMockSimulation } from "@/lib/simulator/simulator-mock";
import type { DecisionSimulation } from "@/types/simulator";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/workspace/simulator
 *
 * Body: { workspaceId, scenario, context?, workspaceName? }
 * Response: DecisionSimulation
 *
 * Genera 3 outcomes (base/óptimo/adverso) con probabilidades, contramovimientos
 * y recomendación. Ollama con format:"json" + validación Zod.
 */
export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }

  const { workspaceId = "ws_unknown", scenario = "", context = "", workspaceName = "Politeia" } = body ?? {};
  if (!scenario || typeof scenario !== "string") {
    return NextResponse.json({ error: "missing_scenario" }, { status: 400 });
  }

  if (!isAiEnabled()) return NextResponse.json(buildMockSimulation(scenario, workspaceId));

  const system = [
    `Eres un analista estratégico senior especializado en simulación política.`,
    `Trabajas para el workspace "${workspaceName}".`,
    `Tu tarea: dado un escenario hipotético, generar 3 outcomes con probabilidades realistas,`,
    `contramovimientos de los actores relevantes y una recomendación operativa.`,
    `Tono ejecutivo, denso, en español, sin emojis.`,
  ].join("\n");

  const user = [
    `Escenario: ${scenario}`,
    ``,
    `Contexto del workspace:`,
    context || "(sin contexto adicional)",
    ``,
    `Genera la simulación con 3 outcomes (base/óptimo/adverso) según el schema.`,
  ].join("\n");

  try {
    const raw = await generateJSON<unknown>({
      system,
      schemaHint: SIM_SCHEMA_HINT,
      messages: [{ role: "user", content: user }],
      temperature: 0.3,
      maxTokens: 1800,
    });
    const parsed = SimulationPayloadSchema.safeParse(raw);
    if (!parsed.success) return NextResponse.json(buildMockSimulation(scenario, workspaceId));

    const sim: DecisionSimulation = {
      id: `sim_${Date.now()}`,
      workspaceId,
      scenario,
      generatedAt: new Date().toISOString(),
      source: AI_CONFIG.provider === "anthropic" ? "anthropic" : "ollama",
      context: context.slice(0, 600),
      outcomes:       parsed.data.outcomes,
      counterMoves:   parsed.data.counterMoves,
      recommendation: parsed.data.recommendation,
      riskFlags:      parsed.data.riskFlags ?? [],
    };
    return NextResponse.json(sim);
  } catch (err) {
    if (err instanceof OllamaUnavailableError) return NextResponse.json(buildMockSimulation(scenario, workspaceId));
    return NextResponse.json(buildMockSimulation(scenario, workspaceId));
  }
}
