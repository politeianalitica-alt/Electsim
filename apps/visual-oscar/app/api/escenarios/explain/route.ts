/**
 * POST /api/escenarios/explain
 *
 * Genera un análisis estructurado de factores favorables y desfavorables
 * para un escenario de gobierno específico, usando Claude Sonnet con
 * contexto vivo del dashboard.
 *
 * Input:
 *   {
 *     scenario_id: 'pp-vox-cc' | 'psoe-junts' | ...,
 *     scenario_nombre: string,
 *     composition: string[],   // ['PP', 'VOX', 'CC']
 *     seats: number,           // total de escaños
 *     viable: boolean,
 *     prob: number,            // probabilidad estimada
 *     tipo: 'derecha' | 'izquierda' | ...,
 *   }
 *
 * Output:
 *   {
 *     factores_favorables: string[],
 *     factores_desfavorables: string[],
 *     sucesos_pivote: string[],     // eventos concretos que decidirían
 *     analista_note: string,        // 1-2 frases de síntesis
 *     model: string,
 *     ms: number,
 *   }
 */

import { NextRequest, NextResponse } from "next/server";
import { generateJSON, AI_CONFIG, AiUnavailableError } from "@/lib/ai";
import { buildLiveContext } from "@/lib/ai/context-builder";

export const runtime = "nodejs";
export const maxDuration = 60;

interface ExplainRequest {
  scenario_id: string;
  scenario_nombre: string;
  composition: string[];
  seats: number;
  viable: boolean;
  prob: number;
  tipo: string;
}

interface ExplainResponse {
  factores_favorables: string[];
  factores_desfavorables: string[];
  sucesos_pivote: string[];
  analista_note: string;
  model: string;
  ms: number;
  source: string;
}

const SCHEMA_HINT = `Devuelve un JSON con esta estructura exacta:
{
 "factores_favorables": ["frase 1", "frase 2", "frase 3"],    // 3-4 factores
 "factores_desfavorables": ["frase 1", "frase 2", "frase 3"], // 3-4 factores
 "sucesos_pivote": ["evento 1", "evento 2"],                   // 2-3 eventos
 "analista_note": "1-2 frases de síntesis ejecutiva"
}

Reglas estrictas:
- Cada frase corta (max 90 caracteres), accionable, sin relleno
- "factores_favorables": tendencias actuales que aumentan la probabilidad
- "factores_desfavorables": riesgos/obstáculos que la reducen
- "sucesos_pivote": eventos hipotéticos concretos que decidirían el escenario
  (ej: "una moción de censura ganada", "Junts retira apoyo en presupuestos")
- "analista_note": síntesis "Este escenario depende crucialmente de…"
- Tono: analista político senior español, sin emojis, sin disclaimers
- Cifras concretas cuando aplique`;

function mockResponse(input: ExplainRequest): ExplainResponse {
  return {
    factores_favorables: [
 `Suma ${input.seats} escaños sobre 350 (${input.viable ? "supera" : "no llega a"} mayoría 176)`,
 "Análisis IA no disponible; configura ANTHROPIC_API_KEY",
    ],
    factores_desfavorables: ["Datos en vivo limitados sin LLM activo"],
    sucesos_pivote: ["Próximas elecciones generales", "Cambios en la dirección de los partidos"],
    analista_note: `Escenario "${input.scenario_nombre}" con probabilidad estimada del ${input.prob}%.`,
    model: "mock",
    ms: 0,
    source: "mock",
  };
}

export async function POST(req: NextRequest) {
  const started = Date.now();
  let body: ExplainRequest;
  try {
    body = (await req.json()) as ExplainRequest;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!body.scenario_id || !body.scenario_nombre) {
    return NextResponse.json({ error: "scenario_id y scenario_nombre son obligatorios" }, { status: 400 });
  }

  if (AI_CONFIG.provider !== "anthropic") {
    return NextResponse.json(mockResponse(body));
  }

  try {
    const liveContext = await buildLiveContext();
    const composition = body.composition.length > 0
      ? `Composición: ${body.composition.join(" + ")}`
      : `Composición: sin coalición posible (escenario de bloqueo/repetición)`;

    const user = [
 `Analiza el escenario de gobierno: **${body.scenario_nombre}**`,
 ``,
      composition,
 `Escaños totales: ${body.seats} (mayoría absoluta: 176)`,
 `Viabilidad matemática: ${body.viable ? "SÍ llega a mayoría" : "NO llega a mayoría"}`,
 `Probabilidad estimada: ${body.prob}%`,
 `Tipo: ${body.tipo}`,
 ``,
 `Devuelve el análisis estructurado en JSON con factores favorables,`,
 `desfavorables, sucesos pivote y nota del analista.`,
    ].join("\n");

    const system = `Eres un analista político senior español especializado en España 2026.
Tu trabajo: analizar escenarios de coalición de gobierno desde una perspectiva técnica,
usando los datos vivos del dashboard.

DATOS VIVOS DEL DASHBOARD:
${liveContext}

Cuando analices un escenario:
- Considera el contexto político actual (encuestas, narrativas, alertas)
- Cita actores y partidos concretos (no genéricos)
- Identifica eventos pivote concretos (no "el clima político en general")
- Sé directo y sin relleno`;

    const result = await generateJSON<{
      factores_favorables: string[];
      factores_desfavorables: string[];
      sucesos_pivote: string[];
      analista_note: string;
    }>({
      tier: "premium", // Sonnet para análisis más denso
      system,
      schemaHint: SCHEMA_HINT,
      messages: [{ role: "user", content: user }],
      temperature: 0.35,
      maxTokens: 1500,
    });

    return NextResponse.json({
      factores_favorables: result.factores_favorables || [],
      factores_desfavorables: result.factores_desfavorables || [],
      sucesos_pivote: result.sucesos_pivote || [],
      analista_note: result.analista_note || "",
      model: AI_CONFIG.anthropicModel,
      ms: Date.now() - started,
      source: "anthropic",
    } as ExplainResponse);
  } catch (err) {
    if (err instanceof AiUnavailableError) {
      // eslint-disable-next-line no-console
      console.warn("[escenarios/explain] AI failed:", err.message);
    }
    return NextResponse.json(mockResponse(body));
  }
}
