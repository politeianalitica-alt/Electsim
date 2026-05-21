/**
 * Decoder CPV (Common Procurement Vocabulary) · vocabulario UE oficial.
 * Mapea códigos de 8 dígitos a descripciones legibles.
 *
 * Estructura jerárquica:
 *   - División (2 dígitos)        · 45 = Construcción
 *   - Grupo (3 dígitos)           · 451 = Preparación obras
 *   - Clase (4 dígitos)           · 4511 = Demolición y movimientos tierra
 *   - Categoría (5-8 dígitos)     · 45111100-9 = Demolición de edificios
 *
 * Curado de los códigos más usados en contratación pública española.
 */

// ─── Divisiones (45 categorías nivel 1) ────────────────────
export const CPV_DIVISIONES: Record<string, string> = {
 '03': 'Productos agrícolas, ganaderos, pesca, silvicultura y conexos',
 '09': 'Combustibles, electricidad y otras fuentes de energía',
 '14': 'Productos de la minería, de metales básicos y productos conexos',
 '15': 'Alimentos, bebidas, tabaco y productos conexos',
 '16': 'Maquinaria agrícola',
 '18': 'Ropa, calzado, equipaje y accesorios',
 '19': 'Cuero, tejidos textiles, materiales plásticos y de caucho',
 '22': 'Imprenta y productos relacionados',
 '24': 'Productos químicos',
 '30': 'Equipos informáticos y de oficina, equipos de telecomunicaciones',
 '31': 'Maquinaria, aparatos, equipos y artículos eléctricos',
 '32': 'Equipos de radio, TV, comunicaciones y similares',
 '33': 'Equipos médicos, productos farmacéuticos y de cuidado personal',
 '34': 'Equipos de transporte y productos auxiliares',
 '35': 'Seguridad, defensa, militar y armamento',
 '37': 'Instrumentos musicales, juegos, juguetes y artesanías',
 '38': 'Instrumentos de laboratorio, ópticos y de precisión',
 '39': 'Mobiliario, productos de limpieza y enseres domésticos',
 '41': 'Agua captada y depurada',
 '42': 'Maquinaria industrial',
 '43': 'Maquinaria minería, construcción e ingeniería civil',
 '44': 'Estructuras y materiales de construcción',
 '45': 'Trabajos de construcción',
 '48': 'Paquetes de software y sistemas de información',
 '50': 'Servicios de reparación y mantenimiento',
 '51': 'Servicios de instalación (excepto programas informáticos)',
 '55': 'Servicios de hostelería, restaurante y comercio al por menor',
 '60': 'Servicios de transporte (excepto residuos)',
 '63': 'Servicios de apoyo y auxiliares al transporte; agencias viajes',
 '64': 'Servicios postales y de telecomunicaciones',
 '65': 'Servicios públicos',
 '66': 'Servicios financieros y de seguros',
 '70': 'Servicios inmobiliarios',
 '71': 'Servicios de arquitectura, ingeniería, construcción, urbanismo',
 '72': 'Servicios TI: consultoría, software, internet y apoyo',
 '73': 'Servicios de I+D y consultoría afín',
 '75': 'Servicios de administración pública, defensa y seguridad social',
 '76': 'Servicios industria petróleo y gas',
 '77': 'Servicios agrícolas, forestales, hortícolas, acuicultura y apicultura',
 '79': 'Servicios para empresas: derecho, marketing, consultoría, contratación',
 '80': 'Servicios educativos y de formación',
 '85': 'Servicios de salud y asistencia social',
 '90': 'Servicios de saneamiento, alcantarillado y medio ambiente',
 '92': 'Servicios recreativos, culturales y deportivos',
 '98': 'Otros servicios comunitarios, sociales y personales',
}

// ─── Grupos (3 dígitos) · curado de los más usados ────────
export const CPV_GRUPOS: Record<string, string> = {
 '030': 'Productos agrícolas y hortícolas', '031': 'Cosechas, hierbas, flores',
 '091': 'Combustibles', '092': 'Carbón y similares', '093': 'Petróleo refinado',
 '094': 'Combustibles nucleares', '098': 'Servicios de electricidad',
 '301': 'Maquinaria y equipos de oficina', '302': 'Equipos informáticos',
 '321': 'Equipos de radio, TV', '322': 'Equipos de telecomunicaciones',
 '331': 'Equipos médicos', '332': 'Equipos médicos especializados',
 '336': 'Productos farmacéuticos', '337': 'Productos sanitarios desechables',
 '341': 'Vehículos motor', '342': 'Equipos transporte ferrocarril',
 '343': 'Buques', '344': 'Aeronaves',
 '351': 'Equipos militares · vehículos', '352': 'Armas, municiones, partes',
 '353': 'Productos defensivos personales', '354': 'Material defensa civil',
 '441': 'Materiales construcción y artículos auxiliares',
 '442': 'Materiales y artículos estructurales',
 '443': 'Cables, alambres, productos relacionados',
 '450': 'Trabajos de construcción · obras completas',
 '451': 'Preparación obras · demolición y movimientos tierra',
 '452': 'Edificios · obras de ingeniería civil',
 '453': 'Obras de instalación de edificios',
 '454': 'Acabado edificios · trabajos de carpintería',
 '480': 'Paquetes software · sistemas información',
 '481': 'Software industria específica', '482': 'Software ofimática',
 '500': 'Servicios reparación y mantenimiento',
 '501': 'Reparación vehículos motor', '502': 'Reparación buques y aeronaves',
 '550': 'Servicios hosteleros · hoteles', '553': 'Servicios restaurante',
 '600': 'Servicios transporte por carretera',
 '601': 'Servicios transporte ferroviario',
 '603': 'Servicios transporte aéreo',
 '604': 'Servicios transporte por agua',
 '710': 'Servicios arquitectura, ingeniería, supervisión',
 '711': 'Servicios consultoría arquitectura', '712': 'Servicios consultoría ingeniería',
 '713': 'Servicios ingeniería · obras civiles', '714': 'Servicios urbanismo',
 '715': 'Servicios laboratorio'
, '716': 'Servicios profesionales pruebas y análisis',
 '720': 'Servicios consultoría TI', '721': 'Servicios programación',
 '722': 'Servicios desarrollo software', '723': 'Servicios redes TI',
 '724': 'Servicios mantenimiento software', '725': 'Servicios apoyo TI',
 '728': 'Servicios consultoría seguridad TI', '732': 'Servicios I+D ciencias naturales',
 '792': 'Servicios consultoría empresarial',
 '799': 'Servicios diversos para empresas',
 '850': 'Servicios sanitarios · hospitales',
 '851': 'Servicios sanitarios · profesionales',
 '853': 'Servicios sociales y conexos',
 '854': 'Servicios sociales asistenciales',
 '900': 'Servicios saneamiento y eliminación residuos',
 '903': 'Servicios alcantarillado y agua',
 '925': 'Servicios espectáculos · teatro y similares',
}

/**
 * Devuelve descripción humana de un código CPV.
 * Acepta cualquier formato: '45111100-9', '45111100', '4511', '451', '45'.
 * Devuelve la descripción más específica disponible.
 */
export function describirCPV(cpv?: string | null): { divlabel: string; grupolabel?: string; div: string; grupo?: string } | null {
  if (!cpv) return null
  const clean = cpv.replace(/[^0-9]/g, '')
  if (clean.length < 2) return null

  const div = clean.slice(0, 2)
  const grupo = clean.slice(0, 3)
  const divlabel = CPV_DIVISIONES[div] || 'Categoría desconocida'
  const grupolabel = CPV_GRUPOS[grupo]

  return {
    div,
    divlabel,
    grupo: grupo.length === 3 ? grupo : undefined,
    grupolabel,
  }
}

/**
 * Etiqueta corta para badges UI.
 * Devuelve "45 · Construcción" o "33 · Equipos médicos" o similar.
 */
export function cpvLabelCorto(cpv?: string | null): string {
  const info = describirCPV(cpv)
  if (!info) return cpv || ''
  return `${info.div} · ${info.divlabel.split(',')[0].split(' y ')[0].slice(0, 30)}`
}
