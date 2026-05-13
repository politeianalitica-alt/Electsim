import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs"; // mantenemos nodejs para no obligar al edge cuando hay deps externas
export const maxDuration = 60;

/**
 * Síntesis IA para Research.
 *
 * Si ANTHROPIC_API_KEY está configurada, llama al modelo via Vercel AI SDK
 * (streaming via toDataStreamResponse).
 * Si NO está configurada, devuelve un mock plausible y determinista.
 *
 * Sprint 7 baseline: el cliente espera datos en stream (useCompletion).
 */
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const { sources = [], synthesisType = "summary", workspaceContext, query = "" } = body ?? {};
  const apiKey = process.env.ANTHROPIC_API_KEY;

  // --- Fallback determinista cuando no hay API key (entornos preview / sin configuración) ---
  if (!apiKey) {
    const mockText = buildMockSynthesis({ sources, synthesisType, query, workspaceContext });
    return new Response(mockText, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  // --- Camino real con Vercel AI SDK ---
  try {
    const aiSdk: any = await import("ai");
    const provider: any = await import("@ai-sdk/anthropic");

    const sourceTexts = sources
      .map((s: { title: string; content: string }, i: number) =>
        `--- Fuente ${i + 1}: ${s.title} ---\n${(s.content ?? "").slice(0, 4000)}`
      )
      .join("\n\n");

    const systemPrompt =
      `Eres un analista político senior especializado en política española. ` +
      `Trabajas para el workspace "${workspaceContext?.workspaceName ?? "Politeia"}". ` +
      `Issues activos: ${(workspaceContext?.activeIssues ?? []).join(", ") || "ninguno"}. ` +
      `Responde en español, sin disclaimers ni frases genéricas.`;

    const prompts: Record<string, string> = {
      summary:        `Resume las fuentes en 3-4 párrafos. Query: "${query}".\n\n${sourceTexts}`,
      key_points:     `Extrae 5-7 puntos clave. Query: "${query}".\n\n${sourceTexts}`,
      entities:       `Identifica entidades políticas (personas, organizaciones, leyes, eventos) con tipo, relevancia 1-10 y contexto.\n\n${sourceTexts}`,
      timeline:       `Construye una línea de tiempo de los eventos ordenados.\n\n${sourceTexts}`,
      contradictions: `Detecta contradicciones, narrativas opuestas o afirmaciones incompatibles, indicando qué fuente sostiene cada posición.\n\n${sourceTexts}`,
      full_analysis:  `Análisis político completo de "${query}": contexto, actores, narrativas, implicaciones, recomendaciones estratégicas.\n\n${sourceTexts}`,
    };

    const result = aiSdk.streamText({
      model: provider.anthropic("claude-sonnet-4-5"),
      system: systemPrompt,
      messages: [{ role: "user", content: prompts[synthesisType] ?? prompts.summary }],
      temperature: 0.3,
      maxTokens: 2048,
    });

    return result.toDataStreamResponse();
  } catch (err) {
    // Fallback si las deps fallan en build.
    const mockText = buildMockSynthesis({ sources, synthesisType, query, workspaceContext });
    return new Response(mockText, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

function buildMockSynthesis(input: {
  sources: { title: string; content: string }[];
  synthesisType: string;
  query: string;
  workspaceContext?: { workspaceName?: string; activeIssues?: string[] };
}): string {
  const count = input.sources.length;
  const titles = input.sources.slice(0, 3).map(s => `«${s.title}»`).join(", ");
  const header = `Síntesis (${input.synthesisType}) de ${count} fuentes`;
  const body = [
    header,
    "",
    `Query: ${input.query || "(sin query)"}`,
    titles ? `Fuentes destacadas: ${titles}.` : "",
    "",
    "Hallazgos preliminares:",
    "- La cobertura está dividida en dos narrativas dominantes que apuntan a una polarización institucional.",
    "- Los datos del CIS sugieren un desgaste moderado del partido gobernante (-2.3pp) pero sin pivote estructural.",
    "- Junts mantiene su posición ambigua, consistente con su patrón de negociación de los últimos 18 meses.",
    "",
    "Recomendaciones:",
    "1. Priorizar Q&A defensivo en próximas 24h para entrevistas TVE.",
    "2. Activar canal bilateral con portavoz Junts esta semana.",
    "3. Preparar comunicado proactivo sobre Plan Vive (vivienda) antes del lunes.",
    "",
    `[respuesta mock generada sin LLM real — configura ANTHROPIC_API_KEY para activar síntesis real]`,
  ].filter(Boolean).join("\n");
  return body;
}
