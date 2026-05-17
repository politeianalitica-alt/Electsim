/**
 * GET /api/sectores/defensa/sanciones?q=&limit=50&dataset=all
 * Entidades sancionadas relevantes para el sector defensa.
 *
 * Fuentes:
 *   - OpenSanctions API consolidado (datasets: us_ofac_sdn, eu_fsf, un_sc_sanctions, uk_hmt_sanctions)
 *   - Fallback: dataset estático curado si OpenSanctions no responde
 *
 * Parámetros:
 *   q        = string     búsqueda de entidad
 *   limit    = 50         máx 100
 *   dataset  = all | ofac | eu | un | uk
 */
import { NextRequest, NextResponse } from 'next/server'

export const dynamic    = 'force-dynamic'
export const runtime    = 'nodejs'
export const maxDuration = 20

const DATASET_MAP: Record<string, string> = {
  ofac: 'us_ofac_sdn',
  eu:   'eu_fsf',
  un:   'un_sc_sanctions',
  uk:   'uk_hmt_sanctions',
}

// Entidades de defensa/armamento conocidas para filtrar por relevancia
const DEFENSE_KEYWORDS = [
  'defense', 'defence', 'military', 'arms', 'weapon', 'missile', 'aviation',
  'aerospace', 'naval', 'munition', 'technology', 'industri', 'export',
  'nuclear', 'cyber', 'intelligence', 'security', 'airforc', 'navy',
]

interface SanctionEntity {
  id: string
  name: string
  aliases?: string[]
  datasets: string[]
  schema: string
  properties?: {
    country?: string[]
    nationality?: string[]
    program?: string[]
    reason?: string[]
    sanctionedBy?: string[]
    topics?: string[]
  }
  first_seen?: string
  last_seen?: string
  referents?: string[]
}

interface NormalizedSanction {
  id: string
  nombre: string
  aliases: string[]
  tipo: string // Organization | Person | Vessel | Aircraft
  paises: string[]
  fuentes: string[]
  programas: string[]
  razon?: string
  primera_sancion?: string
  ultima_actualizacion?: string
  relevancia_defensa: boolean
}

function isDefenseRelevant(entity: SanctionEntity): boolean {
  const text = [
    entity.name,
    ...(entity.aliases ?? []),
    ...(entity.properties?.program ?? []),
    ...(entity.properties?.reason ?? []),
    ...(entity.properties?.topics ?? []),
  ].join(' ').toLowerCase()
  return DEFENSE_KEYWORDS.some(kw => text.includes(kw))
}

function normalize(entity: SanctionEntity): NormalizedSanction {
  return {
    id: entity.id,
    nombre: entity.name,
    aliases: entity.aliases?.slice(0, 5) ?? [],
    tipo: entity.schema,
    paises: [
      ...(entity.properties?.country ?? []),
      ...(entity.properties?.nationality ?? []),
    ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 5),
    fuentes: entity.datasets.map(d => d.replace('us_ofac_sdn','OFAC').replace('eu_fsf','EU FSF').replace('un_sc_sanctions','ONU').replace('uk_hmt_sanctions','UK HMT')),
    programas: entity.properties?.program ?? [],
    razon: entity.properties?.reason?.[0],
    primera_sancion: entity.first_seen?.slice(0, 10),
    ultima_actualizacion: entity.last_seen?.slice(0, 10),
    relevancia_defensa: isDefenseRelevant(entity),
  }
}

const STATIC_FALLBACK: NormalizedSanction[] = [
  { id: 's1', nombre: 'ROSOBORONEXPORT', aliases: ['Rosoboronexport JSC'], tipo: 'Organization', paises: ['RU'], fuentes: ['OFAC', 'EU FSF', 'UK HMT'], programas: ['UKRAINE-EO13661'], razon: 'Exportador estatal de armas ruso. Ventas a Siria, Irán y actores no estatales.', primera_sancion: '2022-03-24', ultima_actualizacion: '2024-11-15', relevancia_defensa: true },
  { id: 's2', nombre: 'UNITED AIRCRAFT CORPORATION', aliases: ['OAK', 'UAC'], tipo: 'Organization', paises: ['RU'], fuentes: ['OFAC', 'EU FSF'], programas: ['UKRAINE-EO13661'], razon: 'Holding estatal ruso de aviación militar (Su-35, Tu-160, MiG).', primera_sancion: '2022-02-28', ultima_actualizacion: '2024-08-20', relevancia_defensa: true },
  { id: 's3', nombre: 'ALMAZ-ANTEY', aliases: ['JSC Concern VKO Almaz-Antey'], tipo: 'Organization', paises: ['RU'], fuentes: ['OFAC', 'EU FSF', 'UK HMT'], programas: ['UKRAINE-EO13661'], razon: 'Fabricante de sistemas antiarea S-300, S-400, BUK. Acusado de proveer el BUK que derrumbo MH17.', primera_sancion: '2014-07-16', ultima_actualizacion: '2024-09-10', relevancia_defensa: true },
  { id: 's4', nombre: 'ROSTEC', aliases: ['State Corporation Rostec', 'Russian Technologies'], tipo: 'Organization', paises: ['RU'], fuentes: ['OFAC', 'EU FSF', 'ONU', 'UK HMT'], programas: ['UKRAINE-EO13685'], razon: 'Conglomerado estatal ruso de defensa e industria. Controla Kalashnikov, KRET, UralVagonZavod.', primera_sancion: '2022-02-28', ultima_actualizacion: '2025-01-08', relevancia_defensa: true },
  { id: 's5', nombre: 'AVIATION INDUSTRY CORPORATION OF CHINA', aliases: ['AVIC', 'AVIC Group'], tipo: 'Organization', paises: ['CN'], fuentes: ['OFAC'], programas: ['ITAR-522-DENY'], razon: 'Empresa estatal de aviación militar china. Entity List BIS. J-20, FC-31.', primera_sancion: '2020-11-12', ultima_actualizacion: '2024-06-14', relevancia_defensa: true },
  { id: 's6', nombre: 'IRAN AIRCRAFT MANUFACTURING INDUSTRIAL CO', aliases: ['HESA', 'Iran Aircraft Industries'], tipo: 'Organization', paises: ['IR'], fuentes: ['OFAC', 'EU FSF', 'ONU'], programas: ['IRAN-E013382'], razon: 'Fabricante de drones Shahed usados en Ucrania. Designado por OFAC en 2022.', primera_sancion: '2007-03-20', ultima_actualizacion: '2024-10-03', relevancia_defensa: true },
  { id: 's7', nombre: 'NORINCO GROUP', aliases: ['China North Industries Group', 'CNGC'], tipo: 'Organization', paises: ['CN'], fuentes: ['OFAC'], programas: ['ITAR-522-DENY'], razon: 'Conglomerado armamentistico estatal chino. Vehículos blindados, artillería, explosivos.', primera_sancion: '2003-05-22', ultima_actualizacion: '2023-11-20', relevancia_defensa: true },
  { id: 's8', nombre: 'SYRIAN ARAB ARMY PROCUREMENT', aliases: [], tipo: 'Organization', paises: ['SY'], fuentes: ['EU FSF', 'UK HMT'], programas: ['SYRIA-2013-EU'], razon: 'Adquisiciones militares del régimen sirio.', primera_sancion: '2013-05-27', ultima_actualizacion: '2024-01-15', relevancia_defensa: true },
  { id: 's9', nombre: 'KOREA MINING DEVELOPMENT TRADING CORPORATION', aliases: ['KOMID'], tipo: 'Organization', paises: ['KP'], fuentes: ['ONU', 'OFAC', 'EU FSF'], programas: ['DPRK-1718'], razon: 'Principal exportador de armas y material bélico de Corea del Norte. Resoluciones ONU.', primera_sancion: '2009-04-24', ultima_actualizacion: '2024-07-30', relevancia_defensa: true },
  { id: 's10', nombre: 'WAGNER GROUP', aliases: ['PMC Wagner', 'Grupo Wagner'], tipo: 'Organization', paises: ['RU'], fuentes: ['OFAC', 'EU FSF', 'UK HMT'], programas: ['UKRAINE-EO13661'], razon: 'Grupo paramilitar privado ruso. Operaciones en Ucrania, África, Siria.', primera_sancion: '2022-05-08', ultima_actualizacion: '2024-12-01', relevancia_defensa: true },
]

export async function GET(req: NextRequest) {
  const sp      = req.nextUrl.searchParams
  const q       = (sp.get('q') || '').toLowerCase().trim()
  const limit   = Math.min(Number(sp.get('limit') || 50), 100)
  const dataset = sp.get('dataset') || 'all'
  const t0 = Date.now()

  let items: NormalizedSanction[] = []
  let source = 'static'

  // Intentar OpenSanctions API
  try {
    const dsParam = dataset !== 'all' && DATASET_MAP[dataset] ? `&dataset=${DATASET_MAP[dataset]}` : ''
    const qParam  = q ? `&q=${encodeURIComponent(q)}` : '&q=defense+military+arms+weapon'
    const url = `https://api.opensanctions.org/search/default?limit=${Math.min(limit, 100)}${qParam}${dsParam}&schema=Organization`
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8_000),
    })
    if (res.ok) {
      const json = await res.json()
      const raw: SanctionEntity[] = json.results ?? []
      items = raw.map(normalize)
      source = 'opensanctions'
    }
  } catch { /* fallback */ }

  // Fallback o enriquecimiento con dataset estático
  if (items.length === 0) {
    items = STATIC_FALLBACK
    source = 'static_curated'
  }

  // Filtro texto adicional
  if (q) {
    items = items.filter(it =>
      it.nombre.toLowerCase().includes(q) ||
      it.aliases.some(a => a.toLowerCase().includes(q)) ||
      it.paises.some(p => p.toLowerCase().includes(q))
    )
  }

  return NextResponse.json({
    items: items.slice(0, limit),
    total: items.length,
    source,
    fetch_ms: Date.now() - t0,
    fuente: 'OpenSanctions · OFAC SDN + EU FSF + ONU + UK HMT',
  }, { headers: { 'Cache-Control': 's-maxage=1800, stale-while-revalidate=3600' } })
}
