"""
Causal Impact — Bloque 11.

Métodos de inferencia causal: before/after, DiD, regresión.
DoWhy/CausalPy opcionales (activar con ELECTSIM_USE_DOWHY=true).
"""
from __future__ import annotations

import logging
import math
import os
from typing import Any

from models.simulation.schemas import CausalEstimate

logger = logging.getLogger(__name__)

_USE_DOWHY = os.getenv("ELECTSIM_USE_DOWHY", "false").lower() == "true"
_USE_STATSMODELS = os.getenv("ELECTSIM_USE_STATSMODELS", "true").lower() == "true"


# ── Utilidades estadísticas internas ──────────────────────────────────────────

def _mean(values: list[float]) -> float:
    return sum(values) / len(values) if values else 0.0


def _variance(values: list[float]) -> float:
    if len(values) < 2:
        return 0.0
    m = _mean(values)
    return sum((v - m) ** 2 for v in values) / (len(values) - 1)


def _std(values: list[float]) -> float:
    return math.sqrt(_variance(values))


def _pooled_std(pre: list[float], post: list[float]) -> float:
    n1, n2 = len(pre), len(post)
    if n1 + n2 <= 2:
        return 1.0
    v1, v2 = _variance(pre), _variance(post)
    return math.sqrt(((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2))


def _t_statistic(diff: float, se: float) -> float:
    return diff / se if se > 0 else 0.0


def _approx_p_value(t_stat: float, df: int) -> float:
    """Aproximación del p-value bilateral (distribución t)."""
    # Aproximación con distribución normal para df grande
    if df > 30:
        z = abs(t_stat)
        if z > 6:
            return 0.0001
        # Aproximación racional de la cola normal
        p = math.erfc(z / math.sqrt(2))
        return min(1.0, p)
    else:
        # Fallback conservador para muestras pequeñas
        z = abs(t_stat)
        if z > 4:
            return 0.01
        elif z > 3:
            return 0.05
        elif z > 2:
            return 0.10
        elif z > 1.5:
            return 0.20
        else:
            return 0.50


# ── Before/After ──────────────────────────────────────────────────────────────

def estimate_before_after(
    pre_values: list[float],
    post_values: list[float],
    treatment: str,
    outcome: str,
    population: str | None = None,
    confidence: float = 0.7,
) -> CausalEstimate:
    """
    Estimación causal simple before/after.

    Args:
        pre_values: Valores del outcome antes del tratamiento.
        post_values: Valores del outcome después del tratamiento.
        treatment: Descripción del tratamiento.
        outcome: Descripción del outcome.
        population: Población analizada.
        confidence: Confianza en el diseño.

    Returns:
        CausalEstimate con efecto estimado.
    """
    if not pre_values or not post_values:
        return CausalEstimate(
            treatment=treatment,
            outcome=outcome,
            population=population,
            method="before_after",
            effect_estimate=0.0,
            confidence=0.1,
            interpretation="Datos insuficientes para estimación before/after.",
            assumptions=["Suficientes observaciones pre y post"],
        )

    mean_pre = _mean(pre_values)
    mean_post = _mean(post_values)
    effect = mean_post - mean_pre

    # Error estándar
    se = _pooled_std(pre_values, post_values) * math.sqrt(
        1 / len(pre_values) + 1 / len(post_values)
    )

    df = len(pre_values) + len(post_values) - 2
    t_stat = _t_statistic(effect, se)
    p_value = _approx_p_value(t_stat, df)

    margin = 1.96 * se
    lower = effect - margin
    upper = effect + margin

    direction = "positivo" if effect > 0 else "negativo"
    sig = "estadísticamente significativo" if p_value < 0.05 else "no significativo"

    return CausalEstimate(
        treatment=treatment,
        outcome=outcome,
        population=population,
        method="before_after",
        effect_estimate=round(effect, 4),
        standard_error=round(se, 4),
        lower_bound=round(lower, 4),
        upper_bound=round(upper, 4),
        p_value=round(p_value, 4),
        confidence=confidence,
        assumptions=[
            "Sin tendencias pre-tratamiento divergentes",
            "No hay otras intervenciones simultáneas",
            "La unidad de análisis es estable",
        ],
        diagnostics={
            "mean_pre": round(mean_pre, 4),
            "mean_post": round(mean_post, 4),
            "n_pre": len(pre_values),
            "n_post": len(post_values),
            "t_statistic": round(t_stat, 4),
            "df": df,
        },
        interpretation=(
            f"El efecto estimado de '{treatment}' sobre '{outcome}' es "
            f"{effect:+.3f} ({direction}), {sig} (p={p_value:.3f}, "
            f"IC 95%: [{lower:.3f}, {upper:.3f}])."
        ),
    )


# ── Difference in Differences ─────────────────────────────────────────────────

def estimate_difference_in_differences(
    treated_pre: list[float],
    treated_post: list[float],
    control_pre: list[float],
    control_post: list[float],
    treatment: str,
    outcome: str,
    population: str | None = None,
    confidence: float = 0.75,
) -> CausalEstimate:
    """
    Estimación causal Difference-in-Differences.

    DiD = (treated_post - treated_pre) - (control_post - control_pre)

    Args:
        treated_pre/post: Valores del grupo tratado antes/después.
        control_pre/post: Valores del grupo control antes/después.
        treatment, outcome, population: Descriptores.
        confidence: Confianza en el diseño.

    Returns:
        CausalEstimate.
    """
    if not all([treated_pre, treated_post, control_pre, control_post]):
        return CausalEstimate(
            treatment=treatment,
            outcome=outcome,
            population=population,
            method="difference_in_differences",
            effect_estimate=0.0,
            confidence=0.1,
            interpretation="Datos insuficientes para DiD.",
            assumptions=["Parallel trends", "SUTVA"],
        )

    treated_delta = _mean(treated_post) - _mean(treated_pre)
    control_delta = _mean(control_post) - _mean(control_pre)
    did_effect = treated_delta - control_delta

    # Error estándar (combinado)
    se_treated = _std(treated_post + treated_pre) / math.sqrt(
        len(treated_post) + len(treated_pre)
    )
    se_control = _std(control_post + control_pre) / math.sqrt(
        len(control_post) + len(control_pre)
    )
    se = math.sqrt(se_treated**2 + se_control**2)

    df = len(treated_pre) + len(treated_post) + len(control_pre) + len(control_post) - 4
    t_stat = _t_statistic(did_effect, se)
    p_value = _approx_p_value(t_stat, max(1, df))

    margin = 1.96 * se
    lower = did_effect - margin
    upper = did_effect + margin

    return CausalEstimate(
        treatment=treatment,
        outcome=outcome,
        population=population,
        method="difference_in_differences",
        effect_estimate=round(did_effect, 4),
        standard_error=round(se, 4),
        lower_bound=round(lower, 4),
        upper_bound=round(upper, 4),
        p_value=round(p_value, 4),
        confidence=confidence,
        assumptions=[
            "Parallel trends: sin tratamiento, ambos grupos habrían evolucionado igual",
            "SUTVA: sin interferencia entre unidades",
            "No hay anticipación del tratamiento",
        ],
        diagnostics={
            "treated_delta": round(treated_delta, 4),
            "control_delta": round(control_delta, 4),
            "n_treated": len(treated_pre) + len(treated_post),
            "n_control": len(control_pre) + len(control_post),
            "t_statistic": round(t_stat, 4),
        },
        interpretation=(
            f"DiD estima un efecto de {did_effect:+.3f} para '{treatment}' sobre '{outcome}'. "
            f"Grupo tratado cambió {treated_delta:+.3f} vs control {control_delta:+.3f}. "
            f"p={p_value:.3f}."
        ),
    )


# ── Regression Adjustment ──────────────────────────────────────────────────────

def estimate_regression_adjustment(
    outcome_values: list[float],
    treatment_indicator: list[float],
    covariates: dict[str, list[float]] | None = None,
    treatment: str = "tratamiento",
    outcome: str = "outcome",
    population: str | None = None,
    confidence: float = 0.65,
) -> CausalEstimate:
    """
    Estimación causal por regresión OLS con ajuste por covariables.

    Requiere statsmodels (opcional; cae back a OLS manual si no está disponible).

    Args:
        outcome_values: Variable dependiente.
        treatment_indicator: 0/1 indicando tratamiento.
        covariates: Variables de control adicionales.
        treatment, outcome, population: Descriptores.
        confidence: Confianza en el diseño.

    Returns:
        CausalEstimate.
    """
    n = len(outcome_values)
    if n < 4 or len(treatment_indicator) != n:
        return CausalEstimate(
            treatment=treatment,
            outcome=outcome,
            population=population,
            method="regression_adjustment",
            effect_estimate=0.0,
            confidence=0.1,
            interpretation="Datos insuficientes para regresión.",
            assumptions=["OLS sin sesgo", "Exogeneidad de covariables"],
        )

    if _USE_STATSMODELS:
        try:
            return _regression_with_statsmodels(
                outcome_values, treatment_indicator, covariates,
                treatment, outcome, population, confidence,
            )
        except ImportError:
            logger.debug("statsmodels no disponible, usando OLS manual")
        except Exception as exc:
            logger.warning("Error en statsmodels: %s", exc)

    # OLS manual (sin covariables)
    y = outcome_values
    x = treatment_indicator
    x_mean = _mean(x)
    y_mean = _mean(y)
    num = sum((xi - x_mean) * (yi - y_mean) for xi, yi in zip(x, y))
    den = sum((xi - x_mean) ** 2 for xi in x)

    if den == 0:
        coef = 0.0
        se = 1.0
    else:
        coef = num / den
        residuals = [yi - (y_mean + coef * (xi - x_mean)) for xi, yi in zip(x, y)]
        sigma2 = sum(r**2 for r in residuals) / max(1, n - 2)
        se = math.sqrt(sigma2 / den)

    t_stat = _t_statistic(coef, se)
    p_value = _approx_p_value(t_stat, n - 2)
    margin = 1.96 * se

    return CausalEstimate(
        treatment=treatment,
        outcome=outcome,
        population=population,
        method="regression_adjustment",
        effect_estimate=round(coef, 4),
        standard_error=round(se, 4),
        lower_bound=round(coef - margin, 4),
        upper_bound=round(coef + margin, 4),
        p_value=round(p_value, 4),
        confidence=confidence,
        assumptions=[
            "Exogeneidad condicional del tratamiento",
            "OLS sin sesgo de selección",
            "Linealidad del efecto",
        ],
        diagnostics={
            "n": n,
            "n_treated": sum(1 for v in treatment_indicator if v > 0.5),
            "n_control": sum(1 for v in treatment_indicator if v <= 0.5),
            "t_statistic": round(t_stat, 4),
            "method_used": "ols_manual",
        },
        interpretation=(
            f"OLS estima un coeficiente de {coef:+.3f} para '{treatment}' sobre '{outcome}' "
            f"(p={p_value:.3f}, IC 95%: [{coef - margin:.3f}, {coef + margin:.3f}])."
        ),
    )


def _regression_with_statsmodels(
    outcome_values: list[float],
    treatment_indicator: list[float],
    covariates: dict[str, list[float]] | None,
    treatment: str,
    outcome: str,
    population: str | None,
    confidence: float,
) -> CausalEstimate:
    import statsmodels.api as sm  # type: ignore
    import numpy as np  # type: ignore

    X_data: dict[str, Any] = {"treatment": treatment_indicator}
    if covariates:
        X_data.update(covariates)

    X = sm.add_constant(np.column_stack(list(X_data.values())))
    y = np.array(outcome_values)

    model = sm.OLS(y, X).fit()
    coef = float(model.params[1])
    se = float(model.bse[1])
    p_val = float(model.pvalues[1])
    ci = model.conf_int(alpha=0.05)
    lower = float(ci[1, 0])
    upper = float(ci[1, 1])

    return CausalEstimate(
        treatment=treatment,
        outcome=outcome,
        population=population,
        method="regression_adjustment",
        effect_estimate=round(coef, 4),
        standard_error=round(se, 4),
        lower_bound=round(lower, 4),
        upper_bound=round(upper, 4),
        p_value=round(p_val, 4),
        confidence=confidence,
        assumptions=[
            "Exogeneidad condicional del tratamiento",
            "Linealidad del efecto",
            "Homocedasticidad de residuos",
        ],
        diagnostics={
            "n": len(outcome_values),
            "r_squared": round(float(model.rsquared), 4),
            "adj_r_squared": round(float(model.rsquared_adj), 4),
            "aic": round(float(model.aic), 2),
            "method_used": "statsmodels_ols",
            "n_covariates": len(covariates) if covariates else 0,
        },
        interpretation=(
            f"OLS (statsmodels) estima un efecto de {coef:+.3f} "
            f"(SE={se:.3f}, p={p_val:.3f}, IC 95%: [{lower:.3f}, {upper:.3f}]). "
            f"R²={model.rsquared:.3f}."
        ),
    )
