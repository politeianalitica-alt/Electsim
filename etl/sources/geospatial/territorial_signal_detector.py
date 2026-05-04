"""
Territorial Signal Detector — Bloque 7.

Genera señales territoriales integrando datos de múltiples módulos:
  electoral_swing, economic_stress, media_intensity, legislative_impact,
  contracting_opportunity, risk_exposure, campaign_priority,
  turnout_risk, soft_vote_opportunity, demographic_pressure.

Cada señal tiene valor (0-100), severity y explicación textual.
"""
from __future__ import annotations

import logging
from datetime import date
from typing import Any

import pandas as pd

logger = logging.getLogger(__name__)

from etl.sources.geospatial.schemas import TerritorialSignal, build_territory_id, SPAIN_PROVINCES


# ── Generadores de señales ─────────────────────────────────────────────────────

def detect_electoral_swing_signals(
    swing_threshold: float = 2.0,
    seats_at_risk: int = 1,
    engine: Any = None,
) -> list[TerritorialSignal]:
    """Genera señales de swing electoral por provincia."""
    signals = []
    try:
        from etl.sources.geospatial.territorial_aggregator import aggregate_electoral_by_territory
        df = aggregate_electoral_by_territory("province", engine)
        if df.empty or "swing_index" not in df.columns:
            return signals

        for _, row in df.iterrows():
            swing = abs(row.get("swing_index", 0) or 0)
            if swing < swing_threshold:
                continue

            value = min(100, swing * 20)
            signals.append(TerritorialSignal(
                territory_id=row["territory_id"],
                territory_type="province",
                signal_type="electoral_swing",
                signal_date=date.today(),
                value=value,
                source_module="electoral",
                explanation=(
                    f"Swing de {swing:.1f}pp detectado en {row.get('territory_name', row['territory_id'])}. "
                    f"Puede alterar el reparto de escaños."
                ),
                confidence=0.75,
            ))
    except Exception as exc:
        logger.debug("detect_electoral_swing_signals: %s", exc)
    return signals


def detect_economic_stress_signals(
    stress_threshold: float = 60.0,
    engine: Any = None,
) -> list[TerritorialSignal]:
    """Genera señales de stress económico por provincia."""
    signals = []
    try:
        from etl.sources.geospatial.territorial_aggregator import aggregate_economic_by_territory
        df = aggregate_economic_by_territory("province", engine)
        if df.empty or "economic_stress" not in df.columns:
            return signals

        for _, row in df.iterrows():
            stress = float(row.get("economic_stress", 0) or 0)
            if stress < stress_threshold:
                continue

            unemp = row.get("unemployment_rate", "—")
            signals.append(TerritorialSignal(
                territory_id=row["territory_id"],
                territory_type="province",
                signal_type="economic_stress",
                signal_date=date.today(),
                value=stress,
                source_module="economy",
                explanation=(
                    f"Tensión económica elevada en {row.get('territory_name', row['territory_id'])} "
                    f"(paro: {unemp}%, stress={stress:.0f}/100)."
                ),
                confidence=0.70,
            ))
    except Exception as exc:
        logger.debug("detect_economic_stress_signals: %s", exc)
    return signals


def detect_media_intensity_signals(
    intensity_threshold: float = 50.0,
    days: int = 7,
    engine: Any = None,
) -> list[TerritorialSignal]:
    """Genera señales de intensidad mediática por territorio."""
    signals = []
    try:
        from etl.sources.geospatial.territorial_aggregator import aggregate_media_by_territory
        df = aggregate_media_by_territory(days=days, engine=engine)
        if df.empty or "media_intensity" not in df.columns:
            return signals

        for _, row in df.iterrows():
            intensity = float(row.get("media_intensity", 0) or 0)
            if intensity < intensity_threshold:
                continue

            mentions = row.get("mentions_count", 0)
            signals.append(TerritorialSignal(
                territory_id=row["territory_id"],
                territory_type="province",
                signal_type="media_intensity",
                signal_date=date.today(),
                value=intensity,
                source_module="media",
                explanation=(
                    f"Alta intensidad mediática en {row['territory_id']} "
                    f"({mentions} menciones en {days} días)."
                ),
                confidence=0.65,
            ))
    except Exception as exc:
        logger.debug("detect_media_intensity_signals: %s", exc)
    return signals


def detect_campaign_priority_signals(
    priority_threshold: float = 60.0,
    engine: Any = None,
) -> list[TerritorialSignal]:
    """Genera señales de prioridad de campaña por provincia."""
    signals = []
    try:
        from etl.sources.geospatial.territorial_aggregator import compute_campaign_priority, _load_provinces_static
        from etl.sources.geospatial.ine_geography_adapter import _load_provinces_static

        provinces = _load_provinces_static()
        for prov in provinces:
            priority = compute_campaign_priority(prov.territory_id, engine=engine)
            if priority < priority_threshold:
                continue

            signals.append(TerritorialSignal(
                territory_id=prov.territory_id,
                territory_type="province",
                signal_type="campaign_priority",
                signal_date=date.today(),
                value=priority,
                source_module="campaign",
                explanation=(
                    f"{prov.name} tiene prioridad de campaña {priority:.0f}/100. "
                    f"Combina swing electoral, voto blando y tensión económica."
                ),
                confidence=0.68,
            ))
    except Exception as exc:
        logger.debug("detect_campaign_priority_signals: %s", exc)
    return signals


def detect_soft_vote_opportunity_signals(
    opportunity_threshold: float = 30.0,
    engine: Any = None,
) -> list[TerritorialSignal]:
    """
    Genera señales de oportunidad de voto blando por provincia.
    Placeholder — requiere datos de soft_vote_estimates por territorio.
    """
    # Sin datos provinciales de voto blando, usar proxy nacional
    signals = []
    try:
        from etl.sources.geospatial.ine_geography_adapter import _load_provinces_static
        from etl.sources.electoral.soft_vote_model import _DEFAULT_SOFT_PCT, _DEFAULT_SOFT_PCT_FALLBACK

        provinces = _load_provinces_static()
        # Usando el promedio de voto blando nacional como proxy
        avg_soft = sum(_DEFAULT_SOFT_PCT.values()) / max(len(_DEFAULT_SOFT_PCT), 1)

        for prov in provinces:
            if avg_soft < opportunity_threshold:
                continue
            signals.append(TerritorialSignal(
                territory_id=prov.territory_id,
                territory_type="province",
                signal_type="soft_vote_opportunity",
                signal_date=date.today(),
                value=avg_soft,
                source_module="campaign",
                explanation=(
                    f"El {avg_soft:.0f}% del voto en {prov.name} se considera blando "
                    f"y susceptible de captar con el mensaje adecuado."
                ),
                confidence=0.55,
            ))
    except Exception as exc:
        logger.debug("detect_soft_vote_opportunity_signals: %s", exc)
    return signals


def detect_all_signals(engine: Any = None) -> list[TerritorialSignal]:
    """Ejecuta todos los detectores y devuelve señales combinadas."""
    all_signals: list[TerritorialSignal] = []

    detectors = [
        detect_electoral_swing_signals,
        detect_economic_stress_signals,
        detect_media_intensity_signals,
        detect_campaign_priority_signals,
        detect_soft_vote_opportunity_signals,
    ]
    for detector in detectors:
        try:
            signals = detector(engine=engine)
            all_signals.extend(signals)
            logger.debug("%s: %d señales", detector.__name__, len(signals))
        except Exception as exc:
            logger.warning("detect_all_signals %s: %s", detector.__name__, exc)

    logger.info("territorial_signal_detector: %d señales generadas", len(all_signals))
    return all_signals


def save_signals(signals: list[TerritorialSignal], engine: Any) -> int:
    """Persiste señales territoriales en BD."""
    if not signals or engine is None:
        return 0
    n = 0
    try:
        import json as _json
        from sqlalchemy import text as sa_text

        with engine.begin() as conn:
            for sig in signals:
                try:
                    conn.execute(sa_text("""
                        INSERT INTO territorial_signals (
                            territory_id, territory_type, signal_type, date,
                            value, severity, source_module, source_object_id,
                            explanation, confidence, raw_payload
                        ) VALUES (
                            :territory_id, :territory_type, :signal_type, :date,
                            :value, :severity, :source_module, :source_object_id,
                            :explanation, :confidence, :raw_payload::jsonb
                        )
                    """), {
                        "territory_id": sig.territory_id,
                        "territory_type": sig.territory_type,
                        "signal_type": sig.signal_type,
                        "date": sig.signal_date,
                        "value": sig.value,
                        "severity": sig.severity,
                        "source_module": sig.source_module,
                        "source_object_id": sig.source_object_id,
                        "explanation": sig.explanation,
                        "confidence": sig.confidence,
                        "raw_payload": _json.dumps(sig.raw_payload),
                    })
                    n += 1
                except Exception as exc:
                    logger.debug("save_signals item: %s", exc)
    except Exception as exc:
        logger.error("save_signals: %s", exc)
    return n


def create_territorial_alerts(
    signals: list[TerritorialSignal],
    engine: Any = None,
) -> list[dict]:
    """
    Convierte señales HIGH/CRITICAL en alertas del sistema.

    Returns:
        Lista de dicts de alerta (compatible con alertas_sistema).
    """
    alerts = []
    type_to_page = {
        "electoral_swing": "electoral",
        "campaign_priority": "campana",
        "soft_vote_opportunity": "campana",
        "economic_stress": "economia",
        "media_intensity": "medios",
        "risk_exposure": "actores",
        "legislative_impact": "legislativo",
        "turnout_risk": "electoral",
        "contracting_opportunity": "economia",
        "demographic_pressure": "termometro",
    }

    for sig in signals:
        if sig.severity not in ("HIGH", "CRITICAL"):
            continue

        page = type_to_page.get(sig.signal_type, "termometro")
        alert_type = f"territorial_{sig.signal_type}"

        # Nombre del territorio
        from etl.sources.geospatial.territorial_aggregator import _get_territory_name
        name = _get_territory_name(sig.territory_id)

        alerts.append({
            "tipo": alert_type,
            "severidad": "CRÍTICO" if sig.severity == "CRITICAL" else "ADVERTENCIA",
            "titulo": f"Territorio prioritario: {name} ({sig.signal_type.replace('_', ' ')})",
            "descripcion": sig.explanation,
            "datos": {
                "pagina_relevante": page,
                "territory_id": sig.territory_id,
                "territory_name": name,
                "signal_type": sig.signal_type,
                "value": sig.value,
                "confidence": sig.confidence,
            },
        })

    return alerts
