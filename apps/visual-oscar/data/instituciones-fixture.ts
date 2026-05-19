/**
 * FIXTURE — Instituciones locales y regionales.
 *
 * Datos curados (CCAA, diputaciones provinciales y forales, capitales y
 * grandes ciudades, cabildos canarios, consells insulars baleàrics) que
 * sirven como fallback cuando el backend `/api/opendata/datasets?q=instituciones`
 * (o endpoint definitivo) aún no devuelve estos datasets.
 *
 * El route handler `app/api/instituciones/route.ts` los devuelve con
 * `_meta.source='mock'`.
 */

export type Signo =
  | 'PP' | 'PSOE' | 'PSC' | 'PNV' | 'CC' | 'NC' | 'ERC' | 'Junts' | 'Bildu'
  | 'BNG' | 'CUP' | 'Sumar' | 'PSE' | 'Foro' | 'ASG' | 'DO' | 'PRC' | 'TpT'
  | 'Sa Unió' | 'Independiente'

export type SignoBloque = 'derecha' | 'izquierda' | 'territorial'

export type CCAA = {
  id: string
  nombre: string
  presidente: string
  partido: Signo
  bloque: SignoBloque
  apoyo: string
  pob: number       // millones habitantes
  presup: number    // miles de millones €
  esc: number
  escPdte: number
  proxElec: string
  desde: number
  capital: string
  web: string
  consejerias: string[]   // 3-4 consejerías clave
}

export type Diputacion = {
  prov: string
  ccaa: string
  presidente: string
  partido: Signo
  bloque: SignoBloque
  pob: number       // miles habitantes
  forall?: boolean
  web: string
}

export type Capital = {
  id: string
  ciudad: string
  prov: string
  alcalde: string
  partido: Signo
  bloque: SignoBloque
  pob: number       // miles habitantes
  desde: number
  web: string
}

export type Insular = {
  id: string
  nombre: string
  presidente: string
  partido: Signo
  bloque: SignoBloque
  pob: number       // miles
  archipielago: 'Canarias' | 'Baleares'
  web: string
}

// ─────────────────────────────────────────────────────────────────────────
// Datos · Comunidades Autónomas y Ciudades Autónomas (19)
// ─────────────────────────────────────────────────────────────────────────
export const CCAAS: CCAA[] = [
  { id:'andalucia', nombre:'Andalucía',           presidente:'Juanma Moreno',               partido:'PP',   bloque:'derecha',     apoyo:'Mayoría absoluta PP',                       pob:8.6, presup:48.2, esc:109, escPdte:58, proxElec:'Jun 2026', desde:2019, capital:'Sevilla',
    web:'https://www.juntadeandalucia.es/', consejerias:['Hacienda · Carolina España','Salud · Catalina García','Sostenibilidad · R. Fernández-Pacheco','Turismo · Arturo Bernal'] },
  { id:'aragon',    nombre:'Aragón',              presidente:'Jorge Azcón',                 partido:'PP',   bloque:'derecha',     apoyo:'PP en minoría (rota con VOX)',              pob:1.3, presup:8.4,  esc:67,  escPdte:28, proxElec:'May 2027', desde:2023, capital:'Zaragoza',
    web:'https://www.aragon.es/', consejerias:['Presidencia · Mar Vaquero','Hacienda · Manuel Magdaleno','Educación · Claudia Pérez Forniés'] },
  { id:'asturias',  nombre:'Asturias',            presidente:'Adrián Barbón',               partido:'PSOE', bloque:'izquierda',   apoyo:'PSOE+IU+Convocatoria',                       pob:1.0, presup:6.0,  esc:45,  escPdte:19, proxElec:'May 2027', desde:2019, capital:'Oviedo',
    web:'https://www.asturias.es/', consejerias:['Vp y Ciencia · Borja Sánchez','Presidencia · Gimena Llamedo','Hacienda · G. Peláez'] },
  { id:'baleares',  nombre:'Illes Balears',       presidente:'Marga Prohens',               partido:'PP',   bloque:'derecha',     apoyo:'PP en minoría con apoyo VOX',                pob:1.2, presup:6.8,  esc:59,  escPdte:25, proxElec:'May 2027', desde:2023, capital:'Palma',
    web:'https://www.caib.es/', consejerias:['Vp y Economía · Antoni Costa','Educación · Antoni Vera','Salud · Manuela García'] },
  { id:'canarias',  nombre:'Canarias',            presidente:'Fernando Clavijo',            partido:'CC',   bloque:'territorial', apoyo:'CC+PP+ASG+AHI',                              pob:2.2, presup:11.2, esc:70,  escPdte:19, proxElec:'May 2027', desde:2023, capital:'Las Palmas / S. Cruz',
    web:'https://www.gobiernodecanarias.org/', consejerias:['Vp · Manuel Domínguez (PP)','Hacienda · Matilde Asián','Sanidad · Esther Monzón','Educación · Poli Suárez'] },
  { id:'cantabria', nombre:'Cantabria',           presidente:'María José Sáenz de Buruaga', partido:'PP',   bloque:'derecha',     apoyo:'PP en minoría',                              pob:0.6, presup:3.4,  esc:35,  escPdte:15, proxElec:'May 2027', desde:2023, capital:'Santander',
    web:'https://www.cantabria.es/', consejerias:['Vp · Isabel Urrutia','Industria · Eduardo Arasti','Salud · César Pascual'] },
  { id:'clm',       nombre:'Castilla-La Mancha',  presidente:'Emiliano García-Page',        partido:'PSOE', bloque:'izquierda',   apoyo:'Mayoría absoluta PSOE',                      pob:2.1, presup:11.0, esc:33,  escPdte:17, proxElec:'May 2027', desde:2015, capital:'Toledo',
    web:'https://www.castillalamancha.es/', consejerias:['Vp · José Manuel Caballero','Hacienda · Juan Alfonso Ruiz Molina','Bienestar Social · Esther Padilla'] },
  { id:'cyl',       nombre:'Castilla y León',     presidente:'Alfonso Fernández Mañueco',   partido:'PP',   bloque:'derecha',     apoyo:'PP en minoría (rota coalición VOX)',         pob:2.4, presup:13.4, esc:81,  escPdte:31, proxElec:'Mar 2026', desde:2019, capital:'Valladolid (de facto)',
    web:'https://www.jcyl.es/', consejerias:['Economía · Carlos Fernández Carriedo','Vp y Familia · Isabel Blanco','Sanidad · Alejandro Vázquez','Educación · Rocío Lucas'] },
  { id:'cataluna',  nombre:'Cataluña',            presidente:'Salvador Illa',               partido:'PSC',  bloque:'izquierda',   apoyo:'PSC con investidura ERC+Comuns',             pob:7.8, presup:43.0, esc:135, escPdte:42, proxElec:'May 2028', desde:2024, capital:'Barcelona',
    web:'https://web.gencat.cat/', consejerias:['Presidència · Albert Dalmau','Interior · Núria Parlon','Salut · Eva Menor','Economia · Alícia Romero'] },
  { id:'extremadura',nombre:'Extremadura',         presidente:'María Guardiola',             partido:'PP',   bloque:'derecha',     apoyo:'PP en minoría (rota con VOX)',              pob:1.0, presup:6.4,  esc:65,  escPdte:28, proxElec:'May 2027', desde:2023, capital:'Mérida',
    web:'https://www.juntaex.es/', consejerias:['Vp y Hacienda · J. A. Sánchez Juliá','Cultura · Elena Manzano','Salud · Sara García Espada'] },
  { id:'galicia',   nombre:'Galicia',             presidente:'Alfonso Rueda',               partido:'PP',   bloque:'derecha',     apoyo:'Mayoría absoluta PP',                       pob:2.7, presup:13.0, esc:75,  escPdte:40, proxElec:'Feb 2028', desde:2022, capital:'Santiago de Compostela',
    web:'https://www.xunta.gal/', consejerias:['Vp · Diego Calvo','Facenda · Miguel Corgos','Sanidade · Julio García Comesaña','Medio Rural · José González'] },
  { id:'rioja',     nombre:'La Rioja',            presidente:'Gonzalo Capellán',            partido:'PP',   bloque:'derecha',     apoyo:'PP en minoría (rota con VOX)',              pob:0.3, presup:2.0,  esc:33,  escPdte:17, proxElec:'May 2027', desde:2023, capital:'Logroño',
    web:'https://www.larioja.org/', consejerias:['Vp · Sara Orradre','Hacienda · Daniel Osés','Salud · M. Martín Díez de Baldeón'] },
  { id:'madrid',    nombre:'Comunidad de Madrid', presidente:'Isabel Díaz Ayuso',           partido:'PP',   bloque:'derecha',     apoyo:'Mayoría absoluta PP',                       pob:7.0, presup:28.0, esc:135, escPdte:71, proxElec:'May 2027', desde:2019, capital:'Madrid',
    web:'https://www.comunidad.madrid/', consejerias:['Vp y Economía · M. Á. García Martín','Hacienda · Rocío Albert','Sanidad · Fátima Matute','Educación · Emilio Viciana'] },
  { id:'murcia',    nombre:'Región de Murcia',    presidente:'Fernando López Miras',        partido:'PP',   bloque:'derecha',     apoyo:'PP en minoría (rota con VOX)',              pob:1.5, presup:7.4,  esc:45,  escPdte:21, proxElec:'May 2027', desde:2017, capital:'Murcia',
    web:'https://www.carm.es/', consejerias:['Presidencia · Marcos Ortuño','Hacienda · Luis Alfonso Marín','Salud · Juan José Pedreño'] },
  { id:'navarra',   nombre:'Navarra',             presidente:'María Chivite',               partido:'PSOE', bloque:'izquierda',   apoyo:'PSN+Geroa Bai+Contigo (Bildu absten.)',      pob:0.7, presup:5.8,  esc:50,  escPdte:11, proxElec:'May 2027', desde:2019, capital:'Pamplona',
    web:'https://www.navarra.es/', consejerias:['Vp · Ana Ollo (Geroa Bai)','Hacienda · Félix Taberna','Derechos Sociales · Begoña Alfaro (Sumar)'] },
  { id:'pvasco',    nombre:'Euskadi · País Vasco',presidente:'Imanol Pradales',             partido:'PNV',  bloque:'territorial', apoyo:'PNV+PSE-EE',                                 pob:2.2, presup:14.7, esc:75,  escPdte:27, proxElec:'Abr 2028', desde:2024, capital:'Vitoria-Gasteiz',
    web:'https://www.euskadi.eus/', consejerias:['Vlhdtz. · Mikel Torres (PSE)','Gobernanza · M. Ubarretxena','Educación · Maite Alonso','Salud · Alberto Martínez'] },
  { id:'cvalenciana',nombre:'Comunitat Valenciana',presidente:'Juanfran Pérez Llorca',       partido:'PP',   bloque:'derecha',     apoyo:'PP en minoría (relevo de Mazón tras DANA · ruptura con VOX)',     pob:5.2, presup:27.8, esc:99,  escPdte:40, proxElec:'May 2027', desde:2025, capital:'València',
    web:'https://www.gva.es/', consejerias:['Vp y Servicios Sociales · Susana Camarero','Hacienda · J. B. Ruiz','Sanidad · Marciano Gómez','Educación · J. A. Rovira'] },
  { id:'ceuta',     nombre:'Ciudad Autónoma de Ceuta',  presidente:'Juan Jesús Vivas',  partido:'PP', bloque:'derecha', apoyo:'PP en minoría',           pob:0.08, presup:0.32, esc:25, escPdte:14, proxElec:'May 2027', desde:2001, capital:'Ceuta',
    web:'https://www.ceuta.es/', consejerias:['Vp · Carlos Rontomé','Hacienda · Mabel Deu'] },
  { id:'melilla',   nombre:'Ciudad Autónoma de Melilla',presidente:'Juan José Imbroda',  partido:'PP', bloque:'derecha', apoyo:'PP+VOX (rota)',           pob:0.08, presup:0.30, esc:25, escPdte:14, proxElec:'May 2027', desde:2023, capital:'Melilla',
    web:'https://www.melilla.es/', consejerias:['Vp · Miguel Marín','Hacienda · Esther Donoso'] },
]

// ─────────────────────────────────────────────────────────────────────────
// Datos · Diputaciones provinciales (38) + 3 forales vascas + 1 navarra
// ─────────────────────────────────────────────────────────────────────────
export const DIPUTACIONES: Diputacion[] = [
  // Galicia
  { prov:'A Coruña',     ccaa:'Galicia',          presidente:'Valentín González Formoso', partido:'PSOE', bloque:'izquierda',   pob:1130, web:'https://www.dacoruna.gal/' },
  { prov:'Lugo',         ccaa:'Galicia',          presidente:'José Tomé Roca',            partido:'PSOE', bloque:'izquierda',   pob:328,  web:'https://www.deputacionlugo.gal/' },
  { prov:'Ourense',      ccaa:'Galicia',          presidente:'Luis Menor',                partido:'PP',   bloque:'derecha',     pob:307,  web:'https://www.depourense.es/' },
  { prov:'Pontevedra',   ccaa:'Galicia',          presidente:'Luis López',                partido:'PP',   bloque:'derecha',     pob:944,  web:'https://www.depo.gal/' },
  // Aragón
  { prov:'Zaragoza',     ccaa:'Aragón',           presidente:'Juan Antonio Sánchez Quero',partido:'PSOE', bloque:'izquierda',   pob:967,  web:'https://www.dpz.es/' },
  { prov:'Huesca',       ccaa:'Aragón',           presidente:'Isaac Claver',              partido:'PP',   bloque:'derecha',     pob:223,  web:'https://www.dphuesca.es/' },
  { prov:'Teruel',       ccaa:'Aragón',           presidente:'Joaquín Juste',             partido:'PP',   bloque:'derecha',     pob:134,  web:'https://www.dpteruel.es/' },
  // Cataluña
  { prov:'Barcelona',    ccaa:'Cataluña',         presidente:'Lluïsa Moret',              partido:'PSC',  bloque:'izquierda',   pob:5750, web:'https://www.diba.cat/' },
  { prov:'Tarragona',    ccaa:'Cataluña',         presidente:'Noemí Llauradó',            partido:'ERC',  bloque:'territorial', pob:830,  web:'https://www.dipta.cat/' },
  { prov:'Lleida',       ccaa:'Cataluña',         presidente:'Joan Talarn',               partido:'ERC',  bloque:'territorial', pob:439,  web:'https://www.diputaciolleida.cat/' },
  { prov:'Girona',       ccaa:'Cataluña',         presidente:'Pau Presas',                partido:'PSC',  bloque:'izquierda',   pob:786,  web:'https://www.ddgi.cat/' },
  // Castilla y León
  { prov:'Burgos',       ccaa:'Castilla y León',  presidente:'Borja Suárez',              partido:'PP',   bloque:'derecha',     pob:355,  web:'https://www.diputaciondeburgos.es/' },
  { prov:'León',         ccaa:'Castilla y León',  presidente:'Gerardo Álvarez Courel',    partido:'PSOE', bloque:'izquierda',   pob:447,  web:'https://www.dipuleon.es/' },
  { prov:'Palencia',     ccaa:'Castilla y León',  presidente:'Ángeles Armisén',           partido:'PP',   bloque:'derecha',     pob:158,  web:'https://www.diputaciondepalencia.es/' },
  { prov:'Salamanca',    ccaa:'Castilla y León',  presidente:'Javier Iglesias',           partido:'PP',   bloque:'derecha',     pob:325,  web:'https://www.salamanca.es/' },
  { prov:'Segovia',      ccaa:'Castilla y León',  presidente:'Miguel Ángel de Vicente',   partido:'PP',   bloque:'derecha',     pob:154,  web:'https://www.dipsegovia.es/' },
  { prov:'Soria',        ccaa:'Castilla y León',  presidente:'Benito Serrano',            partido:'PP',   bloque:'derecha',     pob:88,   web:'https://www.dipsoria.es/' },
  { prov:'Valladolid',   ccaa:'Castilla y León',  presidente:'Conrado Íscar',             partido:'PP',   bloque:'derecha',     pob:519,  web:'https://www.diputaciondevalladolid.es/' },
  { prov:'Zamora',       ccaa:'Castilla y León',  presidente:'Javier Faúndez',            partido:'PP',   bloque:'derecha',     pob:166,  web:'https://www.diputaciondezamora.es/' },
  { prov:'Ávila',        ccaa:'Castilla y León',  presidente:'Carlos García',             partido:'PP',   bloque:'derecha',     pob:158,  web:'https://www.diputacionavila.es/' },
  // Castilla-La Mancha
  { prov:'Albacete',     ccaa:'Castilla-La Mancha',presidente:'Santi Cabañero',           partido:'PSOE', bloque:'izquierda',   pob:386,  web:'https://www.dipualba.es/' },
  { prov:'Ciudad Real',  ccaa:'Castilla-La Mancha',presidente:'Miguel Ángel Valverde',    partido:'PP',   bloque:'derecha',     pob:495,  web:'https://www.dipucr.es/' },
  { prov:'Cuenca',       ccaa:'Castilla-La Mancha',presidente:'Álvaro Martínez Chana',    partido:'PSOE', bloque:'izquierda',   pob:198,  web:'https://www.dipucuenca.es/' },
  { prov:'Guadalajara',  ccaa:'Castilla-La Mancha',presidente:'José Luis Vega',           partido:'PSOE', bloque:'izquierda',   pob:267,  web:'https://www.dguadalajara.es/' },
  { prov:'Toledo',       ccaa:'Castilla-La Mancha',presidente:'Concepción Cedillo',       partido:'PP',   bloque:'derecha',     pob:735,  web:'https://www.diputoledo.es/' },
  // Andalucía
  { prov:'Almería',      ccaa:'Andalucía',        presidente:'Javier A. García',          partido:'PP',   bloque:'derecha',     pob:758,  web:'https://www.dipalme.org/' },
  { prov:'Cádiz',        ccaa:'Andalucía',        presidente:'Almudena Martínez',         partido:'PP',   bloque:'derecha',     pob:1248, web:'https://www.dipucadiz.es/' },
  { prov:'Córdoba',      ccaa:'Andalucía',        presidente:'Salvador Fuentes',          partido:'PP',   bloque:'derecha',     pob:773,  web:'https://www.dipucordoba.es/' },
  { prov:'Granada',      ccaa:'Andalucía',        presidente:'Francis Rodríguez',         partido:'PP',   bloque:'derecha',     pob:920,  web:'https://www.dipgra.es/' },
  { prov:'Huelva',       ccaa:'Andalucía',        presidente:'David Toscano',             partido:'PP',   bloque:'derecha',     pob:531,  web:'https://www.diphuelva.es/' },
  { prov:'Jaén',         ccaa:'Andalucía',        presidente:'Paco Reyes',                partido:'PSOE', bloque:'izquierda',   pob:622,  web:'https://www.dipujaen.es/' },
  { prov:'Málaga',       ccaa:'Andalucía',        presidente:'Francisco Salado',          partido:'PP',   bloque:'derecha',     pob:1730, web:'https://www.malaga.es/' },
  { prov:'Sevilla',      ccaa:'Andalucía',        presidente:'Javier Fernández',          partido:'PSOE', bloque:'izquierda',   pob:1949, web:'https://www.dipusevilla.es/' },
  // Comunidad Valenciana
  { prov:'Alicante',     ccaa:'C. Valenciana',    presidente:'Toni Pérez',                partido:'PP',   bloque:'derecha',     pob:1885, web:'https://www.diputacionalicante.es/' },
  { prov:'Castellón',    ccaa:'C. Valenciana',    presidente:'Marta Barrachina',          partido:'PP',   bloque:'derecha',     pob:600,  web:'https://www.dipcas.es/' },
  { prov:'Valencia',     ccaa:'C. Valenciana',    presidente:'Vicent Mompó',              partido:'PP',   bloque:'derecha',     pob:2630, web:'https://www.dival.es/' },
  // Extremadura
  { prov:'Badajoz',      ccaa:'Extremadura',      presidente:'Miguel Ángel Gallardo',     partido:'PSOE', bloque:'izquierda',   pob:670,  web:'https://www.dip-badajoz.es/' },
  { prov:'Cáceres',      ccaa:'Extremadura',      presidente:'Carlos Carlos Rodríguez',   partido:'PSOE', bloque:'izquierda',   pob:386,  web:'https://www.dip-caceres.es/' },
  // Forales (régimen especial)
  { prov:'Bizkaia',      ccaa:'País Vasco',       presidente:'Elixabete Etxanobe',        partido:'PNV',  bloque:'territorial', pob:1145, forall:true,  web:'https://www.bizkaia.eus/' },
  { prov:'Gipuzkoa',     ccaa:'País Vasco',       presidente:'Eider Mendoza',             partido:'PNV',  bloque:'territorial', pob:725,  forall:true,  web:'https://www.gipuzkoa.eus/' },
  { prov:'Álava',        ccaa:'País Vasco',       presidente:'Ramiro González',           partido:'PNV',  bloque:'territorial', pob:336,  forall:true,  web:'https://www.araba.eus/' },
  { prov:'Navarra',      ccaa:'Navarra',          presidente:'María Chivite (foral)',     partido:'PSOE', bloque:'izquierda',   pob:670,  forall:true,  web:'https://www.navarra.es/' },
]

// ─────────────────────────────────────────────────────────────────────────
// Datos · Mapa de webs oficiales para capitales (clave = id de la capital)
// ─────────────────────────────────────────────────────────────────────────
export const WEB_CAPITAL: Record<string, string> = {
  madrid:'https://www.madrid.es/', barcelona:'https://www.barcelona.cat/',
  valencia:'https://www.valencia.es/', sevilla:'https://www.sevilla.org/',
  zaragoza:'https://www.zaragoza.es/', malaga:'https://www.malaga.eu/',
  murcia:'https://www.murcia.es/', palma:'https://www.palma.cat/',
  lpgc:'https://www.laspalmasgc.es/', bilbao:'https://www.bilbao.eus/',
  alicante:'https://www.alicante.es/', cordoba:'https://www.cordoba.es/',
  valladolid:'https://www.valladolid.es/', vigo:'https://www.vigo.org/',
  gijon:'https://www.gijon.es/', lhospitalet:'https://www.l-h.cat/',
  vitoria:'https://www.vitoria-gasteiz.org/', corunha:'https://www.coruna.gal/',
  granada:'https://www.granada.org/', elche:'https://www.elche.es/',
  oviedo:'https://www.oviedo.es/', sct:'https://www.santacruzdetenerife.es/',
  pamplona:'https://www.pamplona.es/', cartagena:'https://www.cartagena.es/',
  terrassa:'https://www.terrassa.cat/', jerez:'https://www.jerez.es/',
  sabadell:'https://www.sabadell.cat/', mostoles:'https://www.mostoles.es/',
  alcala:'https://www.ayto-alcaladehenares.es/', fuenlabrada:'https://www.ayto-fuenlabrada.es/',
  almeria:'https://www.aytoalmeria.es/', leganes:'https://www.leganes.org/',
  donostia:'https://www.donostia.eus/', burgos:'https://www.aytoburgos.es/',
  santander:'https://www.santander.es/', castellon:'https://www.castello.es/',
  getafe:'https://www.getafe.es/', albacete:'https://www.albacete.es/',
  logrono:'https://www.logrono.es/', badajoz:'https://www.aytobadajoz.es/',
  huelva:'https://www.huelva.es/', salamanca:'https://www.aytosalamanca.es/',
  lleida:'https://www.paeria.cat/', tarragona:'https://www.tarragona.cat/',
  leon:'https://www.aytoleon.es/', cadiz:'https://www.cadiz.es/',
  caceres:'https://www.ayto-caceres.es/', toledo:'https://www.toledo.es/',
  pontevedra:'https://www.pontevedra.gal/', cr:'https://www.ayuntamientociudadreal.es/',
  lugo:'https://www.lugo.gal/', ourense:'https://www.ourense.gal/',
  soria:'https://www.soria.es/', teruel:'https://www.teruel.es/',
  cuenca:'https://www.cuenca.es/', huesca:'https://www.huesca.es/',
  avila:'https://www.avila.es/', zamora:'https://www.zamora.es/',
  palencia:'https://www.aytopalencia.es/', segovia:'https://www.segovia.es/',
  girona:'https://www.girona.cat/', merida:'https://www.merida.es/',
  logmar:'https://www.marbella.es/',
}

// ─────────────────────────────────────────────────────────────────────────
// Datos · Capitales y grandes ciudades (50+) · `web` ya resuelto desde WEB_CAPITAL
// ─────────────────────────────────────────────────────────────────────────
export const CAPITALES: Capital[] = ([
  { id:'madrid',     ciudad:'Madrid',            prov:'Madrid',       alcalde:'José Luis Martínez-Almeida',partido:'PP',   bloque:'derecha',     pob:3398, desde:2019 },
  { id:'barcelona',  ciudad:'Barcelona',         prov:'Barcelona',    alcalde:'Jaume Collboni',            partido:'PSC',  bloque:'izquierda',   pob:1660, desde:2023 },
  { id:'valencia',   ciudad:'València',          prov:'Valencia',     alcalde:'María José Catalá',         partido:'PP',   bloque:'derecha',     pob:792,  desde:2023 },
  { id:'sevilla',    ciudad:'Sevilla',           prov:'Sevilla',      alcalde:'José Luis Sanz',            partido:'PP',   bloque:'derecha',     pob:684,  desde:2023 },
  { id:'zaragoza',   ciudad:'Zaragoza',          prov:'Zaragoza',     alcalde:'Natalia Chueca',            partido:'PP',   bloque:'derecha',     pob:687,  desde:2023 },
  { id:'malaga',     ciudad:'Málaga',            prov:'Málaga',       alcalde:'Francisco de la Torre',     partido:'PP',   bloque:'derecha',     pob:589,  desde:2000 },
  { id:'murcia',     ciudad:'Murcia',            prov:'Murcia',       alcalde:'José Ballesta',             partido:'PP',   bloque:'derecha',     pob:471,  desde:2023 },
  { id:'palma',      ciudad:'Palma',             prov:'Baleares',     alcalde:'Jaime Martínez',            partido:'PP',   bloque:'derecha',     pob:419,  desde:2023 },
  { id:'lpgc',       ciudad:'Las Palmas de G.C.',prov:'Las Palmas',   alcalde:'Carolina Darias',           partido:'PSOE', bloque:'izquierda',   pob:380,  desde:2023 },
  { id:'bilbao',     ciudad:'Bilbao',            prov:'Bizkaia',      alcalde:'Juan Mari Aburto',          partido:'PNV',  bloque:'territorial', pob:347,  desde:2015 },
  { id:'alicante',   ciudad:'Alicante',          prov:'Alicante',     alcalde:'Luis Barcala',              partido:'PP',   bloque:'derecha',     pob:340,  desde:2018 },
  { id:'cordoba',    ciudad:'Córdoba',           prov:'Córdoba',      alcalde:'José María Bellido',        partido:'PP',   bloque:'derecha',     pob:323,  desde:2019 },
  { id:'valladolid', ciudad:'Valladolid',        prov:'Valladolid',   alcalde:'Jesús Julio Carnero',       partido:'PP',   bloque:'derecha',     pob:298,  desde:2023 },
  { id:'vigo',       ciudad:'Vigo',              prov:'Pontevedra',   alcalde:'Abel Caballero',            partido:'PSOE', bloque:'izquierda',   pob:294,  desde:2007 },
  { id:'gijon',      ciudad:'Gijón',             prov:'Asturias',     alcalde:'Carmen Moriyón',            partido:'Foro', bloque:'derecha',     pob:269,  desde:2023 },
  { id:'lhospitalet',ciudad:'L\'Hospitalet',     prov:'Barcelona',    alcalde:'Núria Marín',               partido:'PSC',  bloque:'izquierda',   pob:265,  desde:2008 },
  { id:'vitoria',    ciudad:'Vitoria-Gasteiz',   prov:'Álava',        alcalde:'Maider Etxebarria',         partido:'PSE',  bloque:'izquierda',   pob:255,  desde:2023 },
  { id:'corunha',    ciudad:'A Coruña',          prov:'A Coruña',     alcalde:'Inés Rey',                  partido:'PSOE', bloque:'izquierda',   pob:248,  desde:2019 },
  { id:'granada',    ciudad:'Granada',           prov:'Granada',      alcalde:'Marifrán Carazo',           partido:'PP',   bloque:'derecha',     pob:228,  desde:2023 },
  { id:'elche',      ciudad:'Elche',             prov:'Alicante',     alcalde:'Pablo Ruz',                 partido:'PP',   bloque:'derecha',     pob:237,  desde:2023 },
  { id:'oviedo',     ciudad:'Oviedo',            prov:'Asturias',     alcalde:'Alfredo Canteli',           partido:'PP',   bloque:'derecha',     pob:218,  desde:2019 },
  { id:'sct',        ciudad:'S. Cruz Tenerife',  prov:'Tenerife',     alcalde:'José Manuel Bermúdez',      partido:'CC',   bloque:'territorial', pob:208,  desde:2011 },
  { id:'pamplona',   ciudad:'Pamplona',          prov:'Navarra',      alcalde:'Joseba Asirón',             partido:'Bildu',bloque:'territorial', pob:206,  desde:2024 },
  { id:'cartagena',  ciudad:'Cartagena',         prov:'Murcia',       alcalde:'Noelia Arroyo',             partido:'PP',   bloque:'derecha',     pob:217,  desde:2021 },
  { id:'terrassa',   ciudad:'Terrassa',          prov:'Barcelona',    alcalde:'Jordi Ballart',             partido:'TpT',  bloque:'territorial', pob:225,  desde:2019 },
  { id:'jerez',      ciudad:'Jerez',             prov:'Cádiz',        alcalde:'María José García-Pelayo',  partido:'PP',   bloque:'derecha',     pob:212,  desde:2023 },
  { id:'sabadell',   ciudad:'Sabadell',          prov:'Barcelona',    alcalde:'Marta Farrés',              partido:'PSC',  bloque:'izquierda',   pob:216,  desde:2019 },
  { id:'mostoles',   ciudad:'Móstoles',          prov:'Madrid',       alcalde:'Manuel Bautista',           partido:'PP',   bloque:'derecha',     pob:209,  desde:2023 },
  { id:'alcala',     ciudad:'Alcalá de Henares', prov:'Madrid',       alcalde:'Judith Piquet',             partido:'PP',   bloque:'derecha',     pob:198,  desde:2023 },
  { id:'fuenlabrada',ciudad:'Fuenlabrada',       prov:'Madrid',       alcalde:'Javier Ayala',              partido:'PSOE', bloque:'izquierda',   pob:193,  desde:2019 },
  { id:'almeria',    ciudad:'Almería',           prov:'Almería',      alcalde:'María del Mar Vázquez',     partido:'PP',   bloque:'derecha',     pob:201,  desde:2023 },
  { id:'leganes',    ciudad:'Leganés',           prov:'Madrid',       alcalde:'Miguel Ángel Recuenco',     partido:'PP',   bloque:'derecha',     pob:189,  desde:2023 },
  { id:'donostia',   ciudad:'Donostia / S. Sebast.',prov:'Gipuzkoa',  alcalde:'Eneko Goia',                partido:'PNV',  bloque:'territorial', pob:189,  desde:2015 },
  { id:'burgos',     ciudad:'Burgos',            prov:'Burgos',       alcalde:'Daniel de la Rosa',         partido:'PSOE', bloque:'izquierda',   pob:175,  desde:2023 },
  { id:'santander',  ciudad:'Santander',         prov:'Cantabria',    alcalde:'Gema Igual',                partido:'PP',   bloque:'derecha',     pob:172,  desde:2017 },
  { id:'castellon',  ciudad:'Castellón',         prov:'Castellón',    alcalde:'Begoña Carrasco',           partido:'PP',   bloque:'derecha',     pob:172,  desde:2023 },
  { id:'getafe',     ciudad:'Getafe',            prov:'Madrid',       alcalde:'Sara Hernández',            partido:'PSOE', bloque:'izquierda',   pob:185,  desde:2017 },
  { id:'albacete',   ciudad:'Albacete',          prov:'Albacete',     alcalde:'Manuel Serrano',            partido:'PP',   bloque:'derecha',     pob:175,  desde:2023 },
  { id:'logrono',    ciudad:'Logroño',           prov:'La Rioja',     alcalde:'Conrado Escobar',           partido:'PP',   bloque:'derecha',     pob:151,  desde:2023 },
  { id:'badajoz',    ciudad:'Badajoz',           prov:'Badajoz',      alcalde:'Ignacio Gragera',           partido:'PP',   bloque:'derecha',     pob:150,  desde:2019 },
  { id:'huelva',     ciudad:'Huelva',            prov:'Huelva',       alcalde:'Pilar Miranda',             partido:'PP',   bloque:'derecha',     pob:144,  desde:2023 },
  { id:'salamanca',  ciudad:'Salamanca',         prov:'Salamanca',    alcalde:'Carlos García Carbayo',     partido:'PP',   bloque:'derecha',     pob:144,  desde:2018 },
  { id:'lleida',     ciudad:'Lleida',            prov:'Lleida',       alcalde:'Fèlix Larrosa',             partido:'PSC',  bloque:'izquierda',   pob:140,  desde:2024 },
  { id:'tarragona',  ciudad:'Tarragona',         prov:'Tarragona',    alcalde:'Rubén Viñuales',            partido:'PSC',  bloque:'izquierda',   pob:140,  desde:2023 },
  { id:'leon',       ciudad:'León',              prov:'León',         alcalde:'José Antonio Diez',         partido:'PSOE', bloque:'izquierda',   pob:121,  desde:2019 },
  { id:'cadiz',      ciudad:'Cádiz',             prov:'Cádiz',        alcalde:'Bruno García Cabrera',      partido:'PP',   bloque:'derecha',     pob:114,  desde:2023 },
  { id:'caceres',    ciudad:'Cáceres',           prov:'Cáceres',      alcalde:'Rafael Mateos',             partido:'PP',   bloque:'derecha',     pob:97,   desde:2023 },
  { id:'toledo',     ciudad:'Toledo',            prov:'Toledo',       alcalde:'Carlos Velázquez',          partido:'PP',   bloque:'derecha',     pob:85,   desde:2023 },
  { id:'pontevedra', ciudad:'Pontevedra',        prov:'Pontevedra',   alcalde:'Miguel Anxo F. Lores',      partido:'BNG',  bloque:'territorial', pob:84,   desde:1999 },
  { id:'cr',         ciudad:'Ciudad Real',       prov:'Ciudad Real',  alcalde:'Francisco Cañizares',       partido:'PP',   bloque:'derecha',     pob:75,   desde:2023 },
  { id:'lugo',       ciudad:'Lugo',              prov:'Lugo',         alcalde:'Paula Alvarellos',          partido:'BNG',  bloque:'territorial', pob:97,   desde:2024 },
  { id:'ourense',    ciudad:'Ourense',           prov:'Ourense',      alcalde:'Gonzalo Pérez Jácome',      partido:'DO',   bloque:'territorial', pob:103,  desde:2019 },
  { id:'soria',      ciudad:'Soria',             prov:'Soria',        alcalde:'Carlos Martínez',           partido:'PSOE', bloque:'izquierda',   pob:39,   desde:2007 },
  { id:'teruel',     ciudad:'Teruel',            prov:'Teruel',       alcalde:'Emma Buj',                  partido:'PP',   bloque:'derecha',     pob:36,   desde:2019 },
  { id:'cuenca',     ciudad:'Cuenca',            prov:'Cuenca',       alcalde:'Beatriz Jiménez',           partido:'PP',   bloque:'derecha',     pob:54,   desde:2023 },
  { id:'huesca',     ciudad:'Huesca',            prov:'Huesca',       alcalde:'Lorena Orduna',             partido:'PP',   bloque:'derecha',     pob:53,   desde:2023 },
  { id:'avila',      ciudad:'Ávila',             prov:'Ávila',        alcalde:'Jesús Manuel Sánchez',      partido:'PP',   bloque:'derecha',     pob:58,   desde:2019 },
  { id:'zamora',     ciudad:'Zamora',            prov:'Zamora',       alcalde:'Francisco Guarido',         partido:'Sumar',bloque:'izquierda',   pob:60,   desde:2015 },
  { id:'palencia',   ciudad:'Palencia',          prov:'Palencia',     alcalde:'Mario Simón',               partido:'PP',   bloque:'derecha',     pob:79,   desde:2023 },
  { id:'segovia',    ciudad:'Segovia',           prov:'Segovia',      alcalde:'José Mazarías',             partido:'PP',   bloque:'derecha',     pob:51,   desde:2023 },
  { id:'girona',     ciudad:'Girona',            prov:'Girona',       alcalde:'Lluc Salellas',             partido:'CUP',  bloque:'territorial', pob:104,  desde:2023 },
  { id:'merida',     ciudad:'Mérida',            prov:'Badajoz',      alcalde:'Antonio Rodríguez Osuna',   partido:'PSOE', bloque:'izquierda',   pob:60,   desde:2015 },
  { id:'logmar',     ciudad:'Marbella',          prov:'Málaga',       alcalde:'Ángeles Muñoz',             partido:'PP',   bloque:'derecha',     pob:152,  desde:2007 },
] as Omit<Capital,'web'>[]).map(c => ({ ...c, web: WEB_CAPITAL[c.id] || '' }))

// ─────────────────────────────────────────────────────────────────────────
// Datos · Cabildos canarios (7) y Consells insulars baleáricos (4)
// ─────────────────────────────────────────────────────────────────────────
export const INSULARES: Insular[] = [
  // Canarias
  { id:'tf',  nombre:'Tenerife',         presidente:'Rosa Dávila',           partido:'CC',     bloque:'territorial', pob:931, archipielago:'Canarias', web:'https://www.tenerife.es/' },
  { id:'gc',  nombre:'Gran Canaria',     presidente:'Antonio Morales',       partido:'NC',     bloque:'territorial', pob:872, archipielago:'Canarias', web:'https://www.grancanaria.com/' },
  { id:'lz',  nombre:'Lanzarote',        presidente:'Oswaldo Betancort',     partido:'CC',     bloque:'territorial', pob:163, archipielago:'Canarias', web:'https://www.cabildodelanzarote.com/' },
  { id:'fv',  nombre:'Fuerteventura',    presidente:'Lola García',           partido:'CC',     bloque:'territorial', pob:128, archipielago:'Canarias', web:'https://www.cabildofuer.es/' },
  { id:'lp',  nombre:'La Palma',         presidente:'Sergio Rodríguez',      partido:'CC',     bloque:'territorial', pob: 84, archipielago:'Canarias', web:'https://www.cabildodelapalma.es/' },
  { id:'lg',  nombre:'La Gomera',        presidente:'Casimiro Curbelo',      partido:'ASG',    bloque:'territorial', pob: 22, archipielago:'Canarias', web:'https://www.lagomera.es/' },
  { id:'eh',  nombre:'El Hierro',        presidente:'Alpidio Armas',         partido:'PSOE',   bloque:'izquierda',   pob: 11, archipielago:'Canarias', web:'https://www.elhierro.es/' },
  // Baleares
  { id:'mll', nombre:'Mallorca',         presidente:'Llorenç Galmés',        partido:'PP',     bloque:'derecha',     pob:925, archipielago:'Baleares', web:'https://www.conselldemallorca.cat/' },
  { id:'mn',  nombre:'Menorca',          presidente:'Adolfo Vilafranca',     partido:'PP',     bloque:'derecha',     pob:101, archipielago:'Baleares', web:'https://www.cime.es/' },
  { id:'eiv', nombre:'Eivissa · Ibiza',  presidente:'Vicent Marí',           partido:'PP',     bloque:'derecha',     pob:159, archipielago:'Baleares', web:'https://www.conselldeivissa.es/' },
  { id:'fmt', nombre:'Formentera',       presidente:'Llorenç Córdoba',       partido:'Sa Unió',bloque:'territorial', pob: 12, archipielago:'Baleares', web:'https://www.consellinsulardeformentera.cat/' },
]
