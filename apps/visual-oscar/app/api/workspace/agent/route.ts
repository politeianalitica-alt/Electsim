import { NextRequest, NextResponse } from "next/server";

/**
 * Workspace Agent route handler.
 *
 * Sprint 3: devuelve respuesta mock estructurada (sin llamadas LLM reales).
 * Sprint 16: este body se sustituye por:
 *   - streamText() de Vercel AI SDK
 *   - tool-calling con herramientas del workspace
 *   - Response streamed via toDataStreamResponse()
 *
 * El contrato (entrada y forma de salida) se mantiene estable para que el
 * cliente no tenga que cambiar.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, mode = "ask", workspaceId } = body ?? {};

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "missing 'message' field" },
        { status: 400 }
      );
    }

    // Mock determinista (Sprint 3). El orquestador en el cliente ya genera
    // respuestas ricas con tarjetas; esta route handler queda como puerto
    // de entrada para Sprint 16.
    return NextResponse.json({
      id: `msg_${Date.now()}`,
      role: "assistant",
      content: `[Mock] Procesando en modo ${mode}: «${message}»`,
      createdAt: new Date().toISOString(),
      cards: [],
      workspaceId,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "bad request" },
      { status: 400 }
    );
  }
}
