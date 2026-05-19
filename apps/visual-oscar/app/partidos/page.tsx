'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useApi } from '@/lib/useApi'
import LiveStatusBadge from '@/components/LiveStatusBadge'

// Tipos del proxy /api/market/parties
type BackendParty = {
  slug: string; name: string; color_hex: string
  ideology_axes: { economic: number; social: number }
}
type BackendPartiesResponse = { parties: BackendParty[]; count: number }

// ─────────────────────────────────────────────────────────────────────────
// Modelo
// ─────────────────────────────────────────────────────────────────────────
type AmbitoFamilia = 'Estatal' | 'Catalán' | 'Vasco' | 'Gallego' | 'Canario' | 'Navarro' | 'Valenciano' | 'Cántabro' | 'Asturiano' | 'Aragonés' | 'Andaluz' | 'Balear' | 'Melillense' | 'Madrileño'
type Familia = 'Socialdemocracia' | 'Conservador' | 'Derecha radical' | 'Izquierda alternativa' | 'Independentista' | 'Nacionalista' | 'Regionalista' | 'Populista'

type Partido = {
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

const PARTIDOS: Partido[] = [
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
type GrupoParlamentario = {
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

const GRUPOS: GrupoParlamentario[] = [
  { id:'psoe',    nombre:'GP Socialista',         color:'#E1322D', escanos:121, presidente:'Patxi López',          portavoz:'Patxi López',                 partidos:['PSOE','PSC'],         posicion:'gobierno',    disciplina:99 },
  { id:'pp',      nombre:'GP Popular',            color:'#1F4E8C', escanos:137, presidente:'Miguel Tellado',       portavoz:'Ester Muñoz',                 partidos:['PP'],                 posicion:'oposicion',   disciplina:99 },
  { id:'vox',     nombre:'GP VOX',                color:'#5BA02E', escanos: 33, presidente:'Santiago Abascal',     portavoz:'Pepa Millán',                 partidos:['VOX'],                posicion:'oposicion',   disciplina:100},
  { id:'sumar',   nombre:'GP Sumar',              color:'#D43F8D', escanos: 27, presidente:'Marta Lois',           portavoz:'Verónica Martínez',           partidos:['Sumar','IU','En Comú Podem','Compromís','+Madrid','MES','Drago Verdes','Chunta Aragonesista','BNG'], posicion:'gobierno', disciplina:96 },
  { id:'erc',     nombre:'GP Republicano (ERC)',  color:'#E8A030', escanos:  7, presidente:'Gabriel Rufián',       portavoz:'Gabriel Rufián',              partidos:['ERC'],                posicion:'investidura', disciplina:100},
  { id:'junts',   nombre:'GP Junts',              color:'#1FA89B', escanos:  7, presidente:'Miriam Nogueras',      portavoz:'Miriam Nogueras',             partidos:['Junts'],              posicion:'investidura', disciplina:100},
  { id:'pnv',     nombre:'GP Vasco (PNV)',        color:'#7DB94B', escanos:  5, presidente:'Aitor Esteban',        portavoz:'Aitor Esteban',               partidos:['PNV'],                posicion:'investidura', disciplina:100},
  { id:'mixto',   nombre:'GP Mixto',              color:'#6e6e73', escanos: 13, presidente:'(rotatorio)',          portavoz:'·',                            partidos:['EH Bildu','BNG','CC','UPN','Podemos','+1 disidencias'], posicion:'investidura', disciplina:78 },
]

// ─────────────────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────────────────
export default function PartidosPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  // Verificación contra backend ElectSim · refresh 5min
  const { data: backendData, source, updatedAt, refresh } = useApi<BackendPartiesResponse>(
    '/api/market/parties',
    { refreshInterval: 300_000 }
  )
  const backendParties = backendData?.parties || []
  // Mapa slug → BackendParty para lookups rápidos
  const backendBySlug: Record<string, BackendParty> = useMemo(() => {
    const m: Record<string, BackendParty> = {}
    for (const p of backendParties) m[p.slug] = p
    return m
  }, [backendParties])

  const [filterFamilia, setFilterFamilia] = useState<Familia | 'Todas'>('Todas')
  const [query, setQuery] = useState('')
  const [orderBy, setOrderBy] = useState<'congreso' | 'intencion' | 'fundacion'>('congreso')
  const [tab, setTab] = useState<'partidos' | 'grupos' | 'tabla'>('partidos')

  const FAMILIAS: Array<Familia | 'Todas'> = ['Todas','Socialdemocracia','Conservador','Derecha radical','Izquierda alternativa','Independentista','Nacionalista','Regionalista']

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return PARTIDOS
      .filter(p => filterFamilia === 'Todas' || p.familia === filterFamilia)
      .filter(p => !q || p.siglas.toLowerCase().includes(q) || p.nombre.toLowerCase().includes(q) || p.presidente.toLowerCase().includes(q))
      .sort((a,b) => orderBy === 'fundacion' ? a.fundacion - b.fundacion : (b[orderBy] - a[orderBy]))
  }, [filterFamilia, query, orderBy])

  const totals = useMemo(() => {
    const c = PARTIDOS.reduce((s,p) => s + p.congreso, 0)
    const ccaa = PARTIDOS.reduce((s,p) => s + p.ccaa, 0)
    const europa = PARTIDOS.reduce((s,p) => s + p.europa, 0)
    return { partidos: PARTIDOS.length, congreso: c, ccaa, europa }
  }, [])

  return (
    <div style={{ background:'var(--bg)', minHeight:'100vh', fontFamily:'var(--font-text)', color:'#1d1d1f' }}>
      <AppHeader/>
      <main style={{ maxWidth:1500, margin:'0 auto', padding:'24px 28px 80px' }}>

        {/* ───── Hero ───── */}
        <section style={{
          background:'linear-gradient(135deg,#1F4E8C 0%,#0d1b2e 100%)',
          borderRadius:18, padding:'28px 36px', marginBottom:18, color:'#fff',
          display:'grid', gridTemplateColumns:'1.5fr 1fr', gap:32, alignItems:'center',
        }}>
          <div>
            <p style={{ fontSize:10.5, fontWeight:700, letterSpacing:'0.14em', opacity:0.7, textTransform:'uppercase', margin:'0 0 8px', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>
              <span>INTELIGENCIA POLÍTICA · PARTIDOS Y GRUPOS</span>
              <LiveStatusBadge updatedAt={updatedAt} source={source} refreshIntervalSec={300} onRefresh={refresh}/>
            </p>
            <h1 style={{ fontFamily:'var(--font-display)', fontSize:30, fontWeight:700, letterSpacing:'-0.024em', margin:'0 0 6px', lineHeight:1.1 }}>
              Quién es quién en el sistema español <em style={{ fontWeight:300, fontStyle:'italic', color:'rgba(255,255,255,0.7)' }}>de partidos</em>
            </h1>
            <p style={{ fontSize:13, opacity:0.7, margin:0, lineHeight:1.5 }}>
              {totals.partidos} partidos · {GRUPOS.length} grupos parlamentarios · {backendParties.length > 0 ? <><strong style={{ color:'#10b981' }}>{backendParties.length} verificados contra backend ElectSim</strong> · </> : null}seguimiento de líderes, escaños, sondeos y posición ideológica.
            </p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
            <HeroKPI label="Partidos" value={String(totals.partidos)}/>
            <HeroKPI label="Σ Congreso" value={String(totals.congreso)}/>
            <HeroKPI label="Govs. CCAA" value={String(totals.ccaa)}/>
            <HeroKPI label="Eurodip." value={String(totals.europa)}/>
          </div>
        </section>

        {/* ═════════════════════════════════════════════════════════════════
            CUADRANTE 2D · POSICIONAMIENTO IDEOLÓGICO VERIFICADO
            Datos del backend ElectSim FastAPI · /market/parties
            Eje X: política económica (-1 izq · +1 dcha)
            Eje Y: política social    (-1 progre · +1 conserv)
            ═════════════════════════════════════════════════════════════════ */}
        {backendParties.length > 0 && (
          <section style={{
            background:'#fff', border:'1px solid #ECECEF', borderRadius:18,
            padding:'22px 28px', marginBottom:18, boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10, marginBottom:14 }}>
              <div>
                <p style={{ fontSize:10.5, fontWeight:700, letterSpacing:'0.14em', color:'#10b981', textTransform:'uppercase', margin:'0 0 4px' }}>
                  CUADRANTE 2D · BACKEND ELECTSIM <span style={{ color:'#6e6e73' }}>· {backendParties.length} partidos verificados</span>
                </p>
                <h2 style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:600, letterSpacing:'-0.018em', margin:0, color:'#1d1d1f' }}>
                  Posición ideológica oficial · datos del backend
                </h2>
                <p style={{ fontSize:11.5, color:'#6e6e73', margin:'4px 0 0', lineHeight:1.45 }}>
                  Eje X: economía (izquierda ←→ derecha) · Eje Y: social (progresista ↑↓ conservador) ·
                  los partidos cuyo slug coincide muestran un punto verde de verificación
                </p>
              </div>
            </div>

            <div style={{ position:'relative', width:'100%', maxWidth:560, height:380, margin:'0 auto', background:'#fafafa', border:'1px solid #ECECEF', borderRadius:12 }}>
              {/* Ejes */}
              <div style={{ position:'absolute', left:'50%', top:0, bottom:0, width:1, background:'#ECECEF' }}/>
              <div style={{ position:'absolute', top:'50%', left:0, right:0, height:1, background:'#ECECEF' }}/>

              {/* Etiquetas de cuadrantes */}
              <span style={{ position:'absolute', top:6, left:8, fontSize:9.5, color:'#9CA3AF', fontWeight:600, letterSpacing:'0.05em' }}>↑ CONSERV. — IZQ. ECON.</span>
              <span style={{ position:'absolute', top:6, right:8, fontSize:9.5, color:'#9CA3AF', fontWeight:600, letterSpacing:'0.05em', textAlign:'right' }}>↑ CONSERV. — DCHA. ECON.</span>
              <span style={{ position:'absolute', bottom:6, left:8, fontSize:9.5, color:'#9CA3AF', fontWeight:600, letterSpacing:'0.05em' }}>↓ PROGRES. — IZQ. ECON.</span>
              <span style={{ position:'absolute', bottom:6, right:8, fontSize:9.5, color:'#9CA3AF', fontWeight:600, letterSpacing:'0.05em', textAlign:'right' }}>↓ PROGRES. — DCHA. ECON.</span>

              {/* Puntos · convertimos -1..+1 a 0..100% */}
              {backendParties.map(p => {
                const x = (p.ideology_axes.economic + 1) / 2 * 100  // 0-100%
                const y = (p.ideology_axes.social + 1) / 2 * 100    // 0-100% (invertido: +1 social = arriba)
                return (
                  <div key={p.slug} style={{
                    position:'absolute', left:`${x}%`, top:`${100-y}%`,
                    transform:'translate(-50%, -50%)',
                    display:'flex', alignItems:'center', gap:5,
                  }}>
                    <span style={{
                      width:14, height:14, borderRadius:'50%', background:p.color_hex,
                      border:'2px solid #fff', boxShadow:'0 1px 3px rgba(0,0,0,0.20)',
                    }}/>
                    <span style={{
                      fontSize:11, fontWeight:700, color:p.color_hex,
                      background:'rgba(255,255,255,0.92)', padding:'1px 5px', borderRadius:4,
                      border:`1px solid ${p.color_hex}30`, whiteSpace:'nowrap',
                    }}>{p.slug.toUpperCase()}</span>
                  </div>
                )
              })}
            </div>

            {/* Tabla resumen al lado */}
            <div style={{ marginTop:16, display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:8 }}>
              {backendParties.map(p => {
                const localMatch = PARTIDOS.find(lp => lp.id === p.slug || lp.siglas.toLowerCase() === p.slug)
                const verified = !!localMatch
                return (
                  <div key={p.slug} style={{
                    padding:'10px 12px', background:'#fafafa', borderRadius:10,
                    border:'1px solid #ECECEF', borderLeft:`3px solid ${p.color_hex}`,
                    display:'flex', alignItems:'center', justifyContent:'space-between', gap:8,
                  }}>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:700, color:'#1d1d1f' }}>{p.slug.toUpperCase()}</div>
                      <div style={{ fontSize:10.5, color:'#6e6e73', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</div>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:1 }}>
                      <span style={{ fontSize:10, color:'#6e6e73' }}>eco {p.ideology_axes.economic > 0 ? '+' : ''}{p.ideology_axes.economic.toFixed(2)}</span>
                      <span style={{ fontSize:10, color:'#6e6e73' }}>soc {p.ideology_axes.social > 0 ? '+' : ''}{p.ideology_axes.social.toFixed(2)}</span>
                      {verified && <span style={{ fontSize:9, fontWeight:700, color:'#10b981', marginTop:2 }}>✓ MATCH</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ───── Tabs ───── */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10, marginBottom:14 }}>
          <div style={{ display:'inline-flex', background:'#F5F5F7', borderRadius:999, padding:3 }}>
            {([
              { k:'partidos', label:'Partidos',                 count: PARTIDOS.length },
              { k:'grupos',   label:'Grupos parlamentarios',   count: GRUPOS.length },
              { k:'tabla',    label:'Tabla comparativa',       count: PARTIDOS.length },
            ] as const).map(t => {
              const active = tab === t.k
              return (
                <button key={t.k} onClick={() => setTab(t.k)} style={{
                  background: active ? '#fff' : 'transparent',
                  color: active ? '#1d1d1f' : '#6e6e73',
                  border:'none', borderRadius:999, padding:'7px 16px',
                  fontSize:12, fontWeight: active ? 700 : 500, cursor:'pointer',
                  fontFamily:'inherit', boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                }}>
                  {t.label} <span style={{ marginLeft:5, color: active ? '#1F4E8C' : '#6e6e73', fontWeight:700, fontSize:10.5 }}>{t.count}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ───── Tab Partidos ───── */}
        {tab === 'partidos' && (
          <>
            {/* Filtros */}
            <div style={{ display:'flex', gap:12, alignItems:'center', flexWrap:'wrap', marginBottom:14 }}>
              <input
                type="text" value={query} onChange={e => setQuery(e.target.value)}
                placeholder={`Buscar entre ${PARTIDOS.length} partidos…`}
                style={{
                  flex:'1 1 260px', maxWidth:340,
                  padding:'9px 14px', borderRadius:10,
                  border:'1px solid #ECECEF', background:'#fff',
                  fontSize:13, fontFamily:'inherit', outline:'none', color:'#1d1d1f',
                }}
              />
              <span style={{ fontSize:11, color:'#6e6e73', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase' }}>Familia:</span>
              <div style={{ display:'inline-flex', background:'#F5F5F7', borderRadius:999, padding:3, flexWrap:'wrap' }}>
                {FAMILIAS.map(f => {
                  const active = filterFamilia === f
                  return (
                    <button key={f} onClick={() => setFilterFamilia(f)} style={{
                      background: active ? '#fff' : 'transparent',
                      color: active ? '#1d1d1f' : '#6e6e73',
                      border:'none', borderRadius:999, padding:'4px 10px',
                      fontSize:11, fontWeight: active ? 700 : 500, cursor:'pointer',
                      fontFamily:'inherit', boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                    }}>{f}</button>
                  )
                })}
              </div>
              <span style={{ fontSize:11, color:'#6e6e73', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', marginLeft:4 }}>Orden:</span>
              <select value={orderBy} onChange={e => setOrderBy(e.target.value as typeof orderBy)} style={{
                padding:'5px 30px 5px 12px', borderRadius:999, border:'1px solid #ECECEF', background:'#fff',
                fontSize:11.5, fontFamily:'inherit', cursor:'pointer', appearance:'none',
                backgroundImage:'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' viewBox=\'0 0 10 10\'%3E%3Cpath d=\'M2 4l3 3 3-3\' stroke=\'%236e6e73\' stroke-width=\'1.5\' fill=\'none\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E")',
                backgroundRepeat:'no-repeat', backgroundPosition:'right 9px center',
              }}>
                <option value="congreso">Escaños Congreso</option>
                <option value="intencion">Intención de voto</option>
                <option value="fundacion">Fundación</option>
              </select>
              <span style={{ marginLeft:'auto', fontSize:11.5, color:'#6e6e73' }}>{filtered.length} partidos visibles</span>
            </div>

            {/* Cards de partidos */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(440px,1fr))', gap:12 }}>
              {filtered.map(p => <PartidoCard key={p.id} p={p}/>)}
              {filtered.length === 0 && (
                <div style={{ gridColumn:'1/-1', padding:30, textAlign:'center', color:'#6e6e73', fontSize:13, background:'#fff', borderRadius:14, border:'1px solid #ECECEF' }}>
                  Sin coincidencias.
                </div>
              )}
            </div>
          </>
        )}

        {/* ───── Tab Grupos parlamentarios ───── */}
        {tab === 'grupos' && (
          <>
            <div style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, padding:'18px 22px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)', marginBottom:14 }}>
              <h3 style={{ margin:'0 0 4px', fontFamily:'var(--font-display)', fontSize:16, fontWeight:600, letterSpacing:'-0.014em' }}>Composición del Congreso · 350 escaños</h3>
              <p style={{ margin:'0 0 22px', fontSize:11.5, color:'#6e6e73' }}>Distribución de los 8 grupos parlamentarios. Mayoría absoluta = 176 · investidura efectiva 23J: 179 SÍ.</p>
              <BarraComposicion grupos={GRUPOS}/>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(380px,1fr))', gap:12 }}>
              {GRUPOS.map(g => <GrupoCard key={g.id} g={g}/>)}
            </div>
          </>
        )}

        {/* ───── Tab Tabla comparativa ───── */}
        {tab === 'tabla' && (
          <div style={{
            background:'#fff', border:'1px solid #ECECEF', borderRadius:14,
            boxShadow:'0 1px 3px rgba(0,0,0,0.04)', overflow:'hidden',
          }}>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, minWidth:1100 }}>
                <thead>
                  <tr style={{ background:'#FAFAFB', borderBottom:'2px solid #ECECEF' }}>
                    {[
                      { l:'Partido',     a:'left'  },
                      { l:'Familia',     a:'left'  },
                      { l:'Fundac.',     a:'right' },
                      { l:'Líder',       a:'left'  },
                      { l:'Congreso',    a:'right' },
                      { l:'Senado',      a:'right' },
                      { l:'Europa',      a:'right' },
                      { l:'CCAA',        a:'right' },
                      { l:'%2023',       a:'right' },
                      { l:'Intenc.',     a:'right' },
                      { l:'Δ30d',        a:'right' },
                      { l:'Tendencia',   a:'left'  },
                    ].map(h => (
                      <th key={h.l} style={{
                        textAlign:h.a as 'left'|'right',
                        padding:'10px 12px',
                        fontSize:9.5, fontWeight:700, color:'#6e6e73',
                        letterSpacing:'0.06em', textTransform:'uppercase',
                      }}>{h.l}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...PARTIDOS].sort((a,b) => b.congreso - a.congreso).map((p, i) => (
                    <tr key={p.id} style={{ borderBottom:'1px solid #ECECEF', background: i%2 ? '#fafafa' : '#fff' }}>
                      <td style={{ padding:'9px 12px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <span style={{ width:11, height:11, borderRadius:3, background:p.color, flexShrink:0, display:'inline-block' }}/>
                          <div style={{ minWidth:0 }}>
                            <div style={{ fontWeight:700, color:'#1d1d1f' }}>{p.siglas}</div>
                            <div style={{ fontSize:10, color:'#86868b', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:200 }}>{p.nombre}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding:'9px 12px', color:'#3a3a3d', fontSize:11 }}>{p.familia}</td>
                      <td style={{ padding:'9px 12px', textAlign:'right', fontFamily:'var(--font-display)', color:'#3a3a3d' }}>{p.fundacion}</td>
                      <td style={{ padding:'9px 12px', color:'#1d1d1f', fontSize:11.5, fontWeight:600 }}>{p.presidente}</td>
                      <td style={{ padding:'9px 12px', textAlign:'right', fontFamily:'var(--font-display)', fontWeight:700, color:p.color }}>{p.congreso}</td>
                      <td style={{ padding:'9px 12px', textAlign:'right', color:'#3a3a3d' }}>{p.senado}</td>
                      <td style={{ padding:'9px 12px', textAlign:'right', color:'#3a3a3d' }}>{p.europa}</td>
                      <td style={{ padding:'9px 12px', textAlign:'right', color:'#3a3a3d' }}>{p.ccaa}</td>
                      <td style={{ padding:'9px 12px', textAlign:'right', fontFamily:'var(--font-display)', fontWeight:600 }}>{p.voto2023}%</td>
                      <td style={{ padding:'9px 12px', textAlign:'right', fontFamily:'var(--font-display)', fontWeight:600, color:p.color }}>{p.intencion}%</td>
                      <td style={{ padding:'9px 12px', textAlign:'right', fontWeight:700, color: p.delta30d > 0 ? '#16A34A' : p.delta30d < 0 ? '#DC2626' : '#6e6e73' }}>
                        {p.delta30d > 0 ? '▲' : p.delta30d < 0 ? '▼' : '→'} {Math.abs(p.delta30d).toFixed(1)}
                      </td>
                      <td style={{ padding:'9px 12px', minWidth:120 }}>
                        <Sparkline data={p.votoSerie} color={p.color} h={26}/>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>
      <footer style={{ borderTop:'1px solid var(--hairline)', padding:'18px 28px', textAlign:'center', color:'var(--ink-4)', fontSize:11.5 }}>
        Partidos y Grupos · Politeia Analítica · {new Date().getFullYear()}
      </footer>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// PartidoCard
// ─────────────────────────────────────────────────────────────────────────
function PartidoCard({ p }: { p: Partido }) {
  return (
    <article style={{
      background:'#fff', border:'1px solid #ECECEF', borderRadius:14,
      boxShadow:'0 1px 3px rgba(0,0,0,0.04)', overflow:'hidden',
      display:'flex', flexDirection:'column',
    }}>
      <header style={{
        display:'grid', gridTemplateColumns:'auto 1fr auto', gap:14, alignItems:'center',
        padding:'14px 16px',
        background:`linear-gradient(135deg, ${p.color}10, ${p.color}03)`,
        borderBottom:`2px solid ${p.color}`,
      }}>
        <div style={{
          width:54, height:54, borderRadius:12,
          background:p.color, color:'#fff',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontFamily:'var(--font-display)', fontWeight:800, fontSize:18, letterSpacing:'-0.01em',
          flexShrink:0, boxShadow:`0 2px 6px ${p.color}50`,
        }}>{p.siglas.length <= 4 ? p.siglas : p.siglas.slice(0,4)}</div>
        <div style={{ minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3, flexWrap:'wrap' }}>
            <span style={{
              fontSize:9, fontWeight:800, letterSpacing:'0.08em',
              padding:'2px 7px', borderRadius:4,
              background:p.color, color:'#fff',
            }}>{p.familia.toUpperCase()}</span>
            <span style={{ fontSize:9.5, color:'#6e6e73', fontWeight:700, letterSpacing:'0.06em' }}>· {p.ambito.toUpperCase()} · DESDE {p.fundacion}</span>
          </div>
          <h3 style={{ margin:'0 0 2px', fontFamily:'var(--font-display)', fontSize:16, fontWeight:700, letterSpacing:'-0.014em', color:'#1d1d1f', lineHeight:1.2 }}>
            {p.nombre}
          </h3>
          <p style={{ margin:0, fontSize:11, color:'#3a3a3d' }}>
            <strong>{p.presidente}</strong> · {p.secretario}
          </p>
        </div>
        <div style={{ textAlign:'right', flexShrink:0 }}>
          <div style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:700, color:p.color, letterSpacing:'-0.022em', lineHeight:1 }}>{p.intencion}<span style={{ fontSize:11, color:'#6e6e73', fontWeight:600 }}>%</span></div>
          <div style={{ fontSize:9.5, fontWeight:700, color: p.delta30d > 0 ? '#16A34A' : p.delta30d < 0 ? '#DC2626' : '#6e6e73', marginTop:1 }}>
            {p.delta30d > 0 ? '▲' : p.delta30d < 0 ? '▼' : '→'} {Math.abs(p.delta30d).toFixed(1)} · 30d
          </div>
        </div>
      </header>

      <div style={{ padding:'14px 16px' }}>
        {/* Representación */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:6, marginBottom:12 }}>
          {[
            { l:'Congreso',  v:p.congreso,   c:p.color },
            { l:'Senado',    v:p.senado,     c:'#3a3a3d' },
            { l:'Europa',    v:p.europa,     c:'#3a3a3d' },
            { l:'Govs CCAA', v:p.ccaa,       c:'#3a3a3d' },
            { l:'Alc. >100k',v:p.alcaldias,  c:'#3a3a3d' },
          ].map(k => (
            <div key={k.l} style={{ background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:8, padding:'7px 4px', textAlign:'center' }}>
              <div style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:700, color:k.c, lineHeight:1 }}>{k.v}</div>
              <div style={{ fontSize:8.5, fontWeight:700, color:'#6e6e73', letterSpacing:'0.04em', textTransform:'uppercase', marginTop:3 }}>{k.l}</div>
            </div>
          ))}
        </div>

        {/* Eje ideológico */}
        <div style={{ marginBottom:12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
            <span style={{ fontSize:9.5, fontWeight:700, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase' }}>Eje izquierda · derecha</span>
            <span style={{ fontFamily:'var(--font-display)', fontSize:11, fontWeight:700, color:p.color }}>{p.ideologia > 0 ? `+${p.ideologia}` : p.ideologia}</span>
          </div>
          <EjePosicion value={p.ideologia} color={p.color}/>
        </div>

        {/* Tendencia + grupo UE */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
          <div style={{ background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:9, padding:'8px 10px' }}>
            <div style={{ fontSize:9, fontWeight:700, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:4 }}>Voto generales (últimas 6)</div>
            <Sparkline data={p.votoSerie} color={p.color} h={28}/>
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:3, fontSize:9, color:'#86868b', fontWeight:600 }}>
              <span>2008</span><span>2023</span>
            </div>
          </div>
          <div style={{ background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:9, padding:'8px 10px' }}>
            <div style={{ fontSize:9, fontWeight:700, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:4 }}>Grupo UE</div>
            <div style={{ fontSize:11.5, fontWeight:600, color:'#1d1d1f', lineHeight:1.3 }}>{p.grupoUE}</div>
            <div style={{ marginTop:5, display:'flex', gap:8, fontSize:10, color:'#6e6e73' }}>
              <span>{p.afiliados}K afiliados</span>
            </div>
          </div>
        </div>

        {/* Fortalezas y debilidades */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <div>
            <div style={{ fontSize:9, fontWeight:700, color:'#16A34A', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:4 }}>Fortalezas</div>
            {p.fortalezas.map(f => (
              <div key={f} style={{ fontSize:10.5, color:'#3a3a3d', display:'flex', gap:5, marginBottom:3, lineHeight:1.4 }}>
                <span style={{ color:'#16A34A', fontWeight:700, flexShrink:0 }}>+</span>{f}
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize:9, fontWeight:700, color:'#DC2626', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:4 }}>Debilidades</div>
            {p.debilidades.map(d => (
              <div key={d} style={{ fontSize:10.5, color:'#3a3a3d', display:'flex', gap:5, marginBottom:3, lineHeight:1.4 }}>
                <span style={{ color:'#DC2626', fontWeight:700, flexShrink:0 }}>−</span>{d}
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer style={{
        background:'#FAFAFB', borderTop:'1px solid #ECECEF',
        padding:'8px 14px', display:'flex', justifyContent:'space-between', alignItems:'center', gap:8,
        fontSize:10.5, color:'#6e6e73',
      }}>
        <span><strong style={{ color:'#1d1d1f' }}>{p.web}</strong></span>
        <span>{p.twitter}</span>
      </footer>
    </article>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// GrupoCard
// ─────────────────────────────────────────────────────────────────────────
function GrupoCard({ g }: { g: GrupoParlamentario }) {
  const POS_META = {
    gobierno:    { label:'GOBIERNO',     color:'#16A34A' },
    investidura: { label:'INVESTIDURA',  color:'#5B21B6' },
    oposicion:   { label:'OPOSICIÓN',    color:'#DC2626' },
  }
  const pm = POS_META[g.posicion]
  return (
    <article style={{
      background:'#fff', border:'1px solid #ECECEF', borderRadius:14,
      boxShadow:'0 1px 3px rgba(0,0,0,0.04)', overflow:'hidden',
    }}>
      <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:14, alignItems:'center', padding:'14px 16px', borderBottom:`2px solid ${g.color}` }}>
        <div style={{
          width:50, height:50, borderRadius:'50%',
          background:g.color, color:'#fff',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontFamily:'var(--font-display)', fontWeight:800, fontSize:14, flexShrink:0,
          boxShadow:`0 2px 6px ${g.color}50`,
        }}>{g.escanos}</div>
        <div style={{ minWidth:0 }}>
          <div style={{ display:'flex', gap:6, marginBottom:4, flexWrap:'wrap' }}>
            <span style={{
              fontSize:9, fontWeight:800, letterSpacing:'0.08em',
              padding:'2px 7px', borderRadius:4,
              background:pm.color, color:'#fff',
            }}>{pm.label}</span>
          </div>
          <h3 style={{ margin:'0 0 2px', fontFamily:'var(--font-display)', fontSize:15, fontWeight:700, letterSpacing:'-0.012em', color:'#1d1d1f' }}>{g.nombre}</h3>
          <p style={{ margin:0, fontSize:11, color:'#6e6e73' }}>{g.escanos} escaños · {Math.round((g.escanos/350)*100)}% del Congreso</p>
        </div>
      </div>
      <div style={{ padding:'14px 16px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
          <div>
            <div style={{ fontSize:9, fontWeight:700, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:3 }}>Presidente del grupo</div>
            <div style={{ fontSize:12, fontWeight:600, color:'#1d1d1f' }}>{g.presidente}</div>
          </div>
          <div>
            <div style={{ fontSize:9, fontWeight:700, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:3 }}>Portavoz</div>
            <div style={{ fontSize:12, fontWeight:600, color:'#1d1d1f' }}>{g.portavoz}</div>
          </div>
        </div>
        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:9, fontWeight:700, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:5 }}>Disciplina de voto</div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ flex:1, height:7, background:'#F5F5F7', borderRadius:3, overflow:'hidden' }}>
              <div style={{ width:`${g.disciplina}%`, height:'100%', background:g.color, borderRadius:3 }}/>
            </div>
            <span style={{ fontFamily:'var(--font-display)', fontSize:13, fontWeight:700, color:g.color }}>{g.disciplina}%</span>
          </div>
        </div>
        <div>
          <div style={{ fontSize:9, fontWeight:700, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:5 }}>Partidos integrantes</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
            {g.partidos.map(p => (
              <span key={p} style={{
                fontSize:10.5, fontWeight:600, padding:'3px 9px', borderRadius:999,
                background:`${g.color}15`, color:g.color, border:`1px solid ${g.color}40`,
              }}>{p}</span>
            ))}
          </div>
        </div>
      </div>
    </article>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// BarraComposicion · barra horizontal con todos los grupos
// ─────────────────────────────────────────────────────────────────────────
function BarraComposicion({ grupos }: { grupos: GrupoParlamentario[] }) {
  const total = grupos.reduce((s, g) => s + g.escanos, 0)
  const ORDEN = ['mixto','sumar','psoe','erc','junts','pnv','pp','vox']
  const sorted = [...grupos].sort((a,b) => ORDEN.indexOf(a.id) - ORDEN.indexOf(b.id))
  const segments = sorted.map(g => ({ ...g, pctW: (g.escanos / total) * 100 }))
  const majX = (176 / total) * 100
  return (
    <div>
      <div style={{ position:'relative', height:34, background:'#F5F5F7', borderRadius:8, overflow:'hidden', display:'flex' }}>
        {segments.map((g, i) => (
          <div key={g.id} style={{
            width:`${g.pctW}%`, height:'100%', background:g.color,
            display:'flex', alignItems:'center', justifyContent:'center',
            color:'#fff', fontFamily:'var(--font-display)', fontWeight:700, fontSize:11,
            borderRight: i < segments.length - 1 ? '1px solid rgba(255,255,255,0.3)' : 'none',
          }} title={`${g.nombre} · ${g.escanos}`}>
            {g.pctW > 6 ? g.escanos : ''}
          </div>
        ))}
        <div style={{
          position:'absolute', left:`${majX}%`, top:-3, bottom:-3, width:2,
          background:'#1d1d1f', borderRadius:1,
        }}/>
        <div style={{
          position:'absolute', left:`${majX}%`, top:-18, transform:'translateX(-50%)',
          fontSize:9, fontWeight:800, color:'#1d1d1f', letterSpacing:'0.06em', whiteSpace:'nowrap',
        }}>176 · MAYORÍA</div>
      </div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:10, marginTop:10 }}>
        {sorted.map(g => (
          <div key={g.id} style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:11 }}>
            <span style={{ width:10, height:10, borderRadius:2, background:g.color, display:'inline-block' }}/>
            <span style={{ color:'#1d1d1f', fontWeight:600 }}>{g.nombre.replace('GP ', '')}</span>
            <span style={{ color:'#6e6e73', fontFamily:'var(--font-display)', fontWeight:700 }}>{g.escanos}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers UI
// ─────────────────────────────────────────────────────────────────────────
function HeroKPI({ label, value }: { label:string, value:string }) {
  return (
    <div style={{ textAlign:'center', padding:'10px 6px', borderRadius:10, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.18)' }}>
      <div style={{ fontFamily:'var(--font-display)', fontSize:21, fontWeight:700, lineHeight:1, color:'#fff', letterSpacing:'-0.018em' }}>{value}</div>
      <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', opacity:0.7, marginTop:4, color:'#fff' }}>{label}</div>
    </div>
  )
}

function EjePosicion({ value, color }: { value: number, color: string }) {
  const pct = ((value + 100) / 200) * 100
  return (
    <div style={{ position:'relative', height:8, background:'linear-gradient(90deg, #DC2626 0%, #F5F5F7 50%, #1F4E8C 100%)', borderRadius:4, opacity:0.18 }}>
      <div style={{
        position:'absolute', left:`${pct}%`, top:-4, transform:'translateX(-50%)',
        width:16, height:16, borderRadius:'50%', background:color, border:'2px solid #fff',
        boxShadow:`0 0 0 2px ${color}50, 0 1px 3px rgba(0,0,0,0.1)`,
      }}/>
    </div>
  )
}

function Sparkline({ data, color, h = 30 }: { data: number[], color: string, h?: number }) {
  const w = 100
  const min = Math.min(...data), max = Math.max(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - 4 - ((v - min) / range) * (h - 8)
    return `${x},${y}`
  }).join(' ')
  const area = `0,${h} ${pts} ${w},${h}`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width:'100%', height:h, display:'block' }} preserveAspectRatio="none">
      <polyline points={area} fill={`${color}20`} stroke="none"/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
      <circle cx={w} cy={h - 4 - ((data[data.length - 1] - min) / range) * (h - 8)} r="2" fill={color}/>
    </svg>
  )
}
