// Heurística de clasificación + scoring para disposiciones legislativas (BOE).
//
// Resultados (sin LLM, instantáneo):
//   tipo:        Ley | LO | RDL | RD | RDLeg | Orden | Resolución | Otro
//   materia:     Económica | Social | Justicia | Educación | Sanidad
//                | Territorial | Energía | Defensa | Internacional | Digital | Agraria | Otro
//   importance:  0-100, ponderado:
//                  - 50% sección (sec 1 = disposiciones generales = max)
//                  - 25% tipo (LO/Ley/RDL > Orden/Resolución)
//                  - 15% impacto (palabras-clave de sectores grandes)
//                  - 10% recencia
//   tags:         LEGISLATIVA ·  URGENTE ·  EU ·  IMPACTO ALTO

import type { BoeItem } from './boe'

export type TipoNorma = 'Ley' | 'LO' | 'RDL' | 'RD' | 'RDLeg' | 'Orden' | 'Resolución' | 'Tratado' | 'Otro'
export type Materia = 'Económica' | 'Social' | 'Justicia' | 'Educación' | 'Sanidad'
                    | 'Territorial' | 'Energía' | 'Defensa' | 'Internacional' | 'Digital' | 'Agraria' | 'Otro'

export interface ScoredNorma {
  id: string
  fecha: string
  titulo: string
  departamento: string
  seccion_codigo: string
  seccion_nombre: string
  epigrafe: string | null
  url_html: string
  url_pdf: string
  tipo: TipoNorma
  materia: Materia
  importance: number       // 0-100
  components: {
    section: number
    tipo: number
    impact: number
    recency: number
  }
  tags: string[]
}

// Detecta el tipo a partir del prefijo del título oficial del BOE
function detectTipo(titulo: string): TipoNorma {
  const t = titulo.toLowerCase().trim()
  if (/^(ley orgánica|ley orgánica\s+\d)/.test(t)) return 'LO'
  if (/^real decreto-ley\b/.test(t)) return 'RDL'
  if (/^real decreto legislativo\b/.test(t)) return 'RDLeg'
  if (/^real decreto\b/.test(t)) return 'RD'
  if (/^ley\s+\d|^ley\s+(de|orgánica|sobre|para|del)/.test(t)) return 'Ley'
  if (/^acuerdo\b|^tratado\b|^canje de notas\b|^protocolo\b|^convenio\b/.test(t)) return 'Tratado'
  if (/^orden\s+[a-z]{2,4}\/\d|^orden\s+(de|del|para|por|sobre)/.test(t)) return 'Orden'
  if (/^resolución\s+(de|del)/.test(t)) return 'Resolución'
  if (/^circular\b|^instrucción\b/.test(t)) return 'Resolución'
  return 'Otro'
}

// Detecta la materia por keywords
function detectMateria(titulo: string, depto: string): Materia {
  const t = (titulo + ' ' + depto).toLowerCase()
  // Económica · Hacienda, IRPF, IVA, presupuestos, mercados, banca
  if (/hacienda|irpf|iva|fiscal|tributari|presupuesto|deuda|tesoro|mercado|banca|cnmv|cnmc|impuesto|deducción|recaudación|aire|inversión/.test(t)) return 'Económica'
  // Social · trabajo, vivienda, igualdad, dependencia, pensiones
  if (/trabajo|laboral|salario|smi|empleo|vivienda|igualdad|violencia|género|género|dependencia|pensión|prestación|servicios sociales|inclusión/.test(t)) return 'Social'
  // Justicia · CGPJ, fiscalía, código penal, procesal
  if (/cgpj|fiscal[íi]a|código penal|procesal|penitenciari|jurisdic|tribunal|magistrad|justicia|enjuiciamiento|amnistía|aforamiento/.test(t)) return 'Justicia'
  // Educación · universidad, LOMLOE, becas
  if (/universidad|losu|lomloe|enseñanza|estudiant|beca|formación profesional|fp|profesorado|colegio|instituto/.test(t)) return 'Educación'
  // Sanidad · sanitario, medicament, hospital
  if (/sanidad|sanitari|medicament|farmac|hospital|enferm|paciente|salud pública|sns/.test(t)) return 'Sanidad'
  // Territorial · CCAA, financiación autonómica, transferencias
  if (/comunidad autónoma|comunidad foral|financiación autonómica|transferencia|conferencia sectorial|capital del estado|estatuto de autonomía|cataluña|euskadi|galicia|andalucía|valencia|aragón/.test(t)) return 'Territorial'
  // Energía · electricidad, renovables, hidrocarburos
  if (/eléctri|electricidad|gas|hidrocarbur|renovable|fotovoltaic|eóli|nuclear|esiosig|tarifa|sistema eléctrico/.test(t)) return 'Energía'
  // Defensa
  if (/defensa|fuerzas armadas|ejército|guardia civil|seguridad nacional|misión internacional|otan/.test(t)) return 'Defensa'
  // Internacional · tratados, asuntos exteriores
  if (/asuntos exteriores|tratado|convenio internacional|canje de notas|cooperación|unión europea|consejo europeo|directiva|reglamento.*europeo/.test(t)) return 'Internacional'
  // Digital · datos, AEPD, ciber
  if (/datos personales|aepd|ciber|inteligencia artificial|ia\s|telecomunicaciones|digital|plataforma|red social|spam/.test(t)) return 'Digital'
  // Agraria · agricultura, ganadería, pesca
  if (/agricultura|ganader|pesca|agroaliment|pac\s|política agrícola|sector primario|aceite|vino|cereal|oliva/.test(t)) return 'Agraria'
  return 'Otro'
}

const URGENCY_KEYWORDS = [
  'medidas urgentes', 'situación de emergencia', 'estado de alarma',
  'medida extraordinaria', 'crisis', 'declaración de zona afectada',
  'modificación urgente',
]

const HIGH_IMPACT_KEYWORDS = [
  'reforma', 'modificación', 'derogación', 'nueva ley',
  'ampliación', 'subida', 'reducción', 'aprobación',
  'irpf', 'iva', 'salario mínimo', 'pensiones', 'vivienda',
  'amnistía', 'memoria democrática', 'cgpj',
]

// Sección · 1 = Disposiciones generales (máximo peso)
// 2A = nombramientos · 2B = oposiciones · 3 = otras · 4 = administración · 5 = anuncios
function sectionWeight(codigo: string): number {
  if (codigo === '1') return 1.0
  if (codigo === '3') return 0.7   // otras disposiciones (a veces tienen peso)
  if (codigo === '2A') return 0.4  // nombramientos altos cargos
  if (codigo === '2B') return 0.15 // oposiciones
  if (codigo === '4') return 0.2
  if (codigo === '5') return 0.1
  return 0.3
}

// Peso del tipo
function tipoWeight(tipo: TipoNorma): number {
  switch (tipo) {
    case 'LO': return 1.0
    case 'Ley': return 0.95
    case 'RDL': return 0.85
    case 'RDLeg': return 0.75
    case 'RD': return 0.5
    case 'Tratado': return 0.6
    case 'Orden': return 0.25
    case 'Resolución': return 0.2
    default: return 0.15
  }
}

function impactBoost(text: string): { score: number; tags: string[] } {
  const lower = text.toLowerCase()
  const tags: string[] = []
  let score = 0
  for (const kw of URGENCY_KEYWORDS) {
    if (lower.includes(kw)) { score = Math.max(score, 0.9); if (!tags.includes('URGENTE')) tags.push('URGENTE'); break }
  }
  let highHits = 0
  for (const kw of HIGH_IMPACT_KEYWORDS) {
    if (lower.includes(kw)) highHits++
  }
  score = Math.max(score, Math.min(1, highHits / 3))
  if (highHits >= 2) tags.push('IMPACTO ALTO')
  if (lower.includes('unión europea') || lower.includes('directiva europea')) tags.push('EU')
  return { score, tags }
}

function recencyBoost(fechaIso: string): number {
  if (!fechaIso) return 0.3
  const ageDays = (Date.now() - new Date(fechaIso).getTime()) / 86_400_000
  if (ageDays < 0) return 1
  if (ageDays > 14) return 0
  // f(0)=1 · f(7)=0.5 · f(14)=0.25
  return Math.pow(0.5, ageDays / 7)
}

export function scoreNorma(item: BoeItem): ScoredNorma {
  const tipo = detectTipo(item.titulo)
  const materia = detectMateria(item.titulo, item.departamento)
  const text = `${item.titulo} ${item.departamento}`

  const sec = sectionWeight(item.seccion_codigo)
  const tw = tipoWeight(tipo)
  const imp = impactBoost(text)
  const rec = recencyBoost(item.fecha)

  const importance = Math.round(
    (sec * 0.50 + tw * 0.25 + imp.score * 0.15 + rec * 0.10) * 100
  )

  const tags = [' LEGISLATIVA', ...imp.tags]
  if (item.seccion_codigo === '1') tags.push(' DISPOSICIÓN GENERAL')
  if (rec >= 0.85) tags.push(' HOY/AYER')

  return {
    id: item.id,
    fecha: item.fecha,
    titulo: item.titulo,
    departamento: item.departamento,
    seccion_codigo: item.seccion_codigo,
    seccion_nombre: item.seccion_nombre,
    epigrafe: item.epigrafe,
    url_html: item.url_html,
    url_pdf: item.url_pdf,
    tipo,
    materia,
    importance,
    components: {
      section: Math.round(sec * 100),
      tipo: Math.round(tw * 100),
      impact: Math.round(imp.score * 100),
      recency: Math.round(rec * 100),
    },
    tags,
  }
}
