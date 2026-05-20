/**
 * FIXTURE — Huella legislativa (lobby/registro de transparencia).
 *
 * Estos son datos curados que sirven como fallback cuando el backend
 * `/api/legislative/*` no tiene los datasets de huella. El route handler
 * `app/api/huella-legislativa/route.ts` los devuelve con `_meta.source='mock'`.
 *
 * Cuando el módulo de Registro de Grupos de Interés esté operativo en el
 * backend (tabla `legislative_lobby_trace`), este fixture pasará a ser
 * meramente referencia y se eliminará.
 */

export type TipoOrg =
  | 'Patronal' | 'Sindicato' | 'Empresa' | 'Asociación' | 'Think tank'
  | 'ONG' | 'Colegio profesional' | 'Cámara' | 'Universidad'
  | 'Administración' | 'Consultora'
export type Posicion = 'A favor' | 'En contra' | 'Neutral' | 'Mixta'
export type Resultado = 'Recogida' | 'Parcial' | 'No recogida' | 'Pendiente'

export interface Reunion {
  fecha: string
  org: string
  tipoOrg: TipoOrg
  asistentes: string
  posicion: Posicion
  resumen: string
  resultado: Resultado
}

export interface Aportacion {
  fecha: string
  org: string
  tipoOrg: TipoOrg
  forma: 'Documento técnico' | 'Enmienda' | 'Carta' | 'Informe'
  resumen: string
  recogida: 'Sí' | 'Parcial' | 'No'
  articulo?: string
}

export interface Comparecencia {
  fecha: string
  compareciente: string
  org: string
  tipoOrg: TipoOrg
  rol: 'Experto/a' | 'Representante' | 'Afectado/a'
  posicion: Posicion
}

export interface Lobby {
  org: string
  tipoOrg: TipoOrg
  reuniones: number
  intensidad: number
  posicion: Posicion
}

export interface ExpedienteHuella {
  id: string
  exp: string
  title: string
  ministerio: string
  ministra: string
  fase: string
  fechaRegistro: string
  reuniones: Reunion[]
  aportaciones: Aportacion[]
  comparecencias: Comparecencia[]
  lobbies: Lobby[]
}

export interface TopOrg {
  org: string
  tipoOrg: TipoOrg
  expedientes: number
  reuniones: number
  aportaciones: number
  aceptacion: number
  web: string
}

export interface RegistroLobby {
  num: string
  nombre: string
  tipoOrg: TipoOrg
  intereses: string
  presupuesto: string
  activo: boolean
}

export const EXPEDIENTES: ExpedienteHuella[] = [
  {
    id:'irpf-2026',
    exp:'121/000034',
    title:'Reforma del IRPF y rentas del capital · ejercicio 2026',
    ministerio:'Hacienda',
    ministra:'María Jesús Montero',
    fase:'En tramitación · Comisión de Hacienda',
    fechaRegistro:'12/03/2026',
    reuniones:[
      { fecha:'18/01/2026', org:'CEOE',                      tipoOrg:'Patronal',  asistentes:'Vp 1ª Montero · Garamendi · 4 técnicos', posicion:'En contra', resumen:'Rechazo a la subida del marginal del 47% al 50% en rentas > 300.000€. Solicitud de mantener tipos actuales y rebajar Sociedades.', resultado:'No recogida' },
      { fecha:'24/01/2026', org:'CCOO',                      tipoOrg:'Sindicato', asistentes:'SE Hacienda · Sordo · 3 asesores',          posicion:'A favor',   resumen:'Apoyo a la subida del marginal y propuesta de un impuesto sobre fortunas progresivo.',                resultado:'Parcial' },
      { fecha:'25/01/2026', org:'UGT',                       tipoOrg:'Sindicato', asistentes:'SE Hacienda · Pepe Álvarez · 2 técnicos',   posicion:'A favor',   resumen:'Refuerzo del IRPF en rentas altas y aumento mínimo exento. Aceptación parcial.',                       resultado:'Parcial' },
      { fecha:'06/02/2026', org:'AEB · Asoc. Española Banca',tipoOrg:'Patronal',  asistentes:'DG Tributos · A. Rivera · 3 técnicos',      posicion:'En contra', resumen:'Rechazo al aumento del impuesto sobre rentas del capital. Estudio de impacto en captación de ahorro.', resultado:'No recogida' },
      { fecha:'09/02/2026', org:'CEPYME',                    tipoOrg:'Patronal',  asistentes:'SE Hacienda · Cuerva · 2 técnicos',         posicion:'En contra', resumen:'Necesidad de protección de pymes ante la reforma. Solicitud de bonificaciones.',                       resultado:'Parcial' },
      { fecha:'14/02/2026', org:'BBVA Research',             tipoOrg:'Empresa',   asistentes:'DG Tributos · J. Sicilia (BBVA) · 2 econ.', posicion:'Neutral',   resumen:'Presentación de informe técnico sobre elasticidad fiscal.',                                              resultado:'Recogida' },
      { fecha:'17/02/2026', org:'FUNCAS',                    tipoOrg:'Think tank',asistentes:'SE Hacienda · C. Ocaña · 2 econ.',          posicion:'Mixta',     resumen:'Apoyo a la subida pero advertencia sobre riesgo de deslocalización del ahorro.',                       resultado:'Recogida' },
      { fecha:'20/02/2026', org:'Inspectores Hacienda IHE',  tipoOrg:'Asociación',asistentes:'DG Tributos · J. M. Mollinedo',             posicion:'A favor',   resumen:'Propuestas técnicas para reforzar el control de rentas del capital.',                                  resultado:'Recogida' },
      { fecha:'25/02/2026', org:'Banco de España',           tipoOrg:'Administración', asistentes:'Vp 1ª Montero · D. Macías (Banco España)', posicion:'Neutral',  resumen:'Análisis macroeconómico del impacto fiscal. Recomendación de gradualidad.',                       resultado:'Recogida' },
      { fecha:'02/03/2026', org:'OCDE · oficina Madrid',     tipoOrg:'Administración', asistentes:'SE Hacienda · A. Lecuona',                  posicion:'Mixta',     resumen:'Recomendaciones de política tributaria internacional.',                                                    resultado:'Recogida' },
    ],
    aportaciones:[
      { fecha:'21/01/2026', org:'CEOE',     tipoOrg:'Patronal',  forma:'Documento técnico', resumen:'Estudio de impacto sobre la inversión empresarial · 187 páginas',           recogida:'No',      articulo:'Toda la norma' },
      { fecha:'27/01/2026', org:'CCOO+UGT', tipoOrg:'Sindicato', forma:'Carta',             resumen:'Carta conjunta solicitando impuesto a fortunas y mínimo exento ampliado',   recogida:'Parcial', articulo:'Art. 4, D.A. 3ª' },
      { fecha:'10/02/2026', org:'AEB',      tipoOrg:'Patronal',  forma:'Documento técnico', resumen:'Análisis del impacto en el sector bancario · 92 páginas',                  recogida:'No',      articulo:'Art. 7, Art. 9' },
      { fecha:'19/02/2026', org:'FUNCAS',   tipoOrg:'Think tank',forma:'Informe',           resumen:'Análisis de elasticidad y comportamiento de contribuyentes · 64 páginas',  recogida:'Sí',      articulo:'Art. 9 bis' },
      { fecha:'21/02/2026', org:'IHE',      tipoOrg:'Asociación',forma:'Enmienda',          resumen:'Propuestas técnicas de control fiscal de rentas del capital',              recogida:'Sí',      articulo:'Art. 12, D.A. 4ª' },
      { fecha:'01/03/2026', org:'BdE',      tipoOrg:'Administración', forma:'Informe',      resumen:'Informe macroeconómico sobre senda fiscal y deuda pública',                recogida:'Parcial', articulo:'D.F. 2ª' },
    ],
    comparecencias:[
      { fecha:'15/04/2026', compareciente:'Antonio Garamendi', org:'CEOE',          tipoOrg:'Patronal',         rol:'Representante', posicion:'En contra' },
      { fecha:'15/04/2026', compareciente:'Unai Sordo',        org:'CCOO',          tipoOrg:'Sindicato',        rol:'Representante', posicion:'A favor' },
      { fecha:'16/04/2026', compareciente:'Pepe Álvarez',      org:'UGT',           tipoOrg:'Sindicato',        rol:'Representante', posicion:'A favor' },
      { fecha:'16/04/2026', compareciente:'José Luis Escrivá', org:'Banco España',  tipoOrg:'Administración',   rol:'Experto/a',     posicion:'Neutral' },
      { fecha:'17/04/2026', compareciente:'Carlos Ocaña',      org:'FUNCAS',        tipoOrg:'Think tank',       rol:'Experto/a',     posicion:'Mixta' },
      { fecha:'17/04/2026', compareciente:'Pilar Sánchez',     org:'AEDAF',         tipoOrg:'Asociación',       rol:'Experto/a',     posicion:'Mixta' },
      { fecha:'18/04/2026', compareciente:'Lorenzo Amor',      org:'ATA',           tipoOrg:'Patronal',         rol:'Representante', posicion:'En contra' },
    ],
    lobbies:[
      { org:'CEOE',     tipoOrg:'Patronal',         reuniones:4, intensidad:92, posicion:'En contra' },
      { org:'CCOO',     tipoOrg:'Sindicato',        reuniones:3, intensidad:78, posicion:'A favor' },
      { org:'AEB',      tipoOrg:'Patronal',         reuniones:3, intensidad:75, posicion:'En contra' },
      { org:'UGT',      tipoOrg:'Sindicato',        reuniones:3, intensidad:72, posicion:'A favor' },
      { org:'FUNCAS',   tipoOrg:'Think tank',       reuniones:2, intensidad:60, posicion:'Mixta' },
      { org:'BdE',      tipoOrg:'Administración',   reuniones:2, intensidad:55, posicion:'Neutral' },
      { org:'CEPYME',   tipoOrg:'Patronal',         reuniones:2, intensidad:48, posicion:'En contra' },
      { org:'IHE',      tipoOrg:'Asociación',       reuniones:1, intensidad:42, posicion:'A favor' },
    ],
  },
  {
    id:'vivienda-2026',
    exp:'121/000041',
    title:'Ley de Vivienda · ampliación zonas tensionadas',
    ministerio:'Vivienda y Agenda Urbana',
    ministra:'Isabel Rodríguez',
    fase:'En Senado · Comisión General CCAA',
    fechaRegistro:'04/02/2026',
    reuniones:[
      { fecha:'12/12/2025', org:'ASPRIMA',                 tipoOrg:'Asociación',     asistentes:'Min. Vivienda · A. Brun (presidente)', posicion:'En contra', resumen:'Rechazo a la ampliación de zonas tensionadas. Demanda de medidas de oferta.',  resultado:'No recogida' },
      { fecha:'15/12/2025', org:'Mesa del Tercer Sector',  tipoOrg:'ONG',            asistentes:'Min. Vivienda · L. Hellín · 3 técnicos',  posicion:'A favor', resumen:'Solicitud de inclusión del derecho a la vivienda y refuerzo del parque público.', resultado:'Parcial' },
      { fecha:'08/01/2026', org:'Cáritas Española',         tipoOrg:'ONG',           asistentes:'Min. Vivienda · M. Bretos · 2 técnicos',  posicion:'A favor', resumen:'Aporta datos sobre exclusión residencial y propone medidas para colectivos vulnerables.', resultado:'Parcial' },
      { fecha:'14/01/2026', org:'AEEPF · Empresas Promotor.',tipoOrg:'Patronal',     asistentes:'SE Vivienda · J. Martínez · 4 técnicos',  posicion:'En contra', resumen:'Propuestas para incentivar promoción de vivienda asequible · contra topes precio.', resultado:'No recogida' },
      { fecha:'19/01/2026', org:'Provivienda',              tipoOrg:'ONG',           asistentes:'SE Vivienda · M. Mascarell',              posicion:'A favor',  resumen:'Refuerzo de la vivienda social y propuestas de mediación con propietarios.',         resultado:'Recogida' },
      { fecha:'25/01/2026', org:'Sindicato Inquilinas Madrid',tipoOrg:'Asociación',  asistentes:'SE Vivienda · 4 representantes',          posicion:'A favor',  resumen:'Reclama bajada efectiva precios. Crítica a límites de las CCAA del PP que no aplican.', resultado:'Recogida' },
      { fecha:'30/01/2026', org:'Banco de España',          tipoOrg:'Administración',asistentes:'Min. Vivienda · D. Macías',               posicion:'Mixta',    resumen:'Análisis técnico sobre efecto en oferta y precios. Recomienda evaluar tras 2 años.',  resultado:'Recogida' },
      { fecha:'05/02/2026', org:'COFRA · Constructoras',    tipoOrg:'Patronal',      asistentes:'SE Vivienda · J. M. Sánchez Pina',        posicion:'En contra', resumen:'Críticas al impacto en la actividad constructora.',                                  resultado:'No recogida' },
    ],
    aportaciones:[
      { fecha:'18/12/2025', org:'ASPRIMA',     tipoOrg:'Asociación', forma:'Documento técnico', resumen:'Análisis del mercado y propuestas de oferta · 124 páginas',                  recogida:'No',      articulo:'Toda la norma' },
      { fecha:'11/01/2026', org:'Cáritas',     tipoOrg:'ONG',        forma:'Informe',           resumen:'Personas en situación de exclusión residencial 2025 · 88 páginas',           recogida:'Parcial', articulo:'Art. 18' },
      { fecha:'21/01/2026', org:'Provivienda', tipoOrg:'ONG',        forma:'Documento técnico', resumen:'Modelos de mediación con propietarios privados',                              recogida:'Sí',      articulo:'Art. 22, D.A. 4ª' },
      { fecha:'28/01/2026', org:'Inquilinas',  tipoOrg:'Asociación', forma:'Carta',             resumen:'Solicitud de inspección activa y multas a grandes tenedores incumplidores',  recogida:'Parcial', articulo:'Art. 25' },
    ],
    comparecencias:[
      { fecha:'10/03/2026', compareciente:'Lorena Hellín',     org:'Mesa Tercer Sector', tipoOrg:'ONG',        rol:'Representante', posicion:'A favor' },
      { fecha:'10/03/2026', compareciente:'Manuel Bretos',     org:'Cáritas',            tipoOrg:'ONG',        rol:'Representante', posicion:'A favor' },
      { fecha:'11/03/2026', compareciente:'Carme Trilla',      org:'Hábitat3',           tipoOrg:'ONG',        rol:'Experto/a',     posicion:'A favor' },
      { fecha:'11/03/2026', compareciente:'Aniceto Brun',      org:'ASPRIMA',            tipoOrg:'Asociación', rol:'Representante', posicion:'En contra' },
      { fecha:'12/03/2026', compareciente:'Beatriz Toribio',   org:'APCEspaña',          tipoOrg:'Patronal',   rol:'Representante', posicion:'En contra' },
      { fecha:'12/03/2026', compareciente:'José García Montalvo',org:'UPF',              tipoOrg:'Universidad',rol:'Experto/a',     posicion:'Mixta' },
    ],
    lobbies:[
      { org:'ASPRIMA',     tipoOrg:'Asociación',   reuniones:3, intensidad:82, posicion:'En contra' },
      { org:'Mesa Tercer Sector',tipoOrg:'ONG',    reuniones:3, intensidad:78, posicion:'A favor' },
      { org:'Cáritas',     tipoOrg:'ONG',          reuniones:2, intensidad:68, posicion:'A favor' },
      { org:'AEEPF',       tipoOrg:'Patronal',     reuniones:2, intensidad:60, posicion:'En contra' },
      { org:'Provivienda', tipoOrg:'ONG',          reuniones:2, intensidad:55, posicion:'A favor' },
      { org:'Inquilinas',  tipoOrg:'Asociación',   reuniones:2, intensidad:52, posicion:'A favor' },
      { org:'BdE',         tipoOrg:'Administración',reuniones:1,intensidad:48, posicion:'Mixta' },
    ],
  },
  {
    id:'jornada-37h',
    exp:'121/000058',
    title:'Reducción de la jornada laboral a 37,5 horas semanales',
    ministerio:'Trabajo y Economía Social',
    ministra:'Yolanda Díaz',
    fase:'En tramitación · Pleno Congreso',
    fechaRegistro:'22/04/2025',
    reuniones:[
      { fecha:'15/01/2025', org:'CCOO',         tipoOrg:'Sindicato',  asistentes:'Min. Trabajo · Sordo · 5 representantes',     posicion:'A favor',   resumen:'Pacto sindical sobre reducción · acompañamiento PYMES · ajuste salarial.', resultado:'Recogida' },
      { fecha:'15/01/2025', org:'UGT',          tipoOrg:'Sindicato',  asistentes:'Min. Trabajo · Pepe Álvarez · 4 representantes', posicion:'A favor',   resumen:'Apoyo a la reducción y garantías sobre jornada efectiva.',                  resultado:'Recogida' },
      { fecha:'22/01/2025', org:'CEOE',         tipoOrg:'Patronal',   asistentes:'Min. Trabajo · Garamendi · 5 técnicos',          posicion:'En contra', resumen:'Rechazo frontal · ruptura del diálogo social · impacto sobre productividad.',resultado:'No recogida' },
      { fecha:'22/01/2025', org:'CEPYME',       tipoOrg:'Patronal',   asistentes:'Min. Trabajo · Cuerva · 3 técnicos',             posicion:'En contra', resumen:'Pymes piden subvenciones específicas si la reducción se aplica.',           resultado:'No recogida' },
      { fecha:'28/01/2025', org:'ATA',          tipoOrg:'Patronal',   asistentes:'SE Trabajo · Lorenzo Amor · 2 técnicos',         posicion:'En contra', resumen:'Autónomos rechazan equiparación. Petición de excepción para microempresas.', resultado:'No recogida' },
      { fecha:'04/02/2025', org:'CES · Consejo Económico y Social', tipoOrg:'Administración',asistentes:'SE Trabajo · A. Iglesias',posicion:'Mixta', resumen:'Dictamen mixto · alerta sobre impacto desigual y necesidad de ayudas.', resultado:'Recogida' },
      { fecha:'12/02/2025', org:'Fundación FUNCAS',tipoOrg:'Think tank',asistentes:'Vp 2ª Díaz · C. Ocaña',                        posicion:'Mixta',     resumen:'Análisis del impacto agregado en empleo y PIB.',                            resultado:'Parcial' },
      { fecha:'18/02/2025', org:'BdE',          tipoOrg:'Administración', asistentes:'Vp 2ª Díaz · D. Macías',                     posicion:'Mixta',     resumen:'Recomendación de gradualidad y monitorización tras aplicación.',           resultado:'Parcial' },
    ],
    aportaciones:[
      { fecha:'18/01/2025', org:'CCOO+UGT', tipoOrg:'Sindicato',forma:'Documento técnico', resumen:'Propuesta conjunta de reducción de jornada · 56 páginas',           recogida:'Sí',      articulo:'Art. 1, Art. 3' },
      { fecha:'24/01/2025', org:'CEOE',     tipoOrg:'Patronal', forma:'Carta',             resumen:'Carta de rechazo y abandono temporal del diálogo social',           recogida:'No',      articulo:'—' },
      { fecha:'05/02/2025', org:'CES',      tipoOrg:'Administración', forma:'Informe',     resumen:'Dictamen 02/2025 · análisis técnico de la propuesta',                recogida:'Parcial', articulo:'Art. 5, D.T. 1ª' },
      { fecha:'14/02/2025', org:'FUNCAS',   tipoOrg:'Think tank',forma:'Informe',           resumen:'Estimación impacto en PIB y empleo',                                recogida:'No',      articulo:'D.A. 2ª' },
    ],
    comparecencias:[
      { fecha:'05/05/2025', compareciente:'Unai Sordo',         org:'CCOO',  tipoOrg:'Sindicato', rol:'Representante', posicion:'A favor' },
      { fecha:'05/05/2025', compareciente:'Pepe Álvarez',       org:'UGT',   tipoOrg:'Sindicato', rol:'Representante', posicion:'A favor' },
      { fecha:'06/05/2025', compareciente:'Antonio Garamendi',  org:'CEOE',  tipoOrg:'Patronal',  rol:'Representante', posicion:'En contra' },
      { fecha:'06/05/2025', compareciente:'Gerardo Cuerva',     org:'CEPYME',tipoOrg:'Patronal',  rol:'Representante', posicion:'En contra' },
      { fecha:'07/05/2025', compareciente:'Lorenzo Amor',       org:'ATA',   tipoOrg:'Patronal',  rol:'Representante', posicion:'En contra' },
    ],
    lobbies:[
      { org:'CEOE',    tipoOrg:'Patronal',  reuniones:5, intensidad:95, posicion:'En contra' },
      { org:'CCOO',    tipoOrg:'Sindicato', reuniones:4, intensidad:88, posicion:'A favor' },
      { org:'UGT',     tipoOrg:'Sindicato', reuniones:4, intensidad:84, posicion:'A favor' },
      { org:'CEPYME',  tipoOrg:'Patronal',  reuniones:3, intensidad:72, posicion:'En contra' },
      { org:'ATA',     tipoOrg:'Patronal',  reuniones:2, intensidad:55, posicion:'En contra' },
      { org:'CES',     tipoOrg:'Administración', reuniones:2, intensidad:48, posicion:'Mixta' },
      { org:'FUNCAS',  tipoOrg:'Think tank',reuniones:1, intensidad:35, posicion:'Mixta' },
    ],
  },
  {
    id:'antitabaco',
    exp:'121/000063',
    title:'Anteproyecto de Ley de prevención del tabaquismo',
    ministerio:'Sanidad',
    ministra:'Mónica García',
    fase:'En tramitación · Comisión de Sanidad',
    fechaRegistro:'18/12/2024',
    reuniones:[
      { fecha:'10/10/2024', org:'CNPT · Comité Nacional Prevención Tabaquismo', tipoOrg:'Asociación', asistentes:'Min. Sanidad · A. Pinet',  posicion:'A favor', resumen:'Apoyo expreso a la prohibición de fumar en terrazas y vehículos con menores.', resultado:'Recogida' },
      { fecha:'15/10/2024', org:'AECC · Asoc. Española Contra el Cáncer',         tipoOrg:'ONG',         asistentes:'Min. Sanidad · R. Vera',   posicion:'A favor', resumen:'Solicitud de elevar el precio del tabaco y restringir publicidad en eventos deportivos.', resultado:'Parcial' },
      { fecha:'22/10/2024', org:'FEHR · Hostelería',                              tipoOrg:'Patronal',    asistentes:'SE Sanidad · J. M. Yzuel',  posicion:'En contra', resumen:'Rechazo a la prohibición en terrazas. Solicita exenciones para terrazas con separación.', resultado:'Parcial' },
      { fecha:'29/10/2024', org:'Tabacalera España (Imperial Brands · Altadis)',  tipoOrg:'Empresa',     asistentes:'Min. Sanidad · 3 directivos', posicion:'En contra', resumen:'Rechazo. Apunta a la pérdida de empleos y al posible aumento del comercio ilegal.', resultado:'No recogida' },
      { fecha:'06/11/2024', org:'OMS · oficina España',                           tipoOrg:'Administración',asistentes:'SE Sanidad · D. Lara',     posicion:'A favor',   resumen:'Aporta datos comparados internacionales y mejores prácticas.', resultado:'Recogida' },
      { fecha:'13/11/2024', org:'Sociedad Española de Neumología (SEPAR)',        tipoOrg:'Asociación',  asistentes:'Min. Sanidad · C. Calle',   posicion:'A favor',   resumen:'Aporta evidencia clínica del impacto del tabaco pasivo en niños.', resultado:'Recogida' },
      { fecha:'20/11/2024', org:'Adelta · Asoc. Hosteleros Madrid',               tipoOrg:'Patronal',    asistentes:'SE Sanidad · J. Galán',     posicion:'En contra', resumen:'Estudios internos sobre el impacto económico previsto.',          resultado:'No recogida' },
      { fecha:'02/12/2024', org:'Comisionado Plan Antidrogas',                    tipoOrg:'Administración',asistentes:'Min. Sanidad · J. Padilla',posicion:'A favor',   resumen:'Coordinación interministerial sobre la implantación.',           resultado:'Recogida' },
    ],
    aportaciones:[
      { fecha:'12/10/2024', org:'CNPT',     tipoOrg:'Asociación',forma:'Documento técnico', resumen:'Plan integral contra el tabaquismo · 132 páginas',                       recogida:'Sí',      articulo:'Toda la norma' },
      { fecha:'17/10/2024', org:'AECC',     tipoOrg:'ONG',       forma:'Informe',           resumen:'Recomendaciones internacionales sobre fiscalidad del tabaco',            recogida:'Parcial', articulo:'Art. 14' },
      { fecha:'24/10/2024', org:'FEHR',     tipoOrg:'Patronal',  forma:'Carta',             resumen:'Carta solicitando excepciones para terrazas con separación física',      recogida:'Parcial', articulo:'Art. 7, Art. 8' },
      { fecha:'08/11/2024', org:'OMS',      tipoOrg:'Administración', forma:'Informe',      resumen:'WHO Framework Convention on Tobacco Control · adaptación España',         recogida:'Sí',      articulo:'Toda la norma' },
      { fecha:'15/11/2024', org:'SEPAR',    tipoOrg:'Asociación',forma:'Documento técnico', resumen:'Evidencia clínica del impacto del tabaquismo pasivo',                     recogida:'Sí',      articulo:'Art. 5' },
    ],
    comparecencias:[
      { fecha:'15/02/2026', compareciente:'Andrés Pinet',     org:'CNPT',  tipoOrg:'Asociación',  rol:'Experto/a',     posicion:'A favor' },
      { fecha:'15/02/2026', compareciente:'Ramón Reyes',      org:'AECC',  tipoOrg:'ONG',         rol:'Representante', posicion:'A favor' },
      { fecha:'16/02/2026', compareciente:'José M. Yzuel',    org:'FEHR',  tipoOrg:'Patronal',    rol:'Representante', posicion:'En contra' },
      { fecha:'16/02/2026', compareciente:'Carmen Calle',     org:'SEPAR', tipoOrg:'Asociación',  rol:'Experto/a',     posicion:'A favor' },
      { fecha:'17/02/2026', compareciente:'Donato Lara',      org:'OMS · España', tipoOrg:'Administración', rol:'Experto/a',  posicion:'A favor' },
    ],
    lobbies:[
      { org:'CNPT',     tipoOrg:'Asociación',     reuniones:4, intensidad:90, posicion:'A favor' },
      { org:'AECC',     tipoOrg:'ONG',            reuniones:3, intensidad:78, posicion:'A favor' },
      { org:'FEHR',     tipoOrg:'Patronal',       reuniones:3, intensidad:72, posicion:'En contra' },
      { org:'OMS',      tipoOrg:'Administración', reuniones:2, intensidad:65, posicion:'A favor' },
      { org:'SEPAR',    tipoOrg:'Asociación',     reuniones:2, intensidad:58, posicion:'A favor' },
      { org:'Tabacalera',tipoOrg:'Empresa',       reuniones:2, intensidad:55, posicion:'En contra' },
      { org:'Adelta',   tipoOrg:'Patronal',       reuniones:1, intensidad:40, posicion:'En contra' },
    ],
  },
]

export const TOP_ORGS: TopOrg[] = [
  { org:'CEOE',                    tipoOrg:'Patronal',         expedientes:2, reuniones:9, aportaciones:2, aceptacion: 8, web:'https://www.ceoe.es/' },
  { org:'CCOO',                    tipoOrg:'Sindicato',        expedientes:2, reuniones:7, aportaciones:2, aceptacion:62, web:'https://www.ccoo.es/' },
  { org:'UGT',                     tipoOrg:'Sindicato',        expedientes:2, reuniones:7, aportaciones:1, aceptacion:60, web:'https://www.ugt.es/' },
  { org:'CEPYME',                  tipoOrg:'Patronal',         expedientes:2, reuniones:5, aportaciones:1, aceptacion:18, web:'https://www.cepyme.es/' },
  { org:'AECC',                    tipoOrg:'ONG',              expedientes:1, reuniones:3, aportaciones:1, aceptacion:55, web:'https://www.contraelcancer.es/' },
  { org:'CNPT',                    tipoOrg:'Asociación',       expedientes:1, reuniones:4, aportaciones:1, aceptacion:88, web:'https://www.cnpt.es/' },
  { org:'BdE',                     tipoOrg:'Administración',   expedientes:3, reuniones:4, aportaciones:1, aceptacion:55, web:'https://www.bde.es/' },
  { org:'FUNCAS',                  tipoOrg:'Think tank',       expedientes:2, reuniones:3, aportaciones:2, aceptacion:50, web:'https://www.funcas.es/' },
  { org:'Mesa Tercer Sector',      tipoOrg:'ONG',              expedientes:1, reuniones:3, aportaciones:0, aceptacion:50, web:'https://www.tercerosector.es/' },
  { org:'ASPRIMA',                 tipoOrg:'Asociación',       expedientes:1, reuniones:3, aportaciones:1, aceptacion: 5, web:'https://www.asprima.es/' },
  { org:'AEB',                     tipoOrg:'Patronal',         expedientes:1, reuniones:3, aportaciones:1, aceptacion:10, web:'https://www.aebanca.es/' },
  { org:'OMS · España',            tipoOrg:'Administración',   expedientes:1, reuniones:2, aportaciones:1, aceptacion:90, web:'https://www.who.int/es' },
]

export const REGISTRO: RegistroLobby[] = [
  { num:'2024-001', nombre:'CEOE',                   tipoOrg:'Patronal',         intereses:'Política económica, fiscal, laboral, energética', presupuesto:'> 5 M€',    activo:true },
  { num:'2024-002', nombre:'CCOO',                   tipoOrg:'Sindicato',        intereses:'Política laboral, salarios, pensiones',           presupuesto:'1-5 M€',     activo:true },
  { num:'2024-003', nombre:'UGT',                    tipoOrg:'Sindicato',        intereses:'Política laboral, formación, prevención',         presupuesto:'1-5 M€',     activo:true },
  { num:'2024-004', nombre:'CEPYME',                 tipoOrg:'Patronal',         intereses:'Política de pymes, fiscal, regulatoria',          presupuesto:'500K-1M€',   activo:true },
  { num:'2024-005', nombre:'AEB',                    tipoOrg:'Patronal',         intereses:'Regulación bancaria, fiscalidad financiera',      presupuesto:'> 5 M€',     activo:true },
  { num:'2024-006', nombre:'AECC',                   tipoOrg:'ONG',              intereses:'Salud pública, prevención del cáncer',            presupuesto:'1-5 M€',     activo:true },
  { num:'2024-007', nombre:'CNPT',                   tipoOrg:'Asociación',       intereses:'Prevención del tabaquismo',                       presupuesto:'< 500K€',    activo:true },
  { num:'2024-008', nombre:'FUNCAS',                 tipoOrg:'Think tank',       intereses:'Análisis económico y financiero',                 presupuesto:'1-5 M€',     activo:true },
  { num:'2024-009', nombre:'ASPRIMA',                tipoOrg:'Asociación',       intereses:'Promoción inmobiliaria, política de vivienda',    presupuesto:'500K-1M€',   activo:true },
  { num:'2024-010', nombre:'Cáritas Española',       tipoOrg:'ONG',              intereses:'Política social, vivienda, exclusión',            presupuesto:'> 5 M€',     activo:true },
  { num:'2024-011', nombre:'FEHR · Hostelería',      tipoOrg:'Patronal',         intereses:'Sector hostelero, fiscalidad, restricciones',     presupuesto:'500K-1M€',   activo:true },
  { num:'2024-012', nombre:'Tabacalera (Altadis)',   tipoOrg:'Empresa',          intereses:'Política tabaco, fiscalidad, regulación',         presupuesto:'> 5 M€',     activo:true },
]
