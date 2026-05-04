"""
Voter Segments — Bloque 6.

Define, carga y persiste segmentos de votante.
Utilizado para análisis de voto blando y estrategia de campaña.

Segmentos base para España basados en datos CIS:
  - ideológicos: izquierda_dura … derecha_dura
  - etarios: jovenes, adultos, mayores
  - hábitat: gran_ciudad, ciudad_media, pueblo_urbano, rural
"""
from __future__ import annotations

import csv
import json
import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# Segmentos base (sin BD)
_DEFAULT_SPECS: list[dict[str, Any]] = [
    # ideológicos
    {
        "segment_id": "izquierda_dura",
        "label": "Izquierda dura",
        "ideology_mean": -7.5,
        "party_preference": {"SUMAR": 0.55, "UP": 0.25, "PSOE": 0.12},
        "persuadability": 0.20,
        "turnout_probability": 0.72,
        "raw_payload": {"size_pct": 8.5, "ideology_range": [1, 2]},
    },
    {
        "segment_id": "izquierda",
        "label": "Izquierda",
        "ideology_mean": -4.5,
        "party_preference": {"PSOE": 0.50, "SUMAR": 0.30, "UP": 0.10},
        "persuadability": 0.30,
        "turnout_probability": 0.68,
        "raw_payload": {"size_pct": 15.2, "ideology_range": [3, 3]},
    },
    {
        "segment_id": "centro_izquierda",
        "label": "Centro-izquierda",
        "ideology_mean": -2.0,
        "party_preference": {"PSOE": 0.60, "SUMAR": 0.18, "Más País": 0.10},
        "persuadability": 0.42,
        "turnout_probability": 0.65,
        "raw_payload": {"size_pct": 18.5, "ideology_range": [4, 4]},
    },
    {
        "segment_id": "centro",
        "label": "Centro",
        "ideology_mean": 0.0,
        "party_preference": {"PSOE": 0.35, "PP": 0.35, "CS": 0.15},
        "persuadability": 0.60,
        "turnout_probability": 0.58,
        "raw_payload": {"size_pct": 20.1, "ideology_range": [5, 5]},
    },
    {
        "segment_id": "centro_derecha",
        "label": "Centro-derecha",
        "ideology_mean": 2.5,
        "party_preference": {"PP": 0.62, "CS": 0.18, "VOX": 0.10},
        "persuadability": 0.42,
        "turnout_probability": 0.66,
        "raw_payload": {"size_pct": 17.8, "ideology_range": [6, 6]},
    },
    {
        "segment_id": "derecha",
        "label": "Derecha",
        "ideology_mean": 5.5,
        "party_preference": {"PP": 0.55, "VOX": 0.35},
        "persuadability": 0.28,
        "turnout_probability": 0.70,
        "raw_payload": {"size_pct": 13.4, "ideology_range": [7, 8]},
    },
    {
        "segment_id": "derecha_dura",
        "label": "Derecha dura",
        "ideology_mean": 8.5,
        "party_preference": {"VOX": 0.80, "PP": 0.15},
        "persuadability": 0.18,
        "turnout_probability": 0.74,
        "raw_payload": {"size_pct": 6.5, "ideology_range": [9, 10]},
    },
    # etarios
    {
        "segment_id": "jovenes",
        "label": "Jóvenes (18-34)",
        "age_group": "18-34",
        "ideology_mean": -2.0,
        "party_preference": {"SUMAR": 0.28, "PSOE": 0.25, "PP": 0.22, "VOX": 0.10},
        "persuadability": 0.55,
        "turnout_probability": 0.52,
        "raw_payload": {"size_pct": 20.3},
    },
    {
        "segment_id": "adultos",
        "label": "Adultos (35-54)",
        "age_group": "35-54",
        "ideology_mean": 0.5,
        "party_preference": {"PSOE": 0.32, "PP": 0.38, "SUMAR": 0.14},
        "persuadability": 0.40,
        "turnout_probability": 0.68,
        "raw_payload": {"size_pct": 35.7},
    },
    {
        "segment_id": "mayores",
        "label": "Mayores (55+)",
        "age_group": "55+",
        "ideology_mean": 1.5,
        "party_preference": {"PP": 0.42, "PSOE": 0.35, "VOX": 0.12},
        "persuadability": 0.28,
        "turnout_probability": 0.80,
        "raw_payload": {"size_pct": 44.0},
    },
    # hábitat
    {
        "segment_id": "gran_ciudad",
        "label": "Gran ciudad (>250k)",
        "ideology_mean": -1.5,
        "party_preference": {"PSOE": 0.33, "PP": 0.30, "SUMAR": 0.18},
        "persuadability": 0.48,
        "turnout_probability": 0.62,
        "raw_payload": {"size_pct": 38.5, "habitat": "gran_ciudad"},
    },
    {
        "segment_id": "ciudad_media",
        "label": "Ciudad media (50-250k)",
        "ideology_mean": 0.8,
        "party_preference": {"PP": 0.38, "PSOE": 0.30, "VOX": 0.14},
        "persuadability": 0.44,
        "turnout_probability": 0.65,
        "raw_payload": {"size_pct": 28.1, "habitat": "ciudad_media"},
    },
    {
        "segment_id": "rural",
        "label": "Rural (España vaciada)",
        "ideology_mean": 2.0,
        "party_preference": {"PP": 0.48, "PSOE": 0.28, "VOX": 0.15},
        "persuadability": 0.30,
        "turnout_probability": 0.72,
        "raw_payload": {"size_pct": 11.1, "habitat": "rural"},
    },
]


def get_default_segments() -> list:
    """Devuelve los segmentos base sin necesidad de BD."""
    from etl.sources.electoral.schemas import VoterSegment

    segments = []
    for d in _DEFAULT_SPECS:
        try:
            segments.append(VoterSegment(
                segment_id=d["segment_id"],
                label=d["label"],
                ideology_mean=d.get("ideology_mean"),
                age_group=d.get("age_group"),
                party_preference=d.get("party_preference", {}),
                persuadability=d.get("persuadability", 0.50),
                turnout_probability=d.get("turnout_probability", 0.65),
                raw_payload=d.get("raw_payload", {}),
            ))
        except Exception as exc:
            logger.debug("voter_segments default %s error: %s", d.get("segment_id"), exc)
    return segments


def load_segments_from_csv(path: str, encoding: str = "utf-8") -> list:
    """
    Carga segmentos de votante desde CSV.

    Columnas esperadas (mínimas):
        segment_id, label, ideology_mean, persuadability, turnout_probability
    Columnas opcionales:
        age_group, geography, income_group, education_group,
        party_preference (JSON), top_concerns (JSON)
    """
    from etl.sources.electoral.schemas import VoterSegment

    path_obj = Path(path)
    if not path_obj.exists():
        logger.warning("voter_segments: fichero no encontrado: %s — usando defaults", path)
        return get_default_segments()

    segments = []
    try:
        with open(path_obj, encoding=encoding, errors="replace") as f:
            reader = csv.DictReader(f)
            for i, row in enumerate(reader):
                try:
                    segment_id = row.get("segment_id", "").strip()
                    if not segment_id:
                        continue

                    ideology_raw = row.get("ideology_mean", "")
                    ideology_mean: float | None = None
                    if ideology_raw:
                        try:
                            ideology_mean = float(ideology_raw.replace(",", "."))
                        except ValueError:
                            pass

                    persuadability = 0.50
                    try:
                        persuadability = float(
                            row.get("persuadability", "0.50").replace(",", ".")
                        )
                    except ValueError:
                        pass

                    turnout = 0.65
                    try:
                        turnout = float(
                            row.get("turnout_probability", "0.65").replace(",", ".")
                        )
                    except ValueError:
                        pass

                    pref_raw = row.get("party_preference", "{}")
                    try:
                        party_preference = json.loads(pref_raw) if pref_raw else {}
                    except (ValueError, json.JSONDecodeError):
                        party_preference = {}

                    concerns_raw = row.get("top_concerns", "[]")
                    try:
                        top_concerns = json.loads(concerns_raw) if concerns_raw else []
                    except (ValueError, json.JSONDecodeError):
                        top_concerns = []

                    segments.append(VoterSegment(
                        segment_id=segment_id,
                        label=row.get("label", segment_id),
                        ideology_mean=ideology_mean,
                        age_group=row.get("age_group") or None,
                        geography=row.get("geography") or None,
                        income_group=row.get("income_group") or None,
                        education_group=row.get("education_group") or None,
                        party_preference=party_preference,
                        top_concerns=top_concerns,
                        persuadability=persuadability,
                        turnout_probability=turnout,
                    ))
                except Exception as exc:
                    logger.debug("voter_segments row %d error: %s", i, exc)

    except Exception as exc:
        logger.error("load_segments_from_csv: %s", exc)

    if not segments:
        logger.info("voter_segments: sin datos válidos en CSV — usando defaults")
        return get_default_segments()

    logger.info("voter_segments: cargados %d segmentos desde %s", len(segments), path)
    return segments


def load_segments_from_json(path: str) -> list:
    """Carga segmentos desde JSON."""
    from etl.sources.electoral.schemas import VoterSegment

    path_obj = Path(path)
    if not path_obj.exists():
        return get_default_segments()

    try:
        with open(path_obj, encoding="utf-8") as f:
            data = json.load(f)

        if not isinstance(data, list):
            data = data.get("segments", [])

        segments = []
        for item in data:
            try:
                segments.append(VoterSegment(**item))
            except Exception as exc:
                logger.debug("voter_segments json item error: %s", exc)
        return segments or get_default_segments()

    except Exception as exc:
        logger.error("load_segments_from_json: %s", exc)
        return get_default_segments()


def save_segments(segments: list, engine: Any) -> int:
    """Persiste VoterSegment en BD."""
    if not segments or engine is None:
        return 0
    n = 0
    try:
        import json as _json
        from sqlalchemy import text as sa_text

        with engine.begin() as conn:
            for seg in segments:
                try:
                    conn.execute(sa_text("""
                        INSERT INTO voter_segments (
                            segment_id, label, ideology_mean, age_group,
                            geography, income_group, education_group,
                            top_concerns, party_preference,
                            persuadability, turnout_probability
                        ) VALUES (
                            :segment_id, :label, :ideology_mean, :age_group,
                            :geography, :income_group, :education_group,
                            :top_concerns::jsonb, :party_preference::jsonb,
                            :persuadability, :turnout_probability
                        )
                        ON CONFLICT (segment_id) DO UPDATE SET
                            label = EXCLUDED.label,
                            ideology_mean = EXCLUDED.ideology_mean,
                            party_preference = EXCLUDED.party_preference,
                            persuadability = EXCLUDED.persuadability,
                            turnout_probability = EXCLUDED.turnout_probability
                    """), {
                        "segment_id": seg.segment_id,
                        "label": seg.label,
                        "ideology_mean": seg.ideology_mean,
                        "age_group": seg.age_group,
                        "geography": seg.geography,
                        "income_group": seg.income_group,
                        "education_group": seg.education_group,
                        "top_concerns": _json.dumps(
                            [[t, s] for t, s in seg.top_concerns]
                        ),
                        "party_preference": _json.dumps(seg.party_preference),
                        "persuadability": seg.persuadability,
                        "turnout_probability": seg.turnout_probability,
                    })
                    n += 1
                except Exception as exc:
                    logger.debug("save_segments item error: %s", exc)

    except Exception as exc:
        logger.error("save_segments: %s", exc)
    return n


def get_segment_by_id(segment_id: str, segments: list | None = None):
    """Busca un segmento por ID."""
    pool = segments if segments is not None else get_default_segments()
    for seg in pool:
        if seg.segment_id == segment_id:
            return seg
    return None


def get_segments_by_type(segment_type: str, segments: list | None = None) -> list:
    """Filtra segmentos por tipo usando raw_payload['type'] o age_group."""
    pool = segments if segments is not None else get_default_segments()
    if segment_type == "age":
        return [s for s in pool if s.age_group is not None]
    if segment_type == "ideological":
        return [s for s in pool if s.age_group is None and s.ideology_mean is not None]
    return pool


def find_soft_vote_opportunities(
    segments: list,
    party_id: str,
    current_share: float,
    competitor_threshold: float = 0.25,
) -> list[dict[str, Any]]:
    """
    Identifica segmentos con mayor potencial de voto blando para un partido.

    Args:
        segments: Lista de VoterSegment.
        party_id: Partido objetivo.
        current_share: % voto actual del partido.
        competitor_threshold: Umbral de preferencia competidora.

    Returns:
        Lista de dicts {segment_id, label, current_pref, persuadability, opportunity_score}.
    """
    opportunities = []
    for seg in segments:
        pref = seg.party_preference.get(party_id, 0.0)
        # Oportunidad: alta persuadabilidad + preferencia moderada (no ya ganado)
        # El partido ya tiene buena presencia pero puede crecer
        if pref >= competitor_threshold:
            opportunity = round(
                pref * seg.persuadability * seg.turnout_probability, 4
            )
            opportunities.append({
                "segment_id": seg.segment_id,
                "label": seg.label,
                "current_pref": pref,
                "persuadability": seg.persuadability,
                "turnout_probability": seg.turnout_probability,
                "opportunity_score": opportunity,
            })

    return sorted(opportunities, key=lambda x: x["opportunity_score"], reverse=True)
