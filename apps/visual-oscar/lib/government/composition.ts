/**
 * Composición del Gobierno español actual (XV Legislatura, gobierno 2023-).
 *
 * Mantengo SOLO el catálogo enumerado de ministros con su cartera, ya que
 * cambia cada pocos meses. El resto del perfil de cada ministro se construye
 * dinámicamente vía /api/figures/dossier-by-name.
 *
 * Actualizado: 2026-05 (referencia oficial publicada en BOE).
 */

export interface Minister {
  id: string
  nombre: string
  cargo: string
  partido: 'PSOE' | 'Sumar' | 'Independiente'
  /** Vicepresidente: rango ordinal */
  vicepresidencia?: 1 | 2 | 3 | 4
  /** URL X/Twitter sin @ */
  twitter?: string
  /** URL Wikipedia */
  wikipedia?: string
}

export const PRESIDENTE: Minister = {
  id: 'gov-presidente',
  nombre: 'Pedro Sánchez Pérez-Castejón',
  cargo: 'Presidente del Gobierno',
  partido: 'PSOE',
  twitter: 'sanchezcastejon',
  wikipedia: 'https://es.wikipedia.org/wiki/Pedro_S%C3%A1nchez_P%C3%A9rez-Castej%C3%B3n',
}

export const VICEPRESIDENCIAS: Minister[] = [
  {
    id: 'gov-vp1',
    nombre: 'María Jesús Montero',
    cargo: 'Vicepresidenta 1ª · Ministra de Hacienda',
    partido: 'PSOE',
    vicepresidencia: 1,
    twitter: 'mjmonteroc',
    wikipedia: 'https://es.wikipedia.org/wiki/Mar%C3%ADa_Jes%C3%BAs_Montero',
  },
  {
    id: 'gov-vp2',
    nombre: 'Yolanda Díaz',
    cargo: 'Vicepresidenta 2ª · Ministra de Trabajo y Economía Social',
    partido: 'Sumar',
    vicepresidencia: 2,
    twitter: 'Yolanda_Diaz_',
    wikipedia: 'https://es.wikipedia.org/wiki/Yolanda_D%C3%ADaz',
  },
  {
    id: 'gov-vp3',
    nombre: 'Sara Aagesen',
    cargo: 'Vicepresidenta 3ª · Ministra para la Transición Ecológica',
    partido: 'PSOE',
    vicepresidencia: 3,
    twitter: 'SaraAagesen',
    wikipedia: 'https://es.wikipedia.org/wiki/Sara_Aagesen',
  },
]

export const MINISTROS: Minister[] = [
  // PSOE
  { id: 'gov-min-economia', nombre: 'Carlos Cuerpo', cargo: 'Ministro de Economía, Comercio y Empresa', partido: 'PSOE', wikipedia: 'https://es.wikipedia.org/wiki/Carlos_Cuerpo' },
  { id: 'gov-min-presidencia', nombre: 'Félix Bolaños', cargo: 'Ministro de Presidencia, Justicia y Relaciones con las Cortes', partido: 'PSOE', twitter: 'bolanos_felix', wikipedia: 'https://es.wikipedia.org/wiki/F%C3%A9lix_Bola%C3%B1os' },
  { id: 'gov-min-exteriores', nombre: 'José Manuel Albares', cargo: 'Ministro de Asuntos Exteriores, UE y Cooperación', partido: 'PSOE', twitter: 'jmalbares', wikipedia: 'https://es.wikipedia.org/wiki/Jos%C3%A9_Manuel_Albares' },
  { id: 'gov-min-defensa', nombre: 'Margarita Robles', cargo: 'Ministra de Defensa', partido: 'PSOE', wikipedia: 'https://es.wikipedia.org/wiki/Margarita_Robles' },
  { id: 'gov-min-interior', nombre: 'Fernando Grande-Marlaska', cargo: 'Ministro del Interior', partido: 'PSOE', wikipedia: 'https://es.wikipedia.org/wiki/Fernando_Grande-Marlaska' },
  { id: 'gov-min-transportes', nombre: 'Óscar Puente', cargo: 'Ministro de Transportes y Movilidad Sostenible', partido: 'PSOE', twitter: 'oscar_puente_', wikipedia: 'https://es.wikipedia.org/wiki/%C3%93scar_Puente' },
  { id: 'gov-min-educacion', nombre: 'Pilar Alegría', cargo: 'Ministra de Educación, FP y Deportes · Portavoz', partido: 'PSOE', twitter: 'Pilar_Alegria', wikipedia: 'https://es.wikipedia.org/wiki/Pilar_Alegr%C3%ADa' },
  { id: 'gov-min-cultura', nombre: 'Ernest Urtasun', cargo: 'Ministro de Cultura', partido: 'Sumar', twitter: 'ernesturtasun', wikipedia: 'https://es.wikipedia.org/wiki/Ernest_Urtasun' },
  { id: 'gov-min-vivienda', nombre: 'Isabel Rodríguez', cargo: 'Ministra de Vivienda y Agenda Urbana', partido: 'PSOE', twitter: 'isabelrguez', wikipedia: 'https://es.wikipedia.org/wiki/Isabel_Rodr%C3%ADguez_Garc%C3%ADa' },
  { id: 'gov-min-agricultura', nombre: 'Luis Planas', cargo: 'Ministro de Agricultura, Pesca y Alimentación', partido: 'PSOE', wikipedia: 'https://es.wikipedia.org/wiki/Luis_Planas' },
  { id: 'gov-min-industria', nombre: 'Jordi Hereu', cargo: 'Ministro de Industria y Turismo', partido: 'PSOE', wikipedia: 'https://es.wikipedia.org/wiki/Jordi_Hereu' },
  { id: 'gov-min-funcion-publica', nombre: 'Óscar López', cargo: 'Ministro de Transformación Digital y Función Pública', partido: 'PSOE', twitter: 'oscar_lopez_aguila', wikipedia: 'https://es.wikipedia.org/wiki/%C3%93scar_L%C3%B3pez_%C3%81guila' },
  { id: 'gov-min-ciencia', nombre: 'Diana Morant', cargo: 'Ministra de Ciencia, Innovación y Universidades', partido: 'PSOE', twitter: 'dianamorant', wikipedia: 'https://es.wikipedia.org/wiki/Diana_Morant' },
  { id: 'gov-min-territorial', nombre: 'Ángel Víctor Torres', cargo: 'Ministro de Política Territorial y Memoria Democrática', partido: 'PSOE', wikipedia: 'https://es.wikipedia.org/wiki/%C3%81ngel_V%C3%ADctor_Torres' },
  { id: 'gov-min-sanidad', nombre: 'Mónica García', cargo: 'Ministra de Sanidad', partido: 'Sumar', twitter: 'Monica_Garcia_G', wikipedia: 'https://es.wikipedia.org/wiki/M%C3%B3nica_Garc%C3%ADa_G%C3%B3mez' },
  { id: 'gov-min-derechos-sociales', nombre: 'Pablo Bustinduy', cargo: 'Ministro de Derechos Sociales, Consumo y Agenda 2030', partido: 'Sumar', twitter: 'PabloBustinduy', wikipedia: 'https://es.wikipedia.org/wiki/Pablo_Bustinduy' },
  { id: 'gov-min-juventud', nombre: 'Sira Rego', cargo: 'Ministra de Juventud e Infancia', partido: 'Sumar', twitter: 'sirarego', wikipedia: 'https://es.wikipedia.org/wiki/Sira_Rego' },
  { id: 'gov-min-igualdad', nombre: 'Ana Redondo', cargo: 'Ministra de Igualdad', partido: 'PSOE', wikipedia: 'https://es.wikipedia.org/wiki/Ana_Redondo_Garc%C3%ADa' },
  { id: 'gov-min-inclusion', nombre: 'Elma Saiz', cargo: 'Ministra de Inclusión, Seguridad Social y Migraciones', partido: 'PSOE', twitter: 'ElmaSaiz', wikipedia: 'https://es.wikipedia.org/wiki/Elma_Saiz' },
]

export interface ApoyoParlamentario {
  partido: string
  siglas: string
  color: string
  /** Escaños en el Congreso */
  escanos: number
  /** Rol respecto al Gobierno */
  rol: 'gobierno' | 'investidura' | 'situacional' | 'oposicion'
  /** Riesgo de pérdida del apoyo */
  riesgo: 'bajo' | 'medio' | 'alto'
  /** Observación de la última negociación */
  observacion?: string
}

/** Composición del Congreso XV (tras 23J 2023) + roles vs Gobierno */
export const APOYOS: ApoyoParlamentario[] = [
  { partido: 'Partido Socialista Obrero Español', siglas: 'PSOE', color: '#E1322D', escanos: 121, rol: 'gobierno', riesgo: 'bajo' },
  { partido: 'Sumar', siglas: 'Sumar', color: '#D43F8D', escanos: 27, rol: 'gobierno', riesgo: 'medio', observacion: 'Tensiones con Podemos sobre presencia interna' },
  { partido: 'Esquerra Republicana de Catalunya', siglas: 'ERC', color: '#E8A030', escanos: 7, rol: 'investidura', riesgo: 'medio' },
  { partido: 'Junts per Catalunya', siglas: 'Junts', color: '#1FA89B', escanos: 7, rol: 'investidura', riesgo: 'alto', observacion: 'Llave aritmética · negocia caso por caso' },
  { partido: 'EH Bildu', siglas: 'EH Bildu', color: '#3F7A3A', escanos: 6, rol: 'investidura', riesgo: 'bajo' },
  { partido: 'Partido Nacionalista Vasco', siglas: 'PNV', color: '#7DB94B', escanos: 5, rol: 'investidura', riesgo: 'bajo' },
  { partido: 'Bloque Nacionalista Galego', siglas: 'BNG', color: '#5BB3D9', escanos: 1, rol: 'investidura', riesgo: 'bajo' },
  { partido: 'Coalición Canaria', siglas: 'CC', color: '#F2C43A', escanos: 1, rol: 'situacional', riesgo: 'medio' },
  { partido: 'Partido Popular', siglas: 'PP', color: '#1F4E8C', escanos: 137, rol: 'oposicion', riesgo: 'bajo' },
  { partido: 'VOX', siglas: 'VOX', color: '#5BA02E', escanos: 33, rol: 'oposicion', riesgo: 'bajo' },
  { partido: 'Podemos', siglas: 'Podemos', color: '#6C2C5E', escanos: 4, rol: 'oposicion', riesgo: 'bajo', observacion: 'Salidos del grupo Sumar' },
  { partido: 'Unión del Pueblo Navarro', siglas: 'UPN', color: '#0E7D8C', escanos: 1, rol: 'oposicion', riesgo: 'bajo' },
]
