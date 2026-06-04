/**
 * Capa de análisis profundo del perfil de votante.
 *
 * A partir del retrato base (intención de voto, temas, participación, medios,
 * posición ideológica) deriva, de forma DETERMINISTA, los indicadores de alto
 * nivel que usa un estratega electoral: segunda opción, volatilidad/voto blando,
 * indecisión, techo/suelo, persuadabilidad, propiedad temática, mensajes que
 * conectan y a evitar, plan de canales, favorabilidad de líderes, concentración
 * territorial y estrategia de movilización (GOTV).
 *
 * Datos ilustrativos (demo) · sin proveedor de sondeos en vivo.
 */

export interface DeepInput {
  perfil: {
    edad: string; genero: string; estudios: string; habitat: string; ideologia: string
    empleo: string; religion: string; renta: string; vivienda: string; hogar: string; territorio: string
  }
  votoFloat: Record<string, number>
  topTemas: { tema: string; peso: number }[]
  participacion: number
  posIdeo: number
  ganador: [string, number]
  medios: { tv: number; prensa: number; redes: number; podcast: number }
}

export interface IssueOwnership { tema: string; partido: string; credibilidad: number }
export interface LeaderFav { lider: string; partido: string; favor: number }
export interface TerritoryConc { zona: string; pct: number }

export interface DeepProfile {
  segunda: { partido: string; pct: number; afinidad: number }
  volatilidad: number
  indecision: number
  techo: number
  suelo: number
  persuadabilidad: { score: number; nivel: string; objetivo: string }
  ownership: IssueOwnership[]
  mensajes: { conectan: string[]; evitar: string[] }
  canales: { titular: string; plataformas: string[]; formato: string; horario: string; directo: string }
  lideres: LeaderFav[]
  territorio: TerritoryConc[]
  gotv: string
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(n)))

// Propietario "natural" de cada tema (qué partido se percibe más solvente).
const OWNER: Record<string, string> = {
  Vivienda: 'Sumar', Empleo: 'PSOE', Sanidad: 'PSOE', Educación: 'PSOE',
  Inmigración: 'VOX', Inseguridad: 'VOX', Pensiones: 'PSOE',
  'Cambio climático': 'Sumar', Corrupción: 'VOX', Cataluña: 'Junts',
  'Economía/inflación': 'PP', Igualdad: 'Sumar', Defensa: 'PP',
}

// Mensaje por tema según el lado ideológico del perfil (izq <0, dcha >0).
const TEMA_MSG: Record<string, { izq: string; dcha: string }> = {
  Vivienda: { izq: 'Regular el alquiler y ampliar la vivienda pública', dcha: 'Más oferta y seguridad jurídica para construir' },
  Empleo: { izq: 'Empleo estable y subida del SMI', dcha: 'Bajar cotizaciones para que se contrate más' },
  Sanidad: { izq: 'Blindar la sanidad pública y reducir listas de espera', dcha: 'Gestión eficiente y libertad de elección' },
  Educación: { izq: 'Más inversión en la pública y becas', dcha: 'Libertad educativa y excelencia' },
  Inmigración: { izq: 'Integración ordenada y derechos', dcha: 'Fronteras y control de la inmigración irregular' },
  Inseguridad: { izq: 'Prevención y mediación', dcha: 'Más medios policiales y penas firmes' },
  Pensiones: { izq: 'Revalorizar pensiones con el IPC', dcha: 'Sostenibilidad del sistema a largo plazo' },
  'Cambio climático': { izq: 'Transición ecológica justa', dcha: 'Transición sin perjudicar al campo y la industria' },
  Corrupción: { izq: 'Transparencia y regeneración', dcha: 'Tolerancia cero con la corrupción del adversario' },
  Cataluña: { izq: 'Diálogo y reencuentro', dcha: 'Unidad de España e igualdad entre territorios' },
  'Economía/inflación': { izq: 'Escudo social frente a la inflación', dcha: 'Bajar impuestos y contener el gasto' },
  Igualdad: { izq: 'Avanzar en igualdad real y feminismo', dcha: 'Igualdad ante la ley, sin imposiciones' },
  Defensa: { izq: 'Defensa europea y cooperación', dcha: 'Reforzar la defensa y el gasto OTAN' },
}

const LEADERS: { lider: string; partido: string; pos: number }[] = [
  { lider: 'A. Núñez Feijóo', partido: 'PP', pos: 34 },
  { lider: 'P. Sánchez', partido: 'PSOE', pos: -30 },
  { lider: 'S. Abascal', partido: 'VOX', pos: 76 },
  { lider: 'Y. Díaz', partido: 'Sumar', pos: -72 },
]

const NEIGHBORS: Record<string, string[]> = {
  'Cataluña': ['Aragón', 'C. Valenciana'],
  'Euskadi': ['Navarra', 'Cantabria'],
  'Galicia': ['Asturias', 'Castilla y León'],
  'Madrid': ['Castilla-La Mancha', 'Castilla y León'],
  'Andalucía': ['Extremadura', 'Murcia'],
  'C. Valenciana': ['Murcia', 'Cataluña'],
  'Castilla y León': ['Madrid', 'Galicia'],
  'Resto': ['Aragón', 'Asturias'],
}

export function buildDeepProfile(input: DeepInput): DeepProfile {
  const { perfil, votoFloat, topTemas, participacion, posIdeo, ganador, medios } = input
  const ranked = Object.entries(votoFloat).sort((a, b) => b[1] - a[1])
  const [g1, v1] = ranked[0] ?? ['PP', 0]
  const [g2, v2] = ranked[1] ?? ['PSOE', 0]
  const gap = v1 - v2

  // ── Volatilidad / voto blando ───────────────────────────────────────────
  const centrismo = perfil.ideologia === 'Centro' ? 16
    : perfil.ideologia === 'Centro-izq.' || perfil.ideologia === 'Centro-dcha.' ? 8 : 0
  const juventud = perfil.edad === '18–24' ? 14 : perfil.edad === '25–34' ? 9
    : perfil.edad === '35–44' ? 4 : 0
  const desmov = (78 - participacion) * 0.4
  const volatilidad = clamp(54 - gap * 1.5 + centrismo + juventud + desmov, 8, 92)

  const indecision = clamp(volatilidad * 0.32 + (votoFloat['Otros'] ?? 0) * 0.3, 4, 60)
  const techo = clamp(v1 + volatilidad * 0.22, 0, 96)
  const suelo = clamp(v1 - volatilidad * 0.3, 0, v1)

  const afinidad = clamp(100 - gap * 3, 10, 96)
  const nivelPers = volatilidad >= 60 ? 'Muy persuadable' : volatilidad >= 38 ? 'Persuadable' : 'Voto firme'
  const persuadabilidad = { score: volatilidad, nivel: nivelPers, objetivo: g2 }

  // ── Propiedad temática ──────────────────────────────────────────────────
  const ownership: IssueOwnership[] = topTemas.slice(0, 5).map(t => {
    const owner = OWNER[t.tema] ?? g1
    const cred = clamp(48 + Math.min(34, votoFloat[owner] ?? 0) + (owner === g1 ? 8 : 0), 35, 95)
    return { tema: t.tema, partido: owner, credibilidad: cred }
  })

  // ── Mensajes ────────────────────────────────────────────────────────────
  const lado: 'izq' | 'dcha' = posIdeo < 0 ? 'izq' : 'dcha'
  const conectan = topTemas.slice(0, 3)
    .map(t => TEMA_MSG[t.tema]?.[lado])
    .filter(Boolean) as string[]
  const evitar: string[] = []
  if (lado === 'izq') {
    evitar.push('Bajadas de impuestos a las rentas altas')
    if (topTemas.some(t => t.tema === 'Inmigración')) evitar.push('Marcos punitivos sobre inmigración')
  } else {
    evitar.push('Subidas de impuestos y más gasto público')
    if (topTemas.some(t => t.tema === 'Igualdad')) evitar.push('Mensajes identitarios percibidos como impuestos')
  }

  // ── Canales ─────────────────────────────────────────────────────────────
  const joven = perfil.edad === '18–24' || perfil.edad === '25–34'
  const medio = perfil.edad === '35–44' || perfil.edad === '45–54'
  const plataformas = joven ? ['TikTok', 'Instagram', 'YouTube']
    : medio ? ['Instagram', 'YouTube', 'X/Twitter']
    : ['Facebook', 'WhatsApp', 'TV conectada']
  const digital = medios.redes >= medios.tv
  const titular = digital ? 'Estrategia digital-first' : 'Mix audiovisual con peso de TV'
  const formato = joven ? 'Vídeo vertical corto + creadores' : medio ? 'Vídeo + directos temáticos' : 'Spots TV + piezas explicativas'
  const horario = digital ? 'Tardes-noche (20–24h) en redes' : 'Prime-time TV (21–23h)'
  const ruralOMayor = perfil.habitat === 'Rural (<10k)' || perfil.edad === '65+'
  const directo = ruralOMayor ? 'Alto retorno del contacto directo: puerta a puerta y actos locales' : 'Contacto directo complementario en barrios clave'
  const canales = { titular, plataformas, formato, horario, directo }

  // ── Favorabilidad de líderes ──────────────────────────────────────────────
  const lideres: LeaderFav[] = LEADERS
    .map(l => ({ lider: l.lider, partido: l.partido, favor: clamp(92 - Math.abs(posIdeo - l.pos) / 2.1, 5, 92) }))
    .sort((a, b) => b.favor - a.favor)

  // ── Concentración territorial ─────────────────────────────────────────────
  const zona = perfil.territorio
  const nb = NEIGHBORS[zona] ?? ['Aragón', 'Asturias']
  const territorio: TerritoryConc[] = [
    { zona, pct: clamp(zona === 'Resto' ? 38 : 64, 30, 70) },
    { zona: nb[0], pct: clamp(zona === 'Resto' ? 22 : 13, 8, 28) },
    { zona: nb[1], pct: clamp(zona === 'Resto' ? 16 : 9, 6, 24) },
  ]

  // ── GOTV ──────────────────────────────────────────────────────────────────
  const gotv = participacion >= 75
    ? 'Segmento muy movilizado: el reto es la persuasión, no la activación. Prioriza el argumentario sobre el adversario.'
    : participacion >= 65
    ? 'Movilización media: combina activación (recordatorio de voto, voto por correo) con persuasión del voto blando.'
    : 'Baja movilización: el voto se gana sacándolo a votar. Refuerza GOTV (avisos, logística de voto) sobre el mensaje.'

  return {
    segunda: { partido: g2, pct: Math.round(v2 * 10) / 10, afinidad },
    volatilidad, indecision, techo, suelo, persuadabilidad,
    ownership, mensajes: { conectan, evitar }, canales, lideres, territorio, gotv,
  }
}
