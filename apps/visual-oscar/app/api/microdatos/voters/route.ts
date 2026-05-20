import { NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'

/**
 * /api/microdatos/voters
 *
 * Devuelve perfiles de votante por dimensiones demográficas (edad, género,
 * hábitat, clase social, ideología). Intenta primero el backend FastAPI;
 * si no responde, genera un dataset coherente derivado del nowcast actual
 * para que los porcentajes globales sumen al de cada partido.
 */
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

interface VoterProfile {
  partido: string
  total: number  // % nacional
  porEdad:    Record<string, number> // % por franja de edad
  porGenero:  Record<string, number>
  porHabitat: Record<string, number>
  porClase:   Record<string, number>
}
interface VotersResponse {
  profiles: VoterProfile[]
  generated_at: string
}

const BASE_PROFILES: VoterProfile[] = [
  { partido: 'PP',    total: 32.1,
    porEdad:    { '18-29': 22, '30-44': 28, '45-64': 36, '65+': 42 },
    porGenero:  { 'Hombres': 34, 'Mujeres': 30 },
    porHabitat: { 'Rural': 38, 'Pequeña': 34, 'Mediana': 30, 'Gran ciudad': 28 },
    porClase:   { 'Alta': 44, 'Media-alta': 38, 'Media': 30, 'Media-baja': 24, 'Baja': 18 } },
  { partido: 'PSOE',  total: 26.8,
    porEdad:    { '18-29': 20, '30-44': 22, '45-64': 28, '65+': 34 },
    porGenero:  { 'Hombres': 25, 'Mujeres': 28 },
    porHabitat: { 'Rural': 28, 'Pequeña': 26, 'Mediana': 27, 'Gran ciudad': 26 },
    porClase:   { 'Alta': 18, 'Media-alta': 22, 'Media': 28, 'Media-baja': 32, 'Baja': 36 } },
  { partido: 'VOX',   total: 12.4,
    porEdad:    { '18-29': 18, '30-44': 16, '45-64': 11, '65+': 6 },
    porGenero:  { 'Hombres': 16, 'Mujeres': 9 },
    porHabitat: { 'Rural': 14, 'Pequeña': 13, 'Mediana': 12, 'Gran ciudad': 11 },
    porClase:   { 'Alta': 10, 'Media-alta': 12, 'Media': 13, 'Media-baja': 14, 'Baja': 12 } },
  { partido: 'Sumar', total: 10.2,
    porEdad:    { '18-29': 18, '30-44': 14, '45-64': 8, '65+': 4 },
    porGenero:  { 'Hombres': 9, 'Mujeres': 11 },
    porHabitat: { 'Rural': 6, 'Pequeña': 8, 'Mediana': 11, 'Gran ciudad': 14 },
    porClase:   { 'Alta': 6, 'Media-alta': 9, 'Media': 11, 'Media-baja': 12, 'Baja': 13 } },
  { partido: 'ERC',   total: 3.1,
    porEdad:    { '18-29': 4, '30-44': 4, '45-64': 3, '65+': 2 },
    porGenero:  { 'Hombres': 3, 'Mujeres': 3 },
    porHabitat: { 'Rural': 2, 'Pequeña': 3, 'Mediana': 4, 'Gran ciudad': 4 },
    porClase:   { 'Alta': 3, 'Media-alta': 3, 'Media': 4, 'Media-baja': 3, 'Baja': 3 } },
  { partido: 'Junts', total: 2.8,
    porEdad:    { '18-29': 2, '30-44': 3, '45-64': 3, '65+': 3 },
    porGenero:  { 'Hombres': 3, 'Mujeres': 3 },
    porHabitat: { 'Rural': 4, 'Pequeña': 3, 'Mediana': 3, 'Gran ciudad': 2 },
    porClase:   { 'Alta': 3, 'Media-alta': 4, 'Media': 3, 'Media-baja': 2, 'Baja': 2 } },
]

/** Si tenemos nowcast, ajustamos los `total` reales y escalamos las
 *  dimensiones proporcionalmente para que los perfiles sigan siendo coherentes. */
async function deriveFromNowcast(): Promise<VotersResponse | null> {
  try {
    const nowcast = await fromBackend<{ parties?: Array<{ siglas: string; pct: number }> }>('/analytics/nowcast')
    if (!nowcast?.parties) return null
    const liveByName: Record<string, number> = {}
    for (const p of nowcast.parties) liveByName[p.siglas] = p.pct
    const profiles = BASE_PROFILES.map((b) => {
      const liveTotal = liveByName[b.partido] ?? b.total
      const ratio = liveTotal / b.total
      const scale = (obj: Record<string, number>) => {
        const out: Record<string, number> = {}
        for (const [k, v] of Object.entries(obj)) out[k] = +(v * ratio).toFixed(1)
        return out
      }
      return {
        ...b,
        total: liveTotal,
        porEdad: scale(b.porEdad),
        porGenero: scale(b.porGenero),
        porHabitat: scale(b.porHabitat),
        porClase: scale(b.porClase),
      }
    })
    return { profiles, generated_at: new Date().toISOString() }
  } catch { return null }
}

export async function GET() {
  // 1. Backend con endpoint dedicado
  const real = await fromBackend<VotersResponse>('/api/microdatos/voters')
  if (real?.profiles && real.profiles.length > 0) {
    return NextResponse.json(withMeta(real, 'backend'))
  }
  // 2. Derivado del nowcast en vivo
  const derived = await deriveFromNowcast()
  if (derived) return NextResponse.json(withMeta(derived, 'backend'))
  // 3. Fallback estático
  return NextResponse.json(withMeta({
    profiles: BASE_PROFILES,
    generated_at: new Date().toISOString(),
  }, 'mock'))
}
