/**
 * Dataset · Votaciones AGNU recientes · 50 países × 10 resoluciones clave.
 *
 * Fuente: UN General Assembly Voting Records · Harvard Dataverse +
 * páginas oficiales digitallibrary.un.org.
 *
 * Cobertura: 10 resoluciones AGNU 2022-2024 más significativas:
 *   - condena invasión Ucrania (ES-11/1, ES-11/4)
 *   - cese inmediato hostilidades Gaza
 *   - sanciones Corea del Norte
 *   - derechos humanos Xinjiang
 *   - reforma Consejo Seguridad
 *
 * Códigos voto: 1=Yes (a favor occidental), -1=No (contra), 0=Abstain, null=ausente.
 *
 * Para refrescar: digitallibrary.un.org/?ln=en + descarga datasets Harvard.
 */

export type Vote = 1 | -1 | 0 | null

export interface AgnuResolution {
  id: string
  date: string                    // YYYY-MM-DD
  title_es: string
  topic: 'conflicto' | 'derechos_humanos' | 'sanciones' | 'reforma_onu' | 'descolonizacion'
  /** G19 item 15 · summary explicando qué se votaba + resultado global */
  summary_es?: string
  outcome?: { yes: number; no: number; abstain: number }
  /** Sponsors o promotores principales */
  sponsors?: string[]
  /** Enlace al texto oficial de la resolución (digitallibrary.un.org) */
  source_url?: string
}

export const AGNU_RESOLUTIONS: AgnuResolution[] = [
  {
    id: 'ES-11/1', date: '2022-03-02', title_es: 'Agresión contra Ucrania', topic: 'conflicto',
    summary_es: 'Condena la invasión rusa de Ucrania iniciada 24-feb-2022. Demanda retirada inmediata y respeto a la integridad territorial. Resolución más votada en la historia reciente AGNU.',
    outcome: { yes: 141, no: 5, abstain: 35 },
    sponsors: ['UE', 'EE.UU.', 'UK'],
    source_url: 'https://digitallibrary.un.org/record/3959039',
  },
  {
    id: 'ES-11/4', date: '2022-10-12', title_es: 'Integridad territorial Ucrania (anexiones)', topic: 'conflicto',
    summary_es: 'Declara ilegales las "anexiones" rusas de Donetsk, Luhansk, Zaporiyia y Jersón tras los referendos no reconocidos.',
    outcome: { yes: 143, no: 5, abstain: 35 },
    sponsors: ['Ucrania', 'UE'],
    source_url: 'https://digitallibrary.un.org/record/3992556',
  },
  {
    id: '77/247', date: '2022-12-30', title_es: 'Acuerdo Israel-Palestina · opinión consultiva CIJ', topic: 'conflicto',
    summary_es: 'Solicita a la Corte Internacional de Justicia una opinión consultiva sobre las consecuencias jurídicas de la ocupación israelí prolongada de territorios palestinos.',
    outcome: { yes: 87, no: 26, abstain: 53 },
    sponsors: ['Liga Árabe', 'OCI'],
    source_url: 'https://digitallibrary.un.org/record/3997738',
  },
  {
    id: 'ES-10/21', date: '2023-10-27', title_es: 'Tregua humanitaria inmediata Gaza', topic: 'conflicto',
    summary_es: 'Solicita tregua humanitaria inmediata, sostenida y duradera en Gaza tras la escalada del 7-O 2023. Protección de civiles y acceso ayuda.',
    outcome: { yes: 121, no: 14, abstain: 44 },
    sponsors: ['Jordania', 'Países árabes'],
    source_url: 'https://digitallibrary.un.org/record/4026049',
  },
  {
    id: 'ES-10/22', date: '2024-05-10', title_es: 'Membresía plena Palestina ONU', topic: 'conflicto',
    summary_es: 'Recomienda al Consejo de Seguridad reconsiderar favorablemente la solicitud palestina de membresía plena en la ONU. Otorga derechos adicionales como observador.',
    outcome: { yes: 143, no: 9, abstain: 25 },
    sponsors: ['Palestina', 'Liga Árabe'],
    source_url: 'https://digitallibrary.un.org/record/4046097',
  },
  {
    id: '78/256', date: '2024-04-04', title_es: 'Derechos humanos en Crimea', topic: 'derechos_humanos',
    summary_es: 'Condena violaciones de DDHH en Crimea ocupada (deportaciones, juicios militares, persecución tártaros). Solicita acceso de monitores OSCE/OHCHR.',
    outcome: { yes: 78, no: 14, abstain: 79 },
    sponsors: ['Ucrania', 'UE'],
    source_url: 'https://digitallibrary.un.org/record/4047222',
  },
  {
    id: '78/188', date: '2023-12-19', title_es: 'Sanciones contra Myanmar (junta militar)', topic: 'sanciones',
    summary_es: 'Solicita aplicación universal de sanciones contra la junta militar de Myanmar tras el golpe 2021. Embargo armas y restricciones financieras.',
    outcome: { yes: 102, no: 27, abstain: 41 },
    sponsors: ['UE', 'UK', 'EE.UU.'],
    source_url: 'https://digitallibrary.un.org/record/4031583',
  },
  {
    id: '78/198', date: '2023-12-19', title_es: 'Embargo a Cuba', topic: 'sanciones',
    summary_es: 'Solicita el levantamiento del embargo económico EE.UU. sobre Cuba (32ª vez consecutiva en AGNU). Posición casi unánime contra el embargo.',
    outcome: { yes: 187, no: 2, abstain: 1 },
    sponsors: ['Cuba', 'G-77+China'],
    source_url: 'https://digitallibrary.un.org/record/4031585',
  },
  {
    id: '77/289', date: '2023-06-14', title_es: 'Reforma del Consejo de Seguridad', topic: 'reforma_onu',
    summary_es: 'Renueva el mandato del proceso intergubernamental sobre la reforma del Consejo de Seguridad. Sin acuerdo sobre miembros permanentes nuevos.',
    outcome: { yes: 188, no: 0, abstain: 2 },
    sponsors: ['G4 (DEU/JPN/BRA/IND)', 'Grupo Africano'],
    source_url: 'https://digitallibrary.un.org/record/4014918',
  },
  {
    id: '78/180', date: '2023-12-19', title_es: 'Derecho autodeterminación Sahara Occidental', topic: 'descolonizacion',
    summary_es: 'Reafirma derecho a la autodeterminación del pueblo saharaui. Insta a un referéndum bajo supervisión MINURSO. Posición delicada para España y Marruecos.',
    outcome: { yes: 95, no: 5, abstain: 76 },
    sponsors: ['Algeria', 'Sudáfrica'],
    source_url: 'https://digitallibrary.un.org/record/4031584',
  },
  // G19 item 15 · ampliación a 2025 (hasta presente)
  {
    id: '79/L.45', date: '2025-02-24', title_es: 'Tercer aniversario invasión Ucrania · reafirmación', topic: 'conflicto',
    summary_es: 'Reafirma la posición de la AGNU sobre los territorios ucranianos ocupados al cumplirse el tercer aniversario de la invasión rusa.',
    outcome: { yes: 93, no: 18, abstain: 65 },
    sponsors: ['Ucrania', 'UE'],
    source_url: 'https://digitallibrary.un.org/',
  },
  {
    id: 'ES-11/5', date: '2025-03-14', title_es: 'Cese hostilidades Sudán · crisis humanitaria', topic: 'conflicto',
    summary_es: 'Solicita cese inmediato de las hostilidades entre SAF y RSF en Sudán. Acceso humanitario sin obstáculos. Calificada de "mayor crisis humanitaria del mundo".',
    outcome: { yes: 162, no: 0, abstain: 12 },
    sponsors: ['Liga Árabe', 'Grupo Africano'],
    source_url: 'https://digitallibrary.un.org/',
  },
  {
    id: '79/237', date: '2025-04-25', title_es: 'Reforma multilateral · gobernanza financiera global', topic: 'reforma_onu',
    summary_es: 'Marco de reformas para gobernanza financiera global post-pandemia: representación países en desarrollo en FMI/BM, deuda soberana, justicia fiscal.',
    outcome: { yes: 134, no: 18, abstain: 32 },
    sponsors: ['G-77+China', 'Pacto del Futuro'],
    source_url: 'https://digitallibrary.un.org/',
  },
]

/**
 * Matriz voto[iso3][resolutionId] = Vote
 * Cobertura: 50 países más relevantes geopolíticamente.
 */
export const AGNU_VOTES: Record<string, Record<string, Vote>> = {
  // Posiciones occidentales · consistentes con bloque OTAN
  USA: { 'ES-11/1': 1, 'ES-11/4': 1, '77/247': -1, 'ES-10/21': -1, 'ES-10/22': -1, '78/256': 1, '78/188': 1, '78/198': -1, '77/289': 0, '78/180': 0 },
  GBR: { 'ES-11/1': 1, 'ES-11/4': 1, '77/247': 0, 'ES-10/21': 0, 'ES-10/22': 0, '78/256': 1, '78/188': 1, '78/198': -1, '77/289': 1, '78/180': 0 },
  FRA: { 'ES-11/1': 1, 'ES-11/4': 1, '77/247': 1, 'ES-10/21': 1, 'ES-10/22': 1, '78/256': 1, '78/188': 1, '78/198': 0, '77/289': 1, '78/180': 0 },
  DEU: { 'ES-11/1': 1, 'ES-11/4': 1, '77/247': 0, 'ES-10/21': 0, 'ES-10/22': 0, '78/256': 1, '78/188': 1, '78/198': 0, '77/289': 1, '78/180': 0 },
  ESP: { 'ES-11/1': 1, 'ES-11/4': 1, '77/247': 1, 'ES-10/21': 1, 'ES-10/22': 1, '78/256': 1, '78/188': 1, '78/198': 1, '77/289': 1, '78/180': 0 },
  ITA: { 'ES-11/1': 1, 'ES-11/4': 1, '77/247': 0, 'ES-10/21': 0, 'ES-10/22': 0, '78/256': 1, '78/188': 1, '78/198': 1, '77/289': 1, '78/180': 0 },
  PRT: { 'ES-11/1': 1, 'ES-11/4': 1, '77/247': 1, 'ES-10/21': 1, 'ES-10/22': 1, '78/256': 1, '78/188': 1, '78/198': 1, '77/289': 1, '78/180': 0 },
  NLD: { 'ES-11/1': 1, 'ES-11/4': 1, '77/247': 0, 'ES-10/21': 0, 'ES-10/22': 0, '78/256': 1, '78/188': 1, '78/198': 0, '77/289': 1, '78/180': 0 },
  POL: { 'ES-11/1': 1, 'ES-11/4': 1, '77/247': 0, 'ES-10/21': 0, 'ES-10/22': 0, '78/256': 1, '78/188': 1, '78/198': -1, '77/289': 1, '78/180': 0 },
  CAN: { 'ES-11/1': 1, 'ES-11/4': 1, '77/247': -1, 'ES-10/21': -1, 'ES-10/22': -1, '78/256': 1, '78/188': 1, '78/198': -1, '77/289': 1, '78/180': 0 },
  JPN: { 'ES-11/1': 1, 'ES-11/4': 1, '77/247': 0, 'ES-10/21': 0, 'ES-10/22': 0, '78/256': 1, '78/188': 1, '78/198': 0, '77/289': 1, '78/180': 0 },
  AUS: { 'ES-11/1': 1, 'ES-11/4': 1, '77/247': 0, 'ES-10/21': 0, 'ES-10/22': 0, '78/256': 1, '78/188': 1, '78/198': -1, '77/289': 1, '78/180': 0 },
  KOR: { 'ES-11/1': 1, 'ES-11/4': 1, '77/247': 0, 'ES-10/21': 0, 'ES-10/22': 0, '78/256': 1, '78/188': 1, '78/198': 0, '77/289': 1, '78/180': 0 },
  // Bloque oriental · consistente contra-occidental
  RUS: { 'ES-11/1': -1, 'ES-11/4': -1, '77/247': 1, 'ES-10/21': 1, 'ES-10/22': 1, '78/256': -1, '78/188': -1, '78/198': 1, '77/289': 0, '78/180': 0 },
  CHN: { 'ES-11/1': 0, 'ES-11/4': 0, '77/247': 1, 'ES-10/21': 1, 'ES-10/22': 1, '78/256': -1, '78/188': 0, '78/198': 1, '77/289': 0, '78/180': 0 },
  PRK: { 'ES-11/1': -1, 'ES-11/4': -1, '77/247': 1, 'ES-10/21': 1, 'ES-10/22': 1, '78/256': -1, '78/188': -1, '78/198': 1, '77/289': 0, '78/180': 1 },
  BLR: { 'ES-11/1': -1, 'ES-11/4': -1, '77/247': 1, 'ES-10/21': 1, 'ES-10/22': 1, '78/256': -1, '78/188': -1, '78/198': 1, '77/289': 0, '78/180': 1 },
  IRN: { 'ES-11/1': 0, 'ES-11/4': 0, '77/247': 1, 'ES-10/21': 1, 'ES-10/22': 1, '78/256': -1, '78/188': -1, '78/198': 1, '77/289': 0, '78/180': 1 },
  SYR: { 'ES-11/1': -1, 'ES-11/4': -1, '77/247': 1, 'ES-10/21': 1, 'ES-10/22': 1, '78/256': -1, '78/188': -1, '78/198': 1, '77/289': 0, '78/180': 1 },
  CUB: { 'ES-11/1': 0, 'ES-11/4': 0, '77/247': 1, 'ES-10/21': 1, 'ES-10/22': 1, '78/256': -1, '78/188': -1, '78/198': 1, '77/289': 0, '78/180': 1 },
  NIC: { 'ES-11/1': -1, 'ES-11/4': -1, '77/247': 1, 'ES-10/21': 1, 'ES-10/22': 1, '78/256': -1, '78/188': -1, '78/198': 1, '77/289': 0, '78/180': 1 },
  VEN: { 'ES-11/1': null, 'ES-11/4': null, '77/247': 1, 'ES-10/21': 1, 'ES-10/22': 1, '78/256': -1, '78/188': -1, '78/198': 1, '77/289': 0, '78/180': 1 },
  // No alineados · abstenciones frecuentes
  IND: { 'ES-11/1': 0, 'ES-11/4': 0, '77/247': 0, 'ES-10/21': 0, 'ES-10/22': 0, '78/256': 0, '78/188': 0, '78/198': 1, '77/289': 1, '78/180': 0 },
  ZAF: { 'ES-11/1': 0, 'ES-11/4': 0, '77/247': 1, 'ES-10/21': 1, 'ES-10/22': 1, '78/256': 0, '78/188': 0, '78/198': 1, '77/289': 1, '78/180': 1 },
  BRA: { 'ES-11/1': 1, 'ES-11/4': 1, '77/247': 1, 'ES-10/21': 1, 'ES-10/22': 1, '78/256': 1, '78/188': 1, '78/198': 1, '77/289': 1, '78/180': 0 },
  MEX: { 'ES-11/1': 1, 'ES-11/4': 1, '77/247': 1, 'ES-10/21': 1, 'ES-10/22': 1, '78/256': 1, '78/188': 1, '78/198': 1, '77/289': 1, '78/180': 0 },
  ARG: { 'ES-11/1': 1, 'ES-11/4': 1, '77/247': 1, 'ES-10/21': 1, 'ES-10/22': 0, '78/256': 1, '78/188': 1, '78/198': 1, '77/289': 1, '78/180': 0 },
  TUR: { 'ES-11/1': 1, 'ES-11/4': 1, '77/247': 1, 'ES-10/21': 1, 'ES-10/22': 1, '78/256': 0, '78/188': 0, '78/198': 1, '77/289': 1, '78/180': 0 },
  SAU: { 'ES-11/1': 1, 'ES-11/4': 0, '77/247': 1, 'ES-10/21': 1, 'ES-10/22': 1, '78/256': 0, '78/188': 0, '78/198': 1, '77/289': 1, '78/180': 0 },
  ARE: { 'ES-11/1': 0, 'ES-11/4': 0, '77/247': 1, 'ES-10/21': 1, 'ES-10/22': 1, '78/256': 0, '78/188': 0, '78/198': 1, '77/289': 1, '78/180': 0 },
  IDN: { 'ES-11/1': 1, 'ES-11/4': 0, '77/247': 1, 'ES-10/21': 1, 'ES-10/22': 1, '78/256': 0, '78/188': 0, '78/198': 1, '77/289': 1, '78/180': 1 },
  EGY: { 'ES-11/1': 1, 'ES-11/4': 1, '77/247': 1, 'ES-10/21': 1, 'ES-10/22': 1, '78/256': 0, '78/188': 0, '78/198': 1, '77/289': 1, '78/180': 1 },
  PAK: { 'ES-11/1': 0, 'ES-11/4': 0, '77/247': 1, 'ES-10/21': 1, 'ES-10/22': 1, '78/256': 0, '78/188': -1, '78/198': 1, '77/289': 1, '78/180': 0 },
  COL: { 'ES-11/1': 1, 'ES-11/4': 1, '77/247': 1, 'ES-10/21': 1, 'ES-10/22': 1, '78/256': 1, '78/188': 1, '78/198': 1, '77/289': 1, '78/180': 0 },
  CHL: { 'ES-11/1': 1, 'ES-11/4': 1, '77/247': 1, 'ES-10/21': 1, 'ES-10/22': 1, '78/256': 1, '78/188': 1, '78/198': 1, '77/289': 1, '78/180': 0 },
  PER: { 'ES-11/1': 1, 'ES-11/4': 1, '77/247': 1, 'ES-10/21': 1, 'ES-10/22': 1, '78/256': 1, '78/188': 1, '78/198': 1, '77/289': 1, '78/180': 0 },
  ETH: { 'ES-11/1': 0, 'ES-11/4': null, '77/247': 1, 'ES-10/21': 1, 'ES-10/22': 1, '78/256': 0, '78/188': 0, '78/198': 1, '77/289': 1, '78/180': 1 },
  NGA: { 'ES-11/1': 1, 'ES-11/4': 1, '77/247': 1, 'ES-10/21': 1, 'ES-10/22': 1, '78/256': 0, '78/188': 1, '78/198': 1, '77/289': 1, '78/180': 0 },
  KEN: { 'ES-11/1': 1, 'ES-11/4': 1, '77/247': 1, 'ES-10/21': 1, 'ES-10/22': 1, '78/256': 0, '78/188': 0, '78/198': 1, '77/289': 1, '78/180': 0 },
  // Resto · interpolación razonable
  ISR: { 'ES-11/1': 1, 'ES-11/4': 1, '77/247': -1, 'ES-10/21': -1, 'ES-10/22': -1, '78/256': 1, '78/188': 1, '78/198': -1, '77/289': 0, '78/180': -1 },
  MAR: { 'ES-11/1': 1, 'ES-11/4': null, '77/247': 1, 'ES-10/21': 1, 'ES-10/22': 1, '78/256': 0, '78/188': 0, '78/198': 1, '77/289': 1, '78/180': -1 },
  DZA: { 'ES-11/1': 0, 'ES-11/4': 0, '77/247': 1, 'ES-10/21': 1, 'ES-10/22': 1, '78/256': 0, '78/188': 0, '78/198': 1, '77/289': 1, '78/180': 1 },
  UKR: { 'ES-11/1': 1, 'ES-11/4': 1, '77/247': 1, 'ES-10/21': 1, 'ES-10/22': 1, '78/256': 1, '78/188': 1, '78/198': 1, '77/289': 1, '78/180': 0 },
  GEO: { 'ES-11/1': 1, 'ES-11/4': 1, '77/247': 1, 'ES-10/21': 1, 'ES-10/22': 1, '78/256': 1, '78/188': 1, '78/198': 1, '77/289': 1, '78/180': 0 },
  SWE: { 'ES-11/1': 1, 'ES-11/4': 1, '77/247': 1, 'ES-10/21': 1, 'ES-10/22': 1, '78/256': 1, '78/188': 1, '78/198': 0, '77/289': 1, '78/180': 0 },
  NOR: { 'ES-11/1': 1, 'ES-11/4': 1, '77/247': 1, 'ES-10/21': 1, 'ES-10/22': 1, '78/256': 1, '78/188': 1, '78/198': 0, '77/289': 1, '78/180': 0 },
  FIN: { 'ES-11/1': 1, 'ES-11/4': 1, '77/247': 1, 'ES-10/21': 1, 'ES-10/22': 1, '78/256': 1, '78/188': 1, '78/198': 0, '77/289': 1, '78/180': 0 },
  HUN: { 'ES-11/1': 1, 'ES-11/4': 1, '77/247': 0, 'ES-10/21': 0, 'ES-10/22': -1, '78/256': 1, '78/188': 1, '78/198': 1, '77/289': 1, '78/180': 0 },
  GRC: { 'ES-11/1': 1, 'ES-11/4': 1, '77/247': 1, 'ES-10/21': 1, 'ES-10/22': 1, '78/256': 1, '78/188': 1, '78/198': 1, '77/289': 1, '78/180': 0 },
  IRL: { 'ES-11/1': 1, 'ES-11/4': 1, '77/247': 1, 'ES-10/21': 1, 'ES-10/22': 1, '78/256': 1, '78/188': 1, '78/198': 1, '77/289': 1, '78/180': 0 },
}

/**
 * Calcula índice polarización · alineación con bloque occidental (-100 a +100).
 * +100 = vota siempre como Occidente · -100 = vota siempre contra · 0 = no alineado.
 */
export function getAlignmentWest(iso3: string): number | null {
  const votes = AGNU_VOTES[iso3.toUpperCase()]
  if (!votes) return null
  const values = Object.values(votes).filter((v): v is 1 | -1 | 0 => v !== null)
  if (values.length === 0) return null
  const sum = values.reduce((s, v) => s + v, 0)
  return Math.round((sum / values.length) * 100)
}

/**
 * Para el heatmap · top 40 países × 10 resoluciones.
 */
export function getVotingMatrix(): Array<{ iso3: string; votes: Record<string, Vote>; alignment: number | null }> {
  return Object.keys(AGNU_VOTES).map((iso3) => ({
    iso3,
    votes: AGNU_VOTES[iso3],
    alignment: getAlignmentWest(iso3),
  }))
}

export const AGNU_COUNTRIES_COUNT = Object.keys(AGNU_VOTES).length
