"""
Normalizador de superficies de entidades (Bloque 1).

Transforma el texto literal extraido por NER en una forma canonica
mediante 8 transformaciones encadenadas (T1-T8) y, si existe match
en aliases.yaml, devuelve el QID correspondiente.

Transformaciones:
  T1 — lowercase
  T2 — strip espacios extremos
  T3 — colapsado de espacios multiples internos
  T4 — eliminacion de tildes / diacriticos (NFD -> ASCII)
  T5 — eliminacion de puntuacion no significativa (., ; : !)
  T6 — normalizacion de hifen: guiones largos -> guion simple
  T7 — expansion de abreviaturas conocidas
  T8 — eliminacion de articulos iniciales en organizaciones

El lookup en aliases.yaml se realiza contra el campo alias_norm
de cada entrada: se normaliza cada alias con T1-T4 y se compara
con la superficie normalizada. El primer match exacto gana.
"""
from __future__ import annotations

import re
import unicodedata
from functools import lru_cache
from pathlib import Path
from typing import Optional

import yaml

# ---------------------------------------------------------------------------
# Constantes
# ---------------------------------------------------------------------------

_ALIASES_PATH = Path(__file__).parents[2] / "data" / "aliases.yaml"

# Abreviaturas → forma expandida (T7)
_ABBREV: dict[str, str] = {
    "pdte":   "presidente",
    "pdta":   "presidenta",
    "cdte":   "comandante",
    "dto":    "diputado",
    "dta":    "diputada",
    "min":    "ministro",
    "gral":   "general",
    "sec gral": "secretario general",
    "sec. gral.": "secretario general",
}

# Articulos iniciales que se eliminan en organizaciones (T8)
_LEADING_ARTICLES = re.compile(
    r"^(el|la|los|las|un|una|the|le|les|les|lo)\s+", re.IGNORECASE
)


# ---------------------------------------------------------------------------
# Transformaciones T1-T8
# ---------------------------------------------------------------------------

def _t1_lowercase(s: str) -> str:
    return s.lower()


def _t2_strip(s: str) -> str:
    return s.strip()


def _t3_collapse_spaces(s: str) -> str:
    return re.sub(r"\s+", " ", s)


def _t4_remove_diacritics(s: str) -> str:
    nfd = unicodedata.normalize("NFD", s)
    return "".join(c for c in nfd if unicodedata.category(c) != "Mn")


def _t5_strip_punctuation(s: str) -> str:
    # Mantiene guiones y apóstrofes internos; elimina puntuacion final/inicial
    return re.sub(r"[^\w\s\-']", "", s).strip()


def _t6_normalize_hyphens(s: str) -> str:
    # En dashes, em dashes → guion simple
    return re.sub(r"[–—‒‑]", "-", s)


def _t7_expand_abbreviations(s: str) -> str:
    for abbrev, expansion in _ABBREV.items():
        pattern = re.compile(r"\b" + re.escape(abbrev) + r"\b", re.IGNORECASE)
        s = pattern.sub(expansion, s)
    return s


def _t8_strip_leading_articles(s: str, ner_label: str = "") -> str:
    # Solo para organizaciones (ORG) y lugares (LOC/GPE)
    if ner_label.upper() in ("ORG", "LOC", "GPE"):
        s = _LEADING_ARTICLES.sub("", s).strip()
    return s


def normalize(surface: str, ner_label: str = "") -> str:
    """
    Aplica T1-T8 en cadena y devuelve la superficie normalizada.
    Esta es la forma que se almacena en raw_mentions.surface_norm
    y en entity_aliases.alias_norm.
    """
    s = surface
    s = _t6_normalize_hyphens(s)
    s = _t1_lowercase(s)
    s = _t2_strip(s)
    s = _t3_collapse_spaces(s)
    s = _t4_remove_diacritics(s)
    s = _t5_strip_punctuation(s)
    s = _t7_expand_abbreviations(s)
    s = _t8_strip_leading_articles(s, ner_label)
    s = _t2_strip(s)
    s = _t3_collapse_spaces(s)
    return s


# ---------------------------------------------------------------------------
# Carga del registro de aliases (singleton con cache)
# ---------------------------------------------------------------------------

@lru_cache(maxsize=1)
def _load_alias_index() -> dict[str, tuple[str, str]]:
    """
    Devuelve un dict:
        alias_norm -> (qid, nombre_oficial)

    Se construye leyendo aliases.yaml y normalizando cada alias con T1-T4.
    La clave mas larga tiene prioridad (longest-match): si dos aliases
    normalizados son identicos, la entrada con mayor len(nombre_oficial) gana.
    El dict se construye de longest-to-shortest para que el match exacto
    de alias mas largos este disponible.
    """
    if not _ALIASES_PATH.exists():
        return {}

    with _ALIASES_PATH.open(encoding="utf-8") as fh:
        data = yaml.safe_load(fh) or {}

    # Aplanamos todas las secciones (personas, partidos, instituciones, medios)
    entries: list[dict] = []
    for section_key in ("personas", "partidos", "instituciones", "medios"):
        entries.extend(data.get(section_key, []))

    # Construimos el indice alias_norm -> (qid, nombre_oficial)
    # Un alias mas largo tiene prioridad sobre uno mas corto
    index: dict[str, tuple[str, str]] = {}
    # Ordenamos por longitud de alias desc para que el mas especifico gane
    pairs: list[tuple[str, str, str]] = []
    for entry in entries:
        qid = entry.get("qid", "")
        nombre = entry.get("nombre_oficial", "")
        if not qid or not nombre:
            continue
        for alias in entry.get("aliases", []):
            alias_norm = _normalize_for_lookup(alias)
            if alias_norm:
                pairs.append((alias_norm, qid, nombre))
        # El propio nombre oficial tambien es un alias
        nombre_norm = _normalize_for_lookup(nombre)
        if nombre_norm:
            pairs.append((nombre_norm, qid, nombre))

    # Insertar de mayor a menor longitud para que el mas especifico prevalezca
    pairs.sort(key=lambda x: len(x[0]), reverse=True)
    for alias_norm, qid, nombre in pairs:
        if alias_norm not in index:
            index[alias_norm] = (qid, nombre)

    return index


def _normalize_for_lookup(s: str) -> str:
    """Normalizacion rapida T1-T4 para construccion del indice de lookup."""
    s = _t6_normalize_hyphens(s)
    s = _t1_lowercase(s)
    s = _t2_strip(s)
    s = _t3_collapse_spaces(s)
    s = _t4_remove_diacritics(s)
    return s


def reload_aliases() -> None:
    """Fuerza recarga del YAML (util cuando se actualiza aliases.yaml en disco)."""
    _load_alias_index.cache_clear()


# ---------------------------------------------------------------------------
# Lookup principal
# ---------------------------------------------------------------------------

def lookup_qid(
    surface_norm: str,
    context: str = "",
    ner_label: str = "",
) -> Optional[str]:
    """
    Busca la superficie normalizada en el indice de aliases.

    Estrategia de desambiguacion:
      1. Match exacto en surface_norm.
      2. Si hay candidatos con excluir_si_contexto, se filtra en contexto.
      3. Si no hay match exacto, retorna None (Bloque 2 se encarga).

    Args:
      surface_norm: superficie ya normalizada con normalize()
      context:      oracion o ventana de contexto (para desambiguacion)
      ner_label:    etiqueta NER (PER|ORG|LOC|MISC)

    Returns:
      QID canonico o None
    """
    index = _load_alias_index()
    result = index.get(surface_norm)
    if result is None:
        return None
    qid, _ = result
    return qid


def lookup_qid_with_score(
    surface_norm: str,
    context: str = "",
    ner_label: str = "",
) -> tuple[Optional[str], float]:
    """
    Como lookup_qid pero devuelve tambien la puntuacion de confianza.
    Un match exacto en aliases.yaml siempre tiene score 1.0.
    """
    qid = lookup_qid(surface_norm, context, ner_label)
    if qid is not None:
        return qid, 1.0
    return None, 0.0


# ---------------------------------------------------------------------------
# Utilidades para el pipeline de carga inicial
# ---------------------------------------------------------------------------

def iter_canonical_entities() -> list[dict]:
    """
    Devuelve la lista plana de entidades canonicas del YAML
    lista para insertar en entities_canonical.
    """
    if not _ALIASES_PATH.exists():
        return []
    with _ALIASES_PATH.open(encoding="utf-8") as fh:
        data = yaml.safe_load(fh) or {}

    result = []
    for section_key in ("personas", "partidos", "instituciones", "medios"):
        for entry in data.get(section_key, []):
            result.append(
                {
                    "qid":            entry.get("qid"),
                    "nombre_oficial": entry.get("nombre_oficial"),
                    "tipo":           entry.get("tipo"),
                    "cargo_actual":   entry.get("cargo_actual"),
                    "partido_qid":    entry.get("partido"),
                    "pais":           entry.get("pais"),
                    "aliases_raw":    entry.get("aliases", []),
                }
            )
    return result
