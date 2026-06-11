/**
 * AIS ship type code (0-99) → { categoria, label, color }.
 *
 * Decodifica el campo "Type of ship and cargo" de los mensajes AIS estáticos
 * (mensaje 5 / 24). El estándar ITU-R M.1371 organiza el código en rangos:
 *  - 0       : no disponible / desconocido
 *  - 1-19    : reservado
 *  - 20-29   : WIG (wing in ground)
 *  - 30      : pesca
 *  - 31-32   : remolcadores
 *  - 33      : dragado / operaciones submarinas
 *  - 34      : buceo
 *  - 35      : militar
 *  - 36      : vela (recreo)
 *  - 37      : embarcación de recreo (yate)
 *  - 38-39   : reservado
 *  - 40-49   : alta velocidad (HSC)
 *  - 50-59   : embarcaciones de servicio (práctico, SAR, remolque, antipolución…)
 *  - 60-69   : pasaje
 *  - 70-79   : carga
 *  - 80-89   : tanque / petrolero
 *  - 90-99   : otros
 *
 * El segundo dígito (0-9) suele indicar el tipo de carga / categoría de
 * peligrosidad (DG/HS/MP). Aquí lo resumimos a la categoría operativa.
 *
 * Utilidad PURA · sin red · sin dependencias · testeable.
 *
 * Marca portuaria teal ACCENT '#0e7490' usada para 'carga'.
 */

export type ShipCategory =
  | 'desconocido'
  | 'pesca'
  | 'remolcador'
  | 'tecnico'
  | 'militar'
  | 'recreo'
  | 'alta_velocidad'
  | 'servicio'
  | 'pasaje'
  | 'carga'
  | 'tanque'
  | 'wig'
  | 'otro'

export interface ShipTypeInfo {
  categoria: ShipCategory
  label: string
  color: string
}

/** Constantes de categoría exportadas (evita strings mágicos en consumidores). */
export const SHIP_CATEGORY = {
  DESCONOCIDO: 'desconocido',
  PESCA: 'pesca',
  REMOLCADOR: 'remolcador',
  TECNICO: 'tecnico',
  MILITAR: 'militar',
  RECREO: 'recreo',
  ALTA_VELOCIDAD: 'alta_velocidad',
  SERVICIO: 'servicio',
  PASAJE: 'pasaje',
  CARGA: 'carga',
  TANQUE: 'tanque',
  WIG: 'wig',
  OTRO: 'otro',
} as const satisfies Record<string, ShipCategory>

/** Color por categoría. 'carga' usa el teal portuario ACCENT '#0e7490'. */
export const SHIP_CATEGORY_COLOR: Record<ShipCategory, string> = {
  desconocido: '#94a3b8',
  pesca: '#0891b2',
  remolcador: '#b45309',
  tecnico: '#7c3aed',
  militar: '#374151',
  recreo: '#16a34a',
  alta_velocidad: '#db2777',
  servicio: '#ca8a04',
  pasaje: '#2563eb',
  carga: '#0e7490',
  tanque: '#dc2626',
  wig: '#9333ea',
  otro: '#64748b',
}

/** Etiqueta humana por categoría. */
export const SHIP_CATEGORY_LABEL: Record<ShipCategory, string> = {
  desconocido: 'Desconocido',
  pesca: 'Pesca',
  remolcador: 'Remolcador',
  tecnico: 'Operaciones técnicas',
  militar: 'Militar',
  recreo: 'Recreo / Vela',
  alta_velocidad: 'Alta velocidad',
  servicio: 'Buque de servicio',
  pasaje: 'Pasaje',
  carga: 'Carga',
  tanque: 'Tanque / Petrolero',
  wig: 'WIG (efecto suelo)',
  otro: 'Otro',
}

/**
 * Etiquetas finas para códigos singulares (códigos no agrupados por decena).
 * Para los rangos (40-49, 60-69, 70-79, 80-89…) se usa la categoría base
 * salvo que el segundo dígito aporte un matiz de carga peligrosa.
 */
function cargoSuffix(secondDigit: number): string {
  switch (secondDigit) {
    case 1:
      return ' · mercancía peligrosa (DG A)'
    case 2:
      return ' · mercancía peligrosa (DG B)'
    case 3:
      return ' · mercancía peligrosa (DG C)'
    case 4:
      return ' · mercancía peligrosa (DG D)'
    default:
      return ''
  }
}

function build(categoria: ShipCategory, label: string): ShipTypeInfo {
  return { categoria, label, color: SHIP_CATEGORY_COLOR[categoria] }
}

/**
 * Decodifica un código AIS (0-99) a su categoría operativa, etiqueta y color.
 * Devuelve siempre un objeto válido (degrada a 'desconocido' / 'otro' ante
 * códigos fuera de rango o inválidos). PURA, sin red.
 */
export function shipTypeInfo(code: number | null | undefined): ShipTypeInfo {
  if (code == null || !Number.isFinite(code)) {
    return build(SHIP_CATEGORY.DESCONOCIDO, SHIP_CATEGORY_LABEL.desconocido)
  }
  const c = Math.trunc(code)
  if (c < 0 || c > 99) {
    return build(SHIP_CATEGORY.DESCONOCIDO, SHIP_CATEGORY_LABEL.desconocido)
  }

  const second = c % 10

  // Singulares y rangos especiales
  if (c === 0) return build(SHIP_CATEGORY.DESCONOCIDO, 'No disponible')
  if (c >= 1 && c <= 19) return build(SHIP_CATEGORY.OTRO, 'Reservado')
  if (c >= 20 && c <= 29) return build(SHIP_CATEGORY.WIG, SHIP_CATEGORY_LABEL.wig)
  if (c === 30) return build(SHIP_CATEGORY.PESCA, 'Pesca')
  if (c === 31) return build(SHIP_CATEGORY.REMOLCADOR, 'Remolcador')
  if (c === 32) return build(SHIP_CATEGORY.REMOLCADOR, 'Remolcador (eslora/manga >200m)')
  if (c === 33) return build(SHIP_CATEGORY.TECNICO, 'Dragado / op. submarinas')
  if (c === 34) return build(SHIP_CATEGORY.TECNICO, 'Operaciones de buceo')
  if (c === 35) return build(SHIP_CATEGORY.MILITAR, 'Militar')
  if (c === 36) return build(SHIP_CATEGORY.RECREO, 'Velero')
  if (c === 37) return build(SHIP_CATEGORY.RECREO, 'Embarcación de recreo (yate)')
  if (c === 38 || c === 39) return build(SHIP_CATEGORY.OTRO, 'Reservado')

  // 40-49 alta velocidad (HSC)
  if (c >= 40 && c <= 49) {
    return build(SHIP_CATEGORY.ALTA_VELOCIDAD, 'Alta velocidad (HSC)' + cargoSuffix(second))
  }

  // 50-59 buques de servicio
  if (c === 50) return build(SHIP_CATEGORY.SERVICIO, 'Práctico')
  if (c === 51) return build(SHIP_CATEGORY.SERVICIO, 'Búsqueda y rescate (SAR)')
  if (c === 52) return build(SHIP_CATEGORY.REMOLCADOR, 'Remolcador (servicio)')
  if (c === 53) return build(SHIP_CATEGORY.SERVICIO, 'Buque auxiliar de puerto')
  if (c === 54) return build(SHIP_CATEGORY.SERVICIO, 'Antipolución')
  if (c === 55) return build(SHIP_CATEGORY.SERVICIO, 'Policía / autoridad')
  if (c === 56) return build(SHIP_CATEGORY.SERVICIO, 'Buque de servicio (reservado local)')
  if (c === 57) return build(SHIP_CATEGORY.SERVICIO, 'Buque de servicio (reservado local)')
  if (c === 58) return build(SHIP_CATEGORY.SERVICIO, 'Transporte médico')
  if (c === 59) return build(SHIP_CATEGORY.SERVICIO, 'Buque no combatiente (RR Res.18)')

  // 60-69 pasaje
  if (c >= 60 && c <= 69) {
    return build(SHIP_CATEGORY.PASAJE, 'Pasaje' + cargoSuffix(second))
  }

  // 70-79 carga
  if (c >= 70 && c <= 79) {
    return build(SHIP_CATEGORY.CARGA, 'Carga' + cargoSuffix(second))
  }

  // 80-89 tanque / petrolero
  if (c >= 80 && c <= 89) {
    return build(SHIP_CATEGORY.TANQUE, 'Tanque / Petrolero' + cargoSuffix(second))
  }

  // 90-99 otros
  if (c >= 90 && c <= 99) {
    return build(SHIP_CATEGORY.OTRO, 'Otro tipo' + cargoSuffix(second))
  }

  return build(SHIP_CATEGORY.DESCONOCIDO, SHIP_CATEGORY_LABEL.desconocido)
}

/**
 * Devuelve solo la categoría (sin label/color) de un código AIS. Atajo PURO
 * para filtros/agrupaciones.
 */
export function shipCategoryOf(code: number | null | undefined): ShipCategory {
  return shipTypeInfo(code).categoria
}
