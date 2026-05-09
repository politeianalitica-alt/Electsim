import { NextRequest, NextResponse } from 'next/server'
import { fromBackend, withMeta } from '@/lib/backend'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const CCAA_COORDS: Record<string, { lat: number; lon: number }> = {
  'Andalucía':          { lat: 37.54, lon: -4.73 },
  'Aragón':             { lat: 41.60, lon: -0.89 },
  'Asturias':           { lat: 43.36, lon: -5.86 },
  'Baleares':           { lat: 39.57, lon:  2.65 },
  'Canarias':           { lat: 28.29, lon:-15.49 },
  'Cantabria':          { lat: 43.18, lon: -3.99 },
  'Castilla-La Mancha': { lat: 39.86, lon: -3.98 },
  'Castilla y León':    { lat: 41.65, lon: -4.72 },
  'Cataluña':           { lat: 41.59, lon:  1.52 },
  'Extremadura':        { lat: 39.49, lon: -6.07 },
  'Galicia':            { lat: 42.57, lon: -8.13 },
  'La Rioja':           { lat: 42.28, lon: -2.53 },
  'Madrid':             { lat: 40.42, lon: -3.70 },
  'Murcia':             { lat: 38.02, lon: -1.13 },
  'Navarra':            { lat: 42.69, lon: -1.64 },
  'País Vasco':         { lat: 43.00, lon: -2.50 },
  'Valencia':           { lat: 39.48, lon: -0.75 },
  'Ceuta':              { lat: 35.89, lon: -5.33 },
  'Melilla':            { lat: 35.29, lon: -2.94 },
}

function deptToCcaa(dept: string): string {
  const d = dept.toUpperCase()
  if (d.includes('ANDALUC'))           return 'Andalucía'
  if (d.includes('ARAG'))              return 'Aragón'
  if (d.includes('ASTURIAS'))          return 'Asturias'
  if (d.includes('BALEAR') || d.includes('ILLES')) return 'Baleares'
  if (d.includes('CANARIAS'))          return 'Canarias'
  if (d.includes('CANTABRIA'))         return 'Cantabria'
  if (d.includes('CASTILLA-LA MANCHA') || d.includes('CASTILLA - LA MANCHA')) return 'Castilla-La Mancha'
  if (d.includes('CASTILLA Y LE') || d.includes('CASTILLA-LE')) return 'Castilla y León'
  if (d.includes('CATALU') || d.includes('GENERALITAT')) return 'Cataluña'
  if (d.includes('EXTREMADURA'))       return 'Extremadura'
  if (d.includes('GALICIA') || d.includes('XUNTA')) return 'Galicia'
  if (d.includes('RIOJA'))             return 'La Rioja'
  if (d.includes('COMUNIDAD DE MADRID')) return 'Madrid'
  if (d.includes('MURCIA'))            return 'Murcia'
  if (d.includes('NAVARRA'))           return 'Navarra'
  if (d.includes('EUSKADI') || d.includes('PAÍS VASCO') || d.includes('PAIS VASCO')) return 'País Vasco'
  if (d.includes('VALENCIAN') || d.includes('COMUNITAT')) return 'Valencia'
  if (d.includes('CEUTA'))             return 'Ceuta'
  if (d.includes('MELILLA'))           return 'Melilla'
  return 'Madrid' // national ministries default to Madrid
}

interface LegItem {
  id: string
  titulo: string
  nivel: string
  region: string
  ai_impact_level: string
  ai_relevance: number
  ai_category: string
  sectores_afectados: string[]
  map_lat: number
  map_lon: number
}

interface BackendLaw {
  id: string
  titulo: string
  tipo: string
  departamento: string
  impact: number
}

// tiny deterministic jitter so overlapping CCAA points don't stack
function jitter(seed: string, range: number): number {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0
  return ((h & 0xffff) / 0xffff - 0.5) * range
}

function mapToLegItem(law: BackendLaw): LegItem {
  const ccaa = deptToCcaa(law.departamento ?? '')
  const coords = CCAA_COORDS[ccaa] ?? CCAA_COORDS['Madrid']
  const impact = law.impact ?? 50

  const nivel   = impact >= 80 ? 'nacional' : impact >= 50 ? 'regional' : 'local'
  const aiLevel = impact >= 80 ? 'Alto'     : impact >= 50 ? 'Medio'    : 'Bajo'

  const t = (law.tipo ?? '').toLowerCase()
  let cat = 'legislacion'
  if (t.includes('presupuesto'))                   cat = 'economica'
  else if (t.includes('real decreto-ley'))         cat = 'urgente'
  else if (t.includes('ley org'))                  cat = 'organica'
  else if (t.includes('real decreto'))             cat = 'ejecutiva'
  else if (t.includes('orden'))                    cat = 'administrativa'

  return {
    id: law.id,
    titulo: law.titulo,
    nivel,
    region: ccaa,
    ai_impact_level: aiLevel,
    ai_relevance: Math.min(1, impact / 100),
    ai_category: cat,
    sectores_afectados: [cat],
    map_lat: coords.lat + jitter(law.id + 'lat', 0.4),
    map_lon: coords.lon + jitter(law.id + 'lon', 0.4),
  }
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const limit = Math.min(100, Number(sp.get('limit') || 40))

  const backend = await fromBackend<{ items: BackendLaw[] }>(`/api/laws/timeline?limit=${limit}`)
  const laws = backend?.items ?? []

  if (laws.length > 0) {
    const items = laws.map(mapToLegItem)
    return NextResponse.json(withMeta(items, 'backend'))
  }

  // Fallback mock
  const mock: LegItem[] = [
    { id:'m1', titulo:'Real Decreto-ley energía renovable', nivel:'nacional', region:'Madrid', ai_impact_level:'Alto', ai_relevance:0.92, ai_category:'urgente', sectores_afectados:['energia'], map_lat:40.42,map_lon:-3.70 },
    { id:'m2', titulo:'Reforma sanidad pública Cataluña',   nivel:'regional', region:'Cataluña', ai_impact_level:'Alto', ai_relevance:0.88, ai_category:'social', sectores_afectados:['sanidad'], map_lat:41.59,map_lon:1.52 },
    { id:'m3', titulo:'Ley de Vivienda andaluza',           nivel:'regional', region:'Andalucía', ai_impact_level:'Medio', ai_relevance:0.75, ai_category:'vivienda', sectores_afectados:['vivienda'], map_lat:37.54,map_lon:-4.73 },
    { id:'m4', titulo:'Decreto migración Canarias',         nivel:'nacional', region:'Canarias', ai_impact_level:'Alto', ai_relevance:0.85, ai_category:'social', sectores_afectados:['migracion'], map_lat:28.29,map_lon:-15.49 },
    { id:'m5', titulo:'Concierto Económico País Vasco',     nivel:'nacional', region:'País Vasco', ai_impact_level:'Alto', ai_relevance:0.90, ai_category:'economica', sectores_afectados:['hacienda'], map_lat:43.00,map_lon:-2.50 },
    { id:'m6', titulo:'Plan agua Murcia-Castilla-La Mancha',nivel:'nacional', region:'Murcia', ai_impact_level:'Medio', ai_relevance:0.70, ai_category:'medioambiente', sectores_afectados:['agua'], map_lat:38.02,map_lon:-1.13 },
    { id:'m7', titulo:'Presupuestos Generales Aragón',      nivel:'regional', region:'Aragón', ai_impact_level:'Medio', ai_relevance:0.65, ai_category:'economica', sectores_afectados:['presupuestos'], map_lat:41.60,map_lon:-0.89 },
    { id:'m8', titulo:'Infraestructuras post-DANA Valencia',nivel:'regional', region:'Valencia', ai_impact_level:'Alto', ai_relevance:0.82, ai_category:'infraestructura', sectores_afectados:['infraestructuras'], map_lat:39.48,map_lon:-0.75 },
    { id:'m9', titulo:'Ley Forestal Galicia',               nivel:'regional', region:'Galicia', ai_impact_level:'Medio', ai_relevance:0.60, ai_category:'medioambiente', sectores_afectados:['medioambiente'], map_lat:42.57,map_lon:-8.13 },
    { id:'m10', titulo:'Ley empleo Extremadura',            nivel:'regional', region:'Extremadura', ai_impact_level:'Bajo', ai_relevance:0.50, ai_category:'laboral', sectores_afectados:['empleo'], map_lat:39.49,map_lon:-6.07 },
  ]
  return NextResponse.json(withMeta(mock, 'mock'))
}
