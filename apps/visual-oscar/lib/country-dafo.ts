// DAFO (SWOT) por país sobre la relación con España
// Análisis estratégico curado para el módulo Geopolítica de Politeia.
// D = Debilidades · A = Amenazas · F = Fortalezas · O = Oportunidades

export interface CountryDafo {
  pais: string
  resumen: string                       // 1 línea contextual
  debilidades: string[]                 // internas a España en esa relación
  amenazas: string[]                    // externas desde el país
  fortalezas: string[]                  // internas que España aporta
  oportunidades: string[]               // externas a aprovechar
}

export const COUNTRY_DAFO: Record<string, CountryDafo> = {
  // ── Vecindad inmediata ──────────────────────────────────────────────
  Marruecos: {
    pais: 'Marruecos',
    resumen: 'Socio crítico: migración, Sahara, gas. Tensiones recurrentes pero interdependencia estructural.',
    debilidades: [
 'Dependencia de Rabat para control migratorio en Ceuta y Melilla',
 'Asimetría: Marruecos puede activar/desactivar la presión migratoria',
 'Posición sobre el Sáhara Occidental erosiona credibilidad ante Argelia',
    ],
    amenazas: [
 'Instrumentalización de los flujos migratorios como palanca diplomática',
 'Reivindicaciones territoriales sobre Ceuta, Melilla y aguas próximas',
 'Competencia agroexportadora subvencionada (tomate, fresa, hortícolas)',
    ],
    fortalezas: [
 'Primer socio comercial africano de España (>16.000 M€)',
 'Cooperación operativa Guardia Civil – DGSN consolidada',
 'Inversión española en banca (Santander), telecom y renovables',
    ],
    oportunidades: [
 'Hub renovable Magreb-Europa: interconexión eléctrica reforzada',
 'Mundial 2030 como vector diplomático y económico conjunto',
 'Cadena de valor del automóvil (Renault, Stellantis) integrada',
    ],
  },
  Argelia: {
    pais: 'Argelia',
    resumen: 'Tradicional proveedor energético, deteriorado tras giro español sobre el Sáhara (2022).',
    debilidades: [
 'Pérdida del status de socio preferente desde marzo 2022',
 'Suspensión del Tratado de Amistad y Cooperación',
 'Dependencia residual del gas argelino (Medgaz)',
    ],
    amenazas: [
 'Cierre arbitrario de la cooperación comercial (boicot 2022)',
 'Alianza creciente con Rusia y China en el Magreb',
 'Imprevisibilidad del régimen militar post-Bouteflika',
    ],
    fortalezas: [
 'Comunidad española establecida y memoria histórica',
 'Diversificación energética avanzada: GNL, EE.UU., Nigeria',
 'Capacidad técnica de Naturgy y Cepsa en hidrocarburos',
    ],
    oportunidades: [
 'Reapertura selectiva tras señales de deshielo (cumbre 2025)',
 'Cooperación en hidrógeno verde y transición ecológica',
 'Triangulación a través de la Unión Europea',
    ],
  },
  Portugal: {
    pais: 'Portugal',
    resumen: 'Aliado natural ibérico: agenda europea coordinada, mercado eléctrico común (MIBEL).',
    debilidades: [
 'Tensiones recurrentes por el agua transfronteriza (Tajo, Duero)',
 'Competencia por inversión extranjera (especialmente tech/nearshoring)',
 'Dependencia mutua en cadenas logísticas (puerto de Sines)',
    ],
    amenazas: [
 'Divergencia en política migratoria UE',
 'Atractivo fiscal portugués (NHR) que drena capital y talento español',
    ],
    fortalezas: [
 'MIBEL: mercado eléctrico ibérico integrado',
 'Cumbres bilaterales anuales y agenda común en Bruselas',
 'Inversión cruzada masiva (Banco Sabadell-Caixabank-EDP-REN)',
    ],
    oportunidades: [
 'Hidrógeno verde ibérico (H2Med) hacia Francia y Alemania',
 'Mundial 2030 conjunto con Marruecos: vector de cohesión',
 'Eje atlántico para economía azul y eólica marina',
    ],
  },
  Francia: {
    pais: 'Francia',
    resumen: 'Aliado estratégico UE pero competidor industrial. Frontera energética y migratoria clave.',
    debilidades: [
 'Asimetría agrícola: protestas de agricultores franceses bloquean exportaciones',
 'Resistencia francesa a interconexiones eléctricas pirenaicas (MidCat)',
 'Competencia por liderazgo del sur de Europa',
    ],
    amenazas: [
 'Posible victoria de la extrema derecha y ruptura del consenso UE',
 'Vetos cruzados en Consejo UE (PAC, fronteras)',
 'Salida lenta del nuclear que reconfigura el mercado eléctrico',
    ],
    fortalezas: [
 'Eje Madrid-París como motor de la UE-27',
 'Tratado de Barcelona 2023 (defensa, transportes, energía)',
 'Integración industrial (Airbus, automoción)',
    ],
    oportunidades: [
 'H2Med Barcelona-Marsella como columna vertebral del hidrógeno UE',
 'Cooperación en defensa europea (FCAS, SCAF)',
 'Renovación del partenariado nuclear-renovable mixto',
    ],
  },
  Italia: {
    pais: 'Italia',
    resumen: 'Socio mediterráneo con agenda compartida sobre migración, energía y agricultura UE.',
    debilidades: [
 'Competencia directa en agroalimentación (vino, aceite, hortalizas)',
 'Discrepancias sobre el reparto de migrantes en el Mediterráneo',
    ],
    amenazas: [
 'Gobierno Meloni con prioridades nacionalistas en política migratoria',
 'Volatilidad fiscal italiana puede contagiar prima de riesgo española',
    ],
    fortalezas: [
 'Posición común frecuente en Consejo UE (Cumbre del Sur)',
 'Cooperación Enel-Endesa, FCA-SEAT, Telefónica-TIM',
    ],
    oportunidades: [
 'Frente común en Bruselas para fondos UE post-2027',
 'Mercado eléctrico mediterráneo (interconexión Cerdeña)',
    ],
  },
  Alemania: {
    pais: 'Alemania',
    resumen: 'Principal socio inversor y comercial UE. Locomotora industrial con dependencia mutua.',
    debilidades: [
 'Dependencia del ciclo industrial alemán (automoción, química)',
 'Asimetría en peso político dentro de la UE',
    ],
    amenazas: [
 'Recesión alemana arrastra la balanza comercial española',
 'Giro proteccionista en industria automovilística',
    ],
    fortalezas: [
 'Inversión alemana en España (BASF, Bosch, Siemens, Volkswagen-SEAT)',
 'Turismo alemán es el primer mercado emisor europeo (>11M visitantes)',
    ],
    oportunidades: [
 'Hidrógeno verde: España como exportador a la industria alemana',
 'Reindustrialización post-Ucrania: España como plataforma sur',
 'Liderazgo conjunto en transición climática europea',
    ],
  },
 'Reino Unido': {
    pais: 'Reino Unido',
    resumen: 'Brexit redefinió la relación. Gibraltar pendiente de cierre. Inversión y turismo masivos.',
    debilidades: [
 'Gibraltar como contencioso jurídico-fiscal sin resolver',
 'Pérdida de influencia conjunta tras salida UE',
 'Brexit complica exportaciones agroalimentarias y movilidad',
    ],
    amenazas: [
 'Desviación del turismo hacia destinos alternativos',
 'Endurecimiento controles aduaneros y fitosanitarios',
    ],
    fortalezas: [
 '17 millones de turistas británicos al año (1er emisor)',
 'IAG (Iberia + BA) como puente aéreo estructural',
 'Inversión británica en infraestructura y energías renovables',
    ],
    oportunidades: [
 'Acuerdo Gibraltar UE-RU como cierre histórico',
 'Hub financiero alternativo a Londres tras Brexit',
 'Defensa europea: cooperación bilateral fuera del marco UE',
    ],
  },

  // ── América Latina ──────────────────────────────────────────────────
  México: {
    pais: 'México',
    resumen: 'Mercado clave de inversión española: banca, telecomunicaciones, energía. Crisis política recurrente.',
    debilidades: [
 'Tensiones ideológicas con gobiernos de López Obrador y Sheinbaum',
 'Inseguridad jurídica para empresas españolas (CFE, energías renovables)',
 'Suspensión informal de relaciones diplomáticas de alto nivel desde 2022',
    ],
    amenazas: [
 'Nacionalización energética y disputas con Iberdrola, Naturgy, Repsol',
 'Pérdida del mercado mexicano frente a EE.UU. y China',
    ],
    fortalezas: [
 'Stock inversor español: 70.000 M€ (banca BBVA, Santander)',
 'Lazos culturales y comunidad mexicana en España',
    ],
    oportunidades: [
 'Nearshoring desde EE.UU.: España como puente UE',
 'Recambio generacional político post-MORENA',
 'IBEROAMÉRICA: Cumbres como vector de reconstrucción',
    ],
  },
  Brasil: {
    pais: 'Brasil',
    resumen: 'Mercado estratégico latinoamericano. Inversión española consolidada (Telefónica, Santander, Iberdrola).',
    debilidades: [
 'Ciclo político polarizado (Lula vs. bolsonarismo) genera incertidumbre',
 'Burocracia regulatoria pesada para empresas extranjeras',
    ],
    amenazas: [
 'Acuerdo UE-Mercosur bloqueado por agricultores europeos',
 'Crisis amazónica enfría relaciones medioambientales',
    ],
    fortalezas: [
 'Telefónica Vivo: principal operador de telecomunicaciones',
 'Iberdrola Neoenergia: 1 de cada 3 hogares brasileños',
 'BRICS: ventana de acceso al sur global',
    ],
    oportunidades: [
 'Mercado latino más grande de habla portuguesa: Lusofonía',
 'Energías renovables: eólica nordeste, hidrógeno verde',
 'COP30 Belém 2025 como vector diplomático conjunto',
    ],
  },
  Argentina: {
    pais: 'Argentina',
    resumen: 'Inversión histórica en YPF y Telefónica. Volatilidad económica y política recurrente.',
    debilidades: [
 'Default y restricciones a la repatriación de dividendos',
 'Tensión retórica con Milei sobre inmigración hispanoamericana',
    ],
    amenazas: [
 'Indemnización pendiente por nacionalización de YPF (2012)',
 'Inestabilidad cambiaria erosiona retornos de empresas españolas',
    ],
    fortalezas: [
 'Comunidad de origen español más numerosa de América',
 'Banco Santander Río, Telefónica, Mapfre con presencia consolidada',
    ],
    oportunidades: [
 'Vaca Muerta: gas y litio como diversificación energética',
 'Acuerdo Mercosur-UE puede desbloquear comercio',
 'Programa de doble nacionalidad: vínculo demográfico',
    ],
  },
  Cuba: {
    pais: 'Cuba',
    resumen: 'Vínculo histórico-cultural intenso pero crisis económica grave. España es el principal socio occidental.',
    debilidades: [
 'Régimen comunista limita la actividad empresarial',
 'Sanciones EE.UU. complican operaciones financieras',
    ],
    amenazas: [
 'Colapso económico y emigración masiva a Florida',
 'Acercamiento de La Habana a China y Rusia',
    ],
    fortalezas: [
 'Meliá, Iberostar, Barceló: cadena hotelera dominante',
 'Cooperación sanitaria y educativa estructural',
 'Comunidad cubano-española de doble nacionalidad',
    ],
    oportunidades: [
 'Eventual apertura post-régimen actual',
 'Liderazgo UE en política de cooperación',
    ],
  },
  Venezuela: {
    pais: 'Venezuela',
    resumen: 'Crisis humanitaria y política. España acoge a la mayor diáspora venezolana de Europa.',
    debilidades: [
 'Reconocimiento dividido del régimen Maduro vs. oposición',
 'Posición ambigua del gobierno español complica la mediación',
    ],
    amenazas: [
 'Inestabilidad genera ola migratoria sostenida hacia España',
 'Repsol y Mapfre con activos congelados / repatriación bloqueada',
    ],
    fortalezas: [
 '500.000+ venezolanos residentes en España',
 'Repsol mantiene producción (acuerdo licencia EE.UU.)',
    ],
    oportunidades: [
 'España como hub de transición democrática (oposición exiliada)',
 'Eventual reconstrucción tras cambio de régimen',
    ],
  },
  Chile: {
    pais: 'Chile',
    resumen: 'Aliado estable latinoamericano. Inversión española en banca, energía y retail.',
    debilidades: [
 'Lejanía geográfica limita el comercio bilateral',
 'Convulsión social post-2019 genera incertidumbre regulatoria',
    ],
    amenazas: [
 'Nacionalismo en sectores estratégicos (litio, agua)',
 'Competencia china en infraestructuras críticas',
    ],
    fortalezas: [
 'Endesa Chile (Enel) y Repsol con presencia consolidada',
 'BBVA y Santander en banca minorista',
 'Acuerdo modernizado UE-Chile (2024)',
    ],
    oportunidades: [
 'Hidrógeno verde: el desierto de Atacama como mayor productor mundial',
 'Litio: España puede integrarse en cadena de baterías UE',
 'Pacto Verde UE-Chile como vector diplomático',
    ],
  },
  Colombia: {
    pais: 'Colombia',
    resumen: 'Socio estratégico: paz, energía, banca. Crecimiento sostenido pese a violencia residual.',
    debilidades: [
 'Inestabilidad de seguridad en regiones de inversión española',
 'Reforma petrolera de Petro afecta a Cepsa y Repsol',
    ],
    amenazas: [
 'Crisis migratoria venezolana (2,8M refugiados en territorio)',
 'Acuerdos paz frágiles con guerrilla disidente',
    ],
    fortalezas: [
 'BBVA Colombia y Santander entre los principales bancos',
 'Cooperación militar y de inteligencia consolidada',
    ],
    oportunidades: [
 'Transición energética post-petróleo: España como socio renovable',
 'Acuerdo UE-CAN como marco comercial',
    ],
  },
  Perú: {
    pais: 'Perú',
    resumen: 'Mercado andino estable con fuerte presencia española en banca, telco y construcción.',
    debilidades: [
 'Inestabilidad política crónica: 6 presidentes en 5 años',
 'Conflictos sociales en zonas mineras (Antofagasta, Las Bambas)',
    ],
    amenazas: [
 'Avance chino en infraestructura (puerto de Chancay)',
 'Inseguridad jurídica para inversiones extranjeras',
    ],
    fortalezas: [
 'BBVA Continental y Telefónica del Perú con cuota dominante',
 'ACS, Sacyr y Acciona en infraestructuras',
    ],
    oportunidades: [
 'Reactivación de inversiones tras estabilización política',
 'Pesca y agroalimentación: complementariedad bilateral',
    ],
  },
  Ecuador: {
    pais: 'Ecuador',
    resumen: 'Crisis de seguridad por narcotráfico y deterioro institucional. Dolarización ancla la economía.',
    debilidades: [
 'Comunidad ecuatoriana muy numerosa en España (445.000)',
 'Riesgo migratorio creciente por inseguridad',
    ],
    amenazas: [
 'Estado de excepción y violencia narco generalizada',
 'Asalto a embajada mexicana erosiona normas diplomáticas',
    ],
    fortalezas: [
 'Repsol y Iberdrola con presencia limitada pero estable',
 'Cooperación judicial y policial activa',
    ],
    oportunidades: [
 'Asistencia técnica en seguridad y reconstrucción institucional',
 'Acuerdo UE-Comunidad Andina como ancla',
    ],
  },
  Uruguay: {
    pais: 'Uruguay',
    resumen: 'Democracia estable y socio fiable. Tamaño pequeño pero altísima calidad institucional.',
    debilidades: [
 'Mercado pequeño limita el alcance comercial',
 'Distancia geográfica eleva costes logísticos',
    ],
    amenazas: [
 'Aislamiento dentro de Mercosur por desacuerdos comerciales',
    ],
    fortalezas: [
 'BBVA, Santander y Movistar con cuotas relevantes',
 'Calidad institucional uruguaya facilita seguridad jurídica',
    ],
    oportunidades: [
 'Plataforma de exportación al cono sur',
 'Hidrógeno verde y energías renovables',
    ],
  },
  Bolivia: {
    pais: 'Bolivia',
    resumen: 'Estabilidad relativa post-Evo, pero conflicto político recurrente. Litio como factor estratégico.',
    debilidades: [
 'Repsol con activos en YPFB sometidos a regulación cambiante',
 'Distancia política con Madrid en gobiernos del MAS',
    ],
    amenazas: [
 'Nacionalización de hidrocarburos como amenaza estructural',
 'Crisis económica y devaluación afectan retornos',
    ],
    fortalezas: [
 'Repsol opera en gas natural desde hace décadas',
 'Comunidad boliviana en España (210.000)',
    ],
    oportunidades: [
 'Triángulo del litio (con Argentina y Chile): cadena UE',
 'Cooperación en agua y medio ambiente',
    ],
  },

  // ── EE.UU. y Asia ────────────────────────────────────────────────────
 'Estados Unidos': {
    pais: 'Estados Unidos',
    resumen: 'Aliado militar (OTAN, Rota, Morón) y socio económico clave. Asimetría estructural.',
    debilidades: [
 'Dependencia operativa de OTAN para seguridad europea',
 'Aranceles selectivos contra agroalimentación española (vino, aceite)',
    ],
    amenazas: [
 'Vuelta del trumpismo: aranceles, retirada de OTAN, posición Sahara',
 'Sanciones secundarias afectan operaciones con Cuba, Venezuela, Irán',
    ],
    fortalezas: [
 'Bases militares Rota y Morón: peso geoestratégico',
 'IAG, Ferrovial, Acciona, Iberdrola con activos relevantes',
 'Dispora hispana clave para narrativa USA-Latinoamérica',
    ],
    oportunidades: [
 'Reindustrialización IRA: subsidios para fábricas españolas',
 'Defensa europea: cooperación bilateral en F-35, AEGIS',
 'Liderazgo en español en EE.UU.: Cervantes, Telemundo',
    ],
  },
  Canadá: {
    pais: 'Canadá',
    resumen: 'Aliado occidental fiable. Presencia militar conjunta en OTAN. CETA facilita comercio.',
    debilidades: [
 'Mercado pequeño respecto a EE.UU.',
 'Distancia geográfica limita turismo bidireccional',
    ],
    amenazas: [
 'Tensión con Trump puede arrastrar a Canadá hacia retroceso comercial',
    ],
    fortalezas: [
 'CETA: acuerdo comercial UE-Canadá favorece exportadores españoles',
 'Cooperación militar en misión OTAN Báltico',
    ],
    oportunidades: [
 'Recursos naturales (litio, uranio, GNL) para diversificación UE',
 'Inversión en infraestructura por francófonos hispanohablantes',
    ],
  },
  China: {
    pais: 'China',
    resumen: 'Segundo socio comercial global de España. Tensión creciente UE-China sobre comercio y derechos.',
    debilidades: [
 'Déficit comercial estructural (importaciones >> exportaciones)',
 'Dependencia tecnológica en electrónicos y placas solares',
    ],
    amenazas: [
 'Aranceles UE a vehículos eléctricos chinos generan represalias',
 'Espionaje industrial y robos de propiedad intelectual',
 'Influencia china en LATAM erosiona presencia tradicional española',
    ],
    fortalezas: [
 '900.000 turistas chinos al año (alto valor añadido)',
 'Acuerdo de inversiones suspendido pero mantenidos canales',
 'Inditex con producción significativa en China',
    ],
    oportunidades: [
 'Inversión china en automoción eléctrica (Chery en Barcelona)',
 'Mediador UE-China en agenda climática',
 'Carne porcina española es la 1ª exportación a China (pierna ibérica)',
    ],
  },
  Japón: {
    pais: 'Japón',
    resumen: 'Aliado democrático en Asia. Acuerdo UE-Japón de Asociación Económica facilita comercio.',
    debilidades: [
 'Distancia geográfica y cultural limita comercio fluido',
 'Mercado japonés cerrado a la agroalimentación española',
    ],
    amenazas: [
 'Recesión demográfica japonesa reduce el mercado',
    ],
    fortalezas: [
 'Inversión japonesa en automoción española (Nissan, Toyota)',
 'Acuerdo UE-Japón de Libre Comercio (EPA) en vigor',
    ],
    oportunidades: [
 'Año Dual España-Japón refuerza intercambio cultural',
 'Cooperación en hidrógeno verde y descarbonización industrial',
 'Turismo japonés de alto poder adquisitivo',
    ],
  },
 'Corea del Sur': {
    pais: 'Corea del Sur',
    resumen: 'Hub tecnológico asiático. Inversión coreana creciente en automoción y baterías.',
    debilidades: [
 'Mercado coreano protegido en sectores clave (automoción, agro)',
 'Volatilidad geopolítica por tensión con Corea del Norte',
    ],
    amenazas: [
 'Competencia surcoreana en construcción naval y automoción',
    ],
    fortalezas: [
 'Hyundai, Kia y LG con presencia industrial en España',
 'Cooperación en defensa: posible compra K9 Howitzer',
    ],
    oportunidades: [
 'Baterías para vehículo eléctrico: gigafactoría LG en Manresa',
 'Hidrógeno verde: España como exportador a Corea',
    ],
  },
  India: {
    pais: 'India',
    resumen: 'Mercado emergente clave. Acuerdo UE-India en negociación. Comunidad india creciente.',
    debilidades: [
 'Comercio bilateral aún reducido (~6.000 M€)',
 'Falta de visibilidad de marca España en India',
    ],
    amenazas: [
 'Indecisión india sobre Ucrania y posición neutral en BRICS',
 'Competencia barata en textil y servicios',
    ],
    fortalezas: [
 'CAF, Talgo y Acciona en infraestructura ferroviaria',
 'Inditex con presencia minorista creciente',
    ],
    oportunidades: [
 'Acuerdo UE-India puede multiplicar comercio',
 'Mercado de defensa: caza Tejas con motor de F404 vs Eurofighter',
 'Cooperación tecnológica: Bangalore - Madrid AI hub',
    ],
  },
  Australia: {
    pais: 'Australia',
    resumen: 'Aliado occidental democrático. Acuerdo UE-Australia en negociación. Mercado lejano pero rico.',
    debilidades: [
 'Distancia geográfica encarece comercio bilateral',
 'Mercado pequeño (26 M habitantes)',
    ],
    amenazas: [
 'Australia se alinea con EE.UU. en bloqueo a China',
    ],
    fortalezas: [
 'Acciona, Ferrovial, Cintra con grandes contratos de infraestructura',
 'Iberdrola con activos eólicos y solares',
    ],
    oportunidades: [
 'Acuerdo comercial UE-Australia desbloquearía agroalimentación',
 'Hidrógeno verde, hierro verde y minerales críticos',
    ],
  },

  // ── Oriente Medio y Asia Occidental ────────────────────────────────
  Israel: {
    pais: 'Israel',
    resumen: 'Reconocimiento de Palestina por España (2024) tensa relación. Cooperación tecnológica significativa.',
    debilidades: [
 'Crisis diplomática tras reconocimiento de Palestina',
 'Pérdida potencial de acuerdos tecnológicos y de defensa',
    ],
    amenazas: [
 'Sanciones informales israelíes a empresas españolas',
 'Llamamiento al boicot por parte de comunidades pro-palestinas',
    ],
    fortalezas: [
 'Cooperación cibernética y de defensa históricamente sólida',
 'Inversión israelí en startups españolas',
    ],
    oportunidades: [
 'Mediación UE en post-conflicto Gaza',
 'Liderazgo español en agenda de paz en Oriente Medio',
    ],
  },
  Palestina: {
    pais: 'Palestina',
    resumen: 'España reconoció el Estado palestino en mayo 2024. Liderazgo UE en la agenda.',
    debilidades: [
 'Capacidad limitada de proyectar política propia sin coordinación europea',
    ],
    amenazas: [
 'Escalada del conflicto erosiona la viabilidad de los dos Estados',
 'Dependencia presupuestaria de la AP genera vulnerabilidad',
    ],
    fortalezas: [
 'Liderazgo moral europeo tras el reconocimiento',
 'Cooperación al desarrollo histórica con Cisjordania y Gaza',
    ],
    oportunidades: [
 'España como referente UE en diplomacia con Sur Global',
 'Reconstrucción Gaza post-conflicto como vector económico',
    ],
  },
  Gaza: {
    pais: 'Gaza',
    resumen: 'Crisis humanitaria extrema. España lidera reconocimiento europeo y ayuda humanitaria.',
    debilidades: [
 'Imposibilidad de operar sobre el terreno por bloqueo',
 'Dependencia de ONG y agencias UN para distribución',
    ],
    amenazas: [
 'Espiral de violencia se contagia a Cisjordania y Líbano',
 'Riesgo regional con Irán y Hizbulá',
    ],
    fortalezas: [
 'Aporte AECID y cooperación humanitaria',
    ],
    oportunidades: [
 'Liderazgo UE en reconstrucción post-conflicto',
 'Conferencia internacional con co-presidencia española',
    ],
  },
  Irán: {
    pais: 'Irán',
    resumen: 'Régimen sancionado por nuclear y soporte a actores no estatales. Comercio español muy limitado.',
    debilidades: [
 'Cumplimiento sanciones UE bloquea casi toda actividad comercial',
 'Repsol abandonó proyecto en Yadavaran (2018)',
    ],
    amenazas: [
 'Programa nuclear puede desencadenar ataque israelí/EE.UU.',
 'Cierre del Estrecho de Ormuz dispararía precios energéticos',
    ],
    fortalezas: [
 'Embajada bilateral mantenida pese a tensiones',
 'Mediación UE en JCPOA (E3+EU)',
    ],
    oportunidades: [
 'Eventual reapertura post-Khamenei como mercado emergente',
    ],
  },
  Turquía: {
    pais: 'Turquía',
    resumen: 'Socio OTAN volátil. Cooperación industrial en defensa y construcción naval significativa.',
    debilidades: [
 'Erdogan instrumentaliza a refugiados sirios contra UE',
 'Volatilidad de la lira complica operaciones comerciales',
    ],
    amenazas: [
 'Bloqueo turco a iniciativas UE-OTAN (Suecia, Finlandia)',
 'Conflicto en el Mediterráneo Oriental con Grecia',
    ],
    fortalezas: [
 'Construcción del LHD Anadolu por Navantia (referente)',
 'Inversión española en banca (BBVA-Garanti)',
    ],
    oportunidades: [
 'Programa naval submarino TF-100 con Navantia',
 'Hub manufacturero a las puertas de la UE',
    ],
  },
 'Arabia Saudí': {
    pais: 'Arabia Saudí',
    resumen: 'Mercado emergente del Golfo. Visión 2030 abre oportunidades industriales.',
    debilidades: [
 'Dependencia económica del petróleo limita diversificación',
 'Relación tensa por DDHH (caso Khashoggi, Yemen)',
    ],
    amenazas: [
 'Inestabilidad regional (Yemen, Irán) afecta a inversiones',
 'Competencia geoestratégica USA-China en el Golfo',
    ],
    fortalezas: [
 'Talgo: contrato AVE Medina-La Meca (icono industrial)',
 'Indra y Telefónica con proyectos en transformación digital',
    ],
    oportunidades: [
 'NEOM y Visión 2030: contratos masivos en infraestructura',
 'Cooperación en defensa y energía solar',
    ],
  },

  // ── África Subsahariana y Magreb ────────────────────────────────────
  Mauritania: {
    pais: 'Mauritania',
    resumen: 'Socio crítico para control migratorio y pesca. Cooperación UE-AECID intensa.',
    debilidades: [
 'Capacidad estatal limitada para gestionar flujos migratorios',
 'Dependencia financiera de la cooperación europea',
    ],
    amenazas: [
 'Salida de Sahel de Mauritania consolidaría a Mauritania como ruta principal',
 'Inestabilidad regional Mali-Burkina-Níger se contagia',
    ],
    fortalezas: [
 'Acuerdo de pesca UE-Mauritania (más relevante para flota gallega y andaluza)',
 'Cooperación operativa Guardia Civil consolidada',
    ],
    oportunidades: [
 'Hub gas natural offshore (proyecto BP-Kosmos)',
 'Hidrógeno verde solar como exportador a la UE',
    ],
  },
  Senegal: {
    pais: 'Senegal',
    resumen: 'Origen creciente de migración a Canarias. Democracia africana de referencia.',
    debilidades: [
 'Ola migratoria desde Senegal hacia Canarias en aumento',
 'Limitada capacidad operativa de control en costa',
    ],
    amenazas: [
 'Crisis política/económica puede dispararla salida en patera',
 'Yihadismo en frontera con Mali se desplaza al sur',
    ],
    fortalezas: [
 'AECID con cooperación intensa (educación, salud)',
 'Comunidad senegalesa establecida en España',
    ],
    oportunidades: [
 'Petróleo y gas offshore (recursos compartidos con Mauritania)',
 'Migración circular ordenada (modelo Cabo Verde)',
    ],
  },
  Egipto: {
    pais: 'Egipto',
    resumen: 'Pieza clave en estabilidad mediterránea y Oriente Medio. Cooperación con régimen autoritario.',
    debilidades: [
 'Régimen autoritario complica agenda de DDHH',
 'Dependencia financiera de FMI y Golfo limita autonomía',
    ],
    amenazas: [
 'Crisis migratoria por flujos sudaneses y libios',
 'Inestabilidad regional (Libia, Sudán, Gaza)',
    ],
    fortalezas: [
 'Proyectos energéticos: Naturgy en GNL Damietta',
 'Cooperación militar OTAN-mediterránea',
    ],
    oportunidades: [
 'Hub renovable y de hidrógeno verde solar',
 'Reconstrucción Gaza con liderazgo egipcio-español',
    ],
  },
  Túnez: {
    pais: 'Túnez',
    resumen: 'Aliado mediterráneo en deterioro democrático. Origen creciente de migración irregular.',
    debilidades: [
 'Régimen Saied erosiona democracia post-Primavera Árabe',
 'Crisis económica genera salida masiva de jóvenes',
    ],
    amenazas: [
 'Convergencia migratoria Túnez-Italia desborda al sur europeo',
 'Acuerdo UE-Túnez tensiona la condicionalidad democrática',
    ],
    fortalezas: [
 'Acuerdo de Asociación UE-Túnez vigente',
 'Inversión española en automoción y textil',
    ],
    oportunidades: [
 'Acuerdo migratorio UE como modelo replicable',
 'Energía solar y eólica para exportar a la UE',
    ],
  },
  Libia: {
    pais: 'Libia',
    resumen: 'Estado fallido con dos gobiernos. Origen y tránsito de migración hacia Italia y España.',
    debilidades: [
 'Imposibilidad de operar normalmente en territorio libio',
 'Repsol con activos petroleros en zona de conflicto',
    ],
    amenazas: [
 'Caída del régimen de Trípoli o Bengasi dispararía caos regional',
 'Wagner/Rusia controla mercenarios al servicio de Haftar',
    ],
    fortalezas: [
 'Repsol mantiene producción de petróleo (cuota 200.000 bpd)',
 'Cooperación naval UE para control migratorio',
    ],
    oportunidades: [
 'Reconstrucción post-conflicto si hay acuerdo nacional',
 'Reservas petroleras y gas como exportación UE',
    ],
  },
  Sudáfrica: {
    pais: 'Sudáfrica',
    resumen: 'Líder regional africano. Política exterior independiente (BRICS, neutral en Ucrania).',
    debilidades: [
 'Comercio bilateral modesto (~3.000 M€)',
 'Crisis energética sudafricana (apagones recurrentes)',
    ],
    amenazas: [
 'Posición sudafricana favorable a Rusia en Ucrania',
 'Demanda contra Israel ante CIJ tensiona relación con UE',
    ],
    fortalezas: [
 'Telefónica, Indra, Acciona con proyectos puntuales',
 'Hub para acceso al África austral',
    ],
    oportunidades: [
 'Renovables: España puede exportar tecnología fotovoltaica',
 'Cooperación G20 (Sudáfrica preside 2025)',
    ],
  },
  Nigeria: {
    pais: 'Nigeria',
    resumen: 'Gigante demográfico y económico africano. Inestabilidad endémica.',
    debilidades: [
 'Comercio limitado por barreras de seguridad',
 'Dependencia del crudo nigeriano para refinería de Cepsa',
    ],
    amenazas: [
 'Boko Haram, ISWAP y bandidismo en zonas petroleras',
 'Crisis cambiaria erosiona retornos',
    ],
    fortalezas: [
 'Cepsa importa crudo nigeriano (diversificación post-Argelia)',
 '700.000 nigerianos en España: comunidad consolidada',
    ],
    oportunidades: [
 'Mercado de 220 millones de habitantes (1º África)',
 'Gas natural: gasoducto trans-sahariano hacia Europa',
    ],
  },

  // ── Europa central y norte ────────────────────────────────────────
 'Países Bajos': {
    pais: 'Países Bajos',
    resumen: 'Socio comercial UE relevante. Plataforma logística europea por Rotterdam.',
    debilidades: [
 'Holanda como obstáculo en política fiscal UE (frugales)',
 'Dependencia logística de puertos holandeses',
    ],
    amenazas: [
 'Bloqueo holandés a unión bancaria y deuda común UE',
 'Auge del PVV de Geert Wilders complica consensos',
    ],
    fortalezas: [
 'Inversión holandesa relevante (Heineken, ING, Philips)',
 'Tercer mercado destino de exportaciones agroalimentarias',
    ],
    oportunidades: [
 'Hidrógeno verde: H2Med apunta a Rotterdam',
 'Cooperación en transición energética',
    ],
  },
  Bélgica: {
    pais: 'Bélgica',
    resumen: 'Sede de instituciones UE y OTAN. Aliado natural en agenda comunitaria.',
    debilidades: [
 'Inestabilidad política belga (5 años sin gobierno reciente)',
 'Comunidad española antigua pero menguante',
    ],
    amenazas: [
 'Auge nacionalismo flamenco fragmenta política belga',
    ],
    fortalezas: [
 'Bruselas como capital UE: peso institucional español',
 'Embajada ante UE: una de las más grandes de España',
    ],
    oportunidades: [
 'Cooperación industrial en defensa europea',
 'Hub financiero alternativo a Londres',
    ],
  },
  Polonia: {
    pais: 'Polonia',
    resumen: 'Líder regional Visegrado. Relación UE compleja según gobierno (PiS vs. Tusk).',
    debilidades: [
 'Divergencia histórica España-Polonia sobre Rusia/Ucrania',
 'Polonia como competidor industrial en automoción',
    ],
    amenazas: [
 'PiS o regreso de la extrema derecha tensaría agenda UE',
 'Frente oriental OTAN absorbe recursos europeos',
    ],
    fortalezas: [
 'Inditex, Ferrovial y Iberdrola con presencia consolidada',
 'Acuerdo bilateral defensa (compra de carros, fragatas)',
    ],
    oportunidades: [
 'Reindustrialización europea: Polonia como hub manufacturero UE',
 'Cooperación defensa: España como exportador armamento',
    ],
  },
  Suecia: {
    pais: 'Suecia',
    resumen: 'Socio nórdico tras incorporación a OTAN (2024). Industria de defensa puntera.',
    debilidades: [
 'Distancia política: Suecia más austera fiscalmente',
 'Mercado pequeño (10M habitantes)',
    ],
    amenazas: [
 'Auge Demócratas de Suecia tensiona consenso UE',
    ],
    fortalezas: [
 'IKEA, H&M, Volvo, Ericsson con presencia masiva en España',
 'Suecia como aliado OTAN refuerza la postura común',
    ],
    oportunidades: [
 'Cooperación defensa: posible compra Saab/Indra',
 'Tecnología verde: Suecia como referente para España',
    ],
  },
  Suiza: {
    pais: 'Suiza',
    resumen: 'Mercado financiero clave. Acuerdos bilaterales UE-Suiza facilitan comercio.',
    debilidades: [
 'Suiza fuera UE complica armonización regulatoria',
 'Refugio fiscal histórico para capitales españoles',
    ],
    amenazas: [
 'Suiza como destino de fuga de capitales',
 'Negociación bilateral UE-Suiza estancada',
    ],
    fortalezas: [
 'Inversión suiza relevante (Nestlé, Novartis, Roche, ABB)',
 'Comunidad española en Suiza (130.000)',
    ],
    oportunidades: [
 'Cooperación financiera y bancaria',
 'Tecnología y farma como hub de I+D',
    ],
  },
  Grecia: {
    pais: 'Grecia',
    resumen: 'Socio mediterráneo común. Cumbres del Sur conjuntas. Recuperación post-troika.',
    debilidades: [
 'Competencia turística directa por mercado europeo',
 'Tamaño económico limita peso en UE',
    ],
    amenazas: [
 'Tensión con Turquía en Egeo afecta estabilidad mediterránea',
 'Crisis migratoria griega es barómetro de la del sur europeo',
    ],
    fortalezas: [
 'Cumbre del Sur (España-Italia-Grecia-Portugal-Malta-Chipre)',
 'Iberdrola y Endesa con activos en renovables',
    ],
    oportunidades: [
 'Cooperación renovables y interconexión eléctrica mediterránea',
 'Frente común UE en política migratoria',
    ],
  },
  Mali: {
    pais: 'Mali',
    resumen: 'Estado africano fallido. Wagner/Rusia desplazó a la UE y Francia. España retiró tropas en 2022.',
    debilidades: [
 'España retiró su contingente EUTM-Mali en 2022',
 'Pérdida de influencia europea consolidada',
    ],
    amenazas: [
 'Yihadismo se expande hacia Mauritania y Senegal',
 'Wagner consolida control en Sahel y desplaza UE',
    ],
    fortalezas: [
 'AECID mantiene cooperación humanitaria limitada',
    ],
    oportunidades: [
 'Eventual estabilización post-junta militar',
 'Liderazgo UE en post-Wagner',
    ],
  },

  // ── Europa Oriental ───────────────────────────────────────────────
  Rusia: {
    pais: 'Rusia',
    resumen: 'Adversario sistémico desde 2022. Guerra Ucrania reconfigura Europa.',
    debilidades: [
 'Pérdida del mercado ruso para empresas españolas',
 'Suministro residual de gas y crudo aún parcialmente activo',
    ],
    amenazas: [
 'Sabotaje a infraestructura crítica europea (cables submarinos)',
 'Injerencia en redes sociales y procesos electorales',
 'Escalada nuclear si se cruza línea roja en Ucrania',
    ],
    fortalezas: [
 'Repsol y Cepsa salieron a tiempo (2022) con pérdidas limitadas',
 'OTAN y bases USA en España refuerzan disuasión',
    ],
    oportunidades: [
 'Reconstrucción Ucrania post-conflicto: ACS, FCC, Acciona',
 'Independencia energética acelera transición renovable',
    ],
  },
  Ucrania: {
    pais: 'Ucrania',
    resumen: 'Aliado clave tras invasión rusa. España apoya militar y económicamente.',
    debilidades: [
 'Coste fiscal del apoyo militar y refugiados',
 'Capacidad limitada de armamento avanzado para enviar',
    ],
    amenazas: [
 'Caída de Ucrania reabriría frontera con Rusia',
 'Refugio temporal puede convertirse en migración permanente',
    ],
    fortalezas: [
 'España acoge >200.000 refugiados ucranianos',
 'Aporte 4.500 M€ en ayuda militar y humanitaria',
    ],
    oportunidades: [
 'Reconstrucción: España como socio agroindustrial y de energía',
 'Tecnología militar probada en combate (oportunidad para Indra, Navantia)',
    ],
  },
}

export function getDafo(paisOrIso: string): CountryDafo | null {
  return COUNTRY_DAFO[paisOrIso] || null
}
