/**
 * news-taxonomy.ts — DICCIONARIOS DE LOOKUP, no taxonomías cerradas.
 *
 * Aquí viven los tokens que mapean palabras a entidades conocidas:
 *   - Partidos (PP, PSOE, Vox…) → tokens que los nombran
 *   - Figuras públicas → tokens y aliases
 *   - Empresas IBEX35 → tokens y sectores
 *   - Provincias → tokens (ciudad y comarca)
 *   - Hints categoría / emoción / objetivo
 *
 * Los TEMAS y NARRATIVAS no están aquí — emergen del corpus por
 * clustering TF-IDF en news-intel.ts.
 */

// ── Partidos políticos españoles ──────────────────────────────────────────
export const PARTY_TOKENS: Record<string, string[]> = {
  PP:        ['pp', 'partido popular', 'feijóo', 'feijoo', 'génova', 'genova', 'populares'],
  PSOE:      ['psoe', 'socialistas', 'ferraz', 'sánchez', 'sanchez', 'pedro sánchez', 'pedro sanchez'],
  Vox:       ['vox', 'abascal', 'santiago abascal'],
  Sumar:     ['sumar', 'yolanda díaz', 'yolanda diaz'],
  Podemos:   ['podemos', 'belarra', 'ione belarra', 'irene montero'],
  ERC:       ['erc', 'esquerra', 'aragonès', 'aragones', 'rufián', 'rufian'],
  Junts:     ['junts', 'puigdemont', 'turull', 'borràs', 'borras'],
  Bildu:     ['bildu', 'eh bildu', 'otegi', 'arnaldo otegi'],
  PNV:       ['pnv', 'pradales', 'imanol pradales', 'ortuzar'],
  BNG:       ['bng', 'bloque nacionalista', 'ana pontón', 'ana ponton'],
  CC:        ['coalición canaria', 'coalicion canaria'],
  UPN:       ['upn', 'unión del pueblo navarro'],
  CUP:       ['cup', 'candidatura unidad popular'],
}

// ── Figuras públicas relevantes ───────────────────────────────────────────
// La lista es ampliable; cada entrada mapea nombre canónico → tokens.
export const KNOWN_FIGURE_TOKENS: Record<string, string[]> = {
  // Gobierno central
  'Pedro Sánchez':         ['pedro sánchez', 'pedro sanchez', 'sánchez', 'sanchez'],
  'María Jesús Montero':   ['maría jesús montero', 'maria jesus montero'],
  'Yolanda Díaz':          ['yolanda díaz', 'yolanda diaz'],
  'Félix Bolaños':         ['félix bolaños', 'felix bolaños', 'felix bolanos', 'bolaños'],
  'José Manuel Albares':   ['albares', 'josé manuel albares'],
  'Margarita Robles':      ['margarita robles', 'robles'],
  'Pilar Alegría':         ['pilar alegría', 'pilar alegria'],
  'Mónica García':         ['mónica garcía', 'monica garcia'],
  'Carlos Cuerpo':         ['carlos cuerpo', 'cuerpo ministro'],

  // PP
  'Alberto Núñez Feijóo':  ['feijóo', 'feijoo', 'alberto núñez feijóo', 'alberto nunez feijoo'],
  'Cuca Gamarra':          ['cuca gamarra', 'gamarra'],
  'Borja Sémper':          ['borja sémper', 'borja semper'],
  'Esteban González Pons': ['gonzález pons', 'gonzalez pons'],
  'Isabel Díaz Ayuso':     ['ayuso', 'isabel díaz ayuso', 'isabel diaz ayuso'],
  'Juanma Moreno':         ['juanma moreno', 'moreno bonilla'],
  'Alfonso Rueda':         ['alfonso rueda', 'rueda presidente'],
  'Carlos Mazón':          ['mazón', 'carlos mazón', 'carlos mazon'],
  'María Guardiola':       ['maría guardiola', 'maria guardiola'],

  // Vox
  'Santiago Abascal':      ['abascal', 'santiago abascal'],
  'Iván Espinosa de los Monteros': ['espinosa de los monteros'],
  'Rocío Monasterio':      ['monasterio', 'rocío monasterio'],
  'Pepa Millán':           ['pepa millán', 'pepa millan'],

  // Sumar / Podemos
  'Irene Montero':         ['irene montero'],
  'Ione Belarra':          ['ione belarra', 'belarra'],
  'Pablo Iglesias':        ['pablo iglesias'],
  'Ernest Urtasun':        ['urtasun', 'ernest urtasun'],

  // Independentistas
  'Carles Puigdemont':     ['puigdemont', 'carles puigdemont'],
  'Pere Aragonès':         ['aragonès', 'aragones', 'pere aragones'],
  'Salvador Illa':         ['salvador illa', 'illa'],
  'Jordi Turull':          ['turull', 'jordi turull'],
  'Gabriel Rufián':        ['rufián', 'rufian'],
  'Oriol Junqueras':       ['junqueras', 'oriol junqueras'],
  'Arnaldo Otegi':         ['otegi', 'arnaldo otegi'],
  'Imanol Pradales':       ['pradales', 'imanol pradales'],
  'Andoni Ortuzar':        ['ortuzar', 'andoni ortuzar'],
  'Ana Pontón':            ['ana pontón', 'ana ponton'],
  'Aitor Esteban':         ['aitor esteban'],

  // CCAA otras
  'Fernando López Miras':  ['lópez miras', 'lopez miras'],
  'Emiliano García-Page':  ['garcía-page', 'garcia-page', 'page'],
  'Fernando Clavijo':      ['clavijo', 'fernando clavijo'],
  'Marga Prohens':         ['marga prohens', 'prohens'],
  'Jorge Azcón':           ['azcón', 'azcon'],
  'Adrián Barbón':         ['barbón', 'barbon'],
  'Concepción Andreu':     ['concepción andreu', 'concepcion andreu'],

  // Internacional / institucional
  'Felipe VI':             ['felipe vi', 'el rey felipe'],
  'Letizia':               ['reina letizia'],
  'Cándido Conde-Pumpido': ['conde-pumpido', 'conde pumpido'],
  'Álvaro García Ortiz':   ['garcía ortiz', 'garcia ortiz'],
  'Christine Lagarde':     ['lagarde', 'christine lagarde'],
  'Ursula von der Leyen':  ['von der leyen', 'ursula von der leyen'],
  'Emmanuel Macron':       ['macron', 'emmanuel macron'],
  'Olaf Scholz':           ['scholz', 'olaf scholz'],
  'Friedrich Merz':        ['merz', 'friedrich merz'],
  'Giorgia Meloni':        ['meloni', 'giorgia meloni'],
  'Marine Le Pen':         ['le pen', 'marine le pen'],
  'Vladímir Putin':        ['putin', 'vladímir putin', 'vladimir putin'],
  'Volodímir Zelenski':    ['zelenski', 'zelensky'],
  'Donald Trump':          ['trump', 'donald trump'],
  'Benjamin Netanyahu':    ['netanyahu', 'benjamin netanyahu'],
  'Mohamed VI':            ['mohamed vi'],
}

// ── Empresas IBEX35 (con ticker y sector) ─────────────────────────────────
export interface IBEXCompany {
  label:  string
  ticker: string
  sector: string
  tokens: string[]
}

export const IBEX_COMPANIES: IBEXCompany[] = [
  { label: 'Banco Santander',    ticker: 'SAN',  sector: 'Banca',           tokens: ['banco santander', 'santander banco', 'el santander'] },
  { label: 'BBVA',               ticker: 'BBVA', sector: 'Banca',           tokens: ['bbva', 'banco bilbao vizcaya'] },
  { label: 'CaixaBank',          ticker: 'CABK', sector: 'Banca',           tokens: ['caixabank', 'la caixa'] },
  { label: 'Banco Sabadell',     ticker: 'SAB',  sector: 'Banca',           tokens: ['banco sabadell', 'sabadell banco'] },
  { label: 'Unicaja',            ticker: 'UNI',  sector: 'Banca',           tokens: ['unicaja'] },
  { label: 'Bankinter',          ticker: 'BKT',  sector: 'Banca',           tokens: ['bankinter'] },

  { label: 'Iberdrola',          ticker: 'IBE',  sector: 'Energía',         tokens: ['iberdrola'] },
  { label: 'Endesa',             ticker: 'ELE',  sector: 'Energía',         tokens: ['endesa'] },
  { label: 'Naturgy',            ticker: 'NTGY', sector: 'Energía',         tokens: ['naturgy', 'gas natural'] },
  { label: 'Repsol',             ticker: 'REP',  sector: 'Energía',         tokens: ['repsol'] },
  { label: 'Acciona Energía',    ticker: 'ANE',  sector: 'Energía',         tokens: ['acciona energía', 'acciona energia'] },
  { label: 'Solaria',            ticker: 'SLR',  sector: 'Energía',         tokens: ['solaria'] },
  { label: 'Redeia (REE)',       ticker: 'RED',  sector: 'Energía',         tokens: ['red eléctrica', 'red electrica', 'redeia'] },
  { label: 'Enagás',             ticker: 'ENG',  sector: 'Energía',         tokens: ['enagás', 'enagas'] },

  { label: 'Telefónica',         ticker: 'TEF',  sector: 'Telecom',         tokens: ['telefónica', 'telefonica', 'movistar'] },
  { label: 'Cellnex',            ticker: 'CLNX', sector: 'Telecom',         tokens: ['cellnex'] },
  { label: 'Indra',              ticker: 'IDR',  sector: 'Tecnología',      tokens: ['indra empresa', 'indra sistemas'] },
  { label: 'Amadeus',            ticker: 'AMS',  sector: 'Tecnología',      tokens: ['amadeus it', 'amadeus group'] },

  { label: 'Inditex',            ticker: 'ITX',  sector: 'Retail',          tokens: ['inditex', 'zara grupo', 'pull & bear'] },
  { label: 'Mercadona',          ticker: '—',    sector: 'Retail',          tokens: ['mercadona', 'juan roig'] },

  { label: 'Repsol Renovables',  ticker: 'RPS',  sector: 'Energía',         tokens: ['repsol renovables'] },
  { label: 'Acciona',            ticker: 'ANA',  sector: 'Infraestructura', tokens: ['acciona infra', 'grupo acciona'] },
  { label: 'Ferrovial',          ticker: 'FER',  sector: 'Infraestructura', tokens: ['ferrovial'] },
  { label: 'ACS',                ticker: 'ACS',  sector: 'Infraestructura', tokens: ['acs grupo', 'florentino pérez'] },
  { label: 'Sacyr',              ticker: 'SCYR', sector: 'Infraestructura', tokens: ['sacyr'] },
  { label: 'Aena',               ticker: 'AENA', sector: 'Infraestructura', tokens: ['aena'] },

  { label: 'Mapfre',             ticker: 'MAP',  sector: 'Seguros',         tokens: ['mapfre'] },
  { label: 'Línea Directa',      ticker: 'LDA',  sector: 'Seguros',         tokens: ['línea directa', 'linea directa aseguradora'] },

  { label: 'Grifols',            ticker: 'GRF',  sector: 'Salud',           tokens: ['grifols'] },
  { label: 'Rovi',               ticker: 'ROVI', sector: 'Salud',           tokens: ['laboratorios rovi'] },
  { label: 'Almirall',           ticker: 'ALM',  sector: 'Salud',           tokens: ['almirall'] },

  { label: 'IAG',                ticker: 'IAG',  sector: 'Turismo',         tokens: ['iag', 'iberia aerolíneas', 'iberia aerolineas', 'british airways'] },
  { label: 'Meliá Hotels',       ticker: 'MEL',  sector: 'Turismo',         tokens: ['meliá hotels', 'melia hotels'] },

  { label: 'ArcelorMittal',      ticker: 'MTS',  sector: 'Industrial',      tokens: ['arcelormittal', 'arcelor mittal'] },
  { label: 'Acerinox',           ticker: 'ACX',  sector: 'Industrial',      tokens: ['acerinox'] },
  { label: 'Fluidra',            ticker: 'FDR',  sector: 'Industrial',      tokens: ['fluidra'] },
  { label: 'Logista',            ticker: 'LOG',  sector: 'Distribución',    tokens: ['logista'] },

  { label: 'Merlin Properties',  ticker: 'MRL',  sector: 'Inmobiliario',    tokens: ['merlin properties'] },
  { label: 'Colonial',           ticker: 'COL',  sector: 'Inmobiliario',    tokens: ['inmobiliaria colonial'] },

  { label: 'Puig',               ticker: 'PUIG', sector: 'Consumo',         tokens: ['puig empresa', 'grupo puig'] },
  { label: 'Ebro Foods',         ticker: 'EBRO', sector: 'Alimentación',    tokens: ['ebro foods', 'arroz sos'] },
  { label: 'Viscofan',           ticker: 'VIS',  sector: 'Alimentación',    tokens: ['viscofan'] },
]

// ── Sectores con keywords para detección sin empresa concreta ─────────────
export const SECTORS: Record<string, string[]> = {
  'Banca':           ['banca', 'préstamo hipoteca', 'préstamos hipotecas', 'tipos de interés', 'bce', 'banco central europeo'],
  'Energía':         ['precio luz', 'factura luz', 'gas natural', 'renovables', 'transición ecológica', 'nuclear españa', 'gasolina', 'diesel'],
  'Telecom':         ['fibra óptica', 'cobertura móvil', '5g', 'operadora telefonía'],
  'Tecnología':      ['ciberseguridad', 'inteligencia artificial', 'ia generativa', 'startups', 'venture capital'],
  'Retail':          ['comercio minorista', 'apertura tienda', 'campaña navidad'],
  'Inmobiliario':    ['precio vivienda', 'mercado inmobiliario', 'reits', 'socimi', 'sareb'],
  'Infraestructura': ['licitación', 'obra pública', 'concesión autopista', 'ave'],
  'Turismo':         ['turistas', 'sector turístico', 'pernoctaciones', 'rsa hotelero'],
  'Salud':           ['farmacéutica', 'medicamento', 'sanidad privada', 'mutuas'],
  'Seguros':         ['aseguradora', 'pólizas seguros', 'siniestralidad'],
  'Alimentación':    ['cesta de la compra', 'precio alimentos', 'sector agrícola', 'ganadería'],
  'Automoción':      ['fabricantes automoción', 'coche eléctrico', 'vehículo eléctrico', 'seat', 'cupra'],
  'Defensa':         ['industria defensa', 'gasto militar', 'rearme', 'leopard tanques'],
  'Construcción':    ['sector construcción', 'visados obra', 'cemento'],
}

// ── Categorías con hints ──────────────────────────────────────────────────
export const CATEGORY_HINTS: Record<string, string[]> = {
  'Política':       ['partido', 'gobierno', 'congreso', 'senado', 'pp', 'psoe', 'vox', 'sumar', 'ministro', 'diputado', 'pleno', 'investidura', 'moción'],
  'Economía':       ['ibex', 'bolsa', 'bce', 'banco', 'inflación', 'paro', 'pib', 'salario', 'pensión', 'tipos de interés', 'mercado', 'beneficios'],
  'Empresas':       ['cotiza', 'cotización', 'opa', 'fusión empresa', 'beneficios netos', 'dividendo', 'inversores', 'capitalización'],
  'Internacional':  ['ucrania', 'rusia', 'gaza', 'israel', 'eeuu', 'estados unidos', 'china', 'otan', 'bruselas', 'ue ', 'parlamento europeo'],
  'Sociedad':       ['vivienda', 'alquiler', 'desahucio', 'sanidad', 'educación', 'pensionistas', 'igualdad', 'violencia', 'huelga'],
  'Justicia':       ['tribunal', 'juez', 'magistrado', 'fiscal', 'cgpj', 'sentencia', 'sumario', 'imputado', 'condena'],
  'Tecnología':     ['inteligencia artificial', 'ciberataque', 'datos personales', 'redes sociales', 'tiktok', 'startup'],
  'Cultura':        ['cine', 'música', 'concierto', 'festival', 'premio', 'libro', 'novela', 'museo', 'exposición'],
  'Deportes':       ['real madrid', 'fc barcelona', 'liga', 'champions', 'mundial', 'selección española', 'fútbol', 'baloncesto', 'tenis'],
  'Sucesos':        ['detenido', 'investigación policial', 'incendio', 'accidente tráfico', 'rescate', 'desaparecido'],
  'Clima':          ['dana ', 'tormenta', 'sequía', 'inundación', 'temperatura récord', 'cambio climático'],
  'Medio Ambiente': ['contaminación', 'emisiones co2', 'biodiversidad', 'parque natural', 'especie amenazada'],
}

// ── Emociones ──────────────────────────────────────────────────────────────
export const EMOTION_HINTS: Record<string, string[]> = {
  'indignación':  ['indignación', 'escándalo', 'vergonzoso', 'hipocresía', 'denuncia', 'corrupción', 'mentira', 'fraude'],
  'rabia':        ['enfado', 'rabia', 'furia', 'crisis', 'protesta', 'huelga'],
  'miedo':        ['miedo', 'amenaza', 'peligro', 'alerta', 'riesgo', 'colapso', 'caída', 'desplome'],
  'esperanza':    ['acuerdo', 'logro', 'éxito', 'récord positivo', 'avance', 'mejora', 'recuperación'],
  'ironía':       ['supuestamente', 'paradoja', 'curioso', 'irónico'],
  'preocupación': ['preocupación', 'inquietud', 'incertidumbre'],
}

// ── Objetivos (hints) ─────────────────────────────────────────────────────
export const GOAL_HINTS: Record<string, string[]> = {
  'Movilizar voto':                ['campaña', 'urnas', 'electores', 'votar', 'voto útil', 'votar útil'],
  'Erosionar al Gobierno':         ['fracaso gobierno', 'crisis gobierno', 'gobierno débil', 'incapaz', 'mentira'],
  'Defender al Gobierno':          ['logro gobierno', 'éxito ejecutivo', 'gestión gobierno'],
  'Polarizar territorio':          ['cataluña españa', 'separatismo', 'unidad', 'independencia', 'identidad nacional'],
  'Presionar por concesiones':     ['negociar', 'pacto', 'concesión', 'transferencia', 'cesión'],
  'Marcar agenda mediática':       ['centro debate', 'agenda', 'tema día'],
  'Cuestionar la justicia':        ['lawfare', 'persecución judicial', 'fiscalía política', 'jueces ideológicos'],
  'Defender intereses sectoriales':['sector se queja', 'patronal exige', 'piden ayudas'],
  'Cambiar el marco':              ['nuevo enfoque', 'reformular', 'redefinir', 'replantear'],
}

// ── CCAA → provincias ─────────────────────────────────────────────────────
export const CCAA_PROVINCES: Record<string, string[]> = {
  'Andalucía':          ['Almería', 'Cádiz', 'Córdoba', 'Granada', 'Huelva', 'Jaén', 'Málaga', 'Sevilla'],
  'Aragón':             ['Huesca', 'Teruel', 'Zaragoza'],
  'Asturias':           ['Asturias'],
  'Baleares':           ['Mallorca', 'Menorca', 'Ibiza', 'Formentera'],
  'Canarias':           ['Las Palmas', 'Santa Cruz de Tenerife'],
  'Cantabria':          ['Cantabria'],
  'Castilla-La Mancha': ['Albacete', 'Ciudad Real', 'Cuenca', 'Guadalajara', 'Toledo'],
  'Castilla y León':    ['Ávila', 'Burgos', 'León', 'Palencia', 'Salamanca', 'Segovia', 'Soria', 'Valladolid', 'Zamora'],
  'Cataluña':           ['Barcelona', 'Girona', 'Lleida', 'Tarragona'],
  'Valencia':           ['Alicante', 'Castellón', 'Valencia'],
  'Extremadura':        ['Badajoz', 'Cáceres'],
  'Galicia':            ['A Coruña', 'Lugo', 'Ourense', 'Pontevedra'],
  'Madrid':             ['Madrid'],
  'Murcia':             ['Murcia'],
  'Navarra':            ['Navarra'],
  'País Vasco':         ['Álava', 'Bizkaia', 'Gipuzkoa'],
  'La Rioja':           ['La Rioja'],
  'Ceuta':              ['Ceuta'],
  'Melilla':            ['Melilla'],
}

// ── Tokens por provincia (ciudades grandes + provincia) ───────────────────
export const PROVINCE_TOKENS: Record<string, string[]> = {
  'Almería': ['almería', 'almeria'],
  'Cádiz':   ['cádiz', 'cadiz', 'jerez', 'algeciras', 'san fernando'],
  'Córdoba': ['córdoba', 'cordoba'],
  'Granada': ['granada'],
  'Huelva':  ['huelva'],
  'Jaén':    ['jaén', 'jaen', 'úbeda', 'ubeda', 'linares'],
  'Málaga':  ['málaga', 'malaga', 'marbella', 'torremolinos', 'fuengirola'],
  'Sevilla': ['sevilla'],

  'Huesca':   ['huesca'],
  'Teruel':   ['teruel'],
  'Zaragoza': ['zaragoza'],

  'Asturias': ['asturias', 'oviedo', 'gijón', 'gijon', 'avilés', 'aviles'],

  'Mallorca':   ['mallorca', 'palma de mallorca'],
  'Menorca':    ['menorca'],
  'Ibiza':      ['ibiza', 'eivissa'],
  'Formentera': ['formentera'],

  'Las Palmas':              ['las palmas', 'gran canaria', 'lanzarote', 'fuerteventura'],
  'Santa Cruz de Tenerife':  ['tenerife', 'santa cruz de tenerife', 'la palma canaria', 'la gomera', 'el hierro'],

  'Cantabria': ['cantabria', 'santander'],

  'Albacete':     ['albacete'],
  'Ciudad Real':  ['ciudad real', 'puertollano', 'tomelloso'],
  'Cuenca':       ['cuenca'],
  'Guadalajara':  ['guadalajara'],
  'Toledo':       ['toledo', 'talavera de la reina'],

  'Ávila':        ['ávila', 'avila'],
  'Burgos':       ['burgos', 'miranda de ebro'],
  'León':         ['león', 'leon', 'ponferrada'],
  'Palencia':     ['palencia'],
  'Salamanca':    ['salamanca'],
  'Segovia':      ['segovia'],
  'Soria':        ['soria'],
  'Valladolid':   ['valladolid'],
  'Zamora':       ['zamora'],

  'Barcelona':   ['barcelona', 'l\'hospitalet', 'badalona', 'sabadell', 'terrassa'],
  'Girona':      ['girona', 'gerona', 'figueres'],
  'Lleida':      ['lleida', 'lérida'],
  'Tarragona':   ['tarragona', 'reus', 'salou'],

  'Alicante':    ['alicante', 'alacant', 'elche', 'benidorm', 'torrevieja'],
  'Castellón':   ['castellón', 'castellon', 'castelló'],
  'Valencia':    ['valencia', 'gandía', 'gandia', 'sagunto', 'paterna'],

  'Badajoz': ['badajoz', 'mérida', 'merida'],
  'Cáceres': ['cáceres', 'caceres', 'plasencia'],

  'A Coruña':  ['a coruña', 'coruña', 'la coruña', 'santiago de compostela', 'ferrol'],
  'Lugo':      ['lugo'],
  'Ourense':   ['ourense', 'orense'],
  'Pontevedra':['pontevedra', 'vigo'],

  'Madrid': ['madrid capital', 'comunidad de madrid', 'móstoles', 'mostoles', 'alcalá de henares', 'alcala de henares', 'getafe', 'leganés', 'leganes', 'fuenlabrada', 'parla'],

  'Murcia':  ['murcia', 'cartagena', 'lorca', 'molina de segura'],
  'Navarra': ['navarra', 'pamplona', 'tudela'],

  'Álava':     ['álava', 'alava', 'araba', 'vitoria-gasteiz', 'vitoria gasteiz'],
  'Bizkaia':   ['bizkaia', 'vizcaya', 'bilbao', 'getxo', 'barakaldo'],
  'Gipuzkoa':  ['gipuzkoa', 'guipúzcoa', 'guipuzcoa', 'donostia', 'san sebastián', 'san sebastian', 'irún', 'irun'],

  'La Rioja': ['la rioja', 'logroño', 'logrono'],

  'Ceuta':   ['ceuta'],
  'Melilla': ['melilla'],
}

// ── Mapeo nombre provincia → CCAA inverso (helper) ───────────────────────
export const PROVINCE_TO_CCAA: Record<string, string> = (() => {
  const out: Record<string, string> = {}
  for (const [ccaa, provs] of Object.entries(CCAA_PROVINCES)) {
    for (const p of provs) out[p] = ccaa
  }
  return out
})()
