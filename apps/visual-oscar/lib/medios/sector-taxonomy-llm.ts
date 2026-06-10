/**
 * Fallback LLM de clasificación por sector · SERVER-ONLY.
 *
 * Vive separado de `sector-taxonomy.ts` (que es puro y se importa desde
 * componentes cliente) porque reusa el cliente del pipeline canónico, que
 * arrastra `@anthropic-ai/sdk` → `node:path` y NO puede empaquetarse para el
 * navegador. Solo lo importan endpoints de servidor (p.ej. /api/medios/intel).
 *
 * Solo se activa con un proveedor hosted explícito (MEDIOS_LLM_CLASSIFIER =
 * 'gemini' | 'groq') + API key. En cualquier otro caso (o ante fallo de red /
 * circuit breaker) devuelve un mapa vacío y el caller degrada a heurístico.
 */
import { SECTOR_KEYS, type SectorKey } from './sector-taxonomy'

export async function classifySectorsWithLLM(
  items: Array<{ idx: number; title: string; description: string }>,
  cap = 50,
): Promise<Map<number, SectorKey>> {
  const out = new Map<number, SectorKey>()
  if (items.length === 0) return out
  // Solo proveedores hosted explícitos + key. Evita que el default 'ollama'
  // dispare una llamada a localhost:11434 (inexistente en Vercel) por carga.
  const provider = process.env.MEDIOS_LLM_CLASSIFIER
  if (provider !== 'gemini' && provider !== 'groq') return out
  try {
    const mod = await import('./canonical/classify-semantic')
    const client = mod.createLlmClient()
    if (client instanceof mod.StubLlmClient) return out  // sin LLM real → degrada
    const batch = items.slice(0, cap)
    const topicList = SECTOR_KEYS.map((s) => s) // lista cerrada de sectores (incl. 'otro')
    const res = await client.classifyBatch(
      batch.map((b) => ({ title: b.title, description: (b.description || '').slice(0, 280) })),
      topicList,
    )
    res.forEach((r, i) => {
      const id = r?.topicId
      if (id && id !== 'otro' && (SECTOR_KEYS as string[]).includes(id)) {
        out.set(batch[i].idx, id as SectorKey)
      }
    })
  } catch {
    /* cualquier fallo (red, circuit breaker) → degrada a heurístico */
  }
  return out
}
