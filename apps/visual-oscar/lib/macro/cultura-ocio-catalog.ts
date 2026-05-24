/**
 * Catálogo · Subtab 15 "Cultura, ocio & economía social" v3.
 * Foco: turismo, cultura, industrias creativas, eventos, ocio, presión
 * turística. v1 con turismo INE Frontur + IPC servicios + IMF + macro.
 */
import type { PulsoIndicatorMeta } from "./pulso-indicators";

/**
 * Sprint N6.2 cleanup: removidos PIB/Paro/IPC/IPV/Exports genéricos copiados
 * de pulso-macro. Conservado solo turismo + pernoctaciones + arrivals
 * (verdaderamente específicos del sector). Añadidos: hostelería empleo,
 * IPC hostelería (componente sectorial), gasto turismo no-residente.
 */
export const CULTURA_OCIO_INDICATORS: PulsoIndicatorMeta[] = [
  {
    id: "co-empleo-hosteleria",
    family: "empleo",
    label: "Empleo hostelería + ocio · Eurostat",
    shortLabel: "Empleo HORECA",
    unit: "",
    decimals: 0,
    source: "Eurostat · lfsq_egan2",
    sourceCode: "lfsq_egan2:I:ES",
    frequency: "quarterly",
    description:
      "Ocupados en hostelería+restauración+ocio (NACE Rev2 sección I). Sector intensivo en empleo: ~12% del empleo total ES. Alta temporalidad, lead indicator del ciclo turístico.",
    endpoint: "/api/eurostat/dataset?code=lfsq_egan2&filters=geo=ES;nace_r2=I",
    parser: "eurostat-simple",
    accent: "#7c3aed",
  },
  {
    id: "co-tourism-services-export",
    family: "exterior",
    label: "Exportaciones servicios turísticos %PIB",
    shortLabel: "Turismo X",
    unit: "%",
    decimals: 1,
    source: "Eurostat · bop_its6_det",
    sourceCode: "bop_its6_det:SC:ES",
    frequency: "quarterly",
    description:
      "Exports turísticos como % PIB. España ~5.5% PIB sólo turismo (récord mundial). Driver fundamental del superávit corriente y la balanza de servicios.",
    endpoint: "/api/eurostat/dataset?code=bop_its6_det&filters=geo=ES;bop_item=SC",
    parser: "eurostat-simple",
    threshold: { amber: 4, red: 3, goodAbove: true },
    accent: "#16a34a",
  },
  {
    id: "co-frontur",
    family: "demanda",
    label: "Turistas internacionales · INE Frontur 23988",
    shortLabel: "Turistas",
    unit: "",
    decimals: 0,
    source: "INE WSTempus · Frontur",
    sourceCode: "FRONTUR23988",
    frequency: "monthly",
    description:
      "Llegadas mensuales de turistas internacionales (Frontur). Driver directo del sector — pico estacional jul-ago.",
    endpoint: "/api/ine/frontur?n=24",
    parser: "ine-frontur",
    accent: "#8b5cf6",
  },
  {
    id: "co-tourism-nights-eurostat",
    family: "demanda",
    label: "Pernoctaciones turísticas · Eurostat tour_occ_nin",
    shortLabel: "Pernoct.",
    unit: "",
    decimals: 0,
    source: "Eurostat · tour_occ_nin",
    sourceCode: "tour_occ_nin",
    frequency: "monthly",
    description:
      "Pernoctaciones en establecimientos turísticos. Métrica intensiva (no sólo llegadas) — refleja estancia media y peso económico real del turismo cultural.",
    endpoint: "/api/eurostat/dataset?code=tour_occ_nin&filters=geo=ES;c_resid=TOTAL;nace_r2=I551-I553;unit=NR",
    parser: "eurostat-simple",
    accent: "#a855f7",
  },
  // ─── Sprint N13.2 · Cultura, empleo cultural y comercio bienes ──────
  {
    id: "co-empleo-cultural",
    family: "empleo",
    label: "Empleo cultural total (NACE J-R)",
    shortLabel: "Empleo cult.",
    unit: " mil",
    decimals: 0,
    source: "Eurostat · cult_emp_n2",
    sourceCode: "cult_emp_n2:ES",
    frequency: "annual",
    description:
      "Empleo en sectores culturales (edición, audiovisual, artes escénicas, museos, publicidad, arquitectura). España ~700k personas, ~3.5% empleo total.",
    endpoint: "/api/eurostat/dataset?code=cult_emp_n2&filters=geo=ES",
    parser: "eurostat-simple",
    accent: "#8b5cf6",
  },
  {
    id: "co-cult-trade",
    family: "exterior",
    label: "Comercio bienes culturales saldo",
    shortLabel: "Bal. cultural",
    unit: " M€",
    decimals: 0,
    source: "Eurostat · cult_trd1",
    sourceCode: "cult_trd1:ES",
    frequency: "annual",
    description:
      "Saldo X-M bienes culturales (libros, discos, instrumentos, pintura, antigüedades). Reflejo del posicionamiento marca-cultura España exterior.",
    endpoint: "/api/eurostat/dataset?code=cult_trd1&filters=geo=ES",
    parser: "eurostat-simple",
    accent: "#7c3aed",
  },
  {
    id: "co-turismo-nacional",
    family: "demanda",
    label: "Turismo nacional residentes (viajes)",
    shortLabel: "Turismo nac.",
    unit: " mil",
    decimals: 0,
    source: "Eurostat · tour_dem_tttot",
    sourceCode: "tour_dem_tttot:ES",
    frequency: "annual",
    description:
      "Viajes turísticos realizados por residentes españoles. Complementa FRONTUR (extranjeros) · captura demanda doméstica + impacto crisis poder adquisitivo.",
    endpoint: "/api/eurostat/dataset?code=tour_dem_tttot&filters=geo=ES",
    parser: "eurostat-simple",
    accent: "#16a34a",
  },
  {
    id: "co-establecimientos-tur",
    family: "oferta",
    label: "Capacidad establecimientos turísticos",
    shortLabel: "Plazas",
    unit: " mil",
    decimals: 0,
    source: "Eurostat · tour_cap_nat",
    sourceCode: "tour_cap_nat:I551:ES",
    frequency: "annual",
    description:
      "Plazas hoteleras + camping + apartamentos turísticos. Stock estructural de oferta. España 2º país UE por capacidad tras Italia.",
    endpoint: "/api/eurostat/dataset?code=tour_cap_nat&filters=geo=ES;nace_r2=I551-I553",
    parser: "eurostat-simple",
    accent: "#0EA5E9",
  },
  {
    id: "co-pernoct-nuts2",
    family: "demanda",
    label: "Pernoctaciones NUTS2 (media regional)",
    shortLabel: "Pernoct. NUTS2",
    unit: " mil",
    decimals: 0,
    source: "Eurostat · tour_occ_arn",
    sourceCode: "tour_occ_arn:ES",
    frequency: "annual",
    description:
      "Pernoctaciones por región. Permite ver concentración (Canarias, Baleares, Cataluña, Andalucía concentran 65%) vs interior.",
    endpoint: "/api/eurostat/dataset?code=tour_occ_arn&filters=geo=ES;c_resid=TOTAL;unit=NR;nace_r2=I551-I553",
    parser: "eurostat-simple",
    accent: "#dc2626",
  },

  // Sprint L F6 · +1 turismo non-residente (gasto cultural-ocio)
  {
    id: "co-tourism-arrivals-eurostat",
    family: "exterior",
    label: "Llegadas turistas non-resident · Eurostat tour_occ_arm",
    shortLabel: "Arrivals",
    unit: "",
    decimals: 0,
    source: "Eurostat · tour_occ_arm",
    sourceCode: "tour_occ_arm",
    frequency: "monthly",
    description:
      "Llegadas mensuales de turistas no residentes a establecimientos en España (Eurostat armonizado UE). Complementa Frontur con visión comparable europea.",
    endpoint: "/api/eurostat/dataset?code=tour_occ_arm&filters=geo=ES;c_resid=FOR;nace_r2=I551-I553;unit=NR",
    parser: "eurostat-simple",
    accent: "#7c3aed",
  },
];

export const CULTURA_OCIO_META = {
  slug: "cultura-ocio",
  label: "Cultura, ocio & economía social",
  shortLabel: "Cultura",
  accent: "#8b5cf6",
  description: "Turismo, cultura, industrias creativas, ocio, deporte, patrimonio, eventos y presión turística sobre vivienda y servicios urbanos.",
};
