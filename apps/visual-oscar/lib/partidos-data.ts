// ─────────────────────────────────────────────────────────────────────────
// partidos-data.ts · dataset y helpers de partidos (compartido por la lista
// /partidos y la ficha /partidos/[slug]). Extraído de la página para no
// romper el contrato de módulo de página de Next (sin exports con nombre).
// ─────────────────────────────────────────────────────────────────────────
import { CONGRESO_RESUMEN } from '@/data/congreso-fixture'
import { SENADO_RESUMEN } from '@/data/senado-fixture'
import { MEDIOS_FIXTURE } from '@/data/medios-fixture'
import type { DossierResumen } from '@/data/dosieres-fixture'

export type AmbitoFamilia = 'Estatal' | 'Catalán' | 'Vasco' | 'Gallego' | 'Canario' | 'Navarro' | 'Valenciano' | 'Cántabro' | 'Asturiano' | 'Aragonés' | 'Andaluz' | 'Balear' | 'Melillense' | 'Madrileño'
export type Familia = 'Socialdemocracia' | 'Conservador' | 'Derecha radical' | 'Izquierda alternativa' | 'Independentista' | 'Nacionalista' | 'Regionalista' | 'Populista'

export type Partido = {
  id: string
  siglas: string
  nombre: string
  color: string
  familia: Familia
  ambito: AmbitoFamilia
  fundacion: number
  presidente: string
  secretario: string
  ideologia: number  // -100 izq · +100 dcha
  centralizacion: number  // -100 descentr · +100 centr
  // Representación
  congreso: number
  senado: number
  europa: number
  ccaa: number      // gobiernos autonómicos
  alcaldias: number // alcaldías capitales > 100k
  afiliados: number // K
  // Encuestas y resultados
  voto2023: number  // % nacional
  votoSerie: number[]  // últimas 6 elecciones generales
  intencion: number    // estimación actual
  delta30d: number     // delta 30 días
  // Europa
  grupoUE: string
  // Identidad
  web: string
  twitter: string
  fortalezas: string[]
  debilidades: string[]
}

export const PARTIDOS: Partido[] = [
  {
    id:'psoe', siglas:'PSOE', nombre:'Partido Socialista Obrero Español', color:'#E1322D',
    familia:'Socialdemocracia', ambito:'Estatal', fundacion:1879,
    presidente:'Cristina Narbona (Pdta.)', secretario:'Pedro Sánchez (Sec. Gen.)',
    ideologia:-22, centralizacion:+12,
    congreso:121, senado:74, europa:21, ccaa:5, alcaldias:11, afiliados:165,
    voto2023:31.7, votoSerie:[22.7,28.7,28.0,30.0,28.0,31.7], intencion:26.8, delta30d:-0.2,
    grupoUE:'S&D · Socialistas y Demócratas',
    web:'psoe.es', twitter:'@PSOE',
    fortalezas:['Maquinaria territorial densa','Aparato del Estado','Coalición progresista parlamentaria'],
    debilidades:['Desgaste por gestión','Tensión con Junts','Pérdida en CCAA gobernadas'],
  },
  {
    id:'pp', siglas:'PP', nombre:'Partido Popular', color:'#1F4E8C',
    familia:'Conservador', ambito:'Estatal', fundacion:1989,
    presidente:'Alberto Núñez Feijóo', secretario:'Miguel Tellado',
    ideologia:+38, centralizacion:-12,
    congreso:137, senado:120, europa:22, ccaa:11, alcaldias:18, afiliados:680,
    voto2023:33.0, votoSerie:[28.7,21.0,16.7,20.8,21.0,33.0], intencion:32.1, delta30d:+0.4,
    grupoUE:'PPE · Partido Popular Europeo',
    web:'pp.es', twitter:'@populares',
    fortalezas:['Líder de la oposición','Hegemonía territorial','Mayoría absoluta en Senado'],
    debilidades:['Aritmética parlamentaria adversa','Tensión con socio VOX en CCAA','Sin investidura tras 23J'],
  },
  {
    id:'vox', siglas:'VOX', nombre:'VOX', color:'#5BA02E',
    familia:'Derecha radical', ambito:'Estatal', fundacion:2013,
    presidente:'Santiago Abascal', secretario:'Ignacio Garriga',
    ideologia:+78, centralizacion:+60,
    congreso:33, senado:5, europa:6, ccaa:0, alcaldias:0, afiliados:71,
    voto2023:12.4, votoSerie:[0.2,0.2,10.3,15.1,12.4,12.4], intencion:12.4, delta30d:-0.8,
    grupoUE:'PfE · Patriotas por Europa',
    web:'voxespana.es', twitter:'@vox_es',
    fortalezas:['Voto fiel y fidelizado','Agenda visible (inmigración, identidad)','Crecimiento en jóvenes hombres'],
    debilidades:['Caída tras debate inmigración','Ruptura en CCAA con PP','Sin gobiernos autonómicos'],
  },
  {
    id:'sumar', siglas:'Sumar', nombre:'Sumar · movimiento político', color:'#D43F8D',
    familia:'Izquierda alternativa', ambito:'Estatal', fundacion:2023,
    presidente:'Yolanda Díaz', secretario:'Lara Hernández',
    ideologia:-58, centralizacion:-18,
    congreso:31, senado:0, europa:3, ccaa:0, alcaldias:1, afiliados:8,
    voto2023:12.3, votoSerie:[20.7,21.2,14.3,12.8,12.3,12.3], intencion:10.2, delta30d:-1.2,
    grupoUE:'The Left · GUE/NGL · Verdes/ALE',
    web:'movimientosumar.com', twitter:'@sumar',
    fortalezas:['5 ministerios en Gobierno','Apoyo de IU, Compromís y Comunes','Yolanda Díaz como liderazgo'],
    debilidades:['Caída en encuestas','Tensión con Podemos','Identidad poco consolidada'],
  },
  {
    id:'junts', siglas:'Junts', nombre:'Junts per Catalunya', color:'#1FA89B',
    familia:'Independentista', ambito:'Catalán', fundacion:2018,
    presidente:'Carles Puigdemont', secretario:'Jordi Turull',
    ideologia:+12, centralizacion:-88,
    congreso:7, senado:1, europa:1, ccaa:0, alcaldias:1, afiliados:6,
    voto2023:1.6, votoSerie:[2.2,1.7,2.3,1.7,1.6,1.6], intencion:1.6, delta30d:0.0,
    grupoUE:'No inscritos',
    web:'junts.cat', twitter:'@JuntsxCat',
    fortalezas:['Llave aritmética del Gobierno','Liderazgo de Puigdemont','Disciplina de voto'],
    debilidades:['Limitado a Cataluña','Tensión interna sobre estrategia','Pérdida del Govern'],
  },
  {
    id:'erc', siglas:'ERC', nombre:'Esquerra Republicana de Catalunya', color:'#E8A030',
    familia:'Independentista', ambito:'Catalán', fundacion:1931,
    presidente:'Oriol Junqueras', secretario:'Marta Rovira',
    ideologia:-32, centralizacion:-78,
    congreso:7, senado:11, europa:1, ccaa:0, alcaldias:1, afiliados:11,
    voto2023:1.9, votoSerie:[2.7,3.9,3.6,3.5,1.9,1.9], intencion:2.0, delta30d:+0.1,
    grupoUE:'Verdes/ALE',
    web:'esquerra.cat', twitter:'@Esquerra_ERC',
    fortalezas:['Pragmatismo negociador','Histórica capacidad de pacto','Cuadros experimentados'],
    debilidades:['Pérdida a Junts en Cataluña','Sin Govern','Divisiones internas'],
  },
  {
    id:'bildu', siglas:'EH Bildu', nombre:'Euskal Herria Bildu', color:'#3F7A3A',
    familia:'Independentista', ambito:'Vasco', fundacion:2011,
    presidente:'Arnaldo Otegi (Coord.)', secretario:'Pello Otxandiano',
    ideologia:-62, centralizacion:-65,
    congreso:6, senado:1, europa:1, ccaa:0, alcaldias:5, afiliados:14,
    voto2023:1.4, votoSerie:[1.0,1.0,1.0,1.1,1.4,1.4], intencion:1.5, delta30d:+0.1,
    grupoUE:'The Left · GUE/NGL',
    web:'ehbildu.eus', twitter:'@ehbildu',
    fortalezas:['Crecimiento en Euskadi','Disciplina de voto','Renovación de liderazgo'],
    debilidades:['Sin lehendakaritza','Resistencia en zonas conservadoras','Polarización'],
  },
  {
    id:'pnv', siglas:'PNV', nombre:'Partido Nacionalista Vasco · EAJ', color:'#7DB94B',
    familia:'Nacionalista', ambito:'Vasco', fundacion:1895,
    presidente:'Aitor Esteban (Pdte. EBB)', secretario:'Itxaso Atutxa',
    ideologia:+10, centralizacion:-72,
    congreso:5, senado:9, europa:1, ccaa:1, alcaldias:1, afiliados:32,
    voto2023:1.1, votoSerie:[1.2,1.5,1.5,1.6,1.1,1.1], intencion:1.1, delta30d:0.0,
    grupoUE:'PEDEM · Partido Demócrata Europeo',
    web:'eaj-pnv.eus', twitter:'@eajpnv',
    fortalezas:['Hegemonía vasca','Lehendakari Pradales','Gestión institucional'],
    debilidades:['Competencia de EH Bildu','Pérdida lenta de hegemonía','Renovación de cuadros'],
  },
  {
    id:'bng', siglas:'BNG', nombre:'Bloque Nacionalista Galego', color:'#5BB3D9',
    familia:'Nacionalista', ambito:'Gallego', fundacion:1982,
    presidente:'Ana Pontón', secretario:'Ana Miranda',
    ideologia:-50, centralizacion:-60,
    congreso:1, senado:0, europa:1, ccaa:0, alcaldias:1, afiliados:5,
    voto2023:0.5, votoSerie:[0.7,0.5,0.4,0.4,0.5,0.5], intencion:0.6, delta30d:+0.1,
    grupoUE:'Verdes/ALE',
    web:'bng.gal', twitter:'@obloque',
    fortalezas:['Líder de la oposición en Galicia','Pontón como figura nacional','Crecimiento sostenido'],
    debilidades:['Sin presencia fuera de Galicia','Limitada a 1 escaño Congreso','Recursos modestos'],
  },
  {
    id:'cc', siglas:'CC', nombre:'Coalición Canaria', color:'#F2C43A',
    familia:'Regionalista', ambito:'Canario', fundacion:1993,
    presidente:'Fernando Clavijo', secretario:'David Toledo',
    ideologia:+8, centralizacion:-45,
    congreso:1, senado:0, europa:0, ccaa:1, alcaldias:0, afiliados:6,
    voto2023:0.6, votoSerie:[0.3,0.2,0.2,0.6,0.6,0.6], intencion:0.6, delta30d:0.0,
    grupoUE:'No representado',
    web:'coalicioncanaria.org', twitter:'@coalicion',
    fortalezas:['Presidencia Canarias','Llave aritmética en Madrid','Pragmatismo'],
    debilidades:['Pequeño tamaño','Coalición frágil','Sólo en Canarias'],
  },
  {
    id:'upn', siglas:'UPN', nombre:'Unión del Pueblo Navarro', color:'#0E7D8C',
    familia:'Regionalista', ambito:'Navarro', fundacion:1979,
    presidente:'Javier Esparza', secretario:'Sergio Sayas',
    ideologia:+38, centralizacion:-38,
    congreso:1, senado:0, europa:0, ccaa:0, alcaldias:0, afiliados:4,
    voto2023:0.3, votoSerie:[0.4,0.5,0.5,0.4,0.3,0.3], intencion:0.3, delta30d:0.0,
    grupoUE:'No representado',
    web:'upn.org', twitter:'@upnpamplona',
    fortalezas:['Histórica fuerza navarra','Acuerdo con PP en generales','Aparato local'],
    debilidades:['Pérdida del Gobierno foral','Tensiones con dirección PP','Limitado a Navarra'],
  },
  {
    id:'compromis', siglas:'Compromís', nombre:'Coalició Compromís', color:'#FF8200',
    familia:'Izquierda alternativa', ambito:'Valenciano', fundacion:2010,
    presidente:'Joan Baldoví', secretario:'Àgueda Micó',
    ideologia:-42, centralizacion:-30,
    congreso:1, senado:0, europa:0, ccaa:0, alcaldias:0, afiliados:5,
    voto2023:0.6, votoSerie:[1.5,1.6,1.6,0.9,0.6,0.6], intencion:0.6, delta30d:0.0,
    grupoUE:'No representado',
    web:'compromis.net', twitter:'@compromis',
    fortalezas:['Histórica presencia valenciana','Dentro de Sumar federal','Liderazgo Baldoví'],
    debilidades:['Pérdida del Govern','Caída en C. Valenciana','Espacio reducido'],
  },
  {
    id:'podemos', siglas:'Podemos', nombre:'Podemos', color:'#6C2C5E',
    familia:'Izquierda alternativa', ambito:'Estatal', fundacion:2014,
    presidente:'Ione Belarra', secretario:'Lilith Verstrynge',
    ideologia:-65, centralizacion:-10,
    congreso:4, senado:0, europa:2, ccaa:0, alcaldias:0, afiliados:480,
    voto2023:1.8, votoSerie:[20.7,21.2,14.3,12.8,1.8,1.8], intencion:2.0, delta30d:+0.2,
    grupoUE:'The Left · GUE/NGL',
    web:'podemos.info', twitter:'@PODEMOS',
    fortalezas:['Identidad clara','Movilización en redes','Maquinaria activista'],
    debilidades:['Ruptura con Sumar','Pérdida de espacio','Caída en encuestas'],
  },
  // ───── Partidos territoriales con representación regional o europea ─────
  {
    id:'psc', siglas:'PSC', nombre:'Partit dels Socialistes de Catalunya', color:'#C5152D',
    familia:'Socialdemocracia', ambito:'Catalán', fundacion:1978,
    presidente:'Salvador Illa', secretario:'Lluïsa Moret',
    ideologia:-18, centralizacion:-25,
    congreso:19, senado:13, europa:5, ccaa:1, alcaldias:2, afiliados:18,
    voto2023:4.6, votoSerie:[5.1,4.5,4.1,4.4,3.5,4.6], intencion:4.5, delta30d:+0.1,
    grupoUE:'S&D · Socialistas y Demócratas (vía PSOE)',
    web:'socialistes.cat', twitter:'@socialistes_cat',
    fortalezas:['Govern de la Generalitat con Illa','Alcaldía de Barcelona','Crecimiento sostenido en Cataluña'],
    debilidades:['Federada con PSOE (no marca propia en generales)','Tensión en política lingüística','Fragilidad parlamentaria del Govern'],
  },
  {
    id:'mas-madrid', siglas:'+MAD', nombre:'Más Madrid', color:'#00B097',
    familia:'Izquierda alternativa', ambito:'Madrileño', fundacion:2019,
    presidente:'Mónica García', secretario:'Manuela Bergerot',
    ideologia:-52, centralizacion:-12,
    congreso:0, senado:0, europa:1, ccaa:0, alcaldias:0, afiliados:14,
    voto2023:0.5, votoSerie:[0.0,0.0,0.0,0.6,0.5,0.5], intencion:0.5, delta30d:0.0,
    grupoUE:'Verdes/ALE (vía Sumar)',
    web:'masmadrid.org', twitter:'@MasMadrid__',
    fortalezas:['Segunda fuerza Asamblea de Madrid','Mónica García en el Gobierno (Sanidad)','Liderazgo joven y femenino'],
    debilidades:['Ámbito limitado a Madrid','Sin escaño propio en Congreso','Tensión con Sumar federal'],
  },
  {
    id:'cup', siglas:'CUP', nombre:'Candidatura d\'Unitat Popular', color:'#F0DD2A',
    familia:'Independentista', ambito:'Catalán', fundacion:1986,
    presidente:'Laia Estrada (Pvz. Parlament)', secretario:'(Secretariado colectivo)',
    ideologia:-72, centralizacion:-92,
    congreso:0, senado:0, europa:0, ccaa:0, alcaldias:0, afiliados:6,
    voto2023:0.4, votoSerie:[0.3,0.0,0.0,1.7,0.4,0.4], intencion:0.4, delta30d:0.0,
    grupoUE:'No representado',
    web:'cup.cat', twitter:'@cupnacional',
    fortalezas:['Posicionamiento ideológico nítido','Presencia municipal arraigada','Independentismo radical'],
    debilidades:['Pérdida de escaños en Parlament 2024','Sin rentabilidad estatal','Espacio reducido por ERC y Junts'],
  },
  {
    id:'prc', siglas:'PRC', nombre:'Partido Regionalista de Cantabria', color:'#008C46',
    familia:'Regionalista', ambito:'Cántabro', fundacion:1978,
    presidente:'Miguel Ángel Revilla', secretario:'Paula Fernández',
    ideologia:-12, centralizacion:-58,
    congreso:0, senado:0, europa:0, ccaa:0, alcaldias:1, afiliados:5,
    voto2023:0.2, votoSerie:[0.2,0.2,0.2,0.3,0.2,0.2], intencion:0.2, delta30d:0.0,
    grupoUE:'No representado',
    web:'prc.es', twitter:'@PRC_Cantabria',
    fortalezas:['Liderazgo histórico de Revilla','Hegemonía rural cántabra','Capital mediático nacional'],
    debilidades:['Pérdida del Gobierno de Cantabria 2023','Dependencia de la figura de Revilla','Sin presencia estatal'],
  },
  {
    id:'geroa-bai', siglas:'GBai', nombre:'Geroa Bai', color:'#006666',
    familia:'Nacionalista', ambito:'Navarro', fundacion:2011,
    presidente:'Uxue Barkos', secretario:'Pablo Etxenike',
    ideologia:-22, centralizacion:-68,
    congreso:0, senado:0, europa:0, ccaa:0, alcaldias:0, afiliados:3,
    voto2023:0.2, votoSerie:[0.3,0.3,0.3,0.3,0.2,0.2], intencion:0.2, delta30d:0.0,
    grupoUE:'No representado (afín PEDEM vía PNV)',
    web:'geroabai.eus', twitter:'@geroabai',
    fortalezas:['Vicepresidencia de Navarra (Ana Ollo)','Coalición estable PNV+ICAN','Presencia en gobierno foral'],
    debilidades:['Sin escaños en el Congreso desde 2023','Ámbito limitado a Navarra','Dependencia del eje vasquista'],
  },
  {
    id:'foro', siglas:'Foro', nombre:'Foro Asturias', color:'#002757',
    familia:'Conservador', ambito:'Asturiano', fundacion:2011,
    presidente:'Adrián Pumares', secretario:'Eladio de la Concha',
    ideologia:+30, centralizacion:-32,
    congreso:0, senado:0, europa:0, ccaa:0, alcaldias:0, afiliados:4,
    voto2023:0.1, votoSerie:[1.4,0.4,0.3,0.2,0.1,0.1], intencion:0.1, delta30d:0.0,
    grupoUE:'No representado',
    web:'foroasturias.es', twitter:'@Foro_Asturias',
    fortalezas:['Histórica presencia asturiana','Marca regionalista del centro-derecha','Acuerdos con PP'],
    debilidades:['Caída sostenida','Sin escaños estatales desde 2019','Competencia del PP regional'],
  },
  {
    id:'nca', siglas:'NCa', nombre:'Nueva Canarias · Bloque Canarista', color:'#00A0DC',
    familia:'Regionalista', ambito:'Canario', fundacion:2005,
    presidente:'Román Rodríguez', secretario:'Carmelo Ramírez',
    ideologia:-22, centralizacion:-65,
    congreso:0, senado:0, europa:1, ccaa:0, alcaldias:0, afiliados:6,
    voto2023:0.3, votoSerie:[0.4,0.4,0.4,0.4,0.3,0.3], intencion:0.3, delta30d:0.0,
    grupoUE:'PEDEM (vía CEUS · coalición con PNV y CC)',
    web:'nuevacanarias.org', twitter:'@nuevacanarias',
    fortalezas:['Eurodiputado en CEUS','Influencia en política canaria','Histórica capacidad de pacto'],
    debilidades:['Sin escaño en Congreso tras 23J','Pérdida de Quevedo como referente','Espacio canario muy fragmentado'],
  },
  {
    id:'teruel-existe', siglas:'TE', nombre:'Teruel Existe · España Vaciada', color:'#C03A2B',
    familia:'Regionalista', ambito:'Aragonés', fundacion:2019,
    presidente:'Tomás Guitarte', secretario:'Manuel Gimeno',
    ideologia:0, centralizacion:-40,
    congreso:0, senado:0, europa:0, ccaa:0, alcaldias:0, afiliados:2,
    voto2023:0.2, votoSerie:[0.0,0.0,0.0,0.1,0.2,0.2], intencion:0.2, delta30d:0.0,
    grupoUE:'No representado',
    web:'teruelexisteagrupacion.es', twitter:'@TeruelExisteAE',
    fortalezas:['Marca de la España Vaciada','Presencia en Cortes de Aragón','Capacidad de movilización local'],
    debilidades:['Pérdida del escaño en Congreso 23J','Movimiento heterogéneo','Sin estructura nacional consolidada'],
  },
  {
    id:'adelante', siglas:'AA', nombre:'Adelante Andalucía', color:'#5A2570',
    familia:'Independentista', ambito:'Andaluz', fundacion:2018,
    presidente:'Teresa Rodríguez', secretario:'José Ignacio García',
    ideologia:-68, centralizacion:-55,
    congreso:0, senado:0, europa:0, ccaa:0, alcaldias:0, afiliados:5,
    voto2023:0.4, votoSerie:[0.0,0.0,0.0,0.0,0.4,0.4], intencion:0.4, delta30d:0.0,
    grupoUE:'No representado',
    web:'adelanteandalucia.org', twitter:'@AdelanteAndalu',
    fortalezas:['Marca andalucista de izquierdas','Liderazgo de Teresa Rodríguez','Presencia en Parlamento andaluz'],
    debilidades:['Sin presencia estatal','Espacio reducido','Tensión con Por Andalucía / Sumar'],
  },
  {
    id:'el-pi', siglas:'El Pi', nombre:'Proposta per les Illes Balears · El Pi', color:'#00BFB3',
    familia:'Regionalista', ambito:'Balear', fundacion:2013,
    presidente:'Tolo Gili', secretario:'Lina Pons',
    ideologia:+8, centralizacion:-50,
    congreso:0, senado:0, europa:0, ccaa:0, alcaldias:0, afiliados:2,
    voto2023:0.1, votoSerie:[0.1,0.1,0.1,0.1,0.1,0.1], intencion:0.1, delta30d:0.0,
    grupoUE:'No representado',
    web:'elpi.cat', twitter:'@ElPiIB',
    fortalezas:['Espacio regionalista balear propio','Acuerdos puntuales con PP','Implantación en Mallorca'],
    debilidades:['Pérdida de representación parlamentaria 2023','Espacio fragmentado','Sin presencia estatal'],
  },
  {
    id:'salf', siglas:'SALF', nombre:'Se Acabó La Fiesta', color:'#00A2FF',
    familia:'Populista', ambito:'Estatal', fundacion:2024,
    presidente:'Alvise Pérez', secretario:'(en formación)',
    ideologia:+72, centralizacion:+35,
    congreso:0, senado:0, europa:3, ccaa:0, alcaldias:0, afiliados:1,
    voto2023:0.0, votoSerie:[0.0,0.0,0.0,0.0,0.0,0.0], intencion:1.6, delta30d:+0.3,
    grupoUE:'No inscritos',
    web:'salfoficial.es', twitter:'@Alvise_SALF',
    fortalezas:['3 eurodiputados en europeas 2024','Anti-élite y mensaje viral','Crecimiento en jóvenes via redes'],
    debilidades:['Sin estructura territorial','Liderazgo personalista','Cuestionamiento institucional constante'],
  },
  {
    id:'cpm', siglas:'CPM', nombre:'Coalición por Melilla', color:'#1A8038',
    familia:'Regionalista', ambito:'Melillense', fundacion:1995,
    presidente:'Mustafa Aberchán', secretario:'Hassan Mohatar',
    ideologia:-15, centralizacion:-70,
    congreso:0, senado:0, europa:0, ccaa:0, alcaldias:0, afiliados:1,
    voto2023:0.0, votoSerie:[0.0,0.0,0.0,0.0,0.0,0.0], intencion:0.0, delta30d:0.0,
    grupoUE:'No representado',
    web:'coalicionpormelilla.com', twitter:'@CoalicionXMlla',
    fortalezas:['7 escaños en Asamblea de Melilla','Hegemonía en barrios musulmanes','Histórica capacidad de pacto'],
    debilidades:['Caso voto por correo 2023 abierto','Limitado a Melilla','Pérdida del Gobierno melillense'],
  },
]

// Grupos parlamentarios del Congreso (350 escaños)
export type GrupoParlamentario = {
  id: string
  nombre: string
  color: string
  escanos: number
  presidente: string
  portavoz: string
  partidos: string[]
  posicion: 'gobierno' | 'investidura' | 'oposicion'
  disciplina: number  // % disciplina de voto
}

export const GRUPOS: GrupoParlamentario[] = [
  { id:'psoe',    nombre:'GP Socialista',         color:'#E1322D', escanos:121, presidente:'Patxi López',          portavoz:'Patxi López',                 partidos:['PSOE','PSC'],         posicion:'gobierno',    disciplina:99 },
  { id:'pp',      nombre:'GP Popular',            color:'#1F4E8C', escanos:137, presidente:'Miguel Tellado',       portavoz:'Ester Muñoz',                 partidos:['PP'],                 posicion:'oposicion',   disciplina:99 },
  { id:'vox',     nombre:'GP VOX',                color:'#5BA02E', escanos: 33, presidente:'Santiago Abascal',     portavoz:'Pepa Millán',                 partidos:['VOX'],                posicion:'oposicion',   disciplina:100},
  { id:'sumar',   nombre:'GP Sumar',              color:'#D43F8D', escanos: 27, presidente:'Marta Lois',           portavoz:'Verónica Martínez',           partidos:['Sumar','IU','En Comú Podem','Compromís','+Madrid','MES','Drago Verdes','Chunta Aragonesista','BNG'], posicion:'gobierno', disciplina:96 },
  { id:'erc',     nombre:'GP Republicano (ERC)',  color:'#E8A030', escanos:  7, presidente:'Gabriel Rufián',       portavoz:'Gabriel Rufián',              partidos:['ERC'],                posicion:'investidura', disciplina:100},
  { id:'junts',   nombre:'GP Junts',              color:'#1FA89B', escanos:  7, presidente:'Miriam Nogueras',      portavoz:'Miriam Nogueras',             partidos:['Junts'],              posicion:'investidura', disciplina:100},
  { id:'pnv',     nombre:'GP Vasco (PNV)',        color:'#7DB94B', escanos:  5, presidente:'Aitor Esteban',        portavoz:'Aitor Esteban',               partidos:['PNV'],                posicion:'investidura', disciplina:100},
  { id:'mixto',   nombre:'GP Mixto',              color:'#6e6e73', escanos: 13, presidente:'(rotatorio)',          portavoz:'·',                            partidos:['EH Bildu','BNG','CC','UPN','Podemos','+1 disidencias'], posicion:'investidura', disciplina:78 },
]

// ── Conexión partido → personas de los dossiers (diputados, senadores, medios) ──
export const PK_ALIAS: Record<string, string> = { EHBILDU: 'BILDU', EAJPNV: 'PNV', CCA: 'CC', PSCPSOE: 'PSOE', PSC: 'PSOE', MASPAIS: 'SUMAR' }
export function partyKey(s: string): string {
  const k = (s || '').toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z]/g, '')
  return PK_ALIAS[k] || k
}
export const REPS_BY_PARTY: Record<string, { diputados: DossierResumen[]; senadores: DossierResumen[] }> = (() => {
  const m: Record<string, { diputados: DossierResumen[]; senadores: DossierResumen[] }> = {}
  const slot = (k: string) => (m[k] ||= { diputados: [], senadores: [] })
  for (const d of CONGRESO_RESUMEN) { const k = partyKey(d.partido || ''); if (k) slot(k).diputados.push(d) }
  for (const d of SENADO_RESUMEN) { const k = partyKey(d.partido || ''); if (k) slot(k).senadores.push(d) }
  return m
})()

export const BLOC_GOB = new Set(['PSOE', 'SUMAR', 'ERC', 'JUNTS', 'BILDU', 'PNV', 'BNG', 'COMPROMIS'])
type MedioRef = { slug: string; nombre: string }
export const MEDIOS_PRO_GOB: MedioRef[] = []
export const MEDIOS_ANTI_GOB: MedioRef[] = []
for (const d of MEDIOS_FIXTURE) {
  const redes = d.apartados.find((a) => a.tipo === 'redes')
  const item = redes?.items.find((i) => /s[áa]nchez/i.test(i.titulo || ''))
  const m = item?.contenido?.match(/nota\s*([+\-]?\d+)/i)
  if (!m) continue
  const n = parseInt(m[1], 10)
  const ref = { slug: d.slug, nombre: d.nombre_completo }
  if (n > 0) MEDIOS_PRO_GOB.push(ref)
  else if (n < 0) MEDIOS_ANTI_GOB.push(ref)
}
