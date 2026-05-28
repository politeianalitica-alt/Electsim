/**
 * Dataset · Alianzas militares y bloques estratégicos globales.
 *
 * Cobertura: 7 alianzas/bloques relevantes con composición actualizada 2024.
 * Para cada alianza:
 *   - ISO3 de miembros
 *   - Fecha aproximada de creación
 *   - Tipo (defensa mutua / partnership / cooperación / económico-militar)
 *   - Grosor para visualización (depth_score 1-3)
 *
 * Fuentes: páginas oficiales NATO/CSTO/SCO/AUKUS + Wikipedia verificada.
 * Si un país tiene posición especial (ej. observador, partner asociado),
 * se marca en `affiliates` separado de `members`.
 */

export type AllianceCategory = 'defensa_mutua' | 'partnership' | 'cooperacion' | 'economico_militar'

export interface Alliance {
  id: string
  name: string
  short_name: string
  category: AllianceCategory
  /** Profundidad para grosor visual: 3=tratado defensa mutua, 2=cooperación operativa, 1=diálogo */
  depth_score: 1 | 2 | 3
  color: string
  founded_year: number
  /** Miembros plenos · ISO3 */
  members: string[]
  /** Partners formales sin estatus de miembro */
  affiliates?: string[]
  description: string
  /** Posiciones España vis-a-vis · si aplica */
  spain_role?: 'fundador' | 'miembro' | 'observador' | 'no_miembro'
}

export const ALLIANCES: Alliance[] = [
  {
    id: 'nato',
    name: 'Organización del Tratado del Atlántico Norte',
    short_name: 'OTAN',
    category: 'defensa_mutua',
    depth_score: 3,
    color: '#1e40af',
    founded_year: 1949,
    spain_role: 'miembro',
    members: [
      'USA', 'CAN', 'GBR', 'FRA', 'DEU', 'ITA', 'ESP', 'PRT', 'NLD', 'BEL',
      'NOR', 'DNK', 'ISL', 'LUX', 'GRC', 'TUR', 'POL', 'HUN', 'CZE', 'ROU',
      'BGR', 'EST', 'LTU', 'LVA', 'SVN', 'SVK', 'ALB', 'HRV', 'MNE', 'MKD',
      'FIN', 'SWE',
    ],
    affiliates: ['UKR', 'GEO', 'MDA', 'BIH'],
    description: 'Alianza atlántica con tratado de defensa mutua (Art. 5). 32 miembros desde 2024 (incl. Suecia).',
  },
  {
    id: 'csto',
    name: 'Organización del Tratado de Seguridad Colectiva',
    short_name: 'CSTO',
    category: 'defensa_mutua',
    depth_score: 3,
    color: '#dc2626',
    founded_year: 2002,
    spain_role: 'no_miembro',
    members: ['RUS', 'BLR', 'KAZ', 'KGZ', 'TJK'],
    affiliates: ['ARM'],   // Armenia suspendida en 2024
    description: 'Alianza militar liderada por Rusia. Armenia suspendió su participación en 2024.',
  },
  {
    id: 'sco',
    name: 'Organización de Cooperación de Shanghái',
    short_name: 'SCO',
    category: 'cooperacion',
    depth_score: 2,
    color: '#eab308',
    founded_year: 2001,
    spain_role: 'no_miembro',
    members: ['CHN', 'RUS', 'KAZ', 'KGZ', 'TJK', 'UZB', 'IND', 'PAK', 'IRN', 'BLR'],
    affiliates: ['AFG', 'MNG', 'TUR', 'EGY', 'SAU', 'QAT', 'KWT', 'ARE'],
    description: 'Organización euroasiática de seguridad y cooperación económica. Bielorrusia (2024) e Irán (2023) ingresaron recientemente.',
  },
  {
    id: 'aukus',
    name: 'Pacto AUKUS',
    short_name: 'AUKUS',
    category: 'partnership',
    depth_score: 3,
    color: '#16a34a',
    founded_year: 2021,
    spain_role: 'no_miembro',
    members: ['AUS', 'GBR', 'USA'],
    description: 'Pacto trilateral seguridad Indo-Pacífico. Pilar 1 (submarinos nucleares Australia) + Pilar 2 (tecnologías avanzadas).',
  },
  {
    id: 'eu_pesco',
    name: 'Cooperación Estructurada Permanente (PESCO)',
    short_name: 'PESCO',
    category: 'cooperacion',
    depth_score: 2,
    color: '#0891b2',
    founded_year: 2017,
    spain_role: 'fundador',
    members: [
      'AUT', 'BEL', 'BGR', 'HRV', 'CYP', 'CZE', 'DNK', 'EST', 'FIN', 'FRA',
      'DEU', 'GRC', 'HUN', 'IRL', 'ITA', 'LVA', 'LTU', 'LUX', 'NLD', 'POL',
      'PRT', 'ROU', 'SVK', 'SVN', 'ESP', 'SWE',
    ],
    description: 'Marco UE para cooperación defensa con compromisos vinculantes. 26 de 27 estados UE (Malta no participa).',
  },
  {
    id: 'quad',
    name: 'Diálogo de Seguridad Cuadrilateral',
    short_name: 'QUAD',
    category: 'partnership',
    depth_score: 2,
    color: '#7c3aed',
    founded_year: 2007,
    spain_role: 'no_miembro',
    members: ['USA', 'JPN', 'AUS', 'IND'],
    description: 'Foro estratégico Indo-Pacífico. No es tratado de defensa pero coordinación operativa creciente.',
  },
  {
    id: 'icc_brics',
    name: 'BRICS+ (cooperación político-económica)',
    short_name: 'BRICS+',
    category: 'economico_militar',
    depth_score: 1,
    color: '#f59e0b',
    founded_year: 2009,
    spain_role: 'no_miembro',
    members: ['BRA', 'RUS', 'IND', 'CHN', 'ZAF', 'IRN', 'EGY', 'ETH', 'ARE'],
    affiliates: ['SAU', 'IDN', 'DZA', 'TUR', 'CUB', 'KAZ', 'VNM'],
    description: 'Bloque ampliado 2024 con dimensión geopolítica creciente (Banco BRICS · expansión 2024 incluye EAU/Irán/Egipto/Etiopía).',
  },
]

/** Obtiene alianzas a las que pertenece un país (incluye affiliates). */
export function getAlliancesForCountry(iso3: string): Array<{ alliance: Alliance; status: 'member' | 'affiliate' }> {
  const u = iso3.toUpperCase()
  const result: Array<{ alliance: Alliance; status: 'member' | 'affiliate' }> = []
  for (const a of ALLIANCES) {
    if (a.members.includes(u)) result.push({ alliance: a, status: 'member' })
    else if (a.affiliates?.includes(u)) result.push({ alliance: a, status: 'affiliate' })
  }
  return result
}

/** Pares (a,b) que están en la MISMA alianza con peso máximo · para arcos del mapa. */
export function getAlliancePairs(): Array<{ a: string; b: string; alliance_id: string; color: string; depth: number }> {
  const pairs: Array<{ a: string; b: string; alliance_id: string; color: string; depth: number }> = []
  for (const al of ALLIANCES) {
    for (let i = 0; i < al.members.length; i++) {
      for (let j = i + 1; j < al.members.length; j++) {
        pairs.push({ a: al.members[i], b: al.members[j], alliance_id: al.id, color: al.color, depth: al.depth_score })
      }
    }
  }
  return pairs
}

export const ALLIANCES_COUNT = ALLIANCES.length
