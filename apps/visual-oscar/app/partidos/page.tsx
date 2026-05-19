'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'
import { useApi } from '@/lib/useApi'
import LiveStatusBadge from '@/components/LiveStatusBadge'
import EntityBacklinks from '@/components/EntityBacklinks'
import './partidos.css'

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
    <div className="pt-root">
      <AppHeader/>
      <main className="pt-main">

        {/* ───── Hero ───── */}
        <section className="pt-hero">
          <div>
            <p className="pt-hero-eyebrow">
              <span>INTELIGENCIA POLÍTICA · PARTIDOS Y GRUPOS</span>
              <LiveStatusBadge updatedAt={updatedAt} source={source} refreshIntervalSec={300} onRefresh={refresh}/>
            </p>
            <h1 className="pt-hero-title">
              Quién es quién en el sistema español <em className="pt-hero-title-em">de partidos</em>
            </h1>
            <p className="pt-hero-subtitle">
              {totals.partidos} partidos · {GRUPOS.length} grupos parlamentarios · {backendParties.length > 0 ? <><strong className="pt-hero-subtitle-verified">{backendParties.length} verificados contra backend ElectSim</strong> · </> : null}seguimiento de líderes, escaños, sondeos y posición ideológica.
            </p>
          </div>
          <div className="pt-hero-kpis">
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
          <section className="pt-cuad-section">
            <div className="pt-cuad-head">
              <div>
                <p className="pt-cuad-eyebrow">
                  CUADRANTE 2D · BACKEND ELECTSIM <span className="pt-cuad-eyebrow-sub">· {backendParties.length} partidos verificados</span>
                </p>
                <h2 className="pt-cuad-title">
                  Posición ideológica oficial · datos del backend
                </h2>
                <p className="pt-cuad-desc">
                  Eje X: economía (izquierda ←→ derecha) · Eje Y: social (progresista ↑↓ conservador) ·
                  los partidos cuyo slug coincide muestran un punto verde de verificación
                </p>
              </div>
            </div>

            <div className="pt-cuad-canvas">
              {/* Ejes */}
              <div className="pt-cuad-axis-v"/>
              <div className="pt-cuad-axis-h"/>

              {/* Etiquetas de cuadrantes */}
              <span className="pt-cuad-label pt-cuad-label--tl">↑ CONSERV. — IZQ. ECON.</span>
              <span className="pt-cuad-label pt-cuad-label--tr">↑ CONSERV. — DCHA. ECON.</span>
              <span className="pt-cuad-label pt-cuad-label--bl">↓ PROGRES. — IZQ. ECON.</span>
              <span className="pt-cuad-label pt-cuad-label--br">↓ PROGRES. — DCHA. ECON.</span>

              {/* Puntos · convertimos -1..+1 a 0..100% */}
              {backendParties.map(p => {
                const x = (p.ideology_axes.economic + 1) / 2 * 100  // 0-100%
                const y = (p.ideology_axes.social + 1) / 2 * 100    // 0-100% (invertido: +1 social = arriba)
                return (
                  <div key={p.slug} className="pt-cuad-point" style={{ left:`${x}%`, top:`${100-y}%` }}>
                    <span className="pt-cuad-dot" style={{ background:p.color_hex }}/>
                    <span className="pt-cuad-tag" style={{ color:p.color_hex, border:`1px solid ${p.color_hex}30` }}>{p.slug.toUpperCase()}</span>
                  </div>
                )
              })}
            </div>

            {/* Tabla resumen al lado */}
            <div className="pt-cuad-summary">
              {backendParties.map(p => {
                const localMatch = PARTIDOS.find(lp => lp.id === p.slug || lp.siglas.toLowerCase() === p.slug)
                const verified = !!localMatch
                return (
                  <div key={p.slug} className="pt-cuad-card" style={{ borderLeft:`3px solid ${p.color_hex}` }}>
                    <div className="pt-cuad-card-info">
                      <div className="pt-cuad-card-slug">{p.slug.toUpperCase()}</div>
                      <div className="pt-cuad-card-name">{p.name}</div>
                    </div>
                    <div className="pt-cuad-card-axes">
                      <span className="pt-cuad-axis">eco {p.ideology_axes.economic > 0 ? '+' : ''}{p.ideology_axes.economic.toFixed(2)}</span>
                      <span className="pt-cuad-axis">soc {p.ideology_axes.social > 0 ? '+' : ''}{p.ideology_axes.social.toFixed(2)}</span>
                      {verified && <span className="pt-cuad-match">✓ MATCH</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ───── Tabs ───── */}
        <div className="pt-tabs-row">
          <div className="pt-tabs-wrap">
            {([
              { k:'partidos', label:'Partidos',                 count: PARTIDOS.length },
              { k:'grupos',   label:'Grupos parlamentarios',   count: GRUPOS.length },
              { k:'tabla',    label:'Tabla comparativa',       count: PARTIDOS.length },
            ] as const).map(t => {
              const active = tab === t.k
              return (
                <button key={t.k} onClick={() => setTab(t.k)} className={`pt-tab-btn ${active ? 'pt-tab-btn--active' : ''}`}>
                  {t.label} <span className="pt-tab-count">{t.count}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ───── Tab Partidos ───── */}
        {tab === 'partidos' && (
          <>
            {/* Filtros */}
            <div className="pt-filters">
              <input
                type="text" value={query} onChange={e => setQuery(e.target.value)}
                placeholder={`Buscar entre ${PARTIDOS.length} partidos…`}
                className="pt-filters-input"
              />
              <span className="pt-filters-label">Familia:</span>
              <div className="pt-familias-wrap">
                {FAMILIAS.map(f => {
                  const active = filterFamilia === f
                  return (
                    <button key={f} onClick={() => setFilterFamilia(f)} className={`pt-familia-btn ${active ? 'pt-familia-btn--active' : ''}`}>{f}</button>
                  )
                })}
              </div>
              <span className="pt-filters-label pt-filters-label--ml">Orden:</span>
              <select value={orderBy} onChange={e => setOrderBy(e.target.value as typeof orderBy)} className="pt-orden-select">
                <option value="congreso">Escaños Congreso</option>
                <option value="intencion">Intención de voto</option>
                <option value="fundacion">Fundación</option>
              </select>
              <span className="pt-filters-counter">{filtered.length} partidos visibles</span>
            </div>

            {/* Cards de partidos */}
            <div className="pt-cards-grid">
              {filtered.map(p => <PartidoCard key={p.id} p={p}/>)}
              {filtered.length === 0 && (
                <div className="pt-empty">
                  Sin coincidencias.
                </div>
              )}
            </div>
          </>
        )}

        {/* ───── Tab Grupos parlamentarios ───── */}
        {tab === 'grupos' && (
          <>
            <div className="pt-barra-card">
              <h3 className="pt-barra-title">Composición del Congreso · 350 escaños</h3>
              <p className="pt-barra-desc">Distribución de los 8 grupos parlamentarios. Mayoría absoluta = 176 · investidura efectiva 23J: 179 SÍ.</p>
              <BarraComposicion grupos={GRUPOS}/>
            </div>
            <div className="pt-grupos-grid">
              {GRUPOS.map(g => <GrupoCard key={g.id} g={g}/>)}
            </div>
          </>
        )}

        {/* ───── Tab Tabla comparativa ───── */}
        {tab === 'tabla' && (
          <div className="pt-tabla-card">
            <div className="pt-tabla-scroll">
              <table className="pt-tabla">
                <thead>
                  <tr className="pt-tabla-head-row">
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
                      <th key={h.l} className={`pt-tabla-th pt-tabla-th--${h.a}`}>{h.l}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...PARTIDOS].sort((a,b) => b.congreso - a.congreso).map((p, i) => (
                    <tr key={p.id} className={`pt-tabla-row ${i%2 ? 'pt-tabla-row--odd' : 'pt-tabla-row--even'}`}>
                      <td className="pt-tabla-td">
                        <div className="pt-tabla-partido-cell">
                          <span className="pt-tabla-swatch" style={{ background:p.color }}/>
                          <div className="pt-tabla-min-wrap">
                            <div className="pt-tabla-siglas">{p.siglas}</div>
                            <div className="pt-tabla-nombre">{p.nombre}</div>
                          </div>
                        </div>
                      </td>
                      <td className="pt-tabla-td pt-tabla-familia">{p.familia}</td>
                      <td className="pt-tabla-td pt-tabla-td--right pt-tabla-fundacion">{p.fundacion}</td>
                      <td className="pt-tabla-td pt-tabla-lider">{p.presidente}</td>
                      <td className="pt-tabla-td pt-tabla-td--right pt-tabla-num" style={{ color:p.color }}>{p.congreso}</td>
                      <td className="pt-tabla-td pt-tabla-td--right pt-tabla-num--soft">{p.senado}</td>
                      <td className="pt-tabla-td pt-tabla-td--right pt-tabla-num--soft">{p.europa}</td>
                      <td className="pt-tabla-td pt-tabla-td--right pt-tabla-num--soft">{p.ccaa}</td>
                      <td className="pt-tabla-td pt-tabla-td--right pt-tabla-pct">{p.voto2023}%</td>
                      <td className="pt-tabla-td pt-tabla-td--right pt-tabla-pct" style={{ color:p.color }}>{p.intencion}%</td>
                      <td className={`pt-tabla-td pt-tabla-td--right pt-tabla-delta ${p.delta30d > 0 ? 'pt-tabla-delta--up' : p.delta30d < 0 ? 'pt-tabla-delta--down' : 'pt-tabla-delta--flat'}`}>
                        {p.delta30d > 0 ? '▲' : p.delta30d < 0 ? '▼' : '→'} {Math.abs(p.delta30d).toFixed(1)}
                      </td>
                      <td className="pt-tabla-td pt-tabla-spark">
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
      <footer className="pt-footer">
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
    <article className="pt-card">
      <header className="pt-card-header" style={{
        background: `linear-gradient(135deg, ${p.color}10, ${p.color}03)`,
        borderBottom: `2px solid ${p.color}`,
      }}>
        <div className="pt-card-logo" style={{ background: p.color, boxShadow: `0 2px 6px ${p.color}50` }}>{p.siglas.length <= 4 ? p.siglas : p.siglas.slice(0,4)}</div>
        <div className="pt-card-info">
          <div className="pt-card-meta-row">
            <span className="pt-card-familia" style={{ background: p.color }}>{p.familia.toUpperCase()}</span>
            <span className="pt-card-ambito">· {p.ambito.toUpperCase()} · DESDE {p.fundacion}</span>
          </div>
          <h3 className="pt-card-name">
            {p.nombre}
          </h3>
          <p className="pt-card-lideres">
            <strong>{p.presidente}</strong> · {p.secretario}
          </p>
        </div>
        <div className="pt-card-intencion">
          <div className="pt-card-intencion-num" style={{ color: p.color }}>{p.intencion}<span className="pt-card-intencion-pct">%</span></div>
          <div className={`pt-card-delta ${p.delta30d > 0 ? 'pt-card-delta--up' : p.delta30d < 0 ? 'pt-card-delta--down' : 'pt-card-delta--flat'}`}>
            {p.delta30d > 0 ? '▲' : p.delta30d < 0 ? '▼' : '→'} {Math.abs(p.delta30d).toFixed(1)} · 30d
          </div>
        </div>
      </header>

      <div className="pt-card-body">
        {/* Representación */}
        <div className="pt-rep-grid">
          {[
            { l:'Congreso',  v:p.congreso,   c:p.color },
            { l:'Senado',    v:p.senado,     c:'#3a3a3d' },
            { l:'Europa',    v:p.europa,     c:'#3a3a3d' },
            { l:'Govs CCAA', v:p.ccaa,       c:'#3a3a3d' },
            { l:'Alc. >100k',v:p.alcaldias,  c:'#3a3a3d' },
          ].map(k => (
            <div key={k.l} className="pt-rep-cell">
              <div className="pt-rep-value" style={{ color: k.c }}>{k.v}</div>
              <div className="pt-rep-label">{k.l}</div>
            </div>
          ))}
        </div>

        {/* Eje ideológico */}
        <div className="pt-eje-wrap">
          <div className="pt-eje-head">
            <span className="pt-eje-label">Eje izquierda · derecha</span>
            <span className="pt-eje-value" style={{ color: p.color }}>{p.ideologia > 0 ? `+${p.ideologia}` : p.ideologia}</span>
          </div>
          <EjePosicion value={p.ideologia} color={p.color}/>
        </div>

        {/* Tendencia + grupo UE */}
        <div className="pt-trend-grid">
          <div className="pt-trend-cell">
            <div className="pt-trend-label">Voto generales (últimas 6)</div>
            <Sparkline data={p.votoSerie} color={p.color} h={28}/>
            <div className="pt-trend-range">
              <span>2008</span><span>2023</span>
            </div>
          </div>
          <div className="pt-trend-cell">
            <div className="pt-trend-label">Grupo UE</div>
            <div className="pt-grupo-ue">{p.grupoUE}</div>
            <div className="pt-grupo-ue-extra">
              <span>{p.afiliados}K afiliados</span>
            </div>
          </div>
        </div>

        {/* Fortalezas y debilidades */}
        <div className="pt-fd-grid">
          <div>
            <div className="pt-fd-label pt-fd-label--fort">Fortalezas</div>
            {p.fortalezas.map(f => (
              <div key={f} className="pt-fd-item">
                <span className="pt-fd-glyph pt-fd-glyph--fort">+</span>{f}
              </div>
            ))}
          </div>
          <div>
            <div className="pt-fd-label pt-fd-label--debi">Debilidades</div>
            {p.debilidades.map(d => (
              <div key={d} className="pt-fd-item">
                <span className="pt-fd-glyph pt-fd-glyph--debi">−</span>{d}
              </div>
            ))}
          </div>
        </div>

        {/* Backlinks · memoria institucional propia (Pilar 1+2) */}
        <div className="pt-backlinks-wrap">
          <EntityBacklinks
            kind="party"
            slug={p.id}
            fallbackName={p.nombre}
          />
        </div>
      </div>

      <footer className="pt-card-footer">
        <span><strong className="pt-card-footer-strong">{p.web}</strong></span>
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
    <article className="pt-grupo-card">
      <div className="pt-grupo-head" style={{ borderBottom: `2px solid ${g.color}` }}>
        <div className="pt-grupo-circle" style={{ background: g.color, boxShadow: `0 2px 6px ${g.color}50` }}>{g.escanos}</div>
        <div className="pt-grupo-info">
          <div className="pt-grupo-tags">
            <span className="pt-grupo-pos" style={{ background: pm.color }}>{pm.label}</span>
          </div>
          <h3 className="pt-grupo-name">{g.nombre}</h3>
          <p className="pt-grupo-escanos">{g.escanos} escaños · {Math.round((g.escanos/350)*100)}% del Congreso</p>
        </div>
      </div>
      <div className="pt-grupo-body">
        <div className="pt-grupo-row-grid">
          <div>
            <div className="pt-grupo-row-label">Presidente del grupo</div>
            <div className="pt-grupo-row-value">{g.presidente}</div>
          </div>
          <div>
            <div className="pt-grupo-row-label">Portavoz</div>
            <div className="pt-grupo-row-value">{g.portavoz}</div>
          </div>
        </div>
        <div className="pt-grupo-disc-block">
          <div className="pt-grupo-disc-label">Disciplina de voto</div>
          <div className="pt-grupo-disc-row">
            <div className="pt-grupo-disc-track">
              <div className="pt-grupo-disc-fill" style={{ width: `${g.disciplina}%`, background: g.color }}/>
            </div>
            <span className="pt-grupo-disc-num" style={{ color: g.color }}>{g.disciplina}%</span>
          </div>
        </div>
        <div>
          <div className="pt-grupo-partidos-label">Partidos integrantes</div>
          <div className="pt-grupo-partidos-wrap">
            {g.partidos.map(p => (
              <span key={p} className="pt-grupo-partido-pill" style={{
                background: `${g.color}15`,
                color: g.color,
                border: `1px solid ${g.color}40`,
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
      <div className="pt-barra-track">
        {segments.map((g, i) => (
          <div key={g.id}
            className={`pt-barra-seg ${i < segments.length - 1 ? 'pt-barra-seg--divider' : ''}`}
            style={{ width: `${g.pctW}%`, background: g.color }}
            title={`${g.nombre} · ${g.escanos}`}
          >
            {g.pctW > 6 ? g.escanos : ''}
          </div>
        ))}
        <div className="pt-barra-mark" style={{ left: `${majX}%` }}/>
        <div className="pt-barra-mark-label" style={{ left: `${majX}%` }}>176 · MAYORÍA</div>
      </div>
      <div className="pt-barra-legend">
        {sorted.map(g => (
          <div key={g.id} className="pt-barra-legend-row">
            <span className="pt-barra-legend-swatch" style={{ background: g.color }}/>
            <span className="pt-barra-legend-name">{g.nombre.replace('GP ', '')}</span>
            <span className="pt-barra-legend-num">{g.escanos}</span>
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
    <div className="pt-kpi">
      <div className="pt-kpi-value">{value}</div>
      <div className="pt-kpi-label">{label}</div>
    </div>
  )
}

function EjePosicion({ value, color }: { value: number, color: string }) {
  const pct = ((value + 100) / 200) * 100
  return (
    <div className="pt-eje-bar">
      <div className="pt-eje-marker" style={{
        left: `${pct}%`,
        background: color,
        boxShadow: `0 0 0 2px ${color}50, 0 1px 3px rgba(0,0,0,0.1)`,
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
    <svg viewBox={`0 0 ${w} ${h}`} className="pt-spark-svg" style={{ height: h }} preserveAspectRatio="none">
      <polyline points={area} fill={`${color}20`} stroke="none"/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
      <circle cx={w} cy={h - 4 - ((data[data.length - 1] - min) / range) * (h - 8)} r="2" fill={color}/>
    </svg>
  )
}
