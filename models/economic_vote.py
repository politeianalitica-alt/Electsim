"""
Economic Vote Model — Bloque 5.

Modelo Lewis-Beck: conecta condiciones macroeconómicas con voto al gobierno.
Ref: Lewis-Beck & Stegmaier (2000), Powell & Whitten (1993).

Implementación propia sin dependencias externas.
Tres variantes:
  - baseline: ponderación fija por literatura empírica española
  - ols      : OLS in-memory si hay datos históricos suficientes (≥8 obs)
  - ensemble : promedio de baseline + ols cuando ambos disponibles
"""
from __future__ import annotations

import logging
import math
from dataclasses import dataclass, field
from datetime import date
from typing import Literal

logger = logging.getLogger(__name__)


# ── Parámetros calibrados en elecciones españolas 2000-2023 ───────────────────
# Basado en análisis de literatura: PSOE/PP gobiernos, elecciones generales.
# Los signos están en la dirección "tensión → pérdida voto gobierno".

_BASELINE_BETAS: dict[str, float] = {
    # Coeficiente: efecto de 1 unidad del indicador sobre la variación de voto
    # al partido en el gobierno (puntos porcentuales).
    "pib_yoy":             +0.40,   # +1pp PIB → +0.40pp voto gobierno
    "paro_epa":            -0.30,   # +1pp paro → -0.30pp voto gobierno
    "ipc":                 -0.25,   # +1pp IPC → -0.25pp voto gobierno
    "confianza_consumidor": +0.08,  # +1 ICC → +0.08pp voto gobierno
    "prima_riesgo":        -0.005,  # +1pb prima → -0.005pp voto gobierno
    "deficit_pib":         -0.15,   # +1pp déficit → -0.15pp voto gobierno
}

_INTERCEPT_BASELINE: float = 2.0  # Efecto base / incumbency factor

# Intervalo de confianza base (±puntos) cuando no hay estimación OLS
_DEFAULT_CI_HALF: float = 3.5


# ── Modelos de datos ──────────────────────────────────────────────────────────


@dataclass
class EconomicVoteInput:
    """Inputs del modelo de voto económico."""

    # Valores actuales de indicadores (usa None si no disponible)
    pib_yoy: float | None = None
    paro_epa: float | None = None
    ipc: float | None = None
    confianza_consumidor: float | None = None
    prima_riesgo: float | None = None
    deficit_pib: float | None = None

    # Punto de partida (última intención de voto al gobierno, %)
    base_vote_share: float = 0.0

    # Contexto
    geography: str = "ES"
    reference_date: date = field(default_factory=date.today)

    # Variante del modelo
    variant: Literal["baseline", "ols", "ensemble"] = "baseline"

    def to_dict(self) -> dict[str, float | None]:
        return {
            "pib_yoy": self.pib_yoy,
            "paro_epa": self.paro_epa,
            "ipc": self.ipc,
            "confianza_consumidor": self.confianza_consumidor,
            "prima_riesgo": self.prima_riesgo,
            "deficit_pib": self.deficit_pib,
        }


@dataclass
class EconomicVotePrediction:
    """Predicción del modelo de voto económico."""

    # Variación estimada de voto gobierno (puntos porcentuales)
    delta_vote: float

    # Estimación absoluta si se conoce el punto de partida
    predicted_vote_share: float | None

    # Intervalo de confianza 80%
    ci_lower: float
    ci_upper: float

    # Contexto
    geography: str
    reference_date: date
    variant: str

    # Contribuciones por factor
    contributions: dict[str, float]

    # Nivel de confianza en la predicción (0-1)
    confidence: float

    # Narrativa
    explanation: str

    # Factores dominantes (los 3 más importantes)
    top_factors: list[str]

    # R² del modelo (None si es baseline sin datos históricos)
    r_squared: float | None = None

    # Disponibilidad de datos (% de indicadores disponibles)
    data_coverage: float = 0.0


# ── Modelos internos ──────────────────────────────────────────────────────────


def _baseline_predict(inputs: EconomicVoteInput) -> EconomicVotePrediction:
    """
    Predicción usando coeficientes fijos de literatura.
    Siempre disponible.
    """
    contributions: dict[str, float] = {}
    n_available = 0
    n_total = len(_BASELINE_BETAS)

    delta = _INTERCEPT_BASELINE

    for indicator, beta in _BASELINE_BETAS.items():
        val = getattr(inputs, indicator, None)
        if val is None:
            contributions[indicator] = 0.0
            continue
        contrib = beta * val
        contributions[indicator] = round(contrib, 3)
        delta += contrib
        n_available += 1

    data_coverage = n_available / n_total if n_total > 0 else 0.0
    delta = round(delta, 2)

    # Ajustar CI según cobertura de datos
    ci_half = _DEFAULT_CI_HALF * (1 + (1 - data_coverage))

    predicted: float | None = None
    if inputs.base_vote_share > 0:
        predicted = round(max(5.0, min(75.0, inputs.base_vote_share + delta)), 1)

    # Top 3 factores por contribución absoluta
    top_factors = sorted(
        [k for k, v in contributions.items() if abs(v) > 0.01],
        key=lambda k: abs(contributions[k]),
        reverse=True,
    )[:3]

    # Narrativa
    direction = "positiva" if delta > 0 else "negativa"
    explanation = _build_explanation(delta, contributions, top_factors, data_coverage)

    return EconomicVotePrediction(
        delta_vote=delta,
        predicted_vote_share=predicted,
        ci_lower=round(delta - ci_half, 1),
        ci_upper=round(delta + ci_half, 1),
        geography=inputs.geography,
        reference_date=inputs.reference_date,
        variant="baseline",
        contributions=contributions,
        confidence=round(0.5 + data_coverage * 0.35, 2),
        explanation=explanation,
        top_factors=top_factors,
        r_squared=None,
        data_coverage=round(data_coverage, 2),
    )


def _ols_predict(
    inputs: EconomicVoteInput,
    historical: list[dict],
) -> EconomicVotePrediction | None:
    """
    Predicción OLS ajustada sobre datos históricos.

    historical: lista de dicts con claves = _BASELINE_BETAS + 'delta_vote'.
    Mínimo 8 observaciones.
    Devuelve None si no hay suficientes datos para ajustar.
    """
    if len(historical) < 8:
        return None

    try:
        # Variables dependiente e independientes
        feature_keys = [k for k in _BASELINE_BETAS if k != "prima_riesgo"]  # prima a veces falta
        y = [float(obs.get("delta_vote", 0)) for obs in historical]
        X_raw = [[float(obs.get(k, 0)) for k in feature_keys] for obs in historical]

        # Estandarizar
        n, p = len(X_raw), len(feature_keys)
        x_means = [sum(X_raw[i][j] for i in range(n)) / n for j in range(p)]
        x_stds = [
            (sum((X_raw[i][j] - x_means[j]) ** 2 for i in range(n)) / n) ** 0.5 or 1.0
            for j in range(p)
        ]

        X = [[(X_raw[i][j] - x_means[j]) / x_stds[j] for j in range(p)] for i in range(n)]
        y_mean = sum(y) / n

        # OLS normal equations: beta = (X'X)^-1 X'y
        # Simplificado para datasets pequeños sin numpy
        XtX = [[sum(X[k][i] * X[k][j] for k in range(n)) for j in range(p)] for i in range(p)]
        Xty = [sum(X[k][i] * y[k] for k in range(n)) for i in range(p)]

        betas_scaled = _solve_ls(XtX, Xty)
        if betas_scaled is None:
            return None

        intercept = y_mean - sum(b * x_means[j] / x_stds[j] for j, b in enumerate(betas_scaled))

        # Calcular R²
        y_pred = [intercept + sum(betas_scaled[j] * X[i][j] for j in range(p)) for i in range(n)]
        ss_res = sum((yi - yp) ** 2 for yi, yp in zip(y, y_pred))
        ss_tot = sum((yi - y_mean) ** 2 for yi in y)
        r2 = 1 - ss_res / ss_tot if ss_tot > 0 else 0.0

        # Predecir con inputs actuales
        contributions: dict[str, float] = {}
        delta = float(intercept)
        n_avail = 0
        for j, key in enumerate(feature_keys):
            val = getattr(inputs, key, None)
            if val is None:
                contributions[key] = 0.0
                continue
            contrib = betas_scaled[j] * (val - x_means[j]) / x_stds[j]
            contributions[key] = round(float(contrib), 3)
            delta += float(contrib)
            n_avail += 1

        delta = round(delta, 2)
        data_coverage = n_avail / len(feature_keys)

        # Residual std para CI
        if n > p:
            s = (ss_res / (n - p)) ** 0.5
        else:
            s = _DEFAULT_CI_HALF
        ci_half = s * 1.282  # 80% interval

        predicted: float | None = None
        if inputs.base_vote_share > 0:
            predicted = round(max(5.0, min(75.0, inputs.base_vote_share + delta)), 1)

        top_factors = sorted(
            [k for k, v in contributions.items() if abs(v) > 0.01],
            key=lambda k: abs(contributions[k]),
            reverse=True,
        )[:3]

        explanation = _build_explanation(delta, contributions, top_factors, data_coverage)
        explanation += f" [OLS R²={r2:.2f}]"

        return EconomicVotePrediction(
            delta_vote=delta,
            predicted_vote_share=predicted,
            ci_lower=round(delta - ci_half, 1),
            ci_upper=round(delta + ci_half, 1),
            geography=inputs.geography,
            reference_date=inputs.reference_date,
            variant="ols",
            contributions=contributions,
            confidence=round(0.60 + min(0.35, r2 * 0.35), 2),
            explanation=explanation,
            top_factors=top_factors,
            r_squared=round(r2, 3),
            data_coverage=round(data_coverage, 2),
        )

    except Exception as exc:
        logger.debug("_ols_predict: %s", exc)
        return None


def _solve_ls(A: list[list[float]], b: list[float]) -> list[float] | None:
    """
    Resuelve un sistema lineal cuadrado Ax = b usando eliminación gaussiana.
    Devuelve None si la matriz es singular.
    """
    n = len(A)
    # Copia augmented
    M = [row[:] + [b[i]] for i, row in enumerate(A)]

    for col in range(n):
        # Pivoting parcial
        max_row = max(range(col, n), key=lambda r: abs(M[r][col]))
        M[col], M[max_row] = M[max_row], M[col]
        if abs(M[col][col]) < 1e-12:
            return None
        pivot = M[col][col]
        for row in range(col + 1, n):
            factor = M[row][col] / pivot
            for j in range(col, n + 1):
                M[row][j] -= factor * M[col][j]

    # Back substitution
    x = [0.0] * n
    for i in range(n - 1, -1, -1):
        if abs(M[i][i]) < 1e-12:
            return None
        x[i] = M[i][n]
        for j in range(i + 1, n):
            x[i] -= M[i][j] * x[j]
        x[i] /= M[i][i]
    return x


def _build_explanation(
    delta: float,
    contributions: dict[str, float],
    top_factors: list[str],
    data_coverage: float,
) -> str:
    """Genera una narrativa legible de la predicción."""
    direction = "positiva (+{:.1f}pp)".format(delta) if delta >= 0 else "negativa ({:.1f}pp)".format(delta)
    cobertura = f"{data_coverage * 100:.0f}%"

    factor_labels = {
        "pib_yoy": "crecimiento del PIB",
        "paro_epa": "tasa de paro EPA",
        "ipc": "inflación (IPC)",
        "confianza_consumidor": "confianza del consumidor",
        "prima_riesgo": "prima de riesgo",
        "deficit_pib": "déficit público",
    }

    top_str = ", ".join(factor_labels.get(f, f) for f in top_factors[:2])
    return (
        f"El entorno macroeconómico apunta a una variación {direction} en el voto al gobierno. "
        f"Los factores dominantes son: {top_str}. "
        f"Cobertura de datos: {cobertura} de los indicadores modelo."
    )


# ── API pública ───────────────────────────────────────────────────────────────


class EconomicVoteModel:
    """
    Modelo de voto económico tipo Lewis-Beck para el sistema político español.

    Uso básico:
        model = EconomicVoteModel()
        pred = model.predict(inputs)
        print(pred.delta_vote, pred.explanation)
    """

    def __init__(self, historical: list[dict] | None = None) -> None:
        """
        Args:
            historical: Observaciones históricas para ajuste OLS.
                Cada dict debe tener claves: pib_yoy, paro_epa, ipc,
                confianza_consumidor, prima_riesgo, deficit_pib, delta_vote.
                Mínimo 8 para activar variante OLS.
        """
        self.historical = historical or []

    def predict(self, inputs: EconomicVoteInput) -> EconomicVotePrediction:
        """
        Genera una predicción de voto económico.

        Selecciona automáticamente baseline o OLS/ensemble según datos.
        """
        if inputs.variant == "baseline" or len(self.historical) < 8:
            return _baseline_predict(inputs)

        ols_pred = _ols_predict(inputs, self.historical)

        if ols_pred is None or inputs.variant == "baseline":
            return _baseline_predict(inputs)

        if inputs.variant == "ols":
            return ols_pred

        # Ensemble: promedio ponderado (OLS más peso si R² alto)
        base_pred = _baseline_predict(inputs)
        w_ols = min(0.70, 0.40 + (ols_pred.r_squared or 0) * 0.30)
        w_base = 1 - w_ols

        delta = round(w_ols * ols_pred.delta_vote + w_base * base_pred.delta_vote, 2)
        ci_lower = round(w_ols * ols_pred.ci_lower + w_base * base_pred.ci_lower, 1)
        ci_upper = round(w_ols * ols_pred.ci_upper + w_base * base_pred.ci_upper, 1)

        predicted: float | None = None
        if inputs.base_vote_share > 0:
            predicted = round(max(5.0, min(75.0, inputs.base_vote_share + delta)), 1)

        # Combinar contribuciones
        combined_contribs: dict[str, float] = {}
        all_keys = set(list(ols_pred.contributions) + list(base_pred.contributions))
        for k in all_keys:
            combined_contribs[k] = round(
                w_ols * ols_pred.contributions.get(k, 0)
                + w_base * base_pred.contributions.get(k, 0),
                3,
            )

        top_factors = sorted(
            [k for k, v in combined_contribs.items() if abs(v) > 0.01],
            key=lambda k: abs(combined_contribs[k]),
            reverse=True,
        )[:3]

        explanation = _build_explanation(delta, combined_contribs, top_factors, ols_pred.data_coverage)
        explanation += f" [Ensemble: OLS {w_ols:.0%} + baseline {w_base:.0%}]"

        return EconomicVotePrediction(
            delta_vote=delta,
            predicted_vote_share=predicted,
            ci_lower=ci_lower,
            ci_upper=ci_upper,
            geography=inputs.geography,
            reference_date=inputs.reference_date,
            variant="ensemble",
            contributions=combined_contribs,
            confidence=round(w_ols * ols_pred.confidence + w_base * base_pred.confidence, 2),
            explanation=explanation,
            top_factors=top_factors,
            r_squared=ols_pred.r_squared,
            data_coverage=ols_pred.data_coverage,
        )

    def predict_from_macro(
        self,
        macro_dict: dict[str, float],
        base_vote_share: float = 0.0,
        geography: str = "ES",
        variant: Literal["baseline", "ols", "ensemble"] = "ensemble",
    ) -> EconomicVotePrediction:
        """
        Shortcut: acepta un dict de indicadores en lugar de EconomicVoteInput.

        Args:
            macro_dict: dict de indicator_id → valor.
                Claves relevantes: 'pib_yoy', 'paro_epa', 'ipc',
                'confianza_consumidor', 'prima_riesgo', 'deficit_pib'.
            base_vote_share: Estimación actual de voto al gobierno (%).
        """
        inputs = EconomicVoteInput(
            pib_yoy=macro_dict.get("pib_yoy"),
            paro_epa=macro_dict.get("paro_epa"),
            ipc=macro_dict.get("ipc"),
            confianza_consumidor=macro_dict.get("confianza_consumidor"),
            prima_riesgo=macro_dict.get("prima_riesgo"),
            deficit_pib=macro_dict.get("deficit_pib"),
            base_vote_share=base_vote_share,
            geography=geography,
            variant=variant,
        )
        return self.predict(inputs)
