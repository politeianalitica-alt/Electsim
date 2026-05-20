import { NextRequest, NextResponse } from "next/server";
import { generateJSON, OllamaUnavailableError, isAiEnabled, AI_CONFIG } from "@/lib/ai";
import { DeckPayloadSchema, SLIDES_SCHEMA_HINT } from "@/lib/slides/slides-schema";
import { buildMockDeck } from "@/lib/slides/slides-mock";
import type { Deck } from "@/types/slides";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/workspace/slides
 *
 * Body: { workspaceId, brief, context? }
 * Response: Deck
 *
 * Genera una baraja de slides via Ollama (`format:"json"`) validada por
 * Zod. Si Ollama falla → mock determinista.
 */
export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }); }

  const { workspaceId = "ws_unknown", brief = "", context = "", workspaceName = "Politeia" } = body ?? {};
  const inferredTitle = (brief || "Brief del workspace").slice(0, 120);

  const fallback: Deck = {
    id: `deck_${Date.now()}`,
    workspaceId,
    title: inferredTitle,
    subtitle: "Vista de muestra · PoliteIA generará el deck en vivo",
    client: workspaceName,
    generatedAt: new Date().toISOString(),
    source: "mock",
    slides: buildMockDeck(inferredTitle),
  };

  if (!isAiEnabled()) return NextResponse.json(fallback);

  const system = [
    `Eres un consultor político senior. Genera presentaciones ejecutivas en español, sin emojis.`,
    `Tono: profesional, denso, accionable. Frases cortas. Sin disclaimers.`,
    `Workspace: "${workspaceName}".`,
  ].join("\n");

  const user = [
    `Encargo: ${brief || "Brief ejecutivo del workspace"}.`,
    `Datos disponibles del workspace:`,
    context || "(sin contexto adicional)",
    ``,
    `Genera 8-12 slides con la estructura indicada.`,
  ].join("\n");

  try {
    const raw = await generateJSON<unknown>({
      system,
      schemaHint: SLIDES_SCHEMA_HINT,
      messages: [{ role: "user", content: user }],
      temperature: 0.3,
      maxTokens: 2200,
    });
    const parsed = DeckPayloadSchema.safeParse(raw);
    if (!parsed.success) return NextResponse.json({ ...fallback, error: "schema_invalid" });

    const deck: Deck = {
      id: `deck_${Date.now()}`,
      workspaceId,
      title: parsed.data.title,
      subtitle: parsed.data.subtitle,
      client: workspaceName,
      generatedAt: new Date().toISOString(),
      source: AI_CONFIG.provider === "anthropic" ? "anthropic" : "ollama",
      slides: parsed.data.slides,
    };
    return NextResponse.json(deck);
  } catch (err) {
    if (err instanceof OllamaUnavailableError) return NextResponse.json(fallback);
    return NextResponse.json(fallback);
  }
}
