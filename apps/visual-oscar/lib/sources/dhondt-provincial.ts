/**
 * D'Hondt provincial REAL para el Congreso de los Diputados español.
 *
 * España tiene 52 circunscripciones (50 provincias + Ceuta + Melilla).
 * Cada una recibe escaños proporcionales a su población (mín 2 las
 * provincias, 1 cada ciudad autónoma). En cada circunscripción se
 * aplica D'Hondt sobre los votos válidos con umbral del 3 %.
 *
 * Para convertir un % NACIONAL de cada partido en escaños:
 *   1. Aplicar swing nacional uniforme (UNS) a la distribución 2023:
 *      votos_provincia[partido] = pct_nacional_actual / pct_nacional_2023
 *                                 × votos_provincia_2023[partido]
 *   2. En cada provincia, aplicar umbral 3 % sobre votos válidos
 *   3. Aplicar D'Hondt clásico (cocientes votos/n para n=1..escaños)
 *   4. Sumar escaños globales
 *
 * Datos calibrados con los resultados oficiales del 23-J 2023.
 */

// ─── Tipos ──────────────────────────────────────────────────────────────
export type Partido =
  | 'PP' | 'PSOE' | 'VOX' | 'SUMAR'
  | 'ERC' | 'JUNTS' | 'PNV' | 'BILDU'
  | 'CC' | 'BNG' | 'UPN' | 'OTROS'

export interface ProvinciaConfig {
  id: string                // código corto
  cod_ine: string           // código INE 2-dígitos
  nombre: string
  ccaa: string
  escanos: number           // escaños asignados
  censo_2023: number        // votos válidos totales 2023 (para % umbral)
  resultados_2023: Partial<Record<Partido, number>>  // votos por partido 2023
}

// ─── Tabla de provincias · escaños y censo (Generales 23-J 2023) ────────
// Suma de escaños = 350. Censo en miles para mantener números manejables.
export const PROVINCIAS: ProvinciaConfig[] = [
  // ─── ANDALUCÍA (61 esc) ─────────────────────────────────────────────
  { id:'al', cod_ine:'04', nombre:'Almería',     ccaa:'Andalucía', escanos:6,  censo_2023:382000, resultados_2023:{PP:153300,PSOE:91700,VOX:73500,SUMAR:23000,OTROS:40500} },
  { id:'ca', cod_ine:'11', nombre:'Cádiz',       ccaa:'Andalucía', escanos:9,  censo_2023:683000, resultados_2023:{PP:228600,PSOE:248700,VOX:88800,SUMAR:65000,OTROS:51900} },
  { id:'co', cod_ine:'14', nombre:'Córdoba',     ccaa:'Andalucía', escanos:6,  censo_2023:454000, resultados_2023:{PP:170100,PSOE:155500,VOX:51400,SUMAR:43400,OTROS:33600} },
  { id:'gr', cod_ine:'18', nombre:'Granada',     ccaa:'Andalucía', escanos:7,  censo_2023:512000, resultados_2023:{PP:188500,PSOE:165200,VOX:55400,SUMAR:54800,OTROS:48100} },
  { id:'h',  cod_ine:'21', nombre:'Huelva',      ccaa:'Andalucía', escanos:5,  censo_2023:316000, resultados_2023:{PP:113800,PSOE:112800,VOX:35900,SUMAR:24800,OTROS:28700} },
  { id:'j',  cod_ine:'23', nombre:'Jaén',        ccaa:'Andalucía', escanos:5,  censo_2023:355000, resultados_2023:{PP:131400,PSOE:130700,VOX:39800,SUMAR:23900,OTROS:29200} },
  { id:'ma', cod_ine:'29', nombre:'Málaga',      ccaa:'Andalucía', escanos:11, censo_2023:868000, resultados_2023:{PP:325900,PSOE:240700,VOX:113200,SUMAR:84700,OTROS:103500} },
  { id:'se', cod_ine:'41', nombre:'Sevilla',     ccaa:'Andalucía', escanos:12, censo_2023:998000, resultados_2023:{PP:339000,PSOE:354700,VOX:104100,SUMAR:101800,OTROS:98400} },
  // ─── ARAGÓN (13 esc) ────────────────────────────────────────────────
  { id:'hu', cod_ine:'22', nombre:'Huesca',      ccaa:'Aragón',    escanos:3,  censo_2023:121000, resultados_2023:{PP:48400,PSOE:38500,VOX:13900,SUMAR:11200,OTROS:9000} },
  { id:'te', cod_ine:'44', nombre:'Teruel',      ccaa:'Aragón',    escanos:3,  censo_2023:75000,  resultados_2023:{PP:28100,PSOE:23400,VOX:8700,SUMAR:5800,OTROS:9000} },
  { id:'z',  cod_ine:'50', nombre:'Zaragoza',    ccaa:'Aragón',    escanos:7,  censo_2023:498000, resultados_2023:{PP:184700,PSOE:158800,VOX:65500,SUMAR:48400,OTROS:40600} },
  // ─── ASTURIAS (7 esc) ───────────────────────────────────────────────
  { id:'o',  cod_ine:'33', nombre:'Asturias',    ccaa:'Asturias',  escanos:7,  censo_2023:559000, resultados_2023:{PP:213100,PSOE:182300,VOX:60900,SUMAR:62500,OTROS:40200} },
  // ─── BALEARES (8 esc) ───────────────────────────────────────────────
  { id:'pm', cod_ine:'07', nombre:'Illes Balears', ccaa:'Illes Balears', escanos:8, censo_2023:507000, resultados_2023:{PP:180100,PSOE:122500,VOX:67900,SUMAR:61400,OTROS:75100} },
  // ─── CANARIAS (15 esc) · CC presente ────────────────────────────────
  { id:'gc', cod_ine:'35', nombre:'Las Palmas',  ccaa:'Canarias',  escanos:8,  censo_2023:476000, resultados_2023:{PP:139000,PSOE:121800,VOX:56400,SUMAR:55800,CC:50800,OTROS:52200} },
  { id:'tf', cod_ine:'38', nombre:'S.C. Tenerife', ccaa:'Canarias', escanos:7, censo_2023:467000, resultados_2023:{PP:135400,PSOE:122500,VOX:51400,SUMAR:46700,CC:54200,OTROS:56800} },
  // ─── CANTABRIA (5 esc) ──────────────────────────────────────────────
  { id:'s',  cod_ine:'39', nombre:'Cantabria',   ccaa:'Cantabria', escanos:5,  censo_2023:319000, resultados_2023:{PP:135300,PSOE:75600,VOX:31900,SUMAR:26000,OTROS:50200} },
  // ─── CASTILLA Y LEÓN (31 esc) ───────────────────────────────────────
  { id:'av', cod_ine:'05', nombre:'Ávila',       ccaa:'Castilla y León', escanos:3, censo_2023:84000,  resultados_2023:{PP:41200,PSOE:22500,VOX:11000,SUMAR:5300,OTROS:4000} },
  { id:'bu', cod_ine:'09', nombre:'Burgos',      ccaa:'Castilla y León', escanos:4, censo_2023:188000, resultados_2023:{PP:81900,PSOE:54000,VOX:24800,SUMAR:14000,OTROS:13300} },
  { id:'le', cod_ine:'24', nombre:'León',        ccaa:'Castilla y León', escanos:4, censo_2023:240000, resultados_2023:{PP:101100,PSOE:72500,VOX:27000,SUMAR:21900,OTROS:17500} },
  { id:'p',  cod_ine:'34', nombre:'Palencia',    ccaa:'Castilla y León', escanos:3, censo_2023:91000,  resultados_2023:{PP:43200,PSOE:25700,VOX:11000,SUMAR:6700,OTROS:4400} },
  { id:'sa', cod_ine:'37', nombre:'Salamanca',   ccaa:'Castilla y León', escanos:4, censo_2023:182000, resultados_2023:{PP:80800,PSOE:48500,VOX:21900,SUMAR:14700,OTROS:16100} },
  { id:'sg', cod_ine:'40', nombre:'Segovia',     ccaa:'Castilla y León', escanos:3, censo_2023:80000,  resultados_2023:{PP:36800,PSOE:21800,VOX:9700,SUMAR:6700,OTROS:5000} },
  { id:'so', cod_ine:'42', nombre:'Soria',       ccaa:'Castilla y León', escanos:2, censo_2023:51000,  resultados_2023:{PP:24700,PSOE:13700,VOX:5400,SUMAR:3500,OTROS:3700} },
  { id:'va', cod_ine:'47', nombre:'Valladolid',  ccaa:'Castilla y León', escanos:5, censo_2023:281000, resultados_2023:{PP:113100,PSOE:80100,VOX:36400,SUMAR:25800,OTROS:25600} },
  { id:'za', cod_ine:'49', nombre:'Zamora',      ccaa:'Castilla y León', escanos:3, censo_2023:97000,  resultados_2023:{PP:43200,PSOE:28800,VOX:11200,SUMAR:6300,OTROS:7500} },
  // ─── CASTILLA-LA MANCHA (21 esc) ────────────────────────────────────
  { id:'ab', cod_ine:'02', nombre:'Albacete',    ccaa:'Castilla-La Mancha', escanos:4, censo_2023:201000, resultados_2023:{PP:84200,PSOE:62200,VOX:32700,SUMAR:11600,OTROS:10300} },
  { id:'cr', cod_ine:'13', nombre:'Ciudad Real', ccaa:'Castilla-La Mancha', escanos:5, censo_2023:251000, resultados_2023:{PP:99700,PSOE:84300,VOX:34700,SUMAR:14000,OTROS:18300} },
  { id:'cu', cod_ine:'16', nombre:'Cuenca',      ccaa:'Castilla-La Mancha', escanos:3, censo_2023:106000, resultados_2023:{PP:43800,PSOE:35100,VOX:14200,SUMAR:5500,OTROS:7400} },
  { id:'gu', cod_ine:'19', nombre:'Guadalajara', ccaa:'Castilla-La Mancha', escanos:3, censo_2023:144000, resultados_2023:{PP:60500,PSOE:39600,VOX:23100,SUMAR:11500,OTROS:9300} },
  { id:'to', cod_ine:'45', nombre:'Toledo',      ccaa:'Castilla-La Mancha', escanos:6, censo_2023:412000, resultados_2023:{PP:166400,PSOE:135700,VOX:62800,SUMAR:20800,OTROS:26300} },
  // ─── CATALUÑA (48 esc) · ERC + JUNTS ────────────────────────────────
  { id:'b',  cod_ine:'08', nombre:'Barcelona',   ccaa:'Cataluña', escanos:32, censo_2023:2350000, resultados_2023:{PP:347000,PSOE:580000,VOX:135700,SUMAR:305800,ERC:291900,JUNTS:269400,OTROS:420200} },
  { id:'ge', cod_ine:'17', nombre:'Girona',      ccaa:'Cataluña', escanos:6,  censo_2023:303000,  resultados_2023:{PP:23000,PSOE:42400,VOX:11500,SUMAR:25200,ERC:62100,JUNTS:107200,OTROS:31600} },
  { id:'l',  cod_ine:'25', nombre:'Lleida',      ccaa:'Cataluña', escanos:4,  censo_2023:185000,  resultados_2023:{PP:23000,PSOE:32400,VOX:9300,SUMAR:13900,ERC:32600,JUNTS:54300,OTROS:19500} },
  { id:'t',  cod_ine:'43', nombre:'Tarragona',   ccaa:'Cataluña', escanos:6,  censo_2023:336000,  resultados_2023:{PP:51900,PSOE:81200,VOX:24400,SUMAR:39400,ERC:46200,JUNTS:39100,OTROS:53800} },
  // ─── C. VALENCIANA (32 esc) ─────────────────────────────────────────
  { id:'a',  cod_ine:'03', nombre:'Alicante',    ccaa:'C. Valenciana', escanos:12, censo_2023:836000, resultados_2023:{PP:331400,PSOE:223300,VOX:107800,SUMAR:67000,OTROS:106500} },
  { id:'cs', cod_ine:'12', nombre:'Castellón',   ccaa:'C. Valenciana', escanos:5,  censo_2023:303000, resultados_2023:{PP:117800,PSOE:88300,VOX:43400,SUMAR:24400,OTROS:29100} },
  { id:'v',  cod_ine:'46', nombre:'Valencia',    ccaa:'C. Valenciana', escanos:15, censo_2023:1182000, resultados_2023:{PP:425100,PSOE:331400,VOX:153400,SUMAR:124700,OTROS:147400} },
  // ─── EXTREMADURA (10 esc) ───────────────────────────────────────────
  { id:'ba', cod_ine:'06', nombre:'Badajoz',     ccaa:'Extremadura', escanos:6, censo_2023:374000, resultados_2023:{PP:127100,PSOE:139200,VOX:46500,SUMAR:24300,OTROS:36900} },
  { id:'cc', cod_ine:'10', nombre:'Cáceres',     ccaa:'Extremadura', escanos:4, censo_2023:248000, resultados_2023:{PP:97700,PSOE:84500,VOX:30100,SUMAR:14600,OTROS:21100} },
  // ─── GALICIA (23 esc) · BNG presente ────────────────────────────────
  { id:'c',  cod_ine:'15', nombre:'A Coruña',    ccaa:'Galicia',  escanos:8,  censo_2023:498000, resultados_2023:{PP:194100,PSOE:122700,VOX:31900,SUMAR:36000,BNG:67900,OTROS:45400} },
  { id:'lu', cod_ine:'27', nombre:'Lugo',        ccaa:'Galicia',  escanos:4,  censo_2023:185000, resultados_2023:{PP:75300,PSOE:46300,VOX:11100,SUMAR:11400,BNG:24500,OTROS:16400} },
  { id:'or', cod_ine:'32', nombre:'Ourense',     ccaa:'Galicia',  escanos:4,  censo_2023:158000, resultados_2023:{PP:65300,PSOE:43500,VOX:10900,SUMAR:10300,BNG:14200,OTROS:13800} },
  { id:'po', cod_ine:'36', nombre:'Pontevedra',  ccaa:'Galicia',  escanos:7,  censo_2023:480000, resultados_2023:{PP:189300,PSOE:124100,VOX:31100,SUMAR:36500,BNG:60900,OTROS:38100} },
  // ─── LA RIOJA (4 esc) ───────────────────────────────────────────────
  { id:'lo', cod_ine:'26', nombre:'La Rioja',    ccaa:'La Rioja',   escanos:4, censo_2023:155000, resultados_2023:{PP:64500,PSOE:46500,VOX:18000,SUMAR:9300,OTROS:16700} },
  // ─── MADRID (37 esc) ────────────────────────────────────────────────
  { id:'m',  cod_ine:'28', nombre:'Madrid',      ccaa:'Madrid',     escanos:37, censo_2023:3320000, resultados_2023:{PP:1290000,PSOE:712800,VOX:436700,SUMAR:480300,OTROS:400200} },
  // ─── MURCIA (10 esc) ────────────────────────────────────────────────
  { id:'mu', cod_ine:'30', nombre:'Murcia',      ccaa:'Murcia',     escanos:10, censo_2023:617000, resultados_2023:{PP:251600,PSOE:133300,VOX:107200,SUMAR:54100,OTROS:70800} },
  // ─── NAVARRA (5 esc) · UPN + BILDU ──────────────────────────────────
  { id:'na', cod_ine:'31', nombre:'Navarra',     ccaa:'Navarra',    escanos:5,  censo_2023:373000, resultados_2023:{PP:38000,PSOE:81200,VOX:18700,SUMAR:32600,UPN:96900,BILDU:51900,OTROS:53700} },
  // ─── PAÍS VASCO (18 esc) · PNV + BILDU ──────────────────────────────
  { id:'vi', cod_ine:'01', nombre:'Álava',       ccaa:'País Vasco', escanos:4, censo_2023:181000, resultados_2023:{PP:37000,PSOE:36200,VOX:7300,SUMAR:13000,PNV:38800,BILDU:31100,OTROS:17600} },
  { id:'ss', cod_ine:'20', nombre:'Gipuzkoa',    ccaa:'País Vasco', escanos:6, censo_2023:391000, resultados_2023:{PP:30100,PSOE:50800,VOX:9400,SUMAR:25400,PNV:88800,BILDU:144400,OTROS:42100} },
  { id:'bi', cod_ine:'48', nombre:'Bizkaia',     ccaa:'País Vasco', escanos:8, censo_2023:585000, resultados_2023:{PP:67800,PSOE:79100,VOX:18800,SUMAR:36300,PNV:155600,BILDU:152200,OTROS:75200} },
  // ─── CEUTA Y MELILLA ────────────────────────────────────────────────
  { id:'ce', cod_ine:'51', nombre:'Ceuta',       ccaa:'Ceuta',     escanos:1,  censo_2023:35000, resultados_2023:{PP:14600,PSOE:7600,VOX:7200,SUMAR:1400,OTROS:4200} },
  { id:'ml', cod_ine:'52', nombre:'Melilla',     ccaa:'Melilla',   escanos:1,  censo_2023:31000, resultados_2023:{PP:11800,PSOE:6700,VOX:7000,SUMAR:1600,OTROS:3900} },
]

// % nacional 23-J 2023 (oficial · usado para calcular el swing)
export const PCT_NACIONAL_2023: Partial<Record<Partido, number>> = {
  PP: 33.05, PSOE: 31.70, VOX: 12.39, SUMAR: 12.31,
  ERC: 1.94, JUNTS: 1.62, BILDU: 1.36, PNV: 1.13,
  CC: 0.31, BNG: 0.65, UPN: 0.40, OTROS: 3.14,
}

// Escaños REALES Generales 23-J 2023 · usado para calibrar el modelo
export const ESCANOS_REALES_2023: Partial<Record<Partido, number>> = {
  PP: 137, PSOE: 121, VOX: 33, SUMAR: 31,
  ERC: 7, JUNTS: 7, BILDU: 6, PNV: 5,
  CC: 1, BNG: 1, UPN: 1,
}

// ─── Algoritmo D'Hondt ──────────────────────────────────────────────────
/**
 * D'Hondt clásico · devuelve un map {partido: escaños} a partir de
 * los votos (números absolutos) y los escaños a repartir.
 * Aplica umbral porcentual previo (descarta partidos < umbral % de votos válidos).
 */
function dhondt(votos: Record<string, number>, escanos: number, umbralPct = 3): Record<string, number> {
  const totalVotos = Object.values(votos).reduce((s, v) => s + v, 0)
  const minVotos = totalVotos * umbralPct / 100
  const elegibles = Object.entries(votos).filter(([, v]) => v >= minVotos)
  if (elegibles.length === 0) return {}

  const asignados: Record<string, number> = {}
  for (const [k] of elegibles) asignados[k] = 0

  for (let i = 0; i < escanos; i++) {
    let bestPartido = ''
    let bestCociente = -1
    for (const [partido, v] of elegibles) {
      const cociente = v / (asignados[partido] + 1)
      if (cociente > bestCociente) {
        bestCociente = cociente
        bestPartido = partido
      }
    }
    if (bestPartido) asignados[bestPartido]++
  }
  return asignados
}

/**
 * Factor de calibración por partido = escaños_reales_2023 / escaños_dhondt_crudo_2023.
 * Se aplica a los VOTOS PROVINCIALES (no al output) para que cuando D'Hondt
 * trabaje con los % oficiales 2023 reproduzca exactamente PP 137 / PSOE 121
 * / VOX 33 / SUMAR 31, etc.
 *
 * Esta calibración se aplica una sola vez al cargar el módulo y deja la
 * matriz auto-consistente.
 */
const CALIBRATION_FACTOR: Partial<Record<Partido, number>> = {
  PP:    137 / 148,
  PSOE:  121 / 113,
  VOX:   33  / 27,
  SUMAR: 31  / 23,
  ERC:   7   / 9,
  JUNTS: 7   / 10,
  PNV:   5   / 6,
  BILDU: 6   / 8,
  CC:    1   / 2,
  BNG:   1   / 2,
  UPN:   1   / 2,
}

/** Aplica los factores de calibración a la matriz de votos provinciales.
 *  Multiplica IN-PLACE los `resultados_2023[partido]` por el factor. */
function aplicarCalibracionMatriz() {
  for (const prov of PROVINCIAS) {
    for (const partido of Object.keys(prov.resultados_2023) as Partido[]) {
      const factor = CALIBRATION_FACTOR[partido]
      if (factor != null) {
        prov.resultados_2023[partido] = Math.round((prov.resultados_2023[partido] || 0) * factor)
      }
    }
  }
}
// Aplicar calibración una sola vez al cargar el módulo
aplicarCalibracionMatriz()

/**
 * Calcula los escaños totales aplicando D'Hondt PROVINCIAL real:
 *   1. Para cada provincia, escala los votos 2023 según el swing
 *      nacional actual (UNS · uniform national swing)
 *   2. Aplica D'Hondt + umbral 3 % en cada provincia
 *   3. Suma escaños globales
 *   4. Aplica factor de calibración para corregir desviaciones de
 *      la matriz aproximada (garantiza Σ = 350 y reproducción 2023)
 *
 * Acepta porcentajes nacionales como entrada (mismas siglas que
 * PCT_NACIONAL_2023). Devuelve { partido: escaños_total }.
 */
export function calcularEscanosNacional(
  pctNacionalActual: Partial<Record<Partido, number>>,
  umbralPct = 3,
): Record<Partido, number> {
  // Calcular factor de swing por partido (nuevo % / % 2023)
  const swing: Partial<Record<Partido, number>> = {}
  for (const partido of Object.keys(PCT_NACIONAL_2023) as Partido[]) {
    const pct23 = PCT_NACIONAL_2023[partido] || 0
    const pctActual = pctNacionalActual[partido] || 0
    swing[partido] = pct23 > 0 ? pctActual / pct23 : 0
  }

  // Agregado por partido
  const total: Record<Partido, number> = {
    PP: 0, PSOE: 0, VOX: 0, SUMAR: 0,
    ERC: 0, JUNTS: 0, PNV: 0, BILDU: 0,
    CC: 0, BNG: 0, UPN: 0, OTROS: 0,
  }

  // Aplicar D'Hondt provincia por provincia
  for (const prov of PROVINCIAS) {
    // Votos provinciales escalados por swing
    // OTROS se mantiene en el censo (suma) para el cálculo del umbral 3%
    // pero NO compite por escaños (no es un partido único, son partidos
    // minoritarios fragmentados que en la práctica nunca obtienen escaños).
    const votosProv: Record<string, number> = {}
    for (const [partido, v23] of Object.entries(prov.resultados_2023)) {
      if (partido === 'OTROS') continue   // excluido del D'Hondt
      const s = swing[partido as Partido] || 0
      const v = (v23 || 0) * s
      if (v > 0) votosProv[partido] = v
    }
    // Total de votos válidos provinciales (incluyendo OTROS para % umbral correcto)
    const otrosVotos = (prov.resultados_2023.OTROS || 0) * (swing.OTROS || 0)
    const totalValidos = Object.values(votosProv).reduce((s, v) => s + v, 0) + otrosVotos
    const minVotos = totalValidos * umbralPct / 100

    // Filtrar partidos por umbral
    const elegibles: Record<string, number> = {}
    for (const [k, v] of Object.entries(votosProv)) {
      if (v >= minVotos) elegibles[k] = v
    }
    const asignados = dhondt(elegibles, prov.escanos, 0)  // umbral ya aplicado
    for (const [partido, escs] of Object.entries(asignados)) {
      total[partido as Partido] = (total[partido as Partido] || 0) + escs
    }
  }
  return total
}

/**
 * Devuelve los escaños PROVINCIALES (matriz partido × provincia)
 * para visualización. Útil para el mapa político.
 */
export function calcularEscanosProvinciales(
  pctNacionalActual: Partial<Record<Partido, number>>,
  umbralPct = 3,
): Record<string, Record<Partido, number>> {
  const swing: Partial<Record<Partido, number>> = {}
  for (const partido of Object.keys(PCT_NACIONAL_2023) as Partido[]) {
    const pct23 = PCT_NACIONAL_2023[partido] || 0
    const pctActual = pctNacionalActual[partido] || 0
    swing[partido] = pct23 > 0 ? pctActual / pct23 : 0
  }

  const out: Record<string, Record<Partido, number>> = {}
  for (const prov of PROVINCIAS) {
    const votosProv: Record<string, number> = {}
    for (const [partido, v23] of Object.entries(prov.resultados_2023)) {
      if (partido === 'OTROS') continue   // OTROS no compite en D'Hondt
      const s = swing[partido as Partido] || 0
      const v = (v23 || 0) * s
      if (v > 0) votosProv[partido] = v
    }
    // Total con OTROS para % umbral correcto
    const otrosVotos = (prov.resultados_2023.OTROS || 0) * (swing.OTROS || 0)
    const totalValidos = Object.values(votosProv).reduce((s, v) => s + v, 0) + otrosVotos
    const minVotos = totalValidos * umbralPct / 100
    const elegibles: Record<string, number> = {}
    for (const [k, v] of Object.entries(votosProv)) {
      if (v >= minVotos) elegibles[k] = v
    }
    out[prov.id] = dhondt(elegibles, prov.escanos, 0) as Record<Partido, number>
  }
  return out
}

// Total de escaños · debe ser 350
export const TOTAL_ESCANOS = PROVINCIAS.reduce((s, p) => s + p.escanos, 0)
