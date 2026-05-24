/**
 * Búsqueda global de indicadores macro · Sprint N10.
 *
 * Itera los 15 catálogos del SUBTAB_REGISTRY y devuelve matches scored
 * por relevancia para el query del usuario. Client-side porque son solo
 * ~130 indicadores estáticos (no merece endpoint server-side).
 *
 * Scoring (mayor = mejor):
 *  - Match exacto en id o sourceCode: +100
 *  - Match en shortLabel/label start: +50
 *  - Match en shortLabel/label middle: +25
 *  - Match en description: +10
 *  - Match en source name: +8
 *  - Match en family: +5
 *  - Match en subtab label: +3
 */
import { SUBTAB_REGISTRY, type SubtabConfig } from "./subtab-registry";
import type { PulsoIndicatorMeta } from "./pulso-indicators";

export interface SearchHit {
  indicator: PulsoIndicatorMeta;
  subtabSlug: string;
  subtabLabel: string;
  subtabAccent: string;
  score: number;
  matchKind: "id" | "label" | "source" | "description" | "family" | "subtab";
}

function normalize(s: string): string {
  return (s || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .trim();
}

function scoreIndicator(
  ind: PulsoIndicatorMeta,
  sub: SubtabConfig,
  qNorm: string
): SearchHit | null {
  if (!qNorm) return null;
  const idN = normalize(ind.id);
  const sourceCodeN = normalize(ind.sourceCode);
  const shortLabelN = normalize(ind.shortLabel || "");
  const labelN = normalize(ind.label);
  const descN = normalize(ind.description || "");
  const sourceN = normalize(ind.source || "");
  const familyN = normalize(ind.family);
  const subtabLabelN = normalize(sub.label);

  let score = 0;
  let matchKind: SearchHit["matchKind"] = "subtab";

  if (idN === qNorm || sourceCodeN === qNorm) {
    score += 200;
    matchKind = "id";
  } else if (idN.includes(qNorm) || sourceCodeN.includes(qNorm)) {
    score += 100;
    matchKind = "id";
  }

  if (shortLabelN === qNorm || labelN === qNorm) {
    score += 80;
    matchKind = "label";
  } else if (shortLabelN.startsWith(qNorm) || labelN.startsWith(qNorm)) {
    score += 50;
    matchKind = "label";
  } else if (shortLabelN.includes(qNorm) || labelN.includes(qNorm)) {
    score += 25;
    matchKind = "label";
  }

  if (descN.includes(qNorm)) {
    score += 10;
    if (score === 10) matchKind = "description";
  }

  if (sourceN.includes(qNorm)) {
    score += 8;
    if (score === 8) matchKind = "source";
  }

  if (familyN === qNorm) {
    score += 7;
    if (score === 7) matchKind = "family";
  } else if (familyN.includes(qNorm)) {
    score += 5;
    if (score === 5) matchKind = "family";
  }

  if (subtabLabelN.includes(qNorm)) {
    score += 3;
    if (score === 3) matchKind = "subtab";
  }

  if (score === 0) return null;

  return {
    indicator: ind,
    subtabSlug: sub.slug,
    subtabLabel: sub.label,
    subtabAccent: sub.accent,
    score,
    matchKind,
  };
}

/**
 * Devuelve matches ordenados por score descendente, limit por defecto 12.
 * Soporta múltiples palabras (todas tienen que coincidir; AND).
 */
export function searchMacroIndicators(query: string, limit = 12): SearchHit[] {
  const q = normalize(query);
  if (!q) return [];
  const words = q.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const allHits: SearchHit[] = [];
  for (const slug of Object.keys(SUBTAB_REGISTRY)) {
    const sub = SUBTAB_REGISTRY[slug];
    for (const ind of sub.indicators) {
      // AND: cada palabra debe scoring > 0
      const wordHits = words.map((w) => scoreIndicator(ind, sub, w));
      if (wordHits.some((h) => h == null)) continue;
      const totalScore = wordHits.reduce((acc, h) => acc + (h?.score || 0), 0);
      const primary = wordHits.sort((a, b) => (b?.score || 0) - (a?.score || 0))[0]!;
      allHits.push({
        ...primary,
        score: totalScore,
      });
    }
  }

  return allHits
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function buildIndicatorHref(hit: SearchHit): string {
  return `/macro/${hit.subtabSlug}/indicator/${hit.indicator.id}`;
}
