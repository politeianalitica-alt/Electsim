"""Resolver determinístico · slugify y matching de entidades.

Sin LLM, sin alucinaciones. Reglas claras:

  resolve_entity(qid="Q186200")          → busca por QID exacto
  resolve_entity(kind="actor_person",
                 slug="pedro-sanchez")   → busca por (kind, slug) exacto
  resolve_entity(kind="party",
                 name="PSOE")            → slugify("PSOE") + busca por (kind, slug)

Si el caller pasa `name`, lo slugificamos y buscamos. Si no encuentra,
no crea — devuelve None. La creación es responsabilidad explícita del
caller (vía `EntityRepository.upsert`).
"""
from __future__ import annotations

import re
import unicodedata
from typing import Any


# ─────────────────────────────────────────────────────────────────
# Slugify
# ─────────────────────────────────────────────────────────────────

_SLUG_INVALID_RE = re.compile(r"[^a-z0-9\s-]+")
_SLUG_DASHES_RE = re.compile(r"[-\s]+")


def slugify(text: str, *, max_length: int = 120) -> str:
    """Convierte un string a slug canónico ASCII minúsculas con guiones.

    Reglas:
      - Normaliza unicode (NFD) y descarta diacríticos (ñ → n, á → a).
      - Pasa a minúsculas.
      - Sustituye todo no-alfanumérico por guión.
      - Colapsa guiones múltiples.
      - Recorta al `max_length` truncando por palabra cuando es posible.

    Ejemplos:
      slugify("Pedro Sánchez Pérez-Castejón") → "pedro-sanchez-perez-castejon"
      slugify("PSOE")                         → "psoe"
      slugify("Castilla-La Mancha")           → "castilla-la-mancha"
      slugify("Comunitat Valenciana")         → "comunitat-valenciana"
      slugify("María José Sáenz de Buruaga")  → "maria-jose-saenz-de-buruaga"
    """
    if not text:
        return ""
    # NFD para separar diacríticos y descartarlos
    nfd = unicodedata.normalize("NFD", str(text))
    no_diacritics = "".join(c for c in nfd if unicodedata.category(c) != "Mn")
    lowered = no_diacritics.lower().strip()
    cleaned = _SLUG_INVALID_RE.sub(" ", lowered)
    slug = _SLUG_DASHES_RE.sub("-", cleaned).strip("-")
    if len(slug) <= max_length:
        return slug
    # Recortar respetando palabras cuando sea posible
    cut = slug[:max_length]
    last_dash = cut.rfind("-")
    if last_dash > max_length * 0.5:
        return cut[:last_dash]
    return cut


# ─────────────────────────────────────────────────────────────────
# resolve_entity · facade simple sobre el repositorio
# ─────────────────────────────────────────────────────────────────

def resolve_entity(
    *,
    qid: str | None = None,
    kind: str | None = None,
    slug: str | None = None,
    name: str | None = None,
    repository: Any = None,  # type: EntityRepository | None
) -> Any | None:  # type: Entity | None
    """Resuelve una entidad desde QID, (kind, slug) o (kind, name).

    Args:
        qid: QID de Wikidata (Q12345). Prioridad máxima.
        kind: kind de la entidad. Obligatorio si no hay qid.
        slug: slug canónico. Si se pasa, no se aplica slugify.
        name: nombre humano. Se slugifica internamente.
        repository: EntityRepository (lazy si no se pasa).

    Returns:
        Entity si se encuentra, None si no.
    """
    if repository is None:
        from agents.entities.repository import get_entity_repository
        repository = get_entity_repository()

    if qid:
        ent = repository.get_by_qid(qid)
        if ent:
            return ent

    if not kind:
        return None

    if not slug and name:
        slug = slugify(name)

    if not slug:
        return None

    return repository.get_by_kind_slug(kind, slug)


def normalize_aliases(aliases: list[str] | None) -> list[str]:
    """Normaliza una lista de aliases (trim, dedup, sin vacíos)."""
    if not aliases:
        return []
    seen: set[str] = set()
    out: list[str] = []
    for a in aliases:
        s = str(a or "").strip()
        if not s:
            continue
        key = s.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(s)
    return out
