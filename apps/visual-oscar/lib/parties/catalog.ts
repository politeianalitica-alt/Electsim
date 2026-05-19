/**
 * Catálogo enumerado de partidos políticos españoles.
 *
 * Sólo metadata ESTABLE (siglas, color, fundación, web, twitter, Wikipedia,
 * grupo europeo). El contenido dinámico (escaños, encuestas, noticias,
 * líderes, intervenciones) se carga en vivo desde otras fuentes.
 */

export interface PartyMeta {
  slug: string
  siglas: string
  nombre: string
  color: string
  /** Familia ideológica europea */
  familia: string
  /** Ámbito: estatal o autonómico (qué territorio) */
  ambito: string
  /** Año fundación */
  fundacion: number
  /** Posición ideológica estimada (-100 izq → +100 dcha) */
  ideologia: number
  /** Centralización (-100 descentralización → +100 centralización) */
  centralizacion: number
  /** Web oficial */
  web: string
  /** Handle X/Twitter (sin @) */
  twitter: string
  /** URL Wikipedia */
  wikipedia: string
  /** Grupo en el Parlamento Europeo */
  grupoUE: string
  /** Tokens para detectar el partido en titulares (lowercase) */
  tokens: string[]
  /** Líderes destacados (ids del catálogo de figuras o nombres) */
  liderazgos: string[]
}

export const PARTIES: PartyMeta[] = [
  {
    slug: 'psoe', siglas: 'PSOE', nombre: 'Partido Socialista Obrero Español', color: '#E1322D',
    familia: 'Socialdemocracia', ambito: 'Estatal', fundacion: 1879,
    ideologia: -22, centralizacion: 12,
    web: 'https://www.psoe.es', twitter: 'PSOE',
    wikipedia: 'https://es.wikipedia.org/wiki/Partido_Socialista_Obrero_Espa%C3%B1ol',
    grupoUE: 'S&D · Socialistas y Demócratas',
    tokens: ['psoe', 'partido socialista', 'socialistas', 'gp socialista'],
    liderazgos: ['Pedro Sánchez', 'María Jesús Montero', 'Pilar Alegría', 'Óscar Puente'],
  },
  {
    slug: 'pp', siglas: 'PP', nombre: 'Partido Popular', color: '#1F4E8C',
    familia: 'Conservador', ambito: 'Estatal', fundacion: 1989,
    ideologia: 38, centralizacion: -12,
    web: 'https://www.pp.es', twitter: 'populares',
    wikipedia: 'https://es.wikipedia.org/wiki/Partido_Popular_(Espa%C3%B1a)',
    grupoUE: 'PPE · Partido Popular Europeo',
    tokens: ['\\bpp\\b', 'partido popular', 'populares', 'gp popular'],
    liderazgos: ['Alberto Núñez Feijóo', 'Miguel Tellado', 'Isabel Díaz Ayuso', 'Juanma Moreno', 'Alfonso Rueda', 'Juanfran Pérez Llorca'],
  },
  {
    slug: 'vox', siglas: 'VOX', nombre: 'VOX', color: '#5BA02E',
    familia: 'Derecha radical', ambito: 'Estatal', fundacion: 2013,
    ideologia: 78, centralizacion: 60,
    web: 'https://www.voxespana.es', twitter: 'vox_es',
    wikipedia: 'https://es.wikipedia.org/wiki/Vox_(partido_pol%C3%ADtico)',
    grupoUE: 'PfE · Patriotas por Europa',
    tokens: ['vox', 'gp vox'],
    liderazgos: ['Santiago Abascal', 'Ignacio Garriga', 'Pepa Millán'],
  },
  {
    slug: 'sumar', siglas: 'Sumar', nombre: 'Movimiento Sumar', color: '#D43F8D',
    familia: 'Izquierda alternativa', ambito: 'Estatal', fundacion: 2023,
    ideologia: -58, centralizacion: -18,
    web: 'https://movimientosumar.es', twitter: 'sumar',
    wikipedia: 'https://es.wikipedia.org/wiki/Sumar_(movimiento_pol%C3%ADtico)',
    grupoUE: 'The Left · GUE/NGL',
    tokens: ['sumar', 'movimiento sumar', 'gp sumar'],
    liderazgos: ['Yolanda Díaz', 'Mónica García', 'Pablo Bustinduy', 'Sira Rego'],
  },
  {
    slug: 'podemos', siglas: 'Podemos', nombre: 'Podemos', color: '#6C2C5E',
    familia: 'Izquierda alternativa', ambito: 'Estatal', fundacion: 2014,
    ideologia: -65, centralizacion: -10,
    web: 'https://podemos.info', twitter: 'PODEMOS',
    wikipedia: 'https://es.wikipedia.org/wiki/Podemos',
    grupoUE: 'The Left · GUE/NGL',
    tokens: ['podemos', 'gp podemos'],
    liderazgos: ['Ione Belarra', 'Irene Montero', 'Pablo Iglesias'],
  },
  {
    slug: 'junts', siglas: 'Junts', nombre: 'Junts per Catalunya', color: '#1FA89B',
    familia: 'Independentista catalán', ambito: 'Catalán', fundacion: 2018,
    ideologia: 12, centralizacion: -88,
    web: 'https://junts.cat', twitter: 'JuntsxCat',
    wikipedia: 'https://es.wikipedia.org/wiki/Junts_per_Catalunya',
    grupoUE: 'No inscritos',
    tokens: ['junts', 'gp junts', 'juntsxcat', 'puigdemont'],
    liderazgos: ['Carles Puigdemont', 'Jordi Turull', 'Míriam Nogueras'],
  },
  {
    slug: 'erc', siglas: 'ERC', nombre: 'Esquerra Republicana de Catalunya', color: '#E8A030',
    familia: 'Independentista catalán', ambito: 'Catalán', fundacion: 1931,
    ideologia: -32, centralizacion: -78,
    web: 'https://www.esquerra.cat', twitter: 'Esquerra_ERC',
    wikipedia: 'https://es.wikipedia.org/wiki/Esquerra_Republicana_de_Catalunya',
    grupoUE: 'Verdes/ALE',
    tokens: ['erc', 'esquerra', 'gp erc'],
    liderazgos: ['Oriol Junqueras', 'Marta Rovira', 'Gabriel Rufián'],
  },
  {
    slug: 'eh-bildu', siglas: 'EH Bildu', nombre: 'Euskal Herria Bildu', color: '#3F7A3A',
    familia: 'Independentista vasco', ambito: 'Vasco', fundacion: 2011,
    ideologia: -62, centralizacion: -65,
    web: 'https://ehbildu.eus', twitter: 'ehbildu',
    wikipedia: 'https://es.wikipedia.org/wiki/EH_Bildu',
    grupoUE: 'The Left · GUE/NGL',
    tokens: ['eh bildu', 'bildu', 'gp eh bildu', 'arnaldo otegi', 'otegi'],
    liderazgos: ['Arnaldo Otegi', 'Pello Otxandiano', 'Mertxe Aizpurua'],
  },
  {
    slug: 'pnv', siglas: 'PNV', nombre: 'Partido Nacionalista Vasco · EAJ', color: '#7DB94B',
    familia: 'Nacionalista vasco', ambito: 'Vasco', fundacion: 1895,
    ideologia: 10, centralizacion: -72,
    web: 'https://www.eaj-pnv.eus', twitter: 'eajpnv',
    wikipedia: 'https://es.wikipedia.org/wiki/Partido_Nacionalista_Vasco',
    grupoUE: 'PEDEM · Partido Demócrata Europeo',
    tokens: ['pnv', 'eaj-pnv', 'eaj pnv', 'aitor esteban'],
    liderazgos: ['Andoni Ortuzar', 'Aitor Esteban', 'Imanol Pradales'],
  },
  {
    slug: 'bng', siglas: 'BNG', nombre: 'Bloque Nacionalista Galego', color: '#5BB3D9',
    familia: 'Nacionalista gallego', ambito: 'Gallego', fundacion: 1982,
    ideologia: -40, centralizacion: -70,
    web: 'https://www.bng.gal', twitter: 'obloque',
    wikipedia: 'https://es.wikipedia.org/wiki/Bloque_Nacionalista_Galego',
    grupoUE: 'The Left · GUE/NGL',
    tokens: ['bng', 'bloque nacionalista', 'nestor rego', 'ana pontón'],
    liderazgos: ['Ana Pontón', 'Néstor Rego'],
  },
  {
    slug: 'cc', siglas: 'CC', nombre: 'Coalición Canaria', color: '#F2C43A',
    familia: 'Regionalista canario', ambito: 'Canario', fundacion: 1993,
    ideologia: 8, centralizacion: -50,
    web: 'https://coalicioncanaria.org', twitter: 'coalicion',
    wikipedia: 'https://es.wikipedia.org/wiki/Coalici%C3%B3n_Canaria',
    grupoUE: 'Renew · PEDEM',
    tokens: ['coalición canaria', 'coalicion canaria', '\\bcc\\b', 'clavijo'],
    liderazgos: ['Fernando Clavijo', 'Cristina Valido'],
  },
  {
    slug: 'upn', siglas: 'UPN', nombre: 'Unión del Pueblo Navarro', color: '#0E7D8C',
    familia: 'Regionalista navarro', ambito: 'Navarro', fundacion: 1979,
    ideologia: 32, centralizacion: -30,
    web: 'https://www.upn.org', twitter: 'upnnavarra',
    wikipedia: 'https://es.wikipedia.org/wiki/Uni%C3%B3n_del_Pueblo_Navarro',
    grupoUE: 'PPE',
    tokens: ['upn', 'pueblo navarro'],
    liderazgos: ['Alberto Catalán', 'Javier Esparza'],
  },
  {
    slug: 'compromis', siglas: 'Compromís', nombre: 'Compromís', color: '#FF8200',
    familia: 'Regionalista valenciano', ambito: 'Valenciano', fundacion: 2010,
    ideologia: -40, centralizacion: -55,
    web: 'https://www.compromis.net', twitter: 'compromis',
    wikipedia: 'https://es.wikipedia.org/wiki/Compromis',
    grupoUE: 'Verdes/ALE',
    tokens: ['compromís', 'compromis', 'mónica oltra', 'baldoví'],
    liderazgos: ['Joan Baldoví', 'Águeda Micó'],
  },
  {
    slug: 'prc', siglas: 'PRC', nombre: 'Partido Regionalista de Cantabria', color: '#0086D3',
    familia: 'Regionalista cántabro', ambito: 'Cántabro', fundacion: 1978,
    ideologia: -10, centralizacion: -25,
    web: 'https://www.prc-prc.es', twitter: 'prcantabria',
    wikipedia: 'https://es.wikipedia.org/wiki/Partido_Regionalista_de_Cantabria',
    grupoUE: 'Renew',
    tokens: ['prc', 'regionalista cantabria', 'revilla'],
    liderazgos: ['Miguel Ángel Revilla', 'Paula Fernández'],
  },
  {
    slug: 'pacma', siglas: 'PACMA', nombre: 'Partido Animalista Contra el Maltrato Animal', color: '#7BBE5B',
    familia: 'Animalista', ambito: 'Estatal', fundacion: 2003,
    ideologia: -20, centralizacion: 5,
    web: 'https://pacma.es', twitter: 'PartidoPACMA',
    wikipedia: 'https://es.wikipedia.org/wiki/Partido_Animalista_Contra_el_Maltrato_Animal',
    grupoUE: '—',
    tokens: ['pacma', 'animalista'],
    liderazgos: ['Javier Luna', 'Laura Duarte'],
  },
]

export function getPartyBySlug(slug: string): PartyMeta | undefined {
  return PARTIES.find(p => p.slug === slug)
}
