/**
 * Catálogo enumerado de las 17 Comunidades Autónomas + 2 Ciudades Autónomas.
 *
 * Cada CCAA tiene:
 *   - código INE (01-19)
 *   - bandera emoji / color
 *   - capital, provincias, población base (referencia INE)
 *   - presidente actual (catálogo de figuras lo enriquece)
 *   - parlamento autonómico (nombre + URL)
 *   - boletín oficial (URL)
 *   - tokens de detección para filtrar noticias
 *   - dominios web oficiales
 */

export interface CCAA {
  slug: string                       // 'andalucia', 'cataluna', ...
  code: string                       // código INE: '01' .. '19'
  nombre: string
  nombreCorto: string
  capital: string
  provincias: string[]
  poblacion: number                  // último dato INE en miles
  superficie: number                 // km²
  color: string                      // color institucional
  bandera?: string                   // opcional · sin emojis
  fundacion: number                  // año del Estatuto
  presidente: string                 // actual (catálogo de figuras lo abre)
  partidoGobierno: string
  parlamento: string                 // nombre del parlamento
  parlamentoUrl: string
  gobiernoUrl: string
  boletin: string                    // BO autonómico
  boletinUrl: string
  /** Web INE de datos abiertos para esta CCAA */
  ineCode: number                    // 1-19 según INE oficial
  /** Tokens para detectar la CCAA en titulares */
  tokens: string[]
  /** Wikipedia URL */
  wikipedia: string
  /** PIB anual aprox en M€ */
  pibMillones: number
  /** Sectores económicos predominantes */
  sectoresClave: string[]
}

export const CCAA_LIST: CCAA[] = [
  {
    slug: 'andalucia', code: '01', ineCode: 1, nombre: 'Andalucía', nombreCorto: 'Andalucía', capital: 'Sevilla',
    provincias: ['Almería', 'Cádiz', 'Córdoba', 'Granada', 'Huelva', 'Jaén', 'Málaga', 'Sevilla'],
    poblacion: 8649, superficie: 87268, fundacion: 1981,
    color: '#005C2E',
    presidente: 'Juanma Moreno', partidoGobierno: 'PP',
    parlamento: 'Parlamento de Andalucía',
    parlamentoUrl: 'https://www.parlamentodeandalucia.es',
    gobiernoUrl: 'https://www.juntadeandalucia.es',
    boletin: 'BOJA', boletinUrl: 'https://www.juntadeandalucia.es/eboja',
    tokens: ['andaluc[íi]a', 'junta de andaluc', 'moreno bonilla', 'juanma moreno'],
    wikipedia: 'https://es.wikipedia.org/wiki/Andaluc%C3%ADa',
    pibMillones: 173000, sectoresClave: ['agroalimentación', 'turismo', 'construcción', 'aeroespacial'],
  },
  {
    slug: 'aragon', code: '02', ineCode: 2, nombre: 'Aragón', nombreCorto: 'Aragón', capital: 'Zaragoza',
    provincias: ['Huesca', 'Teruel', 'Zaragoza'],
    poblacion: 1351, superficie: 47720, fundacion: 1982,
    color: '#FFCC00',
    presidente: 'Jorge Azcón', partidoGobierno: 'PP',
    parlamento: 'Cortes de Aragón',
    parlamentoUrl: 'https://www.cortesaragon.es',
    gobiernoUrl: 'https://www.aragon.es',
    boletin: 'BOA', boletinUrl: 'https://www.boa.aragon.es',
    tokens: ['arag[óo]n', 'zaragoza', 'gobierno de arag', 'azcón'],
    wikipedia: 'https://es.wikipedia.org/wiki/Arag%C3%B3n',
    pibMillones: 41000, sectoresClave: ['automoción', 'logística', 'agroalimentación', 'energías renovables'],
  },
  {
    slug: 'asturias', code: '03', ineCode: 3, nombre: 'Principado de Asturias', nombreCorto: 'Asturias', capital: 'Oviedo',
    provincias: ['Asturias'],
    poblacion: 1010, superficie: 10604, fundacion: 1981,
    color: '#0080C0',
    presidente: 'Adrián Barbón', partidoGobierno: 'PSOE',
    parlamento: 'Junta General del Principado de Asturias',
    parlamentoUrl: 'https://www.jgpa.es',
    gobiernoUrl: 'https://www.asturias.es',
    boletin: 'BOPA', boletinUrl: 'https://sede.asturias.es/bopa',
    tokens: ['asturias', 'principado de asturias', 'oviedo', 'gijón', 'barbón'],
    wikipedia: 'https://es.wikipedia.org/wiki/Principado_de_Asturias',
    pibMillones: 24000, sectoresClave: ['siderúrgica', 'minería', 'turismo rural', 'pesca'],
  },
  {
    slug: 'baleares', code: '04', ineCode: 4, nombre: 'Illes Balears', nombreCorto: 'Baleares', capital: 'Palma',
    provincias: ['Illes Balears'],
    poblacion: 1230, superficie: 4992, fundacion: 1983,
    color: '#762435',
    presidente: 'Marga Prohens', partidoGobierno: 'PP',
    parlamento: 'Parlament de les Illes Balears',
    parlamentoUrl: 'https://www.parlamentib.es',
    gobiernoUrl: 'https://www.caib.es',
    boletin: 'BOIB', boletinUrl: 'https://www.caib.es/eboibfront',
    tokens: ['baleares', 'illes balears', 'palma de mallorca', 'mallorca', 'menorca', 'ibiza', 'prohens'],
    wikipedia: 'https://es.wikipedia.org/wiki/Islas_Baleares',
    pibMillones: 36000, sectoresClave: ['turismo', 'náutica', 'construcción', 'agroalimentación'],
  },
  {
    slug: 'canarias', code: '05', ineCode: 5, nombre: 'Canarias', nombreCorto: 'Canarias', capital: 'Las Palmas / Santa Cruz',
    provincias: ['Las Palmas', 'Santa Cruz de Tenerife'],
    poblacion: 2253, superficie: 7447, fundacion: 1982,
    color: '#FFCC33',
    presidente: 'Fernando Clavijo', partidoGobierno: 'CC',
    parlamento: 'Parlamento de Canarias',
    parlamentoUrl: 'https://www.parcan.es',
    gobiernoUrl: 'https://www.gobiernodecanarias.org',
    boletin: 'BOC', boletinUrl: 'https://www.gobiernodecanarias.org/boc',
    tokens: ['canarias', 'tenerife', 'gran canaria', 'las palmas', 'clavijo', 'coalición canaria'],
    wikipedia: 'https://es.wikipedia.org/wiki/Canarias',
    pibMillones: 47000, sectoresClave: ['turismo', 'puerto franco', 'agroalimentación', 'plataneras'],
  },
  {
    slug: 'cantabria', code: '06', ineCode: 6, nombre: 'Cantabria', nombreCorto: 'Cantabria', capital: 'Santander',
    provincias: ['Cantabria'],
    poblacion: 583, superficie: 5321, fundacion: 1981,
    color: '#C8102E',
    presidente: 'María José Sáenz de Buruaga', partidoGobierno: 'PP',
    parlamento: 'Parlamento de Cantabria',
    parlamentoUrl: 'https://parlamento-cantabria.es',
    gobiernoUrl: 'https://www.cantabria.es',
    boletin: 'BOC Cantabria', boletinUrl: 'https://boc.cantabria.es',
    tokens: ['cantabria', 'santander', 'buruaga', 'gobierno de cantabria'],
    wikipedia: 'https://es.wikipedia.org/wiki/Cantabria',
    pibMillones: 16000, sectoresClave: ['industria', 'agroalimentación', 'turismo rural', 'naval'],
  },
  {
    slug: 'castilla-leon', code: '07', ineCode: 7, nombre: 'Castilla y León', nombreCorto: 'CyL', capital: 'Valladolid',
    provincias: ['Ávila', 'Burgos', 'León', 'Palencia', 'Salamanca', 'Segovia', 'Soria', 'Valladolid', 'Zamora'],
    poblacion: 2380, superficie: 94223, fundacion: 1983,
    color: '#C00000',
    presidente: 'Alfonso Fernández Mañueco', partidoGobierno: 'PP',
    parlamento: 'Cortes de Castilla y León',
    parlamentoUrl: 'https://www.ccyl.es',
    gobiernoUrl: 'https://www.jcyl.es',
    boletin: 'BOCYL', boletinUrl: 'https://bocyl.jcyl.es',
    tokens: ['castilla y le[óo]n', 'valladolid', 'mañueco', 'junta de castilla'],
    wikipedia: 'https://es.wikipedia.org/wiki/Castilla_y_Le%C3%B3n',
    pibMillones: 67000, sectoresClave: ['agroalimentación', 'automoción', 'energía', 'ovino-vacuno'],
  },
  {
    slug: 'castilla-mancha', code: '08', ineCode: 8, nombre: 'Castilla-La Mancha', nombreCorto: 'CLM', capital: 'Toledo',
    provincias: ['Albacete', 'Ciudad Real', 'Cuenca', 'Guadalajara', 'Toledo'],
    poblacion: 2127, superficie: 79409, fundacion: 1982,
    color: '#7D8AC4',
    presidente: 'Emiliano García-Page', partidoGobierno: 'PSOE',
    parlamento: 'Cortes de Castilla-La Mancha',
    parlamentoUrl: 'https://www.cortesclm.es',
    gobiernoUrl: 'https://www.castillalamancha.es',
    boletin: 'DOCM', boletinUrl: 'https://docm.castillalamancha.es',
    tokens: ['castilla-la mancha', 'castilla la mancha', 'page', 'toledo', 'albacete'],
    wikipedia: 'https://es.wikipedia.org/wiki/Castilla-La_Mancha',
    pibMillones: 47000, sectoresClave: ['agroalimentación', 'vino', 'energías renovables', 'logística'],
  },
  {
    slug: 'cataluna', code: '09', ineCode: 9, nombre: 'Cataluña', nombreCorto: 'Cataluña', capital: 'Barcelona',
    provincias: ['Barcelona', 'Girona', 'Lleida', 'Tarragona'],
    poblacion: 8012, superficie: 32108, fundacion: 1979,
    color: '#FFCC00',
    presidente: 'Salvador Illa', partidoGobierno: 'PSC',
    parlamento: 'Parlament de Catalunya',
    parlamentoUrl: 'https://www.parlament.cat',
    gobiernoUrl: 'https://www.gencat.cat',
    boletin: 'DOGC', boletinUrl: 'https://dogc.gencat.cat',
    tokens: ['catalu[ñn]a', 'barcelona', 'generalitat', 'illa president', 'puigdemont', 'esquerra'],
    wikipedia: 'https://es.wikipedia.org/wiki/Catalu%C3%B1a',
    pibMillones: 264000, sectoresClave: ['automoción', 'química', 'turismo', 'farmacéutica', 'tech'],
  },
  {
    slug: 'valenciana', code: '10', ineCode: 10, nombre: 'Comunidad Valenciana', nombreCorto: 'C. Valenciana', capital: 'Valencia',
    provincias: ['Alicante', 'Castellón', 'Valencia'],
    poblacion: 5216, superficie: 23255, fundacion: 1982,
    color: '#FFAA00',
    presidente: 'Juanfran Pérez Llorca', partidoGobierno: 'PP',
    parlamento: 'Corts Valencianes',
    parlamentoUrl: 'https://www.cortsvalencianes.es',
    gobiernoUrl: 'https://www.gva.es',
    boletin: 'DOGV', boletinUrl: 'https://dogv.gva.es',
    tokens: ['valenciana', 'valencia', 'generalitat valenciana', 'pérez llorca', 'mazón', 'dana valencia'],
    wikipedia: 'https://es.wikipedia.org/wiki/Comunidad_Valenciana',
    pibMillones: 122000, sectoresClave: ['turismo', 'agroalimentación', 'cerámica', 'automoción', 'náutica'],
  },
  {
    slug: 'extremadura', code: '11', ineCode: 11, nombre: 'Extremadura', nombreCorto: 'Extremadura', capital: 'Mérida',
    provincias: ['Badajoz', 'Cáceres'],
    poblacion: 1060, superficie: 41635, fundacion: 1983,
    color: '#016A2C',
    presidente: 'María Guardiola', partidoGobierno: 'PP',
    parlamento: 'Asamblea de Extremadura',
    parlamentoUrl: 'https://www.asambleaex.es',
    gobiernoUrl: 'https://www.juntaex.es',
    boletin: 'DOE', boletinUrl: 'https://doe.juntaex.es',
    tokens: ['extremadura', 'mérida', 'badajoz', 'cáceres', 'guardiola extremadura'],
    wikipedia: 'https://es.wikipedia.org/wiki/Extremadura',
    pibMillones: 23000, sectoresClave: ['agroalimentación', 'dehesa', 'energías renovables', 'turismo rural'],
  },
  {
    slug: 'galicia', code: '12', ineCode: 12, nombre: 'Galicia', nombreCorto: 'Galicia', capital: 'Santiago de Compostela',
    provincias: ['A Coruña', 'Lugo', 'Ourense', 'Pontevedra'],
    poblacion: 2706, superficie: 29575, fundacion: 1981,
    color: '#0072BC',
    presidente: 'Alfonso Rueda', partidoGobierno: 'PP',
    parlamento: 'Parlamento de Galicia',
    parlamentoUrl: 'https://www.parlamentodegalicia.gal',
    gobiernoUrl: 'https://www.xunta.gal',
    boletin: 'DOG', boletinUrl: 'https://www.xunta.gal/diario-oficial-galicia',
    tokens: ['galicia', 'xunta', 'rueda', 'santiago de compostela', 'vigo', 'a coruña'],
    wikipedia: 'https://es.wikipedia.org/wiki/Galicia',
    pibMillones: 71000, sectoresClave: ['pesca', 'automoción', 'naval', 'agroalimentación', 'textil'],
  },
  {
    slug: 'madrid', code: '13', ineCode: 13, nombre: 'Comunidad de Madrid', nombreCorto: 'Madrid', capital: 'Madrid',
    provincias: ['Madrid'],
    poblacion: 6871, superficie: 8028, fundacion: 1983,
    color: '#C00000',
    presidente: 'Isabel Díaz Ayuso', partidoGobierno: 'PP',
    parlamento: 'Asamblea de Madrid',
    parlamentoUrl: 'https://www.asambleamadrid.es',
    gobiernoUrl: 'https://www.comunidad.madrid',
    boletin: 'BOCM', boletinUrl: 'https://www.bocm.es',
    tokens: ['comunidad de madrid', 'asamblea de madrid', 'ayuso', 'puerta del sol'],
    wikipedia: 'https://es.wikipedia.org/wiki/Comunidad_de_Madrid',
    pibMillones: 264000, sectoresClave: ['servicios financieros', 'tecnología', 'turismo', 'logística', 'sede empresarial'],
  },
  {
    slug: 'murcia', code: '14', ineCode: 14, nombre: 'Región de Murcia', nombreCorto: 'Murcia', capital: 'Murcia',
    provincias: ['Murcia'],
    poblacion: 1538, superficie: 11313, fundacion: 1982,
    color: '#C00000',
    presidente: 'Fernando López Miras', partidoGobierno: 'PP',
    parlamento: 'Asamblea Regional de Murcia',
    parlamentoUrl: 'https://www.asambleamurcia.es',
    gobiernoUrl: 'https://www.carm.es',
    boletin: 'BORM', boletinUrl: 'https://www.borm.es',
    tokens: ['región de murcia', 'murcia', 'lópez miras', 'carm', 'cartagena'],
    wikipedia: 'https://es.wikipedia.org/wiki/Regi%C3%B3n_de_Murcia',
    pibMillones: 33000, sectoresClave: ['agroalimentación', 'mar menor', 'turismo', 'petroquímica'],
  },
  {
    slug: 'navarra', code: '15', ineCode: 15, nombre: 'Comunidad Foral de Navarra', nombreCorto: 'Navarra', capital: 'Pamplona',
    provincias: ['Navarra'],
    poblacion: 671, superficie: 10391, fundacion: 1982,
    color: '#C00000',
    presidente: 'María Chivite', partidoGobierno: 'PSN-PSOE',
    parlamento: 'Parlamento de Navarra',
    parlamentoUrl: 'https://www.parlamentodenavarra.es',
    gobiernoUrl: 'https://www.navarra.es',
    boletin: 'BON', boletinUrl: 'https://bon.navarra.es',
    tokens: ['navarra', 'foral de navarra', 'pamplona', 'chivite', 'upn', 'geroa bai'],
    wikipedia: 'https://es.wikipedia.org/wiki/Comunidad_Foral_de_Navarra',
    pibMillones: 25000, sectoresClave: ['automoción', 'agroalimentación', 'energías renovables', 'industria'],
  },
  {
    slug: 'pais-vasco', code: '16', ineCode: 16, nombre: 'País Vasco', nombreCorto: 'Euskadi', capital: 'Vitoria-Gasteiz',
    provincias: ['Álava', 'Bizkaia', 'Gipuzkoa'],
    poblacion: 2208, superficie: 7234, fundacion: 1979,
    color: '#009934',
    presidente: 'Imanol Pradales', partidoGobierno: 'PNV',
    parlamento: 'Eusko Legebiltzarra (Parlamento Vasco)',
    parlamentoUrl: 'https://www.legebiltzarra.eus',
    gobiernoUrl: 'https://www.euskadi.eus',
    boletin: 'BOPV', boletinUrl: 'https://www.euskadi.eus/y22-bopv',
    tokens: ['país vasco', 'euskadi', 'lehendakari', 'pradales', 'bilbao', 'donostia', 'gasteiz', 'pnv', 'eh bildu'],
    wikipedia: 'https://es.wikipedia.org/wiki/Pa%C3%ADs_Vasco',
    pibMillones: 86000, sectoresClave: ['industria', 'siderurgia', 'automoción', 'energía', 'biotech'],
  },
  {
    slug: 'rioja', code: '17', ineCode: 17, nombre: 'La Rioja', nombreCorto: 'La Rioja', capital: 'Logroño',
    provincias: ['La Rioja'],
    poblacion: 320, superficie: 5045, fundacion: 1982,
    color: '#7FBC56',
    presidente: 'Gonzalo Capellán', partidoGobierno: 'PP',
    parlamento: 'Parlamento de La Rioja',
    parlamentoUrl: 'https://www.parlamento-larioja.org',
    gobiernoUrl: 'https://www.larioja.org',
    boletin: 'BOR', boletinUrl: 'https://web.larioja.org/bor-portada',
    tokens: ['la rioja', 'logroño', 'capellán', 'gobierno de la rioja'],
    wikipedia: 'https://es.wikipedia.org/wiki/La_Rioja_(Espa%C3%B1a)',
    pibMillones: 9000, sectoresClave: ['vino', 'agroalimentación', 'calzado', 'metal-mecánica'],
  },
  {
    slug: 'ceuta', code: '18', ineCode: 18, nombre: 'Ciudad Autónoma de Ceuta', nombreCorto: 'Ceuta', capital: 'Ceuta',
    provincias: ['Ceuta'],
    poblacion: 83, superficie: 19, fundacion: 1995,
    color: '#C00000',
    presidente: 'Juan Jesús Vivas', partidoGobierno: 'PP',
    parlamento: 'Asamblea de Ceuta',
    parlamentoUrl: 'https://www.ceuta.es',
    gobiernoUrl: 'https://www.ceuta.es',
    boletin: 'BOCCE', boletinUrl: 'https://www.ceuta.es/bocce',
    tokens: ['ceuta', 'vivas ceuta', 'ciudad autónoma de ceuta'],
    wikipedia: 'https://es.wikipedia.org/wiki/Ceuta',
    pibMillones: 1700, sectoresClave: ['servicios', 'comercio', 'pesca', 'turismo'],
  },
  {
    slug: 'melilla', code: '19', ineCode: 19, nombre: 'Ciudad Autónoma de Melilla', nombreCorto: 'Melilla', capital: 'Melilla',
    provincias: ['Melilla'],
    poblacion: 86, superficie: 14, fundacion: 1995,
    color: '#0066B3',
    presidente: 'Juan José Imbroda', partidoGobierno: 'PP',
    parlamento: 'Asamblea de Melilla',
    parlamentoUrl: 'https://www.melilla.es',
    gobiernoUrl: 'https://www.melilla.es',
    boletin: 'BOME', boletinUrl: 'https://www.melilla.es/melillaPortal/contenedor.jsp?seccion=s_fdes_d4_v4.jsp',
    tokens: ['melilla', 'imbroda', 'ciudad autónoma de melilla'],
    wikipedia: 'https://es.wikipedia.org/wiki/Melilla',
    pibMillones: 1500, sectoresClave: ['servicios', 'comercio fronterizo', 'pesca', 'turismo'],
  },
]

export function getCCAABySlug(slug: string): CCAA | undefined {
  return CCAA_LIST.find(c => c.slug === slug)
}

export function getCCAAByCode(code: string): CCAA | undefined {
  return CCAA_LIST.find(c => c.code === code)
}
