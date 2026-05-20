// Dataset compartido de 300+ actores políticos · usado por /agentes y /mapa-actores
// Incluye Gobierno, oposición, diputados, senadores, gobiernos regionales, alcaldes, instituciones, patronal, sindicatos, medios y Europa.

export type Categoria = 'gobierno' | 'oposicion' | 'parlamento' | 'autonomico' | 'municipal' | 'institucion' | 'patronal' | 'sindicato' | 'mediatico' | 'europa'

export type Actor = {
  id: string
  nombre: string
  partido: string
  cargo: string
  cat: Categoria
  color: string
  // posicionamiento en cuadrante ideológico
  ejeX: number   // -100 izquierda · +100 derecha
  ejeY: number   // -100 descentralización · +100 centralización
  // métricas derivadas (deterministas por hash)
  val: number    // 0-10 valoración
  delta: number  // -1.0 .. +1.0 vs mes
  inf: number    // 0-100 influencia
  forts: string[]
  debs: string[]
  evs: string[]
  seg: { f: string; eng: string; tono: number }
}

const PARTY_COLOR: Record<string, string> = {
 'PSOE':'#E1322D','PSC':'#E1322D','PSC-PSOE':'#E1322D',
 'PP':'#1F4E8C','VOX':'#5BA02E','Sumar':'#D43F8D',
 'Junts':'#1FA89B','JxCat':'#1FA89B','ERC':'#E8A030',
 'EH Bildu':'#3F7A3A','PNV':'#7DB94B','EAJ-PNV':'#7DB94B',
 'BNG':'#5BB3D9','CC':'#F2C43A','UPN':'#0E7D8C',
 'Compromís':'#FF8200','Podemos':'#6C2C5E',
 'Casa Real':'#7C3AED','CGPJ':'#7C3AED','TC':'#7C3AED','TS':'#7C3AED','Fiscalía':'#7C3AED',
 'BdE':'#0F766E','BEI':'#0F766E',
 'CEOE':'#0E7490','CEPYME':'#0E7490','ATA':'#0E7490',
 'CCOO':'#A02525','UGT':'#A02525',
 'CSIF':'#0E7490','AUGC':'#525258','Sindicatos':'#A02525',
 'Medios':'#525258','Independiente':'#6e6e73',
}

// Posición ideológica base por partido/grupo (ejeX, ejeY)
const POS_BASE: Record<string, [number, number]> = {
 'PSOE':       [-22,  +12],
 'PSC':        [-15,  -35],
 'PSC-PSOE':   [-15,  -35],
 'PP':         [+38,  -12],
 'VOX':        [+78,  +60],
 'Sumar':      [-58,  -18],
 'Podemos':    [-65,  -10],
 'Junts':      [+12,  -88],
 'JxCat':      [+12,  -88],
 'ERC':        [-32,  -78],
 'EH Bildu':   [-62,  -65],
 'PNV':        [+10,  -72],
 'EAJ-PNV':    [+10,  -72],
 'BNG':        [-50,  -60],
 'CC':         [+8,   -45],
 'UPN':        [+38,  -38],
 'Compromís':  [-42,  -30],
 'Casa Real':  [+5,   +75],
 'CGPJ':       [+5,   +50],
 'TC':         [0,    +55],
 'TS':         [0,    +55],
 'Fiscalía':   [0,    +50],
 'BdE':        [+25,  +60],
 'BEI':        [+10,  +85],
 'CEOE':       [+38,  +35],
 'CEPYME':     [+30,  +30],
 'ATA':        [+22,  +20],
 'CCOO':       [-58,  -3],
 'UGT':        [-52,  -2],
 'Medios':     [0,    +5],
 'Independiente': [0, 0],
}

const FORTS_BY_CAT: Record<Categoria, string[]> = {
  gobierno:   ['Control institucional de su cartera','Equipo técnico consolidado','Acceso a recursos del Estado','Visibilidad mediática constante','Apoyo del aparato del partido'],
  oposicion:  ['Liderazgo claro de su organización','Capacidad de movilización electoral','Discurso reconocible','Red territorial activa','Presencia en debates clave'],
  parlamento: ['Disciplina de voto del grupo','Conocimiento de procedimiento','Capacidad de bloqueo o impulso','Visibilidad en plenos','Vocería estable'],
  autonomico: ['Posición territorial fuerte','Conocimiento del electorado regional','Apoyo del aparato autonómico','Acceso a recursos propios','Red de alcaldías afín'],
  municipal:  ['Notoriedad pública alta','Gestión cercana al ciudadano','Influencia en agenda urbana','Presupuesto municipal directo'],
  institucion:['Independencia institucional','Autoridad técnica reconocida','Marco competencial claro','Influencia transversal'],
  patronal:   ['Representatividad empresarial','Acceso directo al Gobierno','Capacidad de presión sectorial','Red internacional de pares'],
  sindicato:  ['Capacidad de movilización laboral','Red de delegados sindicales','Presencia en mesa de diálogo social','Histórico de pactos'],
  mediatico:  ['Audiencia masiva diaria','Capacidad de marcar agenda','Red de contactos en todas las élites','Influencia editorial'],
  europa:     ['Visibilidad europea','Red de contactos en Bruselas','Capacidad de influir normativa UE','Posicionamiento estratégico'],
}
const DEBS_BY_CAT: Record<Categoria, string[]> = {
  gobierno:   ['Desgaste por gestión cotidiana','Presión presupuestaria','Coordinación con socios de coalición','Exposición a escándalos','Carga de trabajo elevada'],
  oposicion:  ['Aritmética parlamentaria adversa','Tensiones internas en el partido','Limitada iniciativa legislativa','Dependencia del clima electoral'],
  parlamento: ['Visibilidad limitada fuera del Congreso','Rotación frecuente de roles','Dependencia del aparato'],
  autonomico: ['Tensiones con la dirección nacional','Limitaciones presupuestarias','Competencia con otros barones'],
  municipal:  ['Exposición a coyuntura económica local','Negociaciones complejas con CCAA','Riesgo de crisis puntuales'],
  institucion:['Presiones políticas indirectas','Cuestionamiento del nombramiento','Debate sobre independencia'],
  patronal:   ['Heterogeneidad del tejido empresarial','Tensión con sindicatos','Visibilidad pública limitada'],
  sindicato:  ['Caída de afiliación','Fragmentación de demandas','Pérdida de centralidad mediática'],
  mediatico:  ['Polarización de audiencia','Erosión por redes sociales','Costes de producción'],
  europa:     ['Distancia del foco político nacional','Complejidad de procedimientos UE'],
}
const EVS_BY_CAT: Record<Categoria, string[]> = {
  gobierno:   ['Comparecencia en Comisión del Congreso','Reunión bilateral con Bruselas','Anuncio de plan de inversión','Convocatoria de mesa sectorial','Viaje institucional'],
  oposicion:  ['Mitin en gira territorial','Propuesta legislativa registrada','Reunión interna ejecutiva','Comparecencia en debate de prensa'],
  parlamento: ['Defensa de enmienda en pleno','Pregunta oral al Gobierno','Comparecencia en comisión','Acuerdo bilateral con otro grupo'],
  autonomico: ['Conferencia Sectorial en Madrid','Anuncio de presupuestos autonómicos','Reunión con presidentes vecinos','Visita institucional a empresa'],
  municipal:  ['Pleno municipal extraordinario','Visita a barrio en transformación','Reunión con tejido empresarial local'],
  institucion:['Pleno del órgano','Comparecencia ante el Congreso','Publicación de informe técnico','Reunión con homólogos europeos'],
  patronal:   ['Reunión con vicepresidencia económica','Comparecencia en Foro empresarial','Negociación de convenio sectorial'],
  sindicato:  ['Mesa de diálogo social en Moncloa','Convocatoria de movilización','Negociación de SMI'],
  mediatico:  ['Entrevista exclusiva con líder político','Cobertura en directo de pleno','Editorial de impacto en agenda'],
  europa:     ['Sesión plenaria en Estrasburgo','Reunión con la presidencia rotatoria','Negociación en Consejo Europeo'],
}

// Lista base (los mismos 100 actores que /agentes)
type Base = { nombre: string; partido: string; cargo: string; cat: Categoria }
const BASE: Base[] = [
  { nombre:'Pedro Sánchez',         partido:'PSOE',  cargo:'Presidente del Gobierno',                       cat:'gobierno' },
  { nombre:'Alberto Núñez Feijóo',  partido:'PP',    cargo:'Presidente del PP y líder de la oposición',     cat:'oposicion' },
  { nombre:'Santiago Abascal',      partido:'VOX',   cargo:'Presidente de VOX',                              cat:'oposicion' },
  { nombre:'Yolanda Díaz',          partido:'Sumar', cargo:'Vicepresidenta 2ª y referente de Sumar',         cat:'gobierno' },
  { nombre:'María Jesús Montero',   partido:'PSOE',  cargo:'Vicepresidenta 1ª, ministra de Hacienda y candidata PSOE Andalucía', cat:'gobierno' },
  { nombre:'Carlos Cuerpo',         partido:'PSOE',  cargo:'Ministro de Economía, Comercio y Empresa',       cat:'gobierno' },
  { nombre:'Félix Bolaños',         partido:'PSOE',  cargo:'Ministro de Presidencia, Justicia y Cortes',     cat:'gobierno' },
  { nombre:'José Manuel Albares',   partido:'PSOE',  cargo:'Ministro de Asuntos Exteriores, UE y Cooperación', cat:'gobierno' },
  { nombre:'Margarita Robles',      partido:'PSOE',  cargo:'Ministra de Defensa',                            cat:'gobierno' },
  { nombre:'Fernando Grande-Marlaska', partido:'PSOE', cargo:'Ministro del Interior',                        cat:'gobierno' },
  { nombre:'Óscar Puente',          partido:'PSOE',  cargo:'Ministro de Transportes y Movilidad',            cat:'gobierno' },
  { nombre:'Pilar Alegría',         partido:'PSOE',  cargo:'Ministra de Educación · portavoz del PSOE',      cat:'gobierno' },
  { nombre:'Sara Aagesen',          partido:'PSOE',  cargo:'Vicepresidenta 3ª y ministra de Transición Ecológica', cat:'gobierno' },
  { nombre:'Luis Planas',           partido:'PSOE',  cargo:'Ministro de Agricultura, Pesca y Alimentación',  cat:'gobierno' },
  { nombre:'Ángel Víctor Torres',   partido:'PSOE',  cargo:'Ministro de Política Territorial y Memoria Democrática', cat:'gobierno' },
  { nombre:'Isabel Rodríguez',      partido:'PSOE',  cargo:'Ministra de Vivienda y Agenda Urbana',           cat:'gobierno' },
  { nombre:'Mónica García',         partido:'Sumar', cargo:'Ministra de Sanidad',                            cat:'gobierno' },
  { nombre:'Diana Morant',          partido:'PSOE',  cargo:'Ministra de Ciencia, Innovación y Universidades', cat:'gobierno' },
  { nombre:'Elma Saiz',             partido:'PSOE',  cargo:'Ministra de Inclusión, Seguridad Social y Migraciones', cat:'gobierno' },
  { nombre:'Ana Redondo',           partido:'PSOE',  cargo:'Ministra de Igualdad',                           cat:'gobierno' },
  { nombre:'Pablo Bustinduy',       partido:'Sumar', cargo:'Ministro de Derechos Sociales y Consumo',        cat:'gobierno' },
  { nombre:'Sira Rego',             partido:'Sumar', cargo:'Ministra de Juventud e Infancia',                cat:'gobierno' },
  { nombre:'Ernest Urtasun',        partido:'Sumar', cargo:'Ministro de Cultura',                            cat:'gobierno' },
  { nombre:'Óscar López',           partido:'PSOE',  cargo:'Ministro de Transformación Digital y Función Pública', cat:'gobierno' },
  { nombre:'Francina Armengol',     partido:'PSOE',  cargo:'Presidenta del Congreso de los Diputados',       cat:'parlamento' },
  { nombre:'Pedro Rollán',          partido:'PP',    cargo:'Presidente del Senado',                          cat:'parlamento' },
  { nombre:'Cuca Gamarra',          partido:'PP',    cargo:'Dirigente del PP · figura parlamentaria',        cat:'parlamento' },
  { nombre:'Miguel Tellado',        partido:'PP',    cargo:'Secretario general del PP',                      cat:'oposicion' },
  { nombre:'Patxi López',           partido:'PSOE',  cargo:'Portavoz del PSOE en el Congreso',               cat:'parlamento' },
  { nombre:'María José Rodríguez de Millán', partido:'VOX', cargo:'Portavoz de VOX en el Congreso',          cat:'parlamento' },
  { nombre:'Pepa Millán',           partido:'VOX',   cargo:'Voz mediática y parlamentaria de VOX',           cat:'parlamento' },
  { nombre:'Ione Belarra',          partido:'Podemos',  cargo:'Secretaria general de Podemos',               cat:'parlamento' },
  { nombre:'Irene Montero',         partido:'Podemos',  cargo:'Eurodiputada · referente Podemos',            cat:'europa' },
  { nombre:'Carles Puigdemont',     partido:'Junts',    cargo:'Líder de Junts per Catalunya',                cat:'oposicion' },
  { nombre:'Jordi Turull',          partido:'Junts',    cargo:'Secretario general de Junts',                 cat:'parlamento' },
  { nombre:'Miriam Nogueras',       partido:'Junts',    cargo:'Portavoz de Junts en el Congreso',            cat:'parlamento' },
  { nombre:'Oriol Junqueras',       partido:'ERC',      cargo:'Presidente de ERC',                           cat:'oposicion' },
  { nombre:'Gabriel Rufián',        partido:'ERC',      cargo:'Portavoz de ERC en el Congreso',              cat:'parlamento' },
  { nombre:'Marta Rovira',          partido:'ERC',      cargo:'Dirigente estratégica de ERC',                cat:'oposicion' },
  { nombre:'Arnaldo Otegi',         partido:'EH Bildu', cargo:'Coordinador general de EH Bildu',             cat:'oposicion' },
  { nombre:'Mertxe Aizpurua',       partido:'EH Bildu', cargo:'Portavoz de EH Bildu en el Congreso',         cat:'parlamento' },
  { nombre:'Aitor Esteban',         partido:'PNV',      cargo:'Portavoz histórico del PNV en el Congreso',   cat:'parlamento' },
  { nombre:'Andoni Ortuzar',        partido:'PNV',      cargo:'Presidente del EBB del PNV',                  cat:'oposicion' },
  { nombre:'Néstor Rego',           partido:'BNG',      cargo:'Portavoz del BNG en el Congreso',             cat:'parlamento' },
  { nombre:'Ana Pontón',            partido:'BNG',      cargo:'Portavoz nacional del BNG',                   cat:'oposicion' },
  { nombre:'Joan Baldoví',          partido:'Compromís',cargo:'Referente de Compromís',                      cat:'parlamento' },
  { nombre:'Alberto Catalán',       partido:'UPN',      cargo:'Diputado de UPN · Grupo Mixto',               cat:'parlamento' },
  { nombre:'Cristina Valido',       partido:'CC',       cargo:'Diputada de Coalición Canaria',               cat:'parlamento' },
  { nombre:'Javier Maroto',         partido:'PP',       cargo:'Vicepresidente primero del Senado',           cat:'parlamento' },
  { nombre:'José Antonio Monago',   partido:'PP',       cargo:'Senador · figura territorial del PP',         cat:'parlamento' },
  { nombre:'Juan Manuel Moreno Bonilla', partido:'PP', cargo:'Presidente de la Junta de Andalucía',          cat:'autonomico' },
  { nombre:'Isabel Díaz Ayuso',     partido:'PP',       cargo:'Presidenta de la Comunidad de Madrid',        cat:'autonomico' },
  { nombre:'Alfonso Rueda',         partido:'PP',       cargo:'Presidente de la Xunta de Galicia',           cat:'autonomico' },
  { nombre:'Juanfran Pérez Llorca', partido:'PP',       cargo:'Presidente de la Generalitat Valenciana',     cat:'autonomico' },
  { nombre:'Fernando López Miras',  partido:'PP',       cargo:'Presidente de la Región de Murcia',           cat:'autonomico' },
  { nombre:'Jorge Azcón',           partido:'PP',       cargo:'Presidente de Aragón',                        cat:'autonomico' },
  { nombre:'Marga Prohens',         partido:'PP',       cargo:'Presidenta de Baleares',                      cat:'autonomico' },
  { nombre:'María Guardiola',       partido:'PP',       cargo:'Presidenta de Extremadura',                   cat:'autonomico' },
  { nombre:'Alfonso Fernández Mañueco', partido:'PP',  cargo:'Presidente de Castilla y León',                cat:'autonomico' },
  { nombre:'María José Sáenz de Buruaga', partido:'PP',cargo:'Presidenta de Cantabria',                      cat:'autonomico' },
  { nombre:'Gonzalo Capellán',      partido:'PP',       cargo:'Presidente de La Rioja',                      cat:'autonomico' },
  { nombre:'Adrián Barbón',         partido:'PSOE',     cargo:'Presidente de Asturias',                      cat:'autonomico' },
  { nombre:'Emiliano García-Page',  partido:'PSOE',     cargo:'Presidente de Castilla-La Mancha',            cat:'autonomico' },
  { nombre:'Salvador Illa',         partido:'PSC-PSOE', cargo:'Presidente de la Generalitat de Catalunya',   cat:'autonomico' },
  { nombre:'María Chivite',         partido:'PSOE',     cargo:'Presidenta de Navarra',                       cat:'autonomico' },
  { nombre:'Imanol Pradales',       partido:'PNV',      cargo:'Lehendakari del Gobierno Vasco',              cat:'autonomico' },
  { nombre:'Fernando Clavijo',      partido:'CC',       cargo:'Presidente de Canarias',                      cat:'autonomico' },
  { nombre:'Juan Jesús Vivas',      partido:'PP',       cargo:'Presidente de Ceuta',                         cat:'autonomico' },
  { nombre:'Juan José Imbroda',     partido:'PP',       cargo:'Presidente de Melilla',                       cat:'autonomico' },
  { nombre:'Inmaculada Nieto',      partido:'Sumar',    cargo:'Portavoz de Por Andalucía en el Parlamento andaluz', cat:'autonomico' },
  { nombre:'José Luis Martínez-Almeida', partido:'PP', cargo:'Alcalde de Madrid',                            cat:'municipal' },
  { nombre:'Jaume Collboni',        partido:'PSC-PSOE', cargo:'Alcalde de Barcelona',                        cat:'municipal' },
  { nombre:'María José Catalá',     partido:'PP',       cargo:'Alcaldesa de Valencia',                       cat:'municipal' },
  { nombre:'José Luis Sanz',        partido:'PP',       cargo:'Alcalde de Sevilla',                          cat:'municipal' },
  { nombre:'Francisco de la Torre', partido:'PP',       cargo:'Alcalde de Málaga',                           cat:'municipal' },
  { nombre:'Abel Caballero',        partido:'PSOE',     cargo:'Alcalde de Vigo',                             cat:'municipal' },
  { nombre:'Xavier García Albiol',  partido:'PP',       cargo:'Alcalde de Badalona',                         cat:'municipal' },
  { nombre:'Ada Colau',             partido:'Sumar',    cargo:'Figura de izquierdas en Barcelona',           cat:'municipal' },
  { nombre:'Juan Espadas',          partido:'PSOE',     cargo:'Senador y referente del PSOE andaluz',        cat:'parlamento' },
  { nombre:'Teresa Ribera',         partido:'PSOE',     cargo:'Vicepresidenta ejecutiva de la Comisión Europea', cat:'europa' },
  { nombre:'Felipe VI',             partido:'Casa Real',cargo:'Jefe del Estado',                             cat:'institucion' },
  { nombre:'Cándido Conde-Pumpido', partido:'TC',       cargo:'Presidente del Tribunal Constitucional',      cat:'institucion' },
  { nombre:'Isabel Perelló',        partido:'TS',       cargo:'Presidenta del Tribunal Supremo y del CGPJ',  cat:'institucion' },
  { nombre:'Álvaro García Ortiz',   partido:'Fiscalía', cargo:'Fiscal General del Estado',                   cat:'institucion' },
  { nombre:'José Luis Escrivá',     partido:'BdE',      cargo:'Gobernador del Banco de España',              cat:'institucion' },
  { nombre:'Nadia Calviño',         partido:'BEI',      cargo:'Presidenta del Banco Europeo de Inversiones', cat:'europa' },
  { nombre:'Antonio Garamendi',     partido:'CEOE',     cargo:'Presidente de la CEOE',                       cat:'patronal' },
  { nombre:'Gerardo Cuerva',        partido:'CEPYME',   cargo:'Presidente de CEPYME',                        cat:'patronal' },
  { nombre:'Lorenzo Amor',          partido:'ATA',      cargo:'Presidente de ATA · Federación Autónomos',    cat:'patronal' },
  { nombre:'Pepe Álvarez',          partido:'UGT',      cargo:'Secretario general de UGT',                   cat:'sindicato' },
  { nombre:'Unai Sordo',            partido:'CCOO',     cargo:'Secretario general de CCOO',                  cat:'sindicato' },
  { nombre:'Cristina Narbona',      partido:'PSOE',     cargo:'Presidenta del PSOE',                         cat:'oposicion' },
  { nombre:'Dolors Montserrat',     partido:'PP',       cargo:'Eurodiputada del PP · figura europea',        cat:'europa' },
  { nombre:'Jorge Buxadé',          partido:'VOX',      cargo:'Eurodiputado de VOX',                         cat:'europa' },
  { nombre:'Estrella Galán',        partido:'Sumar',    cargo:'Eurodiputada de Sumar',                       cat:'europa' },
  { nombre:'Antonio García Ferreras', partido:'Medios', cargo:'Director y presentador · La Sexta',           cat:'mediatico' },
  { nombre:'Carlos Herrera',        partido:'Medios',   cargo:'Periodista · COPE · agenda conservadora',     cat:'mediatico' },
  { nombre:'Àngels Barceló',        partido:'Medios',   cargo:'Periodista · Cadena SER · agenda progresista',cat:'mediatico' },
  { nombre:'Ana Rosa Quintana',     partido:'Medios',   cargo:'Presentadora · agenda pública matinal',       cat:'mediatico' },
  { nombre:'Pedro J. Ramírez',      partido:'Medios',   cargo:'Director de El Español · influencia editorial', cat:'mediatico' },
]

// ───── 200+ actores adicionales: gobiernos regionales, diputados, senadores, alcaldes ─────
const BASE_EXTENDED: Base[] = [
  // ── ANDALUCÍA · Gobierno Moreno Bonilla (PP) ──
  { nombre:'Antonio Sanz',          partido:'PP',       cargo:'Vicepresidente y consejero de Presidencia · Junta de Andalucía', cat:'autonomico' },
  { nombre:'Carolina España',       partido:'PP',       cargo:'Consejera de Hacienda · Junta de Andalucía',  cat:'autonomico' },
  { nombre:'Catalina García',       partido:'PP',       cargo:'Consejera de Salud y Consumo · Junta de Andalucía', cat:'autonomico' },
  { nombre:'Patricia del Pozo',     partido:'PP',       cargo:'Consejera de Cultura y Deporte · Junta de Andalucía', cat:'autonomico' },
  { nombre:'Rocío Díaz',            partido:'PP',       cargo:'Consejera de Fomento, Articulación del Territorio y Vivienda', cat:'autonomico' },
  { nombre:'Ramón Fernández-Pacheco', partido:'PP',     cargo:'Consejero de Sostenibilidad y Medio Ambiente · Andalucía', cat:'autonomico' },
  { nombre:'Jorge Paradela',        partido:'PP',       cargo:'Consejero de Industria, Energía y Minas · Andalucía', cat:'autonomico' },
  { nombre:'Arturo Bernal',         partido:'PP',       cargo:'Consejero de Turismo, Cultura y Deporte · Andalucía', cat:'autonomico' },
  { nombre:'Loles López',           partido:'PP',       cargo:'Consejera de Inclusión Social, Juventud, Familias e Igualdad', cat:'autonomico' },

  // ── ARAGÓN · Gobierno Azcón (PP) ──
  { nombre:'Mar Vaquero',           partido:'PP',       cargo:'Vicepresidenta y consejera de Presidencia · Aragón', cat:'autonomico' },
  { nombre:'Roberto Bermúdez de Castro', partido:'PP', cargo:'Consejero de Presidencia, Interior y Cultura · Aragón', cat:'autonomico' },
  { nombre:'Manuel Magdaleno',      partido:'PP',       cargo:'Consejero de Hacienda · Aragón',              cat:'autonomico' },
  { nombre:'Claudia Pérez Forniés', partido:'PP',       cargo:'Consejera de Educación, Ciencia y Universidades · Aragón', cat:'autonomico' },
  { nombre:'Pilar Alegría (Aragón)', partido:'PSOE',    cargo:'Secretaria general PSOE-Aragón · líder oposición', cat:'autonomico' },

  // ── ASTURIAS · Gobierno Barbón (PSOE) ──
  { nombre:'Borja Sánchez',         partido:'PSOE',     cargo:'Vicepresidente y consejero de Ciencia · Asturias', cat:'autonomico' },
  { nombre:'Gimena Llamedo',        partido:'PSOE',     cargo:'Consejera de Presidencia · Asturias',         cat:'autonomico' },
  { nombre:'Guillermo Peláez',      partido:'PSOE',     cargo:'Consejero de Hacienda · Asturias',            cat:'autonomico' },
  { nombre:'Diego Canga',           partido:'PP',       cargo:'Portavoz del PP en la Junta General del Principado', cat:'autonomico' },

  // ── BALEARES · Gobierno Prohens (PP) ──
  { nombre:'Antoni Costa',          partido:'PP',       cargo:'Vicepresidente y consejero de Economía · Baleares', cat:'autonomico' },
  { nombre:'Antoni Vera',           partido:'PP',       cargo:'Consejero de Educación · Baleares',           cat:'autonomico' },
  { nombre:'Manuela García',        partido:'PP',       cargo:'Consejera de Salud · Baleares',               cat:'autonomico' },
  { nombre:'Jaume Bauzá',           partido:'PP',       cargo:'Consejero de Turismo, Cultura y Deportes · Baleares', cat:'autonomico' },
  { nombre:'Francina Armengol (Baleares)', partido:'PSOE', cargo:'Histórica del PSOE balear · expresidenta autonómica', cat:'autonomico' },

  // ── CANARIAS · Gobierno Clavijo (CC + PP) ──
  { nombre:'Manuel Domínguez',      partido:'PP',       cargo:'Vicepresidente del Gobierno de Canarias',     cat:'autonomico' },
  { nombre:'Matilde Asián',         partido:'PP',       cargo:'Consejera de Hacienda y Relaciones con la UE · Canarias', cat:'autonomico' },
  { nombre:'Esther Monzón',         partido:'CC',       cargo:'Consejera de Sanidad · Canarias',             cat:'autonomico' },
  { nombre:'Poli Suárez',           partido:'PP',       cargo:'Consejero de Educación · Canarias',           cat:'autonomico' },
  { nombre:'Nira Fierro',           partido:'PSOE',     cargo:'Secretaria de organización PSOE Canarias',    cat:'autonomico' },

  // ── CANTABRIA · Gobierno Buruaga (PP) ──
  { nombre:'Isabel Urrutia',        partido:'PP',       cargo:'Vicepresidenta y consejera Empleo · Cantabria', cat:'autonomico' },
  { nombre:'Eduardo Arasti',        partido:'PP',       cargo:'Consejero de Industria, Innovación y Energía · Cantabria', cat:'autonomico' },
  { nombre:'César Pascual',         partido:'PP',       cargo:'Consejero de Salud · Cantabria',              cat:'autonomico' },
  { nombre:'Pablo Zuloaga',         partido:'PSOE',     cargo:'Secretario general PSC-PSOE · líder oposición Cantabria', cat:'autonomico' },

  // ── CASTILLA-LA MANCHA · Gobierno García-Page (PSOE) ──
  { nombre:'José Manuel Caballero', partido:'PSOE',     cargo:'Vicepresidente · Castilla-La Mancha',         cat:'autonomico' },
  { nombre:'Juan Alfonso Ruiz Molina', partido:'PSOE', cargo:'Consejero de Hacienda · Castilla-La Mancha',  cat:'autonomico' },
  { nombre:'Esther Padilla',        partido:'PSOE',     cargo:'Consejera de Bienestar Social · Castilla-La Mancha', cat:'autonomico' },
  { nombre:'Concepción Cedillo',    partido:'PSOE',     cargo:'Consejera de Igualdad · Castilla-La Mancha',  cat:'autonomico' },
  { nombre:'Paco Núñez',            partido:'PP',       cargo:'Presidente PP-CLM · líder oposición autonómica', cat:'autonomico' },

  // ── CASTILLA Y LEÓN · Gobierno Mañueco (PP) ──
  { nombre:'Carlos Fernández Carriedo', partido:'PP',  cargo:'Consejero de Economía y Hacienda · portavoz CyL', cat:'autonomico' },
  { nombre:'Juan Carlos Suárez-Quiñones', partido:'PP', cargo:'Consejero de Medio Ambiente, Vivienda y Ordenación · CyL', cat:'autonomico' },
  { nombre:'Isabel Blanco',         partido:'PP',       cargo:'Vicepresidenta y consejera de Familia · CyL', cat:'autonomico' },
  { nombre:'Alejandro Vázquez',     partido:'PP',       cargo:'Consejero de Sanidad · CyL',                  cat:'autonomico' },
  { nombre:'Rocío Lucas',           partido:'PP',       cargo:'Consejera de Educación · CyL',                cat:'autonomico' },
  { nombre:'Luis Tudanca',          partido:'PSOE',     cargo:'Portavoz del PSOE en las Cortes de CyL',      cat:'autonomico' },

  // ── CATALUÑA · Gobierno Illa (PSC) ──
  { nombre:'Albert Dalmau',         partido:'PSC-PSOE', cargo:'Conseller de Presidencia · Generalitat',      cat:'autonomico' },
  { nombre:'Núria Parlon',          partido:'PSC-PSOE', cargo:'Consellera d\'Interior i Seguretat Pública · Catalunya', cat:'autonomico' },
  { nombre:'Sílvia Paneque',        partido:'PSC-PSOE', cargo:'Portavoz y consellera de Territori · Catalunya', cat:'autonomico' },
  { nombre:'Eva Menor',             partido:'PSC-PSOE', cargo:'Consellera de Salut · Catalunya',             cat:'autonomico' },
  { nombre:'Alícia Romero',         partido:'PSC-PSOE', cargo:'Consellera d\'Economia i Finances · Catalunya', cat:'autonomico' },
  { nombre:'Jaume Duch',            partido:'PSC-PSOE', cargo:'Conseller d\'Unió Europea i Acció Exterior',  cat:'autonomico' },
  { nombre:'Esther Niubó',          partido:'PSC-PSOE', cargo:'Consellera d\'Educació i Formació Professional', cat:'autonomico' },

  // ── CEUTA · Gobierno Vivas (PP) ──
  { nombre:'Carlos Rontomé',        partido:'PP',       cargo:'Vicepresidente · Ciudad Autónoma de Ceuta',   cat:'autonomico' },
  { nombre:'Mabel Deu',             partido:'PP',       cargo:'Consejera de Hacienda · Ceuta',               cat:'autonomico' },

  // ── EXTREMADURA · Gobierno Guardiola (PP) ──
  { nombre:'José Antonio Sánchez Juliá', partido:'PP', cargo:'Vicepresidente y consejero Hacienda · Extremadura', cat:'autonomico' },
  { nombre:'Elena Manzano',         partido:'PP',       cargo:'Consejera de Cultura · Extremadura',          cat:'autonomico' },
  { nombre:'Sara García Espada',    partido:'PP',       cargo:'Consejera de Salud · Extremadura',            cat:'autonomico' },
  { nombre:'Miguel Ángel Gallardo', partido:'PSOE',     cargo:'Secretario general PSOE-Extremadura · líder oposición', cat:'autonomico' },

  // ── GALICIA · Gobierno Rueda (PP) ──
  { nombre:'Diego Calvo',           partido:'PP',       cargo:'Vicepresidente primero y conselleiro Presidencia · Galicia', cat:'autonomico' },
  { nombre:'Miguel Corgos',         partido:'PP',       cargo:'Conselleiro de Facenda e Administración Pública · Galicia', cat:'autonomico' },
  { nombre:'Julio García Comesaña', partido:'PP',       cargo:'Conselleiro de Sanidade · Galicia',           cat:'autonomico' },
  { nombre:'José González',         partido:'PP',       cargo:'Conselleiro de Medio Rural · Galicia',        cat:'autonomico' },
  { nombre:'Román Rodríguez',       partido:'PP',       cargo:'Conselleiro de Cultura, Lingua e Xuventude · Galicia', cat:'autonomico' },
  { nombre:'Ethel Vázquez',         partido:'PP',       cargo:'Conselleira de Vivenda e Planificación de Infraestruturas', cat:'autonomico' },
  { nombre:'José Ramón Gómez Besteiro', partido:'PSOE', cargo:'Secretario general PSdeG-PSOE · oposición Galicia', cat:'autonomico' },

  // ── LA RIOJA · Gobierno Capellán (PP) ──
  { nombre:'Sara Orradre',          partido:'PP',       cargo:'Vicepresidenta y portavoz · La Rioja',        cat:'autonomico' },
  { nombre:'Daniel Osés',           partido:'PP',       cargo:'Consejero de Hacienda · La Rioja',            cat:'autonomico' },
  { nombre:'María Martín Díez de Baldeón', partido:'PP', cargo:'Consejera de Salud y Políticas Sociales · La Rioja', cat:'autonomico' },
  { nombre:'Concha Andreu',         partido:'PSOE',     cargo:'Expresidenta y senadora autonómica · La Rioja', cat:'autonomico' },

  // ── MADRID · Gobierno Ayuso (PP) ──
  { nombre:'Miguel Ángel García Martín', partido:'PP', cargo:'Vicepresidente, consejero de Economía y portavoz · Madrid', cat:'autonomico' },
  { nombre:'Rocío Albert',          partido:'PP',       cargo:'Consejera de Hacienda · Comunidad de Madrid', cat:'autonomico' },
  { nombre:'Fátima Matute',         partido:'PP',       cargo:'Consejera de Sanidad · Madrid',               cat:'autonomico' },
  { nombre:'Emilio Viciana',        partido:'PP',       cargo:'Consejero de Educación, Ciencia y Universidades · Madrid', cat:'autonomico' },
  { nombre:'Jorge Rodrigo',         partido:'PP',       cargo:'Consejero de Vivienda, Transportes e Infraestructuras · Madrid', cat:'autonomico' },
  { nombre:'Mariano de Paco Serrano', partido:'PP',     cargo:'Consejero de Cultura, Turismo y Deporte · Madrid', cat:'autonomico' },
  { nombre:'Carlos Novillo',        partido:'PP',       cargo:'Consejero de Medio Ambiente, Agricultura e Interior · Madrid', cat:'autonomico' },
  { nombre:'Ana Dávila',            partido:'PP',       cargo:'Consejera de Familia, Juventud y Asuntos Sociales · Madrid', cat:'autonomico' },
  { nombre:'Mar Espinar',           partido:'PSOE',     cargo:'Portavoz del PSOE en la Asamblea de Madrid',  cat:'autonomico' },
  { nombre:'Manuela Bergerot',      partido:'Sumar',    cargo:'Portavoz de Más Madrid en la Asamblea',       cat:'autonomico' },
  { nombre:'Rocío Monasterio',      partido:'VOX',      cargo:'Portavoz de VOX en la Asamblea de Madrid',    cat:'autonomico' },

  // ── MELILLA · Gobierno Imbroda (PP) ──
  { nombre:'Miguel Marín',          partido:'PP',       cargo:'Vicepresidente segundo y consejero · Melilla', cat:'autonomico' },
  { nombre:'Esther Donoso',         partido:'PP',       cargo:'Consejera de Hacienda · Melilla',             cat:'autonomico' },

  // ── MURCIA · Gobierno López Miras (PP) ──
  { nombre:'Marcos Ortuño',         partido:'PP',       cargo:'Consejero de Presidencia, Portavocía y Acción Exterior · Murcia', cat:'autonomico' },
  { nombre:'Luis Alfonso Marín',    partido:'PP',       cargo:'Consejero de Economía, Hacienda y Empresa · Murcia', cat:'autonomico' },
  { nombre:'Juan José Pedreño',     partido:'PP',       cargo:'Consejero de Salud · Murcia',                 cat:'autonomico' },
  { nombre:'Víctor Marín',          partido:'PP',       cargo:'Consejero de Educación, Formación Profesional y Empleo · Murcia', cat:'autonomico' },
  { nombre:'Francisco Lucas',       partido:'PSOE',     cargo:'Secretario general PSOE-RM · líder oposición', cat:'autonomico' },

  // ── NAVARRA · Gobierno Chivite (PSN-Geroa Bai-Sumar) ──
  { nombre:'Ana Ollo',              partido:'PNV',      cargo:'Vicepresidenta primera · Gobierno de Navarra (Geroa Bai)', cat:'autonomico' },
  { nombre:'Félix Taberna',         partido:'PSOE',     cargo:'Consejero de Economía y Hacienda · Navarra',  cat:'autonomico' },
  { nombre:'Begoña Alfaro',         partido:'Sumar',    cargo:'Consejera de Derechos Sociales · Navarra',    cat:'autonomico' },
  { nombre:'Javier Esparza',        partido:'UPN',      cargo:'Presidente de UPN · líder oposición Navarra', cat:'autonomico' },

  // ── PAÍS VASCO · Gobierno Pradales (PNV-PSE) ──
  { nombre:'Mikel Torres',          partido:'PSOE',     cargo:'Vicelehendakari primero (PSE-EE) · Euskadi',  cat:'autonomico' },
  { nombre:'María Ubarretxena',     partido:'PNV',      cargo:'Consejera de Gobernanza · Gobierno Vasco',    cat:'autonomico' },
  { nombre:'Maite Alonso',          partido:'PNV',      cargo:'Consejera de Educación · Gobierno Vasco',     cat:'autonomico' },
  { nombre:'Alberto Martínez',      partido:'PNV',      cargo:'Consejero de Salud · Gobierno Vasco',         cat:'autonomico' },
  { nombre:'Bingen Zupiria',        partido:'PNV',      cargo:'Consejero de Cultura y Política Lingüística · Euskadi', cat:'autonomico' },
  { nombre:'Noelia Arroyo',         partido:'PP',       cargo:'Alcaldesa de Cartagena · figura PP-Murcia',   cat:'municipal' },
  { nombre:'Pello Otxandiano',      partido:'EH Bildu', cargo:'Candidato lehendakari EH Bildu · líder parlamentario', cat:'autonomico' },

  // ── COMUNIDAD VALENCIANA · Gobierno Pérez Llorca (PP) ──
  { nombre:'Susana Camarero',       partido:'PP',       cargo:'Vicepresidenta y consellera Servicios Sociales · Valencia', cat:'autonomico' },
  { nombre:'Juan Bautista Ruiz',    partido:'PP',       cargo:'Conseller de Hacienda y Modelo Económico · Valencia', cat:'autonomico' },
  { nombre:'Marciano Gómez',        partido:'PP',       cargo:'Conseller de Sanidad · Generalitat Valenciana', cat:'autonomico' },
  { nombre:'José Antonio Rovira',   partido:'PP',       cargo:'Conseller de Educación, Universidades y Empleo · Valencia', cat:'autonomico' },
  { nombre:'Vicente Martínez Mus',  partido:'PP',       cargo:'Conseller de Medio Ambiente, Infraestructuras y Territorio · Valencia', cat:'autonomico' },
  { nombre:'Diana Morant (Valencia)', partido:'PSOE',   cargo:'Secretaria general PSPV-PSOE · líder oposición Valencia', cat:'autonomico' },

  // ── DIPUTADOS PSOE en el Congreso ──
  { nombre:'Esther Peña',           partido:'PSOE',     cargo:'Portavoz parlamentaria del PSOE',             cat:'parlamento' },
  { nombre:'Eva Granados',          partido:'PSOE',     cargo:'Secretaria de Política Federal del PSOE',     cat:'parlamento' },
  { nombre:'Pilar Cancela',         partido:'PSOE',     cargo:'Diputada PSOE · ex-secretaria de Estado',     cat:'parlamento' },
  { nombre:'Susana Sumelzo',        partido:'PSOE',     cargo:'Diputada PSOE · Aragón',                      cat:'parlamento' },
  { nombre:'Felipe Sicilia',        partido:'PSOE',     cargo:'Diputado PSOE · portavoz Interior',           cat:'parlamento' },
  { nombre:'David Lucas',           partido:'PSOE',     cargo:'Secretario de Estado de Vivienda · diputado PSOE', cat:'parlamento' },
  { nombre:'Pedro Casares',         partido:'PSOE',     cargo:'Portavoz adjunto y portavoz Economía PSOE',   cat:'parlamento' },
  { nombre:'Manuel Cruz',           partido:'PSOE',     cargo:'Diputado PSOE · ex-presidente del Senado',    cat:'parlamento' },
  { nombre:'José Luis Ábalos',      partido:'Independiente', cargo:'Diputado del Grupo Mixto · ex-ministro PSOE', cat:'parlamento' },
  { nombre:'Adriana Maldonado',     partido:'PSOE',     cargo:'Diputada PSOE · agenda exterior',             cat:'parlamento' },
  { nombre:'Bárbara Pons',          partido:'PSOE',     cargo:'Diputada PSOE · Baleares',                    cat:'parlamento' },
  { nombre:'Joaquín Pérez Rey',     partido:'Sumar',    cargo:'Secretario de Estado de Trabajo · diputado',  cat:'parlamento' },
  { nombre:'Andrea Fernández',      partido:'PSOE',     cargo:'Secretaria de Igualdad PSOE · diputada',      cat:'parlamento' },
  { nombre:'Luis Tudanca (PSOE)',   partido:'PSOE',     cargo:'Diputado PSOE · ex-secretario CyL',           cat:'parlamento' },

  // ── DIPUTADOS PP en el Congreso ──
  { nombre:'Borja Sémper',          partido:'PP',       cargo:'Portavoz nacional del PP · vicesecretario Cultura', cat:'parlamento' },
  { nombre:'Ester Muñoz',           partido:'PP',       cargo:'Portavoz parlamentaria del PP en el Congreso', cat:'parlamento' },
  { nombre:'Sandra Moneo',          partido:'PP',       cargo:'Portavoz adjunta PP · Educación',             cat:'parlamento' },
  { nombre:'Cayetana Álvarez de Toledo', partido:'PP', cargo:'Diputada PP · figura mediática',              cat:'parlamento' },
  { nombre:'Pablo Hispán',          partido:'PP',       cargo:'Portavoz PP de Asuntos Exteriores',           cat:'parlamento' },
  { nombre:'Alma Ezcurra',          partido:'PP',       cargo:'Diputada PP · responsable de Programas',      cat:'parlamento' },
  { nombre:'Macarena Montesinos',   partido:'PP',       cargo:'Diputada PP · Mesa del Congreso',             cat:'parlamento' },
  { nombre:'Ana Vázquez',           partido:'PP',       cargo:'Portavoz PP de Seguridad e Interior',         cat:'parlamento' },
  { nombre:'Carlos Rojas',          partido:'PP',       cargo:'Portavoz PP de Asuntos Exteriores · Granada', cat:'parlamento' },
  { nombre:'Marta González',        partido:'PP',       cargo:'Diputada PP · portavoz adjunta',              cat:'parlamento' },
  { nombre:'José Antonio Bermúdez de Castro', partido:'PP', cargo:'Diputado PP · Justicia',                 cat:'parlamento' },
  { nombre:'Rafael Hernando',       partido:'PP',       cargo:'Senador y portavoz PP histórico',             cat:'parlamento' },
  { nombre:'Juan Bravo',            partido:'PP',       cargo:'Vicesecretario de Economía PP · diputado',    cat:'parlamento' },
  { nombre:'Elías Bendodo',         partido:'PP',       cargo:'Vicesecretario de Coordinación PP · diputado', cat:'parlamento' },
  { nombre:'Carmen Fúnez',          partido:'PP',       cargo:'Vicesecretaria de Movilización PP',           cat:'parlamento' },

  // ── DIPUTADOS VOX en el Congreso ──
  { nombre:'José María Figaredo',   partido:'VOX',      cargo:'Portavoz adjunto VOX · Economía',             cat:'parlamento' },
  { nombre:'Manuel Mariscal',       partido:'VOX',      cargo:'Diputado VOX · vicesecretario Comunicación',  cat:'parlamento' },
  { nombre:'Patricia Rueda',        partido:'VOX',      cargo:'Diputada VOX · portavoz Igualdad',            cat:'parlamento' },
  { nombre:'Carla Toscano',         partido:'VOX',      cargo:'Diputada VOX · agenda cultural',              cat:'parlamento' },
  { nombre:'Pablo Sáez',            partido:'VOX',      cargo:'Diputado VOX · portavoz Educación',           cat:'parlamento' },
  { nombre:'Ignacio Garriga',       partido:'VOX',      cargo:'Secretario general VOX · líder en Cataluña',  cat:'parlamento' },
  { nombre:'Iván Espinosa de los Monteros', partido:'Independiente', cargo:'Ex-portavoz VOX · think-tank Atenea', cat:'parlamento' },

  // ── DIPUTADOS Sumar / Podemos ──
  { nombre:'Marta Lois',            partido:'Sumar',    cargo:'Portavoz parlamentaria Sumar · Galicia',      cat:'parlamento' },
  { nombre:'Tesh Sidi',             partido:'Sumar',    cargo:'Diputada Sumar · agenda migración',           cat:'parlamento' },
  { nombre:'Aina Vidal',            partido:'Sumar',    cargo:'Diputada Sumar · portavoz Trabajo',           cat:'parlamento' },
  { nombre:'Alberto Ibáñez',        partido:'Sumar',    cargo:'Diputado Sumar · País Valencià',              cat:'parlamento' },
  { nombre:'Verónica Martínez',     partido:'Sumar',    cargo:'Diputada Sumar · agenda territorial',         cat:'parlamento' },
  { nombre:'Lilith Verstrynge',     partido:'Podemos',  cargo:'Portavoz Podemos en el Congreso',             cat:'parlamento' },
  { nombre:'Javier Sánchez Serna',  partido:'Podemos',  cargo:'Diputado Podemos · Murcia',                   cat:'parlamento' },
  { nombre:'Pablo Fernández',       partido:'Podemos',  cargo:'Portavoz nacional Podemos',                   cat:'parlamento' },
  { nombre:'Roberto Uriarte',       partido:'Podemos',  cargo:'Diputado Podemos · Euskadi',                  cat:'parlamento' },

  // ── DIPUTADOS Junts / ERC / EH Bildu / PNV / BNG ──
  { nombre:'Marta Madrenas',        partido:'Junts',    cargo:'Diputada Junts en el Congreso',               cat:'parlamento' },
  { nombre:'Josep Maria Cruset',    partido:'Junts',    cargo:'Diputado Junts · agenda territorial',         cat:'parlamento' },
  { nombre:'Isidre Gavín',          partido:'Junts',    cargo:'Diputado Junts · Cataluña',                   cat:'parlamento' },
  { nombre:'Pilar Vallugera',       partido:'ERC',      cargo:'Diputada ERC · agenda judicial',              cat:'parlamento' },
  { nombre:'Joan Capdevila',        partido:'ERC',      cargo:'Diputado ERC · agenda económica',             cat:'parlamento' },
  { nombre:'Inés Granollers',       partido:'ERC',      cargo:'Diputada ERC · agenda agraria',               cat:'parlamento' },
  { nombre:'Oskar Matute',          partido:'EH Bildu', cargo:'Portavoz adjunto EH Bildu · Congreso',        cat:'parlamento' },
  { nombre:'Iñaki Ruiz de Pinedo',  partido:'EH Bildu', cargo:'Diputado EH Bildu · agenda territorial',      cat:'parlamento' },
  { nombre:'Idoia Sagastizabal',    partido:'PNV',      cargo:'Diputada PNV · portavoz Economía',            cat:'parlamento' },
  { nombre:'Mikel Legarda',         partido:'PNV',      cargo:'Diputado PNV · portavoz Justicia',            cat:'parlamento' },
  { nombre:'Maribel Vaquero',       partido:'PNV',      cargo:'Diputada PNV · portavoz Hacienda',            cat:'parlamento' },

  // ── SENADORES ──
  { nombre:'Alicia García',         partido:'PP',       cargo:'Portavoz PP en el Senado',                    cat:'parlamento' },
  { nombre:'Ander Gil',             partido:'PSOE',     cargo:'Senador PSOE · ex-presidente del Senado',     cat:'parlamento' },
  { nombre:'Eva Granados (Senado)', partido:'PSOE',     cargo:'Senadora PSOE · portavoz Economía',           cat:'parlamento' },
  { nombre:'Mirella Cortès',        partido:'ERC',      cargo:'Senadora ERC',                                cat:'parlamento' },
  { nombre:'Josep Lluís Cleries',   partido:'Junts',    cargo:'Portavoz Junts en el Senado',                 cat:'parlamento' },
  { nombre:'Estefanía Beltrán de Heredia', partido:'PNV', cargo:'Portavoz PNV en el Senado',                cat:'parlamento' },
  { nombre:'Gorka Elejabarrieta',   partido:'EH Bildu', cargo:'Portavoz EH Bildu en el Senado',              cat:'parlamento' },
  { nombre:'Yolanda Merelo',        partido:'VOX',      cargo:'Portavoz VOX en el Senado',                   cat:'parlamento' },
  { nombre:'Carles Mulet',          partido:'Compromís',cargo:'Portavoz Compromís en el Senado',             cat:'parlamento' },
  { nombre:'Eva Bravo',             partido:'PP',       cargo:'Senadora PP · portavoz adjunta',              cat:'parlamento' },
  { nombre:'Adolfo Suárez Illana',  partido:'PP',       cargo:'Senador PP · figura histórica',               cat:'parlamento' },
  { nombre:'Carmen Calvo',          partido:'PSOE',     cargo:'Presidenta del Consejo de Estado · ex-vicepresidenta', cat:'institucion' },

  // ── ALCALDES adicionales ──
  { nombre:'Natalia Chueca',        partido:'PP',       cargo:'Alcaldesa de Zaragoza',                       cat:'municipal' },
  { nombre:'Carlos Velázquez',      partido:'PP',       cargo:'Alcalde de Toledo',                           cat:'municipal' },
  { nombre:'Inés Rey',              partido:'PSOE',     cargo:'Alcaldesa de A Coruña',                       cat:'municipal' },
  { nombre:'Goretti Sanmartín',     partido:'BNG',      cargo:'Alcaldesa de Santiago de Compostela',         cat:'municipal' },
  { nombre:'José Manuel Bermúdez',  partido:'CC',       cargo:'Alcalde de Santa Cruz de Tenerife',           cat:'municipal' },
  { nombre:'Luis Yeray Gutiérrez',  partido:'PSOE',     cargo:'Alcalde de La Laguna',                        cat:'municipal' },
  { nombre:'Carolina Darias',       partido:'PSOE',     cargo:'Alcaldesa de Las Palmas de Gran Canaria',     cat:'municipal' },
  { nombre:'Jesús Julio Carnero',   partido:'PP',       cargo:'Alcalde de Valladolid',                       cat:'municipal' },
  { nombre:'Carlos García Carbayo', partido:'PP',       cargo:'Alcalde de Salamanca',                        cat:'municipal' },
  { nombre:'Luis Salaya',           partido:'PSOE',     cargo:'Ex-alcalde de Cáceres · figura PSOE-Ex',      cat:'municipal' },
  { nombre:'Rafael Mateos',         partido:'PP',       cargo:'Alcalde de Cáceres',                          cat:'municipal' },
  { nombre:'Begoña Carrasco',       partido:'PP',       cargo:'Alcaldesa de Castellón',                      cat:'municipal' },
  { nombre:'Pilar Bernabé',         partido:'PSOE',     cargo:'Delegada del Gobierno en la Comunidad Valenciana', cat:'gobierno' },
  { nombre:'Francisco Martínez Arroyo', partido:'PSOE', cargo:'Delegado del Gobierno en Castilla-La Mancha', cat:'gobierno' },
  { nombre:'Francisco Vázquez',     partido:'PSOE',     cargo:'Senador PSOE · figura histórica gallega',     cat:'parlamento' },
  { nombre:'Pedro Cavadas',         partido:'Independiente', cargo:'Cirujano y referente social · valencia', cat:'mediatico' },

  // ── INSTITUCIONES Y JUSTICIA ──
  { nombre:'Carlos Lesmes',         partido:'CGPJ',     cargo:'Ex-presidente del CGPJ y TS · figura jurídica', cat:'institucion' },
  { nombre:'Pablo Lucas',           partido:'TS',       cargo:'Magistrado del Supremo · presidente sala militar', cat:'institucion' },
  { nombre:'Manuel Marchena',       partido:'TS',       cargo:'Magistrado del Tribunal Supremo · sala penal', cat:'institucion' },
  { nombre:'Inmaculada Montalbán',  partido:'TC',       cargo:'Magistrada del Tribunal Constitucional',      cat:'institucion' },
  { nombre:'Cándido Pérez',         partido:'CGPJ',     cargo:'Vocal del CGPJ',                              cat:'institucion' },
  { nombre:'Dolores Delgado',       partido:'Fiscalía', cargo:'Ex-fiscal general · jefa Memoria Democrática', cat:'institucion' },
  { nombre:'María Galindo',         partido:'CGPJ',     cargo:'Vocal del CGPJ · presidenta sección',         cat:'institucion' },

  // ── EUROPA ──
  { nombre:'Esteban González Pons', partido:'PP',       cargo:'Eurodiputado PP · vicepresidente PPE',        cat:'europa' },
  { nombre:'Iratxe García Pérez',   partido:'PSOE',     cargo:'Presidenta grupo S&D en Parlamento Europeo',  cat:'europa' },
  { nombre:'Adrián Vázquez',        partido:'PP',       cargo:'Eurodiputado PP · ex-Renew',                  cat:'europa' },
  { nombre:'Manu Pineda',           partido:'Sumar',    cargo:'Eurodiputado de Izquierda Unida',             cat:'europa' },
  { nombre:'Diana Riba',            partido:'ERC',      cargo:'Eurodiputada ERC · Verdes europeos',          cat:'europa' },
  { nombre:'Pernando Barrena',      partido:'EH Bildu', cargo:'Eurodiputado EH Bildu',                       cat:'europa' },

  // ── MEDIOS extra ──
  { nombre:'Susanna Griso',         partido:'Medios',   cargo:'Presentadora · Espejo Público (Antena 3)',    cat:'mediatico' },
  { nombre:'Iñaki Gabilondo',       partido:'Medios',   cargo:'Periodista de referencia · agenda progresista', cat:'mediatico' },
  { nombre:'Jordi Évole',           partido:'Medios',   cargo:'Periodista · Lo de Évole',                    cat:'mediatico' },
  { nombre:'Sonsoles Ónega',        partido:'Medios',   cargo:'Presentadora · Sonsoles ¿Y ahora qué? (A3)',  cat:'mediatico' },
  { nombre:'Ana Pastor',            partido:'Medios',   cargo:'Periodista · cofundadora de Newtral',         cat:'mediatico' },
  { nombre:'Risto Mejide',          partido:'Medios',   cargo:'Presentador · Todo es mentira (Cuatro)',      cat:'mediatico' },
  { nombre:'Pablo Motos',           partido:'Medios',   cargo:'Presentador · El Hormiguero (Antena 3)',      cat:'mediatico' },
  { nombre:'Vicente Vallés',        partido:'Medios',   cargo:'Director Antena 3 Noticias 2',                cat:'mediatico' },
  { nombre:'Pepa Bueno',            partido:'Medios',   cargo:'Directora de El País',                        cat:'mediatico' },
  { nombre:'Joaquín Manso',         partido:'Medios',   cargo:'Director de El Mundo',                        cat:'mediatico' },
  { nombre:'Bieito Rubido',         partido:'Medios',   cargo:'Director de El Debate · agenda conservadora', cat:'mediatico' },
  { nombre:'Julia Otero',           partido:'Medios',   cargo:'Periodista · Onda Cero · Julia en la Onda',   cat:'mediatico' },
  { nombre:'Carlos Alsina',         partido:'Medios',   cargo:'Periodista · Onda Cero · Más de uno',         cat:'mediatico' },

  // ── PATRONAL Y SINDICATOS extra ──
  { nombre:'Íñigo Fernández de Mesa', partido:'CEOE',   cargo:'Vicepresidente de la CEOE',                   cat:'patronal' },
  { nombre:'Ricardo Mur',           partido:'CEPYME',   cargo:'Vicepresidente de CEPYME',                    cat:'patronal' },
  { nombre:'Jordi Mercader',        partido:'CEOE',    cargo:'Patronal · Foment del Treball',                cat:'patronal' },
  { nombre:'Mari Carmen Barrera',   partido:'UGT',      cargo:'Secretaria de Política Sindical UGT',         cat:'sindicato' },
  { nombre:'Mari Cruz Vicente',     partido:'CCOO',     cargo:'Secretaria confederal de Acción Sindical CCOO', cat:'sindicato' },
  { nombre:'Lola Santillana',       partido:'UGT',      cargo:'Secretaria de Igualdad UGT',                  cat:'sindicato' },

  // ───── Actores adicionales del CSV de relaciones (mayo 2026) ─────
  // Políticos
  { nombre:'María Pastor',          partido:'Sumar',    cargo:'Portavoz de Más Madrid en la Asamblea',       cat:'autonomico' },
  { nombre:'Juan Lobato',           partido:'PSOE',     cargo:'Portavoz del PSOE-M en la Asamblea de Madrid', cat:'autonomico' },
  { nombre:'José María Aznar',      partido:'PP',       cargo:'Expresidente del Gobierno · presidente FAES', cat:'institucion' },
  { nombre:'Juanma Moreno',         partido:'PP',       cargo:'Presidente de la Junta de Andalucía',         cat:'autonomico' },
  { nombre:'Pere Aragonès',         partido:'ERC',      cargo:'Expresident de la Generalitat de Catalunya',  cat:'autonomico' },
  // Internacionales
  { nombre:'Javier Milei',          partido:'Independiente', cargo:'Presidente de la República Argentina',   cat:'europa' },
  { nombre:'Josep Borrell',         partido:'PSOE',     cargo:'Ex Alto Representante UE para Asuntos Exteriores', cat:'europa' },
  // Patronal / empresarios
  { nombre:'Juan Roig',             partido:'Independiente', cargo:'Presidente ejecutivo de Mercadona',      cat:'patronal' },
  { nombre:'Ignacio Sánchez Galán', partido:'Independiente', cargo:'Presidente ejecutivo de Iberdrola',      cat:'patronal' },
  { nombre:'Josu Jon Imaz',         partido:'Independiente', cargo:'Consejero delegado de Repsol',           cat:'patronal' },
  { nombre:'Ana Botín',             partido:'Independiente', cargo:'Presidenta del Banco Santander',         cat:'patronal' },
  { nombre:'Florentino Pérez',      partido:'Independiente', cargo:'Presidente del Real Madrid · ACS',       cat:'patronal' },
  // Sindicatos y entidades genéricas
  { nombre:'CSIF',                  partido:'CSIF',     cargo:'Central Sindical Independiente y de Funcionarios', cat:'sindicato' },
  { nombre:'AUGC',                  partido:'AUGC',     cargo:'Asociación Unificada de Guardias Civiles',   cat:'institucion' },
  { nombre:'Sindicatos policiales', partido:'Sindicatos', cargo:'Coordinadora de sindicatos de la Policía Nacional', cat:'sindicato' },
  { nombre:'CEOE',                  partido:'CEOE',     cargo:'Confederación Española de Organizaciones Empresariales', cat:'patronal' },
  { nombre:'UGT',                   partido:'UGT',      cargo:'Unión General de Trabajadores',               cat:'sindicato' },
  { nombre:'Junts',                 partido:'Junts',    cargo:'Junts per Catalunya · grupo parlamentario',   cat:'parlamento' },
  { nombre:'Gobierno de España',    partido:'PSOE',     cargo:'Consejo de Ministros · coalición PSOE-Sumar', cat:'gobierno' },
  // Otras figuras
  { nombre:'Javier Tebas',          partido:'Independiente', cargo:'Presidente de LaLiga',                   cat:'institucion' },
  { nombre:'Luis Rubiales',         partido:'Independiente', cargo:'Ex presidente RFEF',                     cat:'institucion' },
  { nombre:'Jennifer Hermoso',      partido:'Independiente', cargo:'Futbolista internacional · selección',   cat:'mediatico' },
  { nombre:'Leonardo Marcos',       partido:'Independiente', cargo:'Ex director general de la Guardia Civil', cat:'institucion' },

  // ───── Actores adicionales del CSV top50 (3 nuevos) ─────
  { nombre:'Joan Laporta',          partido:'Independiente', cargo:'Presidente del FC Barcelona',            cat:'institucion' },
  { nombre:'Ejército del Aire y del Espacio', partido:'Independiente', cargo:'Cuerpo militar · Fuerzas Armadas españolas', cat:'institucion' },
  { nombre:'UPA',                   partido:'Sindicatos', cargo:'Unión de Pequeños Agricultores',           cat:'sindicato' },
]


// Hash determinista
function hash(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) + s.charCodeAt(i)
  return Math.abs(h)
}

function buildActor(b: Base): Actor {
  const h = hash(b.nombre)
  const c = PARTY_COLOR[b.partido] || '#6e6e73'
  const [bx, by] = POS_BASE[b.partido] || [0, 0]
  // jitter por hash, ±10 en X y en Y, pero más para mediáticos/independientes
  const jitter = b.partido === 'Medios' ? 35 : 12
  const ejeX = Math.max(-100, Math.min(100, bx + (((h % 25) - 12) * (jitter/12))))
  const ejeY = Math.max(-100, Math.min(100, by + ((((h >> 5) % 25) - 12) * (jitter/12))))

  const val = +(2.4 + ((h % 65) / 10)).toFixed(1)
  const delta = +(((((h >> 7) % 21) - 10) / 10)).toFixed(1)
  const baseInf: Record<Categoria, number> = { gobierno:75, oposicion:72, parlamento:55, autonomico:62, municipal:50, institucion:68, patronal:60, sindicato:55, mediatico:58, europa:50 }
  const inf = Math.min(95, Math.max(20, baseInf[b.cat] + ((h >> 11) % 25) - 12))

  const pickN = <T,>(arr: T[], n: number, salt: number): T[] => {
    const out: T[] = []
    const used = new Set<number>()
    for (let i = 0; i < n && i < arr.length; i++) {
      let idx = (h + salt * 13 + i * 31) % arr.length
      while (used.has(idx)) idx = (idx + 1) % arr.length
      used.add(idx)
      out.push(arr[idx])
    }
    return out
  }
  const seguidoresK = 30 + (h % 2200)
  const formatSeg = (k: number) => k >= 1000 ? `${(k/1000).toFixed(1)}M` : `${k}K`
  const eng = (1 + ((h >> 5) % 50) / 10).toFixed(1) + '%'
  const tono = +((((h >> 9) % 80) - 40) / 100).toFixed(2)

  return {
    id: b.nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    nombre: b.nombre, partido: b.partido, cargo: b.cargo, cat: b.cat, color: c,
    ejeX, ejeY, val, delta, inf,
    forts: pickN(FORTS_BY_CAT[b.cat], 3, 1),
    debs:  pickN(DEBS_BY_CAT[b.cat], 2, 2),
    evs:   pickN(EVS_BY_CAT[b.cat], 3, 3),
    seg: { f: formatSeg(seguidoresK), eng, tono },
  }
}

// Combina la base original con la extensión y deduplica por nombre por seguridad
const _all: Base[] = [...BASE, ...BASE_EXTENDED]
const _seen = new Set<string>()
const _dedup: Base[] = []
for (const b of _all) {
  const k = b.nombre.toLowerCase()
  if (_seen.has(k)) continue
  _seen.add(k); _dedup.push(b)
}
export const ACTORES: Actor[] = _dedup.map(buildActor)

export const CAT_LABEL: Record<Categoria, string> = {
  gobierno:'Gobierno', oposicion:'Oposición', parlamento:'Parlamento', autonomico:'CCAA',
  municipal:'Ayuntamientos', institucion:'Instituciones', patronal:'Patronal', sindicato:'Sindicatos',
  mediatico:'Medios', europa:'Europa',
}
export const CATS: Array<'Todos' | Categoria> = ['Todos','gobierno','oposicion','parlamento','autonomico','municipal','institucion','patronal','sindicato','mediatico','europa']
export const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0,2).map(s => s[0]?.toUpperCase()).join('')
