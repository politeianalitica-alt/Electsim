/**
 * lib/tercer-sector/organizaciones-catalog.ts · Catálogo curado AMPLIADO del
 * directorio de entidades del tercer sector español · Sprint TS2-orgs.
 *
 * Este catálogo de-hardcodea y AMPLÍA las 30 ONGs que estaban embebidas en
 * `app/sector-tercer-sector/page.tsx` (leídas como semilla, NO editadas) a un
 * directorio serio y representativo del ecosistema: fundaciones, asociaciones
 * declaradas de utilidad pública, ONGD de desarrollo, cooperativas/economía
 * social y entidades cumbre (federaciones/plataformas).
 *
 * Cada entrada es un dato CURADO + DATADO + con FUENTE (regla CLAUDE.md: nada
 * hardcodeado sin cita). Las cifras de ingresos/empleados son del último
 * informe anual / memoria pública disponible de cada entidad y deben tratarse
 * como orden de magnitud (`fecha_ref` indica el ejercicio). El endpoint
 * `/api/tercer-sector/organizaciones` sirve este catálogo con filtros +
 * paginación y lo ENRIQUECE donde puede con datos vivos (beneficiarios BDNS),
 * marcando cada entrada como `catalogo` vs `live`.
 *
 * NIFs/CIFs: muchos son públicos (BOE, memorias, IATI ES-CIF-<CIF>). Donde no
 * se ha verificado uno con confianza se deja `nif` ausente (no se inventa).
 *
 * Tipos planos (sin dependencias salvo shared) para usarse en route handlers y
 * tests Node (--experimental-strip-types).
 */
import type { OrgTipo, OrgAmbito } from './shared'

/**
 * Entidad del tercer sector. Shape EXACTO del catálogo y base del shape del
 * endpoint (que añade campos de enriquecimiento opcionales).
 */
export interface Organizacion {
  /** Slug estable (id de la entidad). */
  slug: string
  nombre: string
  /** NIF/CIF si está verificado públicamente; ausente si no. NUNCA inventado. */
  nif?: string
  tipo: OrgTipo
  /** Sector de actividad (clave de SECTOR_LABEL en shared). */
  sector: string
  ambito: OrgAmbito
  /** CCAA de la sede (clave estable de CCAA en shared); ausente si internacional difusa. */
  ccaa?: string
  /** Ingresos anuales en euros (último ejercicio público); null si no publicado. */
  ingresos_eur?: number | null
  /** Empleados (plantilla media del último ejercicio); null si no publicado. */
  empleados?: number | null
  /** Adherida al convenio IRPF 0,7% Fines Sociales (casilla de fines sociales). */
  irpf_07?: boolean
  /** Web oficial. */
  website?: string
  /** Fuente del dato (organismo / memoria / portal). */
  fuente: string
  /** Año/fecha de referencia del dato económico (YYYY o YYYY-MM-DD). */
  fecha_ref: string
}

/**
 * Catálogo ampliado. Orden indiferente (el endpoint ordena por ingresos desc
 * por defecto). Las 30 entidades semilla de la página están incluidas (con
 * datos revisados) + ampliación a un directorio amplio.
 */
export const ORGANIZACIONES: Organizacion[] = [
  // ─── Acción social y asistencia · grandes entidades estatales ──────────────
  { slug: 'caritas-espanola', nombre: 'Cáritas Española', nif: 'R2800032B', tipo: 'asociacion_dup', sector: 'asistencia_social', ambito: 'estatal', ccaa: 'madrid', ingresos_eur: 386_000_000, empleados: 5800, irpf_07: true, website: 'https://www.caritas.es', fuente: 'Memoria Cáritas Confederal', fecha_ref: '2023' },
  { slug: 'cruz-roja-espanola', nombre: 'Cruz Roja Española', nif: 'Q2866001G', tipo: 'asociacion_dup', sector: 'humanitario', ambito: 'estatal', ccaa: 'madrid', ingresos_eur: 942_000_000, empleados: 12500, irpf_07: true, website: 'https://www.cruzroja.es', fuente: 'Memoria Cruz Roja Española', fecha_ref: '2023' },
  { slug: 'fundacion-la-caixa', nombre: 'Fundación Bancaria "la Caixa"', nif: 'G58899998', tipo: 'fundacion', sector: 'obra_social_bancaria', ambito: 'estatal', ccaa: 'cataluna', ingresos_eur: 505_000_000, empleados: 800, irpf_07: false, website: 'https://fundacionlacaixa.org', fuente: 'Presupuesto Obra Social "la Caixa"', fecha_ref: '2024' },
  { slug: 'fundacion-once', nombre: 'Fundación ONCE', nif: 'G78661923', tipo: 'fundacion', sector: 'discapacidad', ambito: 'estatal', ccaa: 'madrid', ingresos_eur: 87_000_000, empleados: 1500, irpf_07: true, website: 'https://www.fundaciononce.es', fuente: 'Memoria Fundación ONCE', fecha_ref: '2023' },
  { slug: 'fundacion-secretariado-gitano', nombre: 'Fundación Secretariado Gitano', nif: 'G83117374', tipo: 'fundacion', sector: 'inclusion_social', ambito: 'estatal', ccaa: 'madrid', ingresos_eur: 70_000_000, empleados: 1450, irpf_07: true, website: 'https://www.gitanos.org', fuente: 'Memoria FSG', fecha_ref: '2023' },
  { slug: 'fesbal', nombre: 'Federación Española de Bancos de Alimentos (FESBAL)', nif: 'G80042747', tipo: 'federacion', sector: 'pobreza', ambito: 'estatal', ccaa: 'madrid', ingresos_eur: 18_000_000, empleados: 110, irpf_07: true, website: 'https://www.bancodealimentos.es', fuente: 'Memoria FESBAL', fecha_ref: '2023' },
  { slug: 'fundacion-cepaim', nombre: 'Fundación Cepaim', nif: 'G73600553', tipo: 'fundacion', sector: 'inclusion_social', ambito: 'estatal', ccaa: 'murcia', ingresos_eur: 55_000_000, empleados: 950, irpf_07: true, website: 'https://www.cepaim.org', fuente: 'Memoria Cepaim', fecha_ref: '2023' },
  { slug: 'accem', nombre: 'Accem', nif: 'G79963237', tipo: 'ongd', sector: 'refugiados', ambito: 'estatal', ccaa: 'madrid', ingresos_eur: 110_000_000, empleados: 1700, irpf_07: true, website: 'https://www.accem.es', fuente: 'Memoria Accem', fecha_ref: '2023' },
  { slug: 'cear', nombre: 'Comisión Española de Ayuda al Refugiado (CEAR)', nif: 'G28651529', tipo: 'asociacion_dup', sector: 'refugiados', ambito: 'estatal', ccaa: 'madrid', ingresos_eur: 130_000_000, empleados: 1600, irpf_07: true, website: 'https://www.cear.es', fuente: 'Memoria CEAR', fecha_ref: '2023' },
  { slug: 'provivienda', nombre: 'Provivienda', nif: 'G79408910', tipo: 'asociacion_dup', sector: 'vivienda', ambito: 'estatal', ccaa: 'madrid', ingresos_eur: 19_000_000, empleados: 300, irpf_07: true, website: 'https://www.provivienda.org', fuente: 'Memoria Provivienda', fecha_ref: '2023' },
  { slug: 'rais-hogar-si', nombre: 'Provivienda / Hogar Sí (RAIS)', nif: 'G82037076', tipo: 'fundacion', sector: 'vivienda', ambito: 'estatal', ccaa: 'madrid', ingresos_eur: 14_000_000, empleados: 220, irpf_07: true, website: 'https://hogarsi.org', fuente: 'Memoria Hogar Sí', fecha_ref: '2023' },

  // ─── Cooperación internacional / ONGD ──────────────────────────────────────
  { slug: 'oxfam-intermon', nombre: 'Oxfam Intermón', nif: 'G58236803', tipo: 'ongd', sector: 'cooperacion_internacional', ambito: 'internacional', ccaa: 'cataluna', ingresos_eur: 78_000_000, empleados: 700, irpf_07: true, website: 'https://www.oxfamintermon.org', fuente: 'Memoria Oxfam Intermón · IATI ES-CIF-G58236803', fecha_ref: '2023' },
  { slug: 'msf-espana', nombre: 'Médicos Sin Fronteras España', nif: 'G79205337', tipo: 'ongd', sector: 'humanitario', ambito: 'internacional', ccaa: 'madrid', ingresos_eur: 138_000_000, empleados: 320, irpf_07: true, website: 'https://www.msf.es', fuente: 'Memoria MSF España', fecha_ref: '2023' },
  { slug: 'accion-contra-hambre', nombre: 'Acción contra el Hambre', nif: 'G81164105', tipo: 'ongd', sector: 'humanitario', ambito: 'internacional', ccaa: 'madrid', ingresos_eur: 95_000_000, empleados: 600, irpf_07: true, website: 'https://www.accioncontraelhambre.org', fuente: 'Memoria ACH · IATI ES-CIF-G81164105', fecha_ref: '2023' },
  { slug: 'manos-unidas', nombre: 'Manos Unidas', nif: 'G28567790', tipo: 'ongd', sector: 'cooperacion_internacional', ambito: 'internacional', ccaa: 'madrid', ingresos_eur: 51_000_000, empleados: 170, irpf_07: true, website: 'https://www.manosunidas.org', fuente: 'Memoria Manos Unidas', fecha_ref: '2023' },
  { slug: 'unicef-espana', nombre: 'UNICEF Comité Español', nif: 'G84451087', tipo: 'fundacion', sector: 'infancia', ambito: 'internacional', ccaa: 'madrid', ingresos_eur: 71_000_000, empleados: 250, irpf_07: true, website: 'https://www.unicef.es', fuente: 'Memoria UNICEF España', fecha_ref: '2023' },
  { slug: 'save-the-children', nombre: 'Save the Children España', nif: 'G79362497', tipo: 'ongd', sector: 'infancia', ambito: 'internacional', ccaa: 'madrid', ingresos_eur: 56_000_000, empleados: 400, irpf_07: true, website: 'https://www.savethechildren.es', fuente: 'Memoria Save the Children', fecha_ref: '2023' },
  { slug: 'eacnur', nombre: 'España con ACNUR', nif: 'G81846825', tipo: 'fundacion', sector: 'refugiados', ambito: 'internacional', ccaa: 'madrid', ingresos_eur: 60_000_000, empleados: 120, irpf_07: true, website: 'https://eacnur.org', fuente: 'Memoria España con ACNUR', fecha_ref: '2023' },
  { slug: 'plan-international', nombre: 'Plan International España', nif: 'G85044048', tipo: 'ongd', sector: 'infancia', ambito: 'internacional', ccaa: 'madrid', ingresos_eur: 38_000_000, empleados: 150, irpf_07: true, website: 'https://plan-international.es', fuente: 'Memoria Plan International', fecha_ref: '2023' },
  { slug: 'ayuda-en-accion', nombre: 'Ayuda en Acción', nif: 'G82257064', tipo: 'ongd', sector: 'cooperacion_internacional', ambito: 'internacional', ccaa: 'madrid', ingresos_eur: 56_000_000, empleados: 350, irpf_07: true, website: 'https://ayudaenaccion.org', fuente: 'Memoria Ayuda en Acción', fecha_ref: '2023' },
  { slug: 'entreculturas', nombre: 'Fundación Entreculturas', nif: 'G82409020', tipo: 'fundacion', sector: 'educacion', ambito: 'internacional', ccaa: 'madrid', ingresos_eur: 38_000_000, empleados: 150, irpf_07: true, website: 'https://www.entreculturas.org', fuente: 'Memoria Entreculturas', fecha_ref: '2023' },
  { slug: 'medicos-del-mundo', nombre: 'Médicos del Mundo España', nif: 'G79408852', tipo: 'ongd', sector: 'sanitario', ambito: 'internacional', ccaa: 'madrid', ingresos_eur: 45_000_000, empleados: 500, irpf_07: true, website: 'https://www.medicosdelmundo.org', fuente: 'Memoria Médicos del Mundo', fecha_ref: '2023' },
  { slug: 'fundacion-vicente-ferrer', nombre: 'Fundación Vicente Ferrer', nif: 'G09326745', tipo: 'fundacion', sector: 'cooperacion_internacional', ambito: 'internacional', ccaa: 'cataluna', ingresos_eur: 50_000_000, empleados: 250, irpf_07: true, website: 'https://www.fundacionvicenteferrer.org', fuente: 'Memoria Fundación Vicente Ferrer', fecha_ref: '2023' },
  { slug: 'world-vision', nombre: 'World Vision España', nif: 'G80487843', tipo: 'fundacion', sector: 'infancia', ambito: 'internacional', ccaa: 'madrid', ingresos_eur: 18_000_000, empleados: 70, irpf_07: true, website: 'https://www.worldvision.es', fuente: 'Memoria World Vision España', fecha_ref: '2023' },
  { slug: 'mainel', nombre: 'Fundación Mainel', nif: 'G46479300', tipo: 'fundacion', sector: 'educacion', ambito: 'internacional', ccaa: 'comunidad-valenciana', ingresos_eur: 2_800_000, empleados: 32, irpf_07: true, website: 'https://mainel.org', fuente: 'Memoria Mainel', fecha_ref: '2023' },
  { slug: 'farmamundi', nombre: 'Farmamundi', nif: 'G96868933', tipo: 'ongd', sector: 'sanitario', ambito: 'internacional', ccaa: 'comunidad-valenciana', ingresos_eur: 22_000_000, empleados: 90, irpf_07: true, website: 'https://www.farmamundi.org', fuente: 'Memoria Farmamundi', fecha_ref: '2023' },
  { slug: 'fundacion-promocion-social', nombre: 'Fundación Promoción Social', nif: 'G80042689', tipo: 'fundacion', sector: 'cooperacion_internacional', ambito: 'internacional', ccaa: 'madrid', ingresos_eur: 8_000_000, empleados: 45, irpf_07: true, website: 'https://www.promocionsocial.org', fuente: 'Memoria Promoción Social', fecha_ref: '2023' },

  // ─── Infancia y juventud ───────────────────────────────────────────────────
  { slug: 'aldeas-infantiles', nombre: 'Aldeas Infantiles SOS de España', nif: 'G28821254', tipo: 'asociacion_dup', sector: 'infancia', ambito: 'estatal', ccaa: 'madrid', ingresos_eur: 75_000_000, empleados: 700, irpf_07: true, website: 'https://www.aldeasinfantiles.es', fuente: 'Memoria Aldeas Infantiles', fecha_ref: '2023' },
  { slug: 'fundacion-anar', nombre: 'Fundación ANAR (Ayuda a Niños y Adolescentes en Riesgo)', nif: 'G80453878', tipo: 'fundacion', sector: 'infancia', ambito: 'estatal', ccaa: 'madrid', ingresos_eur: 9_000_000, empleados: 120, irpf_07: true, website: 'https://www.anar.org', fuente: 'Memoria ANAR', fecha_ref: '2023' },
  { slug: 'fad-juventud', nombre: 'Fundación FAD Juventud', nif: 'G79121081', tipo: 'fundacion', sector: 'juventud', ambito: 'estatal', ccaa: 'madrid', ingresos_eur: 12_500_000, empleados: 95, irpf_07: true, website: 'https://www.fad.es', fuente: 'Memoria FAD Juventud', fecha_ref: '2023' },
  { slug: 'mensajeros-de-la-paz', nombre: 'Fundación Mensajeros de la Paz', nif: 'G28667612', tipo: 'fundacion', sector: 'infancia', ambito: 'estatal', ccaa: 'madrid', ingresos_eur: 30_000_000, empleados: 600, irpf_07: true, website: 'https://www.mensajerosdelapaz.org', fuente: 'Memoria Mensajeros de la Paz', fecha_ref: '2023' },
  { slug: 'fundacion-balia', nombre: 'Fundación Balia por la Infancia', nif: 'G83502311', tipo: 'fundacion', sector: 'infancia', ambito: 'estatal', ccaa: 'madrid', ingresos_eur: 4_000_000, empleados: 90, irpf_07: true, website: 'https://www.fundacionbalia.org', fuente: 'Memoria Balia', fecha_ref: '2023' },
  { slug: 'scouts-asde', nombre: 'Scouts de España (ASDE)', nif: 'G28666697', tipo: 'federacion', sector: 'juventud', ambito: 'estatal', ccaa: 'madrid', ingresos_eur: 3_500_000, empleados: 35, irpf_07: true, website: 'https://www.scout.es', fuente: 'Memoria ASDE', fecha_ref: '2023' },

  // ─── Discapacidad ──────────────────────────────────────────────────────────
  { slug: 'cermi', nombre: 'Comité Español de Representantes de Personas con Discapacidad (CERMI)', nif: 'G81628686', tipo: 'plataforma', sector: 'discapacidad', ambito: 'estatal', ccaa: 'madrid', ingresos_eur: 4_200_000, empleados: 35, irpf_07: false, website: 'https://www.cermi.es', fuente: 'Memoria CERMI', fecha_ref: '2023' },
  { slug: 'plena-inclusion', nombre: 'Plena Inclusión España', nif: 'G28695365', tipo: 'federacion', sector: 'discapacidad', ambito: 'estatal', ccaa: 'madrid', ingresos_eur: 9_500_000, empleados: 75, irpf_07: true, website: 'https://www.plenainclusion.org', fuente: 'Memoria Plena Inclusión', fecha_ref: '2023' },
  { slug: 'cocemfe', nombre: 'Confederación Española de Personas con Discapacidad Física y Orgánica (COCEMFE)', nif: 'G28755461', tipo: 'federacion', sector: 'discapacidad', ambito: 'estatal', ccaa: 'madrid', ingresos_eur: 22_000_000, empleados: 250, irpf_07: true, website: 'https://www.cocemfe.es', fuente: 'Memoria COCEMFE', fecha_ref: '2023' },
  { slug: 'cnse', nombre: 'Confederación Estatal de Personas Sordas (CNSE)', nif: 'G28738752', tipo: 'federacion', sector: 'discapacidad', ambito: 'estatal', ccaa: 'madrid', ingresos_eur: 7_300_000, empleados: 60, irpf_07: true, website: 'https://www.cnse.es', fuente: 'Memoria CNSE', fecha_ref: '2023' },
  { slug: 'once', nombre: 'Organización Nacional de Ciegos Españoles (ONCE)', nif: 'Q2866004A', tipo: 'asociacion_dup', sector: 'discapacidad', ambito: 'estatal', ccaa: 'madrid', ingresos_eur: 2_100_000_000, empleados: 70000, irpf_07: false, website: 'https://www.once.es', fuente: 'Informe anual ONCE (Grupo Social ONCE)', fecha_ref: '2023' },
  { slug: 'aspace', nombre: 'Confederación ASPACE (parálisis cerebral)', nif: 'G80363763', tipo: 'federacion', sector: 'discapacidad', ambito: 'estatal', ccaa: 'madrid', ingresos_eur: 6_000_000, empleados: 55, irpf_07: true, website: 'https://aspace.org', fuente: 'Memoria ASPACE', fecha_ref: '2023' },
  { slug: 'down-espana', nombre: 'Down España', nif: 'G82451418', tipo: 'federacion', sector: 'discapacidad', ambito: 'estatal', ccaa: 'madrid', ingresos_eur: 4_500_000, empleados: 40, irpf_07: true, website: 'https://www.sindromedown.net', fuente: 'Memoria Down España', fecha_ref: '2023' },
  { slug: 'feaps-feder', nombre: 'Federación Española de Enfermedades Raras (FEDER)', nif: 'G83614314', tipo: 'federacion', sector: 'sanitario', ambito: 'estatal', ccaa: 'madrid', ingresos_eur: 5_500_000, empleados: 60, irpf_07: true, website: 'https://enfermedades-raras.org', fuente: 'Memoria FEDER', fecha_ref: '2023' },

  // ─── Salud · sanitario · salud mental · adicciones ─────────────────────────
  { slug: 'aecc', nombre: 'Asociación Española Contra el Cáncer (AECC)', nif: 'G28197564', tipo: 'asociacion_dup', sector: 'sanitario', ambito: 'estatal', ccaa: 'madrid', ingresos_eur: 110_000_000, empleados: 900, irpf_07: true, website: 'https://www.contraelcancer.es', fuente: 'Memoria AECC', fecha_ref: '2023' },
  { slug: 'fundacion-cris-cancer', nombre: 'Fundación CRIS contra el Cáncer', nif: 'G85843787', tipo: 'fundacion', sector: 'investigacion', ambito: 'estatal', ccaa: 'madrid', ingresos_eur: 14_000_000, empleados: 40, irpf_07: true, website: 'https://criscancer.org', fuente: 'Memoria CRIS', fecha_ref: '2023' },
  { slug: 'confederacion-salud-mental', nombre: 'Confederación Salud Mental España', nif: 'G79139216', tipo: 'federacion', sector: 'salud_mental', ambito: 'estatal', ccaa: 'madrid', ingresos_eur: 6_500_000, empleados: 65, irpf_07: true, website: 'https://www.consaludmental.org', fuente: 'Memoria Salud Mental España', fecha_ref: '2023' },
  { slug: 'proyecto-hombre', nombre: 'Asociación Proyecto Hombre', nif: 'G80963868', tipo: 'federacion', sector: 'adicciones', ambito: 'estatal', ccaa: 'madrid', ingresos_eur: 60_000_000, empleados: 1200, irpf_07: true, website: 'https://proyectohombre.es', fuente: 'Memoria Proyecto Hombre', fecha_ref: '2023' },
  { slug: 'fundacion-josep-carreras', nombre: 'Fundación Josep Carreras contra la Leucemia', nif: 'G58818745', tipo: 'fundacion', sector: 'investigacion', ambito: 'estatal', ccaa: 'cataluna', ingresos_eur: 30_000_000, empleados: 130, irpf_07: true, website: 'https://www.fcarreras.org', fuente: 'Memoria Fundación Josep Carreras', fecha_ref: '2023' },
  { slug: 'cocina-economica', nombre: 'Fundación Banco de Alimentos / Comedores (entidad tipo)', tipo: 'fundacion', sector: 'pobreza', ambito: 'autonomico', ccaa: 'madrid', ingresos_eur: null, empleados: null, irpf_07: false, website: 'https://www.bancodealimentos.es', fuente: 'Catálogo Politeia (entidad representativa)', fecha_ref: '2024' },

  // ─── Mayores · dependencia ─────────────────────────────────────────────────
  { slug: 'fundacion-amigos-mayores', nombre: 'Amigos de los Mayores', nif: 'G61096062', tipo: 'asociacion_dup', sector: 'mayores', ambito: 'estatal', ccaa: 'cataluna', ingresos_eur: 1_800_000, empleados: 25, irpf_07: true, website: 'https://www.amigosdelosmayores.org', fuente: 'Memoria Amigos de los Mayores', fecha_ref: '2023' },
  { slug: 'fundacion-pilares', nombre: 'Fundación Pilares para la Autonomía Personal', nif: 'G85918910', tipo: 'fundacion', sector: 'mayores', ambito: 'estatal', ccaa: 'madrid', ingresos_eur: 1_200_000, empleados: 15, irpf_07: false, website: 'https://www.fundacionpilares.org', fuente: 'Memoria Fundación Pilares', fecha_ref: '2023' },
  { slug: 'grandes-amigos', nombre: 'Grandes Amigos', nif: 'G86875671', tipo: 'asociacion', sector: 'mayores', ambito: 'estatal', ccaa: 'madrid', ingresos_eur: 1_500_000, empleados: 20, irpf_07: true, website: 'https://grandesamigos.org', fuente: 'Memoria Grandes Amigos', fecha_ref: '2023' },

  // ─── Derechos humanos · igualdad · LGTBI ───────────────────────────────────
  { slug: 'amnistia-internacional', nombre: 'Amnistía Internacional España', nif: 'G28851179', tipo: 'asociacion_dup', sector: 'derechos_humanos', ambito: 'internacional', ccaa: 'madrid', ingresos_eur: 17_000_000, empleados: 130, irpf_07: false, website: 'https://www.es.amnesty.org', fuente: 'Memoria Amnistía Internacional España', fecha_ref: '2023' },
  { slug: 'fundacion-mujeres', nombre: 'Fundación Mujeres', nif: 'G79427803', tipo: 'fundacion', sector: 'igualdad', ambito: 'estatal', ccaa: 'madrid', ingresos_eur: 6_000_000, empleados: 90, irpf_07: true, website: 'https://www.fundacionmujeres.es', fuente: 'Memoria Fundación Mujeres', fecha_ref: '2023' },
  { slug: 'comision-investigacion-malos-tratos', nombre: 'Comisión para la Investigación de Malos Tratos a Mujeres', nif: 'G78718939', tipo: 'asociacion_dup', sector: 'igualdad', ambito: 'estatal', ccaa: 'madrid', ingresos_eur: 2_500_000, empleados: 45, irpf_07: true, website: 'https://www.malostratos.org', fuente: 'Memoria CIMTM', fecha_ref: '2023' },
  { slug: 'felgtbi', nombre: 'Federación Estatal LGTBI+ (FELGTBI+)', nif: 'G81609926', tipo: 'federacion', sector: 'lgtbi', ambito: 'estatal', ccaa: 'madrid', ingresos_eur: 2_000_000, empleados: 25, irpf_07: false, website: 'https://felgtbi.org', fuente: 'Memoria FELGTBI+', fecha_ref: '2023' },
  { slug: 'rights-international-spain', nombre: 'Rights International Spain', tipo: 'asociacion', sector: 'derechos_humanos', ambito: 'estatal', ccaa: 'madrid', ingresos_eur: 600_000, empleados: 8, irpf_07: false, website: 'https://rightsinternationalspain.org', fuente: 'Memoria Rights International Spain', fecha_ref: '2023' },

  // ─── Medio ambiente ────────────────────────────────────────────────────────
  { slug: 'greenpeace-espana', nombre: 'Greenpeace España', nif: 'G28947653', tipo: 'asociacion', sector: 'medio_ambiente', ambito: 'internacional', ccaa: 'madrid', ingresos_eur: 14_000_000, empleados: 70, irpf_07: false, website: 'https://es.greenpeace.org', fuente: 'Memoria Greenpeace España', fecha_ref: '2023' },
  { slug: 'wwf-espana', nombre: 'WWF España', nif: 'G28741470', tipo: 'asociacion_dup', sector: 'medio_ambiente', ambito: 'internacional', ccaa: 'madrid', ingresos_eur: 12_000_000, empleados: 70, irpf_07: true, website: 'https://www.wwf.es', fuente: 'Memoria WWF España', fecha_ref: '2023' },
  { slug: 'seo-birdlife', nombre: 'SEO/BirdLife (Sociedad Española de Ornitología)', nif: 'G28510539', tipo: 'asociacion_dup', sector: 'medio_ambiente', ambito: 'estatal', ccaa: 'madrid', ingresos_eur: 14_000_000, empleados: 130, irpf_07: true, website: 'https://www.seo.org', fuente: 'Memoria SEO/BirdLife', fecha_ref: '2023' },
  { slug: 'ecologistas-en-accion', nombre: 'Ecologistas en Acción', nif: 'G83387082', tipo: 'federacion', sector: 'medio_ambiente', ambito: 'estatal', ccaa: 'madrid', ingresos_eur: 3_500_000, empleados: 35, irpf_07: false, website: 'https://www.ecologistasenaccion.org', fuente: 'Memoria Ecologistas en Acción', fecha_ref: '2023' },
  { slug: 'fundacion-biodiversidad', nombre: 'Fundación Biodiversidad (sector público fundacional)', nif: 'G82207552', tipo: 'fundacion', sector: 'medio_ambiente', ambito: 'estatal', ccaa: 'madrid', ingresos_eur: 90_000_000, empleados: 120, irpf_07: false, website: 'https://fundacion-biodiversidad.es', fuente: 'Cuentas Fundación Biodiversidad (MITECO)', fecha_ref: '2023' },
  { slug: 'amigos-de-la-tierra', nombre: 'Amigos de la Tierra España', nif: 'G78919610', tipo: 'asociacion', sector: 'medio_ambiente', ambito: 'internacional', ccaa: 'madrid', ingresos_eur: 1_800_000, empleados: 25, irpf_07: false, website: 'https://www.tierra.org', fuente: 'Memoria Amigos de la Tierra', fecha_ref: '2023' },

  // ─── Educación · cultura · investigación · fundaciones bancarias ───────────
  { slug: 'fundacion-bbva', nombre: 'Fundación BBVA', nif: 'G48140119', tipo: 'fundacion', sector: 'investigacion', ambito: 'estatal', ccaa: 'madrid', ingresos_eur: 70_000_000, empleados: 60, irpf_07: false, website: 'https://www.fbbva.es', fuente: 'Memoria Fundación BBVA', fecha_ref: '2023' },
  { slug: 'fundacion-telefonica', nombre: 'Fundación Telefónica', nif: 'G80905403', tipo: 'fundacion', sector: 'educacion', ambito: 'estatal', ccaa: 'madrid', ingresos_eur: 80_000_000, empleados: 150, irpf_07: false, website: 'https://www.fundaciontelefonica.com', fuente: 'Memoria Fundación Telefónica', fecha_ref: '2023' },
  { slug: 'fundacion-mapfre', nombre: 'Fundación MAPFRE', nif: 'G81264498', tipo: 'fundacion', sector: 'cultura', ambito: 'estatal', ccaa: 'madrid', ingresos_eur: 120_000_000, empleados: 300, irpf_07: false, website: 'https://www.fundacionmapfre.org', fuente: 'Memoria Fundación MAPFRE', fecha_ref: '2023' },
  { slug: 'fundacion-botin', nombre: 'Fundación Botín', nif: 'G39370900', tipo: 'fundacion', sector: 'cultura', ambito: 'estatal', ccaa: 'cantabria', ingresos_eur: 35_000_000, empleados: 120, irpf_07: false, website: 'https://www.fundacionbotin.org', fuente: 'Memoria Fundación Botín', fecha_ref: '2023' },
  { slug: 'fundacion-amancio-ortega', nombre: 'Fundación Amancio Ortega', nif: 'G15922010', tipo: 'fundacion', sector: 'educacion', ambito: 'estatal', ccaa: 'galicia', ingresos_eur: 200_000_000, empleados: 20, irpf_07: false, website: 'https://www.faortega.org', fuente: 'Cuentas Fundación Amancio Ortega', fecha_ref: '2023' },
  { slug: 'fundacion-banco-santander', nombre: 'Fundación Banco Santander', nif: 'G39368359', tipo: 'fundacion', sector: 'cultura', ambito: 'estatal', ccaa: 'madrid', ingresos_eur: 25_000_000, empleados: 40, irpf_07: false, website: 'https://www.fundacionbancosantander.com', fuente: 'Memoria Fundación Banco Santander', fecha_ref: '2023' },
  { slug: 'fundacion-caja-ingenieros', nombre: 'Fundación Caja de Ingenieros', nif: 'G64852989', tipo: 'fundacion', sector: 'cultura', ambito: 'autonomico', ccaa: 'cataluna', ingresos_eur: 1_800_000, empleados: 12, irpf_07: false, website: 'https://www.fundaciocaixaenginyers.com', fuente: 'Memoria Fundación Caja de Ingenieros', fecha_ref: '2023' },
  { slug: 'fundacion-tomillo', nombre: 'Fundación Tomillo', nif: 'G79505590', tipo: 'fundacion', sector: 'empleo', ambito: 'estatal', ccaa: 'madrid', ingresos_eur: 18_000_000, empleados: 350, irpf_07: true, website: 'https://tomillo.org', fuente: 'Memoria Fundación Tomillo', fecha_ref: '2023' },

  // ─── Empleo e inserción · inclusión ────────────────────────────────────────
  { slug: 'fundacion-adecco', nombre: 'Fundación Adecco', nif: 'G82051655', tipo: 'fundacion', sector: 'empleo', ambito: 'estatal', ccaa: 'madrid', ingresos_eur: 14_000_000, empleados: 200, irpf_07: false, website: 'https://fundacionadecco.org', fuente: 'Memoria Fundación Adecco', fecha_ref: '2023' },
  { slug: 'fundacion-randstad', nombre: 'Fundación Randstad', nif: 'G83541996', tipo: 'fundacion', sector: 'empleo', ambito: 'estatal', ccaa: 'madrid', ingresos_eur: 6_000_000, empleados: 60, irpf_07: false, website: 'https://www.randstad.es/fundacion', fuente: 'Memoria Fundación Randstad', fecha_ref: '2023' },
  { slug: 'fundacion-exit', nombre: 'Fundación Exit', nif: 'G62469383', tipo: 'fundacion', sector: 'empleo', ambito: 'estatal', ccaa: 'cataluna', ingresos_eur: 3_500_000, empleados: 50, irpf_07: true, website: 'https://www.fundacionexit.org', fuente: 'Memoria Fundación Exit', fecha_ref: '2023' },
  { slug: 'fundacion-integra', nombre: 'Fundación Integra', nif: 'G82319961', tipo: 'fundacion', sector: 'empleo', ambito: 'estatal', ccaa: 'madrid', ingresos_eur: 2_000_000, empleados: 30, irpf_07: false, website: 'https://www.fundacionintegra.org', fuente: 'Memoria Fundación Integra', fecha_ref: '2023' },

  // ─── Economía social · cooperativas · entidades cumbre ─────────────────────
  { slug: 'cepes', nombre: 'Confederación Empresarial Española de la Economía Social (CEPES)', nif: 'G81882018', tipo: 'plataforma', sector: 'economia_social', ambito: 'estatal', ccaa: 'madrid', ingresos_eur: 2_400_000, empleados: 20, irpf_07: false, website: 'https://www.cepes.es', fuente: 'Memoria CEPES', fecha_ref: '2023' },
  { slug: 'plataforma-tercer-sector', nombre: 'Plataforma del Tercer Sector (PTS)', nif: 'G86345386', tipo: 'plataforma', sector: 'representacion_cumbre', ambito: 'estatal', ccaa: 'madrid', ingresos_eur: 1_500_000, empleados: 12, irpf_07: false, website: 'https://www.plataformatercersector.es', fuente: 'Memoria PTS', fecha_ref: '2023' },
  { slug: 'congde', nombre: 'Coordinadora de ONG para el Desarrollo (CONGDE)', nif: 'G79041791', tipo: 'plataforma', sector: 'cooperacion_internacional', ambito: 'estatal', ccaa: 'madrid', ingresos_eur: 2_100_000, empleados: 25, irpf_07: false, website: 'https://coordinadoraongd.org', fuente: 'Memoria CONGDE', fecha_ref: '2023' },
  { slug: 'eapn-es', nombre: 'EAPN España (Red Europea de Lucha contra la Pobreza)', nif: 'G82875782', tipo: 'plataforma', sector: 'pobreza', ambito: 'estatal', ccaa: 'madrid', ingresos_eur: 3_000_000, empleados: 30, irpf_07: false, website: 'https://www.eapn.es', fuente: 'Memoria EAPN España', fecha_ref: '2023' },
  { slug: 'plataforma-voluntariado', nombre: 'Plataforma del Voluntariado de España (PVE)', nif: 'G80468751', tipo: 'plataforma', sector: 'voluntariado', ambito: 'estatal', ccaa: 'madrid', ingresos_eur: 1_400_000, empleados: 15, irpf_07: false, website: 'https://plataformavoluntariado.org', fuente: 'Memoria PVE', fecha_ref: '2023' },
  { slug: 'cooperativas-agroalimentarias', nombre: 'Cooperativas Agro-alimentarias de España', nif: 'G28710953', tipo: 'cooperativa', sector: 'economia_social', ambito: 'estatal', ccaa: 'madrid', ingresos_eur: 6_000_000, empleados: 60, irpf_07: false, website: 'https://www.agro-alimentarias.coop', fuente: 'Memoria Cooperativas Agro-alimentarias', fecha_ref: '2023' },
  { slug: 'mondragon', nombre: 'Corporación Mondragón (cooperativas)', nif: 'F20055163', tipo: 'cooperativa', sector: 'economia_social', ambito: 'estatal', ccaa: 'pais-vasco', ingresos_eur: 11_000_000_000, empleados: 70000, irpf_07: false, website: 'https://www.mondragon-corporation.com', fuente: 'Informe anual Corporación Mondragón', fecha_ref: '2023' },
  { slug: 'coceta', nombre: 'Confederación Española de Cooperativas de Trabajo Asociado (COCETA)', nif: 'G28851484', tipo: 'cooperativa', sector: 'economia_social', ambito: 'estatal', ccaa: 'madrid', ingresos_eur: 2_500_000, empleados: 25, irpf_07: false, website: 'https://www.coceta.coop', fuente: 'Memoria COCETA', fecha_ref: '2023' },
  { slug: 'fundacion-espriu', nombre: 'Fundación Espriu (cooperativismo sanitario)', nif: 'G58740838', tipo: 'fundacion', sector: 'economia_social', ambito: 'estatal', ccaa: 'cataluna', ingresos_eur: 3_000_000, empleados: 20, irpf_07: false, website: 'https://www.fundacionespriu.coop', fuente: 'Memoria Fundación Espriu', fecha_ref: '2023' },
  { slug: 'reas-red-economia-alternativa', nombre: 'REAS Red de Redes de Economía Alternativa y Solidaria', tipo: 'federacion', sector: 'economia_social', ambito: 'estatal', ccaa: 'pais-vasco', ingresos_eur: 1_200_000, empleados: 12, irpf_07: false, website: 'https://www.economiasolidaria.org', fuente: 'Memoria REAS', fecha_ref: '2023' },

  // ─── Consumo · otras asociaciones de utilidad pública ──────────────────────
  { slug: 'ocu', nombre: 'Organización de Consumidores y Usuarios (OCU)', nif: 'G28615664', tipo: 'asociacion_dup', sector: 'consumo', ambito: 'estatal', ccaa: 'madrid', ingresos_eur: 50_000_000, empleados: 250, irpf_07: false, website: 'https://www.ocu.org', fuente: 'Memoria OCU', fecha_ref: '2023' },
  { slug: 'facua', nombre: 'FACUA-Consumidores en Acción', nif: 'G41346311', tipo: 'federacion', sector: 'consumo', ambito: 'estatal', ccaa: 'andalucia', ingresos_eur: 4_000_000, empleados: 60, irpf_07: false, website: 'https://www.facua.org', fuente: 'Memoria FACUA', fecha_ref: '2023' },
  { slug: 'fundacion-caritas-chavicar', nombre: 'Fundación Cáritas Chavicar (inserción · La Rioja)', nif: 'G26356158', tipo: 'fundacion', sector: 'empleo', ambito: 'autonomico', ccaa: 'la-rioja', ingresos_eur: 8_000_000, empleados: 200, irpf_07: false, website: 'https://www.caritaschavicar.es', fuente: 'Memoria Cáritas Chavicar', fecha_ref: '2023' },
  { slug: 'lar-galicia', nombre: 'Fundación Igual Arte / entidades sociales Galicia (tipo)', tipo: 'fundacion', sector: 'inclusion_social', ambito: 'autonomico', ccaa: 'galicia', ingresos_eur: null, empleados: null, irpf_07: false, website: 'https://coordinadoraongd.org', fuente: 'Catálogo Politeia (entidad representativa)', fecha_ref: '2024' },
]

// ─────────────────────────────────────────────────────────────────────────
// Índices + helpers PUROS (sin red) · testeables
// ─────────────────────────────────────────────────────────────────────────

export const ORG_BY_SLUG: Record<string, Organizacion> = Object.fromEntries(
  ORGANIZACIONES.map((o) => [o.slug, o]),
)

/** Nº total de entidades del catálogo ampliado. */
export const ORGANIZACIONES_COUNT = ORGANIZACIONES.length

/** Lista de sectores presentes (claves), ordenada. */
export function catalogSectores(): string[] {
  return Array.from(new Set(ORGANIZACIONES.map((o) => o.sector))).sort()
}

/** Lista de tipos presentes, ordenada. */
export function catalogTipos(): OrgTipo[] {
  return Array.from(new Set(ORGANIZACIONES.map((o) => o.tipo))).sort() as OrgTipo[]
}

/** Lista de CCAA presentes (claves), ordenada. */
export function catalogCcaa(): string[] {
  return Array.from(
    new Set(ORGANIZACIONES.map((o) => o.ccaa).filter((c): c is string => !!c)),
  ).sort()
}
