import { NextRequest, NextResponse } from "next/server";
import { streamText, OllamaUnavailableError } from "@/lib/ai";
import { isAiEnabled } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Síntesis IA para Research, alimentada por Ollama (llama3.2:latest por defecto).
 * Si OLLAMA_URL no está configurada o el upstream falla, devolvemos un mock
 * plausible para no romper el cliente.
 */
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const { sources = [], synthesisType = "summary", workspaceContext, query = "" } = body ?? {};

  if (!isAiEnabled()) {
    return mockResponse({ sources, synthesisType, query, workspaceContext });
  }

  const sourceTexts = sources
    .map((s: { title: string; content: string }, i: number) =>
      `--- Fuente ${i + 1}: ${s.title} ---\n${(s.content ?? "").slice(0, 4000)}`
    )
    .join("\n\n");

  const systemPrompt =
    `Eres un analista político senior especializado en política española. ` +
    `Trabajas para el workspace "${workspaceContext?.workspaceName ?? "Politeia"}". ` +
    `Issues activos: ${(workspaceContext?.activeIssues ?? []).join(", ") || "ninguno"}. ` +
    `Responde siempre en español, sin disclaimers ni frases genéricas.`;

  const prompts: Record<string, string> = {
    summary:        `Resume las fuentes en 3-4 párrafos. Query: "${query}".\n\n${sourceTexts}`,
    key_points:     `Extrae 5-7 puntos clave (bullet points concisos). Query: "${query}".\n\n${sourceTexts}`,
    entities:       `Identifica entidades políticas (personas, organizaciones, leyes, eventos) con tipo, relevancia 1-10 y contexto.\n\n${sourceTexts}`,
    timeline:       `Construye una línea de tiempo de los eventos relevantes, ordenada cronológicamente.\n\n${sourceTexts}`,
    contradictions: `Detecta contradicciones, narrativas opuestas o afirmaciones incompatibles, indicando qué fuente sostiene cada posición.\n\n${sourceTexts}`,
    full_analysis:  `Análisis político completo de "${query}": contexto, actores, narrativas, implicaciones, recomendaciones estratégicas.\n\n${sourceTexts}`,
  };

  try {
    const stream = streamText({
      system: systemPrompt,
      messages: [{ role: "user", content: prompts[synthesisType] ?? prompts.summary }],
      temperature: 0.3,
      maxTokens: 2048,
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-AI-Provider": "ollama",
      },
    });
  } catch (err) {
    if (err instanceof OllamaUnavailableError) {
      return mockResponse({ sources, synthesisType, query, workspaceContext });
    }
    return mockResponse({ sources, synthesisType, query, workspaceContext });
  }
}

function mockResponse(input: {
  sources: { title: string; content: string }[];
  synthesisType: string;
  query: string;
  workspaceContext?: { workspaceName?: string; activeIssues?: string[] };
}) {
  const text = buildMockSynthesis(input);
  return new Response(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-AI-Provider": "mock",
    },
  });
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
  const lines = [
    header,
    "",
    `Query: ${input.query || "(sin query)"}`,
    titles ? `Fuentes destacadas: ${titles}.` : "",
    "",
    "Hallazgos preliminares:",
    "- Cobertura partida en dos narrativas dominantes que apuntan a polarización institucional.",
    "- Datos CIS sugieren desgaste moderado del partido gobernante (-2.3pp) sin pivote estructural.",
    "- Junts mantiene posición ambigua, coherente con su patrón de negociación de los últimos 18 meses.",
    "",
    "Recomendaciones:",
    "1. Q&A defensivo en próximas 24h para entrevistas TVE.",
    "2. Canal bilateral con portavoz Junts esta semana.",
    "3. Comunicado proactivo sobre Plan Vive (vivienda) antes del lunes.",
    "",
    `[respuesta mock generada sin LLM real — configura OLLAMA_URL para activar síntesis Ollama]`,
  ].filter(Boolean);
  return lines.join("\n");
}
