/**
 * Registro central de subtabs con landing v3.
 *
 * Cada subtab apunta a su catálogo de indicadores + metadata visual.
 * Las páginas dinámicas `/macro/[subtab]/...` consultan este registro
 * para saber qué catálogo cargar y cómo titular la página.
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
