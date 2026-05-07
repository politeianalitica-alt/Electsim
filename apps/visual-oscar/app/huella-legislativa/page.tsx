'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppHeader from '../_components/AppHeader'
import { isAuthenticated } from '@/lib/auth'

// ─────────────────────────────────────────────────────────────────────────
// Modelo
// ─────────────────────────────────────────────────────────────────────────
type TipoOrg = 'Patronal' | 'Sindicato' | 'Empresa' | 'Asociación' | 'Think tank' | 'ONG' | 'Colegio profesional' | 'Cámara' | 'Universidad' | 'Administración' | 'Consultora'
type Posicion = 'A favor' | 'En contra' | 'Neutral' | 'Mixta'
type Resultado = 'Recogida' | 'Parcial' | 'No recogida' | 'Pendiente'

type Reunion = {
  fecha: string
  org: string
  tipoOrg: TipoOrg
  asistentes: string
  posicion: Posicion
  resumen: string
  resultado: Resultado
}

type Aportacion = {
  fecha: string
  org: string
  tipoOrg: TipoOrg
  forma: 'Documento técnico' | 'Enmienda' | 'Carta' | 'Informe'
  resumen: string
  recogida: 'Sí' | 'Parcial' | 'No'
  articulo?: string
}

type Comparecencia = {
  fecha: string
  compareciente: string
  org: string
  tipoOrg: TipoOrg
  rol: 'Experto/a' | 'Representante' | 'Afectado/a'
  posicion: Posicion
}

type Lobby = {
  org: string
  tipoOrg: TipoOrg
  reuniones: number
  intensidad: number  // 0-100
  posicion: Posicion
}

type ExpedienteHuella = {
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

const TIPO_COLOR: Record<TipoOrg, string> = {
  'Patronal':            '#0E7490',
  'Sindicato':           '#A02525',
  'Empresa':             '#1F4E8C',
  'Asociación':          '#7C3AED',
  'Think tank':          '#5B21B6',
  'ONG':                 '#16A34A',
  'Colegio profesional': '#0F766E',
  'Cámara':              '#B45309',
  'Universidad':         '#9333EA',
  'Administración':      '#525258',
  'Consultora':          '#0369A1',
}

const POS_COLOR: Record<Posicion, string> = {
  'A favor':  '#16A34A',
  'En contra':'#DC2626',
  'Neutral':  '#6e6e73',
  'Mixta':    '#F97316',
}

const RES_COLOR: Record<Resultado, string> = {
  'Recogida':    '#16A34A',
  'Parcial':     '#F97316',
  'No recogida': '#DC2626',
  'Pendiente':   '#5B21B6',
}

const REC_COLOR: Record<'Sí' | 'Parcial' | 'No', string> = {
  'Sí':      '#16A34A',
  'Parcial': '#F97316',
  'No':      '#DC2626',
}

// ─────────────────────────────────────────────────────────────────────────
// Datos · 4 expedientes con huella legislativa documentada
// ─────────────────────────────────────────────────────────────────────────
const EXPEDIENTES: ExpedienteHuella[] = [
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
      { fecha:'16/04/2026', compareciente:'José Luis Escrivá', org:'Banco España',  tipoOrg:'Administración',   rol:'Experto/a',     posicion:'Neutral'  },
      { fecha:'17/04/2026', compareciente:'Carlos Ocaña',      org:'FUNCAS',        tipoOrg:'Think tank',       rol:'Experto/a',     posicion:'Mixta'    },
      { fecha:'17/04/2026', compareciente:'Pilar Sánchez',     org:'AEDAF',         tipoOrg:'Asociación',       rol:'Experto/a',     posicion:'Mixta'    },
      { fecha:'18/04/2026', compareciente:'Lorenzo Amor',      org:'ATA',           tipoOrg:'Patronal',         rol:'Representante', posicion:'En contra' },
    ],
    lobbies:[
      { org:'CEOE',     tipoOrg:'Patronal',         reuniones:4, intensidad:92, posicion:'En contra' },
      { org:'CCOO',     tipoOrg:'Sindicato',        reuniones:3, intensidad:78, posicion:'A favor'  },
      { org:'AEB',      tipoOrg:'Patronal',         reuniones:3, intensidad:75, posicion:'En contra' },
      { org:'UGT',      tipoOrg:'Sindicato',        reuniones:3, intensidad:72, posicion:'A favor'  },
      { org:'FUNCAS',   tipoOrg:'Think tank',       reuniones:2, intensidad:60, posicion:'Mixta'    },
      { org:'BdE',      tipoOrg:'Administración',   reuniones:2, intensidad:55, posicion:'Neutral'  },
      { org:'CEPYME',   tipoOrg:'Patronal',         reuniones:2, intensidad:48, posicion:'En contra' },
      { org:'IHE',      tipoOrg:'Asociación',       reuniones:1, intensidad:42, posicion:'A favor'  },
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
      { fecha:'15/12/2025', org:'Mesa del Tercer Sector',  tipoOrg:'ONG',            asistentes:'Min. Vivienda · L. Hellín · 3 técnicos',  posicion:'A favor', resumen:'Solicitud de inclusión del derecho a la vivienda y refuerzo del parque público.', resultado:'Parcial'    },
      { fecha:'08/01/2026', org:'Cáritas Española',         tipoOrg:'ONG',           asistentes:'Min. Vivienda · M. Bretos · 2 técnicos',  posicion:'A favor', resumen:'Aporta datos sobre exclusión residencial y propone medidas para colectivos vulnerables.', resultado:'Parcial' },
      { fecha:'14/01/2026', org:'AEEPF · Empresas Promotor.',tipoOrg:'Patronal',     asistentes:'SE Vivienda · J. Martínez · 4 técnicos',  posicion:'En contra', resumen:'Propuestas para incentivar promoción de vivienda asequible · contra topes precio.', resultado:'No recogida' },
      { fecha:'19/01/2026', org:'Provivienda',              tipoOrg:'ONG',           asistentes:'SE Vivienda · M. Mascarell',              posicion:'A favor',  resumen:'Refuerzo de la vivienda social y propuestas de mediación con propietarios.',         resultado:'Recogida'   },
      { fecha:'25/01/2026', org:'Sindicato Inquilinas Madrid',tipoOrg:'Asociación',  asistentes:'SE Vivienda · 4 representantes',          posicion:'A favor',  resumen:'Reclama bajada efectiva precios. Crítica a límites de las CCAA del PP que no aplican.', resultado:'Recogida' },
      { fecha:'30/01/2026', org:'Banco de España',          tipoOrg:'Administración',asistentes:'Min. Vivienda · D. Macías',               posicion:'Mixta',    resumen:'Análisis técnico sobre efecto en oferta y precios. Recomienda evaluar tras 2 años.',  resultado:'Recogida'   },
      { fecha:'05/02/2026', org:'COFRA · Constructoras',    tipoOrg:'Patronal',      asistentes:'SE Vivienda · J. M. Sánchez Pina',        posicion:'En contra', resumen:'Críticas al impacto en la actividad constructora.',                                  resultado:'No recogida' },
    ],
    aportaciones:[
      { fecha:'18/12/2025', org:'ASPRIMA',     tipoOrg:'Asociación', forma:'Documento técnico', resumen:'Análisis del mercado y propuestas de oferta · 124 páginas',                  recogida:'No',      articulo:'Toda la norma' },
      { fecha:'11/01/2026', org:'Cáritas',     tipoOrg:'ONG',        forma:'Informe',           resumen:'Personas en situación de exclusión residencial 2025 · 88 páginas',           recogida:'Parcial', articulo:'Art. 18' },
      { fecha:'21/01/2026', org:'Provivienda', tipoOrg:'ONG',        forma:'Documento técnico', resumen:'Modelos de mediación con propietarios privados',                              recogida:'Sí',      articulo:'Art. 22, D.A. 4ª' },
      { fecha:'28/01/2026', org:'Inquilinas',  tipoOrg:'Asociación', forma:'Carta',             resumen:'Solicitud de inspección activa y multas a grandes tenedores incumplidores',  recogida:'Parcial', articulo:'Art. 25' },
    ],
    comparecencias:[
      { fecha:'10/03/2026', compareciente:'Lorena Hellín',     org:'Mesa Tercer Sector', tipoOrg:'ONG',        rol:'Representante', posicion:'A favor'   },
      { fecha:'10/03/2026', compareciente:'Manuel Bretos',     org:'Cáritas',            tipoOrg:'ONG',        rol:'Representante', posicion:'A favor'   },
      { fecha:'11/03/2026', compareciente:'Carme Trilla',      org:'Hábitat3',           tipoOrg:'ONG',        rol:'Experto/a',     posicion:'A favor'   },
      { fecha:'11/03/2026', compareciente:'Aniceto Brun',      org:'ASPRIMA',            tipoOrg:'Asociación', rol:'Representante', posicion:'En contra' },
      { fecha:'12/03/2026', compareciente:'Beatriz Toribio',   org:'APCEspaña',          tipoOrg:'Patronal',   rol:'Representante', posicion:'En contra' },
      { fecha:'12/03/2026', compareciente:'José García Montalvo',org:'UPF',              tipoOrg:'Universidad',rol:'Experto/a',     posicion:'Mixta'     },
    ],
    lobbies:[
      { org:'ASPRIMA',     tipoOrg:'Asociación',   reuniones:3, intensidad:82, posicion:'En contra' },
      { org:'Mesa Tercer Sector',tipoOrg:'ONG',    reuniones:3, intensidad:78, posicion:'A favor'   },
      { org:'Cáritas',     tipoOrg:'ONG',          reuniones:2, intensidad:68, posicion:'A favor'   },
      { org:'AEEPF',       tipoOrg:'Patronal',     reuniones:2, intensidad:60, posicion:'En contra' },
      { org:'Provivienda', tipoOrg:'ONG',          reuniones:2, intensidad:55, posicion:'A favor'   },
      { org:'Inquilinas',  tipoOrg:'Asociación',   reuniones:2, intensidad:52, posicion:'A favor'   },
      { org:'BdE',         tipoOrg:'Administración',reuniones:1,intensidad:48, posicion:'Mixta'     },
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
      { fecha:'04/02/2025', org:'CES · Consejo Económico y Social', tipoOrg:'Administración',asistentes:'SE Trabajo · A. Iglesias','posicion':'Mixta' as Posicion, resumen:'Dictamen mixto · alerta sobre impacto desigual y necesidad de ayudas.', resultado:'Recogida' } as Reunion,
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
      { fecha:'05/05/2025', compareciente:'Unai Sordo',         org:'CCOO',  tipoOrg:'Sindicato', rol:'Representante', posicion:'A favor'   },
      { fecha:'05/05/2025', compareciente:'Pepe Álvarez',       org:'UGT',   tipoOrg:'Sindicato', rol:'Representante', posicion:'A favor'   },
      { fecha:'06/05/2025', compareciente:'Antonio Garamendi',  org:'CEOE',  tipoOrg:'Patronal',  rol:'Representante', posicion:'En contra' },
      { fecha:'06/05/2025', compareciente:'Gerardo Cuerva',     org:'CEPYME',tipoOrg:'Patronal',  rol:'Representante', posicion:'En contra' },
      { fecha:'07/05/2025', compareciente:'Lorenzo Amor',       org:'ATA',   tipoOrg:'Patronal',  rol:'Representante', posicion:'En contra' },
    ],
    lobbies:[
      { org:'CEOE',    tipoOrg:'Patronal',  reuniones:5, intensidad:95, posicion:'En contra' },
      { org:'CCOO',    tipoOrg:'Sindicato', reuniones:4, intensidad:88, posicion:'A favor'   },
      { org:'UGT',     tipoOrg:'Sindicato', reuniones:4, intensidad:84, posicion:'A favor'   },
      { org:'CEPYME',  tipoOrg:'Patronal',  reuniones:3, intensidad:72, posicion:'En contra' },
      { org:'ATA',     tipoOrg:'Patronal',  reuniones:2, intensidad:55, posicion:'En contra' },
      { org:'CES',     tipoOrg:'Administración', reuniones:2, intensidad:48, posicion:'Mixta' },
      { org:'FUNCAS',  tipoOrg:'Think tank',reuniones:1, intensidad:35, posicion:'Mixta'     },
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
      { fecha:'15/02/2026', compareciente:'Andrés Pinet',     org:'CNPT',  tipoOrg:'Asociación',  rol:'Experto/a',     posicion:'A favor'   },
      { fecha:'15/02/2026', compareciente:'Ramón Reyes',      org:'AECC',  tipoOrg:'ONG',         rol:'Representante', posicion:'A favor'   },
      { fecha:'16/02/2026', compareciente:'José M. Yzuel',    org:'FEHR',  tipoOrg:'Patronal',    rol:'Representante', posicion:'En contra' },
      { fecha:'16/02/2026', compareciente:'Carmen Calle',     org:'SEPAR', tipoOrg:'Asociación',  rol:'Experto/a',     posicion:'A favor'   },
      { fecha:'17/02/2026', compareciente:'Donato Lara',      org:'OMS · España', tipoOrg:'Administración', rol:'Experto/a',  posicion:'A favor' },
    ],
    lobbies:[
      { org:'CNPT',     tipoOrg:'Asociación',     reuniones:4, intensidad:90, posicion:'A favor'   },
      { org:'AECC',     tipoOrg:'ONG',            reuniones:3, intensidad:78, posicion:'A favor'   },
      { org:'FEHR',     tipoOrg:'Patronal',       reuniones:3, intensidad:72, posicion:'En contra' },
      { org:'OMS',      tipoOrg:'Administración', reuniones:2, intensidad:65, posicion:'A favor'   },
      { org:'SEPAR',    tipoOrg:'Asociación',     reuniones:2, intensidad:58, posicion:'A favor'   },
      { org:'Tabacalera',tipoOrg:'Empresa',       reuniones:2, intensidad:55, posicion:'En contra' },
      { org:'Adelta',   tipoOrg:'Patronal',       reuniones:1, intensidad:40, posicion:'En contra' },
    ],
  },
]

// Top organizaciones más activas (agregado de las 4 normas)
const TOP_ORGS: { org: string; tipoOrg: TipoOrg; expedientes: number; reuniones: number; aportaciones: number; aceptacion: number; web: string }[] = [
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

// Registro de grupos de interés (mock)
const REGISTRO: { num: string; nombre: string; tipoOrg: TipoOrg; intereses: string; presupuesto: string; activo: boolean }[] = [
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

// ─────────────────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────────────────
export default function HuellaLegislativaPage() {
  const router = useRouter()
  useEffect(() => { if (!isAuthenticated()) router.push('/login') }, [router])

  const [selectedId, setSelectedId] = useState(EXPEDIENTES[0].id)
  const [tab, setTab] = useState<'reuniones' | 'aportaciones' | 'comparecencias' | 'mapa'>('reuniones')
  const selected = useMemo(() => EXPEDIENTES.find(e => e.id === selectedId)!, [selectedId])

  const totals = useMemo(() => {
    const reuniones = EXPEDIENTES.reduce((s, e) => s + e.reuniones.length, 0)
    const aportaciones = EXPEDIENTES.reduce((s, e) => s + e.aportaciones.length, 0)
    const aceptadas = EXPEDIENTES.reduce((s, e) => s + e.aportaciones.filter(a => a.recogida === 'Sí' || a.recogida === 'Parcial').length, 0)
    const tasaAceptacion = aportaciones > 0 ? Math.round((aceptadas / aportaciones) * 100) : 0
    const orgs = new Set<string>()
    for (const e of EXPEDIENTES) for (const r of e.reuniones) orgs.add(r.org)
    return { expedientes: EXPEDIENTES.length, reuniones, aportaciones, tasaAceptacion, orgs: orgs.size }
  }, [])

  return (
    <div style={{ background:'var(--bg)', minHeight:'100vh', fontFamily:'var(--font-text)', color:'#1d1d1f' }}>
      <AppHeader/>
      <main style={{ maxWidth:1500, margin:'0 auto', padding:'24px 28px 80px' }}>

        {/* ───── Hero ───── */}
        <section style={{
          background:'linear-gradient(135deg,#5B21B6 0%,#1e0a4a 100%)',
          borderRadius:18, padding:'28px 36px', marginBottom:18, color:'#fff',
          display:'grid', gridTemplateColumns:'1.5fr 1fr', gap:32, alignItems:'center',
        }}>
          <div>
            <p style={{ fontSize:10.5, fontWeight:700, letterSpacing:'0.14em', opacity:0.7, textTransform:'uppercase', margin:'0 0 8px' }}>
              MONITOR LEGISLATIVO · HUELLA E INFLUENCIA EXTERNA
            </p>
            <h1 style={{ fontFamily:'var(--font-display)', fontSize:30, fontWeight:700, letterSpacing:'-0.024em', margin:'0 0 6px', lineHeight:1.1 }}>
              Quién ha influido <em style={{ fontWeight:300, fontStyle:'italic', color:'rgba(255,255,255,0.7)' }}>en cada norma</em>
            </h1>
            <p style={{ fontSize:13, opacity:0.7, margin:0, lineHeight:1.5 }}>
              {totals.expedientes} expedientes con huella documentada · {totals.orgs} organizaciones implicadas · seguimiento de reuniones bilaterales,
              aportaciones por escrito, comparecencias parlamentarias y mapa de influencia agregado.
            </p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
            <HeroKPI label="Expedientes"  value={String(totals.expedientes)}/>
            <HeroKPI label="Reuniones"    value={String(totals.reuniones)}/>
            <HeroKPI label="Aportaciones" value={String(totals.aportaciones)}/>
            <HeroKPI label="% Aceptadas"  value={`${totals.tasaAceptacion}%`}/>
          </div>
        </section>

        {/* ───── Selector de expediente ───── */}
        <section style={{
          background:'#fff', border:'1px solid #ECECEF', borderRadius:14,
          padding:'14px 18px', marginBottom:14, boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
            <span style={{ fontSize:11, color:'#6e6e73', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase' }}>Expediente:</span>
            <span style={{ fontSize:11.5, color:'#3a3a3d' }}>Selecciona una norma para ver su huella legislativa</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:8 }}>
            {EXPEDIENTES.map(e => {
              const active = e.id === selectedId
              return (
                <button key={e.id} onClick={() => setSelectedId(e.id)} style={{
                  textAlign:'left', cursor:'pointer',
                  background: active ? '#FAFAFB' : '#fff',
                  border:`1px solid ${active ? '#5B21B6' : '#ECECEF'}`,
                  borderRadius:10, padding:'10px 12px',
                  fontFamily:'inherit',
                  boxShadow: active ? '0 0 0 3px rgba(91,33,182,0.10)' : 'none',
                  transition:'box-shadow 200ms',
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:5 }}>
                    <span style={{ fontSize:9.5, fontWeight:700, color:'#5B21B6', letterSpacing:'0.06em' }}>{e.exp}</span>
                    <span style={{ fontSize:9.5, color:'#6e6e73', fontWeight:600 }}>· {e.ministerio}</span>
                  </div>
                  <div style={{ fontSize:12.5, fontWeight:600, color:'#1d1d1f', lineHeight:1.3, marginBottom:3 }}>{e.title}</div>
                  <div style={{ fontSize:10.5, color:'#6e6e73' }}>
                    {e.reuniones.length} reuniones · {e.aportaciones.length} aportaciones · {e.comparecencias.length} comparecencias
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {/* ───── Cabecera del expediente seleccionado ───── */}
        <section style={{
          background:'#fff', border:'1px solid #ECECEF', borderRadius:14,
          padding:'18px 24px', marginBottom:14, boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:18, flexWrap:'wrap' }}>
            <div style={{ flex:'1 1 480px', minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                <span style={{
                  fontSize:9.5, fontWeight:800, letterSpacing:'0.08em',
                  padding:'3px 8px', borderRadius:6,
                  background:'#5B21B6', color:'#fff',
                }}>EXP. {selected.exp}</span>
                <span style={{ fontSize:11, color:'#6e6e73', fontWeight:600 }}>· {selected.ministerio} · {selected.ministra}</span>
                <span style={{ fontSize:11, color:'#6e6e73', fontWeight:600 }}>· Registro: {selected.fechaRegistro}</span>
              </div>
              <h2 style={{ fontFamily:'var(--font-display)', fontSize:21, fontWeight:600, letterSpacing:'-0.018em', margin:'0 0 4px', color:'#1d1d1f', lineHeight:1.2 }}>
                {selected.title}
              </h2>
              <p style={{ margin:0, fontSize:11.5, color:'#6e6e73' }}>{selected.fase}</p>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,auto)', gap:14 }}>
              <CardKPI label="Reuniones"  value={String(selected.reuniones.length)}     color="#5B21B6"/>
              <CardKPI label="Aportac."   value={String(selected.aportaciones.length)} color="#1F4E8C"/>
              <CardKPI label="Compareciencias" value={String(selected.comparecencias.length)} color="#16A34A"/>
              <CardKPI label="Lobbies"    value={String(selected.lobbies.length)}      color="#DC2626"/>
            </div>
          </div>
        </section>

        {/* ───── Tabs ───── */}
        <div style={{ display:'inline-flex', background:'#F5F5F7', borderRadius:999, padding:3, marginBottom:14 }}>
          {([
            { k:'reuniones',     label:'Reuniones bilaterales',  count: selected.reuniones.length },
            { k:'aportaciones',  label:'Aportaciones escritas',  count: selected.aportaciones.length },
            { k:'comparecencias',label:'Comparecencias',         count: selected.comparecencias.length },
            { k:'mapa',          label:'Mapa de influencia',     count: selected.lobbies.length },
          ] as const).map(t => {
            const active = tab === t.k
            return (
              <button key={t.k} onClick={() => setTab(t.k)} style={{
                background: active ? '#fff' : 'transparent',
                color: active ? '#1d1d1f' : '#6e6e73',
                border:'none', borderRadius:999, padding:'7px 16px',
                fontSize:12, fontWeight: active ? 700 : 500, cursor:'pointer',
                fontFamily:'inherit', boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              }}>
                {t.label} <span style={{ marginLeft:5, color: active ? '#5B21B6' : '#6e6e73', fontWeight:700, fontSize:10.5 }}>{t.count}</span>
              </button>
            )
          })}
        </div>

        {/* ───── TAB · Reuniones bilaterales ───── */}
        {tab === 'reuniones' && (
          <section style={{ background:'#fff', border:'1px solid #ECECEF', borderRadius:14, boxShadow:'0 1px 3px rgba(0,0,0,0.04)', overflow:'hidden' }}>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, minWidth:1000 }}>
                <thead>
                  <tr style={{ background:'#FAFAFB', borderBottom:'2px solid #ECECEF' }}>
                    {['Fecha','Organización','Tipo','Asistentes','Posición','Resultado','Resumen'].map(h => (
                      <th key={h} style={{ textAlign:'left', padding:'10px 12px', fontSize:9.5, fontWeight:700, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selected.reuniones.map((r, i) => (
                    <tr key={i} style={{ borderBottom:'1px solid #ECECEF', background: i%2 ? '#fafafa' : '#fff' }}>
                      <td style={{ padding:'9px 12px', fontFamily:'var(--font-display)', fontWeight:700, color:'#1d1d1f', whiteSpace:'nowrap' }}>{r.fecha}</td>
                      <td style={{ padding:'9px 12px', fontWeight:600, color:'#1d1d1f' }}>{r.org}</td>
                      <td style={{ padding:'9px 12px' }}>
                        <span style={{
                          fontSize:9, fontWeight:800, letterSpacing:'0.06em',
                          padding:'2px 7px', borderRadius:4,
                          background: TIPO_COLOR[r.tipoOrg], color:'#fff',
                        }}>{r.tipoOrg.toUpperCase()}</span>
                      </td>
                      <td style={{ padding:'9px 12px', fontSize:11, color:'#3a3a3d' }}>{r.asistentes}</td>
                      <td style={{ padding:'9px 12px' }}>
                        <span style={{
                          fontSize:9.5, fontWeight:700, letterSpacing:'0.06em',
                          padding:'2px 7px', borderRadius:999,
                          background:`${POS_COLOR[r.posicion]}15`, color:POS_COLOR[r.posicion],
                          border:`1px solid ${POS_COLOR[r.posicion]}40`,
                        }}>{r.posicion.toUpperCase()}</span>
                      </td>
                      <td style={{ padding:'9px 12px' }}>
                        <span style={{
                          fontSize:9.5, fontWeight:700, letterSpacing:'0.06em',
                          padding:'2px 7px', borderRadius:999,
                          background:`${RES_COLOR[r.resultado]}15`, color:RES_COLOR[r.resultado],
                          border:`1px solid ${RES_COLOR[r.resultado]}40`,
                        }}>{r.resultado.toUpperCase()}</span>
                      </td>
                      <td style={{ padding:'9px 12px', fontSize:11.5, color:'#3a3a3d', maxWidth:380, lineHeight:1.4 }}>{r.resumen}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ───── TAB · Aportaciones escritas ───── */}
        {tab === 'aportaciones' && (
          <section style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(380px,1fr))', gap:10 }}>
            {selected.aportaciones.map((a, i) => (
              <article key={i} style={{
                background:'#fff', border:'1px solid #ECECEF', borderRadius:12,
                boxShadow:'0 1px 3px rgba(0,0,0,0.04)', overflow:'hidden',
                borderLeft:`3px solid ${REC_COLOR[a.recogida]}`,
              }}>
                <header style={{
                  display:'flex', justifyContent:'space-between', alignItems:'center', gap:10, flexWrap:'wrap',
                  padding:'12px 14px', background:'#FAFAFB', borderBottom:'1px solid #ECECEF',
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                    <span style={{
                      fontSize:9, fontWeight:800, letterSpacing:'0.06em',
                      padding:'2px 7px', borderRadius:4,
                      background:TIPO_COLOR[a.tipoOrg], color:'#fff',
                    }}>{a.tipoOrg.toUpperCase()}</span>
                    <strong style={{ fontSize:13, color:'#1d1d1f' }}>{a.org}</strong>
                  </div>
                  <span style={{ fontFamily:'var(--font-display)', fontSize:11, fontWeight:700, color:'#1d1d1f' }}>{a.fecha}</span>
                </header>
                <div style={{ padding:'12px 14px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:6, flexWrap:'wrap' }}>
                    <span style={{
                      fontSize:9, fontWeight:700, letterSpacing:'0.06em',
                      padding:'2px 7px', borderRadius:999,
                      background:'#5B21B615', color:'#5B21B6', border:'1px solid #5B21B640',
                    }}>{a.forma.toUpperCase()}</span>
                    <span style={{
                      fontSize:9.5, fontWeight:800, letterSpacing:'0.06em',
                      padding:'2px 7px', borderRadius:999,
                      background:`${REC_COLOR[a.recogida]}15`, color:REC_COLOR[a.recogida],
                      border:`1px solid ${REC_COLOR[a.recogida]}40`,
                    }}>RECOGIDA: {a.recogida.toUpperCase()}</span>
                    {a.articulo && (
                      <span style={{ fontSize:10.5, color:'#6e6e73', fontWeight:600 }}>· {a.articulo}</span>
                    )}
                  </div>
                  <p style={{ margin:0, fontSize:12.5, color:'#3a3a3d', lineHeight:1.45 }}>{a.resumen}</p>
                </div>
              </article>
            ))}
          </section>
        )}

        {/* ───── TAB · Comparecencias ───── */}
        {tab === 'comparecencias' && (
          <section style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:10 }}>
            {selected.comparecencias.map((c, i) => (
              <article key={i} style={{
                background:'#fff', border:'1px solid #ECECEF', borderRadius:12,
                boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
                padding:'14px 16px', display:'grid', gridTemplateColumns:'auto 1fr', gap:12, alignItems:'center',
                borderLeft:`3px solid ${TIPO_COLOR[c.tipoOrg]}`,
              }}>
                <div style={{
                  width:42, height:42, borderRadius:'50%', background:TIPO_COLOR[c.tipoOrg], color:'#fff',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontFamily:'var(--font-display)', fontWeight:800, fontSize:13, flexShrink:0,
                }}>{c.compareciente.split(/\s+/).slice(0,2).map(s => s[0]).join('').toUpperCase()}</div>
                <div style={{ minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3, flexWrap:'wrap' }}>
                    <span style={{
                      fontSize:9, fontWeight:800, letterSpacing:'0.06em',
                      padding:'1px 6px', borderRadius:4,
                      background:TIPO_COLOR[c.tipoOrg], color:'#fff',
                    }}>{c.rol.toUpperCase()}</span>
                    <span style={{ fontFamily:'var(--font-display)', fontSize:10.5, color:'#6e6e73', fontWeight:600 }}>· {c.fecha}</span>
                  </div>
                  <div style={{ fontSize:13, fontWeight:600, color:'#1d1d1f', lineHeight:1.2 }}>{c.compareciente}</div>
                  <div style={{ fontSize:11, color:'#3a3a3d', marginTop:1 }}>{c.org}</div>
                  <div style={{ marginTop:5 }}>
                    <span style={{
                      fontSize:9, fontWeight:700, letterSpacing:'0.06em',
                      padding:'2px 7px', borderRadius:999,
                      background:`${POS_COLOR[c.posicion]}15`, color:POS_COLOR[c.posicion],
                      border:`1px solid ${POS_COLOR[c.posicion]}40`,
                    }}>{c.posicion.toUpperCase()}</span>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}

        {/* ───── TAB · Mapa de influencia ───── */}
        {tab === 'mapa' && (
          <section style={{
            background:'#fff', border:'1px solid #ECECEF', borderRadius:14,
            padding:'22px 28px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <h3 style={{ margin:'0 0 4px', fontFamily:'var(--font-display)', fontSize:15, fontWeight:600, letterSpacing:'-0.013em' }}>Intensidad de influencia · {selected.lobbies.length} actores</h3>
            <p style={{ margin:'0 0 16px', fontSize:11.5, color:'#6e6e73' }}>Estimación basada en número de reuniones, aportaciones y eco mediático generado durante la tramitación.</p>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {selected.lobbies.sort((a,b) => b.intensidad - a.intensidad).map(l => (
                <div key={l.org} style={{
                  display:'grid', gridTemplateColumns:'180px 80px 1fr 100px 80px', gap:12, alignItems:'center',
                  padding:'10px 12px', background:'#FAFAFB', border:'1px solid #ECECEF', borderRadius:10,
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:7, minWidth:0 }}>
                    <span style={{ width:8, height:8, borderRadius:'50%', background:TIPO_COLOR[l.tipoOrg], flexShrink:0 }}/>
                    <strong style={{ fontSize:12.5, color:'#1d1d1f', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{l.org}</strong>
                  </div>
                  <span style={{
                    fontSize:9, fontWeight:800, letterSpacing:'0.06em',
                    padding:'2px 7px', borderRadius:4, textAlign:'center',
                    background:TIPO_COLOR[l.tipoOrg], color:'#fff',
                  }}>{l.tipoOrg.toUpperCase()}</span>
                  <div style={{ position:'relative' }}>
                    <div style={{ height:14, background:'#fff', borderRadius:7, overflow:'hidden', border:'1px solid #ECECEF' }}>
                      <div style={{ width:`${l.intensidad}%`, height:'100%', background:POS_COLOR[l.posicion], borderRadius:7 }}/>
                    </div>
                    <span style={{ position:'absolute', right:8, top:-1, fontFamily:'var(--font-display)', fontSize:11, fontWeight:700, color:'#1d1d1f' }}>{l.intensidad}</span>
                  </div>
                  <span style={{
                    fontSize:9.5, fontWeight:700, letterSpacing:'0.06em', textAlign:'center',
                    padding:'2px 7px', borderRadius:999,
                    background:`${POS_COLOR[l.posicion]}15`, color:POS_COLOR[l.posicion],
                    border:`1px solid ${POS_COLOR[l.posicion]}40`,
                  }}>{l.posicion.toUpperCase()}</span>
                  <span style={{ fontSize:11, color:'#6e6e73', textAlign:'right' }}><strong>{l.reuniones}</strong> reun.</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ───── Top organizaciones más activas ───── */}
        <section style={{
          background:'#fff', border:'1px solid #ECECEF', borderRadius:14,
          padding:'22px 28px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)', marginTop:18,
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8, marginBottom:14 }}>
            <h2 style={{ margin:0, fontFamily:'var(--font-display)', fontSize:16, fontWeight:600, letterSpacing:'-0.014em', color:'#1d1d1f' }}>
              Organizaciones más activas <span style={{ color:'#6e6e73', fontWeight:500, fontSize:12 }}>· agregado de los {EXPEDIENTES.length} expedientes</span>
            </h2>
            <span style={{ fontSize:11, color:'#6e6e73' }}>{TOP_ORGS.length} organizaciones</span>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, minWidth:780 }}>
              <thead>
                <tr style={{ background:'#FAFAFB', borderBottom:'2px solid #ECECEF' }}>
                  {[
                    { l:'#',           a:'left'  },
                    { l:'Organización',a:'left'  },
                    { l:'Tipo',        a:'left'  },
                    { l:'Expedientes', a:'right' },
                    { l:'Reuniones',   a:'right' },
                    { l:'Aportac.',    a:'right' },
                    { l:'% Aceptación',a:'left'  },
                    { l:'Web',         a:'center'},
                  ].map(h => (
                    <th key={h.l} style={{ textAlign:h.a as 'left'|'right'|'center', padding:'10px 12px', fontSize:9.5, fontWeight:700, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase' }}>{h.l}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...TOP_ORGS].sort((a,b) => b.reuniones - a.reuniones).map((o, i) => {
                  const accColor = o.aceptacion >= 60 ? '#16A34A' : o.aceptacion >= 30 ? '#F97316' : '#DC2626'
                  return (
                    <tr key={o.org} style={{ borderBottom:'1px solid #ECECEF', background: i%2 ? '#fafafa' : '#fff' }}>
                      <td style={{ padding:'9px 12px', fontFamily:'var(--font-display)', fontWeight:700, color:'#1d1d1f' }}>{i+1}</td>
                      <td style={{ padding:'9px 12px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <span style={{ width:3, height:18, background:TIPO_COLOR[o.tipoOrg], borderRadius:1 }}/>
                          <span style={{ fontWeight:600, color:'#1d1d1f' }}>{o.org}</span>
                        </div>
                      </td>
                      <td style={{ padding:'9px 12px' }}>
                        <span style={{
                          fontSize:9, fontWeight:800, letterSpacing:'0.06em',
                          padding:'2px 7px', borderRadius:4,
                          background:TIPO_COLOR[o.tipoOrg], color:'#fff',
                        }}>{o.tipoOrg.toUpperCase()}</span>
                      </td>
                      <td style={{ padding:'9px 12px', textAlign:'right', fontFamily:'var(--font-display)', fontWeight:700, color:'#5B21B6' }}>{o.expedientes}</td>
                      <td style={{ padding:'9px 12px', textAlign:'right', fontFamily:'var(--font-display)', fontWeight:700, color:'#1d1d1f' }}>{o.reuniones}</td>
                      <td style={{ padding:'9px 12px', textAlign:'right', color:'#3a3a3d' }}>{o.aportaciones}</td>
                      <td style={{ padding:'9px 12px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ flex:1, height:7, background:'#F5F5F7', borderRadius:3, overflow:'hidden', minWidth:60 }}>
                            <div style={{ width:`${o.aceptacion}%`, height:'100%', background:accColor }}/>
                          </div>
                          <span style={{ fontFamily:'var(--font-display)', fontSize:11, fontWeight:700, color:accColor, minWidth:34, textAlign:'right' }}>{o.aceptacion}%</span>
                        </div>
                      </td>
                      <td style={{ padding:'9px 12px', textAlign:'center' }}>
                        <a href={o.web} target="_blank" rel="noopener noreferrer" title={o.web.replace(/^https?:\/\//, '').replace(/\/$/, '')} style={{
                          display:'inline-flex', alignItems:'center', justifyContent:'center',
                          width:24, height:24, borderRadius:6,
                          background:`${TIPO_COLOR[o.tipoOrg]}12`, border:`1px solid ${TIPO_COLOR[o.tipoOrg]}40`,
                          color:TIPO_COLOR[o.tipoOrg], textDecoration:'none',
                        }}>
                          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                            <path d="M3 3h5v5M3 8L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </a>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* ───── Registro de grupos de interés ───── */}
        <section style={{
          background:'#fff', border:'1px solid #ECECEF', borderRadius:14,
          padding:'22px 28px', boxShadow:'0 1px 3px rgba(0,0,0,0.04)', marginTop:14,
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8, marginBottom:6 }}>
            <h2 style={{ margin:0, fontFamily:'var(--font-display)', fontSize:16, fontWeight:600, letterSpacing:'-0.014em', color:'#1d1d1f' }}>
              Registro de grupos de interés <span style={{ color:'#6e6e73', fontWeight:500, fontSize:12 }}>· inscritos en el Ministerio</span>
            </h2>
            <span style={{ fontSize:11, color:'#6e6e73' }}>{REGISTRO.length} entidades</span>
          </div>
          <p style={{ margin:'0 0 14px', fontSize:11.5, color:'#6e6e73' }}>Listado público con identidad, intereses representados y rango presupuestario destinado a actividades de incidencia política.</p>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, minWidth:780 }}>
              <thead>
                <tr style={{ background:'#FAFAFB', borderBottom:'2px solid #ECECEF' }}>
                  {['Núm.','Entidad','Tipo','Intereses representados','Presupuesto anual','Estado'].map(h => (
                    <th key={h} style={{ textAlign:'left', padding:'10px 12px', fontSize:9.5, fontWeight:700, color:'#6e6e73', letterSpacing:'0.06em', textTransform:'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {REGISTRO.map((r, i) => (
                  <tr key={r.num} style={{ borderBottom:'1px solid #ECECEF', background: i%2 ? '#fafafa' : '#fff' }}>
                    <td style={{ padding:'9px 12px', fontFamily:'var(--font-display)', fontWeight:700, color:'#5B21B6' }}>{r.num}</td>
                    <td style={{ padding:'9px 12px', fontWeight:600, color:'#1d1d1f' }}>{r.nombre}</td>
                    <td style={{ padding:'9px 12px' }}>
                      <span style={{
                        fontSize:9, fontWeight:800, letterSpacing:'0.06em',
                        padding:'2px 7px', borderRadius:4,
                        background:TIPO_COLOR[r.tipoOrg], color:'#fff',
                      }}>{r.tipoOrg.toUpperCase()}</span>
                    </td>
                    <td style={{ padding:'9px 12px', color:'#3a3a3d', fontSize:11.5 }}>{r.intereses}</td>
                    <td style={{ padding:'9px 12px', fontFamily:'var(--font-display)', fontWeight:600, color:'#1d1d1f' }}>{r.presupuesto}</td>
                    <td style={{ padding:'9px 12px' }}>
                      <span style={{
                        fontSize:9, fontWeight:800, letterSpacing:'0.06em',
                        padding:'2px 7px', borderRadius:999,
                        background: r.activo ? '#16A34A15' : '#6e6e7315',
                        color: r.activo ? '#16A34A' : '#6e6e73',
                        border:`1px solid ${r.activo ? '#16A34A40' : '#6e6e7340'}`,
                      }}>{r.activo ? 'ACTIVO' : 'INACTIVO'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </main>
      <footer style={{ borderTop:'1px solid var(--hairline)', padding:'18px 28px', textAlign:'center', color:'var(--ink-4)', fontSize:11.5 }}>
        Huella Legislativa · Politeia Analítica · {new Date().getFullYear()}
      </footer>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// Helpers UI
// ─────────────────────────────────────────────────────────────────────────
function HeroKPI({ label, value }: { label:string, value:string }) {
  return (
    <div style={{ textAlign:'center', padding:'10px 6px', borderRadius:10, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.18)' }}>
      <div style={{ fontFamily:'var(--font-display)', fontSize:21, fontWeight:700, lineHeight:1, color:'#fff', letterSpacing:'-0.018em' }}>{value}</div>
      <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', opacity:0.7, marginTop:4, color:'#fff' }}>{label}</div>
    </div>
  )
}

function CardKPI({ label, value, color }: { label:string, value:string, color:string }) {
  return (
    <div style={{ textAlign:'center', minWidth:75 }}>
      <div style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:700, lineHeight:1, color, letterSpacing:'-0.022em' }}>{value}</div>
      <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'#6e6e73', marginTop:3 }}>{label}</div>
    </div>
  )
}
