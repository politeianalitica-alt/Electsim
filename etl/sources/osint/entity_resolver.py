"""
Entity Resolver — Bloque 4.

Resuelve duplicados entre RiskEntity usando scoring multi-criterio.
No fusiona automáticamente si el score < 0.90 — requiere revisión humana.

Evita duplicados de:
  Pedro Sánchez / Pedro Sanchez / P. Sánchez / Pedro Sánchez Pérez-Castejón
  Iberdrola / Iberdrola S.A. / IBERDROLA SA / Iberdrola España
"""
from __future__ import annotations

import logging
import re
import unicodedata
from typing import Any

from .schemas import EntityMatchCandidate, RiskEntity

logger = logging.getLogger(__name__)

# Umbral mínimo para AUTO_MATCH (sin intervención humana)
_AUTO_MATCH_THRESHOLD = 0.90
# Umbral para CANDIDATE_MATCH
_CANDIDATE_THRESHOLD = 0.60
# Umbral para NEEDS_REVIEW
_NEEDS_REVIEW_THRESHOLD = 0.40

# Sufijos legales a eliminar en la normalización
_LEGAL_SUFFIXES = re.compile(
    r"\b(s\.?a\.?|s\.?l\.?|s\.?l\.?u\.?|s\.?a\.?u\.?|s\.?c\.?|s\.?c\.?l\.?"
    r"|ltd\.?|llc\.?|inc\.?|corp\.?|gmbh|a\.?g\.?|b\.?v\.?|n\.?v\.?"
    r"|plc\.?|llp\.?|lp\.?|s\.?p\.?a\.?|sarl|srl|ood|eood|ik|as|oy|ab)\b",
    re.IGNORECASE,
)

# Palabras vacías para comparación de nombres
_STOPWORDS = {
    "de", "del", "la", "el", "los", "las", "y", "e", "o",
    "the", "of", "and", "or", "in", "for",
    "señor", "señora", "don", "doña", "mr", "mrs", "dr", "prof",
}


def normalize_name(name: str) -> str:
    """
    Normaliza un nombre para comparación:
    - Quita acentos
    - Minúsculas
    - Elimina sufijos legales
    - Elimina puntuación y palabras vacías
    - Colapsa espacios
    """
    # Quitar acentos
    nfkd = unicodedata.normalize("NFKD", name)
    ascii_str = "".join(c for c in nfkd if not unicodedata.combining(c))
    # Minúsculas
    s = ascii_str.lower()
    # Sufijos legales
    s = _LEGAL_SUFFIXES.sub("", s)
    # Puntuación
    s = re.sub(r"[^\w\s]", " ", s)
    # Eliminar números solos (no siglas)
    s = re.sub(r"\b\d+\b", "", s)
    # Palabras vacías
    tokens = [t for t in s.split() if t and t not in _STOPWORDS and len(t) > 1]
    return " ".join(tokens).strip()


def _token_jaccard(a: str, b: str) -> float:
    """Similitud Jaccard entre conjuntos de tokens."""
    ta = set(normalize_name(a).split())
    tb = set(normalize_name(b).split())
    if not ta and not tb:
        return 1.0
    if not ta or not tb:
        return 0.0
    return len(ta & tb) / len(ta | tb)


def _levenshtein_ratio(a: str, b: str) -> float:
    """Ratio de similitud Levenshtein normalizado [0, 1]."""
    if a == b:
        return 1.0
    la, lb = len(a), len(b)
    if la == 0 or lb == 0:
        return 0.0
    # DP simplificado para strings cortos
    if max(la, lb) > 200:
        # Para strings muy largos usar solo Jaccard
        return 0.0
    prev = list(range(lb + 1))
    for i, ca in enumerate(a, 1):
        curr = [i]
        for j, cb in enumerate(b, 1):
            curr.append(min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + (0 if ca == cb else 1)))
        prev = curr
    dist = prev[lb]
    return 1.0 - dist / max(la, lb)


def score_match(a: RiskEntity, b: RiskEntity) -> dict[str, float]:
    """
    Calcula el score de similitud entre dos entidades.

    Devuelve un dict con el breakdown por criterio y la puntuación total.

    Scoring:
      +0.40  nombre exacto normalizado
      +0.25  alias coincide con nombre o alias
      +0.20  identificador coincide
      +0.10  país coincide
      +0.10  tipo coincide
      -0.30  tipo incompatible (persona vs empresa)
      -0.20  país incompatible (ningún país en común)
    """
    breakdown: dict[str, float] = {}

    norm_a = normalize_name(a.name)
    norm_b = normalize_name(b.name)

    # ── Nombre principal ──────────────────────────────────────────────────────
    if norm_a == norm_b:
        breakdown["nombre_exacto"] = 0.40
    else:
        # Similitud parcial
        jac = _token_jaccard(a.name, b.name)
        lev = _levenshtein_ratio(norm_a, norm_b)
        name_sim = max(jac, lev) * 0.35  # max 0.35 si no es exacto
        breakdown["nombre_similaridad"] = round(name_sim, 4)

    # ── Alias ─────────────────────────────────────────────────────────────────
    all_a = {normalize_name(n) for n in ([a.name] + a.aliases) if n}
    all_b = {normalize_name(n) for n in ([b.name] + b.aliases) if n}
    if all_a & all_b:
        breakdown["alias_match"] = 0.25
    else:
        # Jaccard entre conjuntos de alias
        jac_alias = len(all_a & all_b) / len(all_a | all_b) if (all_a | all_b) else 0.0
        if jac_alias > 0.3:
            breakdown["alias_parcial"] = round(jac_alias * 0.15, 4)

    # ── Identificadores ───────────────────────────────────────────────────────
    ids_a = {(d.get("scheme", ""), d.get("id", "")) for d in a.identifiers if d.get("id")}
    ids_b = {(d.get("scheme", ""), d.get("id", "")) for d in b.identifiers if d.get("id")}
    if ids_a and ids_b and (ids_a & ids_b):
        breakdown["identificador_match"] = 0.20

    # ── Países ────────────────────────────────────────────────────────────────
    set_a = set(a.countries)
    set_b = set(b.countries)
    if set_a and set_b:
        if set_a & set_b:
            breakdown["pais_match"] = 0.10
        else:
            breakdown["pais_incompatible"] = -0.20
    # Si alguna no tiene países, no sumamos ni restamos

    # ── Tipo de entidad ────────────────────────────────────────────────────────
    _PERSON_TYPES = {"person"}
    _LEGAL_TYPES = {"company", "organization", "public_body", "political_party", "asset"}

    if a.entity_type == b.entity_type:
        breakdown["tipo_exacto"] = 0.10
    elif (a.entity_type in _PERSON_TYPES) != (b.entity_type in _PERSON_TYPES):
        # Uno es persona y el otro es entidad legal → incompatibles
        breakdown["tipo_incompatible"] = -0.30
    elif (a.entity_type in _LEGAL_TYPES) == (b.entity_type in _LEGAL_TYPES):
        # Mismo grupo pero tipo diferente (ej: company vs organization)
        breakdown["tipo_grupo_match"] = 0.05

    # ── Total ─────────────────────────────────────────────────────────────────
    total = sum(breakdown.values())
    breakdown["total"] = round(max(0.0, min(1.0, total)), 4)

    return breakdown


def _match_status(score: float, has_type_conflict: bool) -> str:
    if has_type_conflict or score < _NEEDS_REVIEW_THRESHOLD:
        return "NO_MATCH"
    if score >= _AUTO_MATCH_THRESHOLD:
        return "AUTO_MATCH"
    if score >= _CANDIDATE_THRESHOLD:
        return "CANDIDATE_MATCH"
    return "NEEDS_REVIEW"


def candidate_matches(
    entity: RiskEntity,
    pool: list[RiskEntity],
    min_score: float = 0.40,
) -> list[EntityMatchCandidate]:
    """
    Busca candidatos de match en un pool de entidades.

    Args:
        entity: Entidad a resolver.
        pool: Pool de entidades candidatas (no incluye a sí misma).
        min_score: Score mínimo para reportar.

    Returns:
        Lista de EntityMatchCandidate ordenada por score descendente.
    """
    candidates: list[EntityMatchCandidate] = []

    for other in pool:
        if other.id == entity.id:
            continue
        if other.source_id == entity.source_id and other.source == entity.source:
            continue  # Misma fuente, mismo id → es el mismo objeto

        bd = score_match(entity, other)
        total = bd.get("total", 0.0)
        if total < min_score:
            continue

        has_conflict = "tipo_incompatible" in bd
        status = _match_status(total, has_conflict)

        candidates.append(EntityMatchCandidate(
            entity_a_id=entity.id,
            entity_b_id=other.id,
            score=total,
            match_status=status,  # type: ignore[arg-type]
            score_breakdown=bd,
            requires_human_review=status != "AUTO_MATCH",
        ))

    candidates.sort(key=lambda c: c.score, reverse=True)
    return candidates


def resolve_entity(
    entity: RiskEntity,
    pool: list[RiskEntity],
) -> EntityMatchCandidate | None:
    """
    Intenta resolver una entidad contra un pool.

    Returns:
        El mejor match o None si no hay candidatos suficientemente buenos.
    """
    matches = candidate_matches(entity, pool, min_score=_CANDIDATE_THRESHOLD)
    if not matches:
        return None
    best = matches[0]
    logger.debug(
        "resolve_entity %s → %s (score=%.3f, status=%s)",
        entity.name, best.entity_b_id, best.score, best.match_status,
    )
    return best


def resolve_batch(
    entities: list[RiskEntity],
    existing: list[RiskEntity] | None = None,
    auto_merge_threshold: float = _AUTO_MATCH_THRESHOLD,
) -> tuple[list[RiskEntity], list[EntityMatchCandidate]]:
    """
    Resuelve un batch de entidades nuevas contra un pool de existentes.

    Args:
        entities: Nuevas entidades a resolver.
        existing: Pool de entidades ya persistidas.
        auto_merge_threshold: Solo hace merge automático si score >= threshold.

    Returns:
        (resolved_new, all_candidates)
        - resolved_new: Entidades nuevas (sin duplicados AUTO_MATCH)
        - all_candidates: Todos los candidatos para revisión manual
    """
    pool = list(existing or [])
    resolved_new: list[RiskEntity] = []
    all_candidates: list[EntityMatchCandidate] = []

    for entity in entities:
        match = resolve_entity(entity, pool)
        if match and match.match_status == "AUTO_MATCH":
            logger.info(
                "AUTO_MATCH: %s → %s (score=%.3f)",
                entity.name, match.entity_b_id, match.score,
            )
            all_candidates.append(match)
            # No añadir el duplicado al pool ni a resolved_new
        else:
            if match:
                all_candidates.append(match)
            resolved_new.append(entity)
            pool.append(entity)  # Añadir al pool para resolver subsiguientes

    logger.info(
        "resolve_batch: %d entradas → %d nuevas, %d candidatos (auto-merge threshold=%.2f)",
        len(entities), len(resolved_new), len(all_candidates), auto_merge_threshold,
    )
    return resolved_new, all_candidates
