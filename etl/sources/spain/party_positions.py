"""Loader y consulta de party_positions (Manifesto Project · Sprint 4 · S4.3).

> **Sprint 4 · S4.3** (`docs/ROADMAP_GITS_AMIGOS.md §4 Sprint 4`)

Politeia carga posiciones programáticas comparables de partidos políticos
siguiendo la metodología Manifesto Project (MARPOR) + CHES.

API publica:
  - load_spain_seed()        · carga 10 partidos ES principales con seed
  - get_party_position(slug) · consulta tabla party_positions
  - get_party_distance(p1, p2) · distancia euclídea ideológica entre dos partidos

Para descargar el dataset completo del Manifesto Project (1000+ partidos
históricos en 56 dimensiones), hace falta API key gratuita:
  https://manifesto-project.wzb.eu/account/registration

Sin API key, el seed de Politeia cubre los 10 principales partidos ES:
PSOE, PP, VOX, Sumar, Podemos, Junts, ERC, PNV, EH Bildu, BNG.
"""
from __future__ import annotations

import json
import logging
import math
from functools import lru_cache
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


# Path al dataset seed
_SEED_PATH = Path(__file__).parent.parent.parent.parent / "data" / "manifesto_project" / "spain_seed_2023.json"

# Ejes ideológicos · usados en cálculo de distancia
IDEOLOGICAL_AXES: tuple[str, ...] = (
    "rile",                  # left-right
    "planeco",               # planned economy
    "markeco",               # market economy
    "welfare",               # welfare state
    "eu_pos",                # pro EU
    "eu_neg",                # anti EU
    "environment",           # green
    "traditional_morality",  # values
    "law_order",             # security
)


# ────────────────────────────────────────────────────────────────────
# Engine helper
# ────────────────────────────────────────────────────────────────────

def _get_engine() -> Any | None:
    try:
        from db.session import get_engine
        return get_engine()
    except Exception:
        return None


# ────────────────────────────────────────────────────────────────────
# Loader · carga seed en BD
# ────────────────────────────────────────────────────────────────────

def load_spain_seed(json_path: str | None = None) -> dict[str, int]:
    """Carga el seed de 10 partidos ES en la tabla party_positions.

    Idempotente: UPSERT por (party_slug, country, election_year).

    Returns:
      {"loaded": int, "errors": int, "path": str}
    """
    path = Path(json_path) if json_path else _SEED_PATH
    if not path.exists():
        return {"loaded": 0, "errors": 0, "path": str(path), "error": "seed JSON no encontrado"}

    engine = _get_engine()
    if engine is None:
        return {"loaded": 0, "errors": 0, "path": str(path), "error": "no engine"}

    from sqlalchemy import text
    import json as _json

    with open(path, "r", encoding="utf-8") as f:
        rows = _json.load(f)

    if not isinstance(rows, list):
        return {"loaded": 0, "errors": 0, "path": str(path), "error": "seed no es lista JSON"}

    loaded = 0
    errors = 0
    try:
        with engine.begin() as conn:
            for r in rows:
                try:
                    payload_str = _json.dumps(r.get("payload") or {})
                    conn.execute(text("""
                        INSERT INTO party_positions (
                          party_slug, party_name, country, election_year,
                          rile, planeco, markeco, welfare, eu_pos, eu_neg,
                          environment, traditional_morality, law_order,
                          payload, source
                        ) VALUES (
                          :slug, :name, :country, :year,
                          :rile, :planeco, :markeco, :welfare, :eu_pos, :eu_neg,
                          :environment, :traditional_morality, :law_order,
                          :payload, :source
                        )
                        ON CONFLICT (party_slug, country, election_year) DO UPDATE SET
                          rile = EXCLUDED.rile,
                          planeco = EXCLUDED.planeco,
                          markeco = EXCLUDED.markeco,
                          welfare = EXCLUDED.welfare,
                          eu_pos = EXCLUDED.eu_pos,
                          eu_neg = EXCLUDED.eu_neg,
                          environment = EXCLUDED.environment,
                          traditional_morality = EXCLUDED.traditional_morality,
                          law_order = EXCLUDED.law_order,
                          payload = EXCLUDED.payload,
                          updated_at = NOW()
                    """), {
                        "slug": r["party_slug"].lower(),
                        "name": r["party_name"],
                        "country": r.get("country", "ESP"),
                        "year": r["election_year"],
                        "rile": r.get("rile"),
                        "planeco": r.get("planeco"),
                        "markeco": r.get("markeco"),
                        "welfare": r.get("welfare"),
                        "eu_pos": r.get("eu_pos"),
                        "eu_neg": r.get("eu_neg"),
                        "environment": r.get("environment"),
                        "traditional_morality": r.get("traditional_morality"),
                        "law_order": r.get("law_order"),
                        "payload": payload_str,
                        "source": r.get("source", "politeia_seed"),
                    })
                    loaded += 1
                except Exception as exc:
                    logger.debug("party_positions row error %s · %s", r.get("party_slug"), exc)
                    errors += 1
    except Exception as exc:
        return {"loaded": loaded, "errors": errors + 1, "path": str(path), "error": str(exc)}

    logger.info("party_positions cargado: %d filas (%d errores)", loaded, errors)
    return {"loaded": loaded, "errors": errors, "path": str(path)}


# ────────────────────────────────────────────────────────────────────
# Consultas
# ────────────────────────────────────────────────────────────────────

@lru_cache(maxsize=200)
def get_party_position(party_slug: str, country: str = "ESP", year: int | None = None) -> dict[str, Any] | None:
    """Devuelve la posición ideológica de un partido en un año.

    Si year=None, devuelve la más reciente.

    Returns:
      {"party_slug": "psoe", "rile": -16.5, "welfare": 17.8, ...}
      None si no existe.
    """
    engine = _get_engine()
    if engine is None or not party_slug:
        return None

    from sqlalchemy import text
    try:
        with engine.begin() as conn:
            if year is None:
                row = conn.execute(text("""
                    SELECT party_slug, party_name, country, election_year,
                           rile, planeco, markeco, welfare, eu_pos, eu_neg,
                           environment, traditional_morality, law_order
                    FROM party_positions
                    WHERE party_slug = :slug AND country = :country
                    ORDER BY election_year DESC
                    LIMIT 1
                """), {"slug": party_slug.lower(), "country": country}).first()
            else:
                row = conn.execute(text("""
                    SELECT party_slug, party_name, country, election_year,
                           rile, planeco, markeco, welfare, eu_pos, eu_neg,
                           environment, traditional_morality, law_order
                    FROM party_positions
                    WHERE party_slug = :slug AND country = :country AND election_year = :year
                """), {"slug": party_slug.lower(), "country": country, "year": year}).first()
            if row is None:
                return None
            keys = [
                "party_slug", "party_name", "country", "election_year",
                "rile", "planeco", "markeco", "welfare", "eu_pos", "eu_neg",
                "environment", "traditional_morality", "law_order",
            ]
            return dict(zip(keys, row))
    except Exception as exc:
        logger.debug("get_party_position · %s · %s", party_slug, exc)
        return None


def get_party_distance(
    party1_slug: str,
    party2_slug: str,
    *,
    country: str = "ESP",
    year: int | None = None,
) -> float | None:
    """Distancia euclídea ideológica entre dos partidos en los ejes principales.

    Returns:
      float >= 0 · 0 = posiciones idénticas, mayor = mas alejados.
      None si alguno de los partidos no existe.
    """
    p1 = get_party_position(party1_slug, country=country, year=year)
    p2 = get_party_position(party2_slug, country=country, year=year)
    if p1 is None or p2 is None:
        return None

    sq_sum = 0.0
    n_axes = 0
    for axis in IDEOLOGICAL_AXES:
        v1 = p1.get(axis)
        v2 = p2.get(axis)
        if v1 is None or v2 is None:
            continue
        sq_sum += (float(v1) - float(v2)) ** 2
        n_axes += 1

    if n_axes == 0:
        return None
    return round(math.sqrt(sq_sum / n_axes), 3)  # normalizado por nº de ejes


__all__ = [
    "load_spain_seed",
    "get_party_position",
    "get_party_distance",
    "IDEOLOGICAL_AXES",
]
