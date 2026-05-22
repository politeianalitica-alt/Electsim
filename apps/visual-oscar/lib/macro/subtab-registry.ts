/**
 * Registro central de subtabs con landing v3.
 *
 * Cada subtab apunta a su catálogo de indicadores + metadata visual.
 * Las páginas /macro/{subtab}/* consultan este registro para saber qué
 * catálogo cargar y cómo titular la página.
 *
 * 9 subtabs v3 registrados (mayo 2026):
 *   pulso-macro · regimen-monetario · margen-fiscal · riesgo-sistemico
 *   mercados-activos · flujos-capital · productividad-competitividad
 *   empresas-beneficios · hogares-empleo-vivienda
 *
 * Sólo `dependencias-externas` (tab 4) sigue con UI v1 únicamente
 * (botones AI por chart, sin landing dedicado).
 */
import {
  PULSO_INDICATORS,
  PULSO_FAMILY_META,
  type PulsoIndicatorMeta,
} from "./pulso-indicators";
import {
  REGIMEN_MONETARIO_INDICATORS,
  REGIMEN_MONETARIO_META,
} from "./regimen-monetario-catalog";
import {
  MARGEN_FISCAL_INDICATORS,
  MARGEN_FISCAL_META,
} from "./margen-fiscal-catalog";
import {
  RIESGO_SISTEMICO_INDICATORS,
  RIESGO_SISTEMICO_META,
} from "./riesgo-sistemico-catalog";
import {
  MERCADOS_ACTIVOS_INDICATORS,
  MERCADOS_ACTIVOS_META,
} from "./mercados-activos-catalog";
import {
  FLUJOS_CAPITAL_INDICATORS,
  FLUJOS_CAPITAL_META,
} from "./flujos-capital-catalog";
import {
  PRODUCTIVIDAD_COMPETITIVIDAD_INDICATORS,
  PRODUCTIVIDAD_COMPETITIVIDAD_META,
} from "./productividad-competitividad-catalog";
import {
  EMPRESAS_BENEFICIOS_INDICATORS,
  EMPRESAS_BENEFICIOS_META,
} from "./empresas-beneficios-catalog";
import {
  HOGARES_EMPLEO_VIVIENDA_INDICATORS,
  HOGARES_EMPLEO_VIVIENDA_META,
} from "./hogares-empleo-vivienda-catalog";
import {
  DEMOGRAFIA_TERRITORIO_INDICATORS,
  DEMOGRAFIA_TERRITORIO_META,
} from "./demografia-territorio-catalog";
import {
  SOCIEDAD_BIENESTAR_INDICATORS,
  SOCIEDAD_BIENESTAR_META,
} from "./sociedad-bienestar-catalog";
import {
  MEDIO_RURAL_INDICATORS,
  MEDIO_RURAL_META,
} from "./medio-rural-catalog";
import {
  CULTURA_OCIO_INDICATORS,
  CULTURA_OCIO_META,
} from "./cultura-ocio-catalog";
import {
  INSTITUCIONES_ESTADO_INDICATORS,
  INSTITUCIONES_ESTADO_META,
} from "./instituciones-estado-catalog";

export interface SubtabConfig {
  slug: string;
  label: string;
  shortLabel: string;
  accent: string;
  description: string;
  indicators: PulsoIndicatorMeta[];
}

export const SUBTAB_REGISTRY: Record<string, SubtabConfig> = {
  "pulso-macro": {
    slug: "pulso-macro",
    label: "Pulso macro",
    shortLabel: "Pulso",
    accent: "#0F766E",
    description:
      "Diagnóstico transversal del estado macroeconómico: PIB, demanda, empleo, precios, sector exterior y proyecciones IMF.",
    indicators: PULSO_INDICATORS,
  },
  "regimen-monetario": {
    ...REGIMEN_MONETARIO_META,
    indicators: REGIMEN_MONETARIO_INDICATORS,
  },
  "margen-fiscal": {
    ...MARGEN_FISCAL_META,
    indicators: MARGEN_FISCAL_INDICATORS,
  },
  "riesgo-sistemico": {
    ...RIESGO_SISTEMICO_META,
    indicators: RIESGO_SISTEMICO_INDICATORS,
  },
  "mercados-activos": {
    ...MERCADOS_ACTIVOS_META,
    indicators: MERCADOS_ACTIVOS_INDICATORS,
  },
  "flujos-capital": {
    ...FLUJOS_CAPITAL_META,
    indicators: FLUJOS_CAPITAL_INDICATORS,
  },
  "productividad-competitividad": {
    ...PRODUCTIVIDAD_COMPETITIVIDAD_META,
    indicators: PRODUCTIVIDAD_COMPETITIVIDAD_INDICATORS,
  },
  "empresas-beneficios": {
    ...EMPRESAS_BENEFICIOS_META,
    indicators: EMPRESAS_BENEFICIOS_INDICATORS,
  },
  "hogares-empleo-vivienda": {
    ...HOGARES_EMPLEO_VIVIENDA_META,
    indicators: HOGARES_EMPLEO_VIVIENDA_INDICATORS,
  },
  "demografia-territorio": {
    ...DEMOGRAFIA_TERRITORIO_META,
    indicators: DEMOGRAFIA_TERRITORIO_INDICATORS,
  },
  "sociedad-bienestar": {
    ...SOCIEDAD_BIENESTAR_META,
    indicators: SOCIEDAD_BIENESTAR_INDICATORS,
  },
  "medio-rural": {
    ...MEDIO_RURAL_META,
    indicators: MEDIO_RURAL_INDICATORS,
  },
  "cultura-ocio": {
    ...CULTURA_OCIO_META,
    indicators: CULTURA_OCIO_INDICATORS,
  },
  "instituciones-estado": {
    ...INSTITUCIONES_ESTADO_META,
    indicators: INSTITUCIONES_ESTADO_INDICATORS,
  },
};

export const FAMILY_META = PULSO_FAMILY_META;

export function getSubtab(slug: string): SubtabConfig | undefined {
  return SUBTAB_REGISTRY[slug];
}

export function findIndicatorGlobal(
  id: string
): { subtab: SubtabConfig; indicator: PulsoIndicatorMeta } | undefined {
  for (const slug of Object.keys(SUBTAB_REGISTRY)) {
    const sub = SUBTAB_REGISTRY[slug];
    const ind = sub.indicators.find((i) => i.id === id);
    if (ind) return { subtab: sub, indicator: ind };
  }
  return undefined;
}

export function getValidSubtabSlugs(): string[] {
  return Object.keys(SUBTAB_REGISTRY);
}
