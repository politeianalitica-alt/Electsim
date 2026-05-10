import { NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export interface PuntoPresencia {
  id: string
  pais: string
  iso3: string
  lat: number
  lon: number
  categoria: 'militar' | 'energetica' | 'empresarial' | 'diplomatica' | 'diaspora'
  titulo: string
  actor: string
  descripcion: string
  valor: number
  unidad: 'efectivos' | 'residentes' | 'mill_eur' | 'embajada' | 'MW' | 'unidad'
  score_relevancia: number
}

export interface PresenciaKpis {
  efectivos: number
  diaspora: number
  inversion_mill_eur: number
  embajadas: number
  fuentes_energia: number
}

export interface PresenciaResponse {
  data: PuntoPresencia[]
  kpis: PresenciaKpis
}

function computeKpis(data: PuntoPresencia[]): PresenciaKpis {
  return {
    efectivos:          data.filter(p => p.unidad === 'efectivos').reduce((s, p) => s + p.valor, 0),
    diaspora:           data.filter(p => p.unidad === 'residentes').reduce((s, p) => s + p.valor, 0),
    inversion_mill_eur: data.filter(p => p.unidad === 'mill_eur').reduce((s, p) => s + p.valor, 0),
    embajadas:          data.filter(p => p.categoria === 'diplomatica').length,
    fuentes_energia:    data.filter(p => p.categoria === 'energetica').length,
  }
}

const MOCK_DATA: PuntoPresencia[] = [
  // MILITAR
  { id: 'm1', pais: 'Líbano', iso3: 'LBN', lat: 33.5, lon: 35.5, categoria: 'militar',
    titulo: 'FINUL — Fuerza Interina ONU', actor: 'Ejército de Tierra',
    descripcion: '650 militares en el sur del Líbano como parte de la fuerza de paz de la ONU',
    valor: 650, unidad: 'efectivos', score_relevancia: 0.92 },
  { id: 'm2', pais: 'Iraq', iso3: 'IRQ', lat: 33.0, lon: 44.0, categoria: 'militar',
    titulo: 'Operación Inherent Resolve', actor: 'Ejército de Tierra',
    descripcion: '300 efectivos en formación de fuerzas de seguridad iraquíes en Bagdad y Erbil',
    valor: 300, unidad: 'efectivos', score_relevancia: 0.88 },
  { id: 'm3', pais: 'Latvia', iso3: 'LVA', lat: 56.9, lon: 24.1, categoria: 'militar',
    titulo: 'Misión OTAN eFP', actor: 'Ejército de Tierra',
    descripcion: '300 efectivos en el batallón multinacional de la OTAN en los Bálticos',
    valor: 300, unidad: 'efectivos', score_relevancia: 0.85 },
  { id: 'm4', pais: 'Bosnia Herzegovina', iso3: 'BIH', lat: 43.9, lon: 17.7, categoria: 'militar',
    titulo: 'EUFOR Althea', actor: 'Ejército de Tierra',
    descripcion: 'Contingente en la fuerza de estabilización de la UE en los Balcanes',
    valor: 140, unidad: 'efectivos', score_relevancia: 0.72 },
  { id: 'm5', pais: 'Somalia', iso3: 'SOM', lat: 5.2, lon: 46.2, categoria: 'militar',
    titulo: 'EUNAVFOR Atalanta', actor: 'Armada',
    descripcion: 'Participación en la operación antipiratería europea en el Índico',
    valor: 130, unidad: 'efectivos', score_relevancia: 0.70 },
  { id: 'm6', pais: 'Senegal', iso3: 'SEN', lat: 14.4, lon: -14.4, categoria: 'militar',
    titulo: 'Cooperación bilateral defensa', actor: 'Ministerio de Defensa',
    descripcion: 'Formación de fuerzas de seguridad y cooperación en control migratorio',
    valor: 80, unidad: 'efectivos', score_relevancia: 0.65 },
  // ENERGETICA
  { id: 'e1', pais: 'Argelia', iso3: 'DZA', lat: 28.0, lon: 2.6, categoria: 'energetica',
    titulo: 'Gasoducto Medgaz', actor: 'Naturgy / Sonatrach',
    descripcion: '8 bcm/año. Suministra ~40% del gas natural que consume España',
    valor: 8000, unidad: 'MW', score_relevancia: 0.97 },
  { id: 'e2', pais: 'Nigeria', iso3: 'NGA', lat: 9.1, lon: 8.7, categoria: 'energetica',
    titulo: 'Gasoducto Trans-Saharan (proyectado)', actor: 'Naturgy / NNPC',
    descripcion: 'Proyecto de 4.128 km para conectar Nigeria con Europa vía Sahel',
    valor: 30000, unidad: 'MW', score_relevancia: 0.80 },
  { id: 'e3', pais: 'Noruega', iso3: 'NOR', lat: 64.0, lon: 10.0, categoria: 'energetica',
    titulo: 'Importaciones GNL spot', actor: 'Enagás',
    descripcion: 'Segunda fuente de gas natural. España es el mayor importador europeo de GNL',
    valor: 12000, unidad: 'MW', score_relevancia: 0.88 },
  { id: 'e4', pais: 'Estados Unidos', iso3: 'USA', lat: 37.1, lon: -95.7, categoria: 'energetica',
    titulo: 'GNL — Sabine Pass / Freeport', actor: 'Enagás / Naturgy',
    descripcion: 'Contratos de suministro de GNL a largo plazo desde EE.UU.',
    valor: 9500, unidad: 'MW', score_relevancia: 0.85 },
  { id: 'e5', pais: 'Marruecos', iso3: 'MAR', lat: 31.8, lon: -7.1, categoria: 'energetica',
    titulo: 'Interconexión eléctrica', actor: 'Red Eléctrica / ONEE',
    descripcion: '1.400 MW de capacidad entre España y Marruecos',
    valor: 1400, unidad: 'MW', score_relevancia: 0.83 },
  { id: 'e6', pais: 'Qatar', iso3: 'QAT', lat: 25.3, lon: 51.2, categoria: 'energetica',
    titulo: 'Contratos GNL QatarEnergy', actor: 'Naturgy',
    descripcion: 'Diversificación estratégica. Contratos a largo plazo de GNL',
    valor: 6000, unidad: 'MW', score_relevancia: 0.78 },
  // EMPRESARIAL
  { id: 'b1', pais: 'Brasil', iso3: 'BRA', lat: -14.2, lon: -51.9, categoria: 'empresarial',
    titulo: 'Santander Brasil', actor: 'Banco Santander',
    descripcion: 'Segunda mayor operación del grupo. 45M clientes. 26.000 M EUR en activos',
    valor: 26000, unidad: 'mill_eur', score_relevancia: 0.95 },
  { id: 'b2', pais: 'México', iso3: 'MEX', lat: 23.6, lon: -102.6, categoria: 'empresarial',
    titulo: 'BBVA México + Santander + Iberdrola', actor: 'BBVA / Santander / Iberdrola',
    descripcion: 'BBVA México lidera con 22M clientes. Iberdrola opera centrales eléctricas',
    valor: 58000, unidad: 'mill_eur', score_relevancia: 0.94 },
  { id: 'b3', pais: 'Reino Unido', iso3: 'GBR', lat: 55.4, lon: -3.4, categoria: 'empresarial',
    titulo: 'Ferrovial — Heathrow', actor: 'Ferrovial',
    descripcion: '25% de Heathrow Airport. Constructor e infraestructura en UK',
    valor: 12000, unidad: 'mill_eur', score_relevancia: 0.88 },
  { id: 'b4', pais: 'Alemania', iso3: 'DEU', lat: 51.2, lon: 10.5, categoria: 'empresarial',
    titulo: 'Telefónica Deutschland / Inditex', actor: 'Telefónica / Inditex',
    descripcion: 'O2 Germany (44M clientes) + Inditex 400 tiendas',
    valor: 18000, unidad: 'mill_eur', score_relevancia: 0.85 },
  { id: 'b5', pais: 'Estados Unidos', iso3: 'USA', lat: 37.1, lon: -95.7, categoria: 'empresarial',
    titulo: 'Santander USA / Iberdrola / Ferrovial', actor: 'Santander / Iberdrola / Ferrovial',
    descripcion: 'Iberdrola activo en renovables. Ferrovial en autopistas. Santander banca',
    valor: 35000, unidad: 'mill_eur', score_relevancia: 0.90 },
  { id: 'b6', pais: 'Chile', iso3: 'CHL', lat: -35.7, lon: -71.5, categoria: 'empresarial',
    titulo: 'Endesa Chile / Santander Chile', actor: 'Endesa / Santander',
    descripcion: 'Endesa Chile: mayor generador eléctrico. Santander Top-5 banco',
    valor: 9000, unidad: 'mill_eur', score_relevancia: 0.82 },
  // DIPLOMATICA
  { id: 'd1', pais: 'Estados Unidos', iso3: 'USA', lat: 37.1, lon: -95.7, categoria: 'diplomatica',
    titulo: 'Embajada Washington D.C.', actor: 'Ministerio de Asuntos Exteriores',
    descripcion: 'Relación bilateral clave en marco OTAN. 12 consulados en EE.UU.',
    valor: 1, unidad: 'embajada', score_relevancia: 0.95 },
  { id: 'd2', pais: 'Francia', iso3: 'FRA', lat: 46.2, lon: 2.2, categoria: 'diplomatica',
    titulo: 'Embajada París', actor: 'Ministerio de Asuntos Exteriores',
    descripcion: 'Principal socio europeo. Cooperación energética e interconexión ferroviaria',
    valor: 1, unidad: 'embajada', score_relevancia: 0.90 },
  { id: 'd3', pais: 'Marruecos', iso3: 'MAR', lat: 31.8, lon: -7.1, categoria: 'diplomatica',
    titulo: 'Embajada Rabat — prioridad estratégica', actor: 'Ministerio de Asuntos Exteriores',
    descripcion: 'Primera prioridad del vecindario sur. Sahara occidental, migración, energía',
    valor: 1, unidad: 'embajada', score_relevancia: 0.97 },
  { id: 'd4', pais: 'Argelia', iso3: 'DZA', lat: 28.0, lon: 2.6, categoria: 'diplomatica',
    titulo: 'Embajada Argel — tensión activa', actor: 'Ministerio de Asuntos Exteriores',
    descripcion: 'Relación bajo tensión desde posición española sobre Sahara',
    valor: 1, unidad: 'embajada', score_relevancia: 0.95 },
  { id: 'd5', pais: 'Ucrania', iso3: 'UKR', lat: 48.4, lon: 31.2, categoria: 'diplomatica',
    titulo: 'Apoyo UE — Embajada Kiev', actor: 'Ministerio de Asuntos Exteriores',
    descripcion: 'España co-lidera coordinación de ayuda militar UE',
    valor: 1, unidad: 'embajada', score_relevancia: 0.88 },
  { id: 'd6', pais: 'China', iso3: 'CHN', lat: 35.9, lon: 104.2, categoria: 'diplomatica',
    titulo: 'Embajada Pekín — diálogo estratégico', actor: 'Ministerio de Asuntos Exteriores',
    descripcion: 'Sexto socio comercial. Inversión en renovables, litio y semiconductores',
    valor: 1, unidad: 'embajada', score_relevancia: 0.83 },
  { id: 'd7', pais: 'Arabia Saudí', iso3: 'SAU', lat: 23.9, lon: 45.1, categoria: 'diplomatica',
    titulo: 'Embajada Riad', actor: 'Ministerio de Asuntos Exteriores',
    descripcion: 'Socio energético y mercado de exportación de defensa (fragatas F-110)',
    valor: 1, unidad: 'embajada', score_relevancia: 0.80 },
  // DIASPORA
  { id: 'dia1', pais: 'Argentina', iso3: 'ARG', lat: -38.4, lon: -63.6, categoria: 'diaspora',
    titulo: 'Comunidad española en Argentina', actor: 'MAEC / Registro Consular',
    descripcion: 'Mayor comunidad española en el extranjero. Fuerte arraigo cultural y vínculos',
    valor: 585000, unidad: 'residentes', score_relevancia: 0.90 },
  { id: 'dia2', pais: 'Venezuela', iso3: 'VEN', lat: 6.4, lon: -66.6, categoria: 'diaspora',
    titulo: 'Comunidad española en Venezuela', actor: 'MAEC / Registro Consular',
    descripcion: 'Gran comunidad con doble nacionalidad. Crisis económica aumenta retornos',
    valor: 168000, unidad: 'residentes', score_relevancia: 0.85 },
  { id: 'dia3', pais: 'Francia', iso3: 'FRA', lat: 46.2, lon: 2.2, categoria: 'diaspora',
    titulo: 'Comunidad española en Francia', actor: 'MAEC / Registro Consular',
    descripcion: 'Emigración histórica y nueva emigración cualificada post-2008',
    valor: 196000, unidad: 'residentes', score_relevancia: 0.82 },
  { id: 'dia4', pais: 'Alemania', iso3: 'DEU', lat: 51.2, lon: 10.5, categoria: 'diaspora',
    titulo: 'Comunidad española en Alemania', actor: 'MAEC / Registro Consular',
    descripcion: 'Emigración de jóvenes cualificados en tecnología e industria',
    valor: 160000, unidad: 'residentes', score_relevancia: 0.80 },
  { id: 'dia5', pais: 'Reino Unido', iso3: 'GBR', lat: 55.4, lon: -3.4, categoria: 'diaspora',
    titulo: 'Comunidad española en Reino Unido', actor: 'MAEC / Registro Consular',
    descripcion: '~130K con estatuto settled post-Brexit. Incertidumbre residual',
    valor: 158000, unidad: 'residentes', score_relevancia: 0.82 },
  { id: 'dia6', pais: 'México', iso3: 'MEX', lat: 23.6, lon: -102.6, categoria: 'diaspora',
    titulo: 'Comunidad española en México', actor: 'MAEC / Registro Consular',
    descripcion: 'Exilio republicano + nueva emigración. Comunidad empresarial activa',
    valor: 132000, unidad: 'residentes', score_relevancia: 0.78 },
  { id: 'dia7', pais: 'Estados Unidos', iso3: 'USA', lat: 37.1, lon: -95.7, categoria: 'diaspora',
    titulo: 'Comunidad española en Estados Unidos', actor: 'MAEC / Registro Consular',
    descripcion: 'Concentrada en Miami, Nueva York y Silicon Valley',
    valor: 118000, unidad: 'residentes', score_relevancia: 0.77 },
  { id: 'dia8', pais: 'Cuba', iso3: 'CUB', lat: 21.5, lon: -79.5, categoria: 'diaspora',
    titulo: 'Comunidad española en Cuba', actor: 'MAEC / Registro Consular',
    descripcion: 'Descendientes de emigración histórica. Vínculos familiares intensos',
    valor: 90000, unidad: 'residentes', score_relevancia: 0.70 },
  { id: 'dia9', pais: 'Brasil', iso3: 'BRA', lat: -14.2, lon: -51.9, categoria: 'diaspora',
    titulo: 'Comunidad española en Brasil', actor: 'MAEC / Registro Consular',
    descripcion: 'Emigración histórica. Comunidad empresarial y cultural arraigada',
    valor: 80000, unidad: 'residentes', score_relevancia: 0.70 },
]

function normalizePresencia(raw: unknown[]): PuntoPresencia[] {
  return raw.flatMap(r => {
    if (!r || typeof r !== 'object') return []
    const row = r as Record<string, unknown>
    const cat = String(row.categoria ?? row.tipo_presencia ?? '')
    if (!['militar','energetica','empresarial','diplomatica','diaspora'].includes(cat)) return []
    const lat = Number(row.lat ?? 0), lon = Number(row.lon ?? 0)
    if (!lat && !lon) return []
    let valor = Number(row.valor ?? 1)
    let unidad: PuntoPresencia['unidad'] = 'unidad'
    if (cat === 'militar')     { valor = Number(row.efectivos ?? row.valor ?? 1); unidad = 'efectivos' }
    if (cat === 'diaspora')    { valor = Number(row.residentes ?? row.valor ?? 1); unidad = 'residentes' }
    if (cat === 'empresarial') { valor = Number(row.stock_mill_eur ?? row.valor ?? 1); unidad = 'mill_eur' }
    if (cat === 'diplomatica') { valor = 1; unidad = 'embajada' }
    if (cat === 'energetica')  { valor = Number(row.valor ?? 1); unidad = 'MW' }
    return [{
      id:   String(row.id ?? `${cat}-${lat}-${lon}`),
      pais: String(row.pais_nombre ?? row.pais ?? row.territory ?? ''),
      iso3: String(row.iso3 ?? ''),
      lat, lon,
      categoria: cat as PuntoPresencia['categoria'],
      titulo:    String(row.titulo ?? row.title ?? ''),
      actor:     String(row.actor_espanol ?? row.actor ?? ''),
      descripcion: String(row.descripcion ?? row.context ?? row.status ?? ''),
      valor, unidad,
      score_relevancia: Number(row.score_relevancia ?? row.relevancia ?? 0.5),
    }]
  })
}

export async function GET() {
  const real = await fromBackend<{ data: unknown[] }>('/geopolitica/presencia-espanola-geo')
  if (real?.data && Array.isArray(real.data) && real.data.length > 0) {
    const data = normalizePresencia(real.data)
    if (data.length > 0) {
      return NextResponse.json(withMeta({ data, kpis: computeKpis(data) }, 'backend'))
    }
  }
  return NextResponse.json(withMeta({ data: MOCK_DATA, kpis: computeKpis(MOCK_DATA) }, 'mock'))
}
