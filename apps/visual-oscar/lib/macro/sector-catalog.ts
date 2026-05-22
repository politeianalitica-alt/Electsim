/**
 * Catálogo de sectores estratégicos de la economía española.
 *
 * Usado por:
 *   - /macro/empresas-beneficios/sector/[id]
 *   - GET /api/macro/empresas-beneficios/sector/[id]
 *   - POST /api/macro/ai/analyze-sector
 */

export interface SpanishSector {
  id: string;
  label: string;
  shortLabel: string;
  gdpShare: number; // % VAB España (aproximado)
  employmentShare: number; // % empleo total
  description: string;
  /** Cotizadas españolas representativas (IDs del company-catalog). */
  topCompanies: string[];
  /** Subtabs donde el sector aporta señal. */
  relatedSubtabs: string[];
  /** Drivers macro que mueven el sector. */
  macroDrivers: string[];
  /** Riesgos sectoriales recurrentes. */
  recurringRisks: string[];
}

export const SECTOR_CATALOG: SpanishSector[] = [
  {
    id: "banca",
    label: "Banca y servicios financieros",
    shortLabel: "Banca",
    gdpShare: 4.5,
    employmentShare: 1.3,
    description:
      "Tres grandes (Santander, BBVA, CaixaBank) concentran ~70% del crédito doméstico. Sector clave por su papel en transmisión monetaria, financiación de hogares/pymes y tenencia de deuda pública.",
    topCompanies: ["santander", "bbva", "caixabank"],
    relatedSubtabs: ["empresas-beneficios", "regimen-monetario", "riesgo-sistemico", "flujos-capital"],
    macroDrivers: ["Tipos BCE", "Pendiente curva", "Ciclo crédito", "Morosidad", "Spreads soberanos"],
    recurringRisks: ["Concentración inmobiliaria", "Exposición EM (México, Brasil, Turquía)", "Regulación MREL/Basel"],
  },
  {
    id: "energia",
    label: "Energía y utilities",
    shortLabel: "Energía",
    gdpShare: 5.2,
    employmentShare: 1.0,
    description:
      "Oligopolio efectivo en electricidad (Iberdrola, Endesa, Naturgy, Repsol, Acciona). Sector con peso geopolítico alto (dependencia gas), regulatorio y de transición energética.",
    topCompanies: ["iberdrola", "endesa", "repsol", "naturgy"],
    relatedSubtabs: ["empresas-beneficios", "dependencias-externas", "mercados-activos", "hogares-empleo-vivienda"],
    macroDrivers: ["Precio Brent/TTF", "Tipos (capex)", "Regulación europea", "Demanda industrial", "Transición renovables"],
    recurringRisks: ["Shocks energéticos", "Cambios regulatorios bruscos", "Impuesto extraordinario", "Sequía hidroeléctrica"],
  },
  {
    id: "telecom",
    label: "Telecomunicaciones",
    shortLabel: "Telecom",
    gdpShare: 2.8,
    employmentShare: 0.9,
    description:
      "Mercado consolidado con Telefónica + MásOrange + Vodafone-Zegona. Cellnex domina torres pan-europeas. Negocio maduro, apalancado, sensible a tipos.",
    topCompanies: ["telefonica", "cellnex"],
    relatedSubtabs: ["empresas-beneficios", "regimen-monetario", "productividad-competitividad"],
    macroDrivers: ["Tipos", "Inversión 5G/fibra", "Regulación CNMC", "Consolidación europea"],
    recurringRisks: ["Pricing pressure", "Capex obligatorio", "Apalancamiento elevado", "Disrupción OTT"],
  },
  {
    id: "infraestructuras",
    label: "Infraestructuras y concesiones",
    shortLabel: "Infraestructura",
    gdpShare: 7.5,
    employmentShare: 6.5,
    description:
      "Liderazgo español en concesiones internacionales (Ferrovial, ACS, Aena). Aena es el mayor operador aeroportuario mundial por tráfico.",
    topCompanies: ["aena", "ferrovial"],
    relatedSubtabs: ["empresas-beneficios", "flujos-capital", "productividad-competitividad"],
    macroDrivers: ["Tipos (financiación)", "Tráfico aéreo", "Turismo", "Inversión pública/fondos UE"],
    recurringRisks: ["Concesiones expirando", "Riesgo país", "Imposición fiscal en concesiones"],
  },
  {
    id: "consumo",
    label: "Consumo y retail",
    shortLabel: "Consumo",
    gdpShare: 12.0,
    employmentShare: 14.5,
    description:
      "Liderado por Inditex (textil) y la gran distribución alimentaria (Mercadona, Carrefour, El Corte Inglés). Termómetro directo del consumo hogares.",
    topCompanies: ["inditex"],
    relatedSubtabs: ["empresas-beneficios", "hogares-empleo-vivienda", "productividad-competitividad"],
    macroDrivers: ["Salarios reales", "Confianza consumidor", "Inflación", "Turismo (gasto extranjero)"],
    recurringRisks: ["Caída poder adquisitivo", "Cambios hábitos consumo", "Coste laboral"],
  },
  {
    id: "turismo",
    label: "Turismo y hostelería",
    shortLabel: "Turismo",
    gdpShare: 12.8,
    employmentShare: 12.5,
    description:
      "Tercera potencia turística mundial. Concentra hostelería, transporte, alquiler vacacional. Aena es proxy bursátil. Sector pro-cíclico estacional.",
    topCompanies: ["aena"],
    relatedSubtabs: ["empresas-beneficios", "hogares-empleo-vivienda", "dependencias-externas"],
    macroDrivers: ["Renta UE/UK", "Tipo cambio EUR", "Capacidad aérea", "Precios alquiler/vivienda"],
    recurringRisks: ["Saturación destinos", "Restricciones alquiler turístico", "Climática", "Geopolítica destino emisor"],
  },
  {
    id: "inmobiliario",
    label: "Inmobiliario y construcción",
    shortLabel: "Inmobiliario",
    gdpShare: 6.0,
    employmentShare: 6.0,
    description:
      "Sector cíclico clave. Tres dimensiones: residencial (precio vivienda), terciario (oficinas/logístico), construcción/promoción. Sensible a tipos hipotecarios y demanda extranjera.",
    topCompanies: ["ferrovial"],
    relatedSubtabs: ["empresas-beneficios", "hogares-empleo-vivienda", "regimen-monetario"],
    macroDrivers: ["Tipos hipotecarios", "Empleo", "Inmigración + demanda extranjera", "Subvenciones", "Construcción vivienda nueva"],
    recurringRisks: ["Burbuja precio/renta", "Regulación alquiler", "Subida tipos", "Stock vivienda vacante"],
  },
  {
    id: "industria",
    label: "Industria manufacturera",
    shortLabel: "Industria",
    gdpShare: 12.5,
    employmentShare: 13.5,
    description:
      "Liderada por automoción (Volkswagen Navarra, SEAT, Ford Almussafes, Renault Valladolid), química, alimentación, metal-mecánico. Productividad clave.",
    topCompanies: [],
    relatedSubtabs: ["empresas-beneficios", "productividad-competitividad", "dependencias-externas"],
    macroDrivers: ["Demanda exterior (UE)", "Costes energía", "Costes laborales unitarios", "Tipo cambio EUR/USD"],
    recurringRisks: ["Pérdida competitividad", "Reconversión eléctrica auto", "Tarifas energía", "Cadenas suministro"],
  },
  {
    id: "agroindustria",
    label: "Agroindustria y alimentación",
    shortLabel: "Agro",
    gdpShare: 3.2,
    employmentShare: 4.5,
    description:
      "España es la huerta de Europa. Aceite oliva, vino, cárnico, frutas y hortalizas. Sector sensible a clima, PAC y precios mundiales commodities agrarias.",
    topCompanies: [],
    relatedSubtabs: ["empresas-beneficios", "dependencias-externas", "hogares-empleo-vivienda"],
    macroDrivers: ["Clima (sequía)", "PAC y fondos UE", "Precios commodities (trigo, aceite)", "Demanda mundial"],
    recurringRisks: ["Sequía", "Aranceles UE", "Concentración hídrica", "Coste fertilizantes/energía"],
  },
  {
    id: "defensa",
    label: "Defensa",
    shortLabel: "Defensa",
    gdpShare: 1.2,
    employmentShare: 0.4,
    description:
      "Sector pequeño en PIB pero estratégico. Indra, Navantia (público), Airbus España, EM&E. Beneficiado por Pacto Atlántico 2%PIB y rearme europeo post-Ucrania.",
    topCompanies: [],
    relatedSubtabs: ["empresas-beneficios", "margen-fiscal"],
    macroDrivers: ["Gasto público defensa", "Programas OTAN/EU", "Ciclo geopolítico", "Contratos PESCO"],
    recurringRisks: ["Reducción presupuestaria", "Cambios doctrina", "Competencia exportadora"],
  },
];

export function getSector(id: string): SpanishSector | undefined {
  return SECTOR_CATALOG.find((s) => s.id === id);
}

export function listSectors(): SpanishSector[] {
  return SECTOR_CATALOG;
}
