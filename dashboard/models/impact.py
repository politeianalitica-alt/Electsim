"""Modelos de calculo de impacto de campana."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

import numpy as np
import pandas as pd


@dataclass
class ResultadoImpacto:
    metrica: str
    delta_absoluto: float
    delta_relativo_pct: float
    coste_por_punto: Optional[float]
    metodo: str
    intervalo_inf: Optional[float] = None
    intervalo_sup: Optional[float] = None
    confianza: Optional[float] = None

    def to_dict(self) -> dict:
        return {
            "metrica": self.metrica,
            "delta_absoluto": float(self.delta_absoluto),
            "delta_relativo_pct": float(self.delta_relativo_pct),
            "coste_por_punto": float(self.coste_por_punto) if self.coste_por_punto is not None else None,
            "metodo": self.metodo,
            "intervalo_inf": float(self.intervalo_inf) if self.intervalo_inf is not None else None,
            "intervalo_sup": float(self.intervalo_sup) if self.intervalo_sup is not None else None,
            "confianza": float(self.confianza) if self.confianza is not None else None,
        }



def _bootstrap_ci_delta(pre: np.ndarray, post: np.ndarray, n_boot: int = 500) -> tuple[float, float]:
    rng = np.random.default_rng(42)
    deltas: list[float] = []
    for _ in range(int(n_boot)):
        s_pre = rng.choice(pre, size=len(pre), replace=True).mean()
        s_post = rng.choice(post, size=len(post), replace=True).mean()
        deltas.append(float(s_post - s_pre))
    return float(np.percentile(deltas, 5)), float(np.percentile(deltas, 95))



def calcular_pre_post(
    df_snapshots: pd.DataFrame,
    metricas: list[str],
    coste_evento: float | None = None,
) -> list[ResultadoImpacto]:
    """Compara media `pre_7d` vs `post_7d` con IC bootstrap."""
    if df_snapshots.empty or "ventana" not in df_snapshots.columns:
        return []

    pre_df = df_snapshots[df_snapshots["ventana"] == "pre_7d"]
    post_df = df_snapshots[df_snapshots["ventana"] == "post_7d"]
    if pre_df.empty or post_df.empty:
        return []

    out: list[ResultadoImpacto] = []

    for metrica in metricas:
        if metrica not in pre_df.columns or metrica not in post_df.columns:
            continue

        pre = pd.to_numeric(pre_df[metrica], errors="coerce").dropna().astype(float).values
        post = pd.to_numeric(post_df[metrica], errors="coerce").dropna().astype(float).values
        if len(pre) == 0 or len(post) == 0:
            continue

        mu_pre = float(pre.mean())
        mu_post = float(post.mean())
        delta = mu_post - mu_pre
        delta_rel = (delta / mu_pre * 100.0) if mu_pre != 0 else 0.0
        ci_low, ci_high = _bootstrap_ci_delta(pre, post)

        cpp = None
        if coste_evento and delta != 0:
            cpp = abs(float(coste_evento) / float(delta))

        out.append(
            ResultadoImpacto(
                metrica=metrica,
                delta_absoluto=delta,
                delta_relativo_pct=delta_rel,
                coste_por_punto=cpp,
                metodo="pre_post",
                intervalo_inf=ci_low,
                intervalo_sup=ci_high,
                confianza=0.90,
            )
        )

    return out



def calcular_diff_diff(
    df_tratamiento: pd.DataFrame,
    df_control: pd.DataFrame,
    metricas: list[str],
    coste_evento: float | None = None,
) -> list[ResultadoImpacto]:
    """Diferencia en diferencias usando ventanas pre_7d/post_7d."""
    if df_tratamiento.empty or df_control.empty:
        return []

    out: list[ResultadoImpacto] = []

    for metrica in metricas:
        if metrica not in df_tratamiento.columns or metrica not in df_control.columns:
            continue

        pre_t = pd.to_numeric(
            df_tratamiento.loc[df_tratamiento["ventana"] == "pre_7d", metrica],
            errors="coerce",
        ).dropna()
        post_t = pd.to_numeric(
            df_tratamiento.loc[df_tratamiento["ventana"] == "post_7d", metrica],
            errors="coerce",
        ).dropna()

        pre_c = pd.to_numeric(
            df_control.loc[df_control["ventana"] == "pre_7d", metrica],
            errors="coerce",
        ).dropna()
        post_c = pd.to_numeric(
            df_control.loc[df_control["ventana"] == "post_7d", metrica],
            errors="coerce",
        ).dropna()

        if pre_t.empty or post_t.empty or pre_c.empty or post_c.empty:
            continue

        did = float((post_t.mean() - pre_t.mean()) - (post_c.mean() - pre_c.mean()))
        base = float(pre_t.mean()) if float(pre_t.mean()) != 0 else 0.0
        delta_rel = (did / base * 100.0) if base != 0 else 0.0
        cpp = abs(float(coste_evento) / did) if (coste_evento and did != 0) else None

        out.append(
            ResultadoImpacto(
                metrica=metrica,
                delta_absoluto=did,
                delta_relativo_pct=delta_rel,
                coste_por_punto=cpp,
                metodo="diff_diff",
            )
        )

    return out



def calcular_bsts(
    serie_temporal: pd.Series,
    fecha_intervencion: str,
    coste_evento: float | None = None,
) -> ResultadoImpacto | None:
    """Impacto causal con CausalImpact si esta disponible."""
    try:
        from causalimpact import CausalImpact  # type: ignore
    except Exception:
        return None

    serie = serie_temporal.dropna().copy()
    if serie.empty or len(serie) < 14:
        return None

    serie.index = pd.to_datetime(serie.index)
    cutoff = pd.Timestamp(fecha_intervencion)
    if cutoff <= serie.index.min() or cutoff >= serie.index.max():
        return None

    pre_period = [serie.index.min(), cutoff - pd.Timedelta(days=1)]
    post_period = [cutoff, serie.index.max()]

    ci = CausalImpact(pd.DataFrame({"y": serie}), pre_period, post_period)
    summary = ci.summary_data

    actual = float(summary.loc["average", "actual"])
    predicted = float(summary.loc["average", "predicted"])
    delta = actual - predicted
    rel = float(summary.loc["average", "rel_effect"]) * 100.0

    pred_low = float(summary.loc["average", "predicted_lower"])
    pred_high = float(summary.loc["average", "predicted_upper"])

    cpp = abs(float(coste_evento) / delta) if (coste_evento and delta != 0) else None

    return ResultadoImpacto(
        metrica=str(serie.name or "serie"),
        delta_absoluto=delta,
        delta_relativo_pct=rel,
        coste_por_punto=cpp,
        metodo="bsts",
        intervalo_inf=pred_low,
        intervalo_sup=pred_high,
        confianza=0.95,
    )
