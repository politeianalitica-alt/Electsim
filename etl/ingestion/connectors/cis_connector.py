"""Conector CIS (Centro de Investigaciones Sociológicas) en modo demo."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import List


def fetch_latest_barometer() -> dict:
    """Devuelve el último barómetro CIS demo."""

    return {
        "wave": "2026-04",
        "fieldwork_start": "2026-04-10",
        "fieldwork_end": "2026-04-17",
        "sample_size": 4012,
        "vote_intention": {
            "PSOE": 30.4,
            "PP": 32.1,
            "VOX": 11.8,
            "SUMAR": 6.2,
            "PODEMOS": 3.4,
            "ERC": 1.9,
            "JUNTS": 1.5,
            "PNV": 1.1,
            "EH BILDU": 1.7,
            "Otros": 9.9,
        },
        "leader_evaluations": {
            "Pedro Sánchez": 3.6,
            "Alberto Núñez Feijóo": 3.9,
            "Santiago Abascal": 2.9,
            "Yolanda Díaz": 3.5,
        },
        "top_concerns": [
            {"issue": "Vivienda", "pct": 28.3},
            {"issue": "Paro", "pct": 24.1},
            {"issue": "Sanidad", "pct": 18.6},
            {"issue": "Inmigración", "pct": 13.5},
            {"issue": "Crisis política", "pct": 11.2},
        ],
        "evaluation_government": {
            "muy_buena": 6.4,
            "buena": 22.1,
            "regular": 31.8,
            "mala": 18.7,
            "muy_mala": 19.2,
            "ns_nc": 1.8,
        },
        "updated_at": datetime.utcnow().isoformat(),
        "source": "CIS",
    }


def fetch_historical_intention(party: str, months: int = 12) -> List[dict]:
    """Serie histórica demo de intención de voto de un partido."""

    base = {
        "PSOE": 30.0,
        "PP": 32.0,
        "VOX": 12.0,
        "SUMAR": 6.0,
    }.get(party.upper(), 5.0)
    today = datetime.utcnow().date()
    out = []
    for m in range(months, 0, -1):
        d = today - timedelta(days=30 * m)
        delta = ((m * 7) % 21) / 10.0 - 1.0
        out.append(
            {
                "party": party.upper(),
                "period": d.strftime("%Y-%m"),
                "vote_intention_pct": round(base + delta, 2),
            }
        )
    return out


def fetch_top_concerns_evolution() -> List[dict]:
    """Evolución demo de las principales preocupaciones."""

    today = datetime.utcnow().date()
    out = []
    issues = ["Vivienda", "Paro", "Sanidad", "Inmigración"]
    for m in range(6, 0, -1):
        d = today - timedelta(days=30 * m)
        out.append(
            {
                "period": d.strftime("%Y-%m"),
                "issues": {iss: round(15 + (m + i) % 12, 1) for i, iss in enumerate(issues)},
            }
        )
    return out


__all__ = [
    "fetch_latest_barometer",
    "fetch_historical_intention",
    "fetch_top_concerns_evolution",
]
