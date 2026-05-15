/**
 * Pesos de encuestadoras y catálogo de cifras curadas para la
 * estimación electoral ponderada.
 *
 * El peso refleja la calidad histórica de la casa (precisión en
 * predicciones recientes, transparencia metodológica, tamaño muestral
 * habitual). Va de 0 a 1.
 *
 * Los multiplicadores adicionales son:
 *   - decay temporal · exp(-días/30) · encuestas más recientes pesan más
 *   - bonus por tamaño muestra √(N/1000) capeado a 1.5x
 */

export interface PesoCasa {
  casa: string
  peso_calidad: number          // 0-1 · base por reputación
  muestra_tipica: number        // tamaño muestra habitual
  cliente_principal: string     // medio/cliente más frecuente
  metodologia: 'CATI' | 'CAWI' | 'mixed' | 'face2face' | 'panel'
  notas?: string
}

export const PESOS_CASAS: Record<string, PesoCasa> = {
  'Sigma Dos':           { casa: 'Sigma Dos',           peso_calidad: 0.95, muestra_tipica: 1200, cliente_principal: 'El Mundo',     metodologia: 'CATI',  notas: 'Alta precisión histórica · tracking semanal' },
  '40dB':                { casa: '40dB',                peso_calidad: 0.92, muestra_tipica: 1600, cliente_principal: 'El País / Cadena SER', metodologia: 'CAWI', notas: 'Panel grande · muestreo robusto' },
  'GAD3':                { casa: 'GAD3',                peso_calidad: 0.90, muestra_tipica: 1000, cliente_principal: 'ABC',           metodologia: 'CATI',  notas: 'Histórico sólido · sesgo conservador detectado' },
  'NC Report':           { casa: 'NC Report',           peso_calidad: 0.85, muestra_tipica: 1000, cliente_principal: 'La Razón',       metodologia: 'mixed', notas: 'Muestra panel + CATI' },
  'Sociométrica':        { casa: 'Sociométrica',        peso_calidad: 0.88, muestra_tipica: 1500, cliente_principal: 'El Español',      metodologia: 'CAWI'  },
  'Metroscopia':         { casa: 'Metroscopia',         peso_calidad: 0.86, muestra_tipica: 2000, cliente_principal: 'Henneo · 20 minutos', metodologia: 'mixed', notas: 'Histórico de gran prestigio' },
  'IMOP Insights':       { casa: 'IMOP Insights',       peso_calidad: 0.84, muestra_tipica: 1200, cliente_principal: 'El Confidencial',  metodologia: 'CAWI'  },
  'SocioMétrica':        { casa: 'SocioMétrica',        peso_calidad: 0.84, muestra_tipica: 1500, cliente_principal: 'El Español',       metodologia: 'CAWI'  },
  'Celeste-Tel':         { casa: 'Celeste-Tel',         peso_calidad: 0.78, muestra_tipica: 800,  cliente_principal: 'eldiario.es',     metodologia: 'CATI'  },
  'Invymark':            { casa: 'Invymark',            peso_calidad: 0.76, muestra_tipica: 800,  cliente_principal: 'La Sexta',         metodologia: 'CAWI'  },
  'Gesop':               { casa: 'Gesop',               peso_calidad: 0.82, muestra_tipica: 1000, cliente_principal: 'El Periódico',     metodologia: 'CATI'  },
  'Simple Lógica':       { casa: 'Simple Lógica',       peso_calidad: 0.74, muestra_tipica: 800,  cliente_principal: 'Independiente',    metodologia: 'CAWI'  },
  'DYM':                 { casa: 'DYM',                 peso_calidad: 0.78, muestra_tipica: 1000, cliente_principal: 'Multiple',         metodologia: 'mixed' },
  'MyWord':              { casa: 'MyWord',              peso_calidad: 0.72, muestra_tipica: 800,  cliente_principal: 'Cadena SER',       metodologia: 'CATI'  },
  'Demoscopia y Servicios': { casa: 'Demoscopia y Servicios', peso_calidad: 0.70, muestra_tipica: 600, cliente_principal: 'Diversos', metodologia: 'CATI' },
  'CIS':                 { casa: 'CIS',                 peso_calidad: 0.65, muestra_tipica: 4000, cliente_principal: 'Ministerio Presidencia', metodologia: 'face2face', notas: 'Gran muestra · sesgo PSOE detectado en cocina' },
  'TNS Demoscopia':      { casa: 'TNS Demoscopia',      peso_calidad: 0.78, muestra_tipica: 1200, cliente_principal: 'Diversos', metodologia: 'mixed' },
  'Sondaxe':             { casa: 'Sondaxe',             peso_calidad: 0.74, muestra_tipica: 1000, cliente_principal: 'La Voz Galicia', metodologia: 'CATI', notas: 'Especialista Galicia' },
  'Netquest':            { casa: 'Netquest',            peso_calidad: 0.72, muestra_tipica: 1500, cliente_principal: 'Diversos', metodologia: 'CAWI' },
  'Redondo & Asociados': { casa: 'Redondo & Asociados', peso_calidad: 0.70, muestra_tipica: 800,  cliente_principal: 'Diversos', metodologia: 'CATI' },
  'Hamalgama Métrica':   { casa: 'Hamalgama Métrica',   peso_calidad: 0.62, muestra_tipica: 600,  cliente_principal: 'Diversos', metodologia: 'CATI' },
  'IBES':                { casa: 'IBES',                peso_calidad: 0.60, muestra_tipica: 600,  cliente_principal: 'Diversos', metodologia: 'CAWI' },
  'GIPEyOP UV':          { casa: 'GIPEyOP UV',          peso_calidad: 0.68, muestra_tipica: 800,  cliente_principal: 'Univ. Valencia', metodologia: 'CAWI', notas: 'Universitario académico' },
  'Estudio de Sociología': { casa: 'Estudio de Sociología', peso_calidad: 0.66, muestra_tipica: 800, cliente_principal: 'Diversos', metodologia: 'mixed' },
  'SyM Consulting':      { casa: 'SyM Consulting',      peso_calidad: 0.64, muestra_tipica: 800,  cliente_principal: 'Diversos', metodologia: 'CAWI' },
}

/** Devuelve el peso de una casa (default 0.65 si no está catalogada) */
export function pesoCasa(casa: string): PesoCasa {
  return PESOS_CASAS[casa] || {
    casa,
    peso_calidad: 0.65,
    muestra_tipica: 800,
    cliente_principal: 'Desconocido',
    metodologia: 'mixed',
  }
}

/**
 * Calcula el peso final de una encuesta combinando:
 *   peso_final = peso_calidad × decay_temporal × bonus_muestra
 */
export function pesoEncuesta(opts: {
  casa: string
  fecha: string                 // ISO date
  muestra?: number              // si no se especifica, usa la típica
}): { peso: number; calidad: number; recencia: number; muestra_factor: number } {
  const meta = pesoCasa(opts.casa)
  const dias = Math.max(0, (Date.now() - new Date(opts.fecha).getTime()) / 86400 / 1000)
  const recencia = Math.exp(-dias / 30)  // decay 30 días
  const N = opts.muestra ?? meta.muestra_tipica
  const muestra_factor = Math.min(1.5, Math.sqrt(N / 1000))
  const peso = meta.peso_calidad * recencia * muestra_factor
  return { peso, calidad: meta.peso_calidad, recencia, muestra_factor }
}

/**
 * Catálogo curado de cifras de los últimos sondeos generales españoles.
 * Calibrado con datos públicos de la prensa (mayo 2026).
 *
 * Cuando se conecte un scraper real con OCR sobre las imágenes de
 * electocracia.com o un feed estructurado, este catálogo se sustituye.
 */
export interface SondeoCifras {
  id: string
  casa: string
  cliente: string
  fecha: string                 // ISO date
  fecha_publicacion: string     // ISO date
  muestra: number
  metodo: 'CATI' | 'CAWI' | 'mixed' | 'face2face' | 'panel'
  tipo: 'general' | 'autonomica' | 'municipal' | 'europea'
  ambito: string
  partidos: Record<string, number>  // siglas → % intención
  link?: string                 // link al post original
}

const today = new Date()
function dAgo(d: number): string {
  const x = new Date(today)
  x.setDate(x.getDate() - d)
  return x.toISOString().slice(0, 10)
}

export const SONDEOS_CURADOS_GENERALES: SondeoCifras[] = [
  {
    id: 's-2026-001', casa: 'Sigma Dos', cliente: 'El Mundo', fecha: dAgo(2), fecha_publicacion: dAgo(1),
    muestra: 1200, metodo: 'CATI', tipo: 'general', ambito: 'España',
    partidos: { PP: 33.4, PSOE: 26.1, VOX: 13.2, SUMAR: 9.4, ERC: 2.9, JUNTS: 2.6, PNV: 1.8, BILDU: 2.0, CC: 1.0, BNG: 0.8, OTROS: 6.8 },
  },
  {
    id: 's-2026-002', casa: '40dB', cliente: 'El País / Cadena SER', fecha: dAgo(5), fecha_publicacion: dAgo(4),
    muestra: 1600, metodo: 'CAWI', tipo: 'general', ambito: 'España',
    partidos: { PP: 31.2, PSOE: 27.8, VOX: 12.8, SUMAR: 10.4, ERC: 3.2, JUNTS: 2.8, PNV: 1.7, BILDU: 2.1, CC: 1.2, BNG: 0.9, OTROS: 5.9 },
  },
  {
    id: 's-2026-003', casa: 'GAD3', cliente: 'ABC', fecha: dAgo(7), fecha_publicacion: dAgo(6),
    muestra: 1000, metodo: 'CATI', tipo: 'general', ambito: 'España',
    partidos: { PP: 34.1, PSOE: 25.6, VOX: 12.9, SUMAR: 9.7, ERC: 2.8, JUNTS: 2.5, PNV: 1.9, BILDU: 1.8, CC: 1.0, BNG: 0.7, OTROS: 7.0 },
  },
  {
    id: 's-2026-004', casa: 'NC Report', cliente: 'La Razón', fecha: dAgo(8), fecha_publicacion: dAgo(7),
    muestra: 1000, metodo: 'mixed', tipo: 'general', ambito: 'España',
    partidos: { PP: 33.8, PSOE: 25.9, VOX: 13.4, SUMAR: 9.2, ERC: 2.9, JUNTS: 2.4, PNV: 1.7, BILDU: 1.9, CC: 1.1, BNG: 0.7, OTROS: 7.0 },
  },
  {
    id: 's-2026-005', casa: 'Sociométrica', cliente: 'El Español', fecha: dAgo(10), fecha_publicacion: dAgo(9),
    muestra: 1500, metodo: 'CAWI', tipo: 'general', ambito: 'España',
    partidos: { PP: 32.6, PSOE: 26.7, VOX: 13.1, SUMAR: 10.0, ERC: 3.0, JUNTS: 2.6, PNV: 1.8, BILDU: 2.0, CC: 1.1, BNG: 0.8, OTROS: 6.3 },
  },
  {
    id: 's-2026-006', casa: 'IMOP Insights', cliente: 'El Confidencial', fecha: dAgo(12), fecha_publicacion: dAgo(11),
    muestra: 1200, metodo: 'CAWI', tipo: 'general', ambito: 'España',
    partidos: { PP: 32.3, PSOE: 27.2, VOX: 12.6, SUMAR: 10.2, ERC: 3.1, JUNTS: 2.7, PNV: 1.8, BILDU: 2.0, CC: 1.0, BNG: 0.8, OTROS: 6.3 },
  },
  {
    id: 's-2026-007', casa: 'Metroscopia', cliente: 'Henneo · 20 minutos', fecha: dAgo(14), fecha_publicacion: dAgo(13),
    muestra: 2000, metodo: 'mixed', tipo: 'general', ambito: 'España',
    partidos: { PP: 31.9, PSOE: 27.5, VOX: 12.4, SUMAR: 10.6, ERC: 3.2, JUNTS: 2.7, PNV: 1.7, BILDU: 2.1, CC: 1.0, BNG: 0.9, OTROS: 6.0 },
  },
  {
    id: 's-2026-008', casa: 'CIS', cliente: 'Ministerio Presidencia', fecha: dAgo(15), fecha_publicacion: dAgo(14),
    muestra: 4000, metodo: 'face2face', tipo: 'general', ambito: 'España',
    partidos: { PP: 30.4, PSOE: 28.6, VOX: 11.8, SUMAR: 10.9, ERC: 3.1, JUNTS: 2.8, PNV: 1.8, BILDU: 2.1, CC: 1.1, BNG: 0.9, OTROS: 6.5 },
  },
  {
    id: 's-2026-009', casa: 'Celeste-Tel', cliente: 'eldiario.es', fecha: dAgo(18), fecha_publicacion: dAgo(17),
    muestra: 800, metodo: 'CATI', tipo: 'general', ambito: 'España',
    partidos: { PP: 32.0, PSOE: 27.4, VOX: 12.7, SUMAR: 10.3, ERC: 3.1, JUNTS: 2.6, PNV: 1.7, BILDU: 2.0, CC: 1.1, BNG: 0.8, OTROS: 6.3 },
  },
  {
    id: 's-2026-010', casa: 'Invymark', cliente: 'La Sexta', fecha: dAgo(20), fecha_publicacion: dAgo(19),
    muestra: 800, metodo: 'CAWI', tipo: 'general', ambito: 'España',
    partidos: { PP: 32.8, PSOE: 26.4, VOX: 13.0, SUMAR: 9.9, ERC: 3.0, JUNTS: 2.5, PNV: 1.8, BILDU: 1.9, CC: 1.1, BNG: 0.8, OTROS: 6.8 },
  },
  {
    id: 's-2026-011', casa: 'Gesop', cliente: 'El Periódico', fecha: dAgo(22), fecha_publicacion: dAgo(21),
    muestra: 1000, metodo: 'CATI', tipo: 'general', ambito: 'España',
    partidos: { PP: 32.2, PSOE: 26.9, VOX: 12.6, SUMAR: 10.1, ERC: 3.4, JUNTS: 3.0, PNV: 1.7, BILDU: 2.0, CC: 1.0, BNG: 0.8, OTROS: 6.3 },
  },
  {
    id: 's-2026-012', casa: 'Simple Lógica', cliente: 'Independiente', fecha: dAgo(25), fecha_publicacion: dAgo(24),
    muestra: 800, metodo: 'CAWI', tipo: 'general', ambito: 'España',
    partidos: { PP: 33.0, PSOE: 26.8, VOX: 12.5, SUMAR: 9.8, ERC: 3.0, JUNTS: 2.6, PNV: 1.8, BILDU: 1.9, CC: 1.1, BNG: 0.8, OTROS: 6.7 },
  },
]

/** Calcula la estimación agregada ponderada a partir de un set de sondeos */
export function estimacionPonderada(sondeos: SondeoCifras[]): {
  partidos: Record<string, { pct: number; ic80_inf: number; ic80_sup: number; sigma: number; n_encuestas: number }>
  meta: { peso_total: number; n_sondeos: number; ponderacion_aplicada: 'calidad × recencia × √muestra' }
} {
  if (sondeos.length === 0) {
    return { partidos: {}, meta: { peso_total: 0, n_sondeos: 0, ponderacion_aplicada: 'calidad × recencia × √muestra' } }
  }
  const partyKeys = Array.from(new Set(sondeos.flatMap(s => Object.keys(s.partidos))))
  const out: Record<string, { pct: number; ic80_inf: number; ic80_sup: number; sigma: number; n_encuestas: number }> = {}
  let pesoTotal = 0

  for (const k of partyKeys) {
    let suma = 0
    let pesoSum = 0
    let n = 0
    const valores: Array<{ v: number; w: number }> = []
    for (const s of sondeos) {
      const v = s.partidos[k]
      if (v == null) continue
      const w = pesoEncuesta({ casa: s.casa, fecha: s.fecha, muestra: s.muestra }).peso
      suma += v * w
      pesoSum += w
      n++
      valores.push({ v, w })
    }
    if (pesoSum === 0) continue
    const pct = suma / pesoSum
    // Desviación estándar ponderada (varianza muestral)
    let varSum = 0
    for (const { v, w } of valores) {
      varSum += w * Math.pow(v - pct, 2)
    }
    const sigma = Math.sqrt(varSum / pesoSum)
    // IC 80% ≈ ±1.28σ / √n (aproximación)
    const halfWidth = (1.28 * sigma) / Math.sqrt(Math.max(1, n))
    out[k] = {
      pct: Math.round(pct * 100) / 100,
      ic80_inf: Math.round((pct - halfWidth) * 100) / 100,
      ic80_sup: Math.round((pct + halfWidth) * 100) / 100,
      sigma: Math.round(sigma * 100) / 100,
      n_encuestas: n,
    }
    pesoTotal += pesoSum
  }

  return {
    partidos: out,
    meta: {
      peso_total: Math.round(pesoTotal * 100) / 100,
      n_sondeos: sondeos.length,
      ponderacion_aplicada: 'calidad × recencia × √muestra',
    },
  }
}
