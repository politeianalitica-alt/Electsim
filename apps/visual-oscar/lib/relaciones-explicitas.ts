/**
 * Dataset CURADO de relaciones explícitas entre actores políticos.
 *
 * Estas relaciones se basan en hechos reales y se muestran en el grafo
 * SIEMPRE que ambos actores estén visibles, complementando (y prevaleciendo
 * sobre) las relaciones inferidas automáticamente por algoritmo.
 *
 * Cada relación tiene:
 *   · val ∈ [-100, +100] · negativo = conflicto, positivo = alianza
 *   · tipo · categoría táctica (pacto_gobierno, rivalidad_interna…)
 *   · label · descripción humana corta para el tooltip
 *   · evidencia? · si hay hito documentable
 *
 * Los IDs deben coincidir con `actor.id` (slug del nombre).
 */

export type TipoRelacion =
  // Alianzas
  | 'coalicion_gobierno'      // miembros de la misma coalición Moncloa
  | 'pacto_investidura'       // socios externos del bloque de investidura
  | 'pacto_autonomico'        // coalición de gobierno en CCAA
  | 'aliado_partido'          // mismo partido y misma facción
  | 'aliado_internacional'    // alianza diplomática activa
  | 'aliado_sindical'         // sindicatos coordinados
  | 'aliado_mediatico'        // línea editorial afín
  | 'mediador'                // figura puente entre bloques
  // Conflictos
  | 'oposicion_frontal'       // enfrentamiento público sostenido
  | 'rivalidad_interna'       // rivales del mismo partido
  | 'conflicto_judicial'      // procedimiento judicial activo
  | 'conflicto_territorial'   // tensión nación/CCAA o entre CCAA
  | 'bloqueo_legislativo'     // bloqueo formal de iniciativa o nombramiento
  | 'critica_publica'         // ataques mediáticos sin ruptura
  | 'ruptura_coalicion'       // coalición rota recientemente

export interface RelacionExplicita {
  a: string            // id actor origen
  b: string            // id actor destino
  val: number          // -100 .. +100
  tipo: TipoRelacion
  label: string        // descripción corta · va al tooltip
}

// Slugs comunes (mismo algoritmo que actores.ts buildActor → id)
const id = (nombre: string) => nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

// Atajos para legibilidad
const SANCHEZ        = id('Pedro Sánchez')
const FEIJOO         = id('Alberto Núñez Feijóo')
const ABASCAL        = id('Santiago Abascal')
const YOLANDA        = id('Yolanda Díaz')
const MONTERO_PSOE   = id('María Jesús Montero')
const BOLANOS        = id('Félix Bolaños')
const ALBARES        = id('José Manuel Albares')
const ROBLES         = id('Margarita Robles')
const MARLASKA       = id('Fernando Grande-Marlaska')
const CUERPO         = id('Carlos Cuerpo')
const AYUSO          = id('Isabel Díaz Ayuso')
const MORENO         = id('Juan Manuel Moreno Bonilla')
const MAZON          = id('Juanfran Pérez Llorca')   // president actual Generalitat Valenciana
const RUEDA          = id('Alfonso Rueda')
const MANUECO        = id('Alfonso Fernández Mañueco')
const AZCON          = id('Jorge Azcón')
const PROHENS        = id('Marga Prohens')
const LOPEZ_MIRAS    = id('Fernando López Miras')
const PUIGDEMONT     = id('Carles Puigdemont')
const ORTUZAR        = id('Andoni Ortuzar')
const RUFIAN         = id('Gabriel Rufián')
const OTEGI          = id('Arnaldo Otegi')
const FELIPE_VI      = id('Felipe VI')
const PAGE           = id('Emiliano García-Page')
const LAMBAN         = id('Javier Lambán')
const AZNAR          = id('José María Aznar')
const ZAPATERO       = id('José Luis Rodríguez Zapatero')
const RAJOY          = id('Mariano Rajoy')
const CONDE_PUMPIDO  = id('Cándido Conde-Pumpido')
const MARCHENA       = id('Manuel Marchena')
const LESMES         = id('Carlos Lesmes')
const DELGADO        = id('Dolores Delgado')
const POMBO_BARBON   = id('Adrián Barbón')
const PAGE_GARCIA    = id('Emiliano García-Page')
const GUARDIOLA      = id('María Guardiola')   // PP Extremadura · sustituye relaciones Vara
const CLAVIJO        = id('Fernando Clavijo')
const SORDO          = id('Unai Sordo')
const ALVAREZ        = id('Pepe Álvarez')
const GARAMENDI      = id('Antonio Garamendi')
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
const PONTON         = id('Ana Pontón')
const ILLA           = id('Salvador Illa')
const ARAGONES       = id('Pere Aragonès')
const JUNQUERAS      = id('Oriol Junqueras')
const REVILLA        = id('Miguel Ángel Revilla')
const CASADO         = id('Pablo Casado')

export const RELACIONES_EXPLICITAS: RelacionExplicita[] = [

  // ═══════════════════════════════════════════════════════════════════
  // 1. COALICIÓN DE GOBIERNO (alianzas fuertes Moncloa)
  // ═══════════════════════════════════════════════════════════════════
  { a: SANCHEZ, b: YOLANDA,      val:  88, tipo: 'coalicion_gobierno', label: 'Coalición PSOE-Sumar · pacto Moncloa diciembre 2023' },
  { a: SANCHEZ, b: MONTERO_PSOE, val:  92, tipo: 'aliado_partido',     label: 'Vicepresidenta 1ª · número 2 del Gobierno' },
  { a: SANCHEZ, b: BOLANOS,      val:  94, tipo: 'aliado_partido',     label: 'Mano derecha · Ministro Presidencia y JJEE' },
  { a: SANCHEZ, b: ALBARES,      val:  85, tipo: 'aliado_partido',     label: 'Núcleo gubernamental · política exterior' },
  { a: SANCHEZ, b: ROBLES,       val:  82, tipo: 'aliado_partido',     label: 'Núcleo gubernamental · Defensa' },
  { a: SANCHEZ, b: MARLASKA,     val:  78, tipo: 'aliado_partido',     label: 'Núcleo gubernamental · Interior' },
  { a: SANCHEZ, b: CUERPO,       val:  76, tipo: 'aliado_partido',     label: 'Equipo económico · sucesor de Calviño' },
  { a: MONTERO_PSOE, b: YOLANDA, val:  68, tipo: 'coalicion_gobierno', label: 'Coordinación interna del Consejo de Ministros' },
  { a: BOLANOS, b: YOLANDA,      val:  62, tipo: 'coalicion_gobierno', label: 'Mesa interpartidaria semanal de coalición' },

  // ═══════════════════════════════════════════════════════════════════
  // 2. PACTO DE INVESTIDURA (socios externos)
  // ═══════════════════════════════════════════════════════════════════
  { a: SANCHEZ, b: PUIGDEMONT, val:  55, tipo: 'pacto_investidura',  label: 'Pacto investidura Junts · amnistía + concierto fiscal' },
  { a: SANCHEZ, b: ORTUZAR,    val:  72, tipo: 'pacto_investidura',  label: 'PNV · socio estable · transferencias CAV' },
  { a: SANCHEZ, b: RUFIAN,     val:  58, tipo: 'pacto_investidura',  label: 'ERC · negociación caso a caso' },
  { a: SANCHEZ, b: OTEGI,      val:  48, tipo: 'pacto_investidura',  label: 'EH Bildu · apoyo crítico desde 2023' },
  { a: SANCHEZ, b: PONTON,     val:  52, tipo: 'pacto_investidura',  label: 'BNG · diputada clave en investidura' },
  { a: SANCHEZ, b: CLAVIJO,    val:  35, tipo: 'pacto_investidura',  label: 'CC · apoyo puntual desde Canarias' },

  // ═══════════════════════════════════════════════════════════════════
  // 3. COALICIONES AUTONÓMICAS PP-VOX
  // ═══════════════════════════════════════════════════════════════════
  { a: MAZON,    b: ABASCAL, val:  68, tipo: 'pacto_autonomico', label: 'Coalición PP-Vox · Generalitat Valenciana 2023' },
  { a: AZCON,    b: ABASCAL, val:  65, tipo: 'pacto_autonomico', label: 'Coalición PP-Vox · Aragón 2023' },
  { a: PROHENS,  b: ABASCAL, val:  55, tipo: 'pacto_autonomico', label: 'Acuerdo de investidura PP-Vox · Baleares' },
  { a: LOPEZ_MIRAS, b: ABASCAL, val: -30, tipo: 'ruptura_coalicion', label: 'Ruptura coalición Vox Murcia 2024 · sin acuerdo migratorio' },
  { a: MANUECO,  b: ABASCAL, val: -25, tipo: 'ruptura_coalicion', label: 'Vox abandona gobierno autonómico Castilla y León 2024' },
  { a: FEIJOO,   b: MAZON,   val:  55, tipo: 'aliado_partido',   label: 'PP nacional · barón autonómico de peso' },
  { a: FEIJOO,   b: MORENO,  val:  82, tipo: 'aliado_partido',   label: 'Aliado clave PP nacional · referente moderado' },
  { a: FEIJOO,   b: AZCON,   val:  70, tipo: 'aliado_partido',   label: 'PP nacional · barón autonómico' },
  { a: FEIJOO,   b: RUEDA,   val:  78, tipo: 'aliado_partido',   label: 'PP nacional · sucesión gallega de Feijóo' },
  { a: FEIJOO,   b: MANUECO, val:  62, tipo: 'aliado_partido',   label: 'PP nacional · barón territorial CyL' },

  // ═══════════════════════════════════════════════════════════════════
  // 4. RIVALIDADES INTERNAS PSOE
  // ═══════════════════════════════════════════════════════════════════
  { a: SANCHEZ, b: PAGE,    val: -60, tipo: 'rivalidad_interna', label: 'Crítico público · contra amnistía y financiación singular' },
  { a: SANCHEZ, b: LAMBAN,  val: -65, tipo: 'rivalidad_interna', label: 'Voz disidente · ex barón aragonés crítico' },
  { a: SANCHEZ, b: ZAPATERO,val:  62, tipo: 'aliado_partido',    label: 'Aliado histórico · respaldo público a amnistía' },
  { a: FEIJOO,  b: GUARDIOLA, val:  62, tipo: 'aliado_partido',  label: 'PP nacional · barona autonómica Extremadura' },
  { a: PAGE,    b: ZAPATERO,val: -30, tipo: 'critica_publica',   label: 'Discrepancia pública sobre amnistía' },

  // ═══════════════════════════════════════════════════════════════════
  // 5. RIVALIDADES Y ALIANZAS INTERNAS PP
  // ═══════════════════════════════════════════════════════════════════
  { a: FEIJOO, b: AYUSO,  val: -45, tipo: 'rivalidad_interna', label: 'Tensión Génova-Sol · disputa por liderazgo derecho' },
  { a: FEIJOO, b: AZNAR,  val:  35, tipo: 'critica_publica',   label: 'Aznar presiona desde FAES · estrategia más dura' },
  { a: FEIJOO, b: RAJOY,  val:  68, tipo: 'aliado_partido',    label: 'Sucesor designado · padrino interno' },
  { a: FEIJOO, b: CASADO, val:  20, tipo: 'critica_publica',   label: 'Casado fuera del partido tras moción interna 2022' },
  { a: AYUSO,  b: AZNAR,  val:  55, tipo: 'aliado_partido',    label: 'Aliada del aznarismo dentro del PP' },
  { a: AYUSO,  b: ABASCAL,val:  20, tipo: 'critica_publica',   label: 'Competencia por electorado derecho en Madrid' },

  // ═══════════════════════════════════════════════════════════════════
  // 6. OPOSICIÓN FRONTAL ENTRE LÍDERES
  // ═══════════════════════════════════════════════════════════════════
  { a: SANCHEZ, b: FEIJOO,    val: -78, tipo: 'oposicion_frontal', label: 'Confrontación parlamentaria semanal · sesión control' },
  { a: SANCHEZ, b: ABASCAL,   val: -92, tipo: 'oposicion_frontal', label: 'Extrema oposición · objetivo prioritario de Vox' },
  { a: SANCHEZ, b: AYUSO,     val: -88, tipo: 'oposicion_frontal', label: 'Rivalidad pública continuada · Madrid vs Moncloa' },
  { a: FEIJOO,  b: ABASCAL,   val: -38, tipo: 'critica_publica',   label: 'Competencia por espacio derecho · choques tácticos' },
  { a: YOLANDA, b: FEIJOO,    val: -55, tipo: 'oposicion_frontal', label: 'Choque parlamentario semanal' },
  { a: YOLANDA, b: ABASCAL,   val: -82, tipo: 'oposicion_frontal', label: 'Antagonismo total · debate visceral' },
  { a: BOLANOS, b: AYUSO,     val: -75, tipo: 'oposicion_frontal', label: 'Choque institucional Moncloa-Sol' },

  // ═══════════════════════════════════════════════════════════════════
  // 7. CONFLICTOS TERRITORIALES (Cataluña, País Vasco)
  // ═══════════════════════════════════════════════════════════════════
  { a: PUIGDEMONT, b: JUNQUERAS, val: -55, tipo: 'conflicto_territorial', label: 'Rivalidad histórica Junts-ERC por liderazgo independentista' },
  { a: PUIGDEMONT, b: ARAGONES,  val: -45, tipo: 'conflicto_territorial', label: 'Junts vs ERC · disputa estrategia independentista' },
  { a: PUIGDEMONT, b: ILLA,      val: -68, tipo: 'oposicion_frontal',     label: 'Independentismo vs PSC · gobierno Generalitat' },
  { a: JUNQUERAS,  b: ILLA,      val: -55, tipo: 'oposicion_frontal',     label: 'Tensión ERC-PSC tras pacto Govern 2024' },
  { a: ORTUZAR,    b: OTEGI,     val: -40, tipo: 'conflicto_territorial', label: 'Rivalidad PNV-EH Bildu · liderazgo abertzale' },
  { a: ARAGONES,   b: JUNQUERAS, val: -25, tipo: 'rivalidad_interna',     label: 'Tensión interna ERC tras pacto investidura' },

  // ═══════════════════════════════════════════════════════════════════
  // 8. CONFLICTOS JUDICIALES E INSTITUCIONALES
  // ═══════════════════════════════════════════════════════════════════
  { a: CONDE_PUMPIDO, b: MARCHENA, val: -55, tipo: 'critica_publica',    label: 'TC vs TS · pulso doctrinal sobre amnistía' },
  { a: SANCHEZ,       b: MARCHENA, val: -45, tipo: 'conflicto_judicial', label: 'Pulso institucional · amnistía y caso Procés' },
  { a: SANCHEZ,       b: CONDE_PUMPIDO, val: 35, tipo: 'aliado_partido', label: 'Nombramiento progresista por mandato gobierno' },
  { a: SANCHEZ,       b: LESMES,   val: -38, tipo: 'critica_publica',    label: 'Tensión histórica · bloqueo renovación CGPJ' },
  { a: FEIJOO,        b: LESMES,   val:  35, tipo: 'aliado_partido',     label: 'Sintonía sobre renovación judicial' },
  { a: SANCHEZ,       b: DELGADO,  val:  62, tipo: 'aliado_partido',     label: 'Ex fiscal general designada por su gobierno' },
  { a: SANCHEZ,       b: FELIPE_VI,val:  32, tipo: 'mediador',           label: 'Diálogo formal Moncloa-Zarzuela · enfriamiento por amnistía' },
  { a: FEIJOO,        b: FELIPE_VI,val:  38, tipo: 'mediador',           label: 'Reuniones de audiencia · sintonía institucional' },

  // ═══════════════════════════════════════════════════════════════════
  // 9. SINDICATOS Y PATRONAL
  // ═══════════════════════════════════════════════════════════════════
  { a: SORDO,   b: ALVAREZ,   val:  85, tipo: 'aliado_sindical',   label: 'Coordinación CCOO-UGT · mesa diálogo social' },
  { a: SORDO,   b: GARAMENDI, val: -45, tipo: 'oposicion_frontal', label: 'Negociación SMI · choque salarios mínimos' },
  { a: ALVAREZ, b: GARAMENDI, val: -42, tipo: 'oposicion_frontal', label: 'Negociación SMI · choque salarios mínimos' },
  { a: YOLANDA, b: SORDO,     val:  68, tipo: 'aliado_sindical',   label: 'Sindicatos alineados con reformas laborales Sumar' },
  { a: YOLANDA, b: ALVAREZ,   val:  65, tipo: 'aliado_sindical',   label: 'Sindicatos alineados con reformas laborales Sumar' },
  { a: YOLANDA, b: GARAMENDI, val: -52, tipo: 'oposicion_frontal', label: 'Negociación tripartita · tensión con patronal' },
  { a: MONTERO_PSOE, b: GARAMENDI, val: -38, tipo: 'critica_publica', label: 'Tensión fiscal · subida impuestos al capital' },
  { a: SANCHEZ, b: GARAMENDI, val:  20, tipo: 'mediador',          label: 'Reuniones periódicas · diálogo institucional' },
  { a: CUERPO,  b: GARAMENDI, val:  38, tipo: 'mediador',          label: 'Diálogo Economía-CEOE · estabilidad macroeconómica' },

  // ═══════════════════════════════════════════════════════════════════
  // 10. EJE MEDIÁTICO · proximidad editorial
  // ═══════════════════════════════════════════════════════════════════
  { a: PEPA_BUENO, b: SANCHEZ,  val:  35, tipo: 'aliado_mediatico', label: 'El País · línea editorial progresista PRISA' },
  { a: MANSO,      b: FEIJOO,   val:  40, tipo: 'aliado_mediatico', label: 'El Mundo · cobertura crítica con el gobierno' },
  { a: RUBIDO,     b: FEIJOO,   val:  45, tipo: 'aliado_mediatico', label: 'El Debate · agenda conservadora cercana al PP' },
  { a: RUBIDO,     b: ABASCAL,  val:  35, tipo: 'aliado_mediatico', label: 'El Debate · sin filtro a posiciones de Vox' },
  { a: PEDROJOTA,  b: FEIJOO,   val:  30, tipo: 'aliado_mediatico', label: 'El Español · escrutinio al gobierno' },
  { a: PABLO_MOTOS,b: AYUSO,    val:  35, tipo: 'aliado_mediatico', label: 'El Hormiguero · audiencia masiva amigable a Ayuso' },
  { a: EVOLE,      b: YOLANDA,  val:  35, tipo: 'aliado_mediatico', label: 'Lo de Évole · entrevistas afines a la izquierda' },
  { a: GABILONDO,  b: SANCHEZ,  val:  28, tipo: 'aliado_mediatico', label: 'Voz histórica · línea editorial progresista' },
  { a: FERRERAS,   b: SANCHEZ,  val:  35, tipo: 'aliado_mediatico', label: 'La Sexta · cobertura matizadamente progresista' },
  { a: VALLES,     b: FEIJOO,   val:  28, tipo: 'aliado_mediatico', label: 'Antena 3 · línea editorial moderada centro-derecha' },
  { a: ANA_PASTOR, b: SANCHEZ,  val:  25, tipo: 'mediador',         label: 'Newtral · fact-checking crítico con todos los partidos' },

  // ═══════════════════════════════════════════════════════════════════
  // 11. PRESIDENTES AUTONÓMICOS ALIADOS DE SANCHEZ (PSOE)
  // ═══════════════════════════════════════════════════════════════════
  { a: SANCHEZ, b: POMBO_BARBON, val: 62, tipo: 'aliado_partido', label: 'Barón PSOE asturiano · disciplinado' },
  { a: PAGE, b: LAMBAN,          val: 68, tipo: 'aliado_partido', label: 'Eje de barones críticos PSOE · coordinación pública' },
  { a: GUARDIOLA, b: ABASCAL,    val: -28, tipo: 'ruptura_coalicion', label: 'Ruptura coalición PP-Vox · Extremadura 2024' },

  // ═══════════════════════════════════════════════════════════════════
  // 12. RELACIONES PERSONAJES SINGULARES
  // ═══════════════════════════════════════════════════════════════════
  { a: REVILLA,   b: SANCHEZ, val:  32, tipo: 'mediador', label: 'Diálogo informal · crítico moderado' },
  { a: REVILLA,   b: FEIJOO,  val:  20, tipo: 'mediador', label: 'Diálogo informal' },
  { a: AZNAR,     b: ZAPATERO,val: -75, tipo: 'oposicion_frontal', label: 'Antagonismo histórico desde la era 2004' },
  { a: AZNAR,     b: RAJOY,   val:  55, tipo: 'aliado_partido',    label: 'Generaciones PP · sintonía estratégica' },
  { a: ZAPATERO,  b: RAJOY,   val: -45, tipo: 'critica_publica',   label: 'Rivalidad ex-presidentes' },
  { a: PUIGDEMONT,b: AZNAR,   val: -85, tipo: 'oposicion_frontal', label: 'Antagonismo total · independentismo vs derechón' },
  { a: OTEGI,     b: ABASCAL, val: -95, tipo: 'oposicion_frontal', label: 'Extremos opuestos · sin punto de encuentro' },
  { a: PUIGDEMONT,b: ABASCAL, val: -92, tipo: 'oposicion_frontal', label: 'Vox impulsa querellas contra el procés' },
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
 * Paleta y groso por tipo de relación · para que el grafo distinga visualmente.
 */
export const TIPO_META: Record<TipoRelacion, { color: string; intensidad: number; cat: 'alianza' | 'conflicto' | 'neutral' }> = {
  coalicion_gobierno:    { color: '#0F766E', intensidad: 1.0, cat: 'alianza' },
  pacto_investidura:     { color: '#0E7490', intensidad: 0.9, cat: 'alianza' },
  pacto_autonomico:      { color: '#0EA5E9', intensidad: 0.8, cat: 'alianza' },
  aliado_partido:        { color: '#2D8A39', intensidad: 0.85, cat: 'alianza' },
  aliado_internacional:  { color: '#7C3AED', intensidad: 0.7, cat: 'alianza' },
  aliado_sindical:       { color: '#A02525', intensidad: 0.7, cat: 'alianza' },
  aliado_mediatico:      { color: '#525258', intensidad: 0.6, cat: 'alianza' },
  mediador:              { color: '#9CA3AF', intensidad: 0.5, cat: 'neutral' },
  oposicion_frontal:     { color: '#DC2626', intensidad: 1.0, cat: 'conflicto' },
  rivalidad_interna:     { color: '#F97316', intensidad: 0.85, cat: 'conflicto' },
  conflicto_judicial:    { color: '#7F1D1D', intensidad: 0.95, cat: 'conflicto' },
  conflicto_territorial: { color: '#B45309', intensidad: 0.8, cat: 'conflicto' },
  bloqueo_legislativo:   { color: '#991B1B', intensidad: 0.9, cat: 'conflicto' },
  critica_publica:       { color: '#D97706', intensidad: 0.6, cat: 'conflicto' },
  ruptura_coalicion:     { color: '#B91C1C', intensidad: 0.95, cat: 'conflicto' },
}

export const TIPO_LABEL: Record<TipoRelacion, string> = {
  coalicion_gobierno:    'Coalición Moncloa',
  pacto_investidura:     'Pacto investidura',
  pacto_autonomico:      'Coalición autonómica',
  aliado_partido:        'Aliado de partido',
  aliado_internacional:  'Alianza internacional',
  aliado_sindical:       'Alianza sindical',
  aliado_mediatico:      'Afinidad mediática',
  mediador:              'Diálogo formal',
  oposicion_frontal:     'Oposición frontal',
  rivalidad_interna:     'Rivalidad interna',
  conflicto_judicial:    'Conflicto judicial',
  conflicto_territorial: 'Conflicto territorial',
  bloqueo_legislativo:   'Bloqueo legislativo',
  critica_publica:       'Crítica pública',
  ruptura_coalicion:     'Ruptura coalición',
}
