import { NextRequest, NextResponse } from "next/server";
import { streamText, OllamaUnavailableError, isAiEnabled, AI_CONFIG } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Genera un resumen ejecutivo del workspace usando Ollama (llama3.2 por defecto).
 * Recibe un dossier compacto (texto plano con KPIs/issues/proyectos) y un
 * objetivo opcional. Devuelve texto en streaming UTF-8.
 */
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const { context = "", goal = "informe ejecutivo", workspaceName = "Politeia" } = body ?? {};

  if (!isAiEnabled()) {
    return mockResponse(workspaceName, context, goal);
  }

  const system = [
    `Eres un analista jefe de inteligencia política. Trabajas en el workspace "${workspaceName}".`,
    `Tu tono es ejecutivo, denso y operativo. Nunca usas emojis ni disclaimers genéricos.`,
    `Escribe en español. Estructura: situación · riesgos · oportunidades · 3 recomendaciones priorizadas.`,
  ].join("\n");

  const user = [
    `Objetivo: ${goal}.`,
    ``,
    `Datos del workspace:`,
    context,
    ``,
    `Redacta un resumen ejecutivo de 350-500 palabras con la estructura solicitada.`,
  ].join("\n");

  try {
    const stream = streamText({
      system,
      messages: [{ role: "user", content: user }],
      temperature: 0.25,
      maxTokens: 1024,
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-AI-Provider": AI_CONFIG.provider,
      },
    });
  } catch (err) {
    if (err instanceof OllamaUnavailableError) return mockResponse(workspaceName, context, goal);
    return mockResponse(workspaceName, context, goal);
  }
}

function mockResponse(name: string, context: string, goal: string) {
  const text = [
    `Resumen ejecutivo · ${name}`,
    ``,
    `Objetivo: ${goal}.`,
    ``,
    `Situación: ${context.split("\n").slice(0, 3).join(" ").slice(0, 240) || "sin datos suficientes"}.`,
    ``,
    `Riesgos: tensión legislativa con socios externos, ciclo mediático adverso de corta duración, exposición pública en dos dossieres sectoriales.`,
    ``,
    `Oportunidades: ventana de 72h para abrir canal con Junts, comunicación proactiva sobre vivienda, retoma de la nota CCAA.`,
    ``,
    `Recomendaciones:`,
    `1. Activar Q&A defensivo para próximas 24h.`,
    `2. Comunicado proactivo sobre Plan Vive antes del lunes.`,
    `3. Reunión interna de coordinación con dirección.`,
    ``,
    `[respuesta mock — configura OLLAMA_URL para activar síntesis Ollama]`,
  ].join("\n");
  return new Response(text, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "X-AI-Provider": "mock" },
  });
}
