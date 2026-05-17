/**
 * GET /api/sectores/defensa/programas?pais=ESP&estado=activo
 * Base de datos curáda de grandes programas de adquisición de defensa.
 * Datos estáticos enriquecidos con fuentes públicas (OCCAR, DGAM, Airbus, Navantia).
 */
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export type FaseEstado = 'completada' | 'en_curso' | 'planificada' | 'retrasada' | 'cancelada'
export type ProgramaEstado = 'activo' | 'retrasado' | 'en_riesgo' | 'completado' | 'cancelado'

export interface Fase {
  id: string
  nombre: string
  inicio: number  // año
  fin: number
  estado: FaseEstado
  descripcion?: string
  coste_M?: number
}

export interface Hito {
  id: string
  nombre: string
  fecha: string   // YYYY-MM o YYYY
  estado: 'alcanzado' | 'pendiente' | 'retrasado'
  descripcion?: string
}

export interface Empresa {
  nombre: string
  pais: string
  rol: 'prime' | 'tier1' | 'tier2' | 'tier3'
  participacion_pct?: number
  segmento: string
}

export interface Programa {
  id: string
  nombre: string
  nombre_corto: string
  descripcion: string
  estado: ProgramaEstado
  tipo: 'aeronautico' | 'naval' | 'terrestre' | 'misiles' | 'espacial' | 'ciber' | 'industrial'
  paises: string[]
  inicio: number
  fin_previsto: number
  coste_total_M?: number
  coste_espana_M?: number
  fase_actual: string
  progreso_pct: number
  fases: Fase[]
  hitos: Hito[]
  empresas: Empresa[]
  fuente_url?: string
  organismo_gestor?: string
  bandera_emoji: string
}

const PROGRAMAS: Programa[] = [
  {
    id: 'fcas',
    nombre: 'Future Combat Air System',
    nombre_corto: 'FCAS / NGWS',
    descripcion: 'Sistema de combate aéreo de sexta generación. España, Francia y Alemania. Avión de combate (NGWS) + Remote Carriers + Sistema de Sistemas en Red.',
    estado: 'en_riesgo',
    tipo: 'aeronautico',
    paises: ['ESP', 'FRA', 'DEU'],
    inicio: 2017,
    fin_previsto: 2040,
    coste_total_M: 100_000,
    coste_espana_M: 33_000,
    fase_actual: 'Fase 1B - Demostrador',
    progreso_pct: 22,
    fases: [
      { id: 'f0', nombre: 'Definición conceptual',  inicio: 2017, fin: 2019, estado: 'completada', coste_M: 600 },
      { id: 'f1a', nombre: 'Fase 1A - Estudios',    inicio: 2019, fin: 2021, estado: 'completada', coste_M: 1_600 },
      { id: 'f1b', nombre: 'Fase 1B - Demostrador', inicio: 2021, fin: 2027, estado: 'en_curso',   coste_M: 3_500 },
      { id: 'f2', nombre: 'Fase 2 - Desarrollo',    inicio: 2027, fin: 2033, estado: 'planificada', coste_M: 20_000 },
      { id: 'f3', nombre: 'Fase 3 - Producción',    inicio: 2033, fin: 2040, estado: 'planificada', coste_M: 75_000 },
    ],
    hitos: [
      { id: 'h1', nombre: 'Acuerdo trinacional firmado',      fecha: '2019-02', estado: 'alcanzado' },
      { id: 'h2', nombre: 'Inicio Fase 1B',                   fecha: '2021-05', estado: 'alcanzado' },
      { id: 'h3', nombre: 'Primer vuelo demostrador NGWS',    fecha: '2027-06', estado: 'pendiente', descripcion: 'Fecha objetivo. Riesgo de retraso 12-18 meses por bloqueo industrial.' },
      { id: 'h4', nombre: 'Decisión de lanzamiento Fase 2',  fecha: '2026-12', estado: 'pendiente' },
      { id: 'h5', nombre: 'Entrada en servicio inicial',      fecha: '2040-01', estado: 'pendiente' },
    ],
    empresas: [
      { nombre: 'Airbus Defence & Space',   pais: 'ESP/DEU/FRA', rol: 'prime', participacion_pct: 33, segmento: 'Sistema integrado / aviónica' },
      { nombre: 'Dassault Aviation',         pais: 'FRA',         rol: 'prime', participacion_pct: 33, segmento: 'NGWS airframe / vuelo' },
      { nombre: 'Indra',                     pais: 'ESP',         rol: 'tier1', participacion_pct: 8,  segmento: 'Sensores / Misión / Combat Management' },
      { nombre: 'ITP Aero',                  pais: 'ESP',         rol: 'tier1', participacion_pct: 6,  segmento: 'Propulsión / motor' },
      { nombre: 'Safran',                    pais: 'FRA',         rol: 'tier1', participacion_pct: 10, segmento: 'Motor / sistemas' },
      { nombre: 'MTU Aero Engines',          pais: 'DEU',         rol: 'tier1', participacion_pct: 8,  segmento: 'Motor' },
      { nombre: 'MBDA',                      pais: 'FRA/DEU/ESP', rol: 'tier1', participacion_pct: 5,  segmento: 'Armamento / misiles' },
      { nombre: 'GMV',                       pais: 'ESP',         rol: 'tier2', participacion_pct: 2,  segmento: 'Software / ciberseguridad' },
    ],
    organismo_gestor: 'OCCAR / DGAM',
    fuente_url: 'https://www.occar.int/programmes/fcas',
    bandera_emoji: '🇪🇸🇫🇷🇩🇪',
  },
  {
    id: 'eurofighter',
    nombre: 'Eurofighter Typhoon',
    nombre_corto: 'Eurofighter',
    descripcion: 'Caza multirol de cuarta generación. España opera 73 unidades. Upgrades continuos: Fase 3 Enhancements, integración de nuevos misiles y AESA radar.',
    estado: 'activo',
    tipo: 'aeronautico',
    paises: ['ESP', 'GBR', 'DEU', 'ITA'],
    inicio: 1994,
    fin_previsto: 2035,
    coste_total_M: 90_000,
    coste_espana_M: 15_000,
    fase_actual: 'Phase Enhancement 3 / Upgrades',
    progreso_pct: 78,
    fases: [
      { id: 'f1', nombre: 'Desarrollo y producción serie',    inicio: 1994, fin: 2016, estado: 'completada' },
      { id: 'f2', nombre: 'Phase Enhancement 1',             inicio: 2011, fin: 2018, estado: 'completada' },
      { id: 'f3', nombre: 'Phase Enhancement 2',             inicio: 2016, fin: 2022, estado: 'completada' },
      { id: 'f4', nombre: 'Phase Enhancement 3 (E-Scan)',    inicio: 2022, fin: 2028, estado: 'en_curso',  coste_M: 2_800 },
      { id: 'f5', nombre: 'Vida extendida / MLU',            inicio: 2028, fin: 2035, estado: 'planificada' },
    ],
    hitos: [
      { id: 'h1', nombre: 'Primera entrega a EdA España',    fecha: '2003-06', estado: 'alcanzado' },
      { id: 'h2', nombre: 'IOC Radar AESA (E-Scan)',         fecha: '2025-12', estado: 'alcanzado' },
      { id: 'h3', nombre: 'Integración Meteor BVRAAM',       fecha: '2026-06', estado: 'pendiente' },
      { id: 'h4', nombre: 'Mid-Life Update decisión',        fecha: '2028-01', estado: 'pendiente' },
    ],
    empresas: [
      { nombre: 'Airbus Defence & Space',  pais: 'ESP/DEU', rol: 'prime', participacion_pct: 43, segmento: 'Fuselaje / integración' },
      { nombre: 'BAE Systems',             pais: 'GBR',     rol: 'prime', participacion_pct: 33, segmento: 'Fuselaje delantera / aviónica' },
      { nombre: 'Leonardo',                pais: 'ITA',     rol: 'prime', participacion_pct: 21, segmento: 'Ala delta / sistemas' },
      { nombre: 'Indra',                   pais: 'ESP',     rol: 'tier1', participacion_pct: 5,  segmento: 'Radar AESA / Mission Systems' },
      { nombre: 'ITP Aero',                pais: 'ESP',     rol: 'tier1', participacion_pct: 14, segmento: 'Motor EJ200 MRO' },
    ],
    organismo_gestor: 'NETMA / DGAM',
    fuente_url: 'https://www.eurofighter.com',
    bandera_emoji: '🇪🇸🇬🇧🇩🇪🇮🇹',
  },
  {
    id: 's80',
    nombre: 'Submarino S-80 Plus',
    nombre_corto: 'S-80 Plus',
    descripcion: 'Submarino diésel-eléctrico con AIP de hidrógeno. Cuatro unidades para la Armada española. Programa gestionado por Navantia en Cartagena.',
    estado: 'activo',
    tipo: 'naval',
    paises: ['ESP'],
    inicio: 2004,
    fin_previsto: 2031,
    coste_total_M: 3_200,
    coste_espana_M: 3_200,
    fase_actual: 'Construcción S-81 Isaac Peral — Pruebas de mar',
    progreso_pct: 60,
    fases: [
      { id: 'f1', nombre: 'Diseño y contrato',         inicio: 2004, fin: 2009, estado: 'completada', coste_M: 320 },
      { id: 'f2', nombre: 'Construcción S-81',         inicio: 2009, fin: 2023, estado: 'completada', coste_M: 1_100 },
      { id: 'f3', nombre: 'S-81 Pruebas de mar',       inicio: 2023, fin: 2026, estado: 'en_curso',   coste_M: 180 },
      { id: 'f4', nombre: 'Entrega S-81 + S-82/83/84', inicio: 2026, fin: 2031, estado: 'planificada', coste_M: 1_600 },
    ],
    hitos: [
      { id: 'h1', nombre: 'Botadura S-81 Isaac Peral',       fecha: '2021-04', estado: 'alcanzado' },
      { id: 'h2', nombre: 'Inmersión inicial de pruebas',    fecha: '2023-09', estado: 'alcanzado' },
      { id: 'h3', nombre: 'Pruebas AIP hidrógeno',           fecha: '2025-06', estado: 'alcanzado' },
      { id: 'h4', nombre: 'Entrega definitiva S-81',         fecha: '2026-12', estado: 'pendiente' },
      { id: 'h5', nombre: 'Botadura S-82',                   fecha: '2027-06', estado: 'pendiente' },
    ],
    empresas: [
      { nombre: 'Navantia',       pais: 'ESP', rol: 'prime', participacion_pct: 65, segmento: 'Diseño / construcción / integración' },
      { nombre: 'Indra',          pais: 'ESP', rol: 'tier1', participacion_pct: 12, segmento: 'Sistema de combate / sensores' },
      { nombre: 'General Dynamics Electric Boat', pais: 'USA', rol: 'tier1', participacion_pct: 8, segmento: 'Rediseño casco / peso' },
      { nombre: 'ITP Aero',       pais: 'ESP', rol: 'tier2', participacion_pct: 4,  segmento: 'AIP / planta propulsión' },
      { nombre: 'Sener',          pais: 'ESP', rol: 'tier2', participacion_pct: 4,  segmento: 'Ingeniería / hidráulica' },
    ],
    organismo_gestor: 'DGAM / Armada',
    fuente_url: 'https://www.navantia.es/s-80',
    bandera_emoji: '🇪🇸',
  },
  {
    id: 'f110',
    nombre: 'Fragata F-110',
    nombre_corto: 'F-110',
    descripcion: 'Fragata de quinta generación para sustituir las fragatas F-80 Santa María. 5 unidades previstas. Mayor programa naval español desde las F-100.',
    estado: 'activo',
    tipo: 'naval',
    paises: ['ESP'],
    inicio: 2019,
    fin_previsto: 2035,
    coste_total_M: 4_300,
    coste_espana_M: 4_300,
    fase_actual: 'Diseño detallado / Corte de acero F-111',
    progreso_pct: 18,
    fases: [
      { id: 'f1', nombre: 'Diseño conceptual y contrato',    inicio: 2019, fin: 2022, estado: 'completada', coste_M: 400 },
      { id: 'f2', nombre: 'Diseño detallado',                inicio: 2022, fin: 2025, estado: 'en_curso',   coste_M: 650 },
      { id: 'f3', nombre: 'Construcción F-111 a F-115',      inicio: 2025, fin: 2033, estado: 'planificada', coste_M: 3_250 },
      { id: 'f4', nombre: 'Pruebas y entrega flotilla',      inicio: 2032, fin: 2035, estado: 'planificada' },
    ],
    hitos: [
      { id: 'h1', nombre: 'Contrato firmado con Navantia',   fecha: '2019-10', estado: 'alcanzado' },
      { id: 'h2', nombre: 'Cierre diseño conceptual',        fecha: '2022-06', estado: 'alcanzado' },
      { id: 'h3', nombre: 'Corte de acero primera fragata',  fecha: '2025-11', estado: 'pendiente' },
      { id: 'h4', nombre: 'Botadura F-111',                  fecha: '2029-06', estado: 'pendiente' },
      { id: 'h5', nombre: 'Entrega F-111 Armada',            fecha: '2032-01', estado: 'pendiente' },
    ],
    empresas: [
      { nombre: 'Navantia',   pais: 'ESP', rol: 'prime', participacion_pct: 60, segmento: 'Diseño / construcción' },
      { nombre: 'Indra',      pais: 'ESP', rol: 'tier1', participacion_pct: 18, segmento: 'SCOMBA / Combat Mgmt / sensores' },
      { nombre: 'MBDA',       pais: 'FRA', rol: 'tier1', participacion_pct: 8,  segmento: 'Misiles VLS CAMM-ER' },
      { nombre: 'Lockheed Martin', pais: 'USA', rol: 'tier1', participacion_pct: 6, segmento: 'AEGIS / radar SPY-7 (tbd)' },
      { nombre: 'BAE Systems', pais: 'GBR', rol: 'tier2', participacion_pct: 4, segmento: 'C-sword / ACS' },
    ],
    organismo_gestor: 'DGAM / Armada',
    fuente_url: 'https://www.navantia.es/f-110',
    bandera_emoji: '🇪🇸',
  },
  {
    id: 'nh90',
    nombre: 'Helicóptero NH-90',
    nombre_corto: 'NH-90',
    descripcion: 'Helicóptero militar táctico multinacional. España opera 45 unidades TTH. Programa de actualización de aviónica y motores en curso.',
    estado: 'activo',
    tipo: 'aeronautico',
    paises: ['ESP', 'FRA', 'DEU', 'ITA', 'NLD'],
    inicio: 1995,
    fin_previsto: 2030,
    coste_total_M: 8_500,
    coste_espana_M: 1_800,
    fase_actual: 'Entregas finales + MLU aviónica',
    progreso_pct: 85,
    fases: [
      { id: 'f1', nombre: 'Desarrollo',          inicio: 1995, fin: 2007, estado: 'completada' },
      { id: 'f2', nombre: 'Producción serie',     inicio: 2007, fin: 2024, estado: 'completada' },
      { id: 'f3', nombre: 'MLU aviónica',         inicio: 2022, fin: 2028, estado: 'en_curso', coste_M: 600 },
      { id: 'f4', nombre: 'Vida útil extendida',  inicio: 2028, fin: 2030, estado: 'planificada' },
    ],
    hitos: [
      { id: 'h1', nombre: 'Primera entrega España',    fecha: '2011-06', estado: 'alcanzado' },
      { id: 'h2', nombre: 'IOC flota TTH completa',    fecha: '2022-12', estado: 'alcanzado' },
      { id: 'h3', nombre: 'MLU aviónica inicio',       fecha: '2023-03', estado: 'alcanzado' },
      { id: 'h4', nombre: 'Primera unidad MLU lista',  fecha: '2026-06', estado: 'pendiente' },
    ],
    empresas: [
      { nombre: 'NHIndustries (Leonardo/Airbus/Fokker)', pais: 'ITA/DEU/NLD', rol: 'prime', participacion_pct: 80, segmento: 'Design authority / integración' },
      { nombre: 'Airbus Helicopters España',             pais: 'ESP', rol: 'tier1', participacion_pct: 12, segmento: 'Ensamblaje final / MRO España' },
      { nombre: 'Indra',                                 pais: 'ESP', rol: 'tier2', participacion_pct: 4,  segmento: 'Aviónica MLU' },
    ],
    organismo_gestor: 'NAHEMA / DGAM',
    bandera_emoji: '🇪🇸🇫🇷🇩🇪🇮🇹',
  },
  {
    id: 'a400m',
    nombre: 'Airbus A400M Atlas',
    nombre_corto: 'A400M',
    descripcion: 'Avión de transporte estratégico-táctico. España opera 27 unidades. Fase de madurez operacional con mejoras continuas de motor TP400 y sistemas de autoprotección.',
    estado: 'activo',
    tipo: 'aeronautico',
    paises: ['ESP', 'FRA', 'DEU', 'GBR', 'BEL', 'LUX', 'TUR'],
    inicio: 2003,
    fin_previsto: 2030,
    coste_total_M: 22_000,
    coste_espana_M: 4_200,
    fase_actual: 'Operacional · SOC + mejoras incrementales',
    progreso_pct: 90,
    fases: [
      { id: 'f1', nombre: 'Desarrollo',                  inicio: 2003, fin: 2013, estado: 'completada' },
      { id: 'f2', nombre: 'Producción y entregas',       inicio: 2013, fin: 2023, estado: 'completada' },
      { id: 'f3', nombre: 'SOC / mejoras plataforma',    inicio: 2020, fin: 2026, estado: 'en_curso', coste_M: 1_200 },
      { id: 'f4', nombre: 'Vida extendida 2030',         inicio: 2026, fin: 2030, estado: 'planificada' },
    ],
    hitos: [
      { id: 'h1', nombre: 'Primera entrega EdA España', fecha: '2014-11', estado: 'alcanzado' },
      { id: 'h2', nombre: 'SOC alcanzada flota España', fecha: '2022-06', estado: 'alcanzado' },
      { id: 'h3', nombre: 'Mejora aerial delivery',     fecha: '2026-01', estado: 'pendiente' },
    ],
    empresas: [
      { nombre: 'Airbus Defence & Space', pais: 'ESP/DEU/FRA/GBR', rol: 'prime', participacion_pct: 100, segmento: 'Design authority / producción' },
      { nombre: 'ITP Aero',               pais: 'ESP', rol: 'tier1', participacion_pct: 13, segmento: 'Motor TP400 – módulos LPT' },
      { nombre: 'SENER',                  pais: 'ESP', rol: 'tier2', participacion_pct: 3,  segmento: 'Sistemas mecánicos' },
    ],
    organismo_gestor: 'OCCAR / DGAM',
    fuente_url: 'https://www.airbus.com/en/products-services/defence/military-aircraft/a400m',
    bandera_emoji: '🇪🇸🇫🇷🇩🇪🇬🇧',
  },
  {
    id: 'perte-defensa',
    nombre: 'PERTE de Defensa',
    nombre_corto: 'PERTE Defensa',
    descripcion: 'Proyecto Estratégico para la Recuperación y Transformación Económica del sector defensa. Dotación estimada de 10.000M€ para industrializar y modernizar la base tecnológica española.',
    estado: 'en_riesgo',
    tipo: 'industrial',
    paises: ['ESP'],
    inicio: 2024,
    fin_previsto: 2030,
    coste_total_M: 10_000,
    coste_espana_M: 10_000,
    fase_actual: 'Definición / consulta pública',
    progreso_pct: 8,
    fases: [
      { id: 'f1', nombre: 'Consulta pública y definición', inicio: 2024, fin: 2025, estado: 'en_curso', coste_M: 0 },
      { id: 'f2', nombre: 'Aprobación Consejo de Ministros', inicio: 2025, fin: 2026, estado: 'planificada' },
      { id: 'f3', nombre: 'Convocatoria de proyectos',       inicio: 2026, fin: 2027, estado: 'planificada', coste_M: 2_000 },
      { id: 'f4', nombre: 'Ejecución industrial',           inicio: 2027, fin: 2030, estado: 'planificada', coste_M: 8_000 },
    ],
    hitos: [
      { id: 'h1', nombre: 'Anuncio MINISDEF',              fecha: '2024-06', estado: 'alcanzado' },
      { id: 'h2', nombre: 'Consulta pública abierta',      fecha: '2024-10', estado: 'alcanzado' },
      { id: 'h3', nombre: 'Aprobación en Consejo Ministros', fecha: '2026-03', estado: 'pendiente' },
      { id: 'h4', nombre: 'Primera convocatoria abierta',  fecha: '2026-09', estado: 'pendiente' },
    ],
    empresas: [
      { nombre: 'Indra',    pais: 'ESP', rol: 'prime', participacion_pct: 0, segmento: 'C2 / Sensores / Ciber' },
      { nombre: 'Navantia', pais: 'ESP', rol: 'prime', participacion_pct: 0, segmento: 'Naval / propulsión' },
      { nombre: 'Airbus DS España', pais: 'ESP', rol: 'prime', participacion_pct: 0, segmento: 'Aeronáutica / espacio' },
      { nombre: 'GMV',      pais: 'ESP', rol: 'tier1', participacion_pct: 0, segmento: 'Espacio / navegación' },
      { nombre: 'Sener',    pais: 'ESP', rol: 'tier1', participacion_pct: 0, segmento: 'Ingeniería' },
      { nombre: 'ITP Aero', pais: 'ESP', rol: 'tier1', participacion_pct: 0, segmento: 'Propulsión' },
    ],
    organismo_gestor: 'MINISDEF / SDEF',
    bandera_emoji: '🇪🇸',
  },
  {
    id: 'tigre',
    nombre: 'Helicóptero de Ataque Tigre',
    nombre_corto: 'Tigre HAD',
    descripcion: 'Helicóptero de ataque bimotor. España opera 24 unidades HAD. Programa de modernización Tigre MkIII en negociación tras el programa de upgrade Franco-Alemán.',
    estado: 'en_riesgo',
    tipo: 'aeronautico',
    paises: ['ESP', 'FRA', 'DEU', 'AUS'],
    inicio: 1999,
    fin_previsto: 2040,
    coste_total_M: 5_500,
    coste_espana_M: 1_400,
    fase_actual: 'Operacional HAD · MkIII en negociación',
    progreso_pct: 72,
    fases: [
      { id: 'f1', nombre: 'Desarrollo y certificación',   inicio: 1999, fin: 2010, estado: 'completada' },
      { id: 'f2', nombre: 'Producción serie HAD',         inicio: 2010, fin: 2020, estado: 'completada' },
      { id: 'f3', nombre: 'Operacional + upgrades menores', inicio: 2020, fin: 2025, estado: 'completada' },
      { id: 'f4', nombre: 'Tigre MkIII (en negociación)', inicio: 2026, fin: 2035, estado: 'retrasada', coste_M: 2_000 },
    ],
    hitos: [
      { id: 'h1', nombre: 'IOC flota HAD España',          fecha: '2014-04', estado: 'alcanzado' },
      { id: 'h2', nombre: 'Despliegue Mali operacional',   fecha: '2015-06', estado: 'alcanzado' },
      { id: 'h3', nombre: 'Decisión MkIII España',         fecha: '2026-06', estado: 'retrasado', descripcion: 'Retrasado: Alemania se retira del MkIII. España y Francia en negociaciones bilaterales.' },
      { id: 'h4', nombre: 'Inicio upgrade MkIII (si aplica)', fecha: '2027-01', estado: 'pendiente' },
    ],
    empresas: [
      { nombre: 'Airbus Helicopters', pais: 'FRA/DEU', rol: 'prime', participacion_pct: 75, segmento: 'Design authority / producción' },
      { nombre: 'Airbus Helicopters España', pais: 'ESP', rol: 'tier1', participacion_pct: 14, segmento: 'Ensamblaje / MRO España' },
      { nombre: 'Sagem (Safran)',     pais: 'FRA', rol: 'tier1', participacion_pct: 8,  segmento: 'Aviónica / FLIR' },
    ],
    organismo_gestor: 'OCCAR / DGAM',
    bandera_emoji: '🇪🇸🇫🇷🇩🇪',
  },
]

export async function GET(req: NextRequest) {
  const sp     = req.nextUrl.searchParams
  const pais   = sp.get('pais')   // ISO3 filter
  const estado = sp.get('estado') // estado filter
  const tipo   = sp.get('tipo')   // tipo filter

  let items = PROGRAMAS
  if (pais)   items = items.filter(p => p.paises.includes(pais))
  if (estado) items = items.filter(p => p.estado === estado)
  if (tipo)   items = items.filter(p => p.tipo === tipo)

  const resumen = {
    total: items.length,
    por_estado: items.reduce((acc: Record<string,number>, p) => { acc[p.estado] = (acc[p.estado]||0)+1; return acc }, {}),
    coste_total_M: items.reduce((s,p) => s+(p.coste_total_M??0), 0),
    coste_espana_M: items.reduce((s,p) => s+(p.coste_espana_M??0), 0),
  }

  return NextResponse.json(
    { items, resumen },
    { headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400' } },
  )
}
