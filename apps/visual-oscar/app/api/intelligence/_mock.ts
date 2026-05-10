// Shared mock dataset for intelligence routes.
// Realistic Spanish political reality: PSOE, PP, VOX, Sumar, Junts, ERC,
// BOE references, ministerios, Congreso, Senado.

import type {
  Evidencia, Canvas, Hipotesis, ScoreACH,
  Notebook, WorkspaceBlock, DraftDocument, SeccionDraft,
  RiskSnapshot, Signal, Fuente, TeamMember, Watchlist, BrainSession,
} from '@/types/intelligence'

const NOW = '2026-05-10T08:00:00Z'

// ─── Fuentes ─────────────────────────────────────────────────────────
export const MOCK_FUENTES: Fuente[] = [
  { id: 'src-boe', nombre: 'BOE - Boletín Oficial del Estado', tipo: 'oficial', url: 'https://www.boe.es', credibilidad_default: 'A', activa: true, descripcion: 'Diario oficial del Reino de España.', created_at: '2025-01-10T08:00:00Z', updated_at: NOW },
  { id: 'src-congreso', nombre: 'Congreso de los Diputados', tipo: 'oficial', url: 'https://www.congreso.es', credibilidad_default: 'A', activa: true, descripcion: 'Cámara baja de las Cortes Generales.', created_at: '2025-01-10T08:00:00Z', updated_at: NOW },
  { id: 'src-senado', nombre: 'Senado', tipo: 'oficial', url: 'https://www.senado.es', credibilidad_default: 'A', activa: true, created_at: '2025-01-10T08:00:00Z', updated_at: NOW },
  { id: 'src-moncloa', nombre: 'La Moncloa', tipo: 'oficial', url: 'https://www.lamoncloa.gob.es', credibilidad_default: 'A', activa: true, created_at: '2025-01-10T08:00:00Z', updated_at: NOW },
  { id: 'src-ine', nombre: 'INE - Instituto Nacional de Estadística', tipo: 'oficial', url: 'https://www.ine.es', credibilidad_default: 'A', activa: true, created_at: '2025-01-10T08:00:00Z', updated_at: NOW },
  { id: 'src-elpais', nombre: 'El País', tipo: 'medio', url: 'https://elpais.com', credibilidad_default: 'B', activa: true, created_at: '2025-02-01T08:00:00Z', updated_at: NOW },
  { id: 'src-elmundo', nombre: 'El Mundo', tipo: 'medio', url: 'https://www.elmundo.es', credibilidad_default: 'B', activa: true, created_at: '2025-02-01T08:00:00Z', updated_at: NOW },
  { id: 'src-abc', nombre: 'ABC', tipo: 'medio', url: 'https://www.abc.es', credibilidad_default: 'B', activa: true, created_at: '2025-02-01T08:00:00Z', updated_at: NOW },
  { id: 'src-rtve', nombre: 'RTVE', tipo: 'medio', url: 'https://www.rtve.es', credibilidad_default: 'B', activa: true, created_at: '2025-02-01T08:00:00Z', updated_at: NOW },
  { id: 'src-eldiario', nombre: 'elDiario.es', tipo: 'medio', url: 'https://www.eldiario.es', credibilidad_default: 'B', activa: true, created_at: '2025-02-01T08:00:00Z', updated_at: NOW },
  { id: 'src-datos', nombre: 'datos.gob.es', tipo: 'datos_abiertos', url: 'https://datos.gob.es', credibilidad_default: 'A', activa: true, created_at: '2025-03-15T08:00:00Z', updated_at: NOW },
  { id: 'src-cis', nombre: 'CIS - Centro de Investigaciones Sociologicas', tipo: 'oficial', url: 'https://www.cis.es', credibilidad_default: 'A', activa: true, created_at: '2025-03-15T08:00:00Z', updated_at: NOW },
]

// ─── Evidencias ──────────────────────────────────────────────────────
export const MOCK_EVIDENCIAS: Evidencia[] = [
  { id: 'ev-001', titulo: 'Real Decreto-ley 4/2026 de medidas urgentes para el sector agroalimentario', resumen: 'El Consejo de Ministros aprueba medidas de apoyo al sector primario tras la sequía persistente. Incluye ayudas directas y avales ICO por 1.200 M EUR.', url: 'https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-001234', fuente_id: 'src-boe', fuente_nombre: 'BOE', fuente_tipo: 'oficial', credibilidad: 'A', confianza: 1, clasificacion: 'publica', tags: ['agricultura', 'real-decreto', 'sequia'], entidades: ['Ministerio de Agricultura', 'ICO', 'Gobierno'], fecha_documento: '2026-04-18', fecha_ingestion: '2026-04-18T09:30:00Z', autor_ingestion: 'sistema' },
  { id: 'ev-002', titulo: 'Junts retira su apoyo al Gobierno tras la votacion de la ley de amnistia', resumen: 'La portavoz de Junts en el Congreso anuncia ruptura del acuerdo de investidura tras desacuerdo con la aplicacion de la ley.', url: 'https://elpais.com/politica/2026-04-22/junts-retira-apoyo.html', fuente_id: 'src-elpais', fuente_nombre: 'El Pais', fuente_tipo: 'medio', credibilidad: 'B', confianza: 2, clasificacion: 'interna', tags: ['junts', 'investidura', 'amnistia'], entidades: ['Junts', 'Gobierno', 'PSOE', 'Miriam Nogueras'], fecha_documento: '2026-04-22', fecha_ingestion: '2026-04-22T11:15:00Z' },
  { id: 'ev-003', titulo: 'Sentencia del TC sobre la ley de vivienda', resumen: 'El Tribunal Constitucional avala la constitucionalidad parcial de la Ley de Vivienda y declara nulo el articulo 19 sobre indices de precios.', url: 'https://www.tribunalconstitucional.es/sentencias/2026-05', fuente_id: 'src-boe', fuente_nombre: 'BOE', fuente_tipo: 'oficial', credibilidad: 'A', confianza: 1, clasificacion: 'publica', tags: ['vivienda', 'tc', 'sentencia'], entidades: ['Tribunal Constitucional', 'Ministerio de Vivienda'], fecha_documento: '2026-05-02', fecha_ingestion: '2026-05-02T16:45:00Z' },
  { id: 'ev-004', titulo: 'PP propone una mocion de censura constructiva', resumen: 'Alberto Nuñez Feijoo plantea en rueda de prensa una mocion de censura si el Gobierno no convoca elecciones antes de junio.', url: 'https://www.elmundo.es/politica/2026-05-05/pp-mocion.html', fuente_id: 'src-elmundo', fuente_nombre: 'El Mundo', fuente_tipo: 'medio', credibilidad: 'B', confianza: 3, clasificacion: 'interna', tags: ['pp', 'mocion-censura', 'feijoo'], entidades: ['PP', 'Alberto Nuñez Feijoo', 'Congreso'], fecha_documento: '2026-05-05', fecha_ingestion: '2026-05-05T12:00:00Z' },
  { id: 'ev-005', titulo: 'Datos del paro registrado abril 2026', resumen: 'El paro registrado baja en 65.300 personas en abril, situando el total en 2,38 millones segun el Ministerio de Trabajo.', url: 'https://www.lamoncloa.gob.es/serviciosdeprensa/notasprensa/trabajo14', fuente_id: 'src-moncloa', fuente_nombre: 'La Moncloa', fuente_tipo: 'oficial', credibilidad: 'A', confianza: 1, clasificacion: 'publica', tags: ['economia', 'paro', 'empleo'], entidades: ['Ministerio de Trabajo', 'SEPE'], fecha_documento: '2026-05-04', fecha_ingestion: '2026-05-04T10:00:00Z' },
  { id: 'ev-006', titulo: 'Barometro CIS mayo 2026', resumen: 'El CIS situa al PSOE 3 puntos por encima del PP en intencion de voto, con VOX en tercera posicion y Sumar en cuarta.', url: 'https://www.cis.es/barometro-mayo-2026', fuente_id: 'src-cis', fuente_nombre: 'CIS', fuente_tipo: 'oficial', credibilidad: 'A', confianza: 2, clasificacion: 'publica', tags: ['cis', 'barometro', 'electoral'], entidades: ['CIS', 'PSOE', 'PP', 'VOX', 'Sumar'], fecha_documento: '2026-05-06', fecha_ingestion: '2026-05-06T07:30:00Z' },
  { id: 'ev-007', titulo: 'ERC aprueba en congreso extraordinario una nueva linea estrategica', resumen: 'Esquerra Republicana adopta en su congreso extraordinario una hoja de ruta soberanista renovada, con mayoria del 78%.', url: 'https://www.eldiario.es/politica/2026-04-28/erc-congreso.html', fuente_id: 'src-eldiario', fuente_nombre: 'elDiario.es', fuente_tipo: 'medio', credibilidad: 'B', confianza: 2, clasificacion: 'interna', tags: ['erc', 'congreso', 'soberanismo'], entidades: ['ERC', 'Cataluña'], fecha_documento: '2026-04-28', fecha_ingestion: '2026-04-28T14:20:00Z' },
  { id: 'ev-008', titulo: 'VOX presenta enmienda a la totalidad de la ley de cambio climatico', resumen: 'El grupo parlamentario de VOX registra enmienda de devolucion al proyecto de ley de cambio climatico y transicion energetica.', url: 'https://www.congreso.es/iniciativas/121-000045', fuente_id: 'src-congreso', fuente_nombre: 'Congreso', fuente_tipo: 'oficial', credibilidad: 'A', confianza: 1, clasificacion: 'publica', tags: ['vox', 'enmienda', 'clima'], entidades: ['VOX', 'Congreso'], fecha_documento: '2026-05-03', fecha_ingestion: '2026-05-03T18:00:00Z' },
  { id: 'ev-009', titulo: 'Filtracion de borrador del decreto sobre energia nuclear', resumen: 'Documento interno del Ministerio para la Transicion Ecologica con ampliacion de la vida util de Almaraz hasta 2032.', fuente_id: 'src-eldiario', fuente_nombre: 'elDiario.es', fuente_tipo: 'medio', credibilidad: 'C', confianza: 3, clasificacion: 'confidencial', tags: ['energia', 'nuclear', 'almaraz'], entidades: ['Ministerio Transicion Ecologica', 'Almaraz'], fecha_documento: '2026-04-30', fecha_ingestion: '2026-04-30T22:10:00Z' },
  { id: 'ev-010', titulo: 'Comparecencia de la ministra de Hacienda en el Senado', resumen: 'La ministra Maria Jesus Montero comparece para explicar la ejecucion presupuestaria del primer trimestre de 2026.', url: 'https://www.senado.es/comparecencias/2026-05-08', fuente_id: 'src-senado', fuente_nombre: 'Senado', fuente_tipo: 'oficial', credibilidad: 'A', confianza: 1, clasificacion: 'publica', tags: ['hacienda', 'senado', 'presupuesto'], entidades: ['Ministerio de Hacienda', 'Maria Jesus Montero', 'Senado'], fecha_documento: '2026-05-08', fecha_ingestion: '2026-05-08T17:00:00Z' },
  { id: 'ev-011', titulo: 'Datos INE PIB primer trimestre 2026', resumen: 'El INE publica avance de PIB con crecimiento intertrimestral del 0,7% y interanual del 2,4% para Q1 2026.', url: 'https://www.ine.es/prensa/pibtri-q1-2026.pdf', fuente_id: 'src-ine', fuente_nombre: 'INE', fuente_tipo: 'oficial', credibilidad: 'A', confianza: 1, clasificacion: 'publica', tags: ['economia', 'pib', 'crecimiento'], entidades: ['INE', 'Economia'], fecha_documento: '2026-04-29', fecha_ingestion: '2026-04-29T09:00:00Z' },
  { id: 'ev-012', titulo: 'Sumar exige aprobacion del salario minimo en el Pleno', resumen: 'Yolanda Diaz anuncia que Sumar votara en contra del proximo decreto si no se aprueba la subida del SMI a 1.180 EUR.', url: 'https://www.rtve.es/noticias/2026-05-09/sumar-smi.shtml', fuente_id: 'src-rtve', fuente_nombre: 'RTVE', fuente_tipo: 'medio', credibilidad: 'B', confianza: 2, clasificacion: 'interna', tags: ['sumar', 'smi', 'salario-minimo'], entidades: ['Sumar', 'Yolanda Diaz', 'Ministerio Trabajo'], fecha_documento: '2026-05-09', fecha_ingestion: '2026-05-09T19:30:00Z' },
]

// ─── Canvas ──────────────────────────────────────────────────────────
export const MOCK_CANVAS: Canvas[] = [
  { id: 'cnv-001', tipo: 'ach', titulo: 'Probabilidad de adelanto electoral en 2026', descripcion: 'Analisis de hipotesis competitivas sobre la convocatoria anticipada.', autor: 'Analista Senior', tags: ['electoral', 'gobierno'], created_at: '2026-04-10T09:00:00Z', updated_at: '2026-05-09T15:30:00Z' },
  { id: 'cnv-002', tipo: 'stakeholder', titulo: 'Mapa de actores ley vivienda', descripcion: 'Posicion e influencia de cada actor en el debate.', autor: 'Equipo Vivienda', tags: ['vivienda', 'stakeholders'], created_at: '2026-03-20T10:00:00Z', updated_at: '2026-05-02T16:00:00Z' },
  { id: 'cnv-003', tipo: 'scenario', titulo: 'Escenarios fiscales 2026-2027', descripcion: 'Tres escenarios alternativos sobre reforma fiscal.', autor: 'Equipo Economia', tags: ['fiscal', 'escenarios'], created_at: '2026-02-15T08:00:00Z', updated_at: '2026-04-30T12:00:00Z' },
  { id: 'cnv-004', tipo: 'risk', titulo: 'Riesgos politicos Q2 2026', descripcion: 'Mapa de riesgos institucionales y narrativos.', autor: 'Director', tags: ['riesgo'], created_at: '2026-04-01T08:00:00Z', updated_at: '2026-05-08T11:00:00Z' },
  { id: 'cnv-005', tipo: 'timeline', titulo: 'Cronologia ley amnistia', descripcion: 'Hitos clave desde el acuerdo de investidura.', autor: 'Equipo Legislativo', tags: ['amnistia', 'cronologia'], created_at: '2026-01-10T09:00:00Z', updated_at: '2026-04-22T13:00:00Z' },
  { id: 'cnv-006', tipo: 'ach', titulo: 'Pacto presupuestos generales del Estado 2027', descripcion: 'Hipotesis sobre la viabilidad de un pacto de estabilidad.', autor: 'Analista Politico', tags: ['presupuestos', 'pge'], created_at: '2026-04-25T09:00:00Z', updated_at: '2026-05-09T10:00:00Z' },
]

export const MOCK_HIPOTESIS: Hipotesis[] = [
  { id: 'hip-001', canvas_id: 'cnv-001', enunciado: 'Sanchez convoca elecciones antes del verano', orden: 0, probabilidad: 0.25 },
  { id: 'hip-002', canvas_id: 'cnv-001', enunciado: 'El Gobierno agota la legislatura hasta 2027', orden: 1, probabilidad: 0.45 },
  { id: 'hip-003', canvas_id: 'cnv-001', enunciado: 'Mocion de censura del PP prospera', orden: 2, probabilidad: 0.10 },
  { id: 'hip-004', canvas_id: 'cnv-001', enunciado: 'Reforma de gobierno y acuerdo con Junts', orden: 3, probabilidad: 0.20 },
]

export const MOCK_ACH_SCORES: ScoreACH[] = [
  { evidencia_id: 'ev-002', hipotesis_id: 'hip-001', score: 1 },
  { evidencia_id: 'ev-002', hipotesis_id: 'hip-002', score: -1 },
  { evidencia_id: 'ev-002', hipotesis_id: 'hip-003', score: 0 },
  { evidencia_id: 'ev-002', hipotesis_id: 'hip-004', score: 2 },
  { evidencia_id: 'ev-004', hipotesis_id: 'hip-001', score: 1 },
  { evidencia_id: 'ev-004', hipotesis_id: 'hip-003', score: 2 },
  { evidencia_id: 'ev-006', hipotesis_id: 'hip-002', score: 1 },
  { evidencia_id: 'ev-006', hipotesis_id: 'hip-001', score: -1 },
]

// ─── Notebooks ───────────────────────────────────────────────────────
export const MOCK_NOTEBOOK_BLOCKS: WorkspaceBlock[] = [
  { id: 'blk-001', notebook_id: 'nb-001', tipo: 'texto', contenido: 'Resumen ejecutivo: el Gobierno enfrenta una semana clave con la votacion de la ley de cambio climatico y la posible ruptura con Junts.', orden: 0, created_at: '2026-05-09T09:00:00Z', updated_at: '2026-05-09T09:00:00Z' },
  { id: 'blk-002', notebook_id: 'nb-001', tipo: 'hallazgo', contenido: 'Junts ha condicionado su apoyo a la aprobacion del traspaso integral de cercanias antes del 31 de mayo.', orden: 1, created_at: '2026-05-09T09:05:00Z', updated_at: '2026-05-09T09:05:00Z' },
  { id: 'blk-003', notebook_id: 'nb-001', tipo: 'cita', contenido: '"No daremos un cheque en blanco al Gobierno mientras no cumpla los acuerdos firmados" - Miriam Nogueras, portavoz de Junts en el Congreso.', orden: 2, created_at: '2026-05-09T09:10:00Z', updated_at: '2026-05-09T09:10:00Z' },
  { id: 'blk-004', notebook_id: 'nb-001', tipo: 'hipotesis', contenido: 'Si Junts ejecuta su amenaza, el Ejecutivo necesitaria buscar mayoria alternativa con PNV y BNG, lo que retrasaria 2 semanas la tramitacion.', orden: 3, created_at: '2026-05-09T09:15:00Z', updated_at: '2026-05-09T09:15:00Z' },
  { id: 'blk-005', notebook_id: 'nb-001', tipo: 'pregunta', contenido: 'Como afectaria una caida del Gobierno a la presidencia espanola del semestre europeo?', orden: 4, created_at: '2026-05-09T09:20:00Z', updated_at: '2026-05-09T09:20:00Z' },
  { id: 'blk-006', notebook_id: 'nb-002', tipo: 'texto', contenido: 'Analisis del impacto regional de la nueva ley de vivienda tras la sentencia del TC.', orden: 0, created_at: '2026-05-04T11:00:00Z', updated_at: '2026-05-04T11:00:00Z' },
  { id: 'blk-007', notebook_id: 'nb-002', tipo: 'hallazgo', contenido: 'El TC ha tumbado el articulo 19 sobre indices de precios, dejando en suspenso 14 declaraciones de zona tensionada.', orden: 1, created_at: '2026-05-04T11:05:00Z', updated_at: '2026-05-04T11:05:00Z' },
]

export const MOCK_NOTEBOOKS: Notebook[] = [
  { id: 'nb-001', titulo: 'Tension Junts-Gobierno · seguimiento semanal', resumen: 'Cuaderno operativo para el seguimiento de la relacion Junts-PSOE.', estado: 'revision', version: 4, tags: ['junts', 'gobierno', 'investidura'], autor: 'Analista Senior', created_at: '2026-04-22T11:00:00Z', updated_at: '2026-05-09T16:00:00Z', blocks: MOCK_NOTEBOOK_BLOCKS.filter(b => b.notebook_id === 'nb-001') },
  { id: 'nb-002', titulo: 'Impacto sentencia TC sobre ley de vivienda', resumen: 'Analisis del fallo del Tribunal Constitucional.', estado: 'aprobado', version: 2, tags: ['tc', 'vivienda'], autor: 'Equipo Legal', created_at: '2026-05-02T17:00:00Z', updated_at: '2026-05-05T12:00:00Z', blocks: MOCK_NOTEBOOK_BLOCKS.filter(b => b.notebook_id === 'nb-002') },
  { id: 'nb-003', titulo: 'Estrategia narrativa PP - mayo 2026', resumen: 'Mensajes clave y angulos de ataque del Partido Popular.', estado: 'borrador', version: 1, tags: ['pp', 'narrativa'], autor: 'Equipo Comunicacion', created_at: '2026-05-06T10:00:00Z', updated_at: '2026-05-09T11:00:00Z', blocks: [] },
  { id: 'nb-004', titulo: 'Escenarios PGE 2027', resumen: 'Tres escenarios sobre la negociacion presupuestaria.', estado: 'revision', version: 3, tags: ['pge', 'fiscal'], autor: 'Equipo Economia', created_at: '2026-04-15T09:00:00Z', updated_at: '2026-05-08T14:00:00Z', blocks: [] },
  { id: 'nb-005', titulo: 'Mapa de poder Cataluña post 12M', resumen: 'Analisis de equilibrios autonomicos.', estado: 'aprobado', version: 5, tags: ['cataluña', 'autonomico'], autor: 'Analista Territorial', created_at: '2026-03-10T09:00:00Z', updated_at: '2026-04-20T17:00:00Z', blocks: [] },
  { id: 'nb-006', titulo: 'Riesgo regulatorio energias renovables', resumen: 'Impacto del nuevo decreto de retribucion.', estado: 'borrador', version: 1, tags: ['energia', 'regulacion'], autor: 'Sector Energia', created_at: '2026-05-07T10:00:00Z', updated_at: '2026-05-09T18:00:00Z', blocks: [] },
  { id: 'nb-007', titulo: 'Seguimiento ley amnistia · ejecucion judicial', resumen: 'Monitoreo de la aplicacion judicial.', estado: 'revision', version: 7, tags: ['amnistia', 'judicial'], autor: 'Equipo Legal', created_at: '2026-01-05T08:00:00Z', updated_at: '2026-05-09T13:00:00Z', blocks: [] },
  { id: 'nb-008', titulo: 'Briefing diplomatico UE - presidencia 2026', resumen: 'Prioridades de la presidencia espanola.', estado: 'archivado', version: 9, tags: ['ue', 'diplomacia'], autor: 'Asuntos Internacionales', created_at: '2025-11-01T09:00:00Z', updated_at: '2026-02-15T17:00:00Z', blocks: [] },
  { id: 'nb-009', titulo: 'Mapa de votantes jovenes 18-29 - tendencias 2026', resumen: 'Analisis demoscopico del segmento joven.', estado: 'aprobado', version: 2, tags: ['jovenes', 'electoral'], autor: 'Demografia', created_at: '2026-04-01T09:00:00Z', updated_at: '2026-04-25T12:00:00Z', blocks: [] },
  { id: 'nb-010', titulo: 'Seguimiento crisis sequia · sector agroalimentario', resumen: 'Impacto economico y respuestas politicas.', estado: 'revision', version: 4, tags: ['agricultura', 'sequia', 'crisis'], autor: 'Sector Primario', created_at: '2026-03-20T10:00:00Z', updated_at: '2026-05-08T16:00:00Z', blocks: [] },
  { id: 'nb-011', titulo: 'Analisis comparado leyes electorales autonomicas', resumen: 'Diferencias normativas relevantes para futuras campañas.', estado: 'borrador', version: 1, tags: ['electoral', 'autonomico'], autor: 'Analista Senior', created_at: '2026-05-05T11:00:00Z', updated_at: '2026-05-09T09:00:00Z', blocks: [] },
  { id: 'nb-012', titulo: 'Sector defensa - prioridades inversion 2026-2030', resumen: 'Marco estrategico de inversion en defensa.', estado: 'aprobado', version: 6, tags: ['defensa', 'inversion'], autor: 'Sector Defensa', created_at: '2026-02-01T09:00:00Z', updated_at: '2026-04-15T14:00:00Z', blocks: [] },
]

// ─── Drafts ──────────────────────────────────────────────────────────
export const MOCK_DRAFT_SECCIONES: SeccionDraft[] = [
  { id: 'sec-001', titulo: 'Resumen ejecutivo', contenido: 'El presente memo analiza la viabilidad del adelanto electoral en el segundo trimestre de 2026, evaluando senales de los actores institucionales y la opinion publica.', orden: 0 },
  { id: 'sec-002', titulo: 'Contexto', contenido: 'Tras la ruptura parcial con Junts el 22 de abril y la presion mediatica del PP por una mocion de censura, el Gobierno enfrenta un escenario de creciente inestabilidad parlamentaria.', orden: 1 },
  { id: 'sec-003', titulo: 'Hallazgos clave', contenido: '- Junts mantiene veto a leyes orgánicas\n- El PSOE no ha confirmado calendario presupuestario 2027\n- El CIS situa al PSOE 3 puntos por delante del PP', orden: 2 },
  { id: 'sec-004', titulo: 'Implicaciones', contenido: 'En los proximos 30 dias se espera presion creciente sobre el Ejecutivo. La probabilidad de adelanto se estima en 25-30%, aumentando si fracasa la convalidacion del decreto agroalimentario.', orden: 3 },
  { id: 'sec-005', titulo: 'Recomendaciones', contenido: '1. Reforzar seguimiento de mociones parlamentarias\n2. Mapear comunicacion gubernamental sobre calendario electoral\n3. Activar protocolo de respuesta rapida ante cambios de fase', orden: 4 },
]

export const MOCK_DRAFTS: DraftDocument[] = [
  { id: 'drf-001', titulo: 'Memo - probabilidad adelanto electoral 2026', tipo: 'memo', estado: 'revision_interna', clasificacion: 'confidencial', resumen: 'Evaluacion de la probabilidad de elecciones anticipadas en mayo-junio 2026.', secciones: MOCK_DRAFT_SECCIONES, autor: 'Analista Senior', revisores: ['Director', 'Equipo Politico'], created_at: '2026-05-08T10:00:00Z', updated_at: '2026-05-09T17:00:00Z' },
  { id: 'drf-002', titulo: 'Informe - impacto sentencia TC en mercado vivienda', tipo: 'informe', estado: 'aprobado', clasificacion: 'interna', resumen: 'Analisis del impacto regulatorio y de mercado tras la sentencia del TC.', secciones: [], autor: 'Equipo Legal', revisores: ['Director'], created_at: '2026-05-03T09:00:00Z', updated_at: '2026-05-06T15:00:00Z' },
  { id: 'drf-003', titulo: 'Briefing matinal - 9 mayo 2026', tipo: 'briefing', estado: 'entregado', clasificacion: 'interna', resumen: 'Resumen ejecutivo de novedades politicas, regulatorias y narrativas.', secciones: [], autor: 'Equipo Briefing', revisores: [], created_at: '2026-05-09T07:00:00Z', updated_at: '2026-05-09T07:30:00Z' },
  { id: 'drf-004', titulo: 'Alerta - ruptura Junts gobierno', tipo: 'alerta', estado: 'entregado', clasificacion: 'restringida', resumen: 'Comunicacion urgente sobre la retirada de apoyo de Junts.', secciones: [], autor: 'Director', revisores: [], created_at: '2026-04-22T11:30:00Z', updated_at: '2026-04-22T12:00:00Z' },
  { id: 'drf-005', titulo: 'Memo - escenarios PGE 2027', tipo: 'memo', estado: 'borrador', clasificacion: 'confidencial', resumen: 'Tres escenarios de negociacion presupuestaria.', secciones: [], autor: 'Equipo Economia', revisores: [], created_at: '2026-05-07T11:00:00Z', updated_at: '2026-05-09T14:00:00Z' },
  { id: 'drf-006', titulo: 'Informe ejecutivo - panorama Q2 2026', tipo: 'ejecutivo', estado: 'revision_interna', clasificacion: 'confidencial', resumen: 'Vision panoramica del trimestre para C-suite.', secciones: [], autor: 'Director', revisores: ['Junta', 'CEO Cliente'], created_at: '2026-04-30T08:00:00Z', updated_at: '2026-05-08T18:00:00Z' },
  { id: 'drf-007', titulo: 'Briefing - reforma fiscal anuncio Hacienda', tipo: 'briefing', estado: 'aprobado', clasificacion: 'interna', resumen: 'Resumen de la comparecencia de Maria Jesus Montero.', secciones: [], autor: 'Equipo Economia', revisores: ['Director'], created_at: '2026-05-08T17:00:00Z', updated_at: '2026-05-09T09:00:00Z' },
  { id: 'drf-008', titulo: 'Alerta - filtracion borrador decreto nuclear', tipo: 'alerta', estado: 'borrador', clasificacion: 'restringida', resumen: 'Comunicacion sobre filtracion en El Diario.', secciones: [], autor: 'Equipo OSINT', revisores: [], created_at: '2026-04-30T22:30:00Z', updated_at: '2026-05-01T08:00:00Z' },
  { id: 'drf-009', titulo: 'Informe - sector agroalimentario tras RD-l 4/2026', tipo: 'informe', estado: 'borrador', clasificacion: 'interna', resumen: 'Analisis del impacto del Real Decreto-ley.', secciones: [], autor: 'Sector Primario', revisores: [], created_at: '2026-04-19T10:00:00Z', updated_at: '2026-05-08T16:00:00Z' },
  { id: 'drf-010', titulo: 'Memo - estrategia narrativa adversaria', tipo: 'memo', estado: 'revision_interna', clasificacion: 'confidencial', resumen: 'Mapeo de la estrategia comunicativa de PP y VOX.', secciones: [], autor: 'Equipo Comunicacion', revisores: ['Director'], created_at: '2026-05-05T09:00:00Z', updated_at: '2026-05-09T15:00:00Z' },
  { id: 'drf-011', titulo: 'Briefing semanal - 5 al 9 mayo 2026', tipo: 'briefing', estado: 'entregado', clasificacion: 'interna', resumen: 'Resumen de la semana politica y regulatoria.', secciones: [], autor: 'Equipo Briefing', revisores: [], created_at: '2026-05-09T19:00:00Z', updated_at: '2026-05-09T19:30:00Z' },
  { id: 'drf-012', titulo: 'Ejecutivo - mapa riesgos Q2', tipo: 'ejecutivo', estado: 'aprobado', clasificacion: 'confidencial', resumen: 'Resumen ejecutivo de riesgos politicos y regulatorios.', secciones: [], autor: 'Director', revisores: ['Junta'], created_at: '2026-04-05T09:00:00Z', updated_at: '2026-04-12T17:00:00Z' },
]

// ─── Risk & Signals ──────────────────────────────────────────────────
export const MOCK_RISK: RiskSnapshot = {
  generado_en: NOW,
  indice_global: 64,
  delta_24h: 3,
  nivel: 'alto',
  subindices: [
    { dominio: 'politico', valor: 72, delta_24h: 5, nivel: 'alto', drivers: ['Tension Junts-PSOE', 'Mocion censura PP'] },
    { dominio: 'regulatorio', valor: 58, delta_24h: -1, nivel: 'medio', drivers: ['Sentencia TC ley vivienda', 'Decreto agroalimentario'] },
    { dominio: 'reputacional', valor: 49, delta_24h: 2, nivel: 'medio', drivers: ['Filtracion decreto nuclear'] },
    { dominio: 'narrativo', valor: 67, delta_24h: 4, nivel: 'alto', drivers: ['Hashtag #DimisionSanchez en X', 'Frame "fin de ciclo"'] },
    { dominio: 'electoral', valor: 55, delta_24h: 0, nivel: 'medio', drivers: ['CIS mayo: empate tecnico'] },
    { dominio: 'institucional', valor: 61, delta_24h: 1, nivel: 'alto', drivers: ['Tension Senado vs Congreso'] },
    { dominio: 'geopolitico', valor: 70, delta_24h: 6, nivel: 'alto', drivers: ['Tension Sahel', 'Crisis Ucrania-UE'] },
    { dominio: 'economico', valor: 42, delta_24h: -2, nivel: 'medio', drivers: ['Buen dato paro abril', 'PIB 2,4%'] },
  ],
  sparkline: [58, 60, 59, 62, 61, 63, 65, 64, 66, 64, 63, 62, 64],
}

export const MOCK_SIGNALS: Signal[] = [
  { id: 'sig-001', titulo: 'Junts retira apoyo al Gobierno', descripcion: 'Ruptura del acuerdo de investidura tras desacuerdo con la aplicacion de la ley de amnistia.', dominio: 'politico', relevancia: 'critica', fuente_nombre: 'El Pais', detectado_en: '2026-04-22T11:15:00Z', tags: ['junts', 'investidura'], evidencia_id: 'ev-002' },
  { id: 'sig-002', titulo: 'Sentencia TC tumba articulo 19 ley vivienda', descripcion: 'El Tribunal Constitucional declara nulo el articulo sobre indices de precios.', dominio: 'regulatorio', relevancia: 'alta', fuente_nombre: 'BOE', detectado_en: '2026-05-02T16:45:00Z', tags: ['tc', 'vivienda'], evidencia_id: 'ev-003' },
  { id: 'sig-003', titulo: 'PP plantea mocion de censura constructiva', descripcion: 'Feijoo condiciona presentar mocion si no hay elecciones antes de junio.', dominio: 'politico', relevancia: 'alta', fuente_nombre: 'El Mundo', detectado_en: '2026-05-05T12:00:00Z', tags: ['pp', 'mocion'], evidencia_id: 'ev-004' },
  { id: 'sig-004', titulo: 'Hashtag #DimisionSanchez tendencia en X', descripcion: 'Hashtag coordinado con 480.000 menciones en 6 horas, multiples cuentas anonimas.', dominio: 'narrativo', relevancia: 'alta', fuente_nombre: 'OSINT interno', detectado_en: '2026-05-08T22:00:00Z', tags: ['hashtag', 'desinformacion'] },
  { id: 'sig-005', titulo: 'Filtracion borrador decreto nuclear Almaraz', descripcion: 'Documento interno publicado en elDiario.es muestra ampliacion vida util a 2032.', dominio: 'regulatorio', relevancia: 'alta', fuente_nombre: 'elDiario.es', detectado_en: '2026-04-30T22:10:00Z', tags: ['energia', 'nuclear'], evidencia_id: 'ev-009' },
  { id: 'sig-006', titulo: 'CIS mayo: empate tecnico PSOE-PP', descripcion: 'Reduccion de la ventaja socialista a 3 puntos, dentro del margen de error.', dominio: 'electoral', relevancia: 'media', fuente_nombre: 'CIS', detectado_en: '2026-05-06T07:30:00Z', tags: ['cis', 'sondeo'], evidencia_id: 'ev-006' },
  { id: 'sig-007', titulo: 'VOX enmienda totalidad ley clima', descripcion: 'Bloqueo procesal a la tramitacion del proyecto.', dominio: 'politico', relevancia: 'media', fuente_nombre: 'Congreso', detectado_en: '2026-05-03T18:00:00Z', tags: ['vox', 'clima'], evidencia_id: 'ev-008' },
  { id: 'sig-008', titulo: 'Sumar amenaza con votar en contra del SMI', descripcion: 'Yolanda Diaz endurece la posicion negociadora.', dominio: 'politico', relevancia: 'media', fuente_nombre: 'RTVE', detectado_en: '2026-05-09T19:30:00Z', tags: ['sumar', 'smi'], evidencia_id: 'ev-012' },
  { id: 'sig-009', titulo: 'PIB Q1 2026 al 2,4% interanual', descripcion: 'INE confirma crecimiento por encima de la media UE.', dominio: 'economico', relevancia: 'baja', fuente_nombre: 'INE', detectado_en: '2026-04-29T09:00:00Z', tags: ['pib', 'crecimiento'], evidencia_id: 'ev-011' },
  { id: 'sig-010', titulo: 'Tension diplomatica Sahel afecta vuelos', descripcion: 'Cierre del espacio aereo de Niger impacta operaciones europeas.', dominio: 'geopolitico', relevancia: 'alta', fuente_nombre: 'Agencias', detectado_en: '2026-05-07T14:00:00Z', tags: ['sahel', 'geopolitica'] },
  { id: 'sig-011', titulo: 'Reduccion paro registrado abril', descripcion: 'Bajada de 65.300 personas, mejor abril desde 2008.', dominio: 'economico', relevancia: 'baja', fuente_nombre: 'Moncloa', detectado_en: '2026-05-04T10:00:00Z', tags: ['paro', 'empleo'], evidencia_id: 'ev-005' },
  { id: 'sig-012', titulo: 'Comparecencia Montero en Senado', descripcion: 'La ministra explica ejecucion presupuestaria Q1.', dominio: 'institucional', relevancia: 'media', fuente_nombre: 'Senado', detectado_en: '2026-05-08T17:00:00Z', tags: ['hacienda', 'senado'], evidencia_id: 'ev-010' },
]

// ─── Team ────────────────────────────────────────────────────────────
export const MOCK_TEAM: TeamMember[] = [
  { id: 'usr-001', nombre: 'Maria Lopez', email: 'm.lopez@politeia.es', rol: 'admin', activo: true, ultimo_acceso: '2026-05-10T07:30:00Z' },
  { id: 'usr-002', nombre: 'Carlos Ruiz', email: 'c.ruiz@politeia.es', rol: 'analista', activo: true, ultimo_acceso: '2026-05-09T19:00:00Z' },
  { id: 'usr-003', nombre: 'Ana Gomez', email: 'a.gomez@politeia.es', rol: 'analista', activo: true, ultimo_acceso: '2026-05-09T22:30:00Z' },
  { id: 'usr-004', nombre: 'Javier Martin', email: 'j.martin@politeia.es', rol: 'editor', activo: true, ultimo_acceso: '2026-05-10T06:00:00Z' },
  { id: 'usr-005', nombre: 'Lucia Herrero', email: 'l.herrero@politeia.es', rol: 'analista', activo: true, ultimo_acceso: '2026-05-09T15:00:00Z' },
  { id: 'usr-006', nombre: 'Pablo Sanchez', email: 'p.sanchez@politeia.es', rol: 'lector', activo: true, ultimo_acceso: '2026-05-08T11:00:00Z' },
  { id: 'usr-007', nombre: 'Elena Vega', email: 'e.vega@politeia.es', rol: 'editor', activo: true, ultimo_acceso: '2026-05-09T16:30:00Z' },
  { id: 'usr-008', nombre: 'Daniel Castro', email: 'd.castro@politeia.es', rol: 'analista', activo: false, ultimo_acceso: '2026-04-12T10:00:00Z' },
  { id: 'usr-009', nombre: 'Sara Romero', email: 's.romero@politeia.es', rol: 'lector', activo: true, ultimo_acceso: '2026-05-07T18:00:00Z' },
  { id: 'usr-010', nombre: 'Ricardo Ortiz', email: 'r.ortiz@politeia.es', rol: 'admin', activo: true, ultimo_acceso: '2026-05-10T08:15:00Z' },
  { id: 'usr-011', nombre: 'Marta Reyes', email: 'm.reyes@politeia.es', rol: 'analista', activo: true, ultimo_acceso: '2026-05-09T20:00:00Z' },
  { id: 'usr-012', nombre: 'Iván Núñez', email: 'i.nunez@politeia.es', rol: 'lector', activo: false, ultimo_acceso: '2026-03-22T09:00:00Z' },
]

// ─── Watchlists ──────────────────────────────────────────────────────
export const MOCK_WATCHLISTS: Watchlist[] = [
  { id: 'wl-001', nombre: 'Junts y aliados', descripcion: 'Seguimiento de declaraciones y movimientos.', terminos: ['Junts', 'Miriam Nogueras', 'Carles Puigdemont', 'Jordi Turull'], activa: true, alertas_count: 14, ultima_alerta: '2026-05-09T18:00:00Z', created_at: '2026-01-10T09:00:00Z', updated_at: '2026-05-09T18:00:00Z' },
  { id: 'wl-002', nombre: 'Reforma fiscal 2027', descripcion: 'Senales sobre la negociacion presupuestaria.', terminos: ['PGE 2027', 'Reforma fiscal', 'IRPF', 'Maria Jesus Montero'], activa: true, alertas_count: 8, ultima_alerta: '2026-05-08T17:00:00Z', created_at: '2026-02-15T08:00:00Z', updated_at: '2026-05-08T17:00:00Z' },
  { id: 'wl-003', nombre: 'Sector vivienda', descripcion: 'Decretos, sentencias y debates sobre vivienda.', terminos: ['Ley de Vivienda', 'Zonas tensionadas', 'TC vivienda', 'Indice precios alquiler'], activa: true, alertas_count: 22, ultima_alerta: '2026-05-02T16:45:00Z', created_at: '2026-01-05T09:00:00Z', updated_at: '2026-05-02T16:45:00Z' },
  { id: 'wl-004', nombre: 'Adversarios PP', descripcion: 'Movimientos del Partido Popular.', terminos: ['Feijoo', 'Cuca Gamarra', 'Mocion de censura'], activa: true, alertas_count: 18, ultima_alerta: '2026-05-09T11:00:00Z', created_at: '2026-01-15T09:00:00Z', updated_at: '2026-05-09T11:00:00Z' },
  { id: 'wl-005', nombre: 'Sector energia', descripcion: 'Decretos, retribucion, nuclear y renovables.', terminos: ['Almaraz', 'Renovables', 'CNMC energia', 'Decreto retribucion'], activa: true, alertas_count: 11, ultima_alerta: '2026-04-30T22:10:00Z', created_at: '2026-02-01T09:00:00Z', updated_at: '2026-04-30T22:10:00Z' },
  { id: 'wl-006', nombre: 'Cataluña post 12M', descripcion: 'Equilibrios autonomicos en Cataluña.', terminos: ['ERC', 'Junts', 'Salvador Illa', 'Generalitat'], activa: true, alertas_count: 9, ultima_alerta: '2026-04-28T14:20:00Z', created_at: '2026-03-01T09:00:00Z', updated_at: '2026-04-28T14:20:00Z' },
  { id: 'wl-007', nombre: 'Narrativas hostiles', descripcion: 'Hashtags y campañas coordinadas.', terminos: ['#DimisionSanchez', '#GobiernoIlegitimo', 'Astroturfing'], activa: true, alertas_count: 27, ultima_alerta: '2026-05-09T22:00:00Z', created_at: '2026-01-20T09:00:00Z', updated_at: '2026-05-09T22:00:00Z' },
  { id: 'wl-008', nombre: 'VOX y extrema derecha', descripcion: 'Movimientos parlamentarios y narrativos.', terminos: ['VOX', 'Santiago Abascal', 'Patriotas'], activa: true, alertas_count: 13, ultima_alerta: '2026-05-03T18:00:00Z', created_at: '2026-01-15T09:00:00Z', updated_at: '2026-05-03T18:00:00Z' },
  { id: 'wl-009', nombre: 'Sumar y Yolanda Diaz', descripcion: 'Tensiones internas en el Gobierno.', terminos: ['Sumar', 'Yolanda Diaz', 'SMI'], activa: false, alertas_count: 6, ultima_alerta: '2026-04-15T10:00:00Z', created_at: '2026-02-10T09:00:00Z', updated_at: '2026-05-01T09:00:00Z' },
  { id: 'wl-010', nombre: 'Sector defensa UE', descripcion: 'Inversion y compras militares.', terminos: ['EDIS', 'EDF', 'Indra', 'Navantia'], activa: true, alertas_count: 7, ultima_alerta: '2026-05-06T11:00:00Z', created_at: '2026-02-20T09:00:00Z', updated_at: '2026-05-06T11:00:00Z' },
  { id: 'wl-011', nombre: 'Sequia y crisis hidrica', descripcion: 'Embalses, restricciones y ayudas.', terminos: ['Sequia', 'Embalses', 'Restricciones agua', 'Trasvase'], activa: true, alertas_count: 10, ultima_alerta: '2026-04-18T09:30:00Z', created_at: '2026-03-01T09:00:00Z', updated_at: '2026-04-18T09:30:00Z' },
  { id: 'wl-012', nombre: 'Tribunal Constitucional', descripcion: 'Sentencias y composicion del TC.', terminos: ['Tribunal Constitucional', 'Sentencia TC', 'Magistrados TC'], activa: true, alertas_count: 5, ultima_alerta: '2026-05-02T16:45:00Z', created_at: '2026-01-10T09:00:00Z', updated_at: '2026-05-02T16:45:00Z' },
]

// ─── Brain ───────────────────────────────────────────────────────────
export const MOCK_BRAIN_SESSIONS: BrainSession[] = [
  { id: 'bs-001', titulo: 'Analisis riesgo politico mayo 2026', messages: [
    { id: 'msg-001', role: 'user', content: 'Cual es la probabilidad de adelanto electoral?', created_at: '2026-05-09T10:00:00Z' },
    { id: 'msg-002', role: 'assistant', content: 'Segun las senales actuales (ruptura parcial Junts, presion PP, CIS estable), la probabilidad de adelanto en mayo-junio 2026 se situa en el rango 25-30%. Los factores que aumentarian la probabilidad incluyen: 1) fracaso de la convalidacion del decreto agroalimentario, 2) endurecimiento de Junts antes del 31 de mayo, 3) deterioro de la posicion del PSOE en el barometro de junio.', created_at: '2026-05-09T10:00:30Z', citas: [{ titulo: 'Junts retira apoyo', url: 'https://elpais.com' }, { titulo: 'CIS mayo 2026', url: 'https://www.cis.es' }] },
  ], created_at: '2026-05-09T10:00:00Z', updated_at: '2026-05-09T10:01:00Z' },
]

export function nowIso(): string { return new Date().toISOString() }
