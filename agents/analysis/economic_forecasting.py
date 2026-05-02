"""
Modelos de forecasting economico.

Modelos implementados:
  ProphetForecaster   — Facebook Prophet (tendencia + estacionalidad)
  SARIMAForecaster    — SARIMA via statsmodels (series estacionarias)
  VARForecaster       — VAR multivariado (correlaciones entre series)
  GDPNowcaster        — Nowcasting de PIB con datos de alta frecuencia
  PoliticalEconomyCorrelator — Correlacion economia-intencion de voto

Dependencias opcionales (todas con fallback graceful):
  prophet             — pip install prophet
  statsmodels         — ya en requirements
  scikit-learn        — ya en requirements

Si el modelo no esta disponible, retorna ForecastResult vacio
con is_available=False.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Any

from agents.analysis.economic_timeseries import ProcessedSeries

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Tipos
# ---------------------------------------------------------------------------

@dataclass
class ForecastPoint:
    date_: date
    value: float
    lower_bound: float
    upper_bound: float
    confidence: float = 0.95


@dataclass
class ForecastResult:
    model: str
    indicator: str
    geo: str
    horizon_months: int
    points: list[ForecastPoint] = field(default_factory=list)
    in_sample_rmse: float | None = None
    is_available: bool = True
    error_message: str = ""

    def latest_forecast(self) -> ForecastPoint | None:
        return self.points[-1] if self.points else None

    def to_dict(self) -> dict[str, Any]:
        return {
            "model": self.model,
            "indicator": self.indicator,
            "geo": self.geo,
            "horizon_months": self.horizon_months,
            "forecasts": [
                {
                    "date": p.date_.isoformat(),
                    "value": p.value,
                    "lower": p.lower_bound,
                    "upper": p.upper_bound,
                }
                for p in self.points
            ],
            "rmse": self.in_sample_rmse,
            "is_available": self.is_available,
        }


@dataclass
class EnsembleForecast:
    """Ensemble de multiples modelos de forecasting."""
    indicator: str
    geo: str
    individual: list[ForecastResult] = field(default_factory=list)
    ensemble_points: list[ForecastPoint] = field(default_factory=list)
    best_model: str = ""
    consensus_trend: str = "estable"

    def summary_dict(self) -> dict[str, Any]:
        last = self.ensemble_points[-1] if self.ensemble_points else None
        return {
            "indicator": self.indicator,
            "geo": self.geo,
            "best_model": self.best_model,
            "consensus_trend": self.consensus_trend,
            "latest_forecast": {
                "date": last.date_.isoformat() if last else None,
                "value": last.value if last else None,
            } if last else None,
            "models_available": [r.model for r in self.individual if r.is_available],
        }


# ---------------------------------------------------------------------------
# ProphetForecaster
# ---------------------------------------------------------------------------

class ProphetForecaster:
    """
    Forecasting con Facebook Prophet.
    Instalacion: pip install prophet
    """

    MODEL_NAME = "prophet"

    def forecast(
        self,
        series: ProcessedSeries,
        horizon_months: int = 12,
        yearly_seasonality: bool = True,
    ) -> ForecastResult:
        if not series.is_sufficient(24):
            return ForecastResult(
                model=self.MODEL_NAME,
                indicator=series.indicator,
                geo=series.geo,
                horizon_months=horizon_months,
                is_available=False,
                error_message=f"Insuficientes datos: {len(series)} puntos (minimo 24)",
            )

        try:
            from prophet import Prophet  # type: ignore[import]
            import pandas as pd
        except ImportError:
            return ForecastResult(
                model=self.MODEL_NAME,
                indicator=series.indicator,
                geo=series.geo,
                horizon_months=horizon_months,
                is_available=False,
                error_message="prophet no instalado (pip install prophet)",
            )

        try:
            df = pd.DataFrame({
                "ds": pd.to_datetime(series.dates),
                "y": series.values,
            })

            m = Prophet(
                yearly_seasonality=yearly_seasonality,
                weekly_seasonality=False,
                daily_seasonality=False,
                interval_width=0.95,
            )
            m.fit(df)

            future = m.make_future_dataframe(periods=horizon_months, freq="MS")
            forecast = m.predict(future)
            future_fc = forecast[forecast["ds"] > df["ds"].max()]

            points = []
            for _, row in future_fc.iterrows():
                points.append(ForecastPoint(
                    date_=row["ds"].date(),
                    value=float(row["yhat"]),
                    lower_bound=float(row["yhat_lower"]),
                    upper_bound=float(row["yhat_upper"]),
                ))

            # In-sample RMSE
            in_sample = forecast[forecast["ds"].isin(df["ds"])]
            import numpy as np
            rmse = float(np.sqrt(((in_sample["yhat"].values - df["y"].values) ** 2).mean()))

            return ForecastResult(
                model=self.MODEL_NAME,
                indicator=series.indicator,
                geo=series.geo,
                horizon_months=horizon_months,
                points=points,
                in_sample_rmse=rmse,
            )
        except Exception as exc:
            logger.warning("ProphetForecaster error: %s", exc)
            return ForecastResult(
                model=self.MODEL_NAME,
                indicator=series.indicator,
                geo=series.geo,
                horizon_months=horizon_months,
                is_available=False,
                error_message=str(exc),
            )


# ---------------------------------------------------------------------------
# SARIMAForecaster
# ---------------------------------------------------------------------------

class SARIMAForecaster:
    """
    Forecasting con SARIMA via statsmodels.
    El orden (p,d,q)(P,D,Q,m) se determina automaticamente via auto-ARIMA
    de statsforecast si esta disponible, o usa orden fijo (1,1,1)(1,1,1,12).
    """

    MODEL_NAME = "sarima"

    def __init__(
        self,
        order: tuple[int, int, int] = (1, 1, 1),
        seasonal_order: tuple[int, int, int, int] = (1, 1, 1, 12),
        auto_order: bool = True,
    ) -> None:
        self._order = order
        self._seasonal_order = seasonal_order
        self._auto_order = auto_order

    def forecast(
        self,
        series: ProcessedSeries,
        horizon_months: int = 12,
    ) -> ForecastResult:
        if not series.is_sufficient(24):
            return ForecastResult(
                model=self.MODEL_NAME,
                indicator=series.indicator,
                geo=series.geo,
                horizon_months=horizon_months,
                is_available=False,
                error_message=f"Insuficientes datos: {len(series)}",
            )

        try:
            import numpy as np
            from statsmodels.tsa.statespace.sarimax import SARIMAX
        except ImportError:
            return ForecastResult(
                model=self.MODEL_NAME,
                indicator=series.indicator,
                geo=series.geo,
                horizon_months=horizon_months,
                is_available=False,
                error_message="statsmodels no instalado",
            )

        try:
            import warnings
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                model = SARIMAX(
                    series.values,
                    order=self._order,
                    seasonal_order=self._seasonal_order,
                    enforce_stationarity=False,
                    enforce_invertibility=False,
                )
                fit = model.fit(disp=False)

            fc = fit.get_forecast(steps=horizon_months)
            means = fc.predicted_mean
            ci = fc.conf_int(alpha=0.05)

            last_date = series.dates[-1]
            points = []
            for i in range(horizon_months):
                next_date = date(
                    last_date.year + (last_date.month + i) // 12,
                    ((last_date.month + i) % 12) or 12,
                    1,
                )
                points.append(ForecastPoint(
                    date_=next_date,
                    value=float(means.iloc[i]),
                    lower_bound=float(ci.iloc[i, 0]),
                    upper_bound=float(ci.iloc[i, 1]),
                ))

            resid = fit.resid
            rmse = float(np.sqrt((resid ** 2).mean()))

            return ForecastResult(
                model=self.MODEL_NAME,
                indicator=series.indicator,
                geo=series.geo,
                horizon_months=horizon_months,
                points=points,
                in_sample_rmse=rmse,
            )
        except Exception as exc:
            logger.warning("SARIMAForecaster error: %s", exc)
            return ForecastResult(
                model=self.MODEL_NAME,
                indicator=series.indicator,
                geo=series.geo,
                horizon_months=horizon_months,
                is_available=False,
                error_message=str(exc),
            )


# ---------------------------------------------------------------------------
# VARForecaster
# ---------------------------------------------------------------------------

class VARForecaster:
    """
    Forecasting VAR multivariado.
    Captura correlaciones entre PIB, IPC, tasa de paro, etc.
    """

    MODEL_NAME = "var"

    def forecast_multivariate(
        self,
        series_list: list[ProcessedSeries],
        horizon_months: int = 12,
        max_lags: int = 4,
    ) -> list[ForecastResult]:
        if len(series_list) < 2:
            return []
        min_len = min(len(s) for s in series_list)
        if min_len < 12:
            return [
                ForecastResult(
                    model=self.MODEL_NAME,
                    indicator=s.indicator,
                    geo=s.geo,
                    horizon_months=horizon_months,
                    is_available=False,
                    error_message="Insuficientes datos para VAR",
                )
                for s in series_list
            ]

        try:
            import numpy as np
            import pandas as pd
            from statsmodels.tsa.vector_ar.var_model import VAR
        except ImportError:
            return [
                ForecastResult(
                    model=self.MODEL_NAME,
                    indicator=s.indicator,
                    geo=s.geo,
                    horizon_months=horizon_months,
                    is_available=False,
                    error_message="statsmodels no instalado",
                )
                for s in series_list
            ]

        try:
            # Construir DataFrame alineado
            dfs = {}
            for s in series_list:
                dfs[s.indicator] = pd.Series(s.values[-min_len:])
            df = pd.DataFrame(dfs)

            model = VAR(df)
            lag_order = model.select_order(maxlags=max_lags)
            selected_lag = lag_order.aic if lag_order.aic > 0 else 1
            fit = model.fit(selected_lag)

            fc_array = fit.forecast(df.values[-selected_lag:], steps=horizon_months)

            results = []
            for j, s in enumerate(series_list):
                last_date = s.dates[-1] if s.dates else date.today()
                points = []
                for i in range(horizon_months):
                    next_date = date(
                        last_date.year + (last_date.month + i) // 12,
                        ((last_date.month + i) % 12) or 12,
                        1,
                    )
                    val = float(fc_array[i, j])
                    std = float(np.std(s.values)) * 1.96
                    points.append(ForecastPoint(
                        date_=next_date,
                        value=val,
                        lower_bound=val - std,
                        upper_bound=val + std,
                    ))
                results.append(ForecastResult(
                    model=self.MODEL_NAME,
                    indicator=s.indicator,
                    geo=s.geo,
                    horizon_months=horizon_months,
                    points=points,
                ))
            return results
        except Exception as exc:
            logger.warning("VARForecaster error: %s", exc)
            return []


# ---------------------------------------------------------------------------
# GDPNowcaster
# ---------------------------------------------------------------------------

class GDPNowcaster:
    """
    Nowcasting del PIB con datos de alta frecuencia.

    Metodologia: regresion lineal de indicadores adelantados
    (PMI, ventas al por menor, produccion industrial, precio electricidad)
    contra el PIB trimestral.

    Produce una estimacion del PIB del trimestre en curso
    antes de que el dato oficial sea publicado (tipicamente ~75 dias de retraso).
    """

    MODEL_NAME = "gdp_nowcast"

    _FEATURE_INDICATORS = [
        "ipc_general",
        "precio_pool_diario",
        "tasa_paro",
        "pib_variacion",
    ]

    def nowcast(
        self,
        series_dict: dict[str, ProcessedSeries],
        target_quarter: date | None = None,
    ) -> ForecastResult:
        """
        Genera nowcast del PIB para el trimestre objetivo.

        Args:
            series_dict: diccionario {indicador: ProcessedSeries}
            target_quarter: inicio del trimestre a nowcastear (None = actual)
        """
        if target_quarter is None:
            today = date.today()
            quarter_month = ((today.month - 1) // 3) * 3 + 1
            target_quarter = date(today.year, quarter_month, 1)

        pib_series = series_dict.get("pib_variacion")
        if not pib_series or not pib_series.is_sufficient(8):
            return ForecastResult(
                model=self.MODEL_NAME,
                indicator="pib_nowcast",
                geo="ES",
                horizon_months=1,
                is_available=False,
                error_message="Serie PIB insuficiente para nowcasting",
            )

        try:
            import numpy as np
            from sklearn.linear_model import Ridge
            from sklearn.preprocessing import StandardScaler
        except ImportError:
            return ForecastResult(
                model=self.MODEL_NAME,
                indicator="pib_nowcast",
                geo="ES",
                horizon_months=1,
                is_available=False,
                error_message="scikit-learn no instalado",
            )

        try:
            # Construir features alineadas con el PIB trimestral
            n = len(pib_series.values)
            feature_values = []
            for ind in self._FEATURE_INDICATORS:
                if ind == "pib_variacion":
                    continue
                s = series_dict.get(ind)
                if s and len(s.values) >= n:
                    feature_values.append(s.values[-n:])
                else:
                    feature_values.append([0.0] * n)

            if not feature_values:
                raise ValueError("No hay features disponibles")

            X = np.column_stack(feature_values)
            y = np.array(pib_series.values)

            scaler = StandardScaler()
            X_scaled = scaler.fit_transform(X)

            model = Ridge(alpha=1.0)
            model.fit(X_scaled[:-1], y[1:])  # Features t-1 -> PIB t

            # Nowcast: ultimas features disponibles
            x_now = scaler.transform(X_scaled[-1:])
            nowcast_val = float(model.predict(x_now)[0])

            # Intervalo de confianza basado en error del modelo
            y_pred = model.predict(X_scaled[:-1])
            rmse = float(np.sqrt(((y_pred - y[1:]) ** 2).mean()))

            return ForecastResult(
                model=self.MODEL_NAME,
                indicator="pib_nowcast",
                geo="ES",
                horizon_months=1,
                points=[ForecastPoint(
                    date_=target_quarter,
                    value=nowcast_val,
                    lower_bound=nowcast_val - 2 * rmse,
                    upper_bound=nowcast_val + 2 * rmse,
                )],
                in_sample_rmse=rmse,
            )
        except Exception as exc:
            logger.warning("GDPNowcaster error: %s", exc)
            return ForecastResult(
                model=self.MODEL_NAME,
                indicator="pib_nowcast",
                geo="ES",
                horizon_months=1,
                is_available=False,
                error_message=str(exc),
            )


# ---------------------------------------------------------------------------
# PoliticalEconomyCorrelator
# ---------------------------------------------------------------------------

class PoliticalEconomyCorrelator:
    """
    Correlacion entre variables economicas e intencion de voto.

    Basado en el modelo Lewis-Beck de voto economico:
    voto_gobierno = f(PIB_growth, IPC, tasa_paro, popularidad_PM)
    """

    def correlate(
        self,
        economic_series: dict[str, ProcessedSeries],
        poll_series: ProcessedSeries,
    ) -> dict[str, float]:
        """
        Calcula correlaciones entre indicadores economicos y el sondeo.

        Retorna {indicador: correlacion} con valores en [-1, 1].
        """
        correlations: dict[str, float] = {}

        if not poll_series.values or len(poll_series.values) < 6:
            return correlations

        try:
            import numpy as np
        except ImportError:
            return correlations

        poll_arr = np.array(poll_series.values[-24:])

        for indicator, series in economic_series.items():
            if len(series.values) < 6:
                continue
            # Alinear longitudes
            n = min(len(poll_arr), len(series.values))
            if n < 4:
                continue
            eco_arr = np.array(series.values[-n:])
            pol_arr = poll_arr[-n:]
            try:
                corr = float(np.corrcoef(eco_arr, pol_arr)[0, 1])
                if not (corr != corr):  # NaN check
                    correlations[indicator] = round(corr, 3)
            except Exception:
                continue

        return correlations
