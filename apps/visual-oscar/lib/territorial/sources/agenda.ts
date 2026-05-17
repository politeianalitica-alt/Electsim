/**
 * Agenda · próximas citas electorales y eventos institucionales.
 *
 * Fuentes (gratuitas):
 *   - Cálculo determinístico del calendario electoral español
 *   - Wikipedia 'fiestas' o categorías 'fiestas locales' por municipio
 *   - Pleno municipal: link directo a web del ayuntamiento
 *   - BOE/boletín CCAA: links oficiales
 */

import data from '@/data/elecciones-ccaa.json'

interface DataRecord { ppt?: string; fecha?: string }

export interface EventoAgenda {
  tipo: 'eleccion' | 'pleno' | 'boletín' | 'fiesta' | 'iniciativa' | 'celebración'
  titulo: string
  fecha: string                  // ISO o aproximación
  diasRestantes: number | null
  descripcion: string
  url?: string | null
  importancia: 'alta' | 'media' | 'baja'
}

const HOY = new Date()

function diasHasta(fecha: string): number | null {
  const f = new Date(fecha)
  if (isNaN(f.getTime())) return null
  return Math.ceil((f.getTime() - HOY.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Calendario electoral español:
 * - Generales: cada 4 años desde 23-J 2023 → próxima ~ jul 2027
 * - Autonómicas: depende de cada CCAA (4 años desde la última)
 * - Municipales: cada 4 años · próximas mayo 2027 desde 28-M 2023
 * - Europeas: junio 2024 → próximas junio 2029
 *
 * Datos reales basados en fechas oficiales de convocatorias.
 */
function proximaEleccionGenerales(): EventoAgenda {
  // Generales 23-J 2023. Próxima esperada: jul 2027 (4 años)
  const fecha = '2027-06-30'
  return {
    tipo: 'eleccion',
    titulo: 'Próximas elecciones generales',
    fecha,
    diasRestantes: diasHasta(fecha),
    descripcion: 'Convocatoria estimada al cumplirse los 4 años desde 23-J 2023. La fecha exacta depende de la disolución de las Cortes.',
    importancia: 'alta',
    url: 'https://infoelectoral.interior.gob.es/',
  }
}

function proximaEleccionMunicipales(): EventoAgenda {
  // Municipales 28-M 2023. Próxima: 4 años después
  const fecha = '2027-05-23'
  return {
    tipo: 'eleccion',
    titulo: 'Próximas elecciones municipales',
    fecha,
    diasRestantes: diasHasta(fecha),
    descripcion: 'Cuatro años desde el 28-M 2023 (renovación íntegra de ayuntamientos).',
    importancia: 'alta',
    url: 'https://infoelectoral.interior.gob.es/',
  }
}

function proximaEleccionEuropeas(): EventoAgenda {
  // Europeas 9-J 2024. Próxima: 9 jun 2029
  const fecha = '2029-06-09'
  return {
    tipo: 'eleccion',
    titulo: 'Próximas elecciones europeas',
    fecha,
    diasRestantes: diasHasta(fecha),
    descripcion: 'Renovación quinquenal del Parlamento Europeo.',
    importancia: 'media',
    url: 'https://europarl.europa.eu/',
  }
}

function proximaAutonomica(slug: string): EventoAgenda | null {
  const d = data as { autonomicas_ultima: Record<string, DataRecord> }
  const ult = d.autonomicas_ultima[slug]
  if (!ult?.fecha) return null
  // Sumar 4 años a la última fecha
  const ultDate = new Date(ult.fecha)
  if (isNaN(ultDate.getTime())) return null
  const prox = new Date(ultDate)
  prox.setFullYear(prox.getFullYear() + 4)
  const fechaIso = prox.toISOString().slice(0, 10)
  // Si la próxima ya está en pasado, retornar null (ya celebrada)
  if (prox.getTime() < HOY.getTime() - 30 * 86400000) return null
  return {
    tipo: 'eleccion',
    titulo: `Próximas elecciones autonómicas`,
    fecha: fechaIso,
    diasRestantes: diasHasta(fechaIso),
    descripcion: `Cuatro años desde ${ult.fecha} (renovación del parlamento autonómico).`,
    importancia: 'alta',
    url: 'https://www.juntaelectoralcentral.es/',
  }
}

/**
 * Agenda de CCAA: cita electoral autonómica + general + europea + enlaces a boletín oficial.
 */
export function getAgendaCCAA(slug: string, boletinUrl?: string, parlamentoUrl?: string): EventoAgenda[] {
  const eventos: EventoAgenda[] = []
  const aut = proximaAutonomica(slug)
  if (aut) eventos.push(aut)
  eventos.push(proximaEleccionGenerales())
  eventos.push(proximaEleccionEuropeas())

  if (boletinUrl) eventos.push({
    tipo: 'boletín',
    titulo: 'Boletín Oficial de la Comunidad',
    fecha: '',
    diasRestantes: null,
    descripcion: 'Publicación diaria de normas, anuncios y resoluciones.',
    importancia: 'media',
    url: boletinUrl,
  })
  if (parlamentoUrl) eventos.push({
    tipo: 'pleno',
    titulo: 'Parlamento autonómico',
    fecha: '',
    diasRestantes: null,
    descripcion: 'Calendario de plenos, comisiones y consulta de iniciativas.',
    importancia: 'alta',
    url: parlamentoUrl,
  })

  return eventos.sort((a, b) => {
    const da = a.diasRestantes ?? 9999
    const db = b.diasRestantes ?? 9999
    return da - db
  })
}

/**
 * Agenda de municipio: cita electoral municipal + general + ayuntamiento + BOE.
 */
export function getAgendaMunicipio(webAyuntamiento?: string): EventoAgenda[] {
  const eventos: EventoAgenda[] = [
    proximaEleccionMunicipales(),
    proximaEleccionGenerales(),
    proximaEleccionEuropeas(),
  ]

  if (webAyuntamiento) eventos.push({
    tipo: 'pleno',
    titulo: 'Pleno municipal y calendario',
    fecha: '',
    diasRestantes: null,
    descripcion: 'Consultar acta de plenos, sesiones extraordinarias y eventos del ayuntamiento.',
    importancia: 'alta',
    url: webAyuntamiento,
  })
  eventos.push({
    tipo: 'boletín',
    titulo: 'Boletín Oficial del Estado (BOE)',
    fecha: '',
    diasRestantes: null,
    descripcion: 'Disposiciones generales que afectan a todos los municipios.',
    importancia: 'media',
    url: 'https://www.boe.es/',
  })

  return eventos.sort((a, b) => {
    const da = a.diasRestantes ?? 9999
    const db = b.diasRestantes ?? 9999
    return da - db
  })
}
