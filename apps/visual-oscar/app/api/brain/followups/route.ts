/**
 * POST /api/brain/followups
 *
 * Genera 3 preguntas de seguimiento contextuales después de una respuesta
 * del Brain. Útil para que el usuario descubra qué más puede preguntar
 * sin tener que pensarlo.
 *
 * Llama a Claude Haiku con un prompt corto (no consume tools, no inyecta
 * contexto completo) — debe ser barato y rápido (~$0.0001 por llamada).
 *
 * Input:  { user_question: string, brain_answer: string }
 * Output: { suggestions: string[3] }
 */

import { NextRequest, NextResponse } from "next/server";
import { generateText, AI_CONFIG } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 30;

const FOLLOWUP_SYSTEM = `Eres un asistente que genera EXACTAMENTE 3 preguntas de seguimiento naturales y útiles para un analista político que está usando el dashboard Politeia Analítica.

Reglas:
- 3 preguntas, ni más ni menos
- Cada una en máximo 8 palabras
- En español de España
- Variadas: una de profundización, una lateral, una accionable
- Sin numerar ni añadir bullets, una por línea
- Sin emojis ni comillas
- Empezar con verbo o pronombre interrogativo

Ejemplo:
Usuario preguntó: "¿cómo va PP?"
Brain respondió: "PP en 33,2%, +4,7pp sobre PSOE"
Sugerencias:
Dame el detalle por CCAA
Compáralo con VOX
Qué narrativa los está beneficiando

Devuelve SOLO las 3 líneas, sin más texto.`;

interface FollowupRequest {
  user_question: string;
  brain_answer: string;
}

export async function POST(req: NextRequest) {
  // Si no hay Anthropic, devolvemos vacío (la UI no muestra nada)
  if (AI_CONFIG.provider !== "anthropic") {
    return NextResponse.json({ suggestions: [] });
  }

  let body: FollowupRequest;
  try {
    body = (await req.json()) as FollowupRequest;
  } catch {
    return NextResponse.json({ suggestions: [] });
  }

  const userQ = (body.user_question || "").slice(0, 500);
  const brainA = (body.brain_answer || "").slice(0, 800);
  if (!userQ || !brainA) return NextResponse.json({ suggestions: [] });

  try {
    const raw = await generateText({
      tier: "fast",
      system: FOLLOWUP_SYSTEM,
      messages: [
        {
          role: "user",
          content: `Pregunta del usuario: "${userQ}"\n\nRespuesta del Brain: "${brainA}"\n\nGenera 3 preguntas de seguimiento.`,
        },
      ],
      temperature: 0.7,
      maxTokens: 150,
    });

    // Parsear líneas no vacías, limpiar (sin bullets, sin numeración)
    const suggestions = raw
      .split("\n")
      .map((l) =>
        l
          .trim()
          .replace(/^[-•*\d.)\s]+/, "") // remove bullets/numbers
          .replace(/^["']|["']$/g, "") // remove surrounding quotes
          .trim()
      )
      .filter((l) => l.length > 0 && l.length <= 120)
      .slice(0, 3);

    return NextResponse.json({ suggestions });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[followups] failed:", (err as Error).message);
    return NextResponse.json({ suggestions: [] });
  }
}
