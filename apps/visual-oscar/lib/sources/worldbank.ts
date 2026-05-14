/**
 * Cliente para World Bank Open Data API · sin auth.
 * https://api.worldbank.org/v2/
 *
 * Series usadas en el sector defensa:
 *   - MS.MIL.XPND.GD.ZS · gasto militar como % del PIB
 *   - MS.MIL.XPND.CD    · gasto militar absoluto en USD corrientes
 *   - MS.MIL.XPND.ZS    · gasto militar como % gasto público
 *   - MS.MIL.TOTL.P1    · personal militar total
 */

const BASE = 'https://api.worldbank.org/v2'
const UA = 'Politeia-Analitica/1.0 (+https://politeia-analitica.vercel.app)'

interface WBValue {
  date: string
  value: number | null
  countryiso3code: string
  country: { id: string; value: string }
  indicator: { id: string; value: string }
}

export interface SeriePoint {
  year: number
  value: number | null
  country: string
  iso3: string
}

async function fetchWB(path: string, qs: Record<string, string>, timeoutMs = 8000): Promise<unknown[] | null> {
  const url = new URL(`${BASE}/${path}`)
  url.searchParams.set('format', 'json')
  for (const [k, v] of Object.entries(qs)) url.searchParams.set(k, v)
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: ctrl.signal,
      next: { revalidate: 86400 },  // 24h cache (datos anuales)
    })
    clearTimeout(timer)
    if (!res.ok) return null
    return (await res.json()) as unknown[]
  } catch { return null }
}

/**
 * Series histórica para 1 país y 1 indicador.
 * @param iso3 ESP, USA, FRA, DEU, GBR, ITA, POL, ...
 */
export async function getSerie(
  iso3: string,
  indicator: string,
  fromYear = 2000,
  toYear = new Date().getFullYear(),
): Promise<SeriePoint[]> {
  const r = await fetchWB(`country/${iso3}/indicator/${indicator}`, {
    per_page: '100',
    date: `${fromYear}:${toYear}`,
  })
  if (!Array.isArray(r) || r.length < 2) return []
  const data = r[1] as WBValue[]
  return data
    .filter(d => d.value != null)
    .map(d => ({
      year: Number(d.date),
      value: d.value,
      country: d.country.value,
      iso3: d.countryiso3code,
    }))
    .sort((a, b) => a.year - b.year)
}

/**
 * Comparativa de varios países para un indicador y año concreto.
 */
export async function getCrossCountry(
  iso3List: string[],
  indicator: string,
  year: number,
): Promise<Array<{ iso3: string; country: string; value: number | null; year: number }>> {
  const results = await Promise.all(
    iso3List.map(async iso3 => {
      const data = await getSerie(iso3, indicator, year - 2, year + 1)
      // Última observación disponible
      const valid = data.filter(d => d.value != null).reverse()
      return {
        iso3,
        country: valid[0]?.country || iso3,
        value: valid[0]?.value ?? null,
        year: valid[0]?.year ?? year,
      }
    }),
  )
  return results
}

// ─── Catálogos curados ─────────────────────────────────────

export const EMPRESAS_DEFENSA = [
  {
    nombre: 'Indra', ticker: 'IDR.MC', ibex: true,
    descripcion: 'Sistemas defensa y simulación · radar Lanza, ATC, ciberdefensa.',
    capitalizacion_b: 5.4,
    web: 'https://www.indracompany.com',
    segmento: 'Sistemas · radar · ciber',
  },
  {
    nombre: 'Navantia', ticker: '—', ibex: false, publica: true,
    descripcion: 'Astillero público · F-110, S-80, BAM, exportación a Australia y Arabia.',
    capitalizacion_b: 0,
    web: 'https://www.navantia.es',
    segmento: 'Naval · astillero estatal',
  },
  {
    nombre: 'Airbus DS España', ticker: 'AIR.MC', ibex: false,
    descripcion: 'Eurofighter, A400M, satélites · planta Getafe, Sevilla, Cádiz.',
    capitalizacion_b: 0,
    web: 'https://www.airbus.com/en/defence',
    segmento: 'Aeronáutica · espacio',
  },
  {
    nombre: 'Sener Aeroespacial', ticker: '—', ibex: false,
    descripcion: 'Ingeniería aerospacial · Galileo, satélites IXV, Mars Express.',
    capitalizacion_b: 0,
    web: 'https://www.aeroespacial.sener',
    segmento: 'Espacio · ingeniería',
  },
  {
    nombre: 'GMV', ticker: '—', ibex: false,
    descripcion: 'Sistemas de control satélite y posicionamiento (Galileo, EGNOS).',
    capitalizacion_b: 0,
    web: 'https://www.gmv.com',
    segmento: 'Espacio · TIC defensa',
  },
  {
    nombre: 'Escribano Mechanical', ticker: '—', ibex: false,
    descripcion: 'Estaciones armas remotas (RWS) · vehículos blindados · óptica.',
    capitalizacion_b: 0,
    web: 'https://www.escribano.es',
    segmento: 'Vehículos · armamento',
  },
  {
    nombre: 'Tecnobit', ticker: '—', ibex: false,
    descripcion: 'Filial Oesía · sistemas de comunicaciones tácticas y RPAS.',
    capitalizacion_b: 0,
    web: 'https://www.tecnobit.es',
    segmento: 'Comunicaciones · RPAS',
  },
  {
    nombre: 'EM&E', ticker: '—', ibex: false,
    descripcion: 'Vehículos blindados (Vamtac), 4×4 tácticos · exportador clave.',
    capitalizacion_b: 0,
    web: 'https://www.uroempresa.com',
    segmento: 'Vehículos blindados',
  },
  {
    nombre: 'ITP Aero', ticker: '—', ibex: false,
    descripcion: 'Motores de aviación · piezas Eurofighter EJ200, A400M, NH90.',
    capitalizacion_b: 0,
    web: 'https://www.itpaero.com',
    segmento: 'Propulsión · aeronaves',
  },
  {
    nombre: 'Expal Systems', ticker: '—', ibex: false,
    descripcion: 'Munición y explosivos militares · adquirida por Rheinmetall 2023.',
    capitalizacion_b: 0,
    web: 'https://www.expal.com',
    segmento: 'Munición · explosivos',
  },
  {
    nombre: 'Hisdesat', ticker: '—', ibex: false, publica: true,
    descripcion: 'Operador satélites comunicaciones gubernamentales · Spainsat NG.',
    capitalizacion_b: 0,
    web: 'https://www.hisdesat.es',
    segmento: 'SatCom estatal',
  },
  {
    nombre: 'Aerotecnic', ticker: '—', ibex: false,
    descripcion: 'Aeroestructuras de fibra de carbono · A350, A400M, F-35.',
    capitalizacion_b: 0,
    web: 'https://www.aerotecnic.com',
    segmento: 'Aeroestructuras',
  },
] as const

export const REGULADORES_DEFENSA = [
  {
    nombre: 'MINISDEF',
    full: 'Ministerio de Defensa',
    web: 'https://www.defensa.gob.es',
    competencias: 'Política de defensa, FAS, presupuesto, programas especiales armamento.',
  },
  {
    nombre: 'DGAM',
    full: 'Dirección General de Armamento y Material',
    web: 'https://www.defensa.gob.es/dgam',
    competencias: 'Adquisición de armamento, programas especiales, I+D defensa.',
  },
  {
    nombre: 'INTA',
    full: 'Instituto Nacional de Técnica Aeroespacial',
    web: 'https://www.inta.es',
    competencias: 'I+D aeroespacial, ensayos, satélites Paz, Ingenio.',
  },
  {
    nombre: 'JEMAD',
    full: 'Jefe del Estado Mayor de la Defensa',
    web: 'https://emad.defensa.gob.es',
    competencias: 'Mando operativo conjunto FAS, planeamiento militar.',
  },
  {
    nombre: 'NATO · OTAN',
    full: 'Organización del Tratado del Atlántico Norte',
    web: 'https://www.nato.int/cps/en/natohq/topics_67655.htm',
    competencias: 'Compromisos OTAN, gasto 2% PIB, capacidades aliadas.',
  },
  {
    nombre: 'EDA',
    full: 'European Defence Agency',
    web: 'https://eda.europa.eu',
    competencias: 'Cooperación europea defensa, EDF (Fondo Europeo Defensa), PESCO.',
  },
  {
    nombre: 'OCCAR',
    full: 'Organisation Conjointe de Coopération en matière d\'Armement',
    web: 'https://www.occar.int',
    competencias: 'Gestión programas multilaterales (A400M, Tigre, Boxer, FREMM).',
  },
] as const

export const PROGRAMAS_DEFENSA = [
  {
    programa: 'FCAS / NGF', estado: 'En desarrollo', presupuesto_b: 100,
    socios: 'ES + FR + DE',
    descripcion: 'Future Combat Air System · sucesor del Eurofighter para 2040.',
    color: '#5B21B6',
  },
  {
    programa: 'Fragatas F-110', estado: 'En construcción', presupuesto_b: 4.32,
    socios: 'ES (Navantia)',
    descripcion: '5 fragatas multipropósito Bonifaz · primera entrega 2028.',
    color: '#1F4E8C',
  },
  {
    programa: 'Submarino S-80', estado: 'Operativo', presupuesto_b: 4.5,
    socios: 'ES (Navantia)',
    descripcion: 'S-81 Isaac Peral entregado · 4 unidades para Armada.',
    color: '#0EA5E9',
  },
  {
    programa: 'Eurofighter Halcón II', estado: 'Adjudicado', presupuesto_b: 6.25,
    socios: 'ES + DE + IT + UK',
    descripcion: '25 nuevos cazas para reemplazar F-18A en Canarias.',
    color: '#0F766E',
  },
  {
    programa: 'VCR Dragón 8×8', estado: 'En entrega', presupuesto_b: 2.1,
    socios: 'ES (TESS Defence)',
    descripcion: '348 vehículos combate ruedas · Indra/Santa Bárbara/Sapa.',
    color: '#16A34A',
  },
  {
    programa: 'Helicóptero NH-90', estado: 'En entrega', presupuesto_b: 2.9,
    socios: 'ES + UE',
    descripcion: 'Reemplazo Cougar · 45 unidades para Ejército y Armada.',
    color: '#F97316',
  },
  {
    programa: 'Spainsat NG · sat. comm.', estado: 'En órbita', presupuesto_b: 1.4,
    socios: 'ES (Hisdesat + Airbus)',
    descripcion: 'Satélites comunicaciones gubernamentales (NGI + NGII).',
    color: '#DC2626',
  },
  {
    programa: 'A400M Atlas', estado: 'Operativo', presupuesto_b: 5.4,
    socios: 'ES + UE (Airbus)',
    descripcion: 'Avión transporte estratégico · 27 unidades pedidas.',
    color: '#7C3AED',
  },
] as const
