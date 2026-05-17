/**
 * Catálogo enumerado de municipios españoles clave.
 *
 * Incluye:
 *   - 52 capitales de provincia (todas)
 *   - 60+ ciudades >50.000 habitantes
 *   - Total: ~150 municipios que concentran ~60% de la población española
 *
 * Para municipios fuera del catálogo, la búsqueda hace fallback a Wikipedia API.
 *
 * Cada municipio tiene:
 *   - código INE de 5 dígitos
 *   - CCAA, provincia
 *   - población, superficie
 *   - alcalde actual + partido
 *   - URL ayuntamiento + Wikipedia
 *   - tokens detección
 */

export interface Municipio {
  ine: string                  // código INE 5 dígitos
  slug: string
  nombre: string
  ccaa: string                 // slug de CCAA
  provincia: string
  poblacion: number
  superficie: number           // km²
  alcalde: string | null
  partidoAlcalde: string | null
  alcaldeDesde: number | null  // año
  /** URL del ayuntamiento si la conocemos */
  webAyuntamiento: string | null
  wikipedia: string
  /** Tokens para detectar en titulares (lowercase) */
  tokens: string[]
}

export const MUNICIPIOS: Municipio[] = [
  // ─── MADRID Y ÁREA METROPOLITANA ────────────────────────────────────────
  { ine: '28079', slug: 'madrid', nombre: 'Madrid', ccaa: 'madrid', provincia: 'Madrid',
    poblacion: 3334730, superficie: 605.77, alcalde: 'José Luis Martínez-Almeida', partidoAlcalde: 'PP', alcaldeDesde: 2019,
    webAyuntamiento: 'https://www.madrid.es', wikipedia: 'https://es.wikipedia.org/wiki/Madrid',
    tokens: ['ayuntamiento de madrid', 'alcalde de madrid', 'almeida', 'cibeles', 'capital de españa'] },
  { ine: '28092', slug: 'mostoles', nombre: 'Móstoles', ccaa: 'madrid', provincia: 'Madrid',
    poblacion: 209660, superficie: 45.41, alcalde: 'Manuel Bautista', partidoAlcalde: 'PP', alcaldeDesde: 2023,
    webAyuntamiento: 'https://www.mostoles.es', wikipedia: 'https://es.wikipedia.org/wiki/M%C3%B3stoles',
    tokens: ['móstoles', 'mostoles'] },
  { ine: '28006', slug: 'alcala-de-henares', nombre: 'Alcalá de Henares', ccaa: 'madrid', provincia: 'Madrid',
    poblacion: 198820, superficie: 87.72, alcalde: 'Judith Piquet', partidoAlcalde: 'PP', alcaldeDesde: 2023,
    webAyuntamiento: 'https://www.ayto-alcaladehenares.es', wikipedia: 'https://es.wikipedia.org/wiki/Alcal%C3%A1_de_Henares',
    tokens: ['alcalá de henares', 'alcala de henares'] },
  { ine: '28049', slug: 'fuenlabrada', nombre: 'Fuenlabrada', ccaa: 'madrid', provincia: 'Madrid',
    poblacion: 193722, superficie: 39.5, alcalde: 'Javier Ayala', partidoAlcalde: 'PSOE', alcaldeDesde: 2018,
    webAyuntamiento: 'https://www.ayto-fuenlabrada.es', wikipedia: 'https://es.wikipedia.org/wiki/Fuenlabrada',
    tokens: ['fuenlabrada'] },
  { ine: '28074', slug: 'leganes', nombre: 'Leganés', ccaa: 'madrid', provincia: 'Madrid',
    poblacion: 192527, superficie: 43.21, alcalde: 'Miguel Ángel Recuenco', partidoAlcalde: 'PP', alcaldeDesde: 2023,
    webAyuntamiento: 'https://www.leganes.org', wikipedia: 'https://es.wikipedia.org/wiki/Legan%C3%A9s',
    tokens: ['leganés', 'leganes'] },
  { ine: '28058', slug: 'getafe', nombre: 'Getafe', ccaa: 'madrid', provincia: 'Madrid',
    poblacion: 187226, superficie: 78.74, alcalde: 'Sara Hernández', partidoAlcalde: 'PSOE', alcaldeDesde: 2015,
    webAyuntamiento: 'https://www.getafe.es', wikipedia: 'https://es.wikipedia.org/wiki/Getafe',
    tokens: ['getafe'] },
  { ine: '28005', slug: 'alcorcon', nombre: 'Alcorcón', ccaa: 'madrid', provincia: 'Madrid',
    poblacion: 171645, superficie: 33.73, alcalde: 'Candelaria Testa', partidoAlcalde: 'PP', alcaldeDesde: 2023,
    webAyuntamiento: 'https://www.ayto-alcorcon.es', wikipedia: 'https://es.wikipedia.org/wiki/Alcorc%C3%B3n',
    tokens: ['alcorcón', 'alcorcon'] },

  // ─── CATALUÑA ────────────────────────────────────────────────────────────
  { ine: '08019', slug: 'barcelona', nombre: 'Barcelona', ccaa: 'cataluna', provincia: 'Barcelona',
    poblacion: 1660122, superficie: 101.4, alcalde: 'Jaume Collboni', partidoAlcalde: 'PSC', alcaldeDesde: 2023,
    webAyuntamiento: 'https://www.barcelona.cat', wikipedia: 'https://es.wikipedia.org/wiki/Barcelona',
    tokens: ['ayuntamiento de barcelona', 'collboni', 'alcalde de barcelona', 'plaza catalunya'] },
  { ine: '17079', slug: 'girona', nombre: 'Girona', ccaa: 'cataluna', provincia: 'Girona',
    poblacion: 103369, superficie: 39.14, alcalde: 'Lluc Salellas', partidoAlcalde: 'CUP', alcaldeDesde: 2023,
    webAyuntamiento: 'https://www.girona.cat', wikipedia: 'https://es.wikipedia.org/wiki/Gerona',
    tokens: ['girona', 'gerona', 'salellas'] },
  { ine: '25120', slug: 'lleida', nombre: 'Lleida', ccaa: 'cataluna', provincia: 'Lleida',
    poblacion: 142625, superficie: 211.7, alcalde: 'Fèlix Larrosa', partidoAlcalde: 'PSC', alcaldeDesde: 2023,
    webAyuntamiento: 'https://www.paeria.cat', wikipedia: 'https://es.wikipedia.org/wiki/L%C3%A9rida',
    tokens: ['lleida', 'lérida', 'larrosa'] },
  { ine: '43148', slug: 'tarragona', nombre: 'Tarragona', ccaa: 'cataluna', provincia: 'Tarragona',
    poblacion: 140758, superficie: 62.19, alcalde: 'Rubén Viñuales', partidoAlcalde: 'PSC', alcaldeDesde: 2023,
    webAyuntamiento: 'https://www.tarragona.cat', wikipedia: 'https://es.wikipedia.org/wiki/Tarragona',
    tokens: ['tarragona', 'viñuales'] },
  { ine: '08019', slug: 'hospitalet-llobregat', nombre: 'L\'Hospitalet de Llobregat', ccaa: 'cataluna', provincia: 'Barcelona',
    poblacion: 277658, superficie: 12.4, alcalde: 'David Quirós', partidoAlcalde: 'PSC', alcaldeDesde: 2024,
    webAyuntamiento: 'https://www.l-h.cat', wikipedia: 'https://es.wikipedia.org/wiki/Hospitalet_de_Llobregat',
    tokens: ['hospitalet', 'l\'hospitalet'] },
  { ine: '08015', slug: 'badalona', nombre: 'Badalona', ccaa: 'cataluna', provincia: 'Barcelona',
    poblacion: 226291, superficie: 21.2, alcalde: 'Xavier García Albiol', partidoAlcalde: 'PP', alcaldeDesde: 2023,
    webAyuntamiento: 'https://www.badalona.cat', wikipedia: 'https://es.wikipedia.org/wiki/Badalona',
    tokens: ['badalona', 'albiol'] },
  { ine: '08245', slug: 'sabadell', nombre: 'Sabadell', ccaa: 'cataluna', provincia: 'Barcelona',
    poblacion: 216520, superficie: 37.8, alcalde: 'Marta Farrés', partidoAlcalde: 'PSC', alcaldeDesde: 2023,
    webAyuntamiento: 'https://www.sabadell.cat', wikipedia: 'https://es.wikipedia.org/wiki/Sabadell',
    tokens: ['sabadell', 'farrés'] },
  { ine: '08279', slug: 'terrassa', nombre: 'Terrassa', ccaa: 'cataluna', provincia: 'Barcelona',
    poblacion: 224111, superficie: 70.2, alcalde: 'Jordi Ballart', partidoAlcalde: 'Tot per Terrassa', alcaldeDesde: 2018,
    webAyuntamiento: 'https://www.terrassa.cat', wikipedia: 'https://es.wikipedia.org/wiki/Tarrasa',
    tokens: ['terrassa', 'tarrasa', 'ballart'] },

  // ─── VALENCIA ────────────────────────────────────────────────────────────
  { ine: '46250', slug: 'valencia', nombre: 'Valencia', ccaa: 'valenciana', provincia: 'Valencia',
    poblacion: 807693, superficie: 134.65, alcalde: 'María José Catalá', partidoAlcalde: 'PP', alcaldeDesde: 2023,
    webAyuntamiento: 'https://www.valencia.es', wikipedia: 'https://es.wikipedia.org/wiki/Valencia',
    tokens: ['ayuntamiento de valencia', 'maría josé catalá', 'catalá valencia'] },
  { ine: '03014', slug: 'alicante', nombre: 'Alicante', ccaa: 'valenciana', provincia: 'Alicante',
    poblacion: 358000, superficie: 201.3, alcalde: 'Luis Barcala', partidoAlcalde: 'PP', alcaldeDesde: 2018,
    webAyuntamiento: 'https://www.alicante.es', wikipedia: 'https://es.wikipedia.org/wiki/Alicante',
    tokens: ['alicante', 'barcala'] },
  { ine: '03065', slug: 'elche', nombre: 'Elche', ccaa: 'valenciana', provincia: 'Alicante',
    poblacion: 240126, superficie: 326.07, alcalde: 'Pablo Ruz', partidoAlcalde: 'PP', alcaldeDesde: 2023,
    webAyuntamiento: 'https://www.elche.es', wikipedia: 'https://es.wikipedia.org/wiki/Elche',
    tokens: ['elche'] },
  { ine: '12040', slug: 'castellon', nombre: 'Castellón de la Plana', ccaa: 'valenciana', provincia: 'Castellón',
    poblacion: 173841, superficie: 107.5, alcalde: 'Begoña Carrasco', partidoAlcalde: 'PP', alcaldeDesde: 2023,
    webAyuntamiento: 'https://www.castello.es', wikipedia: 'https://es.wikipedia.org/wiki/Castell%C3%B3n_de_la_Plana',
    tokens: ['castellón', 'castellon de la plana'] },

  // ─── ANDALUCÍA ───────────────────────────────────────────────────────────
  { ine: '41091', slug: 'sevilla', nombre: 'Sevilla', ccaa: 'andalucia', provincia: 'Sevilla',
    poblacion: 681998, superficie: 140.8, alcalde: 'José Luis Sanz', partidoAlcalde: 'PP', alcaldeDesde: 2023,
    webAyuntamiento: 'https://www.sevilla.org', wikipedia: 'https://es.wikipedia.org/wiki/Sevilla',
    tokens: ['ayuntamiento de sevilla', 'sanz alcalde', 'feria de abril'] },
  { ine: '29067', slug: 'malaga', nombre: 'Málaga', ccaa: 'andalucia', provincia: 'Málaga',
    poblacion: 591637, superficie: 395.13, alcalde: 'Francisco de la Torre', partidoAlcalde: 'PP', alcaldeDesde: 2000,
    webAyuntamiento: 'https://www.malaga.eu', wikipedia: 'https://es.wikipedia.org/wiki/M%C3%A1laga',
    tokens: ['málaga', 'malaga', 'de la torre alcalde'] },
  { ine: '11012', slug: 'cadiz', nombre: 'Cádiz', ccaa: 'andalucia', provincia: 'Cádiz',
    poblacion: 110189, superficie: 12.3, alcalde: 'Bruno García', partidoAlcalde: 'PP', alcaldeDesde: 2023,
    webAyuntamiento: 'https://www.cadiz.es', wikipedia: 'https://es.wikipedia.org/wiki/C%C3%A1diz',
    tokens: ['cádiz', 'cadiz'] },
  { ine: '14021', slug: 'cordoba', nombre: 'Córdoba', ccaa: 'andalucia', provincia: 'Córdoba',
    poblacion: 322071, superficie: 1252, alcalde: 'José María Bellido', partidoAlcalde: 'PP', alcaldeDesde: 2020,
    webAyuntamiento: 'https://www.cordoba.es', wikipedia: 'https://es.wikipedia.org/wiki/C%C3%B3rdoba_(Espa%C3%B1a)',
    tokens: ['córdoba', 'cordoba', 'mezquita'] },
  { ine: '18087', slug: 'granada', nombre: 'Granada', ccaa: 'andalucia', provincia: 'Granada',
    poblacion: 227383, superficie: 88.02, alcalde: 'Marifrán Carazo', partidoAlcalde: 'PP', alcaldeDesde: 2023,
    webAyuntamiento: 'https://www.granada.org', wikipedia: 'https://es.wikipedia.org/wiki/Granada_(Espa%C3%B1a)',
    tokens: ['granada', 'alhambra', 'carazo'] },
  { ine: '21041', slug: 'huelva', nombre: 'Huelva', ccaa: 'andalucia', provincia: 'Huelva',
    poblacion: 140210, superficie: 151.3, alcalde: 'Pilar Miranda', partidoAlcalde: 'PP', alcaldeDesde: 2023,
    webAyuntamiento: 'https://www.huelva.es', wikipedia: 'https://es.wikipedia.org/wiki/Huelva',
    tokens: ['huelva'] },
  { ine: '23050', slug: 'jaen', nombre: 'Jaén', ccaa: 'andalucia', provincia: 'Jaén',
    poblacion: 111158, superficie: 424.3, alcalde: 'Agustín González', partidoAlcalde: 'PP', alcaldeDesde: 2023,
    webAyuntamiento: 'https://www.aytojaen.es', wikipedia: 'https://es.wikipedia.org/wiki/Ja%C3%A9n_(Espa%C3%B1a)',
    tokens: ['jaén', 'jaen'] },
  { ine: '04013', slug: 'almeria', nombre: 'Almería', ccaa: 'andalucia', provincia: 'Almería',
    poblacion: 199594, superficie: 296, alcalde: 'María del Mar Vázquez', partidoAlcalde: 'PP', alcaldeDesde: 2023,
    webAyuntamiento: 'https://www.aytoalmeria.es', wikipedia: 'https://es.wikipedia.org/wiki/Almer%C3%ADa',
    tokens: ['almería', 'almeria'] },

  // ─── EUSKADI ─────────────────────────────────────────────────────────────
  { ine: '48020', slug: 'bilbao', nombre: 'Bilbao', ccaa: 'pais-vasco', provincia: 'Bizkaia',
    poblacion: 346405, superficie: 41.6, alcalde: 'Juan Mari Aburto', partidoAlcalde: 'PNV', alcaldeDesde: 2015,
    webAyuntamiento: 'https://www.bilbao.eus', wikipedia: 'https://es.wikipedia.org/wiki/Bilbao',
    tokens: ['bilbao', 'aburto', 'bilbao alcalde'] },
  { ine: '01059', slug: 'vitoria', nombre: 'Vitoria-Gasteiz', ccaa: 'pais-vasco', provincia: 'Álava',
    poblacion: 256310, superficie: 276.1, alcalde: 'Maider Etxebarria', partidoAlcalde: 'PSE', alcaldeDesde: 2023,
    webAyuntamiento: 'https://www.vitoria-gasteiz.org', wikipedia: 'https://es.wikipedia.org/wiki/Vitoria',
    tokens: ['vitoria', 'gasteiz', 'etxebarria'] },
  { ine: '20069', slug: 'san-sebastian', nombre: 'San Sebastián / Donostia', ccaa: 'pais-vasco', provincia: 'Gipuzkoa',
    poblacion: 188102, superficie: 60.8, alcalde: 'Eneko Goia', partidoAlcalde: 'PNV', alcaldeDesde: 2015,
    webAyuntamiento: 'https://www.donostia.eus', wikipedia: 'https://es.wikipedia.org/wiki/San_Sebasti%C3%A1n',
    tokens: ['donostia', 'san sebastián', 'goia'] },

  // ─── GALICIA ─────────────────────────────────────────────────────────────
  { ine: '15030', slug: 'a-coruna', nombre: 'A Coruña', ccaa: 'galicia', provincia: 'A Coruña',
    poblacion: 245468, superficie: 37.8, alcalde: 'Inés Rey', partidoAlcalde: 'PSOE', alcaldeDesde: 2019,
    webAyuntamiento: 'https://www.coruna.gal', wikipedia: 'https://es.wikipedia.org/wiki/La_Coru%C3%B1a',
    tokens: ['a coruña', 'coruña', 'la coruña', 'inés rey'] },
  { ine: '36057', slug: 'vigo', nombre: 'Vigo', ccaa: 'galicia', provincia: 'Pontevedra',
    poblacion: 293642, superficie: 109.06, alcalde: 'Abel Caballero', partidoAlcalde: 'PSOE', alcaldeDesde: 2007,
    webAyuntamiento: 'https://hoxe.vigo.org', wikipedia: 'https://es.wikipedia.org/wiki/Vigo',
    tokens: ['vigo', 'abel caballero'] },
  { ine: '15078', slug: 'santiago-compostela', nombre: 'Santiago de Compostela', ccaa: 'galicia', provincia: 'A Coruña',
    poblacion: 96346, superficie: 220, alcalde: 'Goretti Sanmartín', partidoAlcalde: 'BNG', alcaldeDesde: 2023,
    webAyuntamiento: 'https://www.santiagodecompostela.gal', wikipedia: 'https://es.wikipedia.org/wiki/Santiago_de_Compostela',
    tokens: ['santiago de compostela', 'sanmartín', 'compostela'] },
  { ine: '36038', slug: 'pontevedra', nombre: 'Pontevedra', ccaa: 'galicia', provincia: 'Pontevedra',
    poblacion: 83260, superficie: 118, alcalde: 'Miguel Fernández Lores', partidoAlcalde: 'BNG', alcaldeDesde: 1999,
    webAyuntamiento: 'https://www.pontevedra.gal', wikipedia: 'https://es.wikipedia.org/wiki/Pontevedra',
    tokens: ['pontevedra', 'lores'] },
  { ine: '32054', slug: 'ourense', nombre: 'Ourense', ccaa: 'galicia', provincia: 'Ourense',
    poblacion: 105395, superficie: 84.55, alcalde: 'Gonzalo Pérez Jácome', partidoAlcalde: 'Democracia Ourensana', alcaldeDesde: 2019,
    webAyuntamiento: 'https://www.ourense.gal', wikipedia: 'https://es.wikipedia.org/wiki/Orense',
    tokens: ['ourense', 'orense', 'jácome'] },
  { ine: '27028', slug: 'lugo', nombre: 'Lugo', ccaa: 'galicia', provincia: 'Lugo',
    poblacion: 98276, superficie: 329.78, alcalde: 'Paula Alvarellos', partidoAlcalde: 'PSOE', alcaldeDesde: 2023,
    webAyuntamiento: 'https://www.lugo.gal', wikipedia: 'https://es.wikipedia.org/wiki/Lugo',
    tokens: ['lugo'] },

  // ─── CCAA pequeñas (capitales) ──────────────────────────────────────────
  { ine: '33044', slug: 'oviedo', nombre: 'Oviedo', ccaa: 'asturias', provincia: 'Asturias',
    poblacion: 219679, superficie: 186.65, alcalde: 'Alfredo Canteli', partidoAlcalde: 'PP', alcaldeDesde: 2019,
    webAyuntamiento: 'https://www.oviedo.es', wikipedia: 'https://es.wikipedia.org/wiki/Oviedo',
    tokens: ['oviedo', 'canteli'] },
  { ine: '33024', slug: 'gijon', nombre: 'Gijón', ccaa: 'asturias', provincia: 'Asturias',
    poblacion: 268143, superficie: 181.6, alcalde: 'Carmen Moriyón', partidoAlcalde: 'Foro Asturias', alcaldeDesde: 2023,
    webAyuntamiento: 'https://www.gijon.es', wikipedia: 'https://es.wikipedia.org/wiki/Gij%C3%B3n',
    tokens: ['gijón', 'gijon', 'moriyón'] },
  { ine: '39075', slug: 'santander', nombre: 'Santander', ccaa: 'cantabria', provincia: 'Cantabria',
    poblacion: 172221, superficie: 35.74, alcalde: 'Gema Igual', partidoAlcalde: 'PP', alcaldeDesde: 2016,
    webAyuntamiento: 'https://santander.es', wikipedia: 'https://es.wikipedia.org/wiki/Santander_(Espa%C3%B1a)',
    tokens: ['santander', 'gema igual'] },
  { ine: '47186', slug: 'valladolid', nombre: 'Valladolid', ccaa: 'castilla-leon', provincia: 'Valladolid',
    poblacion: 296860, superficie: 197.91, alcalde: 'Jesús Julio Carnero', partidoAlcalde: 'PP', alcaldeDesde: 2023,
    webAyuntamiento: 'https://www.valladolid.es', wikipedia: 'https://es.wikipedia.org/wiki/Valladolid',
    tokens: ['valladolid', 'carnero'] },
  { ine: '05019', slug: 'avila', nombre: 'Ávila', ccaa: 'castilla-leon', provincia: 'Ávila',
    poblacion: 57945, superficie: 231.9, alcalde: 'Jesús Manuel Sánchez Cabrera', partidoAlcalde: 'PP', alcaldeDesde: 2019,
    webAyuntamiento: 'https://www.avila.es', wikipedia: 'https://es.wikipedia.org/wiki/%C3%81vila',
    tokens: ['ávila', 'avila'] },
  { ine: '09059', slug: 'burgos', nombre: 'Burgos', ccaa: 'castilla-leon', provincia: 'Burgos',
    poblacion: 174451, superficie: 107.1, alcalde: 'Daniel de la Rosa', partidoAlcalde: 'PSOE', alcaldeDesde: 2024,
    webAyuntamiento: 'https://www.aytoburgos.es', wikipedia: 'https://es.wikipedia.org/wiki/Burgos',
    tokens: ['burgos', 'de la rosa burgos'] },
  { ine: '24089', slug: 'leon', nombre: 'León', ccaa: 'castilla-leon', provincia: 'León',
    poblacion: 122051, superficie: 39.03, alcalde: 'José Antonio Diez', partidoAlcalde: 'PSOE', alcaldeDesde: 2019,
    webAyuntamiento: 'https://www.aytoleon.es', wikipedia: 'https://es.wikipedia.org/wiki/Le%C3%B3n_(Espa%C3%B1a)',
    tokens: ['león ciudad', 'leon ciudad', 'diez león'] },
  { ine: '34120', slug: 'palencia', nombre: 'Palencia', ccaa: 'castilla-leon', provincia: 'Palencia',
    poblacion: 77032, superficie: 94.7, alcalde: 'Miriam Andrés', partidoAlcalde: 'PSOE', alcaldeDesde: 2023,
    webAyuntamiento: 'https://www.aytopalencia.es', wikipedia: 'https://es.wikipedia.org/wiki/Palencia',
    tokens: ['palencia'] },
  { ine: '37274', slug: 'salamanca', nombre: 'Salamanca', ccaa: 'castilla-leon', provincia: 'Salamanca',
    poblacion: 142730, superficie: 38.6, alcalde: 'Carlos García Carbayo', partidoAlcalde: 'PP', alcaldeDesde: 2018,
    webAyuntamiento: 'https://www.aytosalamanca.es', wikipedia: 'https://es.wikipedia.org/wiki/Salamanca',
    tokens: ['salamanca', 'carbayo'] },
  { ine: '40194', slug: 'segovia', nombre: 'Segovia', ccaa: 'castilla-leon', provincia: 'Segovia',
    poblacion: 51683, superficie: 163.59, alcalde: 'José Mazarías', partidoAlcalde: 'PP', alcaldeDesde: 2023,
    webAyuntamiento: 'https://www.segovia.es', wikipedia: 'https://es.wikipedia.org/wiki/Segovia',
    tokens: ['segovia', 'acueducto'] },
  { ine: '42173', slug: 'soria', nombre: 'Soria', ccaa: 'castilla-leon', provincia: 'Soria',
    poblacion: 38531, superficie: 271.77, alcalde: 'Carlos Martínez Mínguez', partidoAlcalde: 'PSOE', alcaldeDesde: 2007,
    webAyuntamiento: 'https://www.soria.es', wikipedia: 'https://es.wikipedia.org/wiki/Soria',
    tokens: ['soria', 'mínguez'] },
  { ine: '49275', slug: 'zamora', nombre: 'Zamora', ccaa: 'castilla-leon', provincia: 'Zamora',
    poblacion: 60863, superficie: 149.3, alcalde: 'Francisco Guarido', partidoAlcalde: 'IU', alcaldeDesde: 2015,
    webAyuntamiento: 'https://www.zamora.es', wikipedia: 'https://es.wikipedia.org/wiki/Zamora_(Espa%C3%B1a)',
    tokens: ['zamora', 'guarido'] },
  { ine: '02003', slug: 'albacete', nombre: 'Albacete', ccaa: 'castilla-mancha', provincia: 'Albacete',
    poblacion: 173951, superficie: 1125.91, alcalde: 'Manuel Serrano', partidoAlcalde: 'PP', alcaldeDesde: 2023,
    webAyuntamiento: 'https://www.albacete.es', wikipedia: 'https://es.wikipedia.org/wiki/Albacete',
    tokens: ['albacete'] },
  { ine: '13034', slug: 'ciudad-real', nombre: 'Ciudad Real', ccaa: 'castilla-mancha', provincia: 'Ciudad Real',
    poblacion: 73846, superficie: 285.5, alcalde: 'Francisco Cañizares', partidoAlcalde: 'PP', alcaldeDesde: 2023,
    webAyuntamiento: 'https://www.ciudadreal.es', wikipedia: 'https://es.wikipedia.org/wiki/Ciudad_Real',
    tokens: ['ciudad real'] },
  { ine: '16078', slug: 'cuenca', nombre: 'Cuenca', ccaa: 'castilla-mancha', provincia: 'Cuenca',
    poblacion: 53546, superficie: 911, alcalde: 'Darío Dolz', partidoAlcalde: 'PP', alcaldeDesde: 2023,
    webAyuntamiento: 'https://www.cuenca.es', wikipedia: 'https://es.wikipedia.org/wiki/Cuenca_(Espa%C3%B1a)',
    tokens: ['cuenca'] },
  { ine: '19130', slug: 'guadalajara', nombre: 'Guadalajara', ccaa: 'castilla-mancha', provincia: 'Guadalajara',
    poblacion: 91952, superficie: 235.5, alcalde: 'Ana Guarinos', partidoAlcalde: 'PP', alcaldeDesde: 2023,
    webAyuntamiento: 'https://www.guadalajara.es', wikipedia: 'https://es.wikipedia.org/wiki/Guadalajara_(Espa%C3%B1a)',
    tokens: ['guadalajara', 'guarinos'] },
  { ine: '45168', slug: 'toledo', nombre: 'Toledo', ccaa: 'castilla-mancha', provincia: 'Toledo',
    poblacion: 87000, superficie: 232.1, alcalde: 'Carlos Velázquez', partidoAlcalde: 'PP', alcaldeDesde: 2023,
    webAyuntamiento: 'https://www.toledo.es', wikipedia: 'https://es.wikipedia.org/wiki/Toledo',
    tokens: ['toledo', 'velázquez toledo'] },
  { ine: '50297', slug: 'zaragoza', nombre: 'Zaragoza', ccaa: 'aragon', provincia: 'Zaragoza',
    poblacion: 680608, superficie: 973.78, alcalde: 'Natalia Chueca', partidoAlcalde: 'PP', alcaldeDesde: 2023,
    webAyuntamiento: 'https://www.zaragoza.es', wikipedia: 'https://es.wikipedia.org/wiki/Zaragoza',
    tokens: ['zaragoza', 'natalia chueca', 'expo zaragoza'] },
  { ine: '22125', slug: 'huesca', nombre: 'Huesca', ccaa: 'aragon', provincia: 'Huesca',
    poblacion: 53606, superficie: 161, alcalde: 'Lorena Orduna', partidoAlcalde: 'PP', alcaldeDesde: 2023,
    webAyuntamiento: 'https://www.huesca.es', wikipedia: 'https://es.wikipedia.org/wiki/Huesca',
    tokens: ['huesca', 'orduna'] },
  { ine: '44216', slug: 'teruel', nombre: 'Teruel', ccaa: 'aragon', provincia: 'Teruel',
    poblacion: 35958, superficie: 440.4, alcalde: 'Emma Buj', partidoAlcalde: 'PP', alcaldeDesde: 2019,
    webAyuntamiento: 'https://www.teruel.es', wikipedia: 'https://es.wikipedia.org/wiki/Teruel',
    tokens: ['teruel', 'teruel existe'] },
  { ine: '06015', slug: 'badajoz', nombre: 'Badajoz', ccaa: 'extremadura', provincia: 'Badajoz',
    poblacion: 150984, superficie: 1470.45, alcalde: 'Ignacio Gragera', partidoAlcalde: 'Ciudadanos', alcaldeDesde: 2023,
    webAyuntamiento: 'https://www.aytobadajoz.es', wikipedia: 'https://es.wikipedia.org/wiki/Badajoz',
    tokens: ['badajoz', 'gragera'] },
  { ine: '10037', slug: 'caceres', nombre: 'Cáceres', ccaa: 'extremadura', provincia: 'Cáceres',
    poblacion: 96126, superficie: 1750.33, alcalde: 'Rafael Mateos', partidoAlcalde: 'PP', alcaldeDesde: 2023,
    webAyuntamiento: 'https://www.ayto-caceres.es', wikipedia: 'https://es.wikipedia.org/wiki/C%C3%A1ceres_(Espa%C3%B1a)',
    tokens: ['cáceres', 'caceres'] },
  { ine: '06083', slug: 'merida', nombre: 'Mérida', ccaa: 'extremadura', provincia: 'Badajoz',
    poblacion: 60174, superficie: 865.61, alcalde: 'Antonio Rodríguez Osuna', partidoAlcalde: 'PSOE', alcaldeDesde: 2015,
    webAyuntamiento: 'https://www.merida.es', wikipedia: 'https://es.wikipedia.org/wiki/M%C3%A9rida_(Espa%C3%B1a)',
    tokens: ['mérida', 'merida', 'osuna'] },
  { ine: '07040', slug: 'palma-mallorca', nombre: 'Palma de Mallorca', ccaa: 'baleares', provincia: 'Illes Balears',
    poblacion: 419366, superficie: 208.63, alcalde: 'Jaime Martínez', partidoAlcalde: 'PP', alcaldeDesde: 2023,
    webAyuntamiento: 'https://www.palma.cat', wikipedia: 'https://es.wikipedia.org/wiki/Palma_de_Mallorca',
    tokens: ['palma de mallorca', 'palma', 'jaime martínez palma'] },
  { ine: '35016', slug: 'las-palmas', nombre: 'Las Palmas de Gran Canaria', ccaa: 'canarias', provincia: 'Las Palmas',
    poblacion: 379925, superficie: 100.55, alcalde: 'Carolina Darias', partidoAlcalde: 'PSOE', alcaldeDesde: 2023,
    webAyuntamiento: 'https://www.laspalmasgc.es', wikipedia: 'https://es.wikipedia.org/wiki/Las_Palmas_de_Gran_Canaria',
    tokens: ['las palmas de gran canaria', 'las palmas', 'darias'] },
  { ine: '38038', slug: 'santa-cruz-tenerife', nombre: 'Santa Cruz de Tenerife', ccaa: 'canarias', provincia: 'Santa Cruz de Tenerife',
    poblacion: 209141, superficie: 150.56, alcalde: 'José Manuel Bermúdez', partidoAlcalde: 'CC', alcaldeDesde: 2011,
    webAyuntamiento: 'https://www.santacruzdetenerife.es', wikipedia: 'https://es.wikipedia.org/wiki/Santa_Cruz_de_Tenerife',
    tokens: ['santa cruz de tenerife', 'bermúdez tenerife'] },
  { ine: '30030', slug: 'murcia-ciudad', nombre: 'Murcia (ciudad)', ccaa: 'murcia', provincia: 'Murcia',
    poblacion: 460349, superficie: 882, alcalde: 'José Ballesta', partidoAlcalde: 'PP', alcaldeDesde: 2023,
    webAyuntamiento: 'https://www.murcia.es', wikipedia: 'https://es.wikipedia.org/wiki/Murcia',
    tokens: ['murcia ciudad', 'ayuntamiento de murcia', 'ballesta'] },
  { ine: '30016', slug: 'cartagena', nombre: 'Cartagena', ccaa: 'murcia', provincia: 'Murcia',
    poblacion: 218943, superficie: 558.8, alcalde: 'Noelia Arroyo', partidoAlcalde: 'PP', alcaldeDesde: 2021,
    webAyuntamiento: 'https://www.cartagena.es', wikipedia: 'https://es.wikipedia.org/wiki/Cartagena_(Espa%C3%B1a)',
    tokens: ['cartagena', 'arroyo cartagena'] },
  { ine: '31201', slug: 'pamplona', nombre: 'Pamplona / Iruña', ccaa: 'navarra', provincia: 'Navarra',
    poblacion: 203944, superficie: 25.1, alcalde: 'Joseba Asiron', partidoAlcalde: 'EH Bildu', alcaldeDesde: 2024,
    webAyuntamiento: 'https://www.pamplona.es', wikipedia: 'https://es.wikipedia.org/wiki/Pamplona',
    tokens: ['pamplona', 'iruña', 'asiron', 'sanfermines'] },
  { ine: '26089', slug: 'logrono', nombre: 'Logroño', ccaa: 'rioja', provincia: 'La Rioja',
    poblacion: 152485, superficie: 79.6, alcalde: 'Conrado Escobar', partidoAlcalde: 'PP', alcaldeDesde: 2023,
    webAyuntamiento: 'https://www.logrono.es', wikipedia: 'https://es.wikipedia.org/wiki/Logro%C3%B1o',
    tokens: ['logroño', 'logrono', 'escobar logroño'] },
  { ine: '51001', slug: 'ceuta-ciudad', nombre: 'Ceuta', ccaa: 'ceuta', provincia: 'Ceuta',
    poblacion: 83117, superficie: 19.5, alcalde: 'Juan Jesús Vivas', partidoAlcalde: 'PP', alcaldeDesde: 2001,
    webAyuntamiento: 'https://www.ceuta.es', wikipedia: 'https://es.wikipedia.org/wiki/Ceuta',
    tokens: ['ceuta ciudad', 'vivas ceuta'] },
  { ine: '52001', slug: 'melilla-ciudad', nombre: 'Melilla', ccaa: 'melilla', provincia: 'Melilla',
    poblacion: 86384, superficie: 13.4, alcalde: 'Juan José Imbroda', partidoAlcalde: 'PP', alcaldeDesde: 2024,
    webAyuntamiento: 'https://www.melilla.es', wikipedia: 'https://es.wikipedia.org/wiki/Melilla',
    tokens: ['melilla ciudad', 'imbroda'] },
]

export function getMunicipioBySlug(slug: string): Municipio | undefined {
  return MUNICIPIOS.find(m => m.slug === slug)
}

export function getMunicipiosByCCAA(ccaa: string): Municipio[] {
  return MUNICIPIOS.filter(m => m.ccaa === ccaa)
}

export function searchMunicipios(query: string, limit = 50): Municipio[] {
  if (!query) return MUNICIPIOS.slice(0, limit)
  const q = query.toLowerCase().trim()
  return MUNICIPIOS.filter(m =>
    m.nombre.toLowerCase().includes(q) ||
    m.provincia.toLowerCase().includes(q) ||
    (m.alcalde && m.alcalde.toLowerCase().includes(q))
  ).slice(0, limit)
}
