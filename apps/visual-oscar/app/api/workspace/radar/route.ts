import { NextRequest, NextResponse } from "next/server";
import { generateJSON, OllamaUnavailableError, isAiEnabled, AI_CONFIG } from "@/lib/ai";
import {
  RadarPayloadSchema,
  RADAR_SCHEMA_HINT,
  type RadarPayload,
} from "@/lib/radar/radar-schema";
import { buildMockRadar } from "@/lib/radar/radar-mock";
import type { RadarBatch } from "@/types/radar";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/workspace/radar
 *
 * Genera un batch estructurado de oportunidades mediante Ollama
 * (`format: "json"` + validación Zod). Cuando OLLAMA_URL no está
 * configurado o el output es inválido, cae a un mock determinista.
 */
export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const { workspaceId = "ws_unknown", context = "", workspaceName = "Politeia" } = body ?? {};

  const fallback: RadarBatch = {
    id: `rb_${Date.now()}`,
    workspaceId,
    generatedAt: new Date().toISOString(),
    source: "mock",
    opportunities: buildMockRadar(workspaceId),
  };

  if (!isAiEnabled()) {
    return NextResponse.json(fallback);
  }

  const system = [
    `Eres un analista jefe de inteligencia política. Trabajas para el workspace "${workspaceName}".`,
    `Identifica oportunidades de ALTO valor estratégico para el equipo: ventanas tácticas, jugadas, comunicación proactiva.`,
    `No inventes hechos. Si los datos son escasos, prioriza oportunidades genéricas plausibles.`,
    `Escribe en español, sin emojis.`,
  ].join("\n");

  const user = [
    `Workspace: ${workspaceName}.`,
    `Datos actuales:`,
    context,
    ``,
    `Genera entre 4 y 6 oportunidades con la estructura indicada. Ordena por score descendente.`,
  ].join("\n");

  try {
    const raw = await generateJSON<unknown>({
      system,
      schemaHint: RADAR_SCHEMA_HINT,
      messages: [{ role: "user", content: user }],
      temperature: 0.35,
      maxTokens: 1500,
    });

    const parsed = RadarPayloadSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ ...fallback, error: "schema_invalid" });
    }

    const batch: RadarBatch = {
      id: `rb_${Date.now()}`,
      workspaceId,
      generatedAt: new Date().toISOString(),
      source: AI_CONFIG.provider === "anthropic" ? "anthropic" : "ollama",
      opportunities: (parsed.data as RadarPayload).opportunities.map(o => ({
        ...o,
        relatedIds:  o.relatedIds ?? [],
        generatedAt: new Date().toISOString(),
        source:      AI_CONFIG.provider === "anthropic" ? "anthropic" : "ollama",
      })),
    };
    return NextResponse.json(batch);
  } catch (err) {
    if (err instanceof OllamaUnavailableError) return NextResponse.json(fallback);
    return NextResponse.json(fallback);
  }
}
