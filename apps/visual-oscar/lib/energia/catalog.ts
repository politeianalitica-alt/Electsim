/**
 * Catálogos curados del sector Energía v2 · Sprint Energía S1.
 *
 * Datos reales verificables, citados en comentarios junto a cada bloque.
 * Estos catálogos son el "ground truth" estático que complementa los datos
 * en vivo (ESIOS/REE/Ember/ENTSO-E). Se consumen desde las vistas por tipo
 * de energía (Nuclear, Renovables, Hidrógeno, empresas) en sprints S5-S9.
 *
 * Fuentes principales:
 *   - Parque nuclear: Consejo de Seguridad Nuclear (CSN) y Foro Nuclear
 *     (https://www.foronuclear.org · "Centrales nucleares en España").
 *   - Capacidad renovable: REE / Red Eléctrica "Las renovables en el sistema
 *     eléctrico español" + MITECO (potencia instalada peninsular+extrapeninsular).
 *   - PNIEC: Plan Nacional Integrado de Energía y Clima 2023-2030, versión
 *     revisada aprobada por el Consejo de Ministros (sept. 2024) · MITECO.
 *   - Proyectos H2: PERTE de Energías Renovables, Hidrógeno Renovable y
 *     Almacenamiento (PERTE ERHA) · MITECO + anuncios de promotores.
 *   - Empresas: información pública de mercado (tickers BME/NYSE/Euronext/etc.).
 */

import type {
  Reactor,
  RenewableCapacity,
  PniecTarget,
  H2Project,
  H2SubastaEU,
  H2BackboneProject,
  EnergyCompany,
  SubastaRenovable,
  PetroleoDependencia,
  GnlEspana,
} from './types'

// ────────────────────────────────────────────────────────────────────
// PARQUE NUCLEAR ESPAÑOL · 7 reactores operativos
// ────────────────────────────────────────────────────────────────────
// Fuente: Consejo de Seguridad Nuclear (CSN) + Foro Nuclear. Potencias
// eléctricas netas aproximadas (MW) según fichas oficiales; pueden variar
// ±decenas de MW tras renovaciones de licencia. España tiene 5 centrales
// con 7 reactores en operación.
//
// Calendario de cierre: protocolo firmado en 2019 entre Enresa y las
// titulares (Iberdrola, Endesa, Naturgy, EDP) escalona los cierres entre
// 2027 y 2035. Almaraz I/II son los primeros (2027-2028), Trillo el último
// (~2035). Fechas según el calendario vigente publicado por MITECO/Enresa.
//
// Tecnología: todos PWR (agua a presión) salvo Cofrentes, que es BWR
// (agua en ebullición · diseño General Electric).
export const REACTORES_ES: Reactor[] = [
  {
    nombre: 'Almaraz I',
    central: 'Almaraz',
    potencia_mw: 1049,
    ano_conexion: 1983,
    propietarios: ['Iberdrola', 'Endesa', 'Naturgy'],
    tecnologia: 'PWR',
    cierre_previsto: 2027,
    estado: 'operativo',
  },
  {
    nombre: 'Almaraz II',
    central: 'Almaraz',
    potencia_mw: 1044,
    ano_conexion: 1984,
    propietarios: ['Iberdrola', 'Endesa', 'Naturgy'],
    tecnologia: 'PWR',
    cierre_previsto: 2028,
    estado: 'operativo',
  },
  {
    nombre: 'Ascó I',
    central: 'Ascó',
    potencia_mw: 1032,
    ano_conexion: 1983,
    propietarios: ['Endesa'],
    tecnologia: 'PWR',
    cierre_previsto: 2030,
    estado: 'operativo',
  },
  {
    nombre: 'Ascó II',
    central: 'Ascó',
    potencia_mw: 1027,
    ano_conexion: 1985,
    propietarios: ['Endesa', 'Iberdrola'],
    tecnologia: 'PWR',
    cierre_previsto: 2032,
    estado: 'operativo',
  },
  {
    nombre: 'Cofrentes',
    central: 'Cofrentes',
    potencia_mw: 1092,
    ano_conexion: 1984,
    propietarios: ['Iberdrola'],
    tecnologia: 'BWR',
    cierre_previsto: 2030,
    estado: 'operativo',
  },
  {
    nombre: 'Vandellós II',
    central: 'Vandellós',
    potencia_mw: 1087,
    ano_conexion: 1987,
    propietarios: ['Endesa', 'Iberdrola'],
    tecnologia: 'PWR',
    cierre_previsto: 2035,
    estado: 'operativo',
  },
  {
    nombre: 'Trillo',
    central: 'Trillo',
    potencia_mw: 1066,
    ano_conexion: 1988,
    propietarios: ['Iberdrola', 'Naturgy', 'EDP'],
    tecnologia: 'PWR',
    cierre_previsto: 2035,
    estado: 'operativo',
  },
]

// ────────────────────────────────────────────────────────────────────
// PRECIO DEL URANIO · referencia curada (sin dataset en vivo)
// ────────────────────────────────────────────────────────────────────
// No hay dataset de uranio en el catálogo Nasdaq Data Link configurado
// (NASDAQ_CURATED solo cubre OPEP/oro/plata/FRED/BIS/MULTPL). El precio spot
// del U3O8 (yellowcake) lo publica UxC / TradeTech como referencia semanal,
// sin API pública gratuita. Mostramos una referencia curada honesta — NO un
// dato en vivo — claramente marcada como tal, con su fecha y fuente. El campo
// `precio_usd_lb` puede ser null si no se quiere fijar una cifra desactualizada.
//
// Contexto: tras el mínimo de ~18 $/lb (2016-2020), el U3O8 repuntó con fuerza
// en 2023-2024 superando los 100 $/lb (máximo desde 2007) por el renovado
// interés en nuclear (SMR, descarbonización) y restricciones de oferta.
export interface UranioRef {
  /** Referencia de precio spot U3O8 (yellowcake), en USD por libra. Null si no se fija. */
  precio_usd_lb: number | null
  /** Fecha aproximada de la referencia (ISO YYYY-MM o YYYY). */
  fecha_ref: string
  /** Tendencia cualitativa reciente. */
  tendencia: string
  /** Fuente + nota de la referencia. */
  fuente: string
  /** URL pública para citar / ampliar. */
  source_url: string
}

export const URANIO_REF: UranioRef = {
  precio_usd_lb: null,
  fecha_ref: '2024',
  tendencia: 'al alza desde 2021 · máximos plurianuales en 2024 (>100 $/lb spot)',
  fuente:
    'Precio spot U3O8 (yellowcake) · referencia UxC/TradeTech (publicación semanal, sin API pública gratuita). Cifra no fijada para no mostrar dato desactualizado.',
  source_url: 'https://www.uxc.com/',
}

// ────────────────────────────────────────────────────────────────────
// CONTEXTO NUCLEAR GLOBAL · nuevos reactores / SMR (catálogo curado)
// ────────────────────────────────────────────────────────────────────
// Contexto cualitativo para enmarcar el debate del cierre español frente a la
// expansión nuclear mundial. Cifras aproximadas de organismos públicos (IAEA
// PRIS · World Nuclear Association). No son datos en vivo.
export interface NuclearContextNote {
  /** Titular corto del hecho/contexto. */
  titular: string
  /** Detalle (1-2 frases). */
  detalle: string
  /** Fuente del dato. */
  fuente: string
}

export const NUCLEAR_GLOBAL_CONTEXT: NuclearContextNote[] = [
  {
    titular: 'Parque mundial · ~440 reactores operativos',
    detalle:
      'En torno a 440 reactores en operación en ~30 países aportan cerca del 9-10 % de la electricidad mundial (≈25 % de la generación baja en carbono). EE. UU., Francia y China lideran por capacidad.',
    fuente: 'IAEA PRIS · World Nuclear Association (aprox. 2024)',
  },
  {
    titular: 'China lidera la nueva construcción',
    detalle:
      'China concentra la mayor parte de los reactores en construcción del mundo (decenas de unidades), con un programa de expansión sostenido; India y Rusia también construyen activamente.',
    fuente: 'IAEA PRIS · construcción en curso (aprox. 2024)',
  },
  {
    titular: 'SMR · reactores modulares pequeños',
    detalle:
      'Los SMR (Small Modular Reactors, <300 MWe) son la apuesta tecnológica emergente: diseños como NuScale, Rolls-Royce SMR o BWRX-300 buscan menor coste, fabricación en serie y despliegue flexible. Pocos están aún operativos.',
    fuente: 'World Nuclear Association · IAEA (contexto tecnológico)',
  },
  {
    titular: 'España · cierre escalonado a contracorriente',
    detalle:
      'Mientras buena parte del mundo extiende licencias o construye, España mantiene el calendario de cierre 2027-2035 pactado en 2019. El debate sobre una posible revisión sigue abierto.',
    fuente: 'MITECO / Enresa · protocolo 2019',
  },
]

// ────────────────────────────────────────────────────────────────────
// CAPACIDAD RENOVABLE INSTALADA ES · por tecnología
// ────────────────────────────────────────────────────────────────────
// Fuente: REE / Red Eléctrica · potencia instalada del sistema eléctrico
// nacional (peninsular + no peninsular), datos en torno a 2024. Cifras
// redondeadas a GW; la potencia exacta se publica mensualmente y crece de
// forma continua (sobre todo solar FV). Valores en MW.
export const CAPACIDAD_RENOVABLE_ES: RenewableCapacity[] = [
  {
    tecnologia: 'Eólica',
    capacidad_mw: 31000,
    fuente: 'REE · potencia instalada (~2024)',
    ano: 2024,
  },
  {
    tecnologia: 'Solar fotovoltaica',
    capacidad_mw: 28000,
    fuente: 'REE · potencia instalada (~2024)',
    ano: 2024,
  },
  {
    tecnologia: 'Hidráulica',
    capacidad_mw: 17000,
    fuente: 'REE · potencia instalada (~2024)',
    ano: 2024,
  },
  {
    tecnologia: 'Solar térmica (CSP)',
    capacidad_mw: 2300,
    fuente: 'REE / Protermosolar (~2024)',
    ano: 2024,
  },
  {
    tecnologia: 'Biomasa, biogás y residuos renovables',
    capacidad_mw: 600,
    fuente: 'REE · potencia instalada (~2024)',
    ano: 2024,
  },
]

// ────────────────────────────────────────────────────────────────────
// SUBASTAS DE CAPACIDAD RENOVABLE ES · resultados adjudicados
// ────────────────────────────────────────────────────────────────────
// Fuente: MITECO · notas de prensa de los resultados de las subastas del
// Régimen Económico de Energías Renovables (REER, RD 960/2020) celebradas en
// 2021-2022, más las subastas históricas de 2017. El precio es el €/MWh medio
// ponderado adjudicado (puja a la baja); la capacidad, la potencia adjudicada.
//
//   - Subasta enero 2021: primera del nuevo marco · récord histórico de bajos
//     precios (fotovoltaica ~24,5 €/MWh; eólica ~25,3 €/MWh) · 3.034 MW.
//     (MITECO, 26-ene-2021)
//   - Subasta octubre 2021: segunda · ~3.300 MW adjudicados, precio medio
//     ~30,6 €/MWh; fotovoltaica ~30,4 €/MWh. (MITECO, 19-oct-2021)
//   - Subasta octubre 2022: cupos específicos (incl. biomasa, termosolar,
//     fotovoltaica distribuida) · resultado parcialmente desierto; el precio
//     fotovoltaica reservada para autoconsumo se adjudicó ~47,7 €/MWh.
//     (MITECO, 22-nov-2022)
//   - Subasta 2017 (histórica, marco anterior): ~5.000 MW eólica + fotovoltaica
//     a precio cercano al de mercado (sin prima · "subasta a cero").
//     (MINETAD, jul-2017)
export const SUBASTAS_RENOVABLES_ES: SubastaRenovable[] = [
  {
    fecha: '2021-01-26',
    tecnologia: 'Fotovoltaica',
    precio_adjudicado_eur_mwh: 24.47,
    capacidad_mw: 2036,
    observacion: 'Primera subasta REER (RD 960/2020) · récord de bajo precio · MITECO 26-ene-2021',
  },
  {
    fecha: '2021-01-26',
    tecnologia: 'Eólica',
    precio_adjudicado_eur_mwh: 25.31,
    capacidad_mw: 998,
    observacion: 'Primera subasta REER · eólica terrestre · MITECO 26-ene-2021',
  },
  {
    fecha: '2021-10-19',
    tecnologia: 'Fotovoltaica',
    precio_adjudicado_eur_mwh: 30.40,
    capacidad_mw: 2255,
    observacion: 'Segunda subasta REER · MITECO 19-oct-2021',
  },
  {
    fecha: '2021-10-19',
    tecnologia: 'Eólica',
    precio_adjudicado_eur_mwh: 30.18,
    capacidad_mw: 783,
    observacion: 'Segunda subasta REER · eólica terrestre · MITECO 19-oct-2021',
  },
  {
    fecha: '2022-11-22',
    tecnologia: 'Fotovoltaica (autoconsumo industrial)',
    precio_adjudicado_eur_mwh: 47.66,
    capacidad_mw: 44,
    observacion: 'Subasta con cupos específicos · gran parte quedó desierta · MITECO 22-nov-2022',
  },
]

// ────────────────────────────────────────────────────────────────────
// OBJETIVOS PNIEC 2030 · versión revisada 2023-2030
// ────────────────────────────────────────────────────────────────────
// Fuente: PNIEC 2023-2030 (actualización aprobada sept. 2024) · MITECO.
// Los "valor_actual" son aproximaciones del último dato público disponible
// para dar contexto de progreso; no son cifras oficiales de seguimiento.
export const PNIEC_2030: PniecTarget[] = [
  {
    metrica: 'Generación eléctrica de origen renovable',
    objetivo_2030: 81,
    valor_actual: 56,
    unidad: '%',
  },
  {
    metrica: 'Renovables sobre energía final',
    objetivo_2030: 48,
    valor_actual: 24,
    unidad: '%',
  },
  {
    metrica: 'Potencia solar fotovoltaica instalada',
    objetivo_2030: 76,
    valor_actual: 28,
    unidad: 'GW',
  },
  {
    metrica: 'Potencia eólica instalada',
    objetivo_2030: 62,
    valor_actual: 31,
    unidad: 'GW',
  },
  {
    metrica: 'Reducción emisiones GEI vs 1990',
    objetivo_2030: 32,
    valor_actual: 'n/d',
    unidad: '%',
  },
  {
    metrica: 'Mejora de la eficiencia energética',
    objetivo_2030: 43,
    valor_actual: 'n/d',
    unidad: '%',
  },
  {
    metrica: 'Electrolizadores de hidrógeno renovable',
    objetivo_2030: 12,
    valor_actual: '<1',
    unidad: 'GW',
  },
  {
    metrica: 'Almacenamiento energético',
    objetivo_2030: 22.5,
    valor_actual: 'n/d',
    unidad: 'GW',
  },
]

// ────────────────────────────────────────────────────────────────────
// PROYECTOS DE HIDRÓGENO RENOVABLE · PERTE ERHA + corredores EU
// ────────────────────────────────────────────────────────────────────
// Fuente: PERTE de Energías Renovables, Hidrógeno Renovable y Almacenamiento
// (MITECO) + anuncios públicos de los promotores. Capacidades de electrólisis
// en MW; las fechas-horizonte son objetivos de los proyectos y pueden variar.
export const H2_PROYECTOS_ES: H2Project[] = [
  {
    nombre: 'Planta de hidrógeno verde de Puertollano',
    promotor: 'Iberdrola',
    ubicacion: 'Puertollano (Ciudad Real)',
    capacidad_mw: 20,
    estado: 'en operación',
    horizonte: 2022,
  },
  {
    nombre: 'Valle del Hidrógeno de Cataluña · Petronor/Repsol',
    promotor: 'Repsol',
    ubicacion: 'Tarragona',
    capacidad_mw: 150,
    estado: 'en desarrollo',
    horizonte: 2027,
  },
  {
    nombre: 'Electrolizador Petronor (Bilbao)',
    promotor: 'Repsol · Petronor',
    ubicacion: 'Muskiz (Bizkaia)',
    capacidad_mw: 100,
    estado: 'en construcción',
    horizonte: 2026,
  },
  {
    nombre: 'Catalina (hidrógeno verde a gran escala)',
    promotor: 'Copenhagen Infrastructure Partners · Naturgy',
    ubicacion: 'Aragón',
    capacidad_mw: 500,
    estado: 'FID / en desarrollo',
    horizonte: 2026,
  },
  {
    nombre: 'HyDeal / Cerro Falcón',
    promotor: 'Consorcio HyDeal España',
    ubicacion: 'Andalucía',
    capacidad_mw: 1000,
    estado: 'planificado',
    horizonte: 2030,
  },
  {
    nombre: 'Green Hysland',
    promotor: 'Enagás · Acciona · Cemex',
    ubicacion: 'Mallorca (Illes Balears)',
    capacidad_mw: 8,
    estado: 'en operación',
    horizonte: 2023,
  },
  {
    nombre: 'Corredor H2Med / BarMar (interconexión ES-FR)',
    promotor: 'Enagás · GRTgaz · Teréga · REN',
    ubicacion: 'Barcelona ↔ Marsella',
    capacidad_mw: 0,
    estado: 'planificado (infraestructura)',
    horizonte: 2030,
  },
]

// ────────────────────────────────────────────────────────────────────
// EUROPEAN HYDROGEN BANK · subastas de prima fija (€/kg) · Sprint S9
// ────────────────────────────────────────────────────────────────────
// El Banco Europeo del Hidrógeno (European Hydrogen Bank), instrumento de la
// Comisión Europea financiado con el Fondo de Innovación (ETS), subasta ayudas
// a la PRODUCCIÓN de hidrógeno renovable: una prima fija en €/kg durante 10
// años a los proyectos que pujan más bajo (subasta a la baja, "pay-as-bid").
//
//   - 1ª subasta (piloto · IF24): cierre de pujas en NOV-2023, resultados
//     comunicados en ABR-2024. Presupuesto ~720 M€. Se seleccionaron 7
//     proyectos en un rango de precios adjudicados de ~0,37 a ~0,48 €/kg
//     (el más bajo 0,37 €/kg; el más alto seleccionado 0,48 €/kg). Varios de
//     los proyectos ganadores están en la Península Ibérica (España/Portugal).
//     (Comisión Europea / CINEA · "European Hydrogen Bank auction results").
//   - 2ª subasta: lanzada a finales de 2024 con presupuesto ampliado (~1.200
//     M€) e incluyendo un cupo específico ("Auctions-as-a-Service"); los
//     resultados detallados llegan después. Se incluye como contexto de pipeline
//     sin fijar precio definitivo para no mostrar una cifra no consolidada.
//
// Fuente: Comisión Europea (DG CLIMA) / CINEA · European Hydrogen Bank.
export const H2_SUBASTAS_EU: H2SubastaEU[] = [
  {
    ronda: '1ª subasta (piloto · IF24)',
    fecha: '2024-04',
    precio_min_eur_kg: 0.37,
    precio_max_eur_kg: 0.48,
    proyectos_adjudicados: 7,
    presupuesto_meur: 720,
    observacion:
      'Primera subasta del European Hydrogen Bank (cierre nov-2023, resultados abr-2024). ' +
      'Prima fija 10 años; 7 proyectos adjudicados ~0,37-0,48 €/kg. Comisión Europea / CINEA.',
  },
]

// Nota de contexto de la 2ª subasta (sin precio consolidado): se expone como
// texto en la UI, no como dato numérico cerrado.
export const H2_SUBASTA_EU_NOTA_2A =
  'La 2ª subasta del Banco Europeo del Hidrógeno (lanzada a finales de 2024) ' +
  'amplió el presupuesto a ~1.200 M€ e introdujo el esquema "Auctions-as-a-Service" ' +
  'para que los Estados miembros añadan fondos nacionales. Resultados detallados posteriores.'

// ────────────────────────────────────────────────────────────────────
// BACKBONE / CORREDORES DE HIDRÓGENO · H2Med + red troncal · Sprint S9
// ────────────────────────────────────────────────────────────────────
// La infraestructura troncal de transporte de H2 es la pieza que conecta los
// polos de producción (electrolizadores) con la demanda industrial y con
// Europa. Dos proyectos clave para España:
//
//   - H2Med (BarMar): interconexión submarina de hidrógeno entre Barcelona y
//     Marsella, parte del "H2Med corridor". Es un Proyecto de Interés Común
//     (PCI) de la UE, promovido por Enagás (ES), GRTgaz y Teréga (FR), REN (PT,
//     vía la conexión CelZa Celorico-Zamora) y con OGE (DE) sumándose a la
//     extensión hacia Alemania. Horizonte de puesta en servicio ~2030.
//   - Red Troncal Española de Hidrógeno: la red interior de gasoductos de H2
//     que Enagás planifica como parte del European Hydrogen Backbone, para
//     vertebrar los valles del hidrógeno y conectar con H2Med. Miles de km a
//     2030+.
//
// Las longitudes son aproximadas y los horizontes objetivos de proyecto.
// Fuente: Enagás (European Hydrogen Backbone) + Comisión Europea (lista PCI).
export const H2_BACKBONE: H2BackboneProject[] = [
  {
    nombre: 'H2Med (corredor BarMar)',
    tipo: 'Interconexión submarina',
    promotores: ['Enagás', 'GRTgaz', 'Teréga', 'REN'],
    trazado: 'Barcelona ↔ Marsella',
    longitud_km: 455,
    horizonte: 2030,
    estado: 'PCI europeo · planificado',
    observacion:
      'Interconexión submarina de hidrógeno Barcelona-Marsella, Proyecto de Interés Común (PCI) de la UE. ' +
      'Eje del corredor H2Med con extensión planificada hacia Alemania (OGE). Fuente: Comisión Europea / Enagás.',
  },
  {
    nombre: 'Conexión CelZa (Celorico ↔ Zamora)',
    tipo: 'Interconexión terrestre ES-PT',
    promotores: ['Enagás', 'REN'],
    trazado: 'Zamora ↔ Celorico da Beira',
    longitud_km: 248,
    horizonte: 2030,
    estado: 'PCI europeo · planificado',
    observacion:
      'Tramo terrestre del corredor H2Med que conecta Portugal con España (Celorico-Zamora). ' +
      'Junto con BarMar forma el eje ibérico de exportación de H2 a Europa. Fuente: Enagás / REN.',
  },
  {
    nombre: 'Red Troncal Española de Hidrógeno',
    tipo: 'Red troncal nacional',
    promotores: ['Enagás'],
    trazado: 'Vertebración nacional (valles del hidrógeno → H2Med)',
    longitud_km: 2600,
    horizonte: 2030,
    estado: 'planificado (estudios)',
    observacion:
      'Red interior de gasoductos de hidrógeno que Enagás planifica dentro del European Hydrogen Backbone, ' +
      'para conectar los polos de producción y demanda con el corredor H2Med. Longitud aproximada a 2030+. Fuente: Enagás.',
  },
]

// ────────────────────────────────────────────────────────────────────
// EMPRESAS DEL SECTOR ENERGÉTICO · españolas + majors globales
// ────────────────────────────────────────────────────────────────────
// Fuente: información pública de mercado. Tickers en su mercado principal.
// `es_espanola` marca las compañías con sede en España. Las cotizaciones en
// vivo (S9) se obtendrán vía Finnhub usando el ticker.
export const EMPRESAS_ENERGIA: EnergyCompany[] = [
  // ── Españolas ──────────────────────────────────────────────────────
  {
    slug: 'iberdrola',
    nombre: 'Iberdrola',
    ticker: 'IBE.MC',
    exchange: 'BME',
    pais: 'España',
    segmentos: ['Integrada', 'Renovables', 'Redes'],
    energias: ['electrico', 'renovables', 'hidrogeno'],
    es_espanola: true,
    opencorporates_jurisdiction: 'es',
  },
  {
    slug: 'endesa',
    nombre: 'Endesa',
    ticker: 'ELE.MC',
    exchange: 'BME',
    pais: 'España',
    segmentos: ['Integrada', 'Generación', 'Comercializadora'],
    energias: ['electrico', 'renovables', 'nuclear'],
    es_espanola: true,
    opencorporates_jurisdiction: 'es',
  },
  {
    slug: 'naturgy',
    nombre: 'Naturgy',
    ticker: 'NTGY.MC',
    exchange: 'BME',
    pais: 'España',
    segmentos: ['Gas', 'Integrada', 'Redes'],
    energias: ['gas', 'electrico', 'renovables'],
    es_espanola: true,
    opencorporates_jurisdiction: 'es',
  },
  {
    slug: 'repsol',
    nombre: 'Repsol',
    ticker: 'REP.MC',
    exchange: 'BME',
    pais: 'España',
    segmentos: ['Upstream', 'Refino', 'Comercialización', 'Multienergía'],
    energias: ['petroleo', 'gas', 'renovables', 'hidrogeno'],
    es_espanola: true,
    opencorporates_jurisdiction: 'es',
  },
  {
    slug: 'acciona-energia',
    nombre: 'Acciona Energía',
    ticker: 'ANE.MC',
    exchange: 'BME',
    pais: 'España',
    segmentos: ['Renovables'],
    energias: ['renovables', 'electrico'],
    es_espanola: true,
    opencorporates_jurisdiction: 'es',
  },
  {
    slug: 'solaria',
    nombre: 'Solaria Energía',
    ticker: 'SLR.MC',
    exchange: 'BME',
    pais: 'España',
    segmentos: ['Solar fotovoltaica'],
    energias: ['renovables', 'electrico'],
    es_espanola: true,
    opencorporates_jurisdiction: 'es',
  },
  {
    slug: 'grenergy',
    nombre: 'Grenergy Renovables',
    ticker: 'GRE.MC',
    exchange: 'BME',
    pais: 'España',
    segmentos: ['Renovables', 'Almacenamiento'],
    energias: ['renovables', 'electrico'],
    es_espanola: true,
    opencorporates_jurisdiction: 'es',
  },
  {
    slug: 'enagas',
    nombre: 'Enagás',
    ticker: 'ENG.MC',
    exchange: 'BME',
    pais: 'España',
    segmentos: ['Infraestructura gasista', 'Hidrógeno'],
    energias: ['gas', 'hidrogeno'],
    es_espanola: true,
    opencorporates_jurisdiction: 'es',
  },
  {
    slug: 'redeia',
    nombre: 'Redeia (Red Eléctrica)',
    ticker: 'RED.MC',
    exchange: 'BME',
    pais: 'España',
    segmentos: ['Operador del sistema', 'Transporte eléctrico'],
    energias: ['electrico'],
    es_espanola: true,
    opencorporates_jurisdiction: 'es',
  },
  {
    slug: 'edp',
    nombre: 'EDP · Energias de Portugal',
    ticker: 'EDP.LS',
    exchange: 'Euronext Lisbon',
    pais: 'Portugal',
    segmentos: ['Integrada', 'Renovables', 'Redes'],
    energias: ['electrico', 'renovables'],
    es_espanola: false,
    opencorporates_jurisdiction: 'pt',
  },
  {
    slug: 'cepsa',
    nombre: 'Cepsa',
    ticker: '',
    exchange: 'Privada',
    pais: 'España',
    segmentos: ['Refino', 'Química', 'Multienergía', 'Hidrógeno'],
    energias: ['petroleo', 'gas', 'renovables', 'hidrogeno'],
    es_espanola: true,
    opencorporates_jurisdiction: 'es',
  },

  // ── Majors / utilities globales ────────────────────────────────────
  {
    slug: 'shell',
    nombre: 'Shell plc',
    ticker: 'SHEL',
    exchange: 'NYSE / LSE',
    pais: 'Reino Unido',
    segmentos: ['Upstream', 'Downstream', 'GNL', 'Renovables'],
    energias: ['petroleo', 'gas', 'renovables', 'hidrogeno'],
    es_espanola: false,
  },
  {
    slug: 'bp',
    nombre: 'BP plc',
    ticker: 'BP',
    exchange: 'NYSE / LSE',
    pais: 'Reino Unido',
    segmentos: ['Upstream', 'Downstream', 'Renovables'],
    energias: ['petroleo', 'gas', 'renovables'],
    es_espanola: false,
  },
  {
    slug: 'totalenergies',
    nombre: 'TotalEnergies',
    ticker: 'TTE',
    exchange: 'Euronext Paris / NYSE',
    pais: 'Francia',
    segmentos: ['Upstream', 'GNL', 'Renovables', 'Electricidad'],
    energias: ['petroleo', 'gas', 'renovables', 'electrico'],
    es_espanola: false,
  },
  {
    slug: 'equinor',
    nombre: 'Equinor',
    ticker: 'EQNR',
    exchange: 'NYSE / Oslo Børs',
    pais: 'Noruega',
    segmentos: ['Upstream', 'Gas', 'Eólica marina'],
    energias: ['petroleo', 'gas', 'renovables'],
    es_espanola: false,
  },
  {
    slug: 'nextera',
    nombre: 'NextEra Energy',
    ticker: 'NEE',
    exchange: 'NYSE',
    pais: 'Estados Unidos',
    segmentos: ['Renovables', 'Utility', 'Almacenamiento'],
    energias: ['renovables', 'electrico'],
    es_espanola: false,
  },
  {
    slug: 'engie',
    nombre: 'ENGIE',
    ticker: 'ENGI.PA',
    exchange: 'Euronext Paris',
    pais: 'Francia',
    segmentos: ['Integrada', 'Gas', 'Renovables', 'Redes'],
    energias: ['gas', 'electrico', 'renovables'],
    es_espanola: false,
  },
  {
    slug: 'edf',
    nombre: 'EDF · Électricité de France',
    ticker: '',
    exchange: 'Privada (estatal)',
    pais: 'Francia',
    segmentos: ['Nuclear', 'Integrada', 'Renovables'],
    energias: ['nuclear', 'electrico', 'renovables'],
    es_espanola: false,
  },
  {
    slug: 'orsted',
    nombre: 'Ørsted',
    ticker: 'ORSTED.CO',
    exchange: 'Nasdaq Copenhagen',
    pais: 'Dinamarca',
    segmentos: ['Eólica marina', 'Renovables'],
    energias: ['renovables', 'electrico'],
    es_espanola: false,
  },
  {
    slug: 'exxonmobil',
    nombre: 'ExxonMobil',
    ticker: 'XOM',
    exchange: 'NYSE',
    pais: 'Estados Unidos',
    segmentos: ['Upstream', 'Downstream', 'Química'],
    energias: ['petroleo', 'gas'],
    es_espanola: false,
  },
  {
    slug: 'chevron',
    nombre: 'Chevron',
    ticker: 'CVX',
    exchange: 'NYSE',
    pais: 'Estados Unidos',
    segmentos: ['Upstream', 'Downstream', 'GNL'],
    energias: ['petroleo', 'gas'],
    es_espanola: false,
  },
  {
    slug: 'enel',
    nombre: 'Enel',
    ticker: 'ENEL.MI',
    exchange: 'Borsa Italiana',
    pais: 'Italia',
    segmentos: ['Integrada', 'Renovables', 'Redes'],
    energias: ['electrico', 'renovables'],
    es_espanola: false,
  },
  {
    slug: 'eon',
    nombre: 'E.ON',
    ticker: 'EOAN.DE',
    exchange: 'Xetra',
    pais: 'Alemania',
    segmentos: ['Redes', 'Comercializadora'],
    energias: ['electrico', 'gas'],
    es_espanola: false,
  },
  {
    slug: 'rwe',
    nombre: 'RWE',
    ticker: 'RWE.DE',
    exchange: 'Xetra',
    pais: 'Alemania',
    segmentos: ['Generación', 'Renovables', 'Trading'],
    energias: ['electrico', 'renovables', 'gas'],
    es_espanola: false,
  },
]

// ────────────────────────────────────────────────────────────────────
// DEPENDENCIA PETROLERA DE ESPAÑA · Sprint Energía S7
// ────────────────────────────────────────────────────────────────────
// España carece de producción doméstica de crudo relevante (el yacimiento
// de Casablanca, frente a Tarragona, aporta cantidades testimoniales): se
// importa la práctica totalidad del crudo que se refina. La estadística de
// aprovisionamiento de crudo de CORES (Corporación de Reservas Estratégicas
// de Productos Petrolíferos, dependiente del MITECO) publica mensualmente el
// desglose por país de origen.
//
// Las cuotas varían mes a mes según contratos spot y disrupciones (p. ej.
// el embargo a Rusia desde 2022 reordenó los orígenes: subieron EE. UU.,
// Brasil, Nigeria, México y Arabia Saudí). Los valores aquí son una foto
// representativa de los últimos datos anuales agregados de CORES; deben
// leerse como orden de magnitud, no como cifra exacta del mes corriente.
// Fuente: CORES · "Estadística de aprovisionamiento de crudo".
export const PETROLEO_DEPENDENCIA_ES: PetroleoDependencia = {
  dependencia_importacion_pct: 99,
  ano_ref: 2024,
  origenes: [
    { pais: 'México', cuota_pct: 13 },
    { pais: 'Estados Unidos', cuota_pct: 12 },
    { pais: 'Nigeria', cuota_pct: 11 },
    { pais: 'Brasil', cuota_pct: 10 },
    { pais: 'Arabia Saudí', cuota_pct: 9 },
    { pais: 'Libia', cuota_pct: 7 },
    { pais: 'Angola', cuota_pct: 5 },
    { pais: 'Kazajistán', cuota_pct: 5 },
    { pais: 'Irak', cuota_pct: 4 },
    { pais: 'Resto', cuota_pct: 24 },
  ],
  fuente: 'CORES · Estadística de aprovisionamiento de crudo (MITECO).',
  fuente_url: 'https://www.cores.es/es/estadisticas',
  nota: 'España importa ~99% del crudo que consume; sin producción doméstica significativa. ' +
    'La diversificación por orígenes (>15 países) reduce la exposición a un proveedor único, ' +
    'pero el grueso de los flujos atlánticos y mediterráneos depende de chokepoints como el ' +
    'estrecho de Ormuz (golfo Pérsico) y el canal de Suez. El embargo a Rusia (2022) elevó la ' +
    'cuota de EE. UU., Brasil, Nigeria y México.',
}

// ────────────────────────────────────────────────────────────────────
// GNL DE ESPAÑA · plantas de regasificación + orígenes · Sprint Energía S8
// ────────────────────────────────────────────────────────────────────
// España es el país con MAYOR capacidad de regasificación de la Unión Europea
// y uno de los mayores del mundo: 6 plantas en operación (Barcelona, Cartagena,
// Huelva, Bilbao, Sagunto y Mugardos) más El Musel (Gijón), que tras años en
// "hibernación" entró en proceso de puesta en marcha. Esta red, junto con las
// conexiones por gasoducto con Argelia (Medgaz) y Europa (VIP Pirineos), hace
// de España un hub gasista del suroeste europeo, aunque con poca capacidad de
// interconexión hacia el centro de Europa.
//
// El gas natural llega a España en dos formas: por GASODUCTO (principalmente
// Argelia vía Medgaz) y como GNL por barco metanero (regasificado en las
// plantas). Tras la crisis de 2022 (guerra de Ucrania), el GNL ganó peso y se
// diversificaron los orígenes; EE. UU. se convirtió en el primer proveedor de
// GNL y Rusia, pese a las sanciones al gas por tubo, siguió aportando GNL.
//
// Capacidades de emisión (regasificación) en GWh/día: cifras de orden de
// magnitud de la capacidad técnica nominal de cada planta según Enagás (el
// sistema gasista español tiene en conjunto del orden de ~1.800-2.000 GWh/día
// de capacidad de emisión de GNL). Los valores exactos varían según ampliaciones
// y condiciones operativas.
//
// Las cuotas por país de origen son orden de magnitud de los últimos datos
// anuales agregados; varían mes a mes con los contratos spot. Fuente: Enagás
// (operador del sistema) + CORES (estadística de hidrocarburos · MITECO).
export const GNL_ESPANA: GnlEspana = {
  ano_ref: 2024,
  plantas: [
    {
      nombre: 'Barcelona',
      ubicacion: 'Barcelona (Cataluña)',
      operador: 'Enagás',
      emision_gwh_dia: 650,
      estado: 'operativa',
      nota: 'La mayor planta de regasificación de Europa por capacidad de emisión.',
    },
    {
      nombre: 'Cartagena',
      ubicacion: 'Cartagena (Murcia)',
      operador: 'Enagás',
      emision_gwh_dia: 450,
      estado: 'operativa',
    },
    {
      nombre: 'Huelva',
      ubicacion: 'Palos de la Frontera (Huelva)',
      operador: 'Enagás',
      emision_gwh_dia: 450,
      estado: 'operativa',
    },
    {
      nombre: 'Bilbao',
      ubicacion: 'Zierbena (Bizkaia)',
      operador: 'Bahía de Bizkaia Gas (Enagás)',
      emision_gwh_dia: 235,
      estado: 'operativa',
    },
    {
      nombre: 'Sagunto',
      ubicacion: 'Sagunto (Valencia)',
      operador: 'Saggas (Enagás)',
      emision_gwh_dia: 300,
      estado: 'operativa',
    },
    {
      nombre: 'Mugardos',
      ubicacion: 'Mugardos (A Coruña)',
      operador: 'Reganosa',
      emision_gwh_dia: 165,
      estado: 'operativa',
    },
    {
      nombre: 'El Musel',
      ubicacion: 'Gijón (Asturias)',
      operador: 'Enagás',
      emision_gwh_dia: null,
      estado: 'puesta en marcha',
      nota: 'Construida en 2013, mantenida años en "hibernación"; reactivada como almacenamiento/' +
        'logística de GNL y en proceso de habilitación para emisión a la red.',
    },
  ],
  origenes: [
    { pais: 'Estados Unidos', cuota_pct: 28 },
    { pais: 'Argelia', cuota_pct: 24 },
    { pais: 'Rusia (GNL)', cuota_pct: 14 },
    { pais: 'Nigeria', cuota_pct: 12 },
    { pais: 'Qatar', cuota_pct: 6 },
    { pais: 'Trinidad y Tobago', cuota_pct: 4 },
    { pais: 'Resto', cuota_pct: 12 },
  ],
  cuota_gnl_pct: 70,
  fuente: 'Enagás (operador del sistema gasista) + CORES · estadística de hidrocarburos (MITECO).',
  fuente_url: 'https://www.enagas.es/es/transporte-gas/gestion-tecnica-sistema/',
  nota: 'España es el país con mayor capacidad de regasificación de GNL de la UE (6 plantas en ' +
    'operación + El Musel reactivándose). El gas llega por gasoducto (Argelia vía Medgaz) y como ' +
    'GNL por metanero; tras 2022 el GNL ganó peso y EE. UU. pasó a ser el primer proveedor. La ' +
    'diversificación de orígenes es alta, pero el cuello de botella es la escasa interconexión ' +
    'por gasoducto con el centro de Europa (VIP Pirineos), que limita el papel de España como ' +
    'puerta de entrada de gas al continente. Las cuotas son orden de magnitud y varían mes a mes.',
}
