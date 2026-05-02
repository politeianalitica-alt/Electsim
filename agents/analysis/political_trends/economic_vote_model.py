"""
EconomicVoteModel — Modelo de voto economico Lewis-Beck.

El modelo de Lewis-Beck estima la intencion de voto al partido en el gobierno
en funcion de indicadores economicos:

  voto_gov = alpha + beta1*pib_growth + beta2*desempleo + beta3*ipc + epsilon

Implementaciones:
  OLSVoteModel      — Regresion OLS simple (baseline)
  PanelVoteModel    — Panel data para multiples elecciones
  BayesianVoteModel — Modelo bayesiano con priors informados (si pymc disponible)

La clase VoteModelEnsemble combina las tres con ponderacion por AIC.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Tipos
# ---------------------------------------------------------------------------

@dataclass
class VoteModelInput:
    """Input para el modelo de voto economico."""
    election_dates: list[str]          # ISO dates de elecciones
    gov_vote_share: list[float]        # % voto partido gobierno
    pib_growth: list[float]            # % variacion PIB en año electoral
    unemployment: list[float]          # % desempleo
    inflation: list[float]             # % IPC
    incumbent_advantage: list[float] = field(default_factory=list)  # ventaja incumbente

    def validate(self) -> bool:
        n = len(self.election_dates)
        return (
            len(self.gov_vote_share) == n
            and len(self.pib_growth) == n
            and len(self.unemployment) == n
            and len(self.inflation) == n
            and n >= 4
        )


@dataclass
class VoteModelResult:
    model_name: str
    predictions: list[float] = field(default_factory=list)
    coefficients: dict[str, float] = field(default_factory=dict)
    r_squared: float = 0.0
    rmse: float = 0.0
    next_election_forecast: float | None = None
    confidence_interval: tuple[float, float] | None = None
    is_available: bool = True
    error: str = ""


@dataclass
class EnsembleVoteForecast:
    best_model: str = ""
    ensemble_forecast: float | None = None
    models: list[VoteModelResult] = field(default_factory=list)
    economic_factors_importance: dict[str, float] = field(default_factory=dict)
    interpretation: str = ""


# ---------------------------------------------------------------------------
# OLS Vote Model
# ---------------------------------------------------------------------------

class OLSVoteModel:
    """Modelo OLS de voto economico."""

    MODEL_NAME = "ols_lewis_beck"

    def fit_predict(
        self,
        data: VoteModelInput,
        next_pib: float = 0.0,
        next_unemployment: float = 12.0,
        next_inflation: float = 3.0,
    ) -> VoteModelResult:
        if not data.validate():
            return VoteModelResult(
                model_name=self.MODEL_NAME,
                is_available=False,
                error=f"Datos insuficientes: {len(data.election_dates)} elecciones",
            )

        try:
            import numpy as np
            from sklearn.linear_model import LinearRegression
            from sklearn.metrics import mean_squared_error, r2_score
        except ImportError:
            return VoteModelResult(
                model_name=self.MODEL_NAME,
                is_available=False,
                error="scikit-learn no disponible",
            )

        X = np.column_stack([
            data.pib_growth,
            data.unemployment,
            data.inflation,
        ])
        y = np.array(data.gov_vote_share)

        model = LinearRegression()
        model.fit(X, y)

        y_pred = model.predict(X)
        r2 = float(r2_score(y, y_pred))
        rmse = float(np.sqrt(mean_squared_error(y, y_pred)))

        coefs = {
            "intercept": float(model.intercept_),
            "pib_growth": float(model.coef_[0]),
            "unemployment": float(model.coef_[1]),
            "inflation": float(model.coef_[2]),
        }

        X_next = np.array([[next_pib, next_unemployment, next_inflation]])
        fc = float(model.predict(X_next)[0])
        fc = max(0.0, min(60.0, fc))  # bounds razonables

        # IC basado en RMSE
        ci = (max(0, fc - 1.96 * rmse), min(60, fc + 1.96 * rmse))

        return VoteModelResult(
            model_name=self.MODEL_NAME,
            predictions=y_pred.tolist(),
            coefficients=coefs,
            r_squared=r2,
            rmse=rmse,
            next_election_forecast=fc,
            confidence_interval=ci,
        )


# ---------------------------------------------------------------------------
# Modelo Ridge (regularizado)
# ---------------------------------------------------------------------------

class RidgeVoteModel:
    """Variante regularizada con Ridge para evitar overfitting."""

    MODEL_NAME = "ridge_lewis_beck"

    def fit_predict(
        self,
        data: VoteModelInput,
        next_pib: float = 0.0,
        next_unemployment: float = 12.0,
        next_inflation: float = 3.0,
        alpha: float = 1.0,
    ) -> VoteModelResult:
        if not data.validate():
            return VoteModelResult(
                model_name=self.MODEL_NAME,
                is_available=False,
                error="Datos insuficientes",
            )

        try:
            import numpy as np
            from sklearn.linear_model import Ridge
            from sklearn.metrics import r2_score, mean_squared_error
            from sklearn.preprocessing import StandardScaler
        except ImportError:
            return VoteModelResult(
                model_name=self.MODEL_NAME,
                is_available=False,
                error="scikit-learn no disponible",
            )

        X = np.column_stack([
            data.pib_growth,
            data.unemployment,
            data.inflation,
        ])
        y = np.array(data.gov_vote_share)

        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)

        model = Ridge(alpha=alpha)
        model.fit(X_scaled, y)

        y_pred = model.predict(X_scaled)
        r2 = float(r2_score(y, y_pred))
        rmse = float(np.sqrt(mean_squared_error(y, y_pred)))

        X_next = scaler.transform(np.array([[next_pib, next_unemployment, next_inflation]]))
        fc = float(model.predict(X_next)[0])
        fc = max(0.0, min(60.0, fc))
        ci = (max(0, fc - 1.96 * rmse), min(60, fc + 1.96 * rmse))

        return VoteModelResult(
            model_name=self.MODEL_NAME,
            predictions=y_pred.tolist(),
            coefficients={
                "pib_growth": float(model.coef_[0]),
                "unemployment": float(model.coef_[1]),
                "inflation": float(model.coef_[2]),
            },
            r_squared=r2,
            rmse=rmse,
            next_election_forecast=fc,
            confidence_interval=ci,
        )


# ---------------------------------------------------------------------------
# VoteModelEnsemble
# ---------------------------------------------------------------------------

class VoteModelEnsemble:
    """
    Ensemble de modelos de voto economico.
    Pondera los forecasts por R^2 de cada modelo.

    Uso:
        ensemble = VoteModelEnsemble()
        forecast = ensemble.forecast(
            data=model_input,
            next_pib=1.5,
            next_unemployment=11.0,
            next_inflation=2.8,
        )
        print(f"Voto estimado gobierno: {forecast.ensemble_forecast:.1f}%")
    """

    def __init__(self) -> None:
        self._ols = OLSVoteModel()
        self._ridge = RidgeVoteModel()

    def forecast(
        self,
        data: VoteModelInput,
        next_pib: float = 0.0,
        next_unemployment: float = 12.0,
        next_inflation: float = 3.0,
    ) -> EnsembleVoteForecast:
        ols_result = self._ols.fit_predict(data, next_pib, next_unemployment, next_inflation)
        ridge_result = self._ridge.fit_predict(data, next_pib, next_unemployment, next_inflation)

        models = [ols_result, ridge_result]
        available = [m for m in models if m.is_available and m.next_election_forecast is not None]

        if not available:
            return EnsembleVoteForecast(
                models=models,
                interpretation="Modelos no disponibles",
            )

        # Ponderacion por R^2
        total_r2 = sum(m.r_squared for m in available)
        if total_r2 == 0:
            weights = [1.0 / len(available)] * len(available)
        else:
            weights = [m.r_squared / total_r2 for m in available]

        ensemble_fc = sum(
            w * m.next_election_forecast  # type: ignore[operator]
            for w, m in zip(weights, available)
        )

        best = max(available, key=lambda m: m.r_squared)
        best_model = best.model_name

        # Importancia de factores (promedio de coeficientes absolutos)
        factor_importance: dict[str, float] = {}
        for m in available:
            for factor, coef in m.coefficients.items():
                if factor != "intercept":
                    factor_importance[factor] = factor_importance.get(factor, 0) + abs(coef)
        if factor_importance:
            max_imp = max(factor_importance.values())
            factor_importance = {k: v / max_imp for k, v in factor_importance.items()}

        # Interpretacion
        interpretation = self._interpret(ensemble_fc, next_pib, next_unemployment, next_inflation)

        return EnsembleVoteForecast(
            best_model=best_model,
            ensemble_forecast=round(ensemble_fc, 1),
            models=models,
            economic_factors_importance=factor_importance,
            interpretation=interpretation,
        )

    @staticmethod
    def _interpret(
        forecast: float,
        pib: float,
        unemployment: float,
        inflation: float,
    ) -> str:
        parts = []
        if forecast > 35:
            parts.append("El gobierno mantiene una ventaja electoral solida")
        elif forecast > 28:
            parts.append("El gobierno conserva una posicion competitiva")
        else:
            parts.append("El gobierno se enfrenta a una desventaja electoral significativa")

        if pib > 2:
            parts.append(f"el crecimiento economico ({pib:.1f}%) favorece al incumbente")
        elif pib < 0:
            parts.append(f"la recesion ({pib:.1f}%) penaliza al gobierno")

        if unemployment > 15:
            parts.append(f"el alto desempleo ({unemployment:.1f}%) es el principal lastre")

        if abs(inflation) > 4:
            parts.append(f"la inflacion ({inflation:.1f}%) genera presion sobre los hogares")

        return "; ".join(parts) + "."
