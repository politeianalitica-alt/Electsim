/**
 * partidos-extra.ts · enriquecimiento curado por partido para la ficha
 * dedicada /partidos/[slug]: historial electoral (escaños/% por elección
 * general), alianzas y conflictos, financiación pública y cronología.
 *
 * Datos de resultados electorales: públicos (Ministerio del Interior).
 * Financiación: modelo público + enlace oficial al Tribunal de Cuentas
 * (no se inventan cifras exactas). Cronología y alianzas: hechos verificables.
 */
export interface PartidoExtra {
  descripcion?: string
  historial?: Array<{ eleccion: string; pct: number; escanos: number }>
  alianzas?: string[]
  conflictos?: string[]
  financiacion?: { texto: string; fuente?: string }
  cronologia?: Array<{ anio: string; hito: string }>
}

const TC = 'https://www.tcu.es/tribunal-de-cuentas/es/fiscalizacion/Fiscalizacion-de-Partidos-Politicos/'

export const PARTIDO_EXTRA: Record<string, PartidoExtra> = {
  psoe: {
    descripcion: 'Partido de la socialdemocracia española, el más antiguo en activo (1879). Lidera el Gobierno de coalición desde 2018 y articula el bloque de investidura progresista junto a Sumar y los nacionalistas e independentistas.',
    historial: [
      { eleccion: '2015', pct: 22.0, escanos: 90 },
      { eleccion: '2016', pct: 22.6, escanos: 85 },
      { eleccion: 'Abr 2019', pct: 28.7, escanos: 123 },
      { eleccion: 'Nov 2019', pct: 28.0, escanos: 120 },
      { eleccion: '2023', pct: 31.7, escanos: 121 },
    ],
    alianzas: ['Sumar (coalición de Gobierno)', 'ERC, Junts, EH Bildu, PNV y BNG (bloque de investidura)', 'Coalición Canaria (acuerdos puntuales)'],
    conflictos: ['PP (principal adversario)', 'VOX', 'Tensión recurrente con Junts por el cumplimiento de los pactos'],
    financiacion: { texto: 'Financiación pública (subvenciones electorales y de funcionamiento según votos y escaños) más cuotas de afiliados. Cuentas fiscalizadas anualmente por el Tribunal de Cuentas.', fuente: TC },
    cronologia: [
      { anio: '1879', hito: 'Fundación por Pablo Iglesias' },
      { anio: '1982', hito: 'Mayoría absoluta de Felipe González; 14 años de gobierno' },
      { anio: '2018', hito: 'Pedro Sánchez gana la moción de censura a Rajoy' },
      { anio: '2020', hito: 'Primer Gobierno de coalición de la democracia (con Unidas Podemos)' },
      { anio: '2023', hito: 'Investidura con apoyo independentista y ley de amnistía' },
    ],
  },
  pp: {
    descripcion: 'Principal partido del centro-derecha español, refundado en 1989 a partir de Alianza Popular. Lidera la oposición y gobierna en la mayoría de comunidades autónomas, con el Senado en mayoría absoluta.',
    historial: [
      { eleccion: '2015', pct: 28.7, escanos: 123 },
      { eleccion: '2016', pct: 33.0, escanos: 137 },
      { eleccion: 'Abr 2019', pct: 16.7, escanos: 66 },
      { eleccion: 'Nov 2019', pct: 20.8, escanos: 89 },
      { eleccion: '2023', pct: 33.1, escanos: 137 },
    ],
    alianzas: ['VOX (gobiernos autonómicos y municipales, con tensiones)', 'UPN (coalición en Navarra)', 'Coalición Canaria', 'PPE (Europa)'],
    conflictos: ['PSOE y el Gobierno de coalición', 'Sumar', 'Independentismo catalán', 'Tensión interna con VOX por la estrategia'],
    financiacion: { texto: 'Financiación pública por votos y escaños más cuotas de afiliados. Es el partido con más afiliación declarada. Cuentas fiscalizadas por el Tribunal de Cuentas; arrastra la condena por la caja b del caso Gürtel.', fuente: TC },
    cronologia: [
      { anio: '1989', hito: 'Refundación de AP como Partido Popular (Fraga → Aznar)' },
      { anio: '1996', hito: 'Aznar llega a la Moncloa' },
      { anio: '2011', hito: 'Mayoría absoluta de Mariano Rajoy' },
      { anio: '2018', hito: 'La sentencia Gürtel precipita la caída de Rajoy' },
      { anio: '2022', hito: 'Feijóo releva a Casado al frente del partido' },
      { anio: '2023', hito: 'Gana el 23-J pero no logra la investidura' },
    ],
  },
  vox: {
    descripcion: 'Partido de la derecha radical fundado en 2013 por exdirigentes del PP. Tercera fuerza del Congreso, con una agenda centrada en inmigración, identidad nacional y oposición al Estado autonómico.',
    historial: [
      { eleccion: '2015', pct: 0.2, escanos: 0 },
      { eleccion: '2016', pct: 0.2, escanos: 0 },
      { eleccion: 'Abr 2019', pct: 10.3, escanos: 24 },
      { eleccion: 'Nov 2019', pct: 15.1, escanos: 52 },
      { eleccion: '2023', pct: 12.4, escanos: 33 },
    ],
    alianzas: ['PP (apoyo a investiduras autonómicas, ruptura posterior de gobiernos)', 'Patriotas por Europa (PfE)'],
    conflictos: ['Gobierno de coalición', 'Independentismo y nacionalismos', 'Ruptura con el PP en los gobiernos autonómicos (2024)'],
    financiacion: { texto: 'Financiación pública por resultados electorales y aportaciones de afiliados y simpatizantes. Cuentas fiscalizadas por el Tribunal de Cuentas.', fuente: TC },
    cronologia: [
      { anio: '2013', hito: 'Fundación por exdirigentes del PP' },
      { anio: '2018', hito: 'Irrupción en las elecciones andaluzas' },
      { anio: 'Nov 2019', hito: 'Máximo histórico: 52 escaños' },
      { anio: '2023', hito: 'Retrocede a 33 escaños' },
      { anio: '2024', hito: 'Rompe los gobiernos autonómicos de coalición con el PP' },
    ],
  },
  sumar: {
    descripcion: 'Movimiento político de la izquierda alternativa fundado en 2023 por Yolanda Díaz, que aglutina a IU, los comunes, Compromís y otras fuerzas. Socio minoritario del Gobierno de coalición.',
    historial: [
      { eleccion: '2015 (UP)', pct: 20.7, escanos: 69 },
      { eleccion: '2016 (UP)', pct: 21.2, escanos: 71 },
      { eleccion: 'Abr 2019 (UP)', pct: 14.3, escanos: 42 },
      { eleccion: 'Nov 2019 (UP)', pct: 12.8, escanos: 35 },
      { eleccion: '2023 (Sumar)', pct: 12.3, escanos: 31 },
    ],
    alianzas: ['PSOE (coalición de Gobierno)', 'IU, En Comú Podem, Compromís, BNG y otras fuerzas del grupo'],
    conflictos: ['PP y VOX', 'Ruptura con Podemos, que abandonó el grupo', 'Tensiones internas sobre el liderazgo'],
    financiacion: { texto: 'Financiación pública por resultados electorales, repartida entre las formaciones que integran el espacio. Cuentas fiscalizadas por el Tribunal de Cuentas.', fuente: TC },
    cronologia: [
      { anio: '2023', hito: 'Yolanda Díaz funda Sumar y concurre al 23-J' },
      { anio: '2023', hito: 'Entra en el Gobierno de coalición con cinco ministerios' },
      { anio: '2024', hito: 'Ruptura con Podemos, que se va al Grupo Mixto' },
    ],
  },
  junts: {
    descripcion: 'Partido independentista catalán de centro-derecha, heredero de la antigua Convergència, liderado por Carles Puigdemont desde Bélgica. Llave aritmética de la legislatura.',
    historial: [
      { eleccion: 'Abr 2019', pct: 1.9, escanos: 7 },
      { eleccion: 'Nov 2019', pct: 2.2, escanos: 8 },
      { eleccion: '2023', pct: 1.6, escanos: 7 },
    ],
    alianzas: ['Apoya puntualmente la investidura de Sánchez a cambio de la amnistía y cesiones'],
    conflictos: ['Estado español en el marco del procés', 'ERC (competencia por el espacio independentista)', 'Bloquea iniciativas del Gobierno cuando no se cumplen los pactos'],
    financiacion: { texto: 'Financiación pública por resultados en Cataluña y aportaciones de afiliados. Cuentas fiscalizadas por el Tribunal de Cuentas.', fuente: TC },
    cronologia: [
      { anio: '2018', hito: 'Nace como JxCat tras la disolución de CDC' },
      { anio: '2017–', hito: 'Puigdemont en Bélgica tras el 1-O' },
      { anio: '2023', hito: 'Se convierte en llave de la investidura de Sánchez' },
    ],
  },
  erc: {
    descripcion: 'Esquerra Republicana de Catalunya, partido independentista de izquierdas fundado en 1931. Pragmático negociador, fue clave en la investidura de 2019 y en la legislatura actual.',
    historial: [
      { eleccion: 'Abr 2019', pct: 3.9, escanos: 15 },
      { eleccion: 'Nov 2019', pct: 3.6, escanos: 13 },
      { eleccion: '2023', pct: 1.9, escanos: 7 },
    ],
    alianzas: ['Bloque de investidura del Gobierno (a cambio de cesiones para Cataluña)'],
    conflictos: ['Junts (competencia independentista)', 'Estado en lo territorial', 'Pérdida del Govern de la Generalitat en 2024'],
    financiacion: { texto: 'Financiación pública por resultados y aportaciones de afiliados. Cuentas fiscalizadas por el Tribunal de Cuentas.', fuente: TC },
    cronologia: [
      { anio: '1931', hito: 'Fundación; protagonista de la Segunda República en Cataluña' },
      { anio: '2017', hito: 'Junqueras encarcelado tras el 1-O (luego indultado)' },
      { anio: '2019', hito: 'Su abstención facilita la investidura de Sánchez' },
    ],
  },
  bildu: {
    descripcion: 'Coalición de la izquierda abertzale vasca (EH Bildu), referente del nacionalismo de izquierdas. En crecimiento sostenido en Euskadi y Navarra, apoya al bloque de investidura.',
    historial: [
      { eleccion: 'Abr 2019', pct: 1.0, escanos: 4 },
      { eleccion: 'Nov 2019', pct: 1.1, escanos: 5 },
      { eleccion: '2023', pct: 1.4, escanos: 6 },
    ],
    alianzas: ['Bloque de investidura del Gobierno', 'Coordinación parlamentaria con ERC'],
    conflictos: ['PP y VOX (que cuestionan su pasado)', 'Competencia con el PNV en Euskadi'],
    financiacion: { texto: 'Financiación pública por resultados en Euskadi y Navarra. Cuentas fiscalizadas por el Tribunal de Cuentas.', fuente: TC },
    cronologia: [
      { anio: '2011', hito: 'Constitución de la coalición EH Bildu' },
      { anio: '2021', hito: 'Apoya los Presupuestos del Gobierno' },
      { anio: '2024', hito: 'Segunda fuerza en las elecciones vascas' },
    ],
  },
  pnv: {
    descripcion: 'Partido Nacionalista Vasco (EAJ-PNV), nacionalismo vasco de centro y democristiano. Fuerza hegemónica del Gobierno vasco y socio pragmático en Madrid.',
    historial: [
      { eleccion: 'Abr 2019', pct: 1.5, escanos: 6 },
      { eleccion: 'Nov 2019', pct: 1.6, escanos: 6 },
      { eleccion: '2023', pct: 1.1, escanos: 5 },
    ],
    alianzas: ['Bloque de investidura del Gobierno', 'Coalición de gobierno con el PSE en Euskadi'],
    conflictos: ['EH Bildu (competencia por la hegemonía vasca)', 'VOX'],
    financiacion: { texto: 'Financiación pública por resultados en Euskadi. Cuentas fiscalizadas por el Tribunal de Cuentas.', fuente: TC },
    cronologia: [
      { anio: '1895', hito: 'Fundación por Sabino Arana' },
      { anio: '2020', hito: 'Renueva la coalición con el PSE en el Gobierno vasco' },
      { anio: '2024', hito: 'Pradales releva a Urkullu como lehendakari' },
    ],
  },
}
