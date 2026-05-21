"""ESS · European Social Survey · https://europeansocialsurvey.org

Encuesta bianual en 30+ países europeos sobre valores, actitudes políticas,
comportamiento electoral. Datos de altísima calidad metodológica desde 2002.

API · https://stessrelpubprodwe.blob.core.windows.net/api (CKAN-style)
Datos via SIKT · https://ess.sikt.no/en/

Use cases:
  - Comparar confianza institucional España vs UE
  - Tracking actitudes hacia inmigración, UE, partidos
  - Construir variables de comportamiento electoral
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

logger = logging.getLogger(__name__)

ESS_API = "https://stessrelpubprodwe.blob.core.windows.net/api"
DEFAULT_TIMEOUT_S = 20

_cache: dict[str, tuple[datetime, Any]] = {}
_CACHE_TTL = timedelta(days=7)


# Rondas conocidas · cada 2 años desde 2002
ROUNDS = {
    1: "ESS1-2002",  2: "ESS2-2004",  3: "ESS3-2006",  4: "ESS4-2008",
    5: "ESS5-2010", 6: "ESS6-2012",  7: "ESS7-2014",  8: "ESS8-2016",
    9: "ESS9-2018", 10: "ESS10-2020", 11: "ESS11-2023",
}

# Variables clave (parte del cuestionario común)
KEY_VARIABLES = {
    "trustprl": "Confianza en el Parlamento (0-10)",
    "trustlgl": "Confianza en el sistema legal (0-10)",
    "trustplc": "Confianza en la policía (0-10)",
    "trstplt": "Confianza en los políticos (0-10)",
    "trstprt": "Confianza en los partidos políticos (0-10)",
    "trstep": "Confianza en el Parlamento Europeo (0-10)",
    "trstun": "Confianza en la ONU (0-10)",
    "stflife": "Satisfacción con la vida (0-10)",
    "stfdem": "Satisfacción con la democracia (0-10)",
    "stfeco": "Satisfacción con economía (0-10)",
    "stfgov": "Satisfacción con el gobierno (0-10)",
    "lrscale": "Auto-ubicación izquierda-derecha (0=izq, 10=der)",
    "vote": "Votó en última elección nacional",
}


def is_available() -> bool:
    return True


def list_rounds() -> list[dict[str, Any]]:
    """Rondas disponibles · 2002 → presente."""
    return [{"round": r, "code": c, "year": int(c.split("-")[-1])} for r, c in ROUNDS.items()]


def list_variables() -> list[dict[str, str]]:
    """Variables clave del cuestionario común."""
    return [{"code": k, "description": v} for k, v in KEY_VARIABLES.items()]


def metadata_round(round_n: int = 11) -> dict[str, Any] | None:
    """Metadata de una ronda · documentación + países participantes.

    NB: El ESS API tiene varios endpoints heredados. Esta función devuelve
    placeholder con countries comunes hasta que confirmes URL exacta.
    """
    if round_n not in ROUNDS:
        return None
    # 30+ países participantes históricos (estable)
    countries = [
        "AT", "BE", "BG", "CH", "CY", "CZ", "DE", "DK", "EE", "ES",
        "FI", "FR", "GB", "GR", "HR", "HU", "IE", "IL", "IS", "IT",
        "LT", "LV", "ME", "NL", "NO", "PL", "PT", "RS", "RU", "SE",
        "SI", "SK", "TR", "UA",
    ]
    return {
        "round": round_n,
        "code": ROUNDS[round_n],
        "countries": countries,
        "documentation_url": f"https://ess.sikt.no/en/study/{ROUNDS[round_n]}",
    }


__all__ = ["is_available", "list_rounds", "list_variables", "metadata_round",
           "ROUNDS", "KEY_VARIABLES"]
