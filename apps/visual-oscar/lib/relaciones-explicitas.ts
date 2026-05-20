/**
 * Dataset CURADO de relaciones explícitas entre actores políticos.
 *
 * Estas relaciones se basan en hechos públicos verificables (medios
 * españoles, prensa internacional, registros oficiales) y se muestran
 * en el grafo SIEMPRE que ambos actores estén visibles, complementando
 * (y prevaleciendo sobre) las inferidas automáticamente por algoritmo.
 *
 * Fuentes consultadas para la curación:
 *   · El País, El Mundo, ABC, La Vanguardia, eldiario.es, OK Diario,
 *     El Confidencial, RTVE, Cadena SER, COPE, La Sexta
 *   · Hechos institucionales: BOE, BOCG, Generalitat, gobiernos CCAA
 *   · Casos judiciales públicos: Audiencia Nacional, TS, TC
 *
 * Cada relación tiene:
 *   · val ∈ [-100, +100] · negativo = conflicto, positivo = alianza
 *   · tipo · categoría táctica (pacto_gobierno, rivalidad_interna…)
 *   · label · descripción humana corta para el tooltip
 *
 * Los IDs deben coincidir con `actor.id` (slug del nombre).
 */

export type TipoRelacion =
  // Alianzas
  | 'coalicion_gobierno' // miembros de la misma coalición Moncloa
  | 'pacto_investidura' // socios externos del bloque de investidura
  | 'pacto_autonomico' // coalición de gobierno en CCAA
  | 'aliado_partido' // mismo partido y misma facción
  | 'aliado_internacional' // alianza diplomática activa
  | 'aliado_sindical' // sindicatos coordinados
  | 'aliado_mediatico' // línea editorial afín
  | 'mediador' // figura puente entre bloques
  // Conflictos
  | 'oposicion_frontal' // enfrentamiento público sostenido
  | 'rivalidad_interna' // rivales del mismo partido
  | 'conflicto_judicial' // procedimiento judicial activo
  | 'conflicto_territorial' // tensión nación/CCAA o entre CCAA
  | 'bloqueo_legislativo' // bloqueo formal de iniciativa o nombramiento
  | 'critica_publica' // ataques mediáticos sin ruptura
  | 'ruptura_coalicion' // coalición rota recientemente

export interface RelacionExplicita {
  a: string            // id actor origen
  b: string            // id actor destino
  val: number          // -100 .. +100
  tipo: TipoRelacion
  label: string        // descripción corta · va al tooltip
}

// Relaciones adicionales importadas de CSVs curados (mayo 2026, fuentes
// verificadas). Importadas como value pero el back-edge es solo type,
// no hay ciclo runtime.
import { RELACIONES_CSV_CURADAS } from './relaciones-csv-curadas'
import { RELACIONES_CSV_TOP50 } from './relaciones-csv-top50'

// Slugs comunes (mismo algoritmo que actores.ts buildActor → id)
const id = (nombre: string) => nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

// ─── Bloque GOBIERNO (PSOE + Sumar) ────────────────────────────────────
const SANCHEZ        = id('Pedro Sánchez')
const YOLANDA        = id('Yolanda Díaz')
const MONTERO_PSOE   = id('María Jesús Montero')
const BOLANOS        = id('Félix Bolaños')
const ALBARES        = id('José Manuel Albares')
const ROBLES         = id('Margarita Robles')
const MARLASKA       = id('Fernando Grande-Marlaska')
const CUERPO         = id('Carlos Cuerpo')
const PLANAS         = id('Luis Planas')
const PUENTE         = id('Óscar Puente')
const ALEGRIA        = id('Pilar Alegría')
const AAGESEN        = id('Sara Aagesen')
const REDONDO        = id('Ana Redondo')
const SAIZ           = id('Elma Saiz')
const MORANT         = id('Diana Morant')
const HEREU          = id('Jordi Hereu')
const LOPEZ_TRANSF   = id('Óscar López')
const RODRIGUEZ      = id('Isabel Rodríguez')
const TORRES         = id('Ángel Víctor Torres')
const BERNABE        = id('Pilar Bernabé')
// Sumar
const MONICA_GARCIA  = id('Mónica García')
const BUSTINDUY      = id('Pablo Bustinduy')
const URTASUN        = id('Ernest Urtasun')
const SIRA_REGO      = id('Sira Rego')

// ─── Bloque OPOSICIÓN ──────────────────────────────────────────────────
const FEIJOO         = id('Alberto Núñez Feijóo')
const ABASCAL        = id('Santiago Abascal')
// PP equipo
const GAMARRA        = id('Cuca Gamarra')
const SEMPER         = id('Borja Sémper')
const TELLADO        = id('Miguel Tellado')
const BENDODO        = id('Elías Bendodo')
const CAYETANA       = id('Cayetana Álvarez de Toledo')
// Podemos
const BELARRA        = id('Ione Belarra')
const IRENE_MONTERO  = id('Irene Montero')
const ECHENIQUE      = id('Pablo Echenique')
const IGLESIAS       = id('Pablo Iglesias')
// Vox secundarios
const ESPINOSA       = id('Iván Espinosa de los Monteros')
const ORTEGA_SMITH   = id('Javier Ortega Smith')
const MONASTERIO     = id('Rocío Monasterio')

// ─── Autonómicos clave ────────────────────────────────────────────────
const AYUSO          = id('Isabel Díaz Ayuso')
const MORENO         = id('Juan Manuel Moreno Bonilla')
const MAZON          = id('Juanfran Pérez Llorca')
const RUEDA          = id('Alfonso Rueda')
const MANUECO        = id('Alfonso Fernández Mañueco')
const AZCON          = id('Jorge Azcón')
const PROHENS        = id('Marga Prohens')
const LOPEZ_MIRAS    = id('Fernando López Miras')
const GUARDIOLA      = id('María Guardiola')
const POMBO_BARBON   = id('Adrián Barbón')
const PAGE           = id('Emiliano García-Page')
const LAMBAN         = id('Javier Lambán')
const SUSANA_DIAZ    = id('Susana Díaz')
const REVILLA        = id('Miguel Ángel Revilla')
const CLAVIJO        = id('Fernando Clavijo')
// Generalitat
const ILLA           = id('Salvador Illa')
const ARAGONES       = id('Pere Aragonès')
const JUNQUERAS      = id('Oriol Junqueras')
const PUIGDEMONT     = id('Carles Puigdemont')
const ROVIRA         = id('Marta Rovira')
// Vasco
const ORTUZAR        = id('Andoni Ortuzar')
const OTEGI          = id('Arnaldo Otegi')
const AITOR_ESTEBAN  = id('Aitor Esteban')
const AIZPURUA       = id('Mertxe Aizpurua')
// Galicia / BNG
const PONTON         = id('Ana Pontón')
const RUFIAN         = id('Gabriel Rufián')

// ─── Municipales ──────────────────────────────────────────────────────
const ALMEIDA        = id('José Luis Martínez-Almeida')
const COLLBONI       = id('Jaume Collboni')
const CABALLERO      = id('Abel Caballero')
const ALBIOL         = id('Xavier García Albiol')
const SANZ           = id('José Luis Sanz')
const CATALA         = id('María José Catalá')

// ─── Casa Real ────────────────────────────────────────────────────────
const FELIPE_VI      = id('Felipe VI')
const LETIZIA        = id('Letizia Ortiz')
const JUAN_CARLOS    = id('Juan Carlos I')

// ─── Justicia ─────────────────────────────────────────────────────────
const CONDE_PUMPIDO  = id('Cándido Conde-Pumpido')
const MARCHENA       = id('Manuel Marchena')
const LLARENA        = id('Pablo Llarena')
const LESMES         = id('Carlos Lesmes')
const DELGADO        = id('Dolores Delgado')
const GARCIA_ORTIZ   = id('Álvaro García Ortiz')
const CASTELLON      = id('Manuel García-Castellón')
const PEINADO        = id('Juan Carlos Peinado')

// ─── Casos judiciales ────────────────────────────────────────────────
const BEGONA         = id('Begoña Gómez')
const ABALOS         = id('José Luis Ábalos')
const KOLDO          = id('Koldo García')
const ALDAMA         = id('Víctor de Aldama')

// ─── Sindicatos y patronal ───────────────────────────────────────────
const SORDO          = id('Unai Sordo')
const ALVAREZ        = id('Pepe Álvarez')
const GARAMENDI      = id('Antonio Garamendi')
const LORENZO_AMOR   = id('Lorenzo Amor')
const GERARDO_CUERVA = id('Gerardo Cuerva')

// ─── Medios ──────────────────────────────────────────────────────────
const VALLES         = id('Vicente Vallés')
const PEPA_BUENO     = id('Pepa Bueno')
const MANSO          = id('Joaquín Manso')
const RUBIDO         = id('Bieito Rubido')
const PABLO_MOTOS    = id('Pablo Motos')
const EVOLE          = id('Jordi Évole')
const ANA_PASTOR     = id('Ana Pastor')
const GABILONDO      = id('Iñaki Gabilondo')
const FERRERAS       = id('Antonio García Ferreras')
const PEDROJOTA      = id('Pedro J. Ramírez')
const ANA_ROSA       = id('Ana Rosa Quintana')
const HERRERA        = id('Carlos Herrera')
const LOSANTOS       = id('Federico Jiménez Losantos')
const ALSINA         = id('Carlos Alsina')
const JULIA_OTERO    = id('Julia Otero')
const GRISO          = id('Susanna Griso')
const ANGELS         = id('Àngels Barceló')

// ─── Ex-presidentes / históricos ─────────────────────────────────────
const AZNAR          = id('José María Aznar')
const ZAPATERO       = id('José Luis Rodríguez Zapatero')
const RAJOY          = id('Mariano Rajoy')
const FELIPE_GONZ    = id('Felipe González')
const CASADO         = id('Pablo Casado')

// ─── Consejeros autonómicos clave ────────────────────────────────────
const OSSORIO        = id('Enrique Ossorio')
const MATUTE         = id('Fátima Matute')
const IZQUIERDO_CM   = id('Carlos Izquierdo')
const PACO_MADRID    = id('Mariano de Paco')
const GARCIA_MARTIN  = id('Miguel Ángel García Martín')
const N_MONTSERRAT   = id('Núria Montserrat')
const OLGA_PANE      = id('Olga Pané')
const NIUBO          = id('Esther Niubó')
const DALMAU         = id('Albert Dalmau')
const A_ROMERO       = id('Alícia Romero')
const PANEQUE        = id('Sílvia Paneque')
const A_SANZ         = id('Antonio Sanz')
const C_ESPANA       = id('Carolina España')
const C_CRESPO       = id('Carmen Crespo')
const ATUTXA         = id('Itxaso Atutxa')
const MIKEL_TORRES   = id('Mikel Torres')
const MJ_SAN_JOSE    = id('María Jesús San José')
const CARRIEDO       = id('Carlos Fernández Carriedo')
const I_BLANCO       = id('Isabel Blanco')
const VAQUERO        = id('Mar Vaquero')
const PRADALES       = id('Imanol Pradales')
const CHIVITE        = id('María Chivite')
const BURUAGA        = id('María José Sáenz de Buruaga')
const CAPELLAN       = id('Gonzalo Capellán')

// ─── Interior · cúpula civil ─────────────────────────────────────────
const PARDO_PIQUERAS = id('Francisco Pardo Piqueras')
const MERCEDES_GONZ  = id('Mercedes González')
const RAFAEL_PEREZ   = id('Rafael Pérez')
const PERE_NAVARRO   = id('Pere Navarro')

// ─── Moncloa · staff ─────────────────────────────────────────────────
const CRISOSTOMO     = id('Susana Crisóstomo')
const IVAN_REDONDO   = id('Iván Redondo')

// ─── Defensa · cúpula militar ────────────────────────────────────────
const LOPEZ_CALDERON = id('Teodoro López Calderón')
const ENSENAT        = id('Amador Enseñat')
const PINEIRO        = id('Antonio Piñeiro')
const BRACO_CARBO    = id('Francisco Braco Carbó')
const MESTRE         = id('Manuel Mestre')

// ─── Inteligencia · CNI ──────────────────────────────────────────────
const CASTELEIRO     = id('Esperanza Casteleiro')
const RELANZON       = id('Arturo Relanzón')

// ─── Más consejeros andaluces ────────────────────────────────────────
const PATRICIA_POZO  = id('Patricia del Pozo')
const ROCIO_DIAZ     = id('Rocío Díaz')
const BERNAL_ANDA    = id('Arturo Bernal')
const CATALINA_GAR   = id('Catalina García')

// ─── Galicia · gabinete Rueda ────────────────────────────────────────
const DIEGO_CALVO    = id('Diego Calvo')
const CORGOS         = id('Miguel Corgos')

// ─── Eurodiputados clave ─────────────────────────────────────────────
const IRATXE         = id('Iratxe García Pérez')
const GONZALEZ_PONS  = id('Esteban González Pons')
const MANU_PINEDA    = id('Manu Pineda')
const DIANA_RIBA     = id('Diana Riba')
const BARRENA        = id('Pernando Barrena')

// ─── Más alcaldes / sindicalistas ────────────────────────────────────
const SONSOLES       = id('Sonsoles Ónega')
const DARIAS         = id('Carolina Darias')
const CARBAYO        = id('Carlos García Carbayo')
const MARCIANO_GOM   = id('Marciano Gómez')
const MC_BARRERA     = id('Mari Carmen Barrera')
const MC_VICENTE     = id('Mari Cruz Vicente')
const PEPE_RUBIO     = id('Pepe Rubio')
const PEPE_ONETO     = id('Pepe Oneto')

// ─── Periodistas adicionales ─────────────────────────────────────────
const INAKI_LOPEZ    = id('Iñaki López')
const CRISTINA_PARDO = id('Cristina Pardo')
const HILARIO_PINO   = id('Hilario Pino')
const E_PALOMERA     = id('Esther Palomera')
const INDA           = id('Eduardo Inda')
const ABADILLO       = id('Casimiro García-Abadillo')
const ESCOLAR        = id('Ignacio Escolar')
const MARHUENDA      = id('Francisco Marhuenda')
const L_MENDEZ       = id('Lucía Méndez')
const L_HERRERO      = id('Luis Herrero')
const M_ROBLES_P     = id('Marta Robles')
const A_CANO         = id('Antonio Caño')
const NARANJO        = id('Antonio Naranjo')
const VELASCO        = id('Pilar Velasco')

// ─── Internacional ───────────────────────────────────────────────────
const VONDERLEYEN    = id('Ursula von der Leyen')
const COSTA          = id('António Costa')
const MACRON         = id('Emmanuel Macron')
const SCHOLZ         = id('Olaf Scholz')
const MELONI         = id('Giorgia Meloni')
const TRUMP          = id('Donald Trump')
const LULA           = id('Lula da Silva')
const MILEI          = id('Javier Milei')
const LEPEN          = id('Marine Le Pen')
const ORBAN          = id('Viktor Orbán')
const METSOLA        = id('Roberta Metsola')
const WEBER          = id('Manfred Weber')
const TUSK           = id('Donald Tusk')
const BORRELL        = id('Josep Borrell')
const CALVINO        = id('Nadia Calviño')
const RIBERA         = id('Teresa Ribera')

export const RELACIONES_EXPLICITAS: RelacionExplicita[] = [

  // ═══════════════════════════════════════════════════════════════════
  // 1 · COALICIÓN MONCLOA · PSOE núcleo
  // ═══════════════════════════════════════════════════════════════════
  { a: SANCHEZ, b: BOLANOS,      val:  94, tipo: 'aliado_partido',     label: 'Mano derecha · Ministro Presidencia y Justicia' },
  { a: SANCHEZ, b: MONTERO_PSOE, val:  92, tipo: 'aliado_partido',     label: 'Vicepresidenta 1ª · número 2 del Gobierno' },
  { a: SANCHEZ, b: ALBARES,      val:  85, tipo: 'aliado_partido',     label: 'Núcleo gubernamental · Asuntos Exteriores' },
  { a: SANCHEZ, b: ROBLES,       val:  82, tipo: 'aliado_partido',     label: 'Núcleo gubernamental · Defensa' },
  { a: SANCHEZ, b: MARLASKA,     val:  78, tipo: 'aliado_partido',     label: 'Núcleo gubernamental · Interior' },
  { a: SANCHEZ, b: CUERPO,       val:  76, tipo: 'aliado_partido',     label: 'Equipo económico · sucesor de Calviño' },
  { a: SANCHEZ, b: PLANAS,       val:  72, tipo: 'aliado_partido',     label: 'Ministro Agricultura · veterano del Gobierno' },
  { a: SANCHEZ, b: PUENTE,       val:  70, tipo: 'aliado_partido',     label: 'Ministro Transportes · combativo en redes' },
  { a: SANCHEZ, b: ALEGRIA,      val:  82, tipo: 'aliado_partido',     label: 'Ministra portavoz · cara mediática del Gobierno' },
  { a: SANCHEZ, b: AAGESEN,      val:  72, tipo: 'aliado_partido',     label: 'Vicepresidenta 3ª · Transición Ecológica' },
  { a: SANCHEZ, b: REDONDO,      val:  68, tipo: 'aliado_partido',     label: 'Ministra de Igualdad PSOE' },
  { a: SANCHEZ, b: SAIZ,         val:  68, tipo: 'aliado_partido',     label: 'Ministra Inclusión, Seg. Social y Migraciones' },
  { a: SANCHEZ, b: MORANT,       val:  72, tipo: 'aliado_partido',     label: 'Ministra Ciencia · líder PSPV oposición Valencia' },
  { a: SANCHEZ, b: HEREU,        val:  65, tipo: 'aliado_partido',     label: 'Ministro Industria · ex alcalde Barcelona' },
  { a: SANCHEZ, b: LOPEZ_TRANSF, val:  78, tipo: 'aliado_partido',     label: 'Ministro Transformación Digital · hombre de confianza' },
  { a: SANCHEZ, b: RODRIGUEZ,    val:  72, tipo: 'aliado_partido',     label: 'Ministra Vivienda · responsable política territorial' },
  { a: SANCHEZ, b: TORRES,       val:  70, tipo: 'aliado_partido',     label: 'Ministro Política Territorial · ex pte. Canarias' },
  { a: SANCHEZ, b: BERNABE,      val:  60, tipo: 'aliado_partido',     label: 'Delegada del Gobierno en Valencia · cara DANA' },

  // ═══════════════════════════════════════════════════════════════════
  // 2 · COALICIÓN MONCLOA · ala Sumar
  // ═══════════════════════════════════════════════════════════════════
  { a: SANCHEZ, b: YOLANDA,      val:  78, tipo: 'coalicion_gobierno', label: 'Coalición PSOE-Sumar · pacto Moncloa diciembre 2023' },
  { a: YOLANDA, b: MONICA_GARCIA, val:  92, tipo: 'aliado_partido',    label: 'Sumar · Ministra Sanidad · ex líder Más Madrid' },
  { a: YOLANDA, b: BUSTINDUY,    val:  90, tipo: 'aliado_partido',     label: 'Sumar · Ministro Derechos Sociales y Consumo' },
  { a: YOLANDA, b: URTASUN,      val:  88, tipo: 'aliado_partido',     label: 'Sumar · Ministro Cultura · ex eurodiputado verde' },
  { a: YOLANDA, b: SIRA_REGO,    val:  85, tipo: 'aliado_partido',     label: 'Sumar/IU · Ministra Juventud e Infancia' },
  { a: BUSTINDUY, b: MONICA_GARCIA, val: 78, tipo: 'aliado_partido',   label: 'Ministros Sumar · coordinación interna' },
  { a: BUSTINDUY, b: URTASUN,    val:  76, tipo: 'aliado_partido',     label: 'Ministros Sumar · coordinación interna' },
  { a: MONTERO_PSOE, b: YOLANDA, val:  62, tipo: 'coalicion_gobierno', label: 'Coordinación interna · Consejo de Ministros' },
  { a: BOLANOS,  b: YOLANDA,     val:  62, tipo: 'coalicion_gobierno', label: 'Mesa interpartidaria semanal de coalición' },
  { a: MONTERO_PSOE, b: CUERPO,  val:  82, tipo: 'aliado_partido',     label: 'Eje económico · Hacienda + Economía' },
  { a: ALBARES, b: BOLANOS,      val:  70, tipo: 'aliado_partido',     label: 'Eje exterior + presidencia · coordinación UE' },
  { a: ROBLES,  b: MARLASKA,     val:  76, tipo: 'aliado_partido',     label: 'Eje seguridad · Defensa + Interior' },
  { a: BOLANOS, b: MONTERO_PSOE, val:  78, tipo: 'aliado_partido',     label: 'Tándem táctico · presidencia + hacienda' },
  { a: BOLANOS, b: ALEGRIA,      val:  82, tipo: 'aliado_partido',     label: 'Eje comunicación · portavoz + presidencia' },

  // ═══════════════════════════════════════════════════════════════════
  // 3 · PACTO DE INVESTIDURA (socios externos)
  // ═══════════════════════════════════════════════════════════════════
  { a: SANCHEZ, b: PUIGDEMONT,   val:  55, tipo: 'pacto_investidura',  label: 'Pacto Junts · amnistía + concierto fiscal · noviembre 2023' },
  { a: SANCHEZ, b: ORTUZAR,      val:  72, tipo: 'pacto_investidura',  label: 'PNV · socio estable · transferencias CAV' },
  { a: SANCHEZ, b: RUFIAN,       val:  58, tipo: 'pacto_investidura',  label: 'ERC · negociación caso a caso' },
  { a: SANCHEZ, b: OTEGI,        val:  48, tipo: 'pacto_investidura',  label: 'EH Bildu · apoyo crítico desde 2023' },
  { a: SANCHEZ, b: PONTON,       val:  52, tipo: 'pacto_investidura',  label: 'BNG · diputada clave en investidura' },
  { a: SANCHEZ, b: CLAVIJO,      val:  35, tipo: 'pacto_investidura',  label: 'CC · apoyo puntual desde Canarias' },
  { a: SANCHEZ, b: AITOR_ESTEBAN, val: 62, tipo: 'pacto_investidura',  label: 'PNV portavoz Congreso · interlocución directa' },
  { a: SANCHEZ, b: AIZPURUA,     val:  45, tipo: 'pacto_investidura',  label: 'Bildu portavoz Congreso · apoyos críticos' },
  { a: BOLANOS, b: PUIGDEMONT,   val:  35, tipo: 'mediador',           label: 'Negociador del gobierno · reuniones Suiza/Bruselas' },
  { a: BOLANOS, b: ORTUZAR,      val:  62, tipo: 'pacto_investidura',  label: 'Negociador de Moncloa con PNV' },
  { a: BOLANOS, b: RUFIAN,       val:  48, tipo: 'pacto_investidura',  label: 'Negociador de Moncloa con ERC' },
  { a: BOLANOS, b: JUNQUERAS,    val:  42, tipo: 'pacto_investidura',  label: 'Interlocución con ERC · post-indulto' },
  { a: MONTERO_PSOE, b: JUNQUERAS, val: 55, tipo: 'pacto_investidura', label: 'Negociación financiación singular Cataluña' },
  { a: YOLANDA, b: RUFIAN,       val:  55, tipo: 'pacto_investidura',  label: 'Sumar próximo a ERC · alianzas verdes en Congreso' },
  { a: YOLANDA, b: OTEGI,        val:  48, tipo: 'pacto_investidura',  label: 'Sumar y Bildu coordinan posiciones progresistas' },
  { a: YOLANDA, b: PONTON,       val:  58, tipo: 'pacto_investidura',  label: 'Sumar y BNG · alianza progresista periférica' },
  { a: AITOR_ESTEBAN, b: ORTUZAR, val: 90, tipo: 'aliado_partido',     label: 'Núcleo PNV · presidente del partido + portavoz' },
  { a: AIZPURUA, b: OTEGI,       val:  88, tipo: 'aliado_partido',     label: 'Núcleo EH Bildu · líder histórico + portavoz' },
  { a: ROVIRA,   b: JUNQUERAS,   val:  85, tipo: 'aliado_partido',     label: 'Cúpula ERC · ex secretaria + presidente' },

  // ═══════════════════════════════════════════════════════════════════
  // 4 · COALICIONES PP-VOX y rupturas AUTONÓMICAS
  // ═══════════════════════════════════════════════════════════════════
  { a: MAZON,    b: ABASCAL,     val:  60, tipo: 'pacto_autonomico',   label: 'Gobierno PP-Vox Valencia · continuidad tras DANA' },
  { a: AZCON,    b: ABASCAL,     val:  65, tipo: 'pacto_autonomico',   label: 'Coalición PP-Vox · Aragón 2023' },
  { a: PROHENS,  b: ABASCAL,     val:  55, tipo: 'pacto_autonomico',   label: 'Acuerdo de investidura PP-Vox · Baleares' },
  { a: LOPEZ_MIRAS, b: ABASCAL,  val: -30, tipo: 'ruptura_coalicion',  label: 'Ruptura coalición Murcia 2024 · sin acuerdo migratorio' },
  { a: MANUECO,  b: ABASCAL,     val: -25, tipo: 'ruptura_coalicion',  label: 'Vox abandona gobierno Castilla y León · 2024' },
  { a: GUARDIOLA, b: ABASCAL,    val: -28, tipo: 'ruptura_coalicion',  label: 'Vox abandona gobierno Extremadura · 2024' },
  { a: AYUSO,    b: ABASCAL,     val:  20, tipo: 'critica_publica',    label: 'Competencia por electorado derecho en Madrid' },
  { a: MORENO,   b: ABASCAL,     val:  18, tipo: 'critica_publica',    label: 'Mayoría absoluta PP Andalucía · sin coalición' },

  // ═══════════════════════════════════════════════════════════════════
  // 5 · PP NACIONAL · cohesión interna
  // ═══════════════════════════════════════════════════════════════════
  { a: FEIJOO, b: GAMARRA,       val:  88, tipo: 'aliado_partido',     label: 'Secretaria general PP · número 2 nacional' },
  { a: FEIJOO, b: SEMPER,        val:  85, tipo: 'aliado_partido',     label: 'Portavoz nacional PP · cara mediática' },
  { a: FEIJOO, b: TELLADO,       val:  88, tipo: 'aliado_partido',     label: 'Vicesecretario Organización · jefe de campaña' },
  { a: FEIJOO, b: BENDODO,       val:  78, tipo: 'aliado_partido',     label: 'Coordinador general PP · antiguo guardia pretoriana' },
  { a: FEIJOO, b: MORENO,        val:  82, tipo: 'aliado_partido',     label: 'Aliado clave PP nacional · referente moderado' },
  { a: FEIJOO, b: MAZON,         val:  58, tipo: 'aliado_partido',     label: 'PP nacional · barón valenciano con tensiones DANA' },
  { a: FEIJOO, b: AZCON,         val:  72, tipo: 'aliado_partido',     label: 'PP nacional · barón aragonés' },
  { a: FEIJOO, b: RUEDA,         val:  82, tipo: 'aliado_partido',     label: 'PP nacional · sucesión gallega de Feijóo' },
  { a: FEIJOO, b: MANUECO,       val:  65, tipo: 'aliado_partido',     label: 'PP nacional · barón Castilla y León' },
  { a: FEIJOO, b: PROHENS,       val:  68, tipo: 'aliado_partido',     label: 'PP nacional · presidenta Baleares' },
  { a: FEIJOO, b: GUARDIOLA,     val:  62, tipo: 'aliado_partido',     label: 'PP nacional · barona Extremadura' },
  { a: FEIJOO, b: AYUSO,         val: -45, tipo: 'rivalidad_interna',  label: 'Tensión Génova-Sol · disputa por liderazgo derecha' },
  { a: GAMARRA, b: SEMPER,       val:  82, tipo: 'aliado_partido',     label: 'Núcleo PP · SG + portavoz parlamentario' },
  { a: GAMARRA, b: TELLADO,      val:  78, tipo: 'aliado_partido',     label: 'Cúpula PP · sec. gral + organización' },
  { a: GAMARRA, b: BENDODO,      val:  72, tipo: 'aliado_partido',     label: 'Núcleo PP · coordinación territorial' },
  { a: SEMPER,  b: TELLADO,      val:  72, tipo: 'aliado_partido',     label: 'Engranaje PP · portavoz + organización' },
  { a: AYUSO,   b: GAMARRA,      val: -28, tipo: 'rivalidad_interna',  label: 'Tensión Madrid-Génova · disputa narrativas' },
  { a: AYUSO,   b: TELLADO,      val: -22, tipo: 'rivalidad_interna',  label: 'Tensión campaña · Madrid vs aparato nacional' },
  { a: AYUSO,   b: ALMEIDA,      val:  85, tipo: 'aliado_partido',     label: 'Eje Madrid PP · Comunidad + Ayuntamiento' },
  { a: AYUSO,   b: MONASTERIO,   val: -32, tipo: 'critica_publica',    label: 'Competencia electoral Madrid PP vs Vox' },
  { a: CAYETANA, b: FEIJOO,      val:  18, tipo: 'critica_publica',    label: 'Crítica interna recurrente · diputada disidente' },

  // ═══════════════════════════════════════════════════════════════════
  // 6 · VOX NÚCLEO Y RUPTURAS
  // ═══════════════════════════════════════════════════════════════════
  { a: ABASCAL, b: ORTEGA_SMITH, val:  82, tipo: 'aliado_partido',     label: 'Núcleo VOX · sec. adjunto + concejal Madrid' },
  { a: ABASCAL, b: MONASTERIO,   val:  78, tipo: 'aliado_partido',     label: 'Núcleo VOX · presidenta Madrid + esposa' },
  { a: ORTEGA_SMITH, b: MONASTERIO, val: 70, tipo: 'aliado_partido',   label: 'Eje VOX Madrid' },
  { a: ABASCAL, b: ESPINOSA,     val: -45, tipo: 'rivalidad_interna',  label: 'Espinosa de los Monteros dimite por choque interno · 2023' },
  { a: ESPINOSA, b: ORTEGA_SMITH, val: -30, tipo: 'critica_publica',   label: 'Tensión entre ex portavoz y ala dura' },

  // ═══════════════════════════════════════════════════════════════════
  // 7 · PODEMOS · ruptura con SUMAR
  // ═══════════════════════════════════════════════════════════════════
  { a: BELARRA, b: IGLESIAS,     val:  92, tipo: 'aliado_partido',     label: 'Núcleo Podemos · pareja política y personal' },
  { a: BELARRA, b: IRENE_MONTERO, val: 92, tipo: 'aliado_partido',     label: 'Cúpula Podemos · líder + ex ministra Igualdad' },
  { a: BELARRA, b: ECHENIQUE,    val:  82, tipo: 'aliado_partido',     label: 'Núcleo Podemos · líder + estratega digital' },
  { a: IGLESIAS, b: IRENE_MONTERO, val: 95, tipo: 'aliado_partido',    label: 'Núcleo Podemos · pareja personal y política' },
  { a: IGLESIAS, b: ECHENIQUE,   val:  82, tipo: 'aliado_partido',     label: 'Camarilla histórica Podemos' },
  { a: BELARRA, b: YOLANDA,      val: -68, tipo: 'rivalidad_interna',  label: 'Ruptura Podemos-Sumar · Podemos sale del grupo en 2023' },
  { a: IGLESIAS, b: YOLANDA,     val: -62, tipo: 'rivalidad_interna',  label: 'Crítica pública desde Canal Red · contra Yolanda' },
  { a: IRENE_MONTERO, b: YOLANDA, val: -55, tipo: 'rivalidad_interna', label: 'Tensiones por candidatura europea de Podemos' },
  { a: BELARRA, b: MONICA_GARCIA, val: -45, tipo: 'critica_publica',   label: 'Choque Podemos vs Sumar en políticas sociales' },

  // ═══════════════════════════════════════════════════════════════════
  // 8 · OPOSICIÓN FRONTAL entre líderes
  // ═══════════════════════════════════════════════════════════════════
  { a: SANCHEZ, b: FEIJOO,       val: -78, tipo: 'oposicion_frontal',  label: 'Confrontación parlamentaria semanal · sesión de control' },
  { a: SANCHEZ, b: ABASCAL,      val: -92, tipo: 'oposicion_frontal',  label: 'Extrema oposición · objetivo prioritario de Vox' },
  { a: SANCHEZ, b: AYUSO,        val: -88, tipo: 'oposicion_frontal',  label: 'Rivalidad pública continuada · Madrid vs Moncloa' },
  { a: FEIJOO,  b: ABASCAL,      val: -38, tipo: 'critica_publica',    label: 'Competencia por espacio derecho · choques tácticos' },
  { a: YOLANDA, b: FEIJOO,       val: -55, tipo: 'oposicion_frontal',  label: 'Choque parlamentario semanal' },
  { a: YOLANDA, b: ABASCAL,      val: -82, tipo: 'oposicion_frontal',  label: 'Antagonismo total · debate visceral' },
  { a: BOLANOS, b: AYUSO,        val: -75, tipo: 'oposicion_frontal',  label: 'Choque institucional Moncloa-Sol' },
  { a: BOLANOS, b: FEIJOO,       val: -65, tipo: 'oposicion_frontal',  label: 'Choque en Congreso · CGPJ + reformas' },
  { a: MONTERO_PSOE, b: FEIJOO,  val: -62, tipo: 'oposicion_frontal',  label: 'Choque por financiación autonómica' },
  { a: MONTERO_PSOE, b: AYUSO,   val: -78, tipo: 'oposicion_frontal',  label: 'Choque fiscal · Andalucía + Madrid contra Hacienda' },
  { a: PUENTE,  b: AYUSO,        val: -65, tipo: 'critica_publica',    label: 'Choque público recurrente en redes' },
  { a: PUENTE,  b: FEIJOO,       val: -55, tipo: 'critica_publica',    label: 'Choque público recurrente · Twitter' },
  { a: ABASCAL, b: BELARRA,      val: -85, tipo: 'oposicion_frontal',  label: 'Antagonismo ideológico extremo' },
  { a: ABASCAL, b: IGLESIAS,     val: -90, tipo: 'oposicion_frontal',  label: 'Histórica enemistad pública · debates electorales' },
  { a: ABASCAL, b: OTEGI,        val: -95, tipo: 'oposicion_frontal',  label: 'Extremos opuestos · sin punto de encuentro' },
  { a: ABASCAL, b: PUIGDEMONT,   val: -92, tipo: 'oposicion_frontal',  label: 'Vox impulsa querellas contra el procés' },

  // ═══════════════════════════════════════════════════════════════════
  // 9 · RIVALIDADES INTERNAS PSOE
  // ═══════════════════════════════════════════════════════════════════
  { a: SANCHEZ, b: PAGE,         val: -62, tipo: 'rivalidad_interna',  label: 'Crítico público · contra amnistía y financiación singular' },
  { a: SANCHEZ, b: LAMBAN,       val: -65, tipo: 'rivalidad_interna',  label: 'Voz disidente · ex barón aragonés crítico' },
  { a: SANCHEZ, b: SUSANA_DIAZ,  val: -58, tipo: 'rivalidad_interna',  label: 'Rivalidad histórica · primarias 2017' },
  { a: SANCHEZ, b: FELIPE_GONZ,  val: -42, tipo: 'critica_publica',    label: 'Ex pte crítico · amnistía y financiación singular' },
  { a: SANCHEZ, b: ZAPATERO,     val:  72, tipo: 'aliado_partido',     label: 'Aliado histórico · respaldo público a amnistía' },
  { a: PAGE,    b: LAMBAN,       val:  72, tipo: 'aliado_partido',     label: 'Eje de barones críticos PSOE · coordinación pública' },
  { a: PAGE,    b: SUSANA_DIAZ,  val:  62, tipo: 'aliado_partido',     label: 'Bloque de barones críticos · sintonía privada' },
  { a: LAMBAN,  b: SUSANA_DIAZ,  val:  55, tipo: 'aliado_partido',     label: 'Bloque de barones críticos PSOE' },
  { a: PAGE,    b: ZAPATERO,     val: -32, tipo: 'critica_publica',    label: 'Discrepancia pública sobre amnistía' },
  { a: PAGE,    b: FELIPE_GONZ,  val:  48, tipo: 'aliado_partido',     label: 'Eje crítico moderado · contra concierto fiscal' },
  { a: LAMBAN,  b: FELIPE_GONZ,  val:  42, tipo: 'aliado_partido',     label: 'Ex barones + ex presidente · agenda compartida' },

  // ═══════════════════════════════════════════════════════════════════
  // 10 · EJE EX-PRESIDENTES
  // ═══════════════════════════════════════════════════════════════════
  { a: FEIJOO, b: AZNAR,         val:  35, tipo: 'critica_publica',    label: 'Aznar presiona desde FAES · estrategia más dura' },
  { a: FEIJOO, b: RAJOY,         val:  68, tipo: 'aliado_partido',     label: 'Sucesor designado · padrino interno' },
  { a: FEIJOO, b: CASADO,        val:  18, tipo: 'critica_publica',    label: 'Casado fuera del partido tras moción interna 2022' },
  { a: AYUSO,  b: AZNAR,         val:  62, tipo: 'aliado_partido',     label: 'Aliada del aznarismo dentro del PP' },
  { a: AZNAR,  b: RAJOY,         val:  58, tipo: 'aliado_partido',     label: 'Generaciones PP · sintonía estratégica' },
  { a: AZNAR,  b: CASADO,        val: -42, tipo: 'critica_publica',    label: 'Aznar deja caer a Casado en moción 2022' },
  { a: AZNAR,  b: SANCHEZ,       val: -82, tipo: 'oposicion_frontal',  label: 'Ataque público continuado al Gobierno desde FAES' },
  { a: AZNAR,  b: ZAPATERO,      val: -75, tipo: 'oposicion_frontal',  label: 'Antagonismo histórico desde la era 2004' },
  { a: AZNAR,  b: FELIPE_GONZ,   val:  20, tipo: 'critica_publica',    label: 'Sintonía sorprendente contra amnistía' },
  { a: RAJOY,  b: SANCHEZ,       val: -55, tipo: 'oposicion_frontal',  label: 'Moción de censura 2018 · ruptura histórica' },
  { a: RAJOY,  b: ZAPATERO,      val: -45, tipo: 'critica_publica',    label: 'Rivalidad histórica ex-presidentes' },
  { a: CASADO, b: AYUSO,         val: -68, tipo: 'rivalidad_interna',  label: 'Choque Ayuso-Casado 2022 · fin de Casado' },

  // ═══════════════════════════════════════════════════════════════════
  // 11 · CONFLICTOS TERRITORIALES (CCAA vs Moncloa)
  // ═══════════════════════════════════════════════════════════════════
  { a: AYUSO,   b: BOLANOS,      val: -78, tipo: 'conflicto_territorial', label: 'Choque permanente Comunidad de Madrid vs Moncloa' },
  { a: AYUSO,   b: MONTERO_PSOE, val: -82, tipo: 'conflicto_territorial', label: 'Pugna fiscal · armonización vs autonomía' },
  { a: MORENO,  b: SANCHEZ,      val: -45, tipo: 'conflicto_territorial', label: 'Choque por financiación autonómica' },
  { a: MORENO,  b: MONTERO_PSOE, val: -52, tipo: 'conflicto_territorial', label: 'Choque PP Andalucía vs Hacienda' },
  { a: MAZON,   b: SANCHEZ,      val: -65, tipo: 'conflicto_territorial', label: 'Gestión DANA Valencia · reproches mutuos' },
  { a: MAZON,   b: BERNABE,      val: -78, tipo: 'oposicion_frontal',     label: 'DANA · ataques públicos entre Generalitat y delegada' },
  { a: MAZON,   b: MORANT,       val: -58, tipo: 'oposicion_frontal',     label: 'DANA · líder PSPV ataca al president' },
  { a: ALMEIDA, b: SANCHEZ,      val: -68, tipo: 'conflicto_territorial', label: 'Ayuntamiento Madrid vs Moncloa · pulso recurrente' },
  { a: ALMEIDA, b: BOLANOS,      val: -55, tipo: 'oposicion_frontal',     label: 'Choques institucionales por uso del Senado' },
  { a: PAGE,    b: ARAGONES,     val: -55, tipo: 'conflicto_territorial', label: 'Page rechaza financiación singular Cataluña' },
  { a: PAGE,    b: PUIGDEMONT,   val: -72, tipo: 'oposicion_frontal',     label: 'Page contra la amnistía desde dentro del PSOE' },
  { a: PAGE,    b: ILLA,         val: -32, tipo: 'critica_publica',       label: 'Tensión PSC-PSOE Castilla-La Mancha por concierto' },
  { a: LAMBAN,  b: ARAGONES,     val: -48, tipo: 'conflicto_territorial', label: 'Lambán rechaza financiación singular catalana' },
  { a: LOPEZ_MIRAS, b: SANCHEZ,  val: -55, tipo: 'conflicto_territorial', label: 'Pulso por trasvase Tajo-Segura' },
  { a: ALBIOL,  b: BOLANOS,      val: -50, tipo: 'critica_publica',       label: 'Alcalde Badalona PP · choques públicos' },
  { a: SANZ,    b: SANCHEZ,      val: -42, tipo: 'critica_publica',       label: 'Alcalde Sevilla PP · oposición desde la calle' },

  // ═══════════════════════════════════════════════════════════════════
  // 12 · CATALUÑA · tensiones internas
  // ═══════════════════════════════════════════════════════════════════
  { a: PUIGDEMONT, b: JUNQUERAS, val: -68, tipo: 'rivalidad_interna',   label: 'Rivalidad histórica Junts-ERC por liderazgo independentista' },
  { a: PUIGDEMONT, b: ARAGONES,  val: -55, tipo: 'conflicto_territorial', label: 'Junts vs ERC · disputa estrategia independentista' },
  { a: PUIGDEMONT, b: ILLA,      val: -72, tipo: 'oposicion_frontal',   label: 'Independentismo vs PSC · gobierno Generalitat' },
  { a: JUNQUERAS, b: ILLA,       val: -58, tipo: 'oposicion_frontal',   label: 'Tensión ERC-PSC tras pacto Govern 2024' },
  { a: ARAGONES, b: JUNQUERAS,   val: -28, tipo: 'rivalidad_interna',   label: 'Tensión interna ERC tras pacto investidura' },
  { a: PUIGDEMONT, b: ROVIRA,    val: -45, tipo: 'critica_publica',     label: 'Tensión durante exilio · estrategias divergentes' },
  { a: ILLA,    b: COLLBONI,     val:  88, tipo: 'aliado_partido',      label: 'Eje PSC · Generalitat + alcaldía Barcelona' },
  { a: ILLA,    b: SANCHEZ,      val:  85, tipo: 'aliado_partido',      label: 'PSC alineado · president gracias a investidura PSOE' },

  // ═══════════════════════════════════════════════════════════════════
  // 13 · PAÍS VASCO
  // ═══════════════════════════════════════════════════════════════════
  { a: ORTUZAR, b: OTEGI,        val: -42, tipo: 'rivalidad_interna',   label: 'Rivalidad PNV-EH Bildu · liderazgo abertzale' },
  { a: AITOR_ESTEBAN, b: AIZPURUA, val: -38, tipo: 'critica_publica',   label: 'Tensión portavoces PNV vs Bildu' },

  // ═══════════════════════════════════════════════════════════════════
  // 14 · CASOS JUDICIALES (activos en 2024-2025)
  // ═══════════════════════════════════════════════════════════════════
  { a: SANCHEZ,  b: BEGONA,      val:  95, tipo: 'aliado_partido',     label: 'Esposa del presidente · objeto de instrucción judicial' },
  { a: SANCHEZ,  b: PEINADO,     val: -78, tipo: 'conflicto_judicial', label: 'Juez instructor del caso Begoña Gómez · investiga entorno' },
  { a: BEGONA,   b: PEINADO,     val: -92, tipo: 'conflicto_judicial', label: 'Investigada por presunto tráfico de influencias' },
  { a: AYUSO,    b: GARCIA_ORTIZ, val: -82, tipo: 'conflicto_judicial', label: 'Caso González Amador · filtración correo · imputado' },
  { a: AYUSO,    b: SANCHEZ,     val: -88, tipo: 'oposicion_frontal',  label: 'Rivalidad pública continuada · Madrid vs Moncloa' },
  { a: SANCHEZ,  b: CASTELLON,   val: -68, tipo: 'conflicto_judicial', label: 'Juez instructor caso Koldo · audiencia Nacional' },
  { a: ABALOS,   b: SANCHEZ,     val: -55, tipo: 'rivalidad_interna',  label: 'Caso Koldo · expulsado del grupo PSOE' },
  { a: ABALOS,   b: KOLDO,       val:  82, tipo: 'aliado_partido',     label: 'Ex ministro + asesor de confianza · vínculo personal' },
  { a: KOLDO,    b: CASTELLON,   val: -92, tipo: 'conflicto_judicial', label: 'Imputado en caso mascarillas y comisiones' },
  { a: ALDAMA,   b: SANCHEZ,     val: -75, tipo: 'conflicto_judicial', label: 'Empresario · acusa al Gobierno y al PSOE' },
  { a: ALDAMA,   b: ABALOS,      val: -65, tipo: 'conflicto_judicial', label: 'Aldama implica directamente a Ábalos' },
  { a: ALDAMA,   b: CASTELLON,   val: -88, tipo: 'conflicto_judicial', label: 'Investigado por trama hidrocarburos · colabora con instrucción' },
  { a: KOLDO,    b: ALDAMA,      val: -45, tipo: 'critica_publica',    label: 'Versiones contradictorias en el caso Koldo' },
  { a: GARCIA_ORTIZ, b: BOLANOS, val:  68, tipo: 'aliado_partido',     label: 'Fiscal General nombrado por el Gobierno · sintonía' },
  { a: GARCIA_ORTIZ, b: SANCHEZ, val:  72, tipo: 'aliado_partido',     label: 'Fiscal General · nombramiento del Gobierno PSOE' },
  { a: GARCIA_ORTIZ, b: DELGADO, val:  78, tipo: 'aliado_partido',     label: 'Continuidad · sucesor de Delgado en Fiscalía' },
  { a: GARCIA_ORTIZ, b: MARCHENA, val: -55, tipo: 'critica_publica',   label: 'Tensión Fiscalía-TS · agenda judicial' },
  { a: CONDE_PUMPIDO, b: MARCHENA, val: -55, tipo: 'critica_publica',  label: 'TC vs TS · pulso doctrinal sobre amnistía' },
  { a: SANCHEZ,       b: MARCHENA, val: -45, tipo: 'conflicto_judicial', label: 'Pulso institucional · amnistía y caso Procés' },
  { a: SANCHEZ,       b: CONDE_PUMPIDO, val: 42, tipo: 'aliado_partido', label: 'Presidente TC · nombramiento del gobierno PSOE' },
  { a: SANCHEZ,       b: LESMES,   val: -38, tipo: 'critica_publica',  label: 'Tensión histórica · bloqueo renovación CGPJ' },
  { a: FEIJOO,        b: LESMES,   val:  35, tipo: 'aliado_partido',   label: 'Sintonía sobre renovación judicial' },
  { a: SANCHEZ,       b: DELGADO,  val:  62, tipo: 'aliado_partido',   label: 'Ex Ministra Justicia y Fiscal General · designada por su gobierno' },
  { a: LLARENA, b: PUIGDEMONT,    val: -95, tipo: 'conflicto_judicial', label: 'Instructor causa Procés · órdenes europeas de detención rechazadas' },
  { a: MARCHENA, b: PUIGDEMONT,   val: -92, tipo: 'conflicto_judicial', label: 'Presidente Sala que sentenció el Procés en 2019' },
  { a: MARCHENA, b: JUNQUERAS,    val: -85, tipo: 'conflicto_judicial', label: 'Sentenció a Junqueras a 13 años · STC 459/2019' },
  { a: LLARENA,  b: JUNQUERAS,    val: -78, tipo: 'conflicto_judicial', label: 'Instructor causa Procés · investigación Junqueras' },
  { a: CONDE_PUMPIDO, b: CASTELLON, val: -42, tipo: 'critica_publica', label: 'Tensión instrucción casos vs TC · Procés y Koldo' },

  // ═══════════════════════════════════════════════════════════════════
  // 15 · BLOQUEO LEGISLATIVO
  // ═══════════════════════════════════════════════════════════════════
  { a: FEIJOO,  b: BOLANOS,      val: -68, tipo: 'bloqueo_legislativo', label: 'Bloqueo de renovación CGPJ + reformas judiciales' },
  { a: PUIGDEMONT, b: BOLANOS,   val: -42, tipo: 'bloqueo_legislativo', label: 'Junts bloquea decretos del Gobierno · presión recurrente' },
  { a: PUIGDEMONT, b: YOLANDA,   val: -38, tipo: 'bloqueo_legislativo', label: 'Junts bloquea decretos laborales y reformas Sumar' },
  { a: ABASCAL, b: YOLANDA,      val: -85, tipo: 'oposicion_frontal',   label: 'Vox impulsa enmiendas contra leyes Sumar' },

  // ═══════════════════════════════════════════════════════════════════
  // 16 · CASA REAL
  // ═══════════════════════════════════════════════════════════════════
  { a: FELIPE_VI, b: SANCHEZ,    val:  32, tipo: 'mediador',          label: 'Diálogo formal Moncloa-Zarzuela · enfriamiento por amnistía' },
  { a: FELIPE_VI, b: FEIJOO,     val:  38, tipo: 'mediador',          label: 'Reuniones de audiencia · sintonía institucional' },
  { a: FELIPE_VI, b: YOLANDA,    val:  28, tipo: 'mediador',          label: 'Audiencias formales como vicepresidenta' },
  { a: FELIPE_VI, b: LETIZIA,    val:  98, tipo: 'aliado_partido',    label: 'Matrimonio · pareja institucional' },
  { a: FELIPE_VI, b: JUAN_CARLOS, val: -68, tipo: 'rivalidad_interna', label: 'Tensión familiar · retirada de funciones y exilio Abu Dabi' },
  { a: JUAN_CARLOS, b: SANCHEZ,  val: -52, tipo: 'critica_publica',   label: 'Sánchez no facilita regreso del rey emérito a España' },
  { a: LETIZIA,   b: JUAN_CARLOS, val: -55, tipo: 'critica_publica',  label: 'Tensión histórica con su suegro · documentada' },

  // ═══════════════════════════════════════════════════════════════════
  // 17 · SINDICATOS Y PATRONAL
  // ═══════════════════════════════════════════════════════════════════
  { a: SORDO,   b: ALVAREZ,      val:  85, tipo: 'aliado_sindical',   label: 'Coordinación CCOO-UGT · mesa diálogo social' },
  { a: SORDO,   b: GARAMENDI,    val: -45, tipo: 'oposicion_frontal', label: 'Negociación SMI · choque salarios mínimos' },
  { a: ALVAREZ, b: GARAMENDI,    val: -42, tipo: 'oposicion_frontal', label: 'Negociación SMI · choque salarios mínimos' },
  { a: YOLANDA, b: SORDO,        val:  68, tipo: 'aliado_sindical',   label: 'Sindicatos alineados con reformas laborales Sumar' },
  { a: YOLANDA, b: ALVAREZ,      val:  65, tipo: 'aliado_sindical',   label: 'Sindicatos alineados con reformas laborales Sumar' },
  { a: BUSTINDUY, b: SORDO,      val:  68, tipo: 'aliado_sindical',   label: 'Ministerio Sumar próximo a CCOO · derechos sociales' },
  { a: BUSTINDUY, b: ALVAREZ,    val:  65, tipo: 'aliado_sindical',   label: 'Ministerio Sumar próximo a UGT' },
  { a: YOLANDA, b: GARAMENDI,    val: -52, tipo: 'oposicion_frontal', label: 'Negociación tripartita · tensión con patronal' },
  { a: MONTERO_PSOE, b: GARAMENDI, val: -42, tipo: 'critica_publica', label: 'Tensión fiscal · subida impuestos al capital' },
  { a: SANCHEZ, b: GARAMENDI,    val:  25, tipo: 'mediador',          label: 'Reuniones periódicas · diálogo institucional' },
  { a: CUERPO,  b: GARAMENDI,    val:  42, tipo: 'mediador',          label: 'Diálogo Economía-CEOE · estabilidad macroeconómica' },
  { a: SORDO,   b: MONTERO_PSOE, val:  48, tipo: 'aliado_sindical',   label: 'Coordinación SMI · alianza táctica' },
  { a: ALVAREZ, b: MONTERO_PSOE, val:  45, tipo: 'aliado_sindical',   label: 'Coordinación SMI · alianza táctica' },
  { a: GARAMENDI, b: LORENZO_AMOR, val: 85, tipo: 'aliado_partido',   label: 'Cúpula CEOE · presidente + vicepresidente ATA' },
  { a: GARAMENDI, b: GERARDO_CUERVA, val: 78, tipo: 'aliado_partido', label: 'CEOE + CEPYME · representación empresarial' },
  { a: GARAMENDI, b: FEIJOO,     val:  62, tipo: 'aliado_partido',    label: 'Sintonía CEOE-PP en agenda económica' },
  { a: LORENZO_AMOR, b: YOLANDA, val: -52, tipo: 'oposicion_frontal', label: 'ATA contra reformas laborales · jornada y SMI' },

  // ═══════════════════════════════════════════════════════════════════
  // 18 · AFINIDAD MEDIÁTICA (eje editorial)
  // ═══════════════════════════════════════════════════════════════════
  { a: PEPA_BUENO, b: SANCHEZ,   val:  38, tipo: 'aliado_mediatico',  label: 'El País · línea editorial progresista PRISA' },
  { a: MANSO,      b: FEIJOO,    val:  42, tipo: 'aliado_mediatico',  label: 'El Mundo · cobertura crítica con el gobierno' },
  { a: MANSO,      b: SANCHEZ,   val: -45, tipo: 'critica_publica',   label: 'El Mundo · línea crítica contra el Gobierno' },
  { a: RUBIDO,     b: FEIJOO,    val:  45, tipo: 'aliado_mediatico',  label: 'El Debate · agenda conservadora cercana al PP' },
  { a: RUBIDO,     b: ABASCAL,   val:  35, tipo: 'aliado_mediatico',  label: 'El Debate · sin filtro a posiciones de Vox' },
  { a: PEDROJOTA,  b: FEIJOO,    val:  35, tipo: 'aliado_mediatico',  label: 'El Español · escrutinio al gobierno' },
  { a: PEDROJOTA,  b: SANCHEZ,   val: -55, tipo: 'critica_publica',   label: 'El Español · cobertura crítica permanente' },
  { a: PABLO_MOTOS, b: AYUSO,    val:  40, tipo: 'aliado_mediatico',  label: 'El Hormiguero · audiencia masiva amigable a Ayuso' },
  { a: PABLO_MOTOS, b: FEIJOO,   val:  30, tipo: 'aliado_mediatico',  label: 'El Hormiguero · entrevistas favorables a la oposición' },
  { a: EVOLE,      b: YOLANDA,   val:  35, tipo: 'aliado_mediatico',  label: 'Lo de Évole · entrevistas afines a la izquierda' },
  { a: GABILONDO,  b: SANCHEZ,   val:  32, tipo: 'aliado_mediatico',  label: 'Voz histórica · línea editorial progresista' },
  { a: GABILONDO,  b: AZNAR,     val: -42, tipo: 'critica_publica',   label: 'Histórico antagonismo desde la era Aznar' },
  { a: FERRERAS,   b: SANCHEZ,   val:  38, tipo: 'aliado_mediatico',  label: 'La Sexta · cobertura matizadamente progresista' },
  { a: FERRERAS,   b: YOLANDA,   val:  35, tipo: 'aliado_mediatico',  label: 'La Sexta · tribuna habitual de Sumar' },
  { a: VALLES,     b: FEIJOO,    val:  28, tipo: 'aliado_mediatico',  label: 'Antena 3 · línea editorial moderada centro-derecha' },
  { a: ANA_PASTOR, b: SANCHEZ,   val:  20, tipo: 'mediador',          label: 'Newtral · fact-checking riguroso a todos los partidos' },
  { a: ANA_ROSA,   b: FEIJOO,    val:  48, tipo: 'aliado_mediatico',  label: 'Programa matinal · cobertura afín al PP' },
  { a: ANA_ROSA,   b: SANCHEZ,   val: -50, tipo: 'critica_publica',   label: 'Línea editorial Telecinco · crítica al Gobierno' },
  { a: HERRERA,    b: FEIJOO,    val:  52, tipo: 'aliado_mediatico',  label: 'COPE · línea conservadora afín al PP' },
  { a: HERRERA,    b: ABASCAL,   val:  38, tipo: 'aliado_mediatico',  label: 'COPE · tribuna habitual de Vox' },
  { a: HERRERA,    b: SANCHEZ,   val: -55, tipo: 'critica_publica',   label: 'COPE · crítica permanente al Gobierno' },
  { a: LOSANTOS,   b: ABASCAL,   val:  55, tipo: 'aliado_mediatico',  label: 'esRadio · tribuna ultra-derecha' },
  { a: LOSANTOS,   b: AYUSO,     val:  68, tipo: 'aliado_mediatico',  label: 'esRadio · respaldo permanente a Ayuso' },
  { a: LOSANTOS,   b: SANCHEZ,   val: -82, tipo: 'critica_publica',   label: 'esRadio · ataque diario al Gobierno' },
  { a: LOSANTOS,   b: FEIJOO,    val:  22, tipo: 'critica_publica',   label: 'Tensión con la línea de Génova · más cerca de Vox' },
  { a: ALSINA,     b: FEIJOO,    val:  35, tipo: 'aliado_mediatico',  label: 'Onda Cero · cobertura moderada centro-derecha' },
  { a: ALSINA,     b: SANCHEZ,   val: -32, tipo: 'critica_publica',   label: 'Onda Cero · entrevistas incisivas al presidente' },
  { a: JULIA_OTERO, b: SANCHEZ,  val:  32, tipo: 'aliado_mediatico',  label: 'Onda Cero · línea progresista' },
  { a: ANGELS,     b: SANCHEZ,   val:  38, tipo: 'aliado_mediatico',  label: 'Hoy por Hoy SER · línea progresista PRISA' },

  // ═══════════════════════════════════════════════════════════════════
  // 19 · ALIANZAS Y CONFLICTOS INTERNACIONALES
  // ═══════════════════════════════════════════════════════════════════
  { a: SANCHEZ, b: MACRON,       val:  75, tipo: 'aliado_internacional', label: 'Eje franco-español · Tratado de Barcelona 2023' },
  { a: SANCHEZ, b: SCHOLZ,       val:  82, tipo: 'aliado_internacional', label: 'Eje socialdemócrata · cumbres bilaterales' },
  { a: SANCHEZ, b: COSTA,        val:  88, tipo: 'aliado_internacional', label: 'Aliado socialista portugués · Presidente Consejo UE' },
  { a: SANCHEZ, b: MELONI,       val: -38, tipo: 'critica_publica',      label: 'Frialdad ideológica · choques migración Ocean Viking' },
  { a: SANCHEZ, b: TRUMP,        val: -65, tipo: 'critica_publica',      label: 'Frialdad · choques sobre OTAN 2% PIB y Venezuela' },
  { a: SANCHEZ, b: VONDERLEYEN,  val:  48, tipo: 'aliado_internacional', label: 'Relación institucional UE · fondos Next Generation' },
  { a: SANCHEZ, b: MILEI,        val: -82, tipo: 'oposicion_frontal',    label: 'Crisis diplomática · retirada embajador 2024' },
  { a: SANCHEZ, b: LULA,         val:  78, tipo: 'aliado_internacional', label: 'Eje iberoamericano de izquierda' },
  { a: SANCHEZ, b: ORBAN,        val: -72, tipo: 'critica_publica',      label: 'Antagonismo en Consejo Europeo · veto Ucrania' },
  { a: FEIJOO,  b: MELONI,       val:  62, tipo: 'aliado_internacional', label: 'Alianza ideológica · proceso Patriots' },
  { a: FEIJOO,  b: WEBER,        val:  82, tipo: 'aliado_internacional', label: 'PPE · alineación europea' },
  { a: FEIJOO,  b: METSOLA,      val:  62, tipo: 'aliado_internacional', label: 'Pte Parlamento Europeo · PPE' },
  { a: FEIJOO,  b: TUSK,         val:  55, tipo: 'aliado_internacional', label: 'Aliado PPE · sintonía centro-derecha' },
  { a: FEIJOO,  b: VONDERLEYEN,  val:  52, tipo: 'aliado_internacional', label: 'PPE · misma familia política europea' },
  { a: ABASCAL, b: TRUMP,        val:  82, tipo: 'aliado_internacional', label: 'Visitas y alianza MAGA · sintonía populista' },
  { a: ABASCAL, b: MELONI,       val:  48, tipo: 'aliado_internacional', label: 'Patriots por Europa · alianza ECR' },
  { a: ABASCAL, b: MILEI,        val:  88, tipo: 'aliado_internacional', label: 'Aliado clave · convocatorias conjuntas Madrid 2024' },
  { a: ABASCAL, b: LEPEN,        val:  72, tipo: 'aliado_internacional', label: 'Patriots por Europa · líderes ultraderecha UE' },
  { a: ABASCAL, b: ORBAN,        val:  78, tipo: 'aliado_internacional', label: 'Patriots por Europa · referente fundador' },
  { a: MELONI,  b: TRUMP,        val:  62, tipo: 'aliado_internacional', label: 'Sintonía conservadora transatlántica' },
  { a: MELONI,  b: ORBAN,        val:  58, tipo: 'aliado_internacional', label: 'Eje conservador europeo' },
  { a: MACRON,  b: SCHOLZ,       val:  78, tipo: 'aliado_internacional', label: 'Eje franco-alemán · motor UE' },
  { a: MACRON,  b: VONDERLEYEN,  val:  65, tipo: 'aliado_internacional', label: 'Sintonía agenda europea liberal' },
  { a: VONDERLEYEN, b: COSTA,    val:  72, tipo: 'aliado_internacional', label: 'Presidenta Comisión + Presidente Consejo · tándem UE' },
  { a: WEBER,   b: METSOLA,      val:  85, tipo: 'aliado_partido',       label: 'PPE · líder grupo + Presidenta PE' },
  { a: ALBARES, b: BORRELL,      val:  72, tipo: 'aliado_partido',       label: 'PSOE · ministro Exteriores ↔ ex Alto Representante UE' },
  { a: SANCHEZ, b: BORRELL,      val:  68, tipo: 'aliado_partido',       label: 'Histórico PSOE · ex ministro Exteriores' },
  { a: SANCHEZ, b: CALVINO,      val:  82, tipo: 'aliado_partido',       label: 'Ex vicepresidenta económica · ahora pte. BEI' },
  { a: CUERPO,  b: CALVINO,      val:  85, tipo: 'aliado_partido',       label: 'Sucesor en Economía · continuidad técnica' },
  { a: SANCHEZ, b: RIBERA,       val:  82, tipo: 'aliado_partido',       label: 'Ex vicepresidenta · ahora Comisaria UE Competencia' },
  { a: YOLANDA, b: IRENE_MONTERO, val: -55, tipo: 'rivalidad_interna',   label: 'Choque candidatura europea 2024 Sumar vs Podemos' },
  { a: BORRELL, b: ALBARES,      val:  72, tipo: 'aliado_partido',       label: 'Generación PSOE Exteriores · sintonía' },

  // ═══════════════════════════════════════════════════════════════════
  // 20 · MEDIADORES Y DIÁLOGOS FORMALES
  // ═══════════════════════════════════════════════════════════════════
  { a: REVILLA,    b: SANCHEZ,   val:  32, tipo: 'mediador',          label: 'Diálogo informal · crítico moderado' },
  { a: REVILLA,    b: FEIJOO,    val:  22, tipo: 'mediador',          label: 'Diálogo informal · figura puente' },
  { a: BERNABE,    b: MAZON,     val: -78, tipo: 'oposicion_frontal', label: 'DANA Valencia · choques institucionales públicos' },
  { a: ORTUZAR,    b: SANCHEZ,   val:  72, tipo: 'mediador',          label: 'Interlocutor central PNV · canal de negociación' },

  // ═══════════════════════════════════════════════════════════════════
  // 21 · GABINETES AUTONÓMICOS · presidentes ↔ consejeros clave
  // ═══════════════════════════════════════════════════════════════════
  // Madrid · Gobierno Ayuso
  { a: AYUSO,   b: OSSORIO,      val:  85, tipo: 'aliado_partido',    label: 'Consejero Educación · hombre fuerte gabinete Madrid' },
  { a: AYUSO,   b: MATUTE,       val:  78, tipo: 'aliado_partido',    label: 'Consejera Sanidad · gabinete Ayuso' },
  { a: AYUSO,   b: IZQUIERDO_CM, val:  72, tipo: 'aliado_partido',    label: 'Consejero Vivienda · gabinete Ayuso' },
  { a: AYUSO,   b: PACO_MADRID,  val:  72, tipo: 'aliado_partido',    label: 'Consejero Cultura · gabinete Ayuso' },
  { a: AYUSO,   b: GARCIA_MARTIN, val: 82, tipo: 'aliado_partido',    label: 'Consejero Presidencia · número 2 de Ayuso' },

  // Cataluña · Govern Illa
  { a: ILLA,    b: DALMAU,       val:  88, tipo: 'aliado_partido',    label: 'Conseller Presidència · mano derecha de Illa' },
  { a: ILLA,    b: A_ROMERO,     val:  85, tipo: 'aliado_partido',    label: 'Consellera Economia · núcleo gobierno catalán' },
  { a: ILLA,    b: N_MONTSERRAT, val:  78, tipo: 'aliado_partido',    label: 'Consellera Universitats · gobierno catalán' },
  { a: ILLA,    b: OLGA_PANE,    val:  78, tipo: 'aliado_partido',    label: 'Consellera Salut · gobierno catalán' },
  { a: ILLA,    b: NIUBO,        val:  76, tipo: 'aliado_partido',    label: 'Consellera Educació · gobierno catalán' },
  { a: ILLA,    b: PANEQUE,      val:  78, tipo: 'aliado_partido',    label: 'Consellera Territori · gobierno catalán' },

  // Andalucía · Junta Moreno
  { a: MORENO,  b: A_SANZ,       val:  88, tipo: 'aliado_partido',    label: 'Consejero Presidencia · mano derecha de Moreno' },
  { a: MORENO,  b: C_ESPANA,     val:  82, tipo: 'aliado_partido',    label: 'Consejera Economía y Hacienda · núcleo Andalucía' },
  { a: MORENO,  b: C_CRESPO,     val:  78, tipo: 'aliado_partido',    label: 'Consejera Agricultura · gabinete Andalucía' },

  // País Vasco · Lehendakari Pradales
  { a: PRADALES, b: MIKEL_TORRES, val: 78, tipo: 'aliado_partido',    label: 'Vicelehendakari I · socio PSE-EE en gobierno vasco' },
  { a: PRADALES, b: ATUTXA,      val:  88, tipo: 'aliado_partido',    label: 'Consejera Hacienda · núcleo PNV gabinete vasco' },
  { a: PRADALES, b: MJ_SAN_JOSE, val:  82, tipo: 'aliado_partido',    label: 'Consejera Trabajo · gabinete vasco' },
  { a: PRADALES, b: ORTUZAR,     val:  92, tipo: 'aliado_partido',    label: 'Eje PNV · lehendakari + presidente del partido' },

  // Castilla y León
  { a: MANUECO, b: CARRIEDO,     val:  85, tipo: 'aliado_partido',    label: 'Consejero Economía · veterano gabinete CyL' },
  { a: MANUECO, b: I_BLANCO,     val:  80, tipo: 'aliado_partido',    label: 'Vicepresidenta · núcleo gobierno CyL' },

  // Aragón
  { a: AZCON,   b: VAQUERO,      val:  80, tipo: 'aliado_partido',    label: 'Vicepresidenta y consejera Empleo · gabinete Azcón' },

  // ═══════════════════════════════════════════════════════════════════
  // 22 · INTERIOR · cúpula civil de seguridad
  // ═══════════════════════════════════════════════════════════════════
  { a: MARLASKA, b: PARDO_PIQUERAS, val: 92, tipo: 'aliado_partido', label: 'Director General Policía Nacional · cargo de confianza' },
  { a: MARLASKA, b: MERCEDES_GONZ,  val: 92, tipo: 'aliado_partido', label: 'Directora General Guardia Civil · cargo de confianza' },
  { a: MARLASKA, b: RAFAEL_PEREZ,   val: 90, tipo: 'aliado_partido', label: 'Secretario de Estado Seguridad · número 2 Interior' },
  { a: MARLASKA, b: PERE_NAVARRO,   val: 78, tipo: 'aliado_partido', label: 'Director General Tráfico · veterano DGT' },
  { a: PARDO_PIQUERAS, b: MERCEDES_GONZ, val: 75, tipo: 'aliado_partido', label: 'Eje cúpula seguridad · CNP + GC' },
  { a: PARDO_PIQUERAS, b: RAFAEL_PEREZ,  val: 78, tipo: 'aliado_partido', label: 'Línea jerárquica Sec.Estado → DG Policía' },
  { a: MERCEDES_GONZ,  b: RAFAEL_PEREZ,  val: 78, tipo: 'aliado_partido', label: 'Línea jerárquica Sec.Estado → DG Guardia Civil' },
  { a: SANCHEZ, b: MERCEDES_GONZ,  val:  62, tipo: 'aliado_partido', label: 'Ex delegada del Gobierno en Madrid · confianza Moncloa' },
  { a: AYUSO,   b: MERCEDES_GONZ,  val: -50, tipo: 'critica_publica', label: 'Choques cuando fue delegada del Gobierno en Madrid' },

  // ═══════════════════════════════════════════════════════════════════
  // 23 · DEFENSA · cúpula militar
  // ═══════════════════════════════════════════════════════════════════
  { a: ROBLES,   b: LOPEZ_CALDERON, val: 90, tipo: 'aliado_partido', label: 'Jefe Estado Mayor Defensa (JEMAD) · línea de mando' },
  { a: ROBLES,   b: ENSENAT,        val: 85, tipo: 'aliado_partido', label: 'Jefe Estado Mayor del Ejército de Tierra · JEME' },
  { a: ROBLES,   b: PINEIRO,        val: 85, tipo: 'aliado_partido', label: 'Jefe Estado Mayor de la Armada · AJEMA' },
  { a: ROBLES,   b: BRACO_CARBO,    val: 85, tipo: 'aliado_partido', label: 'Jefe Estado Mayor del Ejército del Aire · JEMA' },
  { a: ROBLES,   b: MESTRE,         val: 78, tipo: 'aliado_partido', label: 'Director Política de Defensa · gabinete técnico' },
  { a: LOPEZ_CALDERON, b: ENSENAT,  val: 80, tipo: 'aliado_partido', label: 'Cúpula militar · JEMAD + JEME' },
  { a: LOPEZ_CALDERON, b: PINEIRO,  val: 80, tipo: 'aliado_partido', label: 'Cúpula militar · JEMAD + AJEMA' },
  { a: LOPEZ_CALDERON, b: BRACO_CARBO, val: 80, tipo: 'aliado_partido', label: 'Cúpula militar · JEMAD + JEMA' },
  { a: FELIPE_VI, b: LOPEZ_CALDERON, val: 78, tipo: 'mediador',      label: 'Mando supremo Fuerzas Armadas · jefe JEMAD' },
  { a: FELIPE_VI, b: ROBLES,        val: 72, tipo: 'mediador',       label: 'Audiencias formales sobre Fuerzas Armadas' },
  { a: FELIPE_VI, b: ENSENAT,       val: 65, tipo: 'mediador',       label: 'Comandancia Fuerzas Armadas · actos institucionales' },
  { a: FELIPE_VI, b: PINEIRO,       val: 65, tipo: 'mediador',       label: 'Comandancia Armada · actos institucionales' },

  // ═══════════════════════════════════════════════════════════════════
  // 24 · INTELIGENCIA · CNI y Seguridad Nacional
  // ═══════════════════════════════════════════════════════════════════
  { a: SANCHEZ,  b: CASTELEIRO,    val: 85, tipo: 'aliado_partido',  label: 'Directora CNI · depende de Moncloa · cargo de confianza' },
  { a: BOLANOS,  b: CASTELEIRO,    val: 78, tipo: 'aliado_partido',  label: 'Coordinación CNI · gabinete jurídico Moncloa' },
  { a: ROBLES,   b: CASTELEIRO,    val: 82, tipo: 'aliado_partido',  label: 'CNI dentro de Defensa · línea jerárquica' },
  { a: MARLASKA, b: CASTELEIRO,    val: 72, tipo: 'aliado_partido',  label: 'Coordinación CNI-Interior · seguridad nacional' },
  { a: ALBARES,  b: CASTELEIRO,    val: 75, tipo: 'aliado_partido',  label: 'Coordinación inteligencia exterior · CNI + Exteriores' },
  { a: CASTELEIRO, b: RELANZON,    val: 85, tipo: 'aliado_partido',  label: 'Eje seguridad nacional · CNI + DSN Moncloa' },
  { a: FELIPE_VI, b: CASTELEIRO,   val: 68, tipo: 'mediador',        label: 'Briefings periódicos de seguridad nacional al Rey' },
  { a: SANCHEZ,  b: RELANZON,      val: 75, tipo: 'aliado_partido',  label: 'Director Seguridad Nacional · gabinete Moncloa' },

  // ═══════════════════════════════════════════════════════════════════
  // 25 · MONCLOA · staff y comunicación
  // ═══════════════════════════════════════════════════════════════════
  { a: SANCHEZ,  b: CRISOSTOMO,    val: 88, tipo: 'aliado_partido',  label: 'Secretaria de Estado Comunicación · cargo de confianza' },
  { a: BOLANOS,  b: CRISOSTOMO,    val: 80, tipo: 'aliado_partido',  label: 'Línea comunicación Moncloa · coordinación con Presidencia' },
  { a: ALEGRIA,  b: CRISOSTOMO,    val: 78, tipo: 'aliado_partido',  label: 'Eje portavocía + comunicación institucional' },
  { a: SANCHEZ,  b: IVAN_REDONDO,  val: 55, tipo: 'critica_publica', label: 'Ex jefe de Gabinete (2018-2021) · alejamiento desde 2021' },
  { a: BOLANOS,  b: IVAN_REDONDO,  val: -35, tipo: 'critica_publica', label: 'Rivalidad histórica · Bolaños lo sustituyó' },

  // ═══════════════════════════════════════════════════════════════════
  // 26 · PERIODISTAS · más afinidades editoriales
  // ═══════════════════════════════════════════════════════════════════
  { a: INAKI_LOPEZ, b: CRISTINA_PARDO, val: 95, tipo: 'aliado_partido', label: 'Matrimonio · copresentadores Más Vale Tarde (La Sexta)' },
  { a: INAKI_LOPEZ, b: YOLANDA,    val:  38, tipo: 'aliado_mediatico', label: 'La Sexta · cobertura afín al espacio Sumar' },
  { a: CRISTINA_PARDO, b: SANCHEZ, val:  35, tipo: 'aliado_mediatico', label: 'La Sexta · línea editorial progresista' },
  { a: HILARIO_PINO, b: SANCHEZ,   val:  32, tipo: 'aliado_mediatico', label: 'RNE · cobertura institucional del Gobierno' },
  { a: E_PALOMERA, b: SANCHEZ,     val:  38, tipo: 'aliado_mediatico', label: 'RTVE · presentadora La Hora 1 · línea oficial' },
  { a: INDA,      b: SANCHEZ,      val: -92, tipo: 'critica_publica',  label: 'OKdiario · ataque diario al Gobierno y Begoña Gómez' },
  { a: INDA,      b: AYUSO,        val:  68, tipo: 'aliado_mediatico', label: 'OKdiario · respaldo permanente a Ayuso' },
  { a: INDA,      b: ABASCAL,      val:  42, tipo: 'aliado_mediatico', label: 'OKdiario · cobertura amigable a Vox' },
  { a: INDA,      b: BEGONA,       val: -90, tipo: 'critica_publica',  label: 'OKdiario · serie de exclusivas contra Begoña Gómez' },
  { a: ABADILLO,  b: FEIJOO,       val:  35, tipo: 'aliado_mediatico', label: 'El Independiente · escrutinio moderado al Gobierno' },
  { a: ABADILLO,  b: SANCHEZ,      val: -38, tipo: 'critica_publica',  label: 'El Independiente · línea crítica con el Gobierno' },
  { a: ESCOLAR,   b: SANCHEZ,      val:  52, tipo: 'aliado_mediatico', label: 'eldiario.es · línea progresista cercana al Gobierno' },
  { a: ESCOLAR,   b: YOLANDA,      val:  58, tipo: 'aliado_mediatico', label: 'eldiario.es · cobertura amigable a Sumar' },
  { a: ESCOLAR,   b: AYUSO,        val: -72, tipo: 'critica_publica',  label: 'eldiario.es · investigaciones recurrentes sobre Madrid' },
  { a: MARHUENDA, b: FEIJOO,       val:  62, tipo: 'aliado_mediatico', label: 'La Razón · línea conservadora afín al PP' },
  { a: MARHUENDA, b: ABASCAL,      val:  45, tipo: 'aliado_mediatico', label: 'La Razón · tribuna habitual de Vox' },
  { a: MARHUENDA, b: SANCHEZ,      val: -72, tipo: 'critica_publica',  label: 'La Razón · escrutinio crítico al Gobierno' },
  { a: L_MENDEZ,  b: SANCHEZ,      val: -32, tipo: 'critica_publica',  label: 'Columnista El Mundo · línea crítica' },
  { a: L_HERRERO, b: FEIJOO,       val:  42, tipo: 'aliado_mediatico', label: 'esRadio · cobertura conservadora moderada' },
  { a: L_HERRERO, b: ABASCAL,      val:  45, tipo: 'aliado_mediatico', label: 'esRadio · cercanía con espacio Vox' },
  { a: M_ROBLES_P, b: FEIJOO,      val:  35, tipo: 'aliado_mediatico', label: 'ABC · línea conservadora' },
  { a: A_CANO,    b: SANCHEZ,      val: -32, tipo: 'critica_publica',  label: 'Ex director El País · crítico tras dejar PRISA' },
  { a: NARANJO,   b: ABASCAL,      val:  45, tipo: 'aliado_mediatico', label: 'esRadio · cobertura afín a Vox' },
  { a: NARANJO,   b: SANCHEZ,      val: -68, tipo: 'critica_publica',  label: 'esRadio · ataque permanente al Gobierno' },
  { a: VELASCO,   b: SANCHEZ,      val:  35, tipo: 'aliado_mediatico', label: 'Cadena SER · línea editorial progresista' },
  { a: VELASCO,   b: YOLANDA,      val:  32, tipo: 'aliado_mediatico', label: 'Cadena SER · cobertura amigable a Sumar' },

  // ═══════════════════════════════════════════════════════════════════
  // 27 · OTROS PRESIDENTES AUTONÓMICOS · Núcleo con Sánchez/Feijóo
  // ═══════════════════════════════════════════════════════════════════
  { a: CHIVITE,  b: SANCHEZ,       val:  72, tipo: 'aliado_partido',  label: 'Presidenta Navarra PSOE · alianza estable con Moncloa' },
  { a: PRADALES, b: SANCHEZ,       val:  68, tipo: 'pacto_investidura', label: 'PNV en gobierno vasco · interlocución directa Moncloa' },
  { a: BURUAGA,  b: FEIJOO,        val:  75, tipo: 'aliado_partido',  label: 'PP nacional · barona Cantabria' },
  { a: CAPELLAN, b: FEIJOO,        val:  72, tipo: 'aliado_partido',  label: 'PP nacional · barón La Rioja' },

  // ═══════════════════════════════════════════════════════════════════
  // 28 · CRUCES MINISTERIALES (ejes técnicos del Consejo de Ministros)
  // ═══════════════════════════════════════════════════════════════════
  { a: BOLANOS,  b: ALBARES,       val:  72, tipo: 'aliado_partido',  label: 'Eje Presidencia-Exteriores · coordinación UE y diplomacia' },
  { a: BOLANOS,  b: ROBLES,        val:  68, tipo: 'aliado_partido',  label: 'Eje Presidencia-Defensa · gestión institucional' },
  { a: BOLANOS,  b: MARLASKA,      val:  75, tipo: 'aliado_partido',  label: 'Eje Presidencia-Interior · línea jurídica del Gobierno' },
  { a: ALBARES,  b: ROBLES,        val:  78, tipo: 'aliado_partido',  label: 'Eje exterior + defensa · misiones internacionales' },
  { a: ALBARES,  b: MARLASKA,      val:  68, tipo: 'aliado_partido',  label: 'Coordinación seguridad exterior · OTAN, migración' },
  { a: CUERPO,   b: AAGESEN,       val:  72, tipo: 'aliado_partido',  label: 'Eje economía-transición ecológica · fondos NextGen' },
  { a: CUERPO,   b: PLANAS,        val:  68, tipo: 'aliado_partido',  label: 'Eje económico · agricultura + economía' },
  { a: CUERPO,   b: HEREU,         val:  75, tipo: 'aliado_partido',  label: 'Eje económico · economía + industria' },
  { a: AAGESEN,  b: PLANAS,        val:  62, tipo: 'aliado_partido',  label: 'Eje verde · transición ecológica + agricultura' },
  { a: AAGESEN,  b: HEREU,         val:  62, tipo: 'aliado_partido',  label: 'Eje verde · industria + transición ecológica' },
  { a: AAGESEN,  b: PUENTE,        val:  58, tipo: 'aliado_partido',  label: 'Eje verde-transportes · descarbonización flota' },
  { a: MONICA_GARCIA, b: SAIZ,     val:  72, tipo: 'aliado_partido',  label: 'Eje social · sanidad + inclusión' },
  { a: MONICA_GARCIA, b: AAGESEN,  val:  62, tipo: 'aliado_partido',  label: 'Eje salud pública · sanidad + medio ambiente' },
  { a: BUSTINDUY, b: SAIZ,         val:  72, tipo: 'aliado_partido',  label: 'Eje social · derechos sociales + inclusión' },
  { a: URTASUN,  b: MORANT,        val:  68, tipo: 'aliado_partido',  label: 'Eje cultura-ciencia · agenda creativa' },
  { a: LOPEZ_TRANSF, b: CUERPO,    val:  72, tipo: 'aliado_partido',  label: 'Eje digital-económico · transformación productiva' },
  { a: LOPEZ_TRANSF, b: HEREU,     val:  68, tipo: 'aliado_partido',  label: 'Eje digital-industrial · 5G y semiconductores' },
  { a: SAIZ,     b: ALBARES,       val:  62, tipo: 'aliado_partido',  label: 'Eje migración + exteriores · acuerdos países origen' },
  { a: MARLASKA, b: SAIZ,          val:  72, tipo: 'aliado_partido',  label: 'Eje migración-interior · Ceuta, Melilla, Canarias' },
  { a: RODRIGUEZ, b: PUENTE,       val:  62, tipo: 'aliado_partido',  label: 'Eje vivienda + transportes · planificación urbana' },
  { a: TORRES,   b: ALEGRIA,       val:  65, tipo: 'aliado_partido',  label: 'Eje política territorial + portavocía' },

  // ═══════════════════════════════════════════════════════════════════
  // 29 · CÚPULA PP · transversal nacional ↔ baronesas y barones
  // ═══════════════════════════════════════════════════════════════════
  { a: GAMARRA,  b: MORENO,        val:  72, tipo: 'aliado_partido',  label: 'PP nacional ↔ Andalucía · coordinación congresos' },
  { a: GAMARRA,  b: RUEDA,         val:  72, tipo: 'aliado_partido',  label: 'PP nacional ↔ Galicia · coordinación territorial' },
  { a: GAMARRA,  b: MANUECO,       val:  68, tipo: 'aliado_partido',  label: 'PP nacional ↔ Castilla y León' },
  { a: GAMARRA,  b: AZCON,         val:  70, tipo: 'aliado_partido',  label: 'PP nacional ↔ Aragón' },
  { a: GAMARRA,  b: PROHENS,       val:  68, tipo: 'aliado_partido',  label: 'PP nacional ↔ Baleares' },
  { a: TELLADO,  b: MORENO,        val:  72, tipo: 'aliado_partido',  label: 'Organización PP ↔ Andalucía · coordinación electoral' },
  { a: TELLADO,  b: ALMEIDA,       val:  78, tipo: 'aliado_partido',  label: 'Organización PP ↔ Ayuntamiento Madrid · ejes campaña' },
  { a: SEMPER,   b: ALMEIDA,       val:  72, tipo: 'aliado_partido',  label: 'Portavoz nacional ↔ alcalde Madrid · agenda mediática' },
  { a: BENDODO,  b: MORENO,        val:  90, tipo: 'aliado_partido',  label: 'Mentor andaluz · ex-vicepresidente Moreno · veterano' },
  { a: BENDODO,  b: A_SANZ,        val:  78, tipo: 'aliado_partido',  label: 'Núcleo andaluz PP · veteranos del aparato' },
  { a: BENDODO,  b: C_ESPANA,      val:  72, tipo: 'aliado_partido',  label: 'Núcleo andaluz PP · economía' },
  { a: BENDODO,  b: C_CRESPO,      val:  68, tipo: 'aliado_partido',  label: 'Núcleo andaluz PP · agricultura' },
  { a: ALMEIDA,  b: CATALA,        val:  72, tipo: 'aliado_partido',  label: 'Alcaldes capitales PP · Madrid + Valencia' },
  { a: ALMEIDA,  b: A_SANZ,        val:  68, tipo: 'aliado_partido',  label: 'Alcaldes PP · Madrid + Sevilla' },
  { a: ALBIOL,   b: ALMEIDA,       val:  62, tipo: 'aliado_partido',  label: 'Alcaldes PP · Badalona + Madrid · coordinación' },
  { a: CARBAYO,  b: MANUECO,       val:  72, tipo: 'aliado_partido',  label: 'Salamanca + Junta CyL · coordinación PP territorial' },
  { a: CAYETANA, b: AYUSO,         val:  35, tipo: 'aliado_partido',  label: 'Espacio liberal interno PP · cercanas en agenda' },

  // ═══════════════════════════════════════════════════════════════════
  // 30 · JUNTA DE ANDALUCÍA · gabinete interno + ejes
  // ═══════════════════════════════════════════════════════════════════
  { a: MORENO,   b: BERNAL_ANDA,   val:  78, tipo: 'aliado_partido',  label: 'Consejero Turismo · gabinete andaluz' },
  { a: MORENO,   b: PATRICIA_POZO, val:  72, tipo: 'aliado_partido',  label: 'Consejera Cultura · gabinete andaluz' },
  { a: MORENO,   b: ROCIO_DIAZ,    val:  72, tipo: 'aliado_partido',  label: 'Consejera Fomento · gabinete andaluz' },
  { a: MORENO,   b: CATALINA_GAR,  val:  78, tipo: 'aliado_partido',  label: 'Consejera Salud · gabinete andaluz' },
  { a: A_SANZ,   b: C_ESPANA,      val:  78, tipo: 'aliado_partido',  label: 'Núcleo gobierno andaluz · presidencia + hacienda' },
  { a: A_SANZ,   b: BERNAL_ANDA,   val:  72, tipo: 'aliado_partido',  label: 'Consejeros andaluces · coordinación interna' },
  { a: A_SANZ,   b: C_CRESPO,      val:  72, tipo: 'aliado_partido',  label: 'Consejeros andaluces · agricultura' },
  { a: C_ESPANA, b: C_CRESPO,      val:  68, tipo: 'aliado_partido',  label: 'Consejeras andaluzas · economía + agricultura' },

  // ═══════════════════════════════════════════════════════════════════
  // 31 · GOVERN CATALÀ · gabinete interno + Generalitat
  // ═══════════════════════════════════════════════════════════════════
  { a: DALMAU,   b: A_ROMERO,      val:  80, tipo: 'aliado_partido',  label: 'Núcleo Govern · presidencia + economía' },
  { a: DALMAU,   b: PANEQUE,       val:  72, tipo: 'aliado_partido',  label: 'Consellers PSC · presidencia + territori' },
  { a: A_ROMERO, b: N_MONTSERRAT,  val:  68, tipo: 'aliado_partido',  label: 'Consellers PSC · economía + universidades' },
  { a: PANEQUE,  b: OLGA_PANE,     val:  68, tipo: 'aliado_partido',  label: 'Consellers PSC · territori + salut' },
  { a: COLLBONI, b: DALMAU,        val:  72, tipo: 'aliado_partido',  label: 'Alcaldía Barcelona + Generalitat · ejes urbanos' },

  // ═══════════════════════════════════════════════════════════════════
  // 32 · MADRID · entorno Ayuso + Vox madrileño
  // ═══════════════════════════════════════════════════════════════════
  { a: OSSORIO,  b: GARCIA_MARTIN, val:  72, tipo: 'aliado_partido',  label: 'Núcleo gabinete Ayuso · educación + presidencia' },
  { a: GARCIA_MARTIN, b: ALMEIDA,  val:  72, tipo: 'aliado_partido',  label: 'Comunidad + Ayuntamiento Madrid · ejes administrativos' },
  { a: AYUSO,    b: ESPINOSA,      val:  35, tipo: 'aliado_partido',  label: 'Sintonía liberal-económica · ex Vox cerca de Madrid' },
  { a: AYUSO,    b: ORTEGA_SMITH,  val: -22, tipo: 'critica_publica', label: 'Choque Madrid PP-Vox · concejal vs Ayuntamiento' },
  { a: ALMEIDA,  b: ORTEGA_SMITH,  val: -45, tipo: 'critica_publica', label: 'Alcalde PP vs concejal Vox en Madrid · choques pleno' },
  { a: AYUSO,    b: AZNAR,         val:  62, tipo: 'aliado_partido',  label: 'Aliada del aznarismo dentro del PP' },

  // ═══════════════════════════════════════════════════════════════════
  // 33 · PNV interno · cúpula vasca
  // ═══════════════════════════════════════════════════════════════════
  { a: ORTUZAR,  b: ATUTXA,        val:  85, tipo: 'aliado_partido',  label: 'Cúpula PNV · presidente partido + consejera Hacienda' },
  { a: ORTUZAR,  b: MJ_SAN_JOSE,   val:  82, tipo: 'aliado_partido',  label: 'Cúpula PNV · presidente partido + consejera Trabajo' },
  { a: AITOR_ESTEBAN, b: PRADALES, val:  88, tipo: 'aliado_partido',  label: 'PNV · portavoz Congreso + Lehendakari' },
  { a: AITOR_ESTEBAN, b: ATUTXA,   val:  78, tipo: 'aliado_partido',  label: 'PNV · portavoz Congreso + Hacienda vasca' },

  // ═══════════════════════════════════════════════════════════════════
  // 34 · GALICIA · gabinete Rueda + ejes
  // ═══════════════════════════════════════════════════════════════════
  { a: RUEDA,    b: DIEGO_CALVO,   val:  85, tipo: 'aliado_partido',  label: 'Consejero Presidencia · gabinete gallego' },
  { a: RUEDA,    b: CORGOS,        val:  82, tipo: 'aliado_partido',  label: 'Consejero Hacienda · gabinete gallego' },
  { a: DIEGO_CALVO, b: CORGOS,     val:  72, tipo: 'aliado_partido',  label: 'Núcleo gobierno gallego · presidencia + hacienda' },
  { a: RAJOY,    b: RUEDA,         val:  68, tipo: 'aliado_partido',  label: 'Línea sucesoria PP gallego · padrinazgo histórico' },

  // ═══════════════════════════════════════════════════════════════════
  // 35 · MINISTROS ↔ CCAA · choques sectoriales
  // ═══════════════════════════════════════════════════════════════════
  { a: MARLASKA, b: AYUSO,         val: -68, tipo: 'oposicion_frontal', label: 'Choque seguridad Madrid · concesiones a Vox y altercados' },
  { a: MARLASKA, b: ALMEIDA,       val: -52, tipo: 'oposicion_frontal', label: 'Choque seguridad Ayuntamiento Madrid · pulsos rutinarios' },
  { a: MONICA_GARCIA, b: AYUSO,    val: -85, tipo: 'oposicion_frontal', label: 'Choque sanitario Madrid · ex líder Más Madrid oposición' },
  { a: MONICA_GARCIA, b: MATUTE,   val: -68, tipo: 'oposicion_frontal', label: 'Choque Ministra Sanidad ↔ Consejera Madrid · gestión SNS' },
  { a: CUERPO,   b: AYUSO,         val: -45, tipo: 'critica_publica',  label: 'Tensión fiscal y armonización tributaria Madrid' },
  { a: CUERPO,   b: MORENO,        val: -32, tipo: 'critica_publica',  label: 'Tensión fiscal con bajadas de impuestos PP' },
  { a: AAGESEN,  b: C_CRESPO,      val: -38, tipo: 'critica_publica',  label: 'Tensión ecología-agricultura · regadíos Andalucía' },
  { a: AAGESEN,  b: LOPEZ_MIRAS,   val: -52, tipo: 'oposicion_frontal', label: 'Choque trasvase Tajo-Segura · Murcia vs Transición' },
  { a: HEREU,    b: ILLA,          val:  78, tipo: 'aliado_partido',   label: 'Ministro Industria ex alcalde Barcelona · aliado PSC' },
  { a: HEREU,    b: COLLBONI,      val:  82, tipo: 'aliado_partido',   label: 'PSC · ex alcalde + alcalde actual Barcelona' },
  { a: SAIZ,     b: CLAVIJO,       val:  55, tipo: 'mediador',         label: 'Migración Canarias · coordinación constante' },
  { a: SAIZ,     b: BUSTINDUY,     val:  68, tipo: 'aliado_partido',   label: 'Eje Inclusión + Derechos Sociales · políticas migración' },

  // ═══════════════════════════════════════════════════════════════════
  // 36 · CASOS JUDICIALES · más interconexiones magistrados
  // ═══════════════════════════════════════════════════════════════════
  { a: LLARENA,  b: MARCHENA,      val:  78, tipo: 'aliado_partido',   label: 'Cúpula TS Sala Penal · línea conservadora doctrinal' },
  { a: CASTELLON, b: MARCHENA,     val:  62, tipo: 'aliado_partido',   label: 'Cúpula judicial · audiencias y TS sintonía instrucción' },
  { a: CASTELLON, b: LLARENA,      val:  68, tipo: 'aliado_partido',   label: 'Cúpula judicial · instructores severos' },
  { a: CONDE_PUMPIDO, b: LESMES,   val: -52, tipo: 'critica_publica',  label: 'TC vs ex CGPJ · pulso sobre nombramientos' },
  { a: GARCIA_ORTIZ, b: LLARENA,   val: -42, tipo: 'critica_publica',  label: 'Fiscalía vs TS · tensión en amnistía y rebelión' },
  { a: GARCIA_ORTIZ, b: PEINADO,   val: -78, tipo: 'conflicto_judicial', label: 'Fiscalía recurre actuaciones de Peinado en caso Begoña Gómez' },
  { a: PEINADO,  b: MARCHENA,      val:  42, tipo: 'mediador',         label: 'Línea jurídica · TS revisará apelaciones del caso Begoña' },
  { a: BEGONA,   b: GARCIA_ORTIZ,  val:  35, tipo: 'aliado_partido',   label: 'Fiscalía defiende posiciones procesales contra imputación' },

  // ═══════════════════════════════════════════════════════════════════
  // 37 · ALCALDES territoriales · más alianzas y choques
  // ═══════════════════════════════════════════════════════════════════
  { a: CATALA,   b: MAZON,         val:  78, tipo: 'aliado_partido',   label: 'Alcaldía Valencia + Generalitat · eje PP valenciano' },
  { a: CATALA,   b: MORANT,        val: -68, tipo: 'oposicion_frontal', label: 'Alcaldesa PP Valencia vs líder PSPV en oposición' },
  { a: ALBIOL,   b: ILLA,          val: -55, tipo: 'oposicion_frontal', label: 'Badalona PP vs Generalitat · choques migración' },
  { a: CARBAYO,  b: MANUECO,       val:  82, tipo: 'aliado_partido',   label: 'Salamanca + Junta CyL · alianza orgánica PP' },
  { a: DARIAS,   b: CLAVIJO,       val: -42, tipo: 'critica_publica',  label: 'Alcaldesa Las Palmas PSOE vs presidente CC Canarias' },
  { a: DARIAS,   b: SANCHEZ,       val:  78, tipo: 'aliado_partido',   label: 'Ex ministra Sanidad · aliada Moncloa · ahora alcaldesa' },
  { a: DARIAS,   b: TORRES,        val:  72, tipo: 'aliado_partido',   label: 'PSOE Canarias · ex pte. canario + alcaldesa Las Palmas' },

  // ═══════════════════════════════════════════════════════════════════
  // 38 · PERIODISTAS · interconexiones entre figuras
  // ═══════════════════════════════════════════════════════════════════
  { a: PEPA_BUENO, b: GABILONDO,   val:  68, tipo: 'aliado_partido',   label: 'PRISA · generaciones del periodismo progresista' },
  { a: PEPA_BUENO, b: ANA_PASTOR,  val:  62, tipo: 'aliado_partido',   label: 'Generación PRISA · línea editorial común' },
  { a: ANA_PASTOR, b: EVOLE,       val:  62, tipo: 'aliado_partido',   label: 'Newtral · documentales y entrevistas largas' },
  { a: FERRERAS,   b: PEDROJOTA,   val: -62, tipo: 'oposicion_frontal', label: 'La Sexta vs El Español · rivalidad histórica TV-prensa' },
  { a: FERRERAS,   b: ANA_ROSA,    val: -35, tipo: 'critica_publica',  label: 'Líneas matinales rivales · La Sexta vs Telecinco' },
  { a: FERRERAS,   b: EVOLE,       val:  82, tipo: 'aliado_partido',   label: 'La Sexta · colaboración Atresmedia editorial común' },
  { a: FERRERAS,   b: INAKI_LOPEZ, val:  82, tipo: 'aliado_partido',   label: 'La Sexta · Al Rojo Vivo + Más Vale Tarde' },
  { a: FERRERAS,   b: CRISTINA_PARDO, val: 78, tipo: 'aliado_partido', label: 'La Sexta · Al Rojo Vivo + Más Vale Tarde' },
  { a: VALLES,     b: SONSOLES,    val:  72, tipo: 'aliado_partido',   label: 'Antena 3 · Noticias 2 + tarde Sonsoles' },
  { a: MARHUENDA,  b: INDA,        val:  68, tipo: 'aliado_partido',   label: 'Eje mediático derechoso · La Razón + OKdiario' },
  { a: MARHUENDA,  b: LOSANTOS,    val:  55, tipo: 'aliado_partido',   label: 'Eje conservador prensa-radio · agenda compartida' },
  { a: HERRERA,    b: LOSANTOS,    val: -32, tipo: 'critica_publica',  label: 'Rivalidad COPE vs esRadio · audiencia mañana' },
  { a: HERRERA,    b: ALSINA,      val: -42, tipo: 'critica_publica',  label: 'Rivalidad COPE vs Onda Cero · misma franja' },
  { a: ALSINA,     b: JULIA_OTERO, val:  62, tipo: 'aliado_partido',   label: 'Onda Cero · estrellas del mismo grupo' },
  { a: GABILONDO,  b: ESCOLAR,     val:  68, tipo: 'aliado_partido',   label: 'Periodismo progresista · referentes generacionales' },
  { a: ESCOLAR,    b: PEPA_BUENO,  val:  58, tipo: 'aliado_partido',   label: 'Eje progresista · eldiario.es + El País' },
  { a: A_CANO,     b: PEPA_BUENO,  val:  42, tipo: 'aliado_partido',   label: 'Relevo en dirección El País · transición ordenada' },
  { a: ANGELS,     b: PEPA_BUENO,  val:  62, tipo: 'aliado_partido',   label: 'Cadena SER + El País · grupo PRISA' },
  { a: ANGELS,     b: VELASCO,     val:  72, tipo: 'aliado_partido',   label: 'Cadena SER · Hoy por Hoy + análisis político' },
  { a: PEPE_RUBIO, b: ANGELS,      val:  72, tipo: 'aliado_partido',   label: 'Cadena SER · veteranos del grupo' },
  { a: PEPE_RUBIO, b: VELASCO,     val:  68, tipo: 'aliado_partido',   label: 'Cadena SER · La Ventana + análisis político' },
  { a: PEPE_ONETO, b: ESCOLAR,     val:  55, tipo: 'aliado_partido',   label: 'Eje progresista · veterano El Plural + eldiario.es' },
  { a: PEDROJOTA,  b: AYUSO,       val:  68, tipo: 'aliado_mediatico', label: 'El Español · cobertura amigable a Ayuso · agenda Madrid' },
  { a: INDA,       b: PEDROJOTA,   val:  62, tipo: 'aliado_partido',   label: 'Generación medios digitales conservadores' },
  { a: M_ROBLES_P, b: AYUSO,       val:  35, tipo: 'aliado_mediatico', label: 'ABC · cobertura amigable a Ayuso · agenda Madrid' },

  // ═══════════════════════════════════════════════════════════════════
  // 39 · CASA REAL · audiencias y ejes institucionales
  // ═══════════════════════════════════════════════════════════════════
  { a: FELIPE_VI, b: AITOR_ESTEBAN, val: 38, tipo: 'mediador',         label: 'Ronda consultas tras elecciones · interlocutor PNV' },
  { a: FELIPE_VI, b: ORTUZAR,       val: 35, tipo: 'mediador',         label: 'Audiencias formales · presidente PNV' },
  { a: FELIPE_VI, b: RUFIAN,        val: 22, tipo: 'mediador',         label: 'Ronda consultas tras elecciones · ERC' },
  { a: FELIPE_VI, b: JUNQUERAS,     val: -32, tipo: 'critica_publica', label: 'Frialdad institucional · independentismo' },
  { a: FELIPE_VI, b: PUIGDEMONT,    val: -95, tipo: 'oposicion_frontal', label: 'Independentismo · rechazo público a la Corona' },
  { a: FELIPE_VI, b: OTEGI,         val: -42, tipo: 'critica_publica', label: 'Distancia institucional · pasado abertzale' },
  { a: FELIPE_VI, b: PRADALES,      val:  55, tipo: 'mediador',        label: 'Audiencias institucionales · lehendakari' },
  { a: LETIZIA,   b: SANCHEZ,      val:  35, tipo: 'mediador',         label: 'Actos institucionales · agenda de la Reina' },
  { a: LETIZIA,   b: FEIJOO,       val:  32, tipo: 'mediador',         label: 'Actos institucionales · Casa Real' },
  { a: JUAN_CARLOS, b: AZNAR,      val:  75, tipo: 'aliado_partido',   label: 'Eje histórico monárquico-conservador' },
  { a: JUAN_CARLOS, b: FELIPE_GONZ, val: 68, tipo: 'aliado_partido',   label: 'Transición y consolidación · sintonía histórica' },
  { a: JUAN_CARLOS, b: FEIJOO,     val:  35, tipo: 'aliado_partido',   label: 'Distancia formal con la oposición desde el exilio' },

  // ═══════════════════════════════════════════════════════════════════
  // 40 · UE · más ejes europeos
  // ═══════════════════════════════════════════════════════════════════
  { a: COSTA,    b: MACRON,        val:  72, tipo: 'aliado_internacional', label: 'Consejo Europeo · alianza pragmática' },
  { a: COSTA,    b: SCHOLZ,        val:  78, tipo: 'aliado_internacional', label: 'Eje socialdemócrata UE · cohesión' },
  { a: LEPEN,    b: MELONI,        val:  42, tipo: 'aliado_internacional', label: 'Patriots vs ECR · derecha europea fragmentada' },
  { a: LEPEN,    b: ORBAN,         val:  78, tipo: 'aliado_internacional', label: 'Patriots por Europa · alianza ultraderecha UE' },
  { a: MACRON,   b: LEPEN,         val: -88, tipo: 'oposicion_frontal',    label: 'Oposición frontal francesa · presidenciales repetidas' },
  { a: TRUMP,    b: MILEI,         val:  88, tipo: 'aliado_internacional', label: 'Eje populista de derecha transatlántica' },
  { a: TRUMP,    b: LEPEN,         val:  72, tipo: 'aliado_internacional', label: 'Apoyo MAGA a Le Pen y Rassemblement' },
  { a: TRUMP,    b: ORBAN,         val:  85, tipo: 'aliado_internacional', label: 'Sintonía MAGA-iliberal · visitas mutuas' },
  { a: VONDERLEYEN, b: METSOLA,    val:  78, tipo: 'aliado_partido',       label: 'PPE · presidenta Comisión + Parlamento' },
  { a: VONDERLEYEN, b: WEBER,      val:  82, tipo: 'aliado_partido',       label: 'PPE · líder grupo + presidenta Comisión' },
  { a: WEBER,    b: TUSK,          val:  78, tipo: 'aliado_internacional', label: 'PPE · líderes europeos del PP transversal' },
  { a: BORRELL,  b: SCHOLZ,        val:  62, tipo: 'aliado_internacional', label: 'Ex Alto Representante UE · sintonía socialdemócrata' },
  { a: BORRELL,  b: MACRON,        val:  58, tipo: 'aliado_internacional', label: 'Sintonía exterior UE · estrategia común' },
  { a: BORRELL,  b: COSTA,         val:  72, tipo: 'aliado_internacional', label: 'Generación socialista ibérica' },
  { a: CALVINO,  b: VONDERLEYEN,   val:  68, tipo: 'aliado_internacional', label: 'BEI + Comisión UE · ejes inversión verde' },
  { a: RIBERA,   b: VONDERLEYEN,   val:  82, tipo: 'aliado_partido',       label: 'Vicepresidenta Comisión · línea Competencia + verde' },
  { a: RIBERA,   b: AAGESEN,       val:  88, tipo: 'aliado_partido',       label: 'Predecesora-sucesora · Transición Ecológica España' },
  { a: RIBERA,   b: CUERPO,        val:  72, tipo: 'aliado_partido',       label: 'Eje verde-económico · agenda UE de transición' },
  { a: METSOLA,  b: FEIJOO,        val:  68, tipo: 'aliado_partido',       label: 'PPE · presidenta PE + líder PP España' },
  { a: WEBER,    b: GONZALEZ_PONS, val:  72, tipo: 'aliado_partido',       label: 'PPE · líder grupo + vicepresidente PPE español' },
  { a: GONZALEZ_PONS, b: FEIJOO,   val:  78, tipo: 'aliado_partido',       label: 'PP · eurodiputado + presidente nacional' },
  { a: IRATXE,   b: SANCHEZ,       val:  72, tipo: 'aliado_partido',       label: 'PSOE · presidenta S&D PE + presidente Gobierno' },
  { a: IRATXE,   b: BORRELL,       val:  68, tipo: 'aliado_partido',       label: 'PSOE · S&D PE + ex Alto Representante UE' },
  { a: MANU_PINEDA, b: YOLANDA,    val:  62, tipo: 'aliado_partido',       label: 'Sumar/IU · eurodiputado + vicepresidenta' },
  { a: MANU_PINEDA, b: SIRA_REGO,  val:  78, tipo: 'aliado_partido',       label: 'IU · cúpula europea + ministerio Juventud' },
  { a: DIANA_RIBA, b: JUNQUERAS,   val:  82, tipo: 'aliado_partido',       label: 'ERC · eurodiputada Verdes + presidente partido' },
  { a: BARRENA,    b: OTEGI,       val:  82, tipo: 'aliado_partido',       label: 'EH Bildu · eurodiputado + líder histórico' },
  { a: MELONI,     b: VONDERLEYEN, val:  45, tipo: 'aliado_internacional', label: 'ECR vs PPE · cooperación pragmática Comisión' },

  // ═══════════════════════════════════════════════════════════════════
  // 41 · SINDICATOS · cuadros intermedios
  // ═══════════════════════════════════════════════════════════════════
  { a: SORDO,    b: MC_VICENTE,    val:  92, tipo: 'aliado_partido',   label: 'CCOO · secretario general + secretaria Acción Sindical' },
  { a: ALVAREZ,  b: MC_BARRERA,    val:  92, tipo: 'aliado_partido',   label: 'UGT · secretario general + secretaria Política Sindical' },
  { a: MC_VICENTE, b: MC_BARRERA,  val:  72, tipo: 'aliado_sindical',  label: 'CCOO + UGT · coordinación negociación colectiva' },
  { a: GARAMENDI, b: LORENZO_AMOR, val:  85, tipo: 'aliado_partido',   label: 'Cúpula CEOE · presidente + vicepresidente ATA' },
  { a: SORDO,    b: LORENZO_AMOR,  val: -38, tipo: 'critica_publica',  label: 'Choque sindicatos vs autónomos · cuotas RETA' },
  { a: ALVAREZ,  b: LORENZO_AMOR,  val: -35, tipo: 'critica_publica',  label: 'Choque UGT vs ATA · jornada laboral autónomos' },
  { a: SORDO,    b: GERARDO_CUERVA, val: -32, tipo: 'critica_publica', label: 'Choque sindicatos vs CEPYME · convenios PYME' },

  // ═══════════════════════════════════════════════════════════════════
  // 42 · PARLAMENTO · ejes de votación
  // ═══════════════════════════════════════════════════════════════════
  { a: BOLANOS,  b: AITOR_ESTEBAN, val:  72, tipo: 'pacto_investidura', label: 'Negociador Moncloa con portavoz PNV en Congreso' },
  { a: BOLANOS,  b: RUFIAN,        val:  58, tipo: 'pacto_investidura', label: 'Negociador Moncloa con portavoz ERC' },
  { a: BOLANOS,  b: AIZPURUA,      val:  48, tipo: 'pacto_investidura', label: 'Negociador Moncloa con portavoz Bildu' },
  { a: BOLANOS,  b: PONTON,        val:  52, tipo: 'pacto_investidura', label: 'Negociador Moncloa con líder BNG' },
  { a: YOLANDA,  b: AITOR_ESTEBAN, val:  52, tipo: 'pacto_investidura', label: 'Sumar coordina apoyos con PNV en reformas laborales' },
  { a: YOLANDA,  b: AIZPURUA,      val:  62, tipo: 'pacto_investidura', label: 'Sumar coordina apoyos con Bildu · agenda social' },
  { a: SEMPER,   b: GAMARRA,       val:  82, tipo: 'aliado_partido',    label: 'Cúpula PP Congreso · portavoz + sec.general' },
  { a: TELLADO,  b: GAMARRA,       val:  78, tipo: 'aliado_partido',    label: 'Cúpula PP · sec.general + organización' },
  { a: TELLADO,  b: SEMPER,        val:  72, tipo: 'aliado_partido',    label: 'Cúpula PP Congreso + organización campaña' },
  { a: CAYETANA, b: SANCHEZ,       val: -78, tipo: 'oposicion_frontal', label: 'Choques verbales recurrentes en sesión de control' },

  // ═══════════════════════════════════════════════════════════════════
  // 43 · EX PRESIDENTES con autonómicos del partido
  // ═══════════════════════════════════════════════════════════════════
  { a: FELIPE_GONZ, b: SUSANA_DIAZ, val: 68, tipo: 'aliado_partido',   label: 'Generaciones PSOE · sintonía sevillana' },
  { a: ZAPATERO,    b: POMBO_BARBON, val: 62, tipo: 'aliado_partido',  label: 'PSOE asturiano · sintonía generacional' },
  { a: ZAPATERO,    b: PAGE,        val:  45, tipo: 'mediador',        label: 'PSOE histórico · diálogo con barón crítico' },
  { a: AZNAR,       b: ALMEIDA,     val:  62, tipo: 'aliado_partido',  label: 'Eje aznarista madrileño · agenda dura' },
  { a: AZNAR,       b: BENDODO,     val:  35, tipo: 'aliado_partido',  label: 'Aznarismo + andalucismo PP · sintonía táctica' },
  { a: RAJOY,       b: MORENO,      val:  72, tipo: 'aliado_partido',  label: 'PP gallego + andaluz · línea moderada' },
  { a: RAJOY,       b: MANUECO,     val:  62, tipo: 'aliado_partido',  label: 'PP veteranos · línea moderada CyL' },
  { a: CASADO,      b: SEMPER,      val:  42, tipo: 'aliado_partido',  label: 'Generación PP · proximidad ideológica' },
  { a: CASADO,      b: ALMEIDA,     val:  55, tipo: 'aliado_partido',  label: 'Generación PP madrileña · alianza personal' },

  // ═══════════════════════════════════════════════════════════════════
  // 44 · PODEMOS · más cruces con SUMAR y resto
  // ═══════════════════════════════════════════════════════════════════
  { a: BELARRA,  b: BUSTINDUY,     val: -55, tipo: 'rivalidad_interna', label: 'Belarra acusa a Bustinduy de traición a Podemos' },
  { a: BELARRA,  b: SIRA_REGO,     val: -38, tipo: 'rivalidad_interna', label: 'IU dentro de Sumar · Podemos crítica' },
  { a: BELARRA,  b: URTASUN,       val: -42, tipo: 'rivalidad_interna', label: 'Verdes Equo dentro de Sumar · Podemos crítica' },
  { a: IGLESIAS, b: BUSTINDUY,     val: -52, tipo: 'rivalidad_interna', label: 'Iglesias acusa a antiguos compañeros de claudicar con Sumar' },
  { a: IRENE_MONTERO, b: MONICA_GARCIA, val: -45, tipo: 'rivalidad_interna', label: 'Tensión Podemos vs Más Madrid heredada en Sumar' },
  { a: ECHENIQUE, b: URTASUN,      val: -42, tipo: 'rivalidad_interna', label: 'Choque Podemos vs Verdes/Sumar' },

  // ═══════════════════════════════════════════════════════════════════
  // 45 · CASOS ESPECÍFICOS · gabinete autonómico + ministros
  // ═══════════════════════════════════════════════════════════════════
  { a: MAZON,    b: MARCIANO_GOM,  val:  72, tipo: 'aliado_partido',   label: 'Pte. Generalitat valenciano + Conseller Sanidad · gestión DANA' },
  { a: MORANT,   b: MAZON,         val: -78, tipo: 'oposicion_frontal', label: 'DANA Valencia · ministra y líder oposición vs president' },
  { a: MORANT,   b: CATALA,        val: -55, tipo: 'oposicion_frontal', label: 'Tensión PSPV vs PP Valencia · gestión DANA' },
  { a: BERNABE,  b: MAZON,         val: -88, tipo: 'oposicion_frontal', label: 'DANA Valencia · choques institucionales públicos sostenidos' },
  { a: SAIZ,     b: DARIAS,        val:  72, tipo: 'aliado_partido',    label: 'Inclusión + alcaldesa Las Palmas · acuerdos migración' },
  { a: BUSTINDUY, b: MONICA_GARCIA, val: 82, tipo: 'aliado_partido',    label: 'Sumar · derechos sociales + sanidad · agenda común' },
  { a: PUENTE,    b: CABALLERO,    val:  62, tipo: 'aliado_partido',    label: 'Eje Transportes + alcalde Vigo · obras públicas' },
  { a: PUENTE,    b: COLLBONI,     val:  68, tipo: 'aliado_partido',    label: 'Eje Transportes + alcalde Barcelona · Rodalies' },
  { a: HEREU,     b: SANZ,         val:  35, tipo: 'mediador',          label: 'Industria + alcalde Sevilla · inversión sectorial' },
  { a: ALEGRIA,   b: COLLBONI,     val:  68, tipo: 'aliado_partido',    label: 'PSC + portavoz Gobierno · agenda comunicativa' },
  { a: PLANAS,    b: C_CRESPO,     val: -32, tipo: 'critica_publica',   label: 'Agricultura · choques nación-CCAA por PAC' },

  // ─── 50 relaciones adicionales importadas del CSV next50 ──────────
  // Fuentes periodísticas verificables (mayo 2026)
  ...RELACIONES_CSV_CURADAS,

  // ─── 47 relaciones adicionales importadas del CSV top50 ───────────
  // Fechas más precisas + descripciones complementarias (mayo 2026)
  ...RELACIONES_CSV_TOP50,
]

/**
 * Devuelve solo las relaciones donde AMBOS actores están en el set visible.
 * Optimizado con un Set para lookup O(1).
 */
export function relacionesVisibles(visibleIds: string[]): RelacionExplicita[] {
  const set = new Set(visibleIds)
  return RELACIONES_EXPLICITAS.filter(r => set.has(r.a) && set.has(r.b))
}

/**
 * Paleta y grosor por tipo de relación · para que el grafo distinga visualmente.
 */
export const TIPO_META: Record<TipoRelacion, { color: string; intensidad: number; cat: 'alianza' | 'conflicto' | 'neutral' }> = {
  coalicion_gobierno:    { color: '#0F766E', intensidad: 1.0,  cat: 'alianza' },
  pacto_investidura:     { color: '#0E7490', intensidad: 0.9,  cat: 'alianza' },
  pacto_autonomico:      { color: '#0EA5E9', intensidad: 0.8,  cat: 'alianza' },
  aliado_partido:        { color: '#2D8A39', intensidad: 0.85, cat: 'alianza' },
  aliado_internacional:  { color: '#7C3AED', intensidad: 0.7,  cat: 'alianza' },
  aliado_sindical:       { color: '#A02525', intensidad: 0.7,  cat: 'alianza' },
  aliado_mediatico:      { color: '#525258', intensidad: 0.6,  cat: 'alianza' },
  mediador:              { color: '#9CA3AF', intensidad: 0.5,  cat: 'neutral' },
  oposicion_frontal:     { color: '#DC2626', intensidad: 1.0,  cat: 'conflicto' },
  rivalidad_interna:     { color: '#F97316', intensidad: 0.85, cat: 'conflicto' },
  conflicto_judicial:    { color: '#7F1D1D', intensidad: 0.95, cat: 'conflicto' },
  conflicto_territorial: { color: '#B45309', intensidad: 0.8,  cat: 'conflicto' },
  bloqueo_legislativo:   { color: '#991B1B', intensidad: 0.9,  cat: 'conflicto' },
  critica_publica:       { color: '#D97706', intensidad: 0.6,  cat: 'conflicto' },
  ruptura_coalicion:     { color: '#B91C1C', intensidad: 0.95, cat: 'conflicto' },
}

export const TIPO_LABEL: Record<TipoRelacion, string> = {
  coalicion_gobierno: 'Coalición Moncloa',
  pacto_investidura: 'Pacto investidura',
  pacto_autonomico: 'Coalición autonómica',
  aliado_partido: 'Aliado de partido',
  aliado_internacional: 'Alianza internacional',
  aliado_sindical: 'Alianza sindical',
  aliado_mediatico: 'Afinidad mediática',
  mediador: 'Diálogo formal',
  oposicion_frontal: 'Oposición frontal',
  rivalidad_interna: 'Rivalidad interna',
  conflicto_judicial: 'Conflicto judicial',
  conflicto_territorial: 'Conflicto territorial',
  bloqueo_legislativo: 'Bloqueo legislativo',
  critica_publica: 'Crítica pública',
  ruptura_coalicion: 'Ruptura coalición',
}
