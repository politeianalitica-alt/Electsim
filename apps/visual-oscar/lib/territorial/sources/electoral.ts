/**
 * Histórico electoral · CCAA + Municipios
 *
 * Fuentes:
 *   1. Snapshot oficial JEC/MIR para CCAA (generales 2023 + autonómicas última)
 *      ↳ data/elecciones-ccaa.json (curado, fácil de actualizar)
 *   2. Wikidata SPARQL para alcaldes (actual + cuando disponible histórico)
 *      ↳ ya consumido desde sources/wikidata.ts
 *   3. Wikipedia infobox para resultados municipales (solo enlace, sin parser)
 */
import data from '@/data/elecciones-ccaa.json'

const PARTY_COLORS: Record<string, string> = {
  'PP': '#1D7AB8',
  'PSOE': '#E53935', 'PSC': '#E53935', 'PSPV-PSOE': '#E53935', 'PSdeG-PSOE': '#E53935',
  'PSOE-A': '#E53935', 'PSN-PSOE': '#E53935', 'PSN': '#E53935', 'PSIB': '#E53935', 'PSE-EE': '#E53935',
  'VOX': '#5DA130',
  'SUMAR': '#D5006D', 'Sumar': '#D5006D', 'Comuns-Sumar': '#D5006D',
  'Compromis': '#FF6F00', 'Compromis-Sumar': '#FF6F00',
  'ERC': '#FFB300',
  'Junts': '#41B6E6',
  'BNG': '#5DAE6E',
  'EH-Bildu': '#7CB342', 'EH Bildu': '#7CB342',
  'PNV': '#1B5E20',
  'CCa': '#F57C00',
  'UPN': '#26A69A',
  'Geroa-Bai': '#80CBC4',
  'CHA': '#FFC107',
  'PAR': '#8D6E63',
  'TERUEL-Existe': '#FF8A65', 'Soria-Ya': '#FF8A65', 'UPL': '#FF8A65',
  'Foro': '#42A5F5',
  'IU': '#C62828', 'UE': '#C62828', 'Podemos': '#7E57C2',
  'PRC': '#4DD0E1',
  'Mas-Madrid': '#7E4DA3',
  'CS': '#F37520',
  'MES': '#9CCC65', 'El-Pi': '#827717',
  'NC-bc': '#FBC02D', 'ASG': '#827717', 'Adelante-A': '#7E57C2', 'Por-Andalucia': '#7E57C2',
  'CUP': '#FFEB3B', 'AC': '#26A69A', 'DO': '#42A5F5', 'Contigo-N': '#26C6DA',
  'CSpor': '#FF7043',
  'OTROS': '#9E9E9E',
}

export interface ResultadoPartido {
  partido: string
  pct: number
  color: string
}

export interface ResultadoEleccion {
  tipo: 'generales' | 'autonomica'
  etiqueta: string
  fecha: string
  resultados: ResultadoPartido[]
  ganador: ResultadoPartido
  fuente: string
}

interface DataRecord {
  ppt?: string
  fecha?: string
  [key: string]: number | string | undefined
}

interface ElectoralData {
  _meta: Record<string, string>
  generales_2023: Record<string, DataRecord>
  autonomicas_ultima: Record<string, DataRecord>
}

function recordToResultados(rec: DataRecord, excluyeKeys: string[] = ['fecha', 'ppt']): ResultadoPartido[] {
  const out: ResultadoPartido[] = []
  for (const [k, v] of Object.entries(rec)) {
    if (excluyeKeys.includes(k)) continue
    if (typeof v !== 'number') continue
    out.push({ partido: k, pct: v, color: PARTY_COLORS[k] || '#7A8189' })
  }
  return out.sort((a, b) => b.pct - a.pct)
}

/**
 * Devuelve el histórico electoral de una CCAA (slug):
 *   - Generales del Estado 2023 desagregadas por la CCAA
 *   - Última elección autonómica disponible
 */
export function getHistoricoElectoralCCAA(slug: string): ResultadoEleccion[] {
  const d = data as ElectoralData
  const out: ResultadoEleccion[] = []

  // Generales 2023
  const gen = d.generales_2023[slug]
  if (gen) {
    const resultados = recordToResultados(gen)
    if (resultados.length > 0) {
      out.push({
        tipo: 'generales',
        etiqueta: 'Generales 23-J (2023)',
        fecha: '2023-07-23',
        resultados,
        ganador: resultados[0],
        fuente: 'Ministerio del Interior · JEC',
      })
    }
  }

  // Autonómica última
  const aut = d.autonomicas_ultima[slug]
  if (aut) {
    const resultados = recordToResultados(aut)
    if (resultados.length > 0) {
      out.push({
        tipo: 'autonomica',
        etiqueta: `Autonómicas ${aut.fecha || 'última'}`,
        fecha: typeof aut.fecha === 'string' ? aut.fecha : '',
        resultados,
        ganador: resultados[0],
        fuente: 'Junta Electoral Central',
      })
    }
  }

  return out
}

/**
 * Calcula índice de competitividad (0-100) — diferencia entre 1º y 2º partido.
 * 0 = competidísimo (empate técnico); 100 = hegemonía total (>40 pts ventaja).
 */
export function indiceCompetitividad(eleccion: ResultadoEleccion): number {
  const [primero, segundo] = eleccion.resultados
  if (!primero || !segundo) return 100
  const ventaja = primero.pct - segundo.pct
  return Math.min(100, Math.round((ventaja / 40) * 100))
}

/**
 * Para municipios: devuelve enlaces oficiales a resultados.
 * El Ministerio del Interior publica datos por municipio en:
 *   https://infoelectoral.interior.gob.es/opencms/es/elecciones-celebradas/
 */
export function getMunicipioElectoralLinks(codigoIne: string, nombre: string) {
  const cpro = codigoIne.substring(0, 2)
  return {
    consultaMir: `https://infoelectoral.interior.gob.es/opencms/es/elecciones-celebradas/consulta-de-resultados-electorales/?elec=2023G`,
    wikipedia: `https://es.wikipedia.org/wiki/Elecciones_municipales_de_${nombre.replace(/\s+/g, '_')}`,
    junta: `https://www.juntaelectoralcentral.es/`,
    cpro,
  }
}
