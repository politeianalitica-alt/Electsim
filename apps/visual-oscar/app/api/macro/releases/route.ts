/**
 * GET /api/macro/releases
 *
 * Path canónico del calendario de releases macroeconómicos. Reutiliza
 * la implementación de `/api/macro/pulso/releases` (legacy, mantenido
 * por backwards compat).
 *
 * El handler GET se redefine aquí (Next.js no permite re-exports de
 * route handlers para análisis estático). La lógica es la misma.
 */
import { GET as legacyGET } from "../pulso/releases/route";

export const runtime = "nodejs";
export const revalidate = 21600; // 6h

export async function GET(): Promise<Response> {
  return legacyGET();
}
