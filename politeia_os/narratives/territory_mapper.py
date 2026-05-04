"""
Mapeo territorial de narrativas por CCAA y provincia.

Cruza el scope y la metadata geografica de los articulos del cluster
(campos ccaa, provincia, scope de spain_articles; country/region de raw_articles)
para determinar si la narrativa es nacional o territorial y donde esta activa.
"""
from __future__ import annotations

import logging
from collections import Counter

log = logging.getLogger(__name__)

# Scopes que se consideran "nacionales" (no dan informacion territorial especifica)
_NATIONAL_SCOPES = {"nacional"}

# Umbral: una narrativa es nacional si >= 60% de sus articulos son nacionales
_NATIONAL_THRESHOLD = 0.60

# CCAA canonicas de Espana (para validar campos libres)
_CCAAS_VALIDAS = {
    "andalucia", "aragon", "asturias", "baleares", "canarias", "cantabria",
    "castilla-la mancha", "castilla y leon", "cataluna", "extremadura",
    "galicia", "la rioja", "madrid", "murcia", "navarra", "pais vasco",
    "valencia", "ceuta", "melilla",
    # variantes con acento
    "andalucía", "aragón", "cataluña", "país vasco", "comunidad valenciana",
}


def _normalize_ccaa(raw: str) -> str:
    """Normaliza el nombre de CCAA a forma canonica (lowercase, sin acento)."""
    mapping = {
        "cataluña": "cataluna",
        "país vasco": "pais vasco",
        "aragón": "aragon",
        "andalucía": "andalucia",
        "comunidad valenciana": "valencia",
        "región de murcia": "murcia",
        "comunidad foral de navarra": "navarra",
        "principado de asturias": "asturias",
        "islas baleares": "baleares",
        "illes balears": "baleares",
        "islas canarias": "canarias",
        "castilla-la mancha": "castilla-la mancha",
        "castilla y léon": "castilla y leon",
        "la rioja": "la rioja",
    }
    cleaned = raw.lower().strip()
    return mapping.get(cleaned, cleaned)


def map_territory(articles: list[dict]) -> dict:
    """
    Determina la distribucion territorial de una narrativa.

    Args:
        articles: Articulos del cluster con campos:
                  - ccaa (de spain_articles, puede ser None)
                  - provincia (de spain_articles, puede ser None)
                  - scope (local | comarcal | provincial | regional | nacional)
                  - country (de raw_articles)

    Returns:
        Dict con claves:
          - es_nacional: bool
          - activa_en_ccaas: list[str]     (unicas, ordenadas por frecuencia)
          - activa_en_provincias: list[str] (unicas, ordenadas por frecuencia)
    """
    ccaa_counter:      Counter[str] = Counter()
    provincia_counter: Counter[str] = Counter()
    national_count = 0
    total = len(articles)

    for art in articles:
        scope   = (art.get("scope") or "").lower().strip()
        country = (art.get("country") or "").lower().strip()
        ccaa    = (art.get("ccaa") or "").strip()
        prov    = (art.get("provincia") or "").strip()

        # Articulo internacional (no español)
        if country and country not in ("spain", "españa", "es", ""):
            national_count += 1
            continue

        # Articulo de scope nacional
        if scope in _NATIONAL_SCOPES:
            national_count += 1
        else:
            if ccaa:
                ccaa_normalized = _normalize_ccaa(ccaa)
                if ccaa_normalized:
                    ccaa_counter[ccaa_normalized] += 1
            if prov:
                provincia_counter[prov.lower().strip()] += 1

    # Calcular si es nacional
    es_nacional = (national_count / max(total, 1)) >= _NATIONAL_THRESHOLD
    # Una narrativa tambien es nacional si cubre >= 5 CCAA distintas
    if len(ccaa_counter) >= 5:
        es_nacional = True

    # Listas ordenadas por frecuencia
    activa_en_ccaas = [ccaa for ccaa, _ in ccaa_counter.most_common()]
    activa_en_provincias = [prov for prov, _ in provincia_counter.most_common(20)]

    return {
        "es_nacional":        es_nacional,
        "activa_en_ccaas":    activa_en_ccaas,
        "activa_en_provincias": activa_en_provincias,
    }
