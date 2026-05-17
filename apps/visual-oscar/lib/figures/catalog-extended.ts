/**
 * Extensión del catálogo de figuras públicas con perfiles de nicho.
 *
 * Cubre sectores subrepresentados en el catálogo principal:
 *   - Tech / fundadores startups con influencia
 *   - Ciencia / divulgación / investigación
 *   - Cultura / literatura / cine
 *   - ONGs y activismo
 *   - Deporte con peso institucional
 *   - Religión
 *   - Influencers políticos / opinión digital
 */

import type { Figure } from './types'

const CATEGORY_COLOR: Record<string, string> = {
  politico: '#1F4E8C', institucional: '#7C3AED', empresario: '#0E7490',
  mediatico: '#525258', periodista: '#0F766E', lobbista: '#7C3AED',
  consultor: '#0891B2', fondo: '#5B21B6', academico: '#0D9488',
  judicial: '#9333EA', sindical: '#A02525', patronal: '#0E7490',
}

function fig(f: Omit<Figure, 'color'>): Figure { return { ...f, color: CATEGORY_COLOR[f.category] || '#6E6E73' } }

// ─── Tech / Fundadores startups con influencia política ────────────────────
const TECH_FOUNDERS: Figure[] = [
  fig({ id: 'tech-sergio-furio',   nombre: 'Sergio Furió', category: 'empresario', cargo: 'CEO', organizacion: 'Creditas', afiliacion: 'Creditas', ejeX: 18, ejeY: 18, influencia: 62, tags: ['tech','fintech','startup'], exposicion: 40 }),
  fig({ id: 'tech-david-velez',    nombre: 'David Vélez', category: 'empresario', cargo: 'Fundador', organizacion: 'Nubank', afiliacion: 'Nubank', ejeX: 20, ejeY: 18, influencia: 75, tags: ['tech','fintech','banca digital'], exposicion: 55, twitter: 'davidvelez_nu' }),
  fig({ id: 'tech-juan-roigfundador', nombre: 'Juan Roig (digital)', category: 'empresario', cargo: 'Impulsor', organizacion: 'Lanzadera / Marina de Empresas', afiliacion: 'Mercadona', ejeX: 25, ejeY: 15, influencia: 78, tags: ['tech','ecosistema','aceleradora'], exposicion: 65 }),
  fig({ id: 'tech-jdcalderon',     nombre: 'Juan Domingo Calderón', category: 'empresario', cargo: 'CEO', organizacion: 'Wallapop', afiliacion: 'Wallapop', ejeX: 18, ejeY: 12, influencia: 65, tags: ['tech','marketplace','startup'], exposicion: 45 }),
  fig({ id: 'tech-coscolla',       nombre: 'Iñaki Berenguer', category: 'empresario', cargo: 'Fundador', organizacion: 'CoverWallet · LifeX', afiliacion: 'CoverWallet', ejeX: 20, ejeY: 15, influencia: 70, tags: ['tech','insurtech','vc'], exposicion: 50, twitter: 'iberenguer' }),
  fig({ id: 'tech-glovo-oscar',    nombre: 'Óscar Pierre', category: 'empresario', cargo: 'CEO', organizacion: 'Glovo', afiliacion: 'Glovo', ejeX: 18, ejeY: 12, influencia: 72, tags: ['tech','delivery','rider law'], exposicion: 65, twitter: 'oskpierre' }),
  fig({ id: 'tech-ekomi',          nombre: 'Iñaki Arrola', category: 'empresario', cargo: 'Socio', organizacion: 'K Fund', afiliacion: 'K Fund', ejeX: 10, ejeY: 8, influencia: 68, tags: ['tech','vc','startup'], exposicion: 50, twitter: 'arrola' }),
  fig({ id: 'tech-frommer',        nombre: 'Bernardo Hernández', category: 'empresario', cargo: 'Inversor', organizacion: 'Inversor en Google / Idealista', afiliacion: null, ejeX: 18, ejeY: 18, influencia: 75, tags: ['tech','vc','inversor'], exposicion: 65, twitter: 'bernardohp', wikipedia: 'https://es.wikipedia.org/wiki/Bernardo_Hern%C3%A1ndez' }),
  fig({ id: 'tech-cabify',         nombre: 'Juan de Antonio', category: 'empresario', cargo: 'CEO', organizacion: 'Cabify', afiliacion: 'Cabify', ejeX: 15, ejeY: 12, influencia: 70, tags: ['tech','movilidad','vtc'], exposicion: 55 }),
  fig({ id: 'tech-jobandtalent',   nombre: 'Juan Urdiales', category: 'empresario', cargo: 'CEO', organizacion: 'Jobandtalent', afiliacion: 'Jobandtalent', ejeX: 18, ejeY: 15, influencia: 65, tags: ['tech','rrhh','unicornio'], exposicion: 40 }),
  fig({ id: 'tech-typeform',       nombre: 'Robert Muñoz Centellas', category: 'empresario', cargo: 'CEO', organizacion: 'TravelPerk', afiliacion: 'TravelPerk', ejeX: 15, ejeY: 12, influencia: 60, tags: ['tech','viajes','b2b'], exposicion: 35 }),
  fig({ id: 'tech-idealista',      nombre: 'Jesús Encinar', category: 'empresario', cargo: 'Fundador', organizacion: 'Idealista', afiliacion: 'Idealista', ejeX: 28, ejeY: 18, influencia: 80, twitter: 'jesusencinar', wikipedia: 'https://es.wikipedia.org/wiki/Jes%C3%BAs_Encinar', tags: ['tech','inmobiliaria','startup'], exposicion: 75 }),
  fig({ id: 'tech-fever',          nombre: 'Ignacio Bachiller', category: 'empresario', cargo: 'CEO', organizacion: 'Fever', afiliacion: 'Fever', ejeX: 18, ejeY: 12, influencia: 65, tags: ['tech','ocio','eventos'], exposicion: 45 }),
]

// ─── Ciencia / Divulgación ─────────────────────────────────────────────────
const CIENCIA: Figure[] = [
  fig({ id: 'cie-margarita-salas', nombre: 'María Blasco', category: 'academico', cargo: 'Directora', organizacion: 'CNIO', afiliacion: 'CNIO', ejeX: -15, ejeY: 5, influencia: 78, wikipedia: 'https://es.wikipedia.org/wiki/Mar%C3%ADa_Blasco_Marhuenda', tags: ['ciencia','cancer','investigacion'], exposicion: 70 }),
  fig({ id: 'cie-rodriguez-pose', nombre: 'Avelino Corma', category: 'academico', cargo: 'Profesor', organizacion: 'ITQ-CSIC', afiliacion: 'CSIC', ejeX: 5, ejeY: 12, influencia: 75, wikipedia: 'https://es.wikipedia.org/wiki/Avelino_Corma', tags: ['ciencia','quimica','csic'], exposicion: 50 }),
  fig({ id: 'cie-frances-cabezas', nombre: 'José Antonio Bartelt', category: 'academico', cargo: 'Investigador', organizacion: 'ICMAT', afiliacion: 'CSIC', ejeX: 0, ejeY: 10, influencia: 60, tags: ['ciencia','matematicas'], exposicion: 30 }),
  fig({ id: 'cie-pedro-cavadas', nombre: 'Pedro Cavadas', category: 'academico', cargo: 'Cirujano', organizacion: 'Fundación Cavadas', afiliacion: null, ejeX: 25, ejeY: 22, influencia: 78, wikipedia: 'https://es.wikipedia.org/wiki/Pedro_Cavadas', tags: ['medicina','cirugia','referencia'], exposicion: 80 }),
  fig({ id: 'cie-valentin-fuster', nombre: 'Valentín Fuster', category: 'academico', cargo: 'Director', organizacion: 'CNIC', afiliacion: 'CNIC', ejeX: 5, ejeY: 15, influencia: 85, wikipedia: 'https://es.wikipedia.org/wiki/Valent%C3%ADn_Fuster', tags: ['medicina','cardiologia','referencia'], exposicion: 80 }),
  fig({ id: 'cie-perez-rama', nombre: 'Ángeles Heras', category: 'academico', cargo: 'Catedrática', organizacion: 'UCM', afiliacion: null, ejeX: 0, ejeY: 18, influencia: 60, tags: ['ciencia','quimica','politica'], exposicion: 40 }),
  fig({ id: 'cie-juan-fueyo', nombre: 'Juan Fueyo', category: 'academico', cargo: 'Investigador', organizacion: 'MD Anderson', afiliacion: null, ejeX: -10, ejeY: 5, influencia: 70, twitter: 'juanfueyo', tags: ['ciencia','virologia','divulgacion'], exposicion: 65 }),
  fig({ id: 'cie-saavedra-pol', nombre: 'Pere Estupinyà', category: 'periodista', cargo: 'Divulgador', organizacion: 'TVE / El Cazador de Cerebros', afiliacion: 'RTVE', ejeX: -20, ejeY: 5, influencia: 68, twitter: 'goodissimo', wikipedia: 'https://es.wikipedia.org/wiki/Pere_Estupiny%C3%A0', tags: ['ciencia','divulgacion','tv'], exposicion: 60 }),
  fig({ id: 'cie-elsahot', nombre: 'Eduard Punset', category: 'periodista', cargo: 'Divulgador (póstumo)', organizacion: 'Redes / Punset Foundation', afiliacion: null, ejeX: -10, ejeY: 5, influencia: 55, wikipedia: 'https://es.wikipedia.org/wiki/Eduardo_Punset', tags: ['divulgacion','ciencia'], exposicion: 40 }),
]

// ─── Cultura / Cine / Literatura ────────────────────────────────────────────
const CULTURA: Figure[] = [
  fig({ id: 'cul-perez-reverte', nombre: 'Arturo Pérez-Reverte', category: 'mediatico', cargo: 'Escritor / Columnista', organizacion: 'XL Semanal / RAE', afiliacion: null, ejeX: 35, ejeY: 25, influencia: 90, twitter: 'perezreverte', wikipedia: 'https://es.wikipedia.org/wiki/Arturo_P%C3%A9rez-Reverte', tags: ['cultura','literatura','opinion'], exposicion: 95 }),
  fig({ id: 'cul-eduardo-mendoza', nombre: 'Eduardo Mendoza', category: 'mediatico', cargo: 'Escritor', organizacion: 'Planeta', afiliacion: null, ejeX: -10, ejeY: -10, influencia: 70, wikipedia: 'https://es.wikipedia.org/wiki/Eduardo_Mendoza_Garriga', tags: ['cultura','literatura','catalan'], exposicion: 65 }),
  fig({ id: 'cul-rosa-montero', nombre: 'Rosa Montero', category: 'periodista', cargo: 'Columnista', organizacion: 'El País', afiliacion: 'PRISA', ejeX: -30, ejeY: -5, influencia: 80, wikipedia: 'https://es.wikipedia.org/wiki/Rosa_Montero', tags: ['cultura','literatura','feminismo'], exposicion: 78 }),
  fig({ id: 'cul-elvira-lindo', nombre: 'Elvira Lindo', category: 'periodista', cargo: 'Escritora / Columnista', organizacion: 'El País', afiliacion: 'PRISA', ejeX: -25, ejeY: -8, influencia: 70, wikipedia: 'https://es.wikipedia.org/wiki/Elvira_Lindo', tags: ['cultura','literatura'], exposicion: 65 }),
  fig({ id: 'cul-almodovar', nombre: 'Pedro Almodóvar', category: 'mediatico', cargo: 'Cineasta', organizacion: 'El Deseo', afiliacion: null, ejeX: -45, ejeY: -15, influencia: 95, wikipedia: 'https://es.wikipedia.org/wiki/Pedro_Almod%C3%B3var', tags: ['cine','cultura','marca espana'], exposicion: 95 }),
  fig({ id: 'cul-bayona', nombre: 'J. A. Bayona', category: 'mediatico', cargo: 'Cineasta', organizacion: 'Independiente', afiliacion: null, ejeX: -10, ejeY: -10, influencia: 78, twitter: 'FilmBayona', wikipedia: 'https://es.wikipedia.org/wiki/Juan_Antonio_Bayona', tags: ['cine','cultura'], exposicion: 70 }),
  fig({ id: 'cul-ricoy', nombre: 'Carla Simón', category: 'mediatico', cargo: 'Cineasta', organizacion: 'Lastor Media', afiliacion: null, ejeX: -25, ejeY: -25, influencia: 65, wikipedia: 'https://es.wikipedia.org/wiki/Carla_Sim%C3%B3n', tags: ['cine','cultura','catalan'], exposicion: 55 }),
  fig({ id: 'cul-amenabar', nombre: 'Alejandro Amenábar', category: 'mediatico', cargo: 'Cineasta', organizacion: 'Mod Producciones', afiliacion: null, ejeX: -20, ejeY: -5, influencia: 75, wikipedia: 'https://es.wikipedia.org/wiki/Alejandro_Amen%C3%A1bar', tags: ['cine','cultura','memoria historica'], exposicion: 70 }),
  fig({ id: 'cul-aitana', nombre: 'Aitana Sánchez-Gijón', category: 'mediatico', cargo: 'Actriz', organizacion: null, afiliacion: null, ejeX: -25, ejeY: -10, influencia: 70, wikipedia: 'https://es.wikipedia.org/wiki/Aitana_S%C3%A1nchez-Gij%C3%B3n', tags: ['cine','teatro','cultura'], exposicion: 75 }),
  fig({ id: 'cul-rakomedoff', nombre: 'Risto Mejide', category: 'mediatico', cargo: 'Presentador', organizacion: 'Mediaset / Cuatro', afiliacion: 'Mediaset', ejeX: 20, ejeY: 15, influencia: 80, twitter: 'ristomejide', wikipedia: 'https://es.wikipedia.org/wiki/Risto_Mejide', tags: ['medios','tv','opinion'], exposicion: 88 }),
  fig({ id: 'cul-rosalia', nombre: 'Rosalía', category: 'mediatico', cargo: 'Artista', organizacion: 'Columbia / Sony', afiliacion: null, ejeX: -15, ejeY: -20, influencia: 92, twitter: 'rosalia', wikipedia: 'https://es.wikipedia.org/wiki/Rosal%C3%ADa_(cantante)', tags: ['musica','cultura','marca espana'], exposicion: 95 }),
  fig({ id: 'cul-cbravo', nombre: 'C. Tangana', category: 'mediatico', cargo: 'Artista', organizacion: null, afiliacion: null, ejeX: -20, ejeY: -25, influencia: 88, twitter: 'c_tangana', wikipedia: 'https://es.wikipedia.org/wiki/C._Tangana', tags: ['musica','cultura'], exposicion: 90 }),
]

// ─── Activistas / ONG ─────────────────────────────────────────────────────
const ACTIVISTAS: Figure[] = [
  fig({ id: 'act-greenpeace-es', nombre: 'Eva Saldaña', category: 'lobbista', cargo: 'Directora', organizacion: 'Greenpeace España', afiliacion: 'Greenpeace', ejeX: -50, ejeY: -10, influencia: 72, tags: ['activismo','ecologismo','ong'], exposicion: 65, twitter: 'evasaldana' }),
  fig({ id: 'act-amnistia-es', nombre: 'Esteban Beltrán', category: 'lobbista', cargo: 'Director', organizacion: 'Amnistía Internacional España', afiliacion: 'Amnistía', ejeX: -40, ejeY: -5, influencia: 70, tags: ['activismo','derechos humanos','ong'], exposicion: 60 }),
  fig({ id: 'act-oxfam-intermon', nombre: 'Franc Cortada', category: 'lobbista', cargo: 'Director', organizacion: 'Oxfam Intermón', afiliacion: 'Oxfam', ejeX: -45, ejeY: 0, influencia: 65, tags: ['activismo','desigualdad','ong'], exposicion: 50 }),
  fig({ id: 'act-cear', nombre: 'Mauricio Valiente', category: 'lobbista', cargo: 'Presidente', organizacion: 'CEAR', afiliacion: 'CEAR', ejeX: -45, ejeY: 0, influencia: 65, tags: ['activismo','refugio','migracion'], exposicion: 55 }),
  fig({ id: 'act-medicos-mundo', nombre: 'José Félix Hoyo', category: 'lobbista', cargo: 'Presidente', organizacion: 'Médicos del Mundo', afiliacion: 'Médicos del Mundo', ejeX: -35, ejeY: -5, influencia: 60, tags: ['activismo','sanidad','ong'], exposicion: 45 }),
  fig({ id: 'act-feminismo-andrea', nombre: 'Andrea Henry', category: 'lobbista', cargo: 'Portavoz', organizacion: 'Movimiento Feminista', afiliacion: null, ejeX: -55, ejeY: -15, influencia: 60, tags: ['activismo','feminismo'], exposicion: 50 }),
  fig({ id: 'act-pah-ada', nombre: 'Ada Colau (post-alcaldía)', category: 'lobbista', cargo: 'Activista', organizacion: 'PAH (origen) / Comuns', afiliacion: 'Comuns', ejeX: -60, ejeY: -25, influencia: 80, wikipedia: 'https://es.wikipedia.org/wiki/Ada_Colau', tags: ['activismo','vivienda','barcelona'], exposicion: 85 }),
  fig({ id: 'act-ecologistas', nombre: 'Pilar Marcos', category: 'lobbista', cargo: 'Responsable Energía y Clima', organizacion: 'Ecologistas en Acción', afiliacion: 'EeA', ejeX: -50, ejeY: -10, influencia: 60, tags: ['activismo','clima','energia'], exposicion: 45 }),
  fig({ id: 'act-fundacion-bertelsmann', nombre: 'Francisco Belil', category: 'institucional', cargo: 'Presidente', organizacion: 'Fundación Bertelsmann', afiliacion: 'Bertelsmann', ejeX: 5, ejeY: 18, influencia: 60, tags: ['fundacion','formacion'], exposicion: 35 }),
]

// ─── Religión ─────────────────────────────────────────────────────────────
const RELIGIOSOS: Figure[] = [
  fig({ id: 'rel-arzobispo-mad', nombre: 'José Cobo', category: 'institucional', cargo: 'Cardenal Arzobispo', organizacion: 'Archidiócesis de Madrid', afiliacion: 'Iglesia Católica', ejeX: 25, ejeY: 35, influencia: 75, wikipedia: 'https://es.wikipedia.org/wiki/Jos%C3%A9_Cobo_Cano', tags: ['religion','iglesia','madrid'], exposicion: 65 }),
  fig({ id: 'rel-cee', nombre: 'Luis Argüello', category: 'institucional', cargo: 'Presidente CEE', organizacion: 'Conferencia Episcopal Española', afiliacion: 'Iglesia Católica', ejeX: 30, ejeY: 35, influencia: 78, tags: ['religion','iglesia','cee'], exposicion: 75 }),
  fig({ id: 'rel-omella', nombre: 'Juan José Omella', category: 'institucional', cargo: 'Cardenal Arzobispo', organizacion: 'Archidiócesis de Barcelona', afiliacion: 'Iglesia Católica', ejeX: 22, ejeY: 30, influencia: 75, wikipedia: 'https://es.wikipedia.org/wiki/Juan_Jos%C3%A9_Omella', tags: ['religion','iglesia','barcelona'], exposicion: 70 }),
  fig({ id: 'rel-feid-mauricio-rojas', nombre: 'Mounir Benjelloun', category: 'institucional', cargo: 'Presidente', organizacion: 'Federación Española de Entidades Religiosas Islámicas', afiliacion: 'FEERI', ejeX: -10, ejeY: 5, influencia: 55, tags: ['religion','islam','minorias'], exposicion: 35 }),
  fig({ id: 'rel-fcj', nombre: 'Isaac Querub', category: 'institucional', cargo: 'Presidente', organizacion: 'Federación de Comunidades Judías de España', afiliacion: 'FCJE', ejeX: 5, ejeY: 22, influencia: 55, tags: ['religion','judaismo','minorias'], exposicion: 35 }),
]

// ─── Deporte con peso institucional ────────────────────────────────────────
const DEPORTE: Figure[] = [
  fig({ id: 'dep-tebas', nombre: 'Javier Tebas', category: 'institucional', cargo: 'Presidente', organizacion: 'LaLiga', afiliacion: 'LaLiga', ejeX: 30, ejeY: 22, influencia: 92, twitter: 'Tebasjavier', wikipedia: 'https://es.wikipedia.org/wiki/Javier_Tebas', tags: ['deporte','futbol','lobby'], exposicion: 95 }),
  fig({ id: 'dep-rfef', nombre: 'Rafael Louzán', category: 'institucional', cargo: 'Presidente', organizacion: 'RFEF', afiliacion: 'RFEF', ejeX: 25, ejeY: 25, influencia: 78, tags: ['deporte','futbol','seleccion'], exposicion: 75 }),
  fig({ id: 'dep-laporta', nombre: 'Joan Laporta', category: 'institucional', cargo: 'Presidente', organizacion: 'FC Barcelona', afiliacion: 'FC Barcelona', ejeX: -5, ejeY: -50, influencia: 90, wikipedia: 'https://es.wikipedia.org/wiki/Joan_Laporta', tags: ['deporte','futbol','barcelona'], exposicion: 92 }),
  fig({ id: 'dep-perez-real', nombre: 'Florentino Pérez (RM)', category: 'institucional', cargo: 'Presidente', organizacion: 'Real Madrid', afiliacion: 'Real Madrid', ejeX: 32, ejeY: 25, influencia: 95, wikipedia: 'https://es.wikipedia.org/wiki/Florentino_P%C3%A9rez', tags: ['deporte','futbol','madrid'], exposicion: 95 }),
  fig({ id: 'dep-nadal', nombre: 'Rafael Nadal', category: 'mediatico', cargo: 'Tenista (retirado)', organizacion: 'Rafa Nadal Academy', afiliacion: null, ejeX: 18, ejeY: 18, influencia: 95, wikipedia: 'https://es.wikipedia.org/wiki/Rafael_Nadal', tags: ['deporte','tenis','marca espana'], exposicion: 100 }),
  fig({ id: 'dep-csd', nombre: 'José Manuel Rodríguez Uribes', category: 'politico', cargo: 'Presidente', organizacion: 'CSD', afiliacion: 'Gobierno', ejeX: -25, ejeY: 25, influencia: 65, tags: ['deporte','gobierno'], exposicion: 50 }),
  fig({ id: 'dep-mou-paloma', nombre: 'Alejandro Blanco', category: 'institucional', cargo: 'Presidente', organizacion: 'Comité Olímpico Español', afiliacion: 'COE', ejeX: 15, ejeY: 20, influencia: 68, wikipedia: 'https://es.wikipedia.org/wiki/Alejandro_Blanco_Bravo', tags: ['deporte','olimpiadas'], exposicion: 50 }),
]

// ─── Influencers políticos digitales / opinión ─────────────────────────────
const INFLUENCERS_OPINION: Figure[] = [
  fig({ id: 'inf-bertin-osborne', nombre: 'Bertín Osborne', category: 'mediatico', cargo: 'Presentador', organizacion: 'Independiente', afiliacion: null, ejeX: 45, ejeY: 30, influencia: 75, wikipedia: 'https://es.wikipedia.org/wiki/Bert%C3%ADn_Osborne', tags: ['medios','tv','opinion'], exposicion: 80 }),
  fig({ id: 'inf-broncano', nombre: 'David Broncano', category: 'mediatico', cargo: 'Presentador', organizacion: 'TVE / Resistencia', afiliacion: 'RTVE', ejeX: -20, ejeY: -10, influencia: 85, twitter: 'davidbroncano', wikipedia: 'https://es.wikipedia.org/wiki/David_Broncano', tags: ['medios','tv','humor'], exposicion: 92 }),
  fig({ id: 'inf-buenafuente', nombre: 'Andreu Buenafuente', category: 'mediatico', cargo: 'Presentador', organizacion: 'El Terrat / Atresmedia', afiliacion: 'Atresmedia', ejeX: -25, ejeY: -15, influencia: 78, twitter: 'abuenafuente', wikipedia: 'https://es.wikipedia.org/wiki/Andreu_Buenafuente', tags: ['medios','tv','humor','catalan'], exposicion: 80 }),
  fig({ id: 'inf-pablomotos', nombre: 'Pablo Motos', category: 'mediatico', cargo: 'Presentador', organizacion: 'El Hormiguero · Antena 3', afiliacion: 'Atresmedia', ejeX: 20, ejeY: 18, influencia: 90, wikipedia: 'https://es.wikipedia.org/wiki/Pablo_Motos', tags: ['medios','tv','entretenimiento'], exposicion: 95 }),
  fig({ id: 'inf-quim-monzo', nombre: 'Quim Monzó', category: 'mediatico', cargo: 'Escritor / Columnista', organizacion: 'La Vanguardia', afiliacion: 'Godó', ejeX: 10, ejeY: -45, influencia: 60, wikipedia: 'https://es.wikipedia.org/wiki/Quim_Monz%C3%B3', tags: ['cultura','catalan','opinion'], exposicion: 50 }),
  fig({ id: 'inf-revilla', nombre: 'Miguel Ángel Revilla', category: 'politico', cargo: 'Ex-Presidente (PRC)', organizacion: 'PRC', afiliacion: 'PRC', ejeX: -10, ejeY: 5, influencia: 75, wikipedia: 'https://es.wikipedia.org/wiki/Miguel_%C3%81ngel_Revilla', tags: ['politica','cantabria','tv'], exposicion: 80 }),
]

// ─── Empresarios adicionales por sector (no IBEX) ──────────────────────────
const EMP_NICHE: Figure[] = [
  fig({ id: 'emp-cosentino', nombre: 'Francisco Martínez-Cosentino', category: 'empresario', cargo: 'Presidente', organizacion: 'Cosentino Group', afiliacion: 'Cosentino', ejeX: 30, ejeY: 15, influencia: 78, tags: ['empresa','silestone','familia'], exposicion: 60 }),
  fig({ id: 'emp-grifols', nombre: 'Raimon Grifols', category: 'empresario', cargo: 'Co-Presidente', organizacion: 'Grifols', afiliacion: 'Grifols', ejeX: 22, ejeY: 18, influencia: 80, tags: ['farma','plasma','ibex'], exposicion: 65 }),
  fig({ id: 'emp-cellnex-fdez', nombre: 'Marco Patuano', category: 'empresario', cargo: 'CEO', organizacion: 'Cellnex Telecom', afiliacion: 'Cellnex', ejeX: 20, ejeY: 18, influencia: 70, tags: ['telecom','infraestructura'], exposicion: 45 }),
  fig({ id: 'emp-puigfamilia', nombre: 'Marc Puig', category: 'empresario', cargo: 'CEO', organizacion: 'Puig Brands', afiliacion: 'Puig', ejeX: 22, ejeY: 12, influencia: 82, tags: ['lujo','moda','perfumes','ibex'], exposicion: 70 }),
  fig({ id: 'emp-pronovias', nombre: 'Amancio Lopez', category: 'empresario', cargo: 'Presidente', organizacion: 'Hotusa', afiliacion: 'Hotusa', ejeX: 28, ejeY: 18, influencia: 70, tags: ['hoteles','turismo','familia'], exposicion: 45 }),
  fig({ id: 'emp-prosegur', nombre: 'Helena Revoredo', category: 'empresario', cargo: 'Presidenta', organizacion: 'Prosegur', afiliacion: 'Prosegur', ejeX: 25, ejeY: 20, influencia: 75, tags: ['seguridad','servicios'], exposicion: 50 }),
  fig({ id: 'emp-prisa-polanco', nombre: 'Manuel Mirat', category: 'empresario', cargo: 'CEO', organizacion: 'PRISA', afiliacion: 'PRISA', ejeX: -5, ejeY: 18, influencia: 75, tags: ['medios','ibex'], exposicion: 55 }),
  fig({ id: 'emp-vidal-ribas', nombre: 'Tomás Pascual Sanchiz', category: 'empresario', cargo: 'Presidente', organizacion: 'Calidad Pascual', afiliacion: 'Pascual', ejeX: 28, ejeY: 18, influencia: 70, tags: ['alimentacion','familia'], exposicion: 50 }),
  fig({ id: 'emp-grupocosmen', nombre: 'José María Cosmen', category: 'empresario', cargo: 'Vicepresidente', organizacion: 'ALSA', afiliacion: 'ALSA / National Express', ejeX: 25, ejeY: 18, influencia: 65, tags: ['transporte','autobuses'], exposicion: 35 }),
  fig({ id: 'emp-eulen', nombre: 'María José Álvarez Mezquíriz', category: 'empresario', cargo: 'Presidenta', organizacion: 'Grupo Eulen', afiliacion: 'Eulen', ejeX: 28, ejeY: 18, influencia: 65, tags: ['servicios','outsourcing','familia'], exposicion: 40 }),
  fig({ id: 'emp-aciturri', nombre: 'Ginés Clemente', category: 'empresario', cargo: 'Presidente', organizacion: 'Aciturri Aeronáutica', afiliacion: 'Aciturri', ejeX: 25, ejeY: 20, influencia: 60, tags: ['aeronautica','defensa','industria'], exposicion: 35 }),
  fig({ id: 'emp-rovi', nombre: 'Juan López-Belmonte', category: 'empresario', cargo: 'Presidente', organizacion: 'Rovi Farma', afiliacion: 'Rovi', ejeX: 22, ejeY: 18, influencia: 65, tags: ['farma','ibex'], exposicion: 40 }),
  fig({ id: 'emp-dia', nombre: 'Stephan DuCharme', category: 'empresario', cargo: 'Presidente', organizacion: 'DIA Group', afiliacion: 'DIA / LetterOne', ejeX: 30, ejeY: 22, influencia: 60, tags: ['retail','distribucion'], exposicion: 40 }),
]

// ─── Jueces y fiscales clave ───────────────────────────────────────────────
const JUDICIAL_EXTENDIDO: Figure[] = [
  fig({ id: 'jud-pablo-llarena', nombre: 'Pablo Llarena', category: 'judicial', cargo: 'Magistrado Sala 2', organizacion: 'Tribunal Supremo', afiliacion: 'TS', ejeX: 25, ejeY: 30, influencia: 85, wikipedia: 'https://es.wikipedia.org/wiki/Pablo_Llarena', tags: ['justicia','procés','supremo'], exposicion: 88 }),
  fig({ id: 'jud-marchena', nombre: 'Manuel Marchena', category: 'judicial', cargo: 'Magistrado', organizacion: 'Tribunal Supremo', afiliacion: 'TS', ejeX: 20, ejeY: 30, influencia: 80, wikipedia: 'https://es.wikipedia.org/wiki/Manuel_Marchena', tags: ['justicia','procés','supremo'], exposicion: 75 }),
  fig({ id: 'jud-velasco', nombre: 'Eloy Velasco', category: 'judicial', cargo: 'Magistrado', organizacion: 'Audiencia Nacional', afiliacion: 'AN', ejeX: 25, ejeY: 30, influencia: 72, tags: ['justicia','an','corrupcion'], exposicion: 50 }),
  fig({ id: 'jud-fiscal-anticorrupcion', nombre: 'Alejandro Luzón', category: 'judicial', cargo: 'Fiscal Jefe Anticorrupción', organizacion: 'Fiscalía Anticorrupción', afiliacion: 'Fiscalía', ejeX: -10, ejeY: 28, influencia: 78, tags: ['fiscalia','anticorrupcion'], exposicion: 60 }),
  fig({ id: 'jud-revuelta', nombre: 'Cristina Dexeus', category: 'judicial', cargo: 'Presidenta', organizacion: 'APM (Asoc. Profesional Magistratura)', afiliacion: 'APM', ejeX: 25, ejeY: 30, influencia: 65, tags: ['justicia','asoc judiciales'], exposicion: 50 }),
]

// ─── Vinculados a comunidades autónomas (presidentes en activo) ─────────────
const PRES_CCAA: Figure[] = [
  fig({ id: 'pres-ayuso', nombre: 'Isabel Díaz Ayuso', category: 'politico', cargo: 'Presidenta CAM', organizacion: 'Comunidad de Madrid', afiliacion: 'PP', ejeX: 60, ejeY: 5, influencia: 95, twitter: 'IdiazAyuso', wikipedia: 'https://es.wikipedia.org/wiki/Isabel_D%C3%ADaz_Ayuso', tags: ['ccaa','madrid','pp'], exposicion: 100 }),
  fig({ id: 'pres-moreno', nombre: 'Juanma Moreno', category: 'politico', cargo: 'Presidente Junta', organizacion: 'Junta de Andalucía', afiliacion: 'PP', ejeX: 35, ejeY: -25, influencia: 90, wikipedia: 'https://es.wikipedia.org/wiki/Juanma_Moreno', tags: ['ccaa','andalucia','pp'], exposicion: 88 }),
  fig({ id: 'pres-mazon', nombre: 'Carlos Mazón', category: 'politico', cargo: 'President de la Generalitat', organizacion: 'Generalitat Valenciana', afiliacion: 'PP', ejeX: 40, ejeY: -10, influencia: 80, wikipedia: 'https://es.wikipedia.org/wiki/Carlos_Maz%C3%B3n', tags: ['ccaa','valenciana','pp','dana'], exposicion: 92 }),
  fig({ id: 'pres-illa', nombre: 'Salvador Illa', category: 'politico', cargo: 'President de la Generalitat', organizacion: 'Generalitat de Catalunya', afiliacion: 'PSC', ejeX: -10, ejeY: -30, influencia: 88, wikipedia: 'https://es.wikipedia.org/wiki/Salvador_Illa', tags: ['ccaa','cataluna','psc'], exposicion: 90 }),
  fig({ id: 'pres-pradales', nombre: 'Imanol Pradales', category: 'politico', cargo: 'Lehendakari', organizacion: 'Gobierno Vasco', afiliacion: 'PNV', ejeX: 5, ejeY: -55, influencia: 78, wikipedia: 'https://es.wikipedia.org/wiki/Imanol_Pradales', tags: ['ccaa','pais vasco','pnv'], exposicion: 70 }),
  fig({ id: 'pres-rueda', nombre: 'Alfonso Rueda', category: 'politico', cargo: 'Presidente Xunta', organizacion: 'Xunta de Galicia', afiliacion: 'PP', ejeX: 30, ejeY: -15, influencia: 75, wikipedia: 'https://es.wikipedia.org/wiki/Alfonso_Rueda', tags: ['ccaa','galicia','pp'], exposicion: 65 }),
  fig({ id: 'pres-chivite', nombre: 'María Chivite', category: 'politico', cargo: 'Presidenta', organizacion: 'Gobierno de Navarra', afiliacion: 'PSN', ejeX: -25, ejeY: 10, influencia: 65, wikipedia: 'https://es.wikipedia.org/wiki/Mar%C3%ADa_Chivite', tags: ['ccaa','navarra','psn'], exposicion: 60 }),
  fig({ id: 'pres-clavijo', nombre: 'Fernando Clavijo', category: 'politico', cargo: 'Presidente', organizacion: 'Gobierno de Canarias', afiliacion: 'CC', ejeX: 8, ejeY: 5, influencia: 65, wikipedia: 'https://es.wikipedia.org/wiki/Fernando_Clavijo', tags: ['ccaa','canarias','cc'], exposicion: 60 }),
]

// ─── Lobbies adicionales (energía verde, vivienda, etc.) ───────────────────
const LOBBIES_EXTRA: Figure[] = [
  fig({ id: 'lob-appa', nombre: 'José María González', category: 'lobbista', cargo: 'Director General', organizacion: 'APPA Renovables', afiliacion: 'APPA', ejeX: -10, ejeY: 18, influencia: 65, tags: ['lobby','energia','renovables'], exposicion: 40 }),
  fig({ id: 'lob-aedive', nombre: 'Arturo Pérez de Lucia', category: 'lobbista', cargo: 'Director General', organizacion: 'AEDIVE (vehículo eléctrico)', afiliacion: 'AEDIVE', ejeX: -5, ejeY: 18, influencia: 60, tags: ['lobby','movilidad','electrico'], exposicion: 35 }),
  fig({ id: 'lob-aevi', nombre: 'José María Moreno', category: 'lobbista', cargo: 'Director General', organizacion: 'AEVI (videojuegos)', afiliacion: 'AEVI', ejeX: 10, ejeY: 12, influencia: 55, tags: ['lobby','videojuegos','digital'], exposicion: 30 }),
  fig({ id: 'lob-anged', nombre: 'Javier Millán-Astray', category: 'lobbista', cargo: 'Director General', organizacion: 'ANGED (grandes superficies)', afiliacion: 'ANGED', ejeX: 32, ejeY: 22, influencia: 65, tags: ['lobby','retail','distribucion'], exposicion: 45 }),
  fig({ id: 'lob-aebanca', nombre: 'Alejandra Kindelán', category: 'lobbista', cargo: 'Presidenta', organizacion: 'AEB (Asoc. Española de Banca)', afiliacion: 'AEB', ejeX: 30, ejeY: 25, influencia: 80, tags: ['lobby','banca','ibex'], exposicion: 65 }),
  fig({ id: 'lob-unespa', nombre: 'Pilar González de Frutos', category: 'lobbista', cargo: 'Presidenta', organizacion: 'UNESPA (Aseguradoras)', afiliacion: 'UNESPA', ejeX: 28, ejeY: 22, influencia: 72, tags: ['lobby','seguros'], exposicion: 50 }),
  fig({ id: 'lob-confemetal', nombre: 'Antonio Garamendi', category: 'lobbista', cargo: 'Presidente CONFEMETAL', organizacion: 'Confederación Española del Metal', afiliacion: 'CONFEMETAL', ejeX: 30, ejeY: 22, influencia: 68, tags: ['lobby','industria','metal'], exposicion: 50 }),
]

export function getNicheCatalog(): Figure[] {
  return [
    ...TECH_FOUNDERS,
    ...CIENCIA,
    ...CULTURA,
    ...ACTIVISTAS,
    ...RELIGIOSOS,
    ...DEPORTE,
    ...INFLUENCERS_OPINION,
    ...EMP_NICHE,
    ...JUDICIAL_EXTENDIDO,
    ...PRES_CCAA,
    ...LOBBIES_EXTRA,
  ]
}
