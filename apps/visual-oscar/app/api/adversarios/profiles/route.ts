import { NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'

/**
 * /api/adversarios/profiles
 *
 * Inteligencia sobre los adversarios políticos: nivel de amenaza,
 * vulnerabilidades, mensajes principales, voceros, próximos movimientos.
 * Backend → derivado del nowcast (escala el nivel de amenaza con los
 * escaños actuales) → mocks ricos.
 */
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

interface AdversarioProfile {
  partido: string
  color: string
  nivel: 'CRÍTICO' | 'ALTO' | 'MEDIO' | 'BAJO'
  intencion: number     // % nacional actual
  delta7d: number       // pp vs hace 7 días
  escanos: number
  resumen: string
  vulnerabilidades: { titulo: string; detalle: string; explotabilidad: number }[]
  mensajes: { titular: string; recurrencia: number; eficacia: number }[]
  voceros: { nombre: string; rol: string; valoracion: number; visibilidad: number }[]
  proximosMovimientos: { fecha: string; tipo: string; titulo: string; ubicacion: string }[]
}
interface AdversariosResponse {
  profiles: AdversarioProfile[]
  generated_at: string
}

const BASE: AdversarioProfile[] = [
  {
    partido: 'PSOE', color: '#E1322D', nivel: 'CRÍTICO',
    intencion: 26.8, delta7d: -2.1, escanos: 110,
    resumen: 'Adversario principal. Sigue captando voto blando urbano y mayor de 65, vulnerable en sanidad y vivienda.',
    vulnerabilidades: [
      { titulo: 'Junts retirando apoyo',         detalle: 'Bloque de investidura en riesgo si se rompe el pacto de Cataluña.', explotabilidad: 82 },
      { titulo: 'Fatiga del electorado',          detalle: 'Pérdida en franja 30-44 (-3,4 pp en 90d).', explotabilidad: 68 },
      { titulo: 'Reforma fiscal sin cerrar',      detalle: 'IRPF rentas medias pendiente de definición.', explotabilidad: 54 },
    ],
    mensajes: [
      { titular: 'Defensa del estado del bienestar', recurrencia: 78, eficacia: 64 },
      { titular: 'Estabilidad económica',            recurrencia: 62, eficacia: 58 },
      { titular: 'Lucha contra la corrupción',       recurrencia: 48, eficacia: 42 },
    ],
    voceros: [
      { nombre: 'Pedro Sánchez',     rol: 'Presidente del Gobierno', valoracion: 4.2, visibilidad: 92 },
      { nombre: 'María Jesús Montero', rol: 'Vicepresidenta',         valoracion: 3.8, visibilidad: 71 },
      { nombre: 'Pilar Alegría',     rol: 'Portavoz',                 valoracion: 4.0, visibilidad: 65 },
    ],
    proximosMovimientos: [
      { fecha: '12 may', tipo: 'Comparecencia',  titulo: 'Consejo de Ministros · medidas vivienda',   ubicacion: 'Moncloa' },
      { fecha: '15 may', tipo: 'Mitin',          titulo: 'Acto territorial · clausura · Sevilla',     ubicacion: 'Sevilla' },
      { fecha: '18 may', tipo: 'Entrevista',     titulo: 'Entrevista en Onda Cero',                    ubicacion: 'Madrid' },
    ],
  },
  {
    partido: 'VOX', color: '#5BA02E', nivel: 'ALTO',
    intencion: 12.4, delta7d: 0.4, escanos: 42,
    resumen: 'Captura voto descontento joven en zonas rurales. Frente común con PP en agro, energía y migración.',
    vulnerabilidades: [
      { titulo: 'Menor cobertura mediática',  detalle: 'Pérdida de exposición en franjas peak (-12 % desde febrero).', explotabilidad: 58 },
      { titulo: 'Conflictos internos',         detalle: 'Tensión Abascal–Espinosa de los Monteros.',                    explotabilidad: 71 },
      { titulo: 'Discurso climático',          detalle: 'Vulnerable en CCAA con sequía estructural.',                    explotabilidad: 44 },
    ],
    mensajes: [
      { titular: 'Inmigración ilegal',           recurrencia: 88, eficacia: 72 },
      { titular: 'Agricultura y mundo rural',    recurrencia: 64, eficacia: 68 },
      { titular: 'Soberanía nacional',           recurrencia: 58, eficacia: 54 },
    ],
    voceros: [
      { nombre: 'Santiago Abascal',  rol: 'Presidente',     valoracion: 3.8, visibilidad: 78 },
      { nombre: 'Iván Espinosa de los Monteros', rol: 'Portavoz parlamentario', valoracion: 3.4, visibilidad: 52 },
    ],
    proximosMovimientos: [
      { fecha: '14 may', tipo: 'Acto',           titulo: 'Concentración campo español',                ubicacion: 'Mérida' },
      { fecha: '17 may', tipo: 'Convención',     titulo: 'Convención política Andalucía',              ubicacion: 'Sevilla' },
    ],
  },
  {
    partido: 'Sumar', color: '#D43F8D', nivel: 'MEDIO',
    intencion: 10.2, delta7d: -1.1, escanos: 35,
    resumen: 'Pierde tracción en clase media urbana. Vulnerable en propuestas concretas más allá del marco identitario.',
    vulnerabilidades: [
      { titulo: 'Fragmentación interna',         detalle: 'Tensión entre socios de la coalición.',                       explotabilidad: 76 },
      { titulo: 'Falta de propuestas concretas', detalle: 'Discurso percibido como abstracto en clase trabajadora.',     explotabilidad: 62 },
      { titulo: 'Pérdida en franja 25-44',       detalle: 'Ya no es la opción de izquierda preferida en este segmento.', explotabilidad: 58 },
    ],
    mensajes: [
      { titular: 'Justicia social',              recurrencia: 72, eficacia: 56 },
      { titular: 'Reducción de jornada',         recurrencia: 64, eficacia: 62 },
      { titular: 'Vivienda como derecho',        recurrencia: 58, eficacia: 64 },
    ],
    voceros: [
      { nombre: 'Yolanda Díaz',      rol: 'Vicepresidenta · líder', valoracion: 4.6, visibilidad: 82 },
      { nombre: 'Ernest Urtasun',    rol: 'Coportavoz',             valoracion: 3.9, visibilidad: 48 },
    ],
    proximosMovimientos: [
      { fecha: '13 may', tipo: 'Mitin',          titulo: 'Acto vivienda y empleo joven',               ubicacion: 'Barcelona' },
      { fecha: '16 may', tipo: 'Debate',         titulo: 'Debate jornada laboral',                      ubicacion: 'Madrid' },
    ],
  },
]

async function deriveFromNowcast(): Promise<AdversariosResponse | null> {
  try {
    const nowcast = await fromBackend<{ parties?: Array<{ siglas: string; pct: number; delta?: number; seats?: number }> }>('/analytics/nowcast')
    if (!nowcast?.parties) return null
    const liveByName: Record<string, { pct: number; delta: number; seats: number }> = {}
    for (const p of nowcast.parties) {
      liveByName[p.siglas] = { pct: p.pct, delta: p.delta ?? 0, seats: p.seats ?? 0 }
    }
    const profiles = BASE.map((b) => {
      const live = liveByName[b.partido]
      if (!live) return b
      // Ajustar nivel según delta y escaños actuales
      let nivel = b.nivel
      if (live.delta < -2) nivel = 'BAJO'
      else if (live.delta < -1) nivel = 'MEDIO'
      else if (live.delta > 2) nivel = 'CRÍTICO'
      return { ...b, intencion: live.pct, delta7d: live.delta, escanos: live.seats, nivel }
    })
    return { profiles, generated_at: new Date().toISOString() }
  } catch { return null }
}

export async function GET() {
  const real = await fromBackend<AdversariosResponse>('/api/adversarios/profiles')
  if (real?.profiles && real.profiles.length > 0) {
    return NextResponse.json(withMeta(real, 'backend'))
  }
  const derived = await deriveFromNowcast()
  if (derived) return NextResponse.json(withMeta(derived, 'backend'))
  return NextResponse.json(withMeta({
    profiles: BASE,
    generated_at: new Date().toISOString(),
  }, 'mock'))
}
