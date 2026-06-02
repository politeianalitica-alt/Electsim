
import { NextResponse } from 'next/server';

/**
 * Politeia — Live News Feeds v3
 * embed_allowed: true  → can be iframed directly (YouTube allows it for these channels)
 * embed_allowed: false → YouTube/broadcaster blocks embedding; open externally instead
 *
 * Tested against X-Frame-Options and YouTube's embed restrictions.
 * Channels that show "Video unavailable" or refuse iframe are marked false.
 */

const LIVE_FEEDS = [
  // ── España (noticias 24h + cámaras en directo) ──
  { id: 'rtve24h',        name: 'RTVE Canal 24 Horas',      city: 'Madrid',   country: 'ES', lat: 40.451,  lng: -3.690,  url: 'https://www.youtube.com/embed/live_stream?channel=UC7QZIf0dta-XPXsp9Hv4dTw&autoplay=1&mute=1', embed_allowed: false, category: 'mainstream', language: 'es' },
  { id: 'lasexta24h',     name: 'laSexta Noticias',         city: 'Madrid',   country: 'ES', lat: 40.435,  lng: -3.685,  url: 'https://www.youtube.com/embed/live_stream?channel=UCCJs5mITIqxqJGeFjt9N1Mg&autoplay=1&mute=1', embed_allowed: false, category: 'mainstream', language: 'es' },
  { id: 'euronewses',     name: 'euronews (Español)',       city: 'Madrid',   country: 'ES', lat: 40.417,  lng: -3.703,  url: 'https://www.youtube.com/embed/live_stream?channel=UCyoGb3SMlTlB8CLGVH4c8Rw&autoplay=1&mute=1', embed_allowed: true,  category: 'mainstream', language: 'es' },
  { id: 'cam_madrid_sol', name: 'Cámara · Puerta del Sol',  city: 'Madrid',   country: 'ES', lat: 40.4169, lng: -3.7035, url: 'https://www.youtube.com/embed/-WbUCUDkMQM?autoplay=1&mute=1', embed_allowed: true, category: 'webcam', language: 'es' },
  { id: 'cam_valencia',   name: 'Cámara · Pl. Ayuntamiento', city: 'Valencia', country: 'ES', lat: 39.4699, lng: -0.3774, url: 'https://www.youtube.com/embed/dVAtjVi7bUQ?autoplay=1&mute=1', embed_allowed: true, category: 'webcam', language: 'es' },
  { id: 'cam_mallorca',   name: 'Cámara · Santa Ponsa',     city: 'Mallorca', country: 'ES', lat: 39.5095, lng: 2.4795,  url: 'https://www.youtube.com/embed/X0kNa7mAnnI?autoplay=1&mute=1', embed_allowed: true, category: 'webcam', language: 'es' },
  // — Galicia / Cantábrico / País Vasco —
  { id: 'cam_acoruna',    name: 'Cámara · Playa de Riazor',          city: 'A Coruña',      country: 'ES', lat: 43.364, lng: -8.410, url: 'https://www.youtube.com/embed/LT65NtJmX-Q?autoplay=1&mute=1', embed_allowed: true, category: 'webcam', language: 'es' },
  { id: 'cam_santander',  name: 'Cámara · Playa del Sardinero',      city: 'Santander',     country: 'ES', lat: 43.462, lng: -3.810, url: 'https://www.youtube.com/embed/BYIh50kmk_M?autoplay=1&mute=1', embed_allowed: true, category: 'webcam', language: 'es' },
  { id: 'cam_sansebastian', name: 'Cámara · Playa de La Concha',     city: 'San Sebastián', country: 'ES', lat: 43.318, lng: -1.981, url: 'https://www.youtube.com/embed/mmIupk814XA?autoplay=1&mute=1', embed_allowed: true, category: 'webcam', language: 'es' },
  { id: 'cam_bilbao',     name: 'Cámara · Reserva de Urdaibai',      city: 'Bilbao',        country: 'ES', lat: 43.263, lng: -2.935, url: 'https://www.youtube.com/embed/mRsCe9p39f8?autoplay=1&mute=1', embed_allowed: true, category: 'webcam', language: 'es' },
  { id: 'cam_vitoria',    name: 'Cámara · Vitoria-Gasteiz',          city: 'Vitoria',       country: 'ES', lat: 42.847, lng: -2.673, url: 'https://www.youtube.com/embed/LMQ5J-Dtj2M?autoplay=1&mute=1', embed_allowed: true, category: 'webcam', language: 'es' },
  // — Cataluña / Aragón —
  { id: 'cam_barcelona',  name: 'Cámara · Playa de la Barceloneta',  city: 'Barcelona',     country: 'ES', lat: 41.385, lng: 2.173,  url: 'https://www.youtube.com/embed/hh6ZKp7QcJs?autoplay=1&mute=1', embed_allowed: true, category: 'webcam', language: 'es' },
  { id: 'cam_girona',     name: 'Cámara · Tossa de Mar',             city: 'Girona',        country: 'ES', lat: 41.979, lng: 2.821,  url: 'https://www.youtube.com/embed/nWFcWooDAxI?autoplay=1&mute=1', embed_allowed: true, category: 'webcam', language: 'es' },
  { id: 'cam_teruel',     name: 'Cámara · Valdelinares',             city: 'Teruel',        country: 'ES', lat: 40.344, lng: -1.107, url: 'https://www.youtube.com/embed/a9m7PAevQJM?autoplay=1&mute=1', embed_allowed: true, category: 'webcam', language: 'es' },
  // — Castilla y León —
  { id: 'cam_leon',       name: 'Cámara · Portilla de la Reina',     city: 'León',          country: 'ES', lat: 42.598, lng: -5.567, url: 'https://www.youtube.com/embed/ZP4pWmLePsY?autoplay=1&mute=1', embed_allowed: true, category: 'webcam', language: 'es' },
  { id: 'cam_palencia',   name: 'Cámara · Laguna de Boada',          city: 'Palencia',      country: 'ES', lat: 42.009, lng: -4.528, url: 'https://www.youtube.com/embed/kBacv-e-QVU?autoplay=1&mute=1', embed_allowed: true, category: 'webcam', language: 'es' },
  { id: 'cam_zamora',     name: 'Cámara · Halcón Peregrino',         city: 'Zamora',        country: 'ES', lat: 41.504, lng: -5.744, url: 'https://www.youtube.com/embed/fv6bMT6c2yk?autoplay=1&mute=1', embed_allowed: true, category: 'webcam', language: 'es' },
  { id: 'cam_avila',      name: 'Cámara · Murallas de Ávila',        city: 'Ávila',         country: 'ES', lat: 40.656, lng: -4.700, url: 'https://www.youtube.com/embed/2gYM6LMZhKg?autoplay=1&mute=1', embed_allowed: true, category: 'webcam', language: 'es' },
  // — Castilla-La Mancha / Extremadura / Murcia —
  { id: 'cam_ciudadreal', name: 'Cámara · Territorio Lince',         city: 'Ciudad Real',   country: 'ES', lat: 38.986, lng: -3.927, url: 'https://www.youtube.com/embed/zXDARbKXdME?autoplay=1&mute=1', embed_allowed: true, category: 'webcam', language: 'es' },
  { id: 'cam_caceres',    name: 'Cámara · Monfragüe (río Tajo)',     city: 'Cáceres',       country: 'ES', lat: 39.476, lng: -6.371, url: 'https://www.youtube.com/embed/sInLCrdaJpY?autoplay=1&mute=1', embed_allowed: true, category: 'webcam', language: 'es' },
  { id: 'cam_badajoz',    name: 'Cámara · Valencia del Mombuey',     city: 'Badajoz',       country: 'ES', lat: 38.879, lng: -6.970, url: 'https://www.youtube.com/embed/phR6lT7SJyc?autoplay=1&mute=1', embed_allowed: true, category: 'webcam', language: 'es' },
  { id: 'cam_murcia',     name: 'Cámara · Ciudad de Murcia',         city: 'Murcia',        country: 'ES', lat: 37.992, lng: -1.130, url: 'https://www.youtube.com/embed/OAclJBFc6II?autoplay=1&mute=1', embed_allowed: true, category: 'webcam', language: 'es' },
  // — Andalucía —
  { id: 'cam_jaen',       name: 'Cámara · Lince ibérico',            city: 'Jaén',          country: 'ES', lat: 37.766, lng: -3.791, url: 'https://www.youtube.com/embed/RQ0oJke2fg8?autoplay=1&mute=1', embed_allowed: true, category: 'webcam', language: 'es' },
  { id: 'cam_sevilla',    name: 'Cámara · Sevilla',                  city: 'Sevilla',       country: 'ES', lat: 37.389, lng: -5.984, url: 'https://www.youtube.com/embed/_Q3g5_3w2WU?autoplay=1&mute=1', embed_allowed: true, category: 'webcam', language: 'es' },
  { id: 'cam_granada',    name: 'Cámara · Alhambra',                 city: 'Granada',       country: 'ES', lat: 37.177, lng: -3.598, url: 'https://www.youtube.com/embed/1EiqyVppKQU?autoplay=1&mute=1', embed_allowed: true, category: 'webcam', language: 'es' },
  { id: 'cam_malaga',     name: 'Cámara · Playa La Misericordia',    city: 'Málaga',        country: 'ES', lat: 36.721, lng: -4.421, url: 'https://www.youtube.com/embed/BRAbclsxCuo?autoplay=1&mute=1', embed_allowed: true, category: 'webcam', language: 'es' },
  { id: 'cam_marbella',   name: 'Cámara · Playa El Cable',           city: 'Marbella',      country: 'ES', lat: 36.510, lng: -4.886, url: 'https://www.youtube.com/embed/imW5PJu4lMQ?autoplay=1&mute=1', embed_allowed: true, category: 'webcam', language: 'es' },
  { id: 'cam_cadiz',      name: 'Cámara · Playa Victoria',           city: 'Cádiz',         country: 'ES', lat: 36.527, lng: -6.288, url: 'https://www.youtube.com/embed/sb_XmLMYh54?autoplay=1&mute=1', embed_allowed: true, category: 'webcam', language: 'es' },
  // — Canarias / Baleares —
  { id: 'cam_laspalmas',  name: 'Cámara · Playa de Las Canteras',    city: 'Las Palmas',    country: 'ES', lat: 28.124, lng: -15.430, url: 'https://www.youtube.com/embed/jWWjoJ2icA8?autoplay=1&mute=1', embed_allowed: true, category: 'webcam', language: 'es' },
  { id: 'cam_tenerife',   name: 'Cámara · Playa de Las Teresitas',   city: 'Santa Cruz de Tenerife', country: 'ES', lat: 28.469, lng: -16.254, url: 'https://www.youtube.com/embed/wnx0qxgleK8?autoplay=1&mute=1', embed_allowed: true, category: 'webcam', language: 'es' },
  { id: 'cam_ibiza',      name: 'Cámara · Café del Mar (Ibiza)',     city: 'Ibiza',         country: 'ES', lat: 38.909, lng: 1.432,  url: 'https://www.youtube.com/embed/gsCy64BCAk4?autoplay=1&mute=1', embed_allowed: true, category: 'webcam', language: 'es' },
  { id: 'cam_mahon',      name: 'Cámara · Puerto de Mahón',          city: 'Mahón',         country: 'ES', lat: 39.889, lng: 4.265,  url: 'https://www.youtube.com/embed/sacX9Kb8g8M?autoplay=1&mute=1', embed_allowed: true, category: 'webcam', language: 'es' },
  // — Resto de provincias (cámara en web externa: SkylineWebcams / Windy / municipal) —
  { id: 'cam_lugo',        name: 'Cámara · Murallas de Lugo',          city: 'Lugo',          country: 'ES', lat: 43.012, lng: -7.556, url: 'https://www.windy.com/webcams/1302032704', embed_allowed: false, category: 'webcam', language: 'es' },
  { id: 'cam_ourense',     name: 'Cámara · Ribeira Sacra (Cañón del Sil)', city: 'Ourense',   country: 'ES', lat: 42.336, lng: -7.864, url: 'https://www.skylinewebcams.com/es/webcam/espana/galicia/ourense/a-teixeira-canon-del-sil-ribeira-sacra.html', embed_allowed: false, category: 'webcam', language: 'es' },
  { id: 'cam_pontevedra',  name: 'Cámara · Cabo Silleiro',             city: 'Pontevedra',    country: 'ES', lat: 42.431, lng: -8.645, url: 'https://www.skylinewebcams.com/es/webcam/espana/galicia/pontevedra/cabo-silleiro.html', embed_allowed: false, category: 'webcam', language: 'es' },
  { id: 'cam_oviedo',      name: 'Cámara · Calle General Elorza',      city: 'Oviedo',        country: 'ES', lat: 43.362, lng: -5.844, url: 'https://www.webcamsdeasturias.com/webcam.php?id=64', embed_allowed: false, category: 'webcam', language: 'es' },
  { id: 'cam_pamplona',    name: 'Cámara · Plaza del Castillo',        city: 'Pamplona',      country: 'ES', lat: 42.812, lng: -1.645, url: 'https://www.windy.com/webcams/1228924382', embed_allowed: false, category: 'webcam', language: 'es' },
  { id: 'cam_lleida',      name: 'Cámara · La Seu Vella',              city: 'Lleida',        country: 'ES', lat: 41.617, lng: 0.620,  url: 'https://www.windy.com/webcams/1240918545', embed_allowed: false, category: 'webcam', language: 'es' },
  { id: 'cam_tarragona',   name: 'Cámara · Balcó del Mediterrani',     city: 'Tarragona',     country: 'ES', lat: 41.119, lng: 1.245,  url: 'https://www.skylinewebcams.com/es/webcam/espana/cataluna/tarragona/tarragona-balco-del-mediterrani.html', embed_allowed: false, category: 'webcam', language: 'es' },
  { id: 'cam_huesca',      name: 'Cámara · Plaza de Navarra',          city: 'Huesca',        country: 'ES', lat: 42.136, lng: -0.409, url: 'https://www.skylinewebcams.com/es/webcam/espana/aragon/huesca/huesca.html', embed_allowed: false, category: 'webcam', language: 'es' },
  { id: 'cam_zaragoza',    name: 'Cámara · Basílica del Pilar y Ebro', city: 'Zaragoza',      country: 'ES', lat: 41.648, lng: -0.889, url: 'https://www.skylinewebcams.com/es/webcam/espana/aragon/zaragoza/zaragoza.html', embed_allowed: false, category: 'webcam', language: 'es' },
  { id: 'cam_logrono',     name: 'Cámara · Logroño centro',            city: 'Logroño',       country: 'ES', lat: 42.465, lng: -2.450, url: 'https://www.windy.com/webcams/1520363074', embed_allowed: false, category: 'webcam', language: 'es' },
  { id: 'cam_castellon',   name: 'Cámara · Peñíscola',                 city: 'Castellón de la Plana', country: 'ES', lat: 39.986, lng: -0.037, url: 'https://www.skylinewebcams.com/es/webcam/espana/comunidad-valenciana/castellon/peniscola.html', embed_allowed: false, category: 'webcam', language: 'es' },
  { id: 'cam_alicante',    name: 'Cámara · Playa de la Almadraba',     city: 'Alicante',      country: 'ES', lat: 38.345, lng: -0.481, url: 'https://www.skylinewebcams.com/es/webcam/espana/comunidad-valenciana/alicante/alicante-playa-almadraba.html', embed_allowed: false, category: 'webcam', language: 'es' },
  { id: 'cam_burgos',      name: 'Cámara · Catedral de Burgos',        city: 'Burgos',        country: 'ES', lat: 42.341, lng: -3.704, url: 'https://ibericam.com/espana/burgos/webcam-burgos-catedral-de-burgos/', embed_allowed: false, category: 'webcam', language: 'es' },
  { id: 'cam_valladolid',  name: 'Cámara · Plaza Mayor de Valladolid', city: 'Valladolid',    country: 'ES', lat: 41.652, lng: -4.724, url: 'https://www.windy.com/webcams/1578394726', embed_allowed: false, category: 'webcam', language: 'es' },
  { id: 'cam_salamanca',   name: 'Cámara · La Alberca',                city: 'Salamanca',     country: 'ES', lat: 40.970, lng: -5.664, url: 'https://www.skylinewebcams.com/es/webcam/espana/castilla-y-leon/salamanca/la-alberca.html', embed_allowed: false, category: 'webcam', language: 'es' },
  { id: 'cam_segovia',     name: 'Cámara · Acueducto de Segovia',      city: 'Segovia',       country: 'ES', lat: 40.948, lng: -4.118, url: 'https://www.turismolive.es/webcam-segovia-acueducto/', embed_allowed: false, category: 'webcam', language: 'es' },
  { id: 'cam_soria',       name: 'Cámara · Plaza Mayor de Soria',      city: 'Soria',         country: 'ES', lat: 41.764, lng: -2.464, url: 'https://www.skylinewebcams.com/es/webcam/espana/castilla-y-leon/soria/plaza-mayor.html', embed_allowed: false, category: 'webcam', language: 'es' },
  { id: 'cam_guadalajara', name: 'Cámara · Guadalajara',               city: 'Guadalajara',   country: 'ES', lat: 40.633, lng: -3.167, url: 'https://www.ventusky.com/webcam-503821312', embed_allowed: false, category: 'webcam', language: 'es' },
  { id: 'cam_toledo',      name: 'Cámara · Puente de San Martín',      city: 'Toledo',        country: 'ES', lat: 39.863, lng: -4.027, url: 'https://www.skylinewebcams.com/es/webcam/espana/castiglia-la-mancia/toledo/toledo-puente-di-san-martin.html', embed_allowed: false, category: 'webcam', language: 'es' },
  { id: 'cam_cuenca',      name: 'Cámara · Plaza Mayor de Cuenca',     city: 'Cuenca',        country: 'ES', lat: 40.070, lng: -2.137, url: 'https://www.cuenca.es/webcam-plaza-mayor', embed_allowed: false, category: 'webcam', language: 'es' },
  { id: 'cam_albacete',    name: 'Cámara · Albacete',                  city: 'Albacete',      country: 'ES', lat: 38.994, lng: -1.858, url: 'https://www.windy.com/webcams/1579607793', embed_allowed: false, category: 'webcam', language: 'es' },
  { id: 'cam_almeria',     name: 'Cámara · Playa El Zapillo',          city: 'Almería',       country: 'ES', lat: 36.840, lng: -2.468, url: 'https://www.windy.com/webcams/1387198973', embed_allowed: false, category: 'webcam', language: 'es' },
  { id: 'cam_huelva',      name: 'Cámara · Playa de Matalascañas',     city: 'Huelva',        country: 'ES', lat: 37.261, lng: -6.945, url: 'https://www.skylinewebcams.com/es/webcam/espana/andalucia/huelva/playa-de-matalascanas.html', embed_allowed: false, category: 'webcam', language: 'es' },
  { id: 'cam_cordoba',     name: 'Cámara · Córdoba (Ciudad Jardín)',   city: 'Córdoba',       country: 'ES', lat: 37.889, lng: -4.779, url: 'https://www.windy.com/webcams/1402727910', embed_allowed: false, category: 'webcam', language: 'es' },

  // ── África (cámaras en directo — ciudades, costas y safari; abren en la web de la webcam) ──
  // — Sudáfrica (ZA) —
  { id: 'cam_capetown_tablemountain', name: 'Cámara · Table Mountain', city: 'Cape Town', country: 'ZA', lat: -33.9249, lng: 18.4241, url: 'https://www.skylinewebcams.com/en/webcam/south-africa/western-cape/cape-town/table-mountain.html', embed_allowed: false, category: 'webcam', language: 'en' },
  { id: 'cam_capetown_clifton', name: 'Cámara · Clifton Beach', city: 'Cape Town', country: 'ZA', lat: -33.9408, lng: 18.3760, url: 'https://www.skylinewebcams.com/en/webcam/south-africa/western-cape/cape-town/cape-town-clifton-beach.html', embed_allowed: false, category: 'webcam', language: 'en' },
  { id: 'cam_za_penguins_stonypoint', name: 'Cámara · Pingüinos Stony Point', city: 'Betty\'s Bay', country: 'ZA', lat: -34.3736, lng: 18.8946, url: 'https://africam.com/lodge/penguins/', embed_allowed: false, category: 'webcam', language: 'en' },
  { id: 'cam_za_nkorho', name: 'Cámara · Nkorho Bush Lodge (Sabi Sand)', city: 'Sabi Sand', country: 'ZA', lat: -24.7900, lng: 31.4400, url: 'https://africam.com/lodge/nkorho-bush-lodge/', embed_allowed: false, category: 'webcam', language: 'en' },
  { id: 'cam_za_tembe', name: 'Cámara · Tembe Elephant Park', city: 'Maputaland', country: 'ZA', lat: -27.0333, lng: 32.4167, url: 'https://africam.com/lodge/tembe-elephant-park/', embed_allowed: false, category: 'webcam', language: 'en' },
  { id: 'cam_za_ulusaba', name: 'Cámara · Ulusaba (Sabi Sand)', city: 'Sabi Sand', country: 'ZA', lat: -24.8000, lng: 31.3500, url: 'https://africam.com/lodge/ulusaba/', embed_allowed: false, category: 'webcam', language: 'en' },
  // — Kenia (KE) —
  { id: 'cam_ke_mpala_wateringhole', name: 'Cámara · Mpala Watering Hole', city: 'Laikipia', country: 'KE', lat: 0.2900, lng: 36.9000, url: 'https://www.mpalalive.org/live_cam/wateringhole', embed_allowed: false, category: 'webcam', language: 'en' },
  { id: 'cam_ke_mpala_river', name: 'Cámara · Mpala River (Explore.org)', city: 'Laikipia', country: 'KE', lat: 0.2900, lng: 36.9000, url: 'https://explore.org/livecams/mpala/african-river-wildlife-camera', embed_allowed: false, category: 'webcam', language: 'en' },
  { id: 'cam_ke_wateringhole_explore', name: 'Cámara · African Watering Hole (Explore.org)', city: 'Laikipia', country: 'KE', lat: 0.2900, lng: 36.9000, url: 'https://explore.org/livecams/african-wildlife/african-watering-hole-animal-camera', embed_allowed: false, category: 'webcam', language: 'en' },
  { id: 'cam_ke_mara_river', name: 'Cámara · Mara River (Mara Triangle)', city: 'Maasai Mara', country: 'KE', lat: -1.4060, lng: 35.0080, url: 'https://africam.com/lodge/marariver/', embed_allowed: false, category: 'webcam', language: 'en' },
  { id: 'cam_ke_mahali_mzuri', name: 'Cámara · Mahali Mzuri (Maasai Mara)', city: 'Maasai Mara', country: 'KE', lat: -1.2670, lng: 35.1830, url: 'https://africam.com/lodge/mahali-mzuri/', embed_allowed: false, category: 'webcam', language: 'en' },
  { id: 'cam_ke_finch_hattons', name: 'Cámara · Finch Hattons (Tsavo West)', city: 'Tsavo West', country: 'KE', lat: -2.7500, lng: 38.1500, url: 'https://africam.com/lodge/finch-hattons/', embed_allowed: false, category: 'webcam', language: 'en' },
  { id: 'cam_ke_ol_donyo', name: 'Cámara · ol Donyo Lodge (Chyulu Hills)', city: 'Chyulu Hills', country: 'KE', lat: -2.6800, lng: 37.8800, url: 'https://africam.com/lodge/ol-donyo-lodge/', embed_allowed: false, category: 'webcam', language: 'en' },
  // — Tanzania (TZ) —
  { id: 'cam_tz_serengeti', name: 'Cámara · Serengeti (Elewana Explorer)', city: 'Serengeti', country: 'TZ', lat: -2.3333, lng: 34.8333, url: 'https://africam.com/lodge/serengeti/', embed_allowed: false, category: 'webcam', language: 'en' },
  { id: 'cam_tz_zanzibar_nungwi', name: 'Cámara · Nungwi Beach (Zanzíbar)', city: 'Nungwi', country: 'TZ', lat: -5.7270, lng: 39.2960, url: 'https://www.skylinewebcams.com/en/webcam/zanzibar/zanzibar-north/nungwi/nungwi-beach.html', embed_allowed: false, category: 'webcam', language: 'en' },
  { id: 'cam_tz_zanzibar_stonetown', name: 'Cámara · Stone Town (Zanzíbar)', city: 'Zanzibar City', country: 'TZ', lat: -6.1630, lng: 39.1890, url: 'https://www.skylinewebcams.com/en/webcam/zanzibar/zanzibar-urban-west-region/zanzibar-city/stone-town.html', embed_allowed: false, category: 'webcam', language: 'en' },
  // — Egipto (EG) —
  { id: 'cam_eg_giza_pyramid', name: 'Cámara · Gran Pirámide de Guiza', city: 'El Cairo', country: 'EG', lat: 29.9792, lng: 31.1342, url: 'https://www.skylinewebcams.com/en/webcam/egypt/cairo/cairo/great-pyramid-of-giza.html', embed_allowed: false, category: 'webcam', language: 'en' },
  { id: 'cam_eg_giza_sphinx', name: 'Cámara · Pirámides de Guiza y la Esfinge', city: 'El Cairo', country: 'EG', lat: 29.9753, lng: 31.1376, url: 'https://www.skylinewebcams.com/en/webcam/egypt/cairo/cairo/pyramids-giza-sphinx.html', embed_allowed: false, category: 'webcam', language: 'en' },
  // — Marruecos (MA) —
  { id: 'cam_ma_marrakech', name: 'Cámara · Marrakech (Koutoubia)', city: 'Marrakech', country: 'MA', lat: 31.6258, lng: -7.9891, url: 'https://www.skylinewebcams.com/en/webcam/morocco/marrakech-tensift-el-haouz/marrakesh/marrakesh.html', embed_allowed: false, category: 'webcam', language: 'en' },
  // — Namibia (NA) —
  { id: 'cam_na_okaukuejo', name: 'Cámara · Okaukuejo Waterhole (Etosha)', city: 'Etosha', country: 'NA', lat: -19.1820, lng: 15.9120, url: 'https://www.skylinewebcams.com/en/webcam/namibia/oshana-region/okaukuejo/etosha-national-park-wildlife-waterhole.html', embed_allowed: false, category: 'webcam', language: 'en' },
  { id: 'cam_na_onguma', name: 'Cámara · Onguma The Fort (Etosha)', city: 'Etosha', country: 'NA', lat: -18.7500, lng: 17.0500, url: 'https://africam.com/lodge/onguma-the-fort-live-stream-africam-live-camera-bordering-etosha-namibia/', embed_allowed: false, category: 'webcam', language: 'en' },
  { id: 'cam_na_safarihoek', name: 'Cámara · Safarihoek (Etosha Heights)', city: 'Etosha Heights', country: 'NA', lat: -19.3000, lng: 15.4000, url: 'https://africam.com/lodge/safarihoek/', embed_allowed: false, category: 'webcam', language: 'en' },
  // — Zimbabue (ZW) —
  { id: 'cam_zw_the_hide', name: 'Cámara · The Hide (Hwange)', city: 'Hwange', country: 'ZW', lat: -18.6290, lng: 26.9870, url: 'https://africam.com/lodge/the-hide/', embed_allowed: false, category: 'webcam', language: 'en' },
  { id: 'cam_zw_linkwasha', name: 'Cámara · Wilderness Linkwasha (Hwange)', city: 'Hwange', country: 'ZW', lat: -18.9500, lng: 27.0000, url: 'https://africam.com/lodge/linkwasha/', embed_allowed: false, category: 'webcam', language: 'en' },
  { id: 'cam_zw_victoria_falls', name: 'Cámara · Victoria Falls Safari Lodge', city: 'Victoria Falls', country: 'ZW', lat: -17.9244, lng: 25.8267, url: 'https://africam.com/lodge/victoria-falls-safari-lodge/', embed_allowed: false, category: 'webcam', language: 'en' },
  // — Botsuana (BW) —
  { id: 'cam_bw_jacks_camp', name: 'Cámara · Jack\'s Camp (Makgadikgadi)', city: 'Makgadikgadi Pans', country: 'BW', lat: -20.5000, lng: 25.2000, url: 'https://africam.com/lodge/jackscamp/', embed_allowed: false, category: 'webcam', language: 'en' },
  { id: 'cam_bw_kalahari_saltpan', name: 'Cámara · Kalahari Salt Pan (Makgadikgadi)', city: 'Makgadikgadi Pans', country: 'BW', lat: -20.7000, lng: 25.5000, url: 'https://africam.com/lodge/kalahari/', embed_allowed: false, category: 'webcam', language: 'en' },
  { id: 'cam_bw_elephant_pan', name: 'Cámara · Elephant Pan (Khwai)', city: 'Khwai', country: 'BW', lat: -19.1500, lng: 23.7500, url: 'https://africam.com/lodge/elephant-pan/', embed_allowed: false, category: 'webcam', language: 'en' },

  // ── North America (external only — open in YouTube) ──
  { id: 'nbcnews',   name: 'NBC News NOW',  city: 'New York',      country: 'US', lat: 40.759, lng: -73.980, url: 'https://www.youtube.com/channel/UCeY0bbntWzzVIaj2z3QigXg/live', embed_allowed: false, category: 'mainstream', language: 'en' },
  { id: 'cbsnews',   name: 'CBS News 24/7', city: 'New York',      country: 'US', lat: 40.764, lng: -73.973, url: 'https://www.youtube.com/channel/UC8p1vwvWtl6T73JiExfWs1g/live', embed_allowed: false, category: 'mainstream', language: 'en' },
  { id: 'abcnews',   name: 'ABC News Live', city: 'New York',      country: 'US', lat: 40.763, lng: -73.979, url: 'https://www.youtube.com/channel/UCBi2mrWuNuyYy4gbM6fU18Q/live', embed_allowed: false, category: 'mainstream', language: 'en' },
  { id: 'bloomberg', name: 'Bloomberg TV',  city: 'New York',      country: 'US', lat: 40.756, lng: -73.988, url: 'https://www.youtube.com/channel/UC_vQ72b7v5n2938v9d5c80w/live', embed_allowed: false, category: 'finance',    language: 'en' },
  { id: 'cspan',     name: 'C-SPAN',        city: 'Washington DC', country: 'US', lat: 38.897, lng: -77.036, url: 'https://www.youtube.com/channel/UCb--64Gl51jIEVE-GLDAVTg/live',  embed_allowed: false, category: 'government', language: 'en' },
  { id: 'cbc',       name: 'CBC News',      city: 'Toronto',       country: 'CA', lat: 43.644, lng: -79.387, url: 'https://www.youtube.com/channel/UCKy1dAqELon0zgzZPOz9SVw/live',  embed_allowed: false, category: 'mainstream', language: 'en' },

  // ── Europe (verified embeddable) ──
  { id: 'skynews',    name: 'Sky News',      city: 'London', country: 'GB', lat: 51.500, lng:  -0.118, url: 'https://www.youtube.com/embed/live_stream?channel=UCoMdktPbSTixAyNGwb-UYkQ&autoplay=1&mute=1', embed_allowed: true, category: 'mainstream', language: 'en' },
  { id: 'france24en', name: 'France 24 EN',  city: 'Paris',  country: 'FR', lat: 48.830, lng:   2.280, url: 'https://www.youtube.com/embed/live_stream?channel=UCQfwfsi5VrQ8yKZ-UWmAEFg&autoplay=1&mute=1', embed_allowed: true, category: 'mainstream', language: 'en' },
  { id: 'dwnews',     name: 'DW News',       city: 'Berlin', country: 'DE', lat: 52.508, lng:  13.376, url: 'https://www.youtube.com/embed/live_stream?channel=UCknLrEdhRCp1aegoMqRaCZg&autoplay=1&mute=1', embed_allowed: true, category: 'mainstream', language: 'en' },

  // ── Middle East ──
  { id: 'aljazeera',  name: 'Al Jazeera EN', city: 'Doha', country: 'QA', lat: 25.286, lng: 51.534, url: 'https://www.youtube.com/embed/live_stream?channel=UCNye-wNBqNL5ZzHSJj3l8Bg&autoplay=1&mute=1', embed_allowed: true, category: 'mainstream', language: 'en' },

  // ── Asia Pacific (verified embeddable) ──
  { id: 'nhkworld', name: 'NHK World',  city: 'Tokyo',     country: 'JP', lat: 35.690, lng: 139.692, url: 'https://www.youtube.com/embed/live_stream?channel=UCSPEjw8F2nQDtmUKPFNF7_A&autoplay=1&mute=1', embed_allowed: true, category: 'mainstream', language: 'en' },
  { id: 'cna',      name: 'CNA 24/7',  city: 'Singapore', country: 'SG', lat:  1.290, lng: 103.852, url: 'https://www.youtube.com/embed/live_stream?channel=UC83jt4dlz1Gjl58fzQrrKZg&autoplay=1&mute=1', embed_allowed: true, category: 'mainstream', language: 'en' },
  { id: 'wion',     name: 'WION',      city: 'New Delhi', country: 'IN', lat: 28.614, lng:  77.209, url: 'https://www.youtube.com/embed/live_stream?channel=UC_gUM8rL-Lrg6O3adPW9K1g&autoplay=1&mute=1', embed_allowed: true, category: 'mainstream', language: 'en' },
  // CGTN blocks embeds from non-Chinese IPs often
  { id: 'cgtn',     name: 'CGTN',      city: 'Beijing',   country: 'CN', lat: 39.904, lng: 116.407, url: 'https://www.youtube.com/channel/UCgrNz-aDmcr2uuto8_DL2jg/live',                                embed_allowed: false, category: 'state',      language: 'en' },

  // ── State media (external only) ──
  { id: 'rt',       name: 'RT News',   city: 'Moscow',  country: 'RU', lat: 55.755, lng:  37.617, url: 'https://rumble.com/c/RTNewsEN', embed_allowed: false, category: 'state', language: 'en' },
];

export async function GET() {
  return NextResponse.json({
    feeds: LIVE_FEEDS,
    total: LIVE_FEEDS.length,
    categories: ['mainstream', 'webcam', 'government', 'finance', 'conflict', 'state'],
    timestamp: new Date().toISOString(),
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=172800' },
  });
}

