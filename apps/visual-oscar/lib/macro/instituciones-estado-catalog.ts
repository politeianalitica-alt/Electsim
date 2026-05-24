/**
 * Catálogo · Subtab 16 "Instituciones, sector público & capacidad estatal" v3 (Sprint N17).
 * Foco: ejecución presupuestaria, contratación, subvenciones, justicia,
 * empleo público, transparencia, confianza institucional.
 *
 * Sprint N17 · methodology + release + confidence + related ids.
 */
import type { PulsoIndicatorMeta } from "./pulso-indicators";

export const INSTITUCIONES_ESTADO_INDICATORS: PulsoIndicatorMeta[] = [
  {
    id: "ie-gasto-aapp",
    family: "demanda",
    label: "Gasto AAPP %PIB · Eurostat gov_10a_main",
    shortLabel: "Gasto AAPP",
    unit: "%",
    decimals: 2,
    source: "Eurostat · gov_10a_main",
    sourceCode: "gov_10a_main:TE",
    frequency: "annual",
    description: "Tamaño efectivo del Estado. Total expenditure (TE) de las AAPP sobre PIB. Define el espacio de gasto sobre el que se ejerce capacidad administrativa.",
    endpoint: "/api/eurostat/dataset?code=gov_10a_main&filters=geo=ES;na_item=TE;sector=S13;unit=PC_GDP",
    parser: "eurostat-simple",
    accent: "#dc2626",
    methodologyNote:
      "TE = Total Expenditure AAPP. Tamaño efectivo del Estado. España ~47% PIB (vs DEU 50%, FRA 58%, IT 56%). Mayor partida: pensiones (mf-prestaciones-d62) + salarios (ie-masa-salarial-aapp).",
    releaseSchedule: "Anual · notificación PDE abril+octubre",
    confidenceLevel: "high",
    relatedIndicatorIds: ["ie-ingresos-aapp", "mf-gasto-aapp", "ie-masa-salarial-aapp"],
  },
  {
    id: "ie-ingresos-aapp",
    family: "demanda",
    label: "Ingresos AAPP %PIB · Eurostat gov_10a_main",
    shortLabel: "Ingresos",
    unit: "%",
    decimals: 2,
    source: "Eurostat · gov_10a_main",
    sourceCode: "gov_10a_main:TR",
    frequency: "annual",
    description: "Total revenue (TR) AAPP %PIB. Capacidad recaudatoria es pilar de capacidad estatal — sin recaudación no hay ejecución.",
    endpoint: "/api/eurostat/dataset?code=gov_10a_main&filters=geo=ES;na_item=TR;sector=S13;unit=PC_GDP",
    parser: "eurostat-simple",
    accent: "#16a34a",
    methodologyNote:
      "TR = Total Revenue AAPP. España ~43% PIB · estructuralmente -5 pp vs media UE explicado por economía sumergida + bases imponibles + tipos efectivos IS bajos.",
    releaseSchedule: "Anual · notificación PDE abril+octubre",
    confidenceLevel: "high",
    relatedIndicatorIds: ["ie-gasto-aapp", "mf-ingresos-aapp"],
  },
  // Sprint N6.3 cleanup: ie-saldo-imf, ie-deuda-imf, ie-saldo-primario
  // removidos · viven todos en margen-fiscal (su tab natural). Aquí dejamos
  // gov_10a_main (gasto/ingresos como % PIB) que mide "tamaño efectivo del
  // Estado" + indicadores de capacidad ejecutiva (inversión, I+D público,
  // demografía empresas para regulación).

  // ─── Carga intereses %PIB (capacidad presupuestaria) ──────────────────
  {
    id: "ie-intereses-pib",
    family: "demanda",
    label: "Intereses deuda pública %PIB",
    shortLabel: "Intereses",
    unit: "%",
    decimals: 2,
    source: "Eurostat · gov_10a_main",
    sourceCode: "gov_10a_main:D41PAY:ES",
    frequency: "annual",
    description:
      "Pagos por intereses de las AAPP (D41) sobre PIB. Restan margen para gasto productivo. España ~2.3% PIB · cada +50pb del 10Y se traslada en 3-5 años.",
    endpoint: "/api/eurostat/dataset?code=gov_10a_main&filters=geo=ES;na_item=D41PAY;sector=S13;unit=PC_GDP",
    parser: "eurostat-simple",
    threshold: { amber: 2.5, red: 4, goodAbove: false },
    accent: "#dc2626",
    methodologyNote:
      "Intereses devengados D41PAY. España ~2.3% PIB — crowding-out de gasto productivo. La transmisión de tipos al stock es gradual (~8-9 años vida media).",
    releaseSchedule: "Anual · PDE",
    confidenceLevel: "high",
    relatedIndicatorIds: ["mf-intereses-pib", "rs-yield-10y-es"],
  },

  // ─── Gasto sanitario %PIB (capacidad welfare) ─────────────────────────
  {
    id: "ie-gasto-sanitario",
    family: "demanda",
    label: "Gasto sanitario público %PIB",
    shortLabel: "Sanidad",
    unit: "%",
    decimals: 1,
    source: "Eurostat · gov_10a_exp",
    sourceCode: "gov_10a_exp:GF07:ES",
    frequency: "annual",
    description:
      "Gasto en sanidad por las AAPP sobre PIB (COFOG GF07). España ~7% vs UE 7.5%. Métrica directa de capacidad welfare estatal.",
    endpoint: "/api/eurostat/dataset?code=gov_10a_exp&filters=geo=ES;cofog99=GF07;sector=S13;unit=PC_GDP",
    parser: "eurostat-simple",
    threshold: { amber: 6.5, red: 5.5, goodAbove: true },
    accent: "#0EA5E9",
    methodologyNote:
      "GF07 = Health (COFOG). Incluye hospitales + atención primaria + farmacia + salud pública. Competencia transferida CCAA (financiación capítulo CCAA). España gap UE -0.5 pp.",
    releaseSchedule: "Anual · publicación T+24 meses",
    confidenceLevel: "high",
    relatedIndicatorIds: ["sb-esperanza-vida-saludable", "ie-gasto-aapp"],
  },

  // ─── Gasto educativo %PIB ─────────────────────────────────────────────
  {
    id: "ie-gasto-educacion",
    family: "demanda",
    label: "Gasto educación pública %PIB",
    shortLabel: "Educación",
    unit: "%",
    decimals: 1,
    source: "Eurostat · gov_10a_exp",
    sourceCode: "gov_10a_exp:GF09:ES",
    frequency: "annual",
    description:
      "Gasto en educación AAPP (COFOG GF09) %PIB. España ~4.4% vs UE 4.7%. Inversión en capital humano de largo plazo.",
    endpoint: "/api/eurostat/dataset?code=gov_10a_exp&filters=geo=ES;cofog99=GF09;sector=S13;unit=PC_GDP",
    parser: "eurostat-simple",
    threshold: { amber: 4, red: 3.5, goodAbove: true },
    accent: "#7c3aed",
    methodologyNote:
      "GF09 = Education. Incluye primaria + secundaria + terciaria. España competencia CCAA. Caída secular desde pico 4.9% (2009) → 4.4% (2024). Compromiso LOMLOE: 5% PIB.",
    releaseSchedule: "Anual · publicación T+24 meses",
    confidenceLevel: "high",
    relatedIndicatorIds: ["pc-educacion-terciaria", "sb-abandono-escolar"],
  },
  {
    id: "ie-altas-empresas-eurostat",
    family: "demanda",
    label: "Demografía empresarial · Eurostat bd_size_r3",
    shortLabel: "Empresas",
    unit: "",
    decimals: 0,
    source: "Eurostat · bd_size_r3",
    sourceCode: "bd_size_r3:BUSI_CR",
    frequency: "annual",
    description:
      "Tasa de creación empresarial (BUSI_CR). Proxy de actividad económica formal y respuesta del tejido empresarial a la capacidad estatal regulatoria. DIRCE INE complementaria pero menos freshness.",
    endpoint: "/api/eurostat/dataset?code=bd_size_r3&filters=geo=ES;indic_sb=BUSI_CR;nace_r2=B-S_X_O_S94",
    parser: "eurostat-simple",
    accent: "#0891b2",
    methodologyNote:
      "Business birth rate. NACE B-S excluyendo O y S94 (administración + asociaciones). Proxy respuesta tejido empresarial a entorno regulatorio (burocracia, fiscalidad, licencias).",
    releaseSchedule: "Anual · T+24 meses",
    confidenceLevel: "medium",
    relatedIndicatorIds: ["eb-tasa-creacion-empresas", "eb-demografia-empresas-eurostat"],
  },
  {
    id: "ie-id-rd-eurostat",
    family: "oferta",
    label: "I+D pública %PIB · Eurostat rd_e_gerdtot",
    shortLabel: "I+D %PIB",
    unit: "%",
    decimals: 2,
    source: "Eurostat · rd_e_gerdtot",
    sourceCode: "rd_e_gerdtot",
    frequency: "annual",
    description:
      "Gasto en I+D sobre PIB. Proxy de capacidad institucional para invertir en conocimiento y ciencia. España persiste ~30% por debajo de la media UE.",
    endpoint: "/api/eurostat/dataset?code=rd_e_gerdtot&filters=geo=ES;sectperf=GOV;unit=PC_GDP",
    parser: "eurostat-simple",
    threshold: { amber: 0.6, red: 0.4, goodAbove: true },
    accent: "#7c3aed",
    methodologyNote:
      "GOV sector = government performance (CSIC + universidades + OPIs). España ~0.5% PIB vs UE ~0.7%. Gap menor que BERD pero estructural.",
    releaseSchedule: "Anual · T+24 meses",
    confidenceLevel: "high",
    relatedIndicatorIds: ["pc-id-pib-eurostat", "pc-id-empresarial"],
  },
  // ─── Sprint N13.2 · Gasto por función COFOG + masa salarial AAPP ────
  {
    id: "ie-gasto-defensa",
    family: "demanda",
    label: "Gasto defensa %PIB (COFOG GF02)",
    shortLabel: "Defensa",
    unit: "%",
    decimals: 1,
    source: "Eurostat · gov_10a_exp",
    sourceCode: "gov_10a_exp:GF02:ES",
    frequency: "annual",
    description:
      "Gasto defensa AAPP COFOG GF02 %PIB. España ~1.3% vs compromiso OTAN 2% (escalar a 2024). Driver de compras militares + I+D dual-use.",
    endpoint: "/api/eurostat/dataset?code=gov_10a_exp&filters=geo=ES;cofog99=GF02;sector=S13;unit=PC_GDP",
    parser: "eurostat-simple",
    threshold: { amber: 1.5, red: 1, goodAbove: true },
    accent: "#7c3aed",
    methodologyNote:
      "GF02 = Defence. COFOG cubre presupuesto Defensa + parte de Industria. NO equivalente exacto a métrica OTAN (que incluye pensiones militares + gendarmería). España: 1.3% COFOG ≈ 1.5% OTAN.",
    releaseSchedule: "Anual · T+24 meses",
    confidenceLevel: "high",
    relatedIndicatorIds: ["ie-gasto-aapp"],
  },
  {
    id: "ie-gasto-seguridad",
    family: "demanda",
    label: "Gasto orden público + seguridad %PIB",
    shortLabel: "Seguridad",
    unit: "%",
    decimals: 1,
    source: "Eurostat · gov_10a_exp",
    sourceCode: "gov_10a_exp:GF03:ES",
    frequency: "annual",
    description:
      "Gasto policía + bomberos + tribunales + prisiones %PIB (COFOG GF03). Función soberana clave para Estado de Derecho. España ~1.8% UE media.",
    endpoint: "/api/eurostat/dataset?code=gov_10a_exp&filters=geo=ES;cofog99=GF03;sector=S13;unit=PC_GDP",
    parser: "eurostat-simple",
    accent: "#0EA5E9",
    methodologyNote:
      "GF03 = Public order + safety. Policía + bomberos + justicia + prisiones. España competencia mixta (Estado + autonomías). Indicador estructura Estado Derecho.",
    releaseSchedule: "Anual · T+24 meses",
    confidenceLevel: "high",
    relatedIndicatorIds: ["ie-gasto-defensa", "ie-gasto-aapp"],
  },
  {
    id: "ie-masa-salarial-aapp",
    family: "demanda",
    label: "Masa salarial AAPP %PIB",
    shortLabel: "Sueldos AAPP",
    unit: "%",
    decimals: 1,
    source: "Eurostat · gov_10a_main",
    sourceCode: "gov_10a_main:D1PAY:ES",
    frequency: "annual",
    description:
      "Remuneración asalariados AAPP %PIB. España ~11% · 2º partida del gasto público. Indicador de tamaño real del Estado en personal.",
    endpoint: "/api/eurostat/dataset?code=gov_10a_main&filters=geo=ES;na_item=D1PAY;sector=S13;unit=PC_GDP",
    parser: "eurostat-simple",
    accent: "#dc2626",
    methodologyNote:
      "D1PAY = Compensation of employees (salarios + SS empresa). 2ª partida gasto. España ~11% vs media UE 10%. Rigidez alta (oposiciones).",
    releaseSchedule: "Anual · publicación T+12 meses",
    confidenceLevel: "high",
    relatedIndicatorIds: ["ie-empleo-publico-pct", "ie-gasto-aapp"],
  },
  {
    id: "ie-empleo-publico-pct",
    family: "empleo",
    label: "Empleo AAPP %total",
    shortLabel: "Emp. público %",
    unit: "%",
    decimals: 1,
    source: "Eurostat · tepsr_sp110",
    sourceCode: "tepsr_sp110:ES",
    frequency: "annual",
    description:
      "% empleados AAPP sobre empleo total. España ~16%, mediana UE. Captura tamaño del sector público funcional vs concesionado.",
    endpoint: "/api/eurostat/dataset?code=tepsr_sp110&filters=geo=ES",
    parser: "eurostat-simple",
    accent: "#16a34a",
    methodologyNote:
      "% empleados S13 (AAPP) sobre total. España ~16% mediana UE (Suecia 28%, Italia 14%). NO incluye empresa pública (SEPI) ni concesionados.",
    releaseSchedule: "Anual · LFS · T+9 meses",
    confidenceLevel: "high",
    relatedIndicatorIds: ["ie-masa-salarial-aapp"],
  },
  {
    id: "ie-fbcf-capital-aapp",
    family: "demanda",
    label: "FBCF AAPP %PIB (capital fijo)",
    shortLabel: "FBCF AAPP",
    unit: "%",
    decimals: 2,
    source: "Eurostat · gov_10dd_edpt2",
    sourceCode: "gov_10dd_edpt2:P51G:ES",
    frequency: "annual",
    description:
      "Formación bruta capital fijo AAPP %PIB. Inversión pública en infraestructura, equipos, software · multiplicador de productividad futura. España bajó de 5% (2010) a 2.5% (2024).",
    endpoint: "/api/eurostat/dataset?code=gov_10dd_edpt2&filters=geo=ES;na_item=P51G;sector=S13;unit=PC_GDP",
    parser: "eurostat-simple",
    threshold: { amber: 3, red: 2, goodAbove: true },
    accent: "#0F766E",
    methodologyNote:
      "P51G = Gross Fixed Capital Formation. Caída brutal 2010 (5%) → 2.5% (2024) por ajuste post-rescate. Multiplicador fiscal estimado 1.5-2x — reducción de inversión pública lastra crecimiento potencial.",
    releaseSchedule: "Anual · PDE · T+6 meses",
    confidenceLevel: "high",
    relatedIndicatorIds: ["ie-inversion-publica-eurostat", "inversion-fbcf-yoy"],
  },

  // Sprint L F6 · +1 inversión pública %PIB (Eurostat gov_10a_main GFCF)
  {
    id: "ie-inversion-publica-eurostat",
    family: "oferta",
    label: "Inversión pública %PIB · Eurostat gov_10a_main",
    shortLabel: "Inversión pub.",
    unit: "%",
    decimals: 2,
    source: "Eurostat · gov_10a_main",
    sourceCode: "gov_10a_main:P51G",
    frequency: "annual",
    description:
      "Formación bruta de capital fijo de las AAPP (P51G) sobre PIB. Capacidad del Estado para invertir en infraestructura, equipamiento y modernización. Crítica para sostener productividad.",
    endpoint: "/api/eurostat/dataset?code=gov_10a_main&filters=geo=ES;na_item=P51G;sector=S13;unit=PC_GDP",
    parser: "eurostat-simple",
    threshold: { amber: 3, red: 2, goodAbove: true },
    accent: "#16a34a",
    methodologyNote:
      "Cifra idéntica a ie-fbcf-capital-aapp pero vía dataset gov_10a_main (más fresh). Use cualquiera de los dos como sinónimo.",
    releaseSchedule: "Anual · T+6 meses",
    confidenceLevel: "high",
    relatedIndicatorIds: ["ie-fbcf-capital-aapp"],
  },
];

export const INSTITUCIONES_ESTADO_META = {
  slug: "instituciones-estado",
  label: "Instituciones, sector público & capacidad estatal",
  shortLabel: "Instituciones",
  accent: "#0891b2",
  description: "Capacidad estatal: ejecución presupuestaria, contratación pública, subvenciones, justicia, empleo público, transparencia y confianza institucional.",
};
