'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'

// ─────────────────────────────────────────────────────────────────────────
// Modelo
// ─────────────────────────────────────────────────────────────────────────
type Signo = 'PP' | 'PSOE' | 'PSC' | 'PNV' | 'CC' | 'NC' | 'ERC' | 'Junts' | 'Bildu' | 'BNG' | 'CUP' | 'Sumar' | 'PSE' | 'Foro' | 'ASG' | 'DO' | 'PRC' | 'TpT' | 'Sa Unió' | 'Independiente'
type SignoBloque = 'derecha' | 'izquierda' | 'territorial'

type CCAA = {
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

type Diputacion = {
  prov: string
  ccaa: string
  presidente: string
  partido: Signo
  bloque: SignoBloque
  pob: number       // miles habitantes
  forall?: boolean
  web: string
}

type Capital = {
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

type Insular = {
  id: string
  nombre: string
  presidente: string
  partido: Signo
  bloque: SignoBloque
  pob: number       // miles
  archipielago: 'Canarias' | 'Baleares'
  web: string
}

const COLOR: Record<Signo, string> = {
  'PP':'#1F4E8C', 'PSOE':'#E1322D', 'PSC':'#C5152D',
  'PNV':'#7DB94B', 'PSE':'#E1322D',
  'CC':'#F2C43A', 'NC':'#00A0DC',
  'ERC':'#E8A030', 'Junts':'#1FA89B', 'Bildu':'#3F7A3A', 'BNG':'#5BB3D9',
  'CUP':'#F0DD2A', 'Sumar':'#D43F8D', 'Foro':'#002757',
  'ASG':'#0E7D8C', 'DO':'#9333EA', 'PRC':'#008C46',
  'TpT':'#7C2D92', 'Sa Unió':'#0E7490', 'Independiente':'#6e6e73',
}

const BLOQUE_META: Record<SignoBloque, { label: string; color: string }> = {
  'derecha':     { label:'CENTRO-DERECHA', color:'#1F4E8C' },
  'izquierda':   { label:'CENTRO-IZQUIERDA', color:'#E1322D' },
  'territorial': { label:'TERRITORIAL', color:'#7C3AED' },
}

// ─────────────────────────────────────────────────────────────────────────
// Datos · Comunidades Autónomas y Ciudades Autónomas (19)
// ─────────────────────────────────────────────────────────────────────────
const CCAAS: CCAA[] = [
  { id:'andalucia', nombre:'Andalucía',           presidente:'Juan Manuel Moreno Bonilla',  partido:'PP',   bloque:'derecha',     apoyo:'Mayoría absoluta PP',                       pob:8.6, presup:48.2, esc:109, escPdte:58, proxElec:'Jun 2026', desde:2019, capital:'Sevilla',
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
  { id:'cvalenciana',nombre:'Comunitat Valenciana',presidente:'Juanfran Pérez Llorca',       partido:'PP',   bloque:'derecha',     apoyo:'PP en coalición con VOX (relevo Mazón)',     pob:5.2, presup:27.8, esc:99,  escPdte:40, proxElec:'May 2027', desde:2024, capital:'València',
    web:'https://www.gva.es/', consejerias:['Vp y Servicios Sociales · Susana Camarero','Hacienda · J. B. Ruiz','Sanidad · Marciano Gómez','Educación · J. A. Rovira'] },
  { id:'ceuta',     nombre:'Ciudad Autónoma de Ceuta',  presidente:'Juan Jesús Vivas',  partido:'PP', bloque:'derecha', apoyo:'PP en minoría',           pob:0.08, presup:0.32, esc:25, escPdte:14, proxElec:'May 2027', desde:2001, capital:'Ceuta',
    web:'https://www.ceuta.es/', consejerias:['Vp · Carlos Rontomé','Hacienda · Mabel Deu'] },
  { id:'melilla',   nombre:'Ciudad Autónoma de Melilla',presidente:'Juan José Imbroda',  partido:'PP', bloque:'derecha', apoyo:'PP+VOX (rota)',           pob:0.08, presup:0.30, esc:25, escPdte:14, proxElec:'May 2027', desde:2023, capital:'Melilla',
    web:'https://www.melilla.es/', consejerias:['Vp · Miguel Marín','Hacienda · Esther Donoso'] },
]

// ─────────────────────────────────────────────────────────────────────────
// Datos · Diputaciones provinciales (38) + 3 forales vascas + 1 navarra
// ─────────────────────────────────────────────────────────────────────────
const DIPUTACIONES: Diputacion[] = [
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
// Datos · Capitales y grandes ciudades (50+)
// ─────────────────────────────────────────────────────────────────────────
const WEB_CAPITAL: Record<string, string> = {
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

const CAPITALES: Capital[] = ([
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
const INSULARES: Insular[] = [
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

// ─────────────────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────────────────
export default function InstitucionesPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const [tab, setTab] = useState<'ccaa' | 'diputaciones' | 'capitales' | 'insulares'>('ccaa')
  const [filterBloque, setFilterBloque] = useState<SignoBloque | 'Todos'>('Todos')
  const [query, setQuery] = useState('')

  // Totales para el hero
  const totals = useMemo(() => {
    const presupTotal = CCAAS.reduce((s, c) => s + c.presup, 0)
    const ccaaPP = CCAAS.filter(c => c.bloque === 'derecha').length
    const ccaaPSOE = CCAAS.filter(c => c.bloque === 'izquierda').length
    const ccaaTerr = CCAAS.filter(c => c.bloque === 'territorial').length
    return { ccaa: CCAAS.length, dip: DIPUTACIONES.length, capitales: CAPITALES.length, insulares: INSULARES.length, presup: presupTotal, ccaaPP, ccaaPSOE, ccaaTerr }
  }, [])

  return (
    <div style={{ background:'var(--bg)', minHeight:'100vh', fontFamily:'var(--font-text)', color:'#1d1d1f' }}>
      <AppHeader/>
      <main style={{ maxWidth:1500, margin:'0 auto', padding:'24px 28px 80px' }}>

        {/* ───── Hero ───── */}
        <section style={{
          background:'linear-gradient(135deg,#7C3AED 0%,#3B0764 100%)',
          borderRadius:18, padding:'28px 36px', marginBottom:18, color:'#fff',
          display:'grid', gridTemplateColumns:'1.5fr 1fr', gap:32, alignItems:'center',
        }}>
          <div>
            <p style={{ fontSize:10.5, fontWeight:700, letterSpacing:'0.14em', opacity:0.7, textTransform:'uppercase', margin:'0 0 8px' }}>
              INTELIGENCIA POLÍTICA · INSTITUCIONES LOCALES Y REGIONALES
            </p>
            <h1 style={{ fontFamily:'var(--font-display)', fontSize:30, fontWeight:700, letterSpacing:'-0.024em', margin:'0 0 6px', lineHeight:1.1 }}>
              17 CCAA, 38 diputaciones <em style={{ fontWeight:300, fontStyle:'italic', color:'rgba(255,255,255,0.7)' }}>y 8 131 municipios</em>
            </h1>
            <p style={{ fontSize:13, opacity:0.7, margin:0, lineHeight:1.5 }}>
              Mapa de poder territorial: Comunidades Autónomas, Diputaciones provinciales y forales, capitales con &gt; 75k habitantes y cabildos / consells insulares.
              Presupuesto agregado autonómico: <strong style={{ color:'#fff' }}>{totals.presup.toFixed(1)} mil M€</strong>.
            </p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
            <HeroKPI label="CCAA" value={String(totals.ccaa)}/>
            <HeroKPI label="Diput." value={String(totals.dip)}/>
            <HeroKPI label="Capitales" value={String(totals.capitales)}/>
            <HeroKPI label="Insul." value={String(totals.insulares)}/>
          </div>
        </section>

        {/* ───── Mapa de poder político (CCAA) ───── */}
        <section style={{
          background:'#fff', border:'1px solid #ECECEF', borderRadius:14,
          padding:'18px 22px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)', marginBottom:14,
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12, flexWrap:'wrap', gap:8 }}>
            <div>
              <h3 style={{ margin:'0 0 3px', fontFamily:'var(--font-display)', fontSize:15, fontWeight:600, letterSpacing:'-0.013em' }}>Mapa de poder autonómico</h3>
              <p style={{ margin:0, fontSize:11.5, color:'#6e6e73' }}>{totals.ccaaPP} CCAA centro-derecha · {totals.ccaaPSOE} centro-izquierda · {totals.ccaaTerr} territorial</p>
            </div>
            <div style={{ display:'flex', gap:14, fontSize:11, color:'#3a3a3d' }}>
              <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}><span style={{ width:11, height:11, borderRadius:3, background:'#1F4E8C', display:'inline-block' }}/>Centro-derecha</span>
              <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}><span style={{ width:11, height:11, borderRadius:3, background:'#E1322D', display:'inline-block' }}/>Centro-izquierda</span>
              <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}><span style={{ width:11, height:11, borderRadius:3, background:'#7C3AED', display:'inline-block' }}/>Territorial</span>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(78px,1fr))', gap:5 }}>
            {CCAAS.map(c => (
              <div key={c.id} title={`${c.nombre} · ${c.presidente} (${c.partido})`} style={{
                background: BLOQUE_META[c.bloque].color, color:'#fff',
                borderRadius:8, padding:'10px 6px', textAlign:'center',
                cursor:'help', minHeight:54,
                display:'flex', flexDirection:'column', justifyContent:'center',
              }}>
                <div style={{ fontSize:10, fontWeight:700, lineHeight:1.2, opacity:0.95 }}>{c.nombre.length > 14 ? c.nombre.slice(0,13)+'…' : c.nombre}</div>
                <div style={{ fontSize:9, fontWeight:800, letterSpacing:'0.04em', marginTop:3, opacity:0.85 }}>{c.partido}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ───── Tabs ───── */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10, marginBottom:14 }}>
          <div style={{ display:'inline-flex', background:'#F5F5F7', borderRadius:999, padding:3, flexWrap:'wrap' }}>
            {([
              { k:'ccaa',         label:'Comunidades Autónomas', count: totals.ccaa },
              { k:'diputaciones', label:'Diputaciones',          count: totals.dip },
              { k:'capitales',    label:'Capitales y ciudades',  count: totals.capitales },
              { k:'insulares',    label:'Cabildos / Consells',   count: totals.insulares },
            ] as const).map(t => {
              const active = tab === t.k
              return (
                <button key={t.k} onClick={() => setTab(t.k)} style={{
                  background: active ? '#fff' : 'transparent',
                  color: active ? '#1d1d1f' : '#6e6e73',
                  border:'none', borderRadius:999, padding:'7px 14px',
                  fontSize:12, fontWeight: active ? 700 : 500, cursor:'pointer',
                  fontFamily:'inherit', boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                }}>
                  {t.label} <span style={{ marginLeft:5, color: active ? '#7C3AED' : '#6e6e73', fontWeight:700, fontSize:10.5 }}>{t.count}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Filtro común para listas */}
        <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap', marginBottom:14 }}>
          <input
            type="text" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Buscar institución, presidente o partido…"
            style={{
              flex:'1 1 280px', maxWidth:380,
              padding:'9px 14px', borderRadius:10,
              border:'1px solid #ECECEF', background:'#fff',
              fontSize:13, fontFamily:'inherit', outline:'none', color:'#1d1d1f',
            }}
          />
          <span style={{ fontSize:11, color:'#6e6e73', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase' }}>Bloque:</span>
          <div style={{ display:'inline-flex', background:'#F5F5F7', borderRadius:999, padding:3 }}>
            {(['Todos','derecha','izquierda','territorial'] as const).map(b => {
              const active = filterBloque === b
              const col = b === 'Todos' ? '#1d1d1f' : BLOQUE_META[b].color
              const lbl = b === 'Todos' ? 'Todos' : BLOQUE_META[b].label
              return (
                <button key={b} onClick={() => setFilterBloque(b)} style={{
                  background: active ? '#fff' : 'transparent',
                  color: active ? col : '#6e6e73',
                  border:'none', borderRadius:999, padding:'4px 10px',
                  fontSize:11, fontWeight: active ? 700 : 500, cursor:'pointer',
                  fontFamily:'inherit', boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                }}>{lbl}</button>
              )
            })}
          </div>
        </div>

        {/* ───── Tab CCAA ───── */}
        {tab === 'ccaa' && <TabCCAA query={query} bloque={filterBloque}/>}

        {/* ───── Tab Diputaciones ───── */}
        {tab === 'diputaciones' && <TabDiputaciones query={query} bloque={filterBloque}/>}

        {/* ───── Tab Capitales ───── */}
        {tab === 'capitales' && <TabCapitales query={query} bloque={filterBloque}/>}

        {/* ───── Tab Insulares ───── */}
        {tab === 'insulares' && <TabInsulares query={query} bloque={filterBloque}/>}

      </main>
      <footer style={{ borderTop:'1px solid var(--hairline)', padding:'18px 28px', textAlign:'center', color:'var(--ink-4)', fontSize:11.5 }}>
        Instituciones Locales y Regionales · Politeia Analítica · {new Date().getFullYear()}
      </footer>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Sub-tabs
// ─────────────────────────────────────────────────────────────────────────
function TabCCAA({ query, bloque }: { query: string, bloque: SignoBloque | 'Todos' }) {
  const q = query.trim().toLowerCase()
  const list = CCAAS.filter(c => bloque === 'Todos' || c.bloque === bloque)
                    .filter(c => !q || c.nombre.toLowerCase().includes(q) || c.presidente.toLowerCase().includes(q) || c.partido.toLowerCase().includes(q))
  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(360px,1fr))', gap:12 }}>
      {list.map(c => {
        const col = COLOR[c.partido] || '#6e6e73'
        const pctEsc = (c.escPdte / c.esc) * 100
        return (
          <article key={c.id} style={{
            background:'#fff', border:'1px solid #ECECEF', borderRadius:14,
            boxShadow:'0 1px 3px rgba(0,0,0,0.04)', overflow:'hidden',
          }}>
            <header style={{
              display:'grid', gridTemplateColumns:'1fr auto', gap:10, alignItems:'center',
              padding:'14px 16px',
              background:`linear-gradient(135deg, ${col}10, ${col}03)`,
              borderBottom:`2px solid ${col}`,
            }}>
              <div style={{ minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                  <span style={{
                    fontSize:9, fontWeight:800, letterSpacing:'0.08em',
                    padding:'2px 7px', borderRadius:4,
                    background:col, color:'#fff',
                  }}>{c.partido}</span>
                  <span style={{ fontSize:9.5, color:'#6e6e73', fontWeight:700, letterSpacing:'0.06em' }}>· DESDE {c.desde} · CAP. {c.capital}</span>
                </div>
                <h3 style={{ margin:'0 0 2px', fontFamily:'var(--font-display)', fontSize:17, fontWeight:700, letterSpacing:'-0.014em', color:'#1d1d1f' }}>{c.nombre}</h3>
                <p style={{ margin:0, fontSize:11.5, color:'#3a3a3d', fontWeight:600 }}>{c.presidente}</p>
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, color:col, letterSpacing:'-0.018em', lineHeight:1 }}>{c.escPdte}<span style={{ fontSize:11, color:'#6e6e73', fontWeight:600 }}>/{c.esc}</span></div>
                <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.06em', color:'#6e6e73', textTransform:'uppercase', marginTop:2 }}>esc. del Pdte.</div>
              </div>
            </header>
            <div style={{ padding:'14px 16px' }}>
              <div style={{
                background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:9,
                padding:'8px 11px', marginBottom:10,
              }}>
                <div style={{ fontSize:9, fontWeight:700, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:3 }}>Apoyo parlamentario</div>
                <div style={{ fontSize:12, color:'#1d1d1f', fontWeight:600, lineHeight:1.4 }}>{c.apoyo}</div>
              </div>
              <div style={{ marginBottom:10 }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                  <span style={{ fontSize:9, fontWeight:700, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase' }}>% escaños propios</span>
                  <span style={{ fontFamily:'var(--font-display)', fontSize:11, fontWeight:700, color:col }}>{pctEsc.toFixed(1)}%</span>
                </div>
                <div style={{ height:5, background:'#F5F5F7', borderRadius:3, overflow:'hidden' }}>
                  <div style={{ width:`${pctEsc}%`, height:'100%', background:col, borderRadius:3 }}/>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6, marginBottom:10 }}>
                <Mini label="Población"  value={`${c.pob.toFixed(1)}M`}            color="#3a3a3d"/>
                <Mini label="Presup."     value={`${c.presup.toFixed(1)} mM€`}     color="#16A34A"/>
                <Mini label="Próx. elec." value={c.proxElec}                       color="#5B21B6"/>
              </div>
              {/* Consejerías clave */}
              <div style={{ marginBottom:10 }}>
                <div style={{ fontSize:8.5, fontWeight:800, letterSpacing:'0.08em', color:'#6e6e73', textTransform:'uppercase', marginBottom:5 }}>Consejerías clave</div>
                <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                  {c.consejerias.slice(0, 4).map(s => (
                    <div key={s} style={{ fontSize:10.5, color:'#3a3a3d', lineHeight:1.4, display:'flex', gap:5 }}>
                      <span style={{ color:col, fontWeight:700, flexShrink:0 }}>·</span>{s}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Enlace a la web oficial */}
            <WebLink web={c.web} color={col}/>
          </article>
        )
      })}
      {list.length === 0 && <EmptyState/>}
    </div>
  )
}

function TabDiputaciones({ query, bloque }: { query: string, bloque: SignoBloque | 'Todos' }) {
  const q = query.trim().toLowerCase()
  const list = DIPUTACIONES.filter(d => bloque === 'Todos' || d.bloque === bloque)
                            .filter(d => !q || d.prov.toLowerCase().includes(q) || d.presidente.toLowerCase().includes(q) || d.partido.toLowerCase().includes(q) || d.ccaa.toLowerCase().includes(q))
                            .sort((a,b) => b.pob - a.pob)
  return (
    <div style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, boxShadow:'0 1px 3px rgba(0,0,0,0.04)', overflow:'hidden' }}>
      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, minWidth:780 }}>
          <thead>
            <tr style={{ background:'#FAFAFB', borderBottom:'2px solid #ECECEF' }}>
              {[
                { l:'Provincia', a:'left' },
                { l:'CCAA',      a:'left' },
                { l:'Presidente',a:'left' },
                { l:'Partido',   a:'left' },
                { l:'Bloque',    a:'left' },
                { l:'Régimen',   a:'left' },
                { l:'Población', a:'right' },
                { l:'Web',       a:'center' },
              ].map(h => (
                <th key={h.l} style={{ textAlign:h.a as 'left'|'right'|'center', padding:'10px 12px', fontSize:9.5, fontWeight:700, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase' }}>{h.l}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map((d, i) => {
              const col = COLOR[d.partido] || '#6e6e73'
              return (
                <tr key={`${d.prov}-${i}`} style={{ borderBottom:'1px solid #ECECEF', background: i%2 ? '#fafafa' : '#fff' }}>
                  <td style={{ padding:'9px 12px', fontWeight:600, color:'#1d1d1f' }}>{d.prov}</td>
                  <td style={{ padding:'9px 12px', color:'#6e6e73', fontSize:11 }}>{d.ccaa}</td>
                  <td style={{ padding:'9px 12px', fontWeight:600, color:'#1d1d1f' }}>{d.presidente}</td>
                  <td style={{ padding:'9px 12px' }}>
                    <span style={{
                      fontSize:9.5, fontWeight:800, letterSpacing:'0.06em',
                      padding:'2px 7px', borderRadius:4,
                      background:col, color:'#fff',
                    }}>{d.partido}</span>
                  </td>
                  <td style={{ padding:'9px 12px' }}>
                    <span style={{
                      fontSize:9, fontWeight:700, letterSpacing:'0.06em',
                      padding:'2px 7px', borderRadius:999,
                      background:`${BLOQUE_META[d.bloque].color}15`,
                      color:BLOQUE_META[d.bloque].color,
                      border:`1px solid ${BLOQUE_META[d.bloque].color}40`,
                    }}>{BLOQUE_META[d.bloque].label}</span>
                  </td>
                  <td style={{ padding:'9px 12px', fontSize:11, color: d.forall ? '#5B21B6' : '#6e6e73', fontWeight: d.forall ? 700 : 500 }}>
                    {d.forall ? 'FORAL' : 'Ordinaria'}
                  </td>
                  <td style={{ padding:'9px 12px', textAlign:'right', fontFamily:'var(--font-display)', fontWeight:600, color:'#1d1d1f' }}>
                    {d.pob.toLocaleString('es-ES')}<span style={{ fontSize:9, color:'#86868b', marginLeft:2 }}>k</span>
                  </td>
                  <td style={{ padding:'9px 12px', textAlign:'center' }}>
                    <WebIcon web={d.web} color={col}/>
                  </td>
                </tr>
              )
            })}
            {list.length === 0 && (
              <tr><td colSpan={8} style={{ padding:30, textAlign:'center', color:'#6e6e73', fontSize:13 }}>Sin coincidencias.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TabCapitales({ query, bloque }: { query: string, bloque: SignoBloque | 'Todos' }) {
  const q = query.trim().toLowerCase()
  const list = CAPITALES.filter(c => bloque === 'Todos' || c.bloque === bloque)
                         .filter(c => !q || c.ciudad.toLowerCase().includes(q) || c.alcalde.toLowerCase().includes(q) || c.partido.toLowerCase().includes(q) || c.prov.toLowerCase().includes(q))
                         .sort((a,b) => b.pob - a.pob)
  return (
    <div style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, boxShadow:'0 1px 3px rgba(0,0,0,0.04)', overflow:'hidden' }}>
      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, minWidth:780 }}>
          <thead>
            <tr style={{ background:'#FAFAFB', borderBottom:'2px solid #ECECEF' }}>
              {[
                { l:'Ciudad',    a:'left' },
                { l:'Provincia', a:'left' },
                { l:'Alcalde/sa',a:'left' },
                { l:'Partido',   a:'left' },
                { l:'Bloque',    a:'left' },
                { l:'Desde',     a:'right' },
                { l:'Población', a:'right' },
                { l:'Web',       a:'center' },
              ].map(h => (
                <th key={h.l} style={{ textAlign:h.a as 'left'|'right'|'center', padding:'10px 12px', fontSize:9.5, fontWeight:700, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase' }}>{h.l}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map((c, i) => {
              const col = COLOR[c.partido] || '#6e6e73'
              return (
                <tr key={c.id} style={{ borderBottom:'1px solid #ECECEF', background: i%2 ? '#fafafa' : '#fff' }}>
                  <td style={{ padding:'9px 12px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontFamily:'var(--font-display)', fontSize:13, fontWeight:700, color:'#1d1d1f', minWidth:24 }}>{i+1}</span>
                      <span style={{ width:3, height:18, background:col, borderRadius:1 }}/>
                      <span style={{ fontWeight:600, color:'#1d1d1f' }}>{c.ciudad}</span>
                    </div>
                  </td>
                  <td style={{ padding:'9px 12px', color:'#6e6e73', fontSize:11 }}>{c.prov}</td>
                  <td style={{ padding:'9px 12px', fontWeight:600, color:'#1d1d1f' }}>{c.alcalde}</td>
                  <td style={{ padding:'9px 12px' }}>
                    <span style={{
                      fontSize:9.5, fontWeight:800, letterSpacing:'0.06em',
                      padding:'2px 7px', borderRadius:4,
                      background:col, color:'#fff',
                    }}>{c.partido}</span>
                  </td>
                  <td style={{ padding:'9px 12px' }}>
                    <span style={{
                      fontSize:9, fontWeight:700, letterSpacing:'0.06em',
                      padding:'2px 7px', borderRadius:999,
                      background:`${BLOQUE_META[c.bloque].color}15`,
                      color:BLOQUE_META[c.bloque].color,
                      border:`1px solid ${BLOQUE_META[c.bloque].color}40`,
                    }}>{BLOQUE_META[c.bloque].label}</span>
                  </td>
                  <td style={{ padding:'9px 12px', textAlign:'right', fontFamily:'var(--font-display)', color:'#3a3a3d' }}>{c.desde}</td>
                  <td style={{ padding:'9px 12px', textAlign:'right', fontFamily:'var(--font-display)', fontWeight:600, color:'#1d1d1f' }}>
                    {c.pob.toLocaleString('es-ES')}<span style={{ fontSize:9, color:'#86868b', marginLeft:2 }}>k</span>
                  </td>
                  <td style={{ padding:'9px 12px', textAlign:'center' }}>
                    <WebIcon web={c.web} color={col}/>
                  </td>
                </tr>
              )
            })}
            {list.length === 0 && (
              <tr><td colSpan={8} style={{ padding:30, textAlign:'center', color:'#6e6e73', fontSize:13 }}>Sin coincidencias.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TabInsulares({ query, bloque }: { query: string, bloque: SignoBloque | 'Todos' }) {
  const q = query.trim().toLowerCase()
  const list = INSULARES.filter(i => bloque === 'Todos' || i.bloque === bloque)
                         .filter(i => !q || i.nombre.toLowerCase().includes(q) || i.presidente.toLowerCase().includes(q) || i.partido.toLowerCase().includes(q))
  const canarias = list.filter(i => i.archipielago === 'Canarias')
  const baleares = list.filter(i => i.archipielago === 'Baleares')

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
      {canarias.length > 0 && (
        <div>
          <h3 style={{ fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, letterSpacing:'-0.012em', margin:'0 0 8px', color:'#1d1d1f' }}>
            Cabildos canarios <span style={{ color:'#6e6e73', fontWeight:500, fontSize:11 }}>· {canarias.length} cabildos · 2.2M habitantes</span>
          </h3>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:10 }}>
            {canarias.map(i => <InsularCard key={i.id} ins={i}/>)}
          </div>
        </div>
      )}
      {baleares.length > 0 && (
        <div>
          <h3 style={{ fontFamily:'var(--font-display)', fontSize:14, fontWeight:600, letterSpacing:'-0.012em', margin:'0 0 8px', color:'#1d1d1f' }}>
            Consells insulars baleàrics <span style={{ color:'#6e6e73', fontWeight:500, fontSize:11 }}>· {baleares.length} consells · 1.2M habitantes</span>
          </h3>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:10 }}>
            {baleares.map(i => <InsularCard key={i.id} ins={i}/>)}
          </div>
        </div>
      )}
      {list.length === 0 && <EmptyState/>}
    </div>
  )
}

function InsularCard({ ins }: { ins: Insular }) {
  const col = COLOR[ins.partido] || '#6e6e73'
  return (
    <article style={{
      background:'#fff', border:'1px solid #ECECEF', borderRadius:12,
      boxShadow:'0 1px 3px rgba(0,0,0,0.04)', overflow:'hidden',
      borderLeft:`3px solid ${col}`,
      display:'flex', flexDirection:'column',
    }}>
      <div style={{
        display:'grid', gridTemplateColumns:'auto 1fr auto', gap:11, alignItems:'center',
        padding:'12px 14px',
      }}>
        <div style={{
          width:42, height:42, borderRadius:'50%', background:col, color:'#fff',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontFamily:'var(--font-display)', fontWeight:800, fontSize:11, flexShrink:0,
        }}>{ins.partido}</div>
        <div style={{ minWidth:0 }}>
          <div style={{ fontFamily:'var(--font-display)', fontSize:14, fontWeight:700, letterSpacing:'-0.012em', color:'#1d1d1f', lineHeight:1.2 }}>{ins.nombre}</div>
          <div style={{ fontSize:11, color:'#3a3a3d', fontWeight:600 }}>{ins.presidente}</div>
        </div>
        <div style={{ textAlign:'right', flexShrink:0 }}>
          <div style={{ fontFamily:'var(--font-display)', fontSize:14, fontWeight:700, color:'#1d1d1f', letterSpacing:'-0.014em', lineHeight:1 }}>
            {ins.pob.toLocaleString('es-ES')}<span style={{ fontSize:9, color:'#86868b', marginLeft:1, fontWeight:600 }}>k hab.</span>
          </div>
          <div style={{ fontSize:9, fontWeight:700, color:BLOQUE_META[ins.bloque].color, letterSpacing:'0.06em', marginTop:2 }}>{BLOQUE_META[ins.bloque].label}</div>
        </div>
      </div>
      <WebLink web={ins.web} color={col} compact/>
    </article>
  )
}

function EmptyState() {
  return (
    <div style={{ padding:30, textAlign:'center', color:'#6e6e73', fontSize:13, background:'#fff', borderRadius:14, border:'1px solid #ECECEF' }}>
      Sin coincidencias.
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────
function HeroKPI({ label, value }: { label:string, value:string }) {
  return (
    <div style={{ textAlign:'center', padding:'10px 6px', borderRadius:10, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.18)' }}>
      <div style={{ fontFamily:'var(--font-display)', fontSize:21, fontWeight:700, lineHeight:1, color:'#fff', letterSpacing:'-0.018em' }}>{value}</div>
      <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', opacity:0.7, marginTop:4, color:'#fff' }}>{label}</div>
    </div>
  )
}

function Mini({ label, value, color }: { label:string, value:string, color:string }) {
  return (
    <div style={{ background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:8, padding:'7px 6px', textAlign:'center' }}>
      <div style={{ fontFamily:'var(--font-display)', fontSize:13, fontWeight:700, color, lineHeight:1, letterSpacing:'-0.012em' }}>{value}</div>
      <div style={{ fontSize:8.5, fontWeight:700, color:'#6e6e73', letterSpacing:'0.04em', textTransform:'uppercase', marginTop:3 }}>{label}</div>
    </div>
  )
}

// Enlace inferior a la web oficial (banda completa)
function WebLink({ web, color, compact = false }: { web: string, color: string, compact?: boolean }) {
  if (!web) return null
  const dominio = web.replace(/^https?:\/\//, '').replace(/\/$/, '')
  return (
    <a href={web} target="_blank" rel="noopener noreferrer" style={{
      display:'flex', alignItems:'center', justifyContent:'space-between', gap:8,
      padding: compact ? '8px 14px' : '10px 16px',
      borderTop:'1px solid #ECECEF',
      background:'#FAFAFB', textDecoration:'none',
      fontSize: compact ? 10.5 : 11, color:'#1d1d1f', fontWeight:600, fontFamily:'inherit',
      transition:'background 160ms',
    }}
    onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = `${color}10` }}
    onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = '#FAFAFB' }}>
      <span style={{ display:'inline-flex', alignItems:'center', gap:6, minWidth:0 }}>
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none" style={{ flexShrink:0 }}>
          <circle cx="5.5" cy="5.5" r="4.5" stroke={color} strokeWidth="1.2"/>
          <path d="M1 5.5h9M5.5 1c1.5 1.5 1.5 7.5 0 9M5.5 1c-1.5 1.5-1.5 7.5 0 9" stroke={color} strokeWidth="1" fill="none"/>
        </svg>
        <span style={{ color, fontFamily:'var(--font-display)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{dominio}</span>
      </span>
      <span style={{ color, display:'inline-flex', alignItems:'center', gap:3 }}>
        Visitar
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2 2h6v6M2 8L8 2" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
    </a>
  )
}

// Icono pequeño para tablas (un solo botón redondo con flecha de salida)
function WebIcon({ web, color }: { web: string, color: string }) {
  if (!web) return <span style={{ color:'#c5c5cb', fontSize:11 }}>—</span>
  return (
    <a href={web} target="_blank" rel="noopener noreferrer" title={web.replace(/^https?:\/\//, '').replace(/\/$/, '')} style={{
      display:'inline-flex', alignItems:'center', justifyContent:'center',
      width:24, height:24, borderRadius:6,
      background:`${color}12`, border:`1px solid ${color}40`,
      color, textDecoration:'none', transition:'all 160ms',
    }}
    onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = color; (e.currentTarget as HTMLAnchorElement).style.color = '#fff' }}
    onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = `${color}12`; (e.currentTarget as HTMLAnchorElement).style.color = color }}>
      <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
        <path d="M3 3h5v5M3 8L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </a>
  )
}
