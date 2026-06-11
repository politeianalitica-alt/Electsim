import { NextRequest, NextResponse } from "next/server";
import { generateText, AI_CONFIG } from "@/lib/ai";

/**
 * Workspace Agent route handler — Fase 3: IA REAL.
 *
 * Sustituye el mock del Sprint 3 por generateText() de lib/ai (cascada
 * Gemini → Groq → Anthropic → Ollama, la misma del chat del Cuaderno).
 * El contrato de salida se mantiene: { id, role, content, createdAt,
 * cards, workspaceId } — el cliente no cambia; `source` indica 'ai'.
 *
 * Degradación: sin proveedor configurado → 503; el orquestador del
 * cliente cae a su modo local con tarjetas mock.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const SYSTEM = `Eres el agente del workspace de Politeia Analítica (consultora
española de inteligencia política y regulatoria). Asistes a analistas DENTRO
de su workspace: issues abiertos, acciones, documentos, radar y simulador.

Modos:
- ask: responde con análisis breve y accionable.
- analyze: estructura (situación → lectura → implicación) en pocas líneas.
- do: el sistema aún no ejecuta acciones reales; explica QUÉ harías y en qué
  vista del workspace puede hacerlo el analista a mano.

Reglas: español profesional, máx ~150 palabras, sin emojis, sin inventar
datos del workspace que no estén en el contexto aportado.`;

interface HistoryItem { role?: string; content?: string }

export async function POST(req: NextRequest) {
  let body: {
    message?: string;
    mode?: string;
    workspaceId?: string;
    activeView?: string;
    history?: HistoryItem[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const { message, mode = "ask", workspaceId, activeView } = body ?? {};
  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "missing 'message' field" }, { status: 400 });
  }
  if (AI_CONFIG.provider === "none") {
    return NextResponse.json(
      { error: "IA no configurada (sin API keys)" },
      { status: 503 },
    );
  }

  // Historial corto para continuidad de conversación (texto plano)
  const history = (body.history ?? [])
    .filter((h): h is Required<HistoryItem> => !!h?.content && (h.role === "user" || h.role === "assistant"))
    .slice(-8);

  try {
    const content = await generateText({
      tier: "fast",
      system: SYSTEM,
      messages: [
        ...history.map(h => ({ role: h.role as "user" | "assistant", content: h.content.slice(0, 2_000) })),
        {
          role: "user" as const,
          content: `[workspace: ${workspaceId ?? "?"} · vista: ${activeView ?? "?"} · modo: ${mode}]\n${message}`,
        },
      ],
      temperature: 0.4,
      maxTokens: 500,
    });
    if (!content?.trim()) {
      return NextResponse.json({ error: "respuesta vacía del modelo" }, { status: 502 });
    }
    return NextResponse.json({
      id: `msg_${Date.now()}`,
      role: "assistant",
      content: content.trim(),
      createdAt: new Date().toISOString(),
      cards: [],
      workspaceId,
      source: "ai",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
