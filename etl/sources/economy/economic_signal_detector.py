"""
Economic Signal Detector — Bloque 5.

Detecta señales económico-políticas a partir de MacroIndicator.
Produce EconomicSignal y crea alertas en alertas_sistema.

Señales detectadas:
  inflation_pressure      IPC > 3.5%
  unemployment_risk       Paro > 13%
  growth_slowdown         PIB < 0%
  debt_pressure           Deuda > 110% PIB
  housing_stress          Precio vivienda YoY > 7%
  energy_price_shock      Electricidad delta > 20%
  consumer_confidence_drop  ICC z-score < -1.5
  fiscal_stress           Déficit > 5% PIB
  regional_divergence     Dispersión paro CCAA > umbral
  market_stress           Prima riesgo > 250pb
"""
from __future__ import annotations

import logging
import statistics
from datetime import date, datetime, timezone
from typing import Any

from .schemas import EconomicSignal, MacroIndicator

logger = logging.getLogger(__name__)


# ── Reglas de detección ───────────────────────────────────────────────────────

class SignalRule:
    """Define una regla de detección de señal."""

    def __init__(
        self,
        signal_type: str,
        indicator_id: str,
        check: Any,  # callable(current, prev) -> (bool, severity)
        explanation_template: str,
        related_sectors: list[str] | None = None,
        related_narratives: list[str] | None = None,
        confidence: float = 0.75,
    ) -> None:
        self.signal_type = signal_type
        self.indicator_id = indicator_id
        self.check = check
        self.explanation_template = explanation_template
        self.related_sectors = related_sectors or []
        self.related_narratives = related_narratives or []
        self.confidence = confidence


def _inflation_check(current: float, prev: float | None):
    if current > 5.0:
        return True, "CRITICAL"
    if current > 3.5:
        return True, "HIGH"
    if current > 2.5:
        return True, "MEDIUM"
    return False, "LOW"


def _unemployment_check(current: float, prev: float | None):
    if current > 18:
        return True, "CRITICAL"
    if current > 13:
        return True, "HIGH"
    if current > 11:
        return True, "MEDIUM"
    return False, "LOW"


def _growth_check(current: float, prev: float | None):
    if current < -2:
        return True, "CRITICAL"
    if current < 0:
        return True, "HIGH"
    if current < 1:
        return True, "MEDIUM"
    return False, "LOW"


def _debt_check(current: float, prev: float | None):
    if current > 130:
        return True, "CRITICAL"
    if current > 110:
        return True, "HIGH"
    if current > 95:
        return True, "MEDIUM"
    return False, "LOW"


def _housing_check(current: float, prev: float | None):
    if prev is None:
        return False, "LOW"
    change_pct = ((current - prev) / abs(prev)) * 100 if prev else 0
    if change_pct > 10:
        return True, "CRITICAL"
    if change_pct > 7:
        return True, "HIGH"
    if change_pct > 4:
        return True, "MEDIUM"
    return False, "LOW"


def _energy_check(current: float, prev: float | None):
    if prev is None:
        return False, "LOW"
    change_pct = ((current - prev) / abs(prev)) * 100 if prev else 0
    if change_pct > 30:
        return True, "CRITICAL"
    if change_pct > 20:
        return True, "HIGH"
    if change_pct > 10:
        return True, "MEDIUM"
    return False, "LOW"


def _confidence_check(current: float, prev: float | None):
    # ICC negativo indica baja confianza
    if current < -20:
        return True, "CRITICAL"
    if current < -10:
        return True, "HIGH"
    if current < -5:
        return True, "MEDIUM"
    return False, "LOW"


def _fiscal_check(current: float, prev: float | None):
    if current > 7:
        return True, "CRITICAL"
    if current > 5:
        return True, "HIGH"
    if current > 3:
        return True, "MEDIUM"
    return False, "LOW"


def _market_stress_check(current: float, prev: float | None):
    if current > 400:
        return True, "CRITICAL"
    if current > 250:
        return True, "HIGH"
    if current > 150:
        return True, "MEDIUM"
    return False, "LOW"


_RULES: list[SignalRule] = [
    SignalRule(
        signal_type="inflation_pressure",
        indicator_id="ipc",
        check=_inflation_check,
        explanation_template="IPC en {value:.1f}% — umbral de tensión inflacionaria superado.",
        related_sectors=["consumo", "alimentación", "energía"],
        related_narratives=["cesta de la compra", "poder adquisitivo", "subida precios"],
        confidence=0.85,
    ),
    SignalRule(
        signal_type="unemployment_risk",
        indicator_id="paro_epa",
        check=_unemployment_check,
        explanation_template="Tasa de paro EPA en {value:.1f}% — nivel de riesgo electoral significativo.",
        related_sectors=["laboral", "servicios", "industria"],
        related_narratives=["desempleo", "paro juvenil", "empleo"],
        confidence=0.80,
    ),
    SignalRule(
        signal_type="growth_slowdown",
        indicator_id="pib_yoy",
        check=_growth_check,
        explanation_template="PIB YoY en {value:.1f}% — señal de ralentización económica.",
        related_sectors=["producción", "exportaciones", "inversión"],
        related_narratives=["recesión", "crecimiento", "PIB"],
        confidence=0.80,
    ),
    SignalRule(
        signal_type="debt_pressure",
        indicator_id="deuda_pib",
        check=_debt_check,
        explanation_template="Deuda/PIB en {value:.1f}% — presión fiscal y riesgo de confianza.",
        related_sectors=["fiscal", "financiero"],
        related_narratives=["deuda pública", "sostenibilidad fiscal"],
        confidence=0.70,
    ),
    SignalRule(
        signal_type="housing_stress",
        indicator_id="precio_vivienda",
        check=_housing_check,
        explanation_template="Precio de vivienda con variación interanual elevada — tensión habitacional.",
        related_sectors=["vivienda", "construcción", "alquiler"],
        related_narratives=["crisis vivienda", "alquiler", "acceso a vivienda"],
        confidence=0.75,
    ),
    SignalRule(
        signal_type="energy_price_shock",
        indicator_id="precio_electricidad",
        check=_energy_check,
        explanation_template="Variación brusca en precio de electricidad — shock energético.",
        related_sectors=["energía", "industria", "hogares"],
        related_narratives=["precio luz", "factura energética", "crisis energética"],
        confidence=0.70,
    ),
    SignalRule(
        signal_type="consumer_confidence_drop",
        indicator_id="confianza_consumidor",
        check=_confidence_check,
        explanation_template="Índice de Confianza del Consumidor en {value:.1f} — caída significativa.",
        related_sectors=["consumo", "comercio", "servicios"],
        related_narratives=["pesimismo económico", "confianza", "expectativas"],
        confidence=0.65,
    ),
    SignalRule(
        signal_type="fiscal_stress",
        indicator_id="deficit_pib",
        check=_fiscal_check,
        explanation_template="Déficit público en {value:.1f}% PIB — señal de estrés fiscal.",
        related_sectors=["fiscal", "gasto público"],
        related_narratives=["déficit", "consolidación fiscal", "presupuestos"],
        confidence=0.75,
    ),
    SignalRule(
        signal_type="market_stress",
        indicator_id="prima_riesgo",
        check=_market_stress_check,
        explanation_template="Prima de riesgo en {value:.0f} pb — nerviosismo en mercados de deuda.",
        related_sectors=["financiero", "deuda soberana"],
        related_narratives=["prima de riesgo", "rescate", "confianza mercados"],
        confidence=0.80,
    ),
]


# ── Detector principal ────────────────────────────────────────────────────────

def detect_signals(
    indicators: list[MacroIndicator],
    historical: dict[str, list[float]] | None = None,
) -> list[EconomicSignal]:
    """
    Detecta señales económico-políticas en una lista de indicadores.

    Args:
        indicators: MacroIndicator a analizar.
        historical: Histórico de valores por indicator_id (para z-score).

    Returns:
        Lista de EconomicSignal detectadas.
    """
    signals: list[EconomicSignal] = []
    historical = historical or {}

    # Agrupar por indicator_id (más reciente primero)
    by_indicator: dict[str, list[MacroIndicator]] = {}
    for ind in indicators:
        by_indicator.setdefault(ind.indicator_id, []).append(ind)

    for indicator_id, ind_list in by_indicator.items():
        ind_list.sort(key=lambda x: x.date, reverse=True)
        if not ind_list:
            continue
        current_ind = ind_list[0]
        prev_ind = ind_list[1] if len(ind_list) > 1 else None

        for rule in _RULES:
            if rule.indicator_id != indicator_id:
                continue

            current_val = current_ind.value
            prev_val = prev_ind.value if prev_ind else None

            triggered, severity = rule.check(current_val, prev_val)
            if not triggered:
                continue

            # Cálculos adicionales
            change_abs = (current_val - prev_val) if prev_val is not None else None
            change_pct = (
                ((current_val - prev_val) / abs(prev_val)) * 100
                if prev_val and prev_val != 0 else None
            )

            # Z-score si hay histórico
            z_score = None
            hist_vals = historical.get(indicator_id, [])
            if len(hist_vals) >= 4:
                try:
                    mean = statistics.mean(hist_vals)
                    std = statistics.stdev(hist_vals)
                    if std > 0:
                        z_score = round((current_val - mean) / std, 3)
                except Exception:
                    pass

            explanation = rule.explanation_template.format(
                value=current_val,
                change=change_abs or 0,
                change_pct=change_pct or 0,
            )

            signal = EconomicSignal(
                signal_type=rule.signal_type,
                indicator_id=indicator_id,
                geography=current_ind.geography,
                date=current_ind.date,
                current_value=current_val,
                previous_value=prev_val,
                change_abs=change_abs,
                change_pct=change_pct,
                z_score=z_score,
                severity=severity,
                confidence=rule.confidence,
                explanation=explanation,
                related_sectors=rule.related_sectors,
                related_narratives=rule.related_narratives,
            )
            signals.append(signal)

    logger.info("detect_signals: %d señales detectadas de %d indicadores.", len(signals), len(indicators))
    return signals


def upsert_signals(signals: list[EconomicSignal], engine: Any) -> int:
    """Persiste EconomicSignal en economic_signals."""
    if not signals or engine is None:
        return 0
    n = 0
    try:
        import json
        from sqlalchemy import text as sa_text
        with engine.begin() as conn:
            for sig in signals:
                try:
                    conn.execute(sa_text("""
                        INSERT INTO economic_signals (
                            signal_type, indicator_id, geography, date,
                            current_value, previous_value, change_abs, change_pct, z_score,
                            severity, confidence, explanation,
                            related_sectors, related_parties, related_narratives,
                            raw_payload
                        ) VALUES (
                            :signal_type, :indicator_id, :geography, :date,
                            :current_value, :previous_value, :change_abs, :change_pct, :z_score,
                            :severity, :confidence, :explanation,
                            :related_sectors, :related_parties, :related_narratives,
                            :raw_payload::jsonb
                        )
                    """), {
                        "signal_type": sig.signal_type,
                        "indicator_id": sig.indicator_id,
                        "geography": sig.geography,
                        "date": sig.date,
                        "current_value": sig.current_value,
                        "previous_value": sig.previous_value,
                        "change_abs": sig.change_abs,
                        "change_pct": sig.change_pct,
                        "z_score": sig.z_score,
                        "severity": sig.severity,
                        "confidence": float(sig.confidence),
                        "explanation": sig.explanation,
                        "related_sectors": sig.related_sectors,
                        "related_parties": sig.related_parties,
                        "related_narratives": sig.related_narratives,
                        "raw_payload": json.dumps(sig.raw_payload),
                    })
                    n += 1
                except Exception as exc:
                    logger.debug("upsert_signal error: %s", exc)
    except Exception as exc:
        logger.error("upsert_signals: %s", exc)
    return n


def create_signal_alerts(signals: list[EconomicSignal], engine: Any) -> int:
    """Crea alertas en alertas_sistema para señales HIGH o CRITICAL."""
    if not signals or engine is None:
        return 0
    n = 0
    alert_types = {
        "inflation_pressure": "economic_inflation_pressure",
        "unemployment_risk": "economic_unemployment_risk",
        "growth_slowdown": "economic_growth_slowdown",
        "debt_pressure": "economic_debt_pressure",
        "housing_stress": "economic_housing_stress",
        "energy_price_shock": "economic_energy_shock",
        "consumer_confidence_drop": "economic_consumer_confidence",
        "fiscal_stress": "economic_fiscal_stress",
        "regional_divergence": "economic_regional_divergence",
        "market_stress": "economic_market_stress",
    }
    try:
        import json
        from sqlalchemy import text as sa_text
        with engine.begin() as conn:
            for sig in signals:
                if sig.severity not in ("HIGH", "CRITICAL"):
                    continue
                try:
                    conn.execute(sa_text("""
                        INSERT INTO alertas_sistema (tipo, severidad, titulo, descripcion, datos, created_at)
                        VALUES (:tipo, :severidad, :titulo, :descripcion, :datos::jsonb, NOW())
                        ON CONFLICT DO NOTHING
                    """), {
                        "tipo": alert_types.get(sig.signal_type, f"economic_{sig.signal_type}"),
                        "severidad": "CRITICAL" if sig.severity == "CRITICAL" else "WARNING",
                        "titulo": f"Señal económica: {sig.signal_type.replace('_', ' ').title()}",
                        "descripcion": sig.explanation[:1000],
                        "datos": json.dumps({
                            "pagina_relevante": "economia",
                            "indicator_id": sig.indicator_id,
                            "value": sig.current_value,
                            "severity": sig.severity,
                            "related_sectors": sig.related_sectors,
                            "related_narratives": sig.related_narratives,
                        }),
                    })
                    n += 1
                except Exception as exc:
                    logger.debug("create_signal_alert error: %s", exc)
    except Exception as exc:
        logger.error("create_signal_alerts: %s", exc)
    return n
