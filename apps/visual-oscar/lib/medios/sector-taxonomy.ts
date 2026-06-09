/**
 * Taxonomía de SECTOR · fuente única de verdad para clasificar noticias y
 * narrativas por sector económico/temático, alineada con los módulos
 * sectoriales de la plataforma (/sector-*) + transversales.
 *
 * Clasificador HÍBRIDO:
 *   1. Heurístico (este módulo): léxico ponderado por sector con
 *      entidades+leyes (alta señal), términos (media) y negativos (penalización)
 *      para desambiguar. Determinista, rápido, sin coste.
 *   2. Fallback LLM (classifySectorsWithLLM): solo para los que el heurístico
 *      deja en 'otro'. Reusa el cliente del pipeline canónico (Gemini/Groq);
 *      degrada a heurístico si no hay API key (StubLlmClient).
 *
 * Matching Unicode-aware (lookarounds \p{L}\p{N}) para respetar tildes/ñ y
 * evitar falsos positivos por subcadena (p.ej. "gas" dentro de "gasto").
 */

export type SectorKey =
  | 'energia'
  | 'defensa'
  | 'farma'
  | 'banca'
  | 'vivienda'
  | 'agro'
  | 'telecom'
  | 'infraestructuras'
  | 'turismo'
  | 'tercer_sector'
  | 'politica_institucional'
  | 'internacional'
  | 'justicia'
  | 'economia'
  | 'otro'

export const SECTOR_LABELS: Record<SectorKey, string> = {
  energia: 'Energía',
  defensa: 'Defensa',
  farma: 'Farma y sanidad',
  banca: 'Banca y finanzas',
  vivienda: 'Vivienda',
  agro: 'Agroalimentario',
  telecom: 'Telecom y tecnología',
  infraestructuras: 'Infraestructuras',
  turismo: 'Turismo',
  tercer_sector: 'Tercer sector',
  politica_institucional: 'Política e instituciones',
  internacional: 'Internacional',
  justicia: 'Justicia',
  economia: 'Economía y macro',
  otro: 'Otros',
}

export const SECTOR_COLORS: Record<SectorKey, string> = {
  energia: '#16A34A',
  defensa: '#475569',
  farma: '#0891B2',
  banca: '#1E40AF',
  vivienda: '#B45309',
  agro: '#65A30D',
  telecom: '#7C3AED',
  infraestructuras: '#0F766E',
  turismo: '#DB2777',
  tercer_sector: '#DC2626',
  politica_institucional: '#1F4E8C',
  internacional: '#9333EA',
  justicia: '#374151',
  economia: '#CA8A04',
  otro: '#9CA3AF',
}

// Sectoriales (específicos) · ganan a las transversales en empates cercanos.
const SECTORIAL: SectorKey[] = [
  'energia', 'defensa', 'farma', 'banca', 'vivienda', 'agro',
  'telecom', 'infraestructuras', 'turismo', 'tercer_sector', 'justicia',
]

interface Lex { high: string[]; med: string[]; neg: string[] }

// high = entidades + leyes/programas (señal fuerte) · med = términos · neg = falsos positivos
const LEXICONS: Record<Exclude<SectorKey, 'otro'>, Lex> = {
  energia: {
    high: ['repsol', 'naturgy', 'iberdrola', 'endesa', 'red eléctrica', 'red electrica', 'redeia', 'enagás', 'enagas', 'cnmc', 'miteco', 'omie', 'mibgas', 'cepsa', 'moeve', 'edp', 'acciona energía', 'acciona energia', 'engie', 'totalenergies', 'galp', 'holaluz', 'solaria', 'grenergy', 'ecoener', 'idae', 'consejo de seguridad nuclear', 'enresa', 'foro nuclear', 'ministerio para la transición ecológica', 'agencia internacional de la energía', 'opep', 'medgaz', 'nord stream', 'pniec', 'plan nacional integrado de energía y clima', 'ley de cambio climático', 'ley de cambio climatico', 'excepción ibérica', 'excepcion iberica', 'mecanismo ibérico', 'tope al gas', 'subasta de renovables', 'repowereu', 'pacto verde europeo', 'green deal', 'ley del sector eléctrico', 'perte de hidrógeno', 'plan +se'],
    med: ['tarifa de la luz', 'precio de la luz', 'factura de la luz', 'factura eléctrica', 'factura electrica', 'pvpc', 'megavatio', 'kilovatio hora', 'gigavatio', 'gasoducto', 'hidrógeno verde', 'hidrogeno verde', 'autoconsumo', 'peaje eléctrico', 'peaje electrico', 'mercado eléctrico', 'mercado electrico', 'mercado mayorista', 'comercializadora', 'tarifa regulada', 'bono social', 'gas natural', 'gas natural licuado', 'regasificadora', 'ciclo combinado', 'central nuclear', 'central térmica', 'central termica', 'parque eólico', 'parque eolico', 'parque solar', 'planta fotovoltaica', 'energía renovable', 'energia renovable', 'energías renovables', 'energias renovables', 'energía solar', 'energia solar', 'fotovoltaica', 'energía eólica', 'energia eolica', 'eólica marina', 'energía hidroeléctrica', 'energia hidroelectrica', 'almacenamiento energético', 'punto de recarga', 'apagón eléctrico', 'déficit de tarifa', 'deficit de tarifa', 'seguridad de suministro', 'pobreza energética', 'pobreza energetica', 'comunidad energética', 'transición energética', 'transicion energetica', 'descarbonización', 'descarbonizacion', 'derechos de emisión', 'derechos de emision', 'precio del petróleo', 'precio del petroleo', 'precio del gas', 'refinería', 'refineria', 'biometano', 'mix energético', 'mix energetico', 'demanda eléctrica', 'combustible nuclear', 'residuos radiactivos', 'cierre nuclear', 'subasta eléctrica'],
    neg: ['energía positiva', 'energía vital', 'bebida energética', 'energía mental', 'lleno de energía', 'central de autobuses', 'central lechera', 'central de compras', 'casa solar', 'gas de la risa', 'tope de gama', 'dar luz verde', 'luz de gas', 'salir a la luz', 'luz al final del túnel', 'molino de viento', 'renovación del carné', 'renovar el dni'],
  },
  defensa: {
    high: ['indra', 'navantia', 'airbus defence', 'santa bárbara sistemas', 'expal', 'escribano', 'sapa placencia', 'tecnobit', 'grupo oesía', 'sener aeroespacial', 'instalaza', 'tess defence', 'eurofighter', 'leonardo', 'thales', 'rheinmetall', 'mbda', 'knds', 'lockheed martin', 'raytheon', 'isdefe', 'hisdesat', 'ministerio de defensa', 'estado mayor de la defensa', 'centro nacional de inteligencia', 'ejército de tierra', 'ejército del aire', 'inta', 'instituto nacional de técnica aeroespacial', 'tedae', 'agencia europea de defensa', 'plan de rearme europeo', 'rearm europe', 'fondo europeo de defensa', 'cooperación estructurada permanente', 'fcas', 'futuro sistema aéreo de combate', 'fragata f-110', 'submarino s-80', 'submarino isaac peral', 'carro leopard', 'ley de la carrera militar', 'estrategia de seguridad nacional', 'brújula estratégica', 'european sky shield'],
    med: ['gasto militar', 'gasto en defensa', 'presupuesto de defensa', 'inversión en defensa', 'industria de defensa', 'industria militar', 'material de defensa', 'programa de armamento', 'sistema de armas', 'buque de guerra', 'fragata', 'submarino', 'corbeta', 'portaaviones', 'carro de combate', 'vehículo blindado', 'misil', 'munición', 'dron militar', 'dron de combate', 'caza de combate', 'avión de combate', 'helicóptero de ataque', 'radar militar', 'guerra electrónica', 'defensa antiaérea', 'escudo antimisiles', 'ciberdefensa', 'guerra híbrida', 'disuasión nuclear', 'rearme', 'rearme europeo', 'capacidades militares', 'fuerzas armadas', 'despliegue militar', 'misión de paz', 'operación militar', 'ejercicios militares', 'maniobras militares', 'flanco este', 'flanco sur', 'exportación de armas', 'venta de armas', 'autonomía estratégica', 'inteligencia militar', 'base militar', 'base naval', 'base aérea', 'gasto del 2% del pib', 'objetivo del 2% del pib'],
    neg: ['defensa del consumidor', 'defensa de la competencia', 'defensa jurídica', 'abogado defensor', 'defensa personal', 'defensa propia', 'legítima defensa', 'defensa central', 'línea defensiva', 'defensa del título', 'defensa de la tesis', 'defensa numantina', 'autodefensa', 'seguridad social', 'seguridad vial', 'seguridad alimentaria', 'seguridad jurídica', 'guardia civil de tráfico'],
  },
  farma: {
    high: ['pfizer', 'moderna', 'astrazeneca', 'janssen', 'novartis', 'roche', 'sanofi', 'gsk', 'bayer', 'abbvie', 'eli lilly', 'gilead', 'novo nordisk', 'almirall', 'grifols', 'pharmamar', 'faes farma', 'reig jofre', 'esteve', 'cinfa', 'rovi', 'hipra', 'ministerio de sanidad', 'aemps', 'agencia española de medicamentos', 'agencia europea del medicamento', 'farmaindustria', 'cofares', 'quirónsalud', 'quironsalud', 'vithas', 'sanitas', 'adeslas', 'instituto carlos iii', 'osakidetza', 'servicio andaluz de salud', 'semfyc', 'ley del medicamento', 'ley general de sanidad', 'estrategia farmacéutica para europa', 'plan nacional de resistencia a antibióticos', 'perte salud de vanguardia', 'estrategia de salud mental'],
    med: ['medicamento', 'fármaco', 'principio activo', 'vacuna', 'vacunación', 'ensayo clínico', 'ensayos clínicos', 'patente farmacéutica', 'medicamento genérico', 'biosimilar', 'farmacovigilancia', 'desabastecimiento de medicamentos', 'precio de referencia', 'financiación de medicamentos', 'copago farmacéutico', 'receta electrónica', 'oficina de farmacia', 'atención primaria', 'lista de espera', 'lista de espera quirúrgica', 'saturación de urgencias', 'terapia génica', 'medicamento huérfano', 'enfermedad rara', 'investigación biomédica', 'biotecnología', 'gasto farmacéutico', 'anticuerpo monoclonal', 'inmunoterapia', 'oncología', 'salud pública', 'pandemia', 'antibióticos', 'resistencia antimicrobiana', 'hemoderivados', 'trasplante', 'donación de órganos', 'adherencia terapéutica', 'telemedicina', 'salud mental', 'vacuna del covid', 'vacuna de la gripe', 'urgencias hospitalarias', 'guardias médicas'],
    neg: ['sanidad vegetal', 'sanidad animal', 'salud financiera', 'salud de la economía', 'vacuna informática', 'receta del éxito', 'diagnóstico económico', 'diagnóstico electoral', 'terapia de pareja', 'tratamiento de datos', 'inmunidad parlamentaria', 'inmunidad diplomática', 'contagio bursátil', 'fiebre compradora', 'cirugía fiscal', 'epidemia de bulos', 'virus informático', 'salud democrática'],
  },
  banca: {
    high: ['banco santander', 'bbva', 'caixabank', 'banco sabadell', 'bankinter', 'unicaja', 'abanca', 'kutxabank', 'ibercaja', 'cajamar', 'deutsche bank', 'openbank', 'banca march', 'renta 4', 'wizink', 'myinvestor', 'banco mediolanum', 'bankia', 'banco popular', 'cnmv', 'banco de españa', 'frob', 'sareb', 'banco central europeo', 'eurogrupo', 'junta única de resolución', 'aebanca', 'inverco', 'blackrock', 'mifid ii', 'basilea iii', 'ley hipotecaria', 'ley de crédito inmobiliario', 'reglamento mica', 'impuesto temporal a la banca', 'gravamen extraordinario a la banca', 'unión bancaria', 'euro digital'],
    med: ['tipos de interés', 'euríbor', 'préstamo hipotecario', 'crédito al consumo', 'margen de intereses', 'comisiones bancarias', 'depósitos bancarios', 'cuenta remunerada', 'morosidad', 'tasa de mora', 'ratio de morosidad', 'solvencia', 'ratio cet1', 'recompra de acciones', 'opa hostil', 'fusión bancaria', 'integración bancaria', 'test de estrés', 'pruebas de resistencia', 'impuesto a la banca', 'gravamen a la banca', 'fondo de garantía de depósitos', 'cláusula suelo', 'participaciones preferentes', 'rescate bancario', 'activos tóxicos', 'banca de inversión', 'banca privada', 'gestión de activos', 'fondos de inversión', 'planes de pensiones', 'renta fija', 'renta variable', 'letras del tesoro', 'prima de riesgo', 'blanqueo de capitales', 'refinanciación'],
    neg: ['banco de pruebas', 'banco de datos', 'banco de sangre', 'banco de alimentos', 'banco de niebla', 'banco de peces', 'banco azul', 'banco del parque', 'banco de semillas', 'fondo de armario', 'fondo del mar', 'fondo de pantalla', 'préstamo lingüístico', 'bolsa de trabajo', 'bolsa de basura', 'mercado de abastos', 'mercado central', 'rescate en montaña', 'rescate de animales', 'capital humano'],
  },
  vivienda: {
    high: ['aedas homes', 'neinor homes', 'metrovacesa', 'vía célere', 'habitat inmobiliaria', 'culmia', 'merlin properties', 'inmobiliaria colonial', 'lar españa', 'realia', 'testa residencial', 'azora', 'blackstone', 'cerberus', 'anticipa', 'aliseda', 'servihabitat', 'solvia', 'sareb', 'idealista', 'fotocasa', 'habitaclia', 'tinsa', 'ministerio de vivienda', 'asprima', 'ley de vivienda', 'ley por el derecho a la vivienda', 'plan estatal de vivienda', 'bono joven al alquiler', 'bono alquiler joven', 'ley de arrendamientos urbanos', 'ley de suelo', 'declaración de zona tensionada', 'plan de vivienda asequible'],
    med: ['vivienda protegida', 'vivienda de protección oficial', 'vivienda social', 'vivienda asequible', 'vivienda pública', 'vivienda en alquiler', 'alquiler de vivienda', 'precio del alquiler', 'alquiler asequible', 'alquiler social', 'alquiler turístico', 'vivienda turística', 'zona tensionada', 'zonas de mercado tensionado', 'tope al alquiler', 'límite al alquiler', 'precio de la vivienda', 'compraventa de viviendas', 'subrogación hipotecaria', 'obra nueva', 'vivienda usada', 'promoción inmobiliaria', 'promotor inmobiliario', 'suelo urbanizable', 'recalificación de suelo', 'licencia de obra', 'cédula de habitabilidad', 'ocupación ilegal', 'desahucio', 'lanzamiento hipotecario', 'gran tenedor', 'grandes tenedores', 'fondos buitre', 'socimi', 'build to rent', 'coliving', 'rehabilitación de vivienda', 'certificado energético', 'infravivienda', 'burbuja inmobiliaria', 'parque público de vivienda', 'vivienda vacía', 'precio por metro cuadrado', 'stock de vivienda'],
    neg: ['casa real', 'casa blanca', 'casa de apuestas', 'casa del pueblo', 'suelo agrícola', 'suelo pélvico', 'hipoteca emocional', 'construcción de paz', 'construcción europea', 'promoción interna', 'promoción de la salud', 'obra de teatro', 'obra social', 'obra maestra', 'alquiler de coches', 'alquiler de bicicletas', 'registro civil', 'registro mercantil'],
  },
  agro: {
    high: ['asaja', 'coag', 'upa', 'cooperativas agroalimentarias', 'fepex', 'interporc', 'provacuno', 'fiab', 'pescanova', 'ebro foods', 'viscofan', 'campofrío', 'elpozo', 'grupo fuertes', 'dcoop', 'covap', 'central lechera asturiana', 'calidad pascual', 'deoleo', 'anecoop', 'incarlopsa', 'casa tarradellas', 'garcía carrión', 'freixenet', 'codorníu', 'ministerio de agricultura', 'ministerio de agricultura pesca y alimentación', 'fega', 'aica', 'política agraria común', 'ley de la cadena alimentaria', 'ley de cadena alimentaria', 'política pesquera común', 'de la granja a la mesa', 'farm to fork', 'ley de bienestar animal', 'plan estratégico de la pac', 'ecorregímenes', 'ecoesquemas'],
    med: ['agricultura', 'agricultores', 'ganadería', 'ganadero', 'ganaderos', 'explotación agraria', 'explotación ganadera', 'sector primario', 'flota pesquera', 'caladero', 'acuicultura', 'cofradía de pescadores', 'cuota pesquera', 'descartes pesqueros', 'aceite de oliva', 'olivar', 'almazara', 'campaña oleícola', 'viñedo', 'vendimia', 'denominación de origen', 'indicación geográfica protegida', 'bodega', 'regadío', 'secano', 'cosecha', 'frutas y hortalizas', 'cítricos', 'cabaña porcina', 'cabaña ganadera', 'sector lácteo', 'precio de la leche', 'matadero', 'peste porcina africana', 'gripe aviar', 'lengua azul', 'fitosanitario', 'plaguicida', 'soberanía alimentaria', 'cadena alimentaria', 'precios en origen', 'venta a pérdidas', 'renta agraria', 'seguro agrario', 'agroseguro', 'industria alimentaria', 'agroalimentario', 'agroalimentaria', 'comunidad de regantes', 'tractorada', 'plátano de canarias', 'atún rojo'],
    neg: ['banco santander', 'cosecha electoral', 'sembrar dudas', 'campo de batalla', 'pescar votos', 'pescar en río revuelto', 'aceite de motor', 'leche de tigre', 'campo de concentración', 'dar sus frutos', 'semilla de la discordia', 'ganar terreno', 'tierra de nadie', 'mar de fondo', 'fruta prohibida', 'naranja mecánica', 'pasto de las llamas', 'alimentar el debate', 'trigo limpio'],
  },
  telecom: {
    high: ['telefónica', 'movistar', 'vodafone', 'masorange', 'másmóvil', 'masmovil', 'yoigo', 'digi spain', 'jazztel', 'pepephone', 'cellnex', 'ericsson', 'nokia', 'huawei', 'amazon web services', 'microsoft azure', 'google cloud', 'red.es', 'incibe', 'ccn-cert', 'hispasat', 'starlink', 'ametic', 'ley general de telecomunicaciones', 'kit digital', 'españa digital 2026', 'perte de chip', 'perte de semiconductores', 'reglamento dma', 'ley de mercados digitales', 'reglamento dsa', 'ley de servicios digitales', 'reglamento de ia', 'ai act', 'gigabit act', 'directiva nis2', 'chips act', 'plan nacional 5g'],
    med: ['fibra óptica', 'banda ancha', 'redes 5g', 'espectro radioeléctrico', 'subasta de espectro', 'subasta de frecuencias', 'despliegue de fibra', 'cobertura móvil', 'zonas blancas', 'brecha digital', 'portabilidad', 'tarifa móvil', 'operador móvil virtual', 'neutralidad de la red', 'centro de datos', 'data center', 'computación en la nube', 'ciberataque', 'ransomware', 'inteligencia artificial', 'ia generativa', 'semiconductores', 'fábrica de chips', 'computación cuántica', 'ordenador cuántico', 'internet de las cosas', 'comunicaciones por satélite', 'internet por satélite', 'torres de telecomunicaciones', 'antenas de telefonía', 'transformación digital', 'digitalización', 'telecomunicaciones', 'fusión de operadoras', 'gigabit'],
    neg: ['orange is the new black', 'red social', 'red de carreteras', 'red eléctrica', 'red ferroviaria', 'fibra alimentaria', 'fibra muscular', 'movistar team', 'chip de mascota', 'núcleo familiar', 'cobertura informativa', 'cobertura sanitaria', 'espectro político', '5 estrellas', 'banda de música', 'banda sonora', 'frecuencia cardíaca', 'antena de la tele'],
  },
  infraestructuras: {
    high: ['adif', 'renfe', 'aena', 'puertos del estado', 'ferrovial', 'sacyr', 'acciona', 'abertis', 'globalvia', 'alsa', 'iryo', 'ouigo', 'ilsa', 'talgo', 'construcciones y auxiliar de ferrocarriles', 'siemens mobility', 'alstom', 'mitma', 'ministerio de transportes', 'dirección general de tráfico', 'enaire', 'agencia estatal de seguridad aérea', 'metro de madrid', 'ferrocarrils de la generalitat', 'puerto de algeciras', 'puerto de valencia', 'puerto de barcelona', 'ley del sector ferroviario', 'ley de carreteras', 'ley de movilidad sostenible', 'corredor mediterráneo', 'corredor atlántico', 'plan director del corredor mediterráneo', 'abono gratuito de renfe', 'descuento de cercanías'],
    med: ['alta velocidad', 'línea de alta velocidad', 'red transeuropea de transporte', 'infraestructura ferroviaria', 'ancho de vía', 'electrificación de la línea', 'señalización ferroviaria', 'estación intermodal', 'soterramiento', 'túnel ferroviario', 'viaducto', 'obra civil', 'autovía', 'autopista', 'peaje en sombra', 'rescate de autopistas', 'concesión de autopista', 'carretera nacional', 'circunvalación', 'obra pública', 'licitación de obra', 'conservación de carreteras', 'tuneladora', 'puerto de interés general', 'dragado', 'terminal de contenedores', 'tráfico portuario', 'transporte marítimo', 'ampliación del aeropuerto', 'pista de aterrizaje', 'control aéreo', 'slots aeroportuarios', 'tasa aeroportuaria', 'movilidad sostenible', 'transporte público', 'intermodalidad', 'plataforma logística', 'transporte de mercancías', 'liberalización ferroviaria', 'abono de transporte', 'zona de bajas emisiones', 'carril bici', 'metro ligero', 'cercanías'],
    neg: ['red eléctrica', 'infraestructura digital', 'gasoducto', 'oleoducto', 'tren de la bruja', 'autopista de la información', 'puerto usb', 'puerto de mando', 'metro cuadrado', 'puente festivo', 'puente de mayo', 'estación de esquí', 'estación meteorológica', 'estación espacial', 'vía láctea', 'vía crucis', 'túnel del tiempo', 'túnel carpiano', 'obra de teatro', 'obra maestra'],
  },
  turismo: {
    high: ['meliá', 'melia hotels', 'nh hotels', 'minor hotels', 'riu hotels', 'iberostar', 'barceló', 'h10 hotels', 'palladium hotel group', 'eurostars', 'grupo hotusa', 'paradores', 'globalia', 'ávoris', 'logitravel', 'edreams', 'civitatis', 'hotelbeds', 'booking.com', 'airbnb', 'tripadvisor', 'ryanair', 'easyjet', 'turespaña', 'cehat', 'hostelería de españa', 'exceltur', 'mesa del turismo', 'segittur', 'ley de turismo', 'plan de turismo sostenible', 'estrategia de turismo sostenible 2030', 'viajes del imserso', 'moratoria turística', 'tasa turística', 'ecotasa', 'registro único de alquileres turísticos'],
    med: ['hostelería', 'sector hotelero', 'ocupación hotelera', 'pernoctaciones', 'rentabilidad hotelera', 'establecimientos hoteleros', 'plazas hoteleras', 'turismo de sol y playa', 'turismo rural', 'turismo cultural', 'turismo gastronómico', 'turismo de congresos', 'turismo de lujo', 'turismo de cruceros', 'llegada de turistas', 'turistas internacionales', 'turistas extranjeros', 'gasto turístico', 'temporada turística', 'temporada alta', 'agencias de viajes', 'touroperador', 'paquete turístico', 'viajes combinados', 'alojamiento turístico', 'vivienda de uso turístico', 'apartamento turístico', 'pisos turísticos', 'alquiler vacacional', 'estrella michelin', 'guía michelin', 'tasa turística', 'turismo senior', 'saturación turística', 'turismofobia', 'conectividad aérea', 'destino turístico', 'enoturismo', 'récord de turistas', 'casas rurales', 'turismo de salud'],
    neg: ['ronaldo nazário', 'estrella galicia', 'estrella damm', 'menú desplegable', 'carta de presentación', 'carta magna', 'puente aéreo político', 'grupo planeta', 'michelin neumáticos', 'viajes en el tiempo', 'viaje espiritual', 'destino manifiesto', 'temporada de fútbol', 'temporada de caza', 'albergue de animales', 'camping musical'],
  },
  tercer_sector: {
    high: ['cruz roja', 'cáritas', 'caritas', 'manos unidas', 'médicos sin fronteras', 'oxfam intermón', 'save the children', 'unicef', 'acnur', 'aldeas infantiles', 'ayuda en acción', 'fundación once', 'fundación la caixa', 'plataforma del tercer sector', 'plataforma de voluntariado de españa', 'fundación cepaim', 'provivienda', 'accem', 'comisión española de ayuda al refugiado', 'fundación secretariado gitano', 'cermi', 'plena inclusión', 'cocemfe', 'asociación española contra el cáncer', 'fundación josep carreras', 'amnistía internacional', 'fundación vicente ferrer', 'banco de alimentos', 'congde', 'ministerio de derechos sociales', 'ley del tercer sector', 'ley de mecenazgo', 'ley del voluntariado', 'ley de cooperación al desarrollo', 'x solidaria', 'agenda 2030'],
    med: ['tercer sector', 'tercer sector de acción social', 'entidad sin ánimo de lucro', 'sin ánimo de lucro', 'organización no gubernamental', 'entidad no lucrativa', 'voluntariado', 'voluntarios', 'acción social', 'economía social', 'filantropía', 'mecenazgo', 'captación de fondos', 'fundraising', 'ayuda humanitaria', 'cooperación al desarrollo', 'ayuda al desarrollo', 'inclusión social', 'exclusión social', 'personas sin hogar', 'sinhogarismo', 'lucha contra la pobreza', 'pobreza infantil', 'vulnerabilidad social', 'colectivos vulnerables', 'comedor social', 'reparto de alimentos', 'declaración de utilidad pública', 'convocatoria de subvenciones', 'asignación tributaria', 'casilla solidaria', 'memoria de actividades', 'tejido asociativo', 'movimiento asociativo', 'emergencia humanitaria', 'acogida de refugiados', 'atención a migrantes'],
    neg: ['fundación del español urgente', 'fundéu', 'fundación real madrid', 'ong empresarial', 'club social', 'red social', 'seguridad social', 'trabajador social', 'vivienda social', 'bono social', 'capital social', 'razón social', 'objeto social', 'sociedad anónima', 'sociedad limitada', 'voluntad política', 'donante de sangre', 'fondo social europeo', 'asociación de vecinos', 'asociación de empresarios'],
  },
  justicia: {
    high: ['tribunal supremo', 'audiencia nacional', 'tribunal constitucional', 'consejo general del poder judicial', 'fiscalía general del estado', 'fiscalia general del estado', 'fiscalía anticorrupción', 'fiscalia anticorrupcion', 'fiscalía europea', 'ministerio de justicia', 'abogacía del estado', 'tribunal superior de justicia', 'audiencia provincial', 'tribunal de justicia de la unión europea', 'tribunal europeo de derechos humanos', 'colegio de abogados', 'instituciones penitenciarias', 'ley orgánica del poder judicial', 'ley de enjuiciamiento criminal', 'código penal', 'ley del solo sí es sí', 'ley de garantía de la libertad sexual', 'ley de amnistía', 'ley de amnistia', 'ley de memoria democrática', 'ley de eficiencia procesal', 'reforma del cgpj', 'mecanismo de estado de derecho', 'ley concursal', 'ley de segunda oportunidad'],
    med: ['sentencia', 'auto judicial', 'querella', 'imputación', 'investigado', 'encausado', 'procesamiento', 'prisión provisional', 'prision provisional', 'libertad provisional', 'recurso de amparo', 'recurso de casación', 'cuestión prejudicial', 'vista oral', 'juicio oral', 'sala de lo penal', 'sobreseimiento', 'archivo de la causa', 'diligencias previas', 'instrucción del caso', 'magistrado', 'acusación particular', 'acusación popular', 'delito de malversación', 'cohecho', 'prevaricación', 'tráfico de influencias', 'alzamiento de bienes', 'reforma judicial', 'renovación del cgpj', 'independencia judicial', 'separación de poderes', 'lawfare', 'colapso judicial', 'turno de oficio', 'justicia gratuita', 'orden de detención europea', 'extradición', 'estado de derecho'],
    neg: ['juicio crítico', 'juzgar un partido', 'sentencia de la vida', 'tribunal de la opinión pública', 'corte inglesa', 'corte de pelo', 'política fiscal', 'justicia social', 'justicia climática', 'justicia fiscal', 'ley de oferta y demanda', 'ley de murphy', 'registro mercantil', 'registro de la jornada', 'caso de estudio', 'apelar a la calma', 'veredicto del mercado'],
  },
  politica_institucional: {
    high: ['la moncloa', 'congreso de los diputados', 'tribunal constitucional', 'consejo general del poder judicial', 'junta electoral central', 'tribunal de cuentas', 'partido popular', 'psoe', 'sumar', 'podemos', 'erc', 'junts', 'eh bildu', 'coalición canaria', 'más madrid', 'consejo de ministros', 'diputación permanente', 'constitución española', 'ley electoral', 'loreg', 'ley de transparencia', 'ley de memoria democrática', 'reforma del cgpj', 'presupuestos generales del estado', 'ley de financiación autonómica', 'reglamento del congreso', 'pacto de toledo', 'ley de bases de régimen local'],
    med: ['moción de censura', 'cuestión de confianza', 'sesión de investidura', 'debate de investidura', 'sesión de control', 'real decreto ley', 'proyecto de ley', 'proposición de ley', 'enmienda a la totalidad', 'convalidación del decreto', 'tramitación parlamentaria', 'grupo parlamentario', 'mayoría absoluta', 'gobierno de coalición', 'pacto de investidura', 'remodelación del gobierno', 'crisis de gobierno', 'cese ministerial', 'vicepresidente del gobierno', 'presidente del gobierno', 'financiación autonómica', 'transferencia de competencias', 'cupo vasco', 'estatuto de autonomía', 'elecciones generales', 'elecciones autonómicas', 'campaña electoral', 'jornada de reflexión', 'sondeo electoral', 'barómetro del cis', 'comisión de investigación', 'interpelación parlamentaria', 'disolución de las cortes', 'elecciones anticipadas', 'transfuguismo', 'techo de gasto', 'puertas giratorias', 'renovación del cgpj', 'artículo 155', 'reforma constitucional', 'mesa de diálogo'],
    neg: ['partido de fútbol', 'partido amistoso', 'constitución de la empresa', 'constitución física', 'senado romano', 'junta directiva', 'junta de accionistas', 'gobierno corporativo', 'cámara de comercio', 'campaña de marketing', 'campaña publicitaria', 'elecciones sindicales de empresa', 'presupuesto familiar', 'presupuesto de obra', 'comisión bancaria', 'decreto de divorcio'],
  },
  internacional: {
    high: ['consejo de seguridad', 'alto representante', 'kaja kallas', 'ursula von der leyen', 'antónio guterres', 'mark rutte', 'banco mundial', 'mercosur', 'casa blanca', 'kremlin', 'pentágono', 'departamento de estado', 'vladímir putin', 'volodímir zelenski', 'zelenski', 'xi jinping', 'netanyahu', 'hamás', 'hizbulá', 'hezbolá', 'wagner', 'ministerio de asuntos exteriores', 'josé manuel albares', 'corte penal internacional', 'tribunal penal internacional', 'oiea', 'unrwa', 'carta de las naciones unidas', 'artículo 5 de la otan', 'tratado de lisboa', 'acuerdos de minsk', 'acuerdos de abraham', 'global gateway', 'tratado de no proliferación'],
    med: ['geopolítica', 'política exterior', 'politica exterior', 'diplomacia', 'alto el fuego', 'tregua', 'invasión', 'ofensiva', 'anexión', 'negociaciones de paz', 'acuerdo de paz', 'ayuda militar', 'carrera armamentística', 'amenaza híbrida', 'injerencia', 'multilateralismo', 'guerra comercial', 'aranceles', 'estrecho de ormuz', 'mar rojo', 'indo-pacífico', 'flanco oriental', 'ampliación de la otan', 'adhesión a la ue', 'expulsión de diplomáticos', 'relaciones bilaterales', 'crisis migratoria', 'frontera sur', 'sáhara occidental', 'frente polisario', 'oriente próximo', 'oriente medio', 'franja de gaza', 'cisjordania', 'donbás', 'sahel', 'cuerno de áfrica', 'esfera de influencia', 'orden mundial', 'no proliferación', 'cascos azules', 'misiles balísticos'],
    neg: ['liga de campeones', 'champions league', 'mundial de fútbol', 'selección española', 'guerra de precios', 'guerra de ofertas', 'frente frío', 'frente atmosférico', 'borrasca', 'invasión de medusas', 'embajador de marca', 'diplomacia de la camiseta', 'tregua navideña', 'guerra de streaming', 'ofensiva de rebajas'],
  },
  economia: {
    high: ['banco de españa', 'airef', 'ministerio de economía', 'ministerio de hacienda', 'tesoro público', 'agencia tributaria', 'fondo monetario internacional', 'banco central europeo', 'eurostat', 'ocde', 'eurogrupo', 'ecofin', 'mecanismo europeo de estabilidad', 'fedea', 'funcas', 'bbva research', 'caixabank research', "moody's", 'standard and poor', 's&p global', 'fitch ratings', 'agencias de rating', 'plan de recuperación', 'fondos next generation', 'next generation eu', 'mecanismo de recuperación y resiliencia', 'pacto de estabilidad y crecimiento', 'reglas fiscales europeas', 'semestre europeo', 'reforma de las pensiones', 'mecanismo de equidad intergeneracional', 'ley de presupuestos generales del estado'],
    med: ['producto interior bruto', 'crecimiento económico', 'recesión', 'estanflación', 'índice de precios al consumo', 'inflación', 'deflación', 'inflación subyacente', 'tasa de paro', 'tasa de desempleo', 'encuesta de población activa', 'prima de riesgo', 'déficit público', 'deuda pública', 'consolidación fiscal', 'regla de gasto', 'techo de gasto', 'senda fiscal', 'balanza comercial', 'déficit comercial', 'cuenta corriente', 'política monetaria', 'política fiscal', 'bono a diez años', 'bono soberano', 'renta disponible', 'consumo de los hogares', 'ahorro de los hogares', 'productividad', 'competitividad', 'salario mínimo', 'poder adquisitivo', 'cuadro macroeconómico', 'previsiones de crecimiento', 'presión fiscal', 'recaudación tributaria', 'ciclo económico', 'demanda interna', 'salida de la recesión'],
    neg: ['inflación de balón', 'déficit de atención', 'crecimiento personal', 'déficit de sueño', 'deuda emocional', 'prima hermana', 'bono cultural', 'bono joven alquiler', 'recesión gingival', 'interés humano', 'mercado de abastos', 'mercado central', 'ahorro de energía', 'economía circular doméstica'],
  },
}

// ── Compilación de regex (una por categoría/sector, Unicode-aware) ──────────
function escapeRx(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
function buildRegex(terms: string[]): RegExp | null {
  const cleaned = [...new Set(terms.map((t) => t.trim().toLowerCase()).filter((t) => t.length >= 3))]
  if (cleaned.length === 0) return null
  // orden por longitud desc · no afecta al conteo pero evita solapes raros
  cleaned.sort((a, b) => b.length - a.length)
  const body = cleaned.map(escapeRx).join('|')
  // límites Unicode: no precedido/seguido de letra o número (respeta tildes/ñ)
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${body})(?![\\p{L}\\p{N}])`, 'giu')
}

interface CompiledSector { sector: SectorKey; high: RegExp | null; med: RegExp | null; neg: RegExp | null }
const COMPILED: CompiledSector[] = (Object.entries(LEXICONS) as Array<[Exclude<SectorKey, 'otro'>, Lex]>).map(
  ([sector, lex]) => ({ sector, high: buildRegex(lex.high), med: buildRegex(lex.med), neg: buildRegex(lex.neg) }),
)

function countMatches(re: RegExp | null, text: string): number {
  if (!re) return 0
  re.lastIndex = 0
  const m = text.match(re)
  return m ? m.length : 0
}

export interface SectorScore { sector: SectorKey; score: number }
export interface SectorResult {
  sector: SectorKey            // sector primario (o 'otro')
  score: number
  confidence: number           // 0..1
  scores: SectorScore[]        // todos los sectores con señal, desc
}

const MIN_SCORE = 3            // umbral base (≈1 entidad/ley o 2 términos)

/**
 * Clasifica un texto (titular + entradilla) en un sector.
 * score = 3·(entidades+leyes) + 1.5·(términos) − 4·(negativos), con bonus a
 * sectoriales para que no los tape una transversal amplia.
 *
 * Regla de evidencia: una transversal amplia (política/internacional/economía/
 * justicia… no sectorial) NO se asigna con UNA sola entidad de alta señal sin
 * ningún término temático — esas entidades (PSOE, La Moncloa, Banco de España)
 * aparecen en muchísimos titulares ajenos al sector. Requiere ≥1 término (med)
 * o ≥2 entidades (high). Los sectoriales sí bastan con 1 entidad discriminante.
 */
export function classifySector(text: string): SectorResult {
  const lower = (text || '').toLowerCase()
  const raw: Array<{ sector: SectorKey; score: number; high: number; med: number }> = []
  for (const c of COMPILED) {
    const high = countMatches(c.high, lower)
    const med = countMatches(c.med, lower)
    const neg = countMatches(c.neg, lower)
    let s = high * 3 + med * 1.5 - neg * 4
    if (s <= 0) continue
    if (SECTORIAL.includes(c.sector)) s *= 1.12  // los específicos ganan empates a las transversales
    raw.push({ sector: c.sector, score: Math.round(s * 100) / 100, high, med })
  }
  raw.sort((a, b) => b.score - a.score)
  const scores: SectorScore[] = raw.map(({ sector, score }) => ({ sector, score }))
  const top = raw[0]
  if (!top) return { sector: 'otro', score: 0, confidence: 0, scores }
  const isSectorial = SECTORIAL.includes(top.sector)
  const enoughEvidence = top.score >= MIN_SCORE && (isSectorial || top.med >= 1 || top.high >= 2)
  if (!enoughEvidence) {
    return { sector: 'otro', score: top.score, confidence: 0, scores }
  }
  // confianza: cuánto destaca el primero sobre el segundo + magnitud absoluta
  const second = raw[1]?.score ?? 0
  const margin = (top.score - second) / top.score
  const confidence = Math.max(0, Math.min(1, 0.4 + 0.4 * margin + Math.min(0.2, top.score / 30)))
  return { sector: top.sector, score: top.score, confidence: Math.round(confidence * 100) / 100, scores }
}

/** Sector primario directo (helper de conveniencia). */
export function detectSector(text: string): SectorKey {
  return classifySector(text).sector
}

export const SECTOR_KEYS: SectorKey[] = [...SECTORIAL, 'politica_institucional', 'internacional', 'economia', 'otro']

// NOTA: este módulo es PURO y seguro para el cliente (lo importan FeedTiered, la
// página /think-tanks, etc. por SECTOR_COLORS/SECTOR_LABELS/classifySector). El
// fallback LLM (server-only · arrastra @anthropic-ai/sdk → node:path) vive aparte
// en `sector-taxonomy-llm.ts` para no contaminar el bundle del cliente.
