/**
 * GET /api/sectores/defensa/normas?tipo=&ambito=&q=
 * Base de datos curada de normativa de defensa y control de exportaciones.
 * Incluye ITAR, EAR, reglamentos EU, directivas OTAN y legislación española.
 */
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export type NormaEstado = 'vigente' | 'en_revision' | 'derogada' | 'en_tramitacion' | 'pendiente_transposicion'
export type NormaAmbito = 'ITAR' | 'EAR' | 'EU' | 'OTAN' | 'ESP' | 'ONU'
export type NormaTipo = 'reglamento' | 'directiva' | 'decreto' | 'ley' | 'politica' | 'acuerdo'

interface Norma {
  id: string
  nombre: string
  nombre_corto: string
  ambito: NormaAmbito
  tipo: NormaTipo
  estado: NormaEstado
  descripcion: string
  fecha_publicacion: string
  fecha_ultima_modificacion: string
  fecha_implementacion_esp?: string
  impacto_esp: 'alto' | 'medio' | 'bajo'
  areas_afectadas: string[]
  url_oficial?: string
  novedades_recientes?: string
}

const NORMAS: Norma[] = [
  {
    id: 'itar-22-cfr',
    nombre: 'International Traffic in Arms Regulations',
    nombre_corto: 'ITAR 22 CFR 120-130',
    ambito: 'ITAR', tipo: 'reglamento', estado: 'vigente',
    descripcion: 'Reglamento estadounidense que controla la exportación de artículos y servicios de defensa recogidos en la USML (United States Munitions List). Obligatorio para cualquier empresa que trabaje con tecnología de origen ITAR, incluidas ITP Aero, Airbus DS España e Indra.',
    fecha_publicacion: '1976-01-01',
    fecha_ultima_modificacion: '2024-09-10',
    impacto_esp: 'alto',
    areas_afectadas: ['Propulsión', 'Aviónica', 'Misiles', 'C2', 'Software'],
    url_oficial: 'https://www.ecfr.gov/current/title-22/chapter-I/subchapter-M',
    novedades_recientes: 'Sept 2024: Actualización Part 126 TAA (Technical Assistance Agreements). Mayor rigor en re-exportaciones a terceros países.',
  },
  {
    id: 'ear-15-cfr',
    nombre: 'Export Administration Regulations',
    nombre_corto: 'EAR 15 CFR 730-774',
    ambito: 'EAR', tipo: 'reglamento', estado: 'vigente',
    descripcion: 'Regulación del Dpto. de Comercio de EEUU para bienes de doble uso (CCL - Commerce Control List). Aplica a exportaciones, reexportaciones y transferencias. Crítico para semiconductores, sensores y software de defensa.',
    fecha_publicacion: '1979-01-01',
    fecha_ultima_modificacion: '2025-02-14',
    impacto_esp: 'alto',
    areas_afectadas: ['Semiconductores', 'Sensores', 'Software dual', 'Comunicaciones', 'Cifrado'],
    url_oficial: 'https://www.bis.doc.gov/index.php/regulations/export-administration-regulations-ear',
    novedades_recientes: 'Feb 2025: Nuevas restricciones a chips avanzados para China. Ampliación Entity List con 40 empresas chinas y rusas de defensa.',
  },
  {
    id: 'eu-reg-2021-821',
    nombre: 'Reglamento (UE) 2021/821 de Doble Uso',
    nombre_corto: 'Reg. EU 2021/821',
    ambito: 'EU', tipo: 'reglamento', estado: 'vigente',
    descripcion: 'Establece el régimen de control de exportaciones de la UE para bienes, software y tecnologías de doble uso. Unifica el marco anterior (Reg. 428/2009). Incluye controles reforzados para ciberseguridad y productos de vigilancia.',
    fecha_publicacion: '2021-05-20',
    fecha_ultima_modificacion: '2024-03-15',
    fecha_implementacion_esp: '2021-09-09',
    impacto_esp: 'alto',
    areas_afectadas: ['Bienes doble uso', 'Ciberseguridad', 'Vigilancia', 'Nuclear', 'Químico-biológico'],
    url_oficial: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32021R0821',
    novedades_recientes: 'Mar 2024: Delegated Regulation actualiza Anexo I con nuevas categorías de software de ciberseguridad y drones. Revisión en proceso para 2025.',
  },
  {
    id: 'eu-dir-2009-43',
    nombre: 'Directiva 2009/43/CE Transferencias Intra-UE',
    nombre_corto: 'Dir. 2009/43/CE',
    ambito: 'EU', tipo: 'directiva', estado: 'vigente',
    descripcion: 'Simplifica las condiciones de transferencia de productos relacionados con la defensa dentro de la UE mediante un sistema de licencias general, global e individual. Base del mercado único de defensa europeo.',
    fecha_publicacion: '2009-07-06',
    fecha_ultima_modificacion: '2023-11-20',
    fecha_implementacion_esp: '2011-07-01',
    impacto_esp: 'medio',
    areas_afectadas: ['Transferencias intra-UE', 'Licencias', 'Armamento'],
    url_oficial: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32009L0043',
    novedades_recientes: 'Nov 2023: Revisión intermedia. Propuesta de simplificación adicional para FCAS y Eurodrone.',
  },
  {
    id: 'eu-edip-2025',
    nombre: 'European Defence Industry Programme',
    nombre_corto: 'EDIP 2025',
    ambito: 'EU', tipo: 'reglamento', estado: 'en_tramitacion',
    descripcion: 'Instrumento de la CE para impulsar la producción conjunta de material de defensa. Sucesor del EDIRPA. Financiación de 1.500M€ para 2025-2027. Requisitos de contenido europeo mínimo del 65%.',
    fecha_publicacion: '2024-07-01',
    fecha_ultima_modificacion: '2025-03-20',
    fecha_implementacion_esp: '2025-07-01',
    impacto_esp: 'alto',
    areas_afectadas: ['Producción conjunta', 'Financiación industrial', 'PERTE Defensa', 'FCAS', 'F-110'],
    url_oficial: 'https://defence-industry-space.ec.europa.eu/eu-defence-industry/edip_en',
    novedades_recientes: 'Mar 2025: Acuerdo provisional PE-Consejo. Primera convocatoria prevista Q3 2025. España elegible para Navantia, Indra, Airbus DS.',
  },
  {
    id: 'ley-53-2007',
    nombre: 'Ley 53/2007 de Control de Comercio Exterior de Material de Defensa',
    nombre_corto: 'Ley 53/2007 ESP',
    ambito: 'ESP', tipo: 'ley', estado: 'en_revision',
    descripcion: 'Ley española que regula la exportación e importación de material de defensa y doble uso. JIMDDU (Junta Interministerial) como órgano de control. Modificada parcialmente en 2021 para alinear con Reg. EU 2021/821.',
    fecha_publicacion: '2007-12-29',
    fecha_ultima_modificacion: '2021-09-10',
    impacto_esp: 'alto',
    areas_afectadas: ['Exportación material defensa', 'Licencias nacionales', 'JIMDDU', 'Sanciones penales'],
    url_oficial: 'https://www.boe.es/buscar/act.php?id=BOE-A-2007-22390',
    novedades_recientes: 'En revisión para actualizar a Reg. 2021/821 y alinear con EDIP. Borrador previsto para 2026.',
  },
  {
    id: 'nato-aqap',
    nombre: 'NATO AQAP Allied Quality Assurance Publications',
    nombre_corto: 'NATO AQAP 2110/2120/2310',
    ambito: 'OTAN', tipo: 'politica', estado: 'vigente',
    descripcion: 'Marco de aseguramiento de calidad OTAN para adquisición de sistemas de defensa. AQAP-2110 (software), AQAP-2120 (hardware), AQAP-2310 (software). Requisito en contratos OCCAR, NETMA y DGAM.',
    fecha_publicacion: '2016-06-01',
    fecha_ultima_modificacion: '2023-04-15',
    impacto_esp: 'medio',
    areas_afectadas: ['Calidad contratos', 'OCCAR', 'Certificación software', 'Gestión configuración'],
    url_oficial: 'https://www.nato.int/cps/en/natohq/topics_160817.htm',
  },
  {
    id: 'eu-sanctions-ukraine',
    nombre: 'Paquetes de Sanciones EU contra Rusia · Ucrania',
    nombre_corto: 'EU Sanciones Rusia (14 paquetes)',
    ambito: 'EU', tipo: 'reglamento', estado: 'vigente',
    descripcion: 'Conjunto de 14 paquetes de sanciones de la UE desde febrero 2022. Incluyen restricciones a exportación de bienes de doble uso, tecnología, componentes electrónicos y software a Rusia. Impacto directo en exportadores españoles.',
    fecha_publicacion: '2022-02-25',
    fecha_ultima_modificacion: '2024-12-20',
    impacto_esp: 'alto',
    areas_afectadas: ['Doble uso', 'Electrónica', 'Software', 'Sector aeronáutico', 'Energía'],
    url_oficial: 'https://www.consilium.europa.eu/en/policies/sanctions/russia/',
    novedades_recientes: 'Dic 2024: Paquete 14. Nuevas restricciones a exportadores en terceros países (Turquía, UAE) que re-exportan bienes UE a Rusia. Anti-circumvention measures.',
  },
  {
    id: 'ofac-sdn-russia',
    nombre: 'OFAC Specially Designated Nationals · Russia / Defense',
    nombre_corto: 'OFAC SDN Russia',
    ambito: 'ITAR', tipo: 'politica', estado: 'vigente',
    descripcion: 'Lista OFAC de entidades y personas designadas de Rusia sector defensa. Cualquier empresa española con actividad USD o en EEUU debe cumplir estas restricciones o arriesgarse a sanciones secundarias (CAATSA).',
    fecha_publicacion: '2014-03-17',
    fecha_ultima_modificacion: '2025-01-15',
    impacto_esp: 'alto',
    areas_afectadas: ['Cumplimiento USD', 'Pagos internacionales', 'CAATSA', 'Banco corresponsal'],
    url_oficial: 'https://ofac.treasury.gov/sanctions-programs-and-country-information/russia-related-sanctions',
    novedades_recientes: 'Ene 2025: 200+ nuevas adiciones. Rostec filiales adicionales y empresas intermediarias en UAE, India y China.',
  },
  {
    id: 'nato-cwix',
    nombre: 'NATO STANAG Interoperabilidad C4ISR',
    nombre_corto: 'STANAG C4ISR / APP-6',
    ambito: 'OTAN', tipo: 'acuerdo', estado: 'vigente',
    descripcion: 'Acuerdos de estandarización OTAN para interoperabilidad de sistemas de mando, control, comunicaciones y sistemas de información. Crítico para FCAS, F-110 y modernización Eurofighter.',
    fecha_publicacion: '2010-01-01',
    fecha_ultima_modificacion: '2024-06-01',
    impacto_esp: 'medio',
    areas_afectadas: ['FCAS', 'F-110', 'C2', 'Comunicaciones seguras', 'NII'],
    url_oficial: 'https://nso.nato.int/nso/stds/Pages/home.aspx',
  },
]

export async function GET(req: NextRequest) {
  const sp    = req.nextUrl.searchParams
  const tipo  = sp.get('tipo')   as NormaTipo | null
  const ambito = sp.get('ambito') as NormaAmbito | null
  const q     = (sp.get('q') || '').toLowerCase().trim()

  let items = NORMAS
  if (tipo)   items = items.filter(n => n.tipo   === tipo)
  if (ambito) items = items.filter(n => n.ambito === ambito)
  if (q) {
    items = items.filter(n =>
      n.nombre.toLowerCase().includes(q) ||
      n.nombre_corto.toLowerCase().includes(q) ||
      n.descripcion.toLowerCase().includes(q) ||
      n.areas_afectadas.some(a => a.toLowerCase().includes(q))
    )
  }

  return NextResponse.json(
    { items, total: items.length, fuente: 'ITAR 22CFR + EAR 15CFR + EU Lex + BOE + NATO NSO' },
    { headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' } },
  )
}
