"""
Monitor de sesgo (house effects) para encuestas electorales españolas.

Detecta:
  - Efectos de casa por empresa demoscópica
  - Encuestas outlier (>2σ del consenso)
  - Estimación consenso corregida por sesgo histórico

Sin dependencias externas más allá de pandas/numpy.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional
import numpy as np
import pandas as pd


@dataclass
class HouseEffect:
    """Sesgo estimado de una empresa demoscópica por partido."""
    empresa: str
    partido: str
    bias_pp: float       # sesgo medio en pp (positivo = sobreestima)
    n_encuestas: int
    std_pp: float        # desviación estándar del sesgo
    confiable: bool      # True si n_encuestas >= 3


@dataclass
class BiasReport:
    house_effects: list[HouseEffect] = field(default_factory=list)
    outliers: list[dict] = field(default_factory=list)  # encuestas sospechosas
    consensus: pd.DataFrame = field(default_factory=pd.DataFrame)  # estimación corregida
    n_encuestas: int = 0
    n_empresas: int = 0


def compute_house_effects(
    polls_df: pd.DataFrame,
    results_df: Optional[pd.DataFrame] = None,
    col_empresa: str = "empresa",
    col_partido: str = "partido_siglas",
    col_estimacion: str = "estimacion_pct",
    col_resultado: str = "resultado_pct",
    min_encuestas: int = 3,
) -> list[HouseEffect]:
    """
    Estima el house effect de cada empresa comparando sus encuestas contra
    el promedio del resto de casas (si no hay resultados reales disponibles)
    o contra resultados electorales reales.

    Parameters
    ----------
    polls_df    : DataFrame con columnas empresa, partido, estimacion_pct (y opcionalmente fecha)
    results_df  : DataFrame con partido, resultado_pct para comparar contra resultados reales
    """
    if polls_df.empty:
        return []

    needed = {col_empresa, col_partido, col_estimacion}
    if not needed.issubset(polls_df.columns):
        return []

    effects: list[HouseEffect] = []

    if results_df is not None and not results_df.empty and col_resultado in results_df.columns:
        # Modo supervisado: comparar cada encuesta contra resultado real
        merged = polls_df.merge(
            results_df[[col_partido, col_resultado]],
            on=col_partido, how="inner",
        )
        if merged.empty:
            return []
        merged["error"] = merged[col_estimacion] - merged[col_resultado]

        for (empresa, partido), grp in merged.groupby([col_empresa, col_partido]):
            n = len(grp)
            if n < 1:
                continue
            bias = float(grp["error"].mean())
            std = float(grp["error"].std()) if n > 1 else 0.0
            effects.append(HouseEffect(
                empresa=str(empresa),
                partido=str(partido),
                bias_pp=round(bias, 2),
                n_encuestas=n,
                std_pp=round(std, 2),
                confiable=n >= min_encuestas,
            ))
    else:
        # Modo no supervisado: cada empresa vs. media del resto (jackknife)
        empresas = polls_df[col_empresa].unique()
        for empresa in empresas:
            df_casa = polls_df[polls_df[col_empresa] == empresa]
            df_otras = polls_df[polls_df[col_empresa] != empresa]
            if df_otras.empty:
                continue

            consenso_otras = df_otras.groupby(col_partido)[col_estimacion].mean()

            for partido in df_casa[col_partido].unique():
                est_casa = df_casa[df_casa[col_partido] == partido][col_estimacion]
                if est_casa.empty or partido not in consenso_otras.index:
                    continue
                referencia = consenso_otras[partido]
                errores = est_casa - referencia
                n = len(errores)
                bias = float(errores.mean())
                std = float(errores.std()) if n > 1 else 0.0
                effects.append(HouseEffect(
                    empresa=str(empresa),
                    partido=str(partido),
                    bias_pp=round(bias, 2),
                    n_encuestas=n,
                    std_pp=round(std, 2),
                    confiable=n >= min_encuestas,
                ))

    return effects


def flag_outlier_polls(
    polls_df: pd.DataFrame,
    col_empresa: str = "empresa",
    col_partido: str = "partido_siglas",
    col_estimacion: str = "estimacion_pct",
    col_fecha: str = "fecha",
    sigma_threshold: float = 2.0,
    ventana_dias: int = 30,
) -> list[dict]:
    """
    Detecta encuestas cuya estimación para un partido es un outlier
    estadístico respecto al resto de encuestas en la misma ventana temporal.
    """
    if polls_df.empty:
        return []
    needed = {col_partido, col_estimacion, col_empresa}
    if not needed.issubset(polls_df.columns):
        return []

    df = polls_df.copy()
    if col_fecha in df.columns:
        df[col_fecha] = pd.to_datetime(df[col_fecha], errors="coerce")
        fecha_max = df[col_fecha].max()
        df = df[df[col_fecha] >= fecha_max - pd.Timedelta(days=ventana_dias)]

    outliers = []
    for partido, grp in df.groupby(col_partido):
        if len(grp) < 4:
            continue
        media = grp[col_estimacion].mean()
        std = grp[col_estimacion].std()
        if std < 0.01:
            continue
        sospechosas = grp[(grp[col_estimacion] - media).abs() > sigma_threshold * std]
        for _, row in sospechosas.iterrows():
            outliers.append({
                "empresa": row.get(col_empresa, "?"),
                "partido": partido,
                "estimacion": round(float(row[col_estimacion]), 1),
                "media_consenso": round(float(media), 1),
                "desviacion_sigma": round(float(abs(row[col_estimacion] - media) / std), 2),
                "fecha": str(row.get(col_fecha, ""))[:10],
            })

    return sorted(outliers, key=lambda x: x["desviacion_sigma"], reverse=True)


def consensus_estimate(
    polls_df: pd.DataFrame,
    house_effects: Optional[list[HouseEffect]] = None,
    col_empresa: str = "empresa",
    col_partido: str = "partido_siglas",
    col_estimacion: str = "estimacion_pct",
    col_fecha: str = "fecha",
    ventana_dias: int = 30,
    decay_half_life_days: int = 14,
) -> pd.DataFrame:
    """
    Calcula estimación consenso con:
      1. Corrección por house effect (si se proporcionan)
      2. Ponderación temporal exponencial (encuestas recientes pesan más)
      3. Media ponderada por empresa (una empresa = un voto, no N)

    Returns DataFrame con partido, estimacion_raw, estimacion_corregida, n_encuestas.
    """
    if polls_df.empty:
        return pd.DataFrame()

    needed = {col_partido, col_estimacion}
    if not needed.issubset(polls_df.columns):
        return pd.DataFrame()

    df = polls_df.copy()

    # Ventana temporal
    if col_fecha in df.columns:
        df[col_fecha] = pd.to_datetime(df[col_fecha], errors="coerce")
        fecha_max = df[col_fecha].max()
        df = df[df[col_fecha] >= fecha_max - pd.Timedelta(days=ventana_dias)].copy()

        # Peso temporal exponencial
        dias_atras = (fecha_max - df[col_fecha]).dt.days.fillna(ventana_dias)
        df["peso_temporal"] = np.exp(-np.log(2) * dias_atras / decay_half_life_days)
    else:
        df["peso_temporal"] = 1.0

    # Corrección por house effect
    bias_lookup: dict[tuple[str, str], float] = {}
    if house_effects:
        for he in house_effects:
            if he.confiable:
                bias_lookup[(he.empresa, he.partido)] = he.bias_pp

    if col_empresa in df.columns and bias_lookup:
        def _corregir(row: pd.Series) -> float:
            bias = bias_lookup.get((str(row[col_empresa]), str(row[col_partido])), 0.0)
            return float(row[col_estimacion]) - bias
        df["estimacion_corregida"] = df.apply(_corregir, axis=1)
    else:
        df["estimacion_corregida"] = df[col_estimacion]

    # Media ponderada por empresa (dentro de cada empresa, promedio simple primero)
    if col_empresa in df.columns:
        df_emp = (
            df.groupby([col_empresa, col_partido])
            .apply(lambda g: pd.Series({
                "est_raw": np.average(g[col_estimacion], weights=g["peso_temporal"]),
                "est_corr": np.average(g["estimacion_corregida"], weights=g["peso_temporal"]),
                "n": len(g),
            }))
            .reset_index()
        )
        result = (
            df_emp.groupby(col_partido)
            .agg(
                estimacion_raw=("est_raw", "mean"),
                estimacion_corregida=("est_corr", "mean"),
                n_encuestas=("n", "sum"),
            )
            .reset_index()
        )
    else:
        result = (
            df.groupby(col_partido)
            .agg(
                estimacion_raw=(col_estimacion, lambda x: np.average(x, weights=df.loc[x.index, "peso_temporal"])),
                estimacion_corregida=("estimacion_corregida", lambda x: np.average(x, weights=df.loc[x.index, "peso_temporal"])),
                n_encuestas=(col_estimacion, "count"),
            )
            .reset_index()
        )

    result = result.rename(columns={col_partido: "partido"})
    result[["estimacion_raw", "estimacion_corregida"]] = result[
        ["estimacion_raw", "estimacion_corregida"]
    ].round(2)
    return result.sort_values("estimacion_corregida", ascending=False).reset_index(drop=True)


def build_bias_report(
    polls_df: pd.DataFrame,
    results_df: Optional[pd.DataFrame] = None,
    **kwargs,
) -> BiasReport:
    """Pipeline completo: house effects + outliers + consenso."""
    effects = compute_house_effects(polls_df, results_df, **{
        k: v for k, v in kwargs.items()
        if k in {"col_empresa", "col_partido", "col_estimacion", "col_resultado", "min_encuestas"}
    })
    outliers = flag_outlier_polls(polls_df)
    consensus = consensus_estimate(polls_df, house_effects=effects)

    return BiasReport(
        house_effects=effects,
        outliers=outliers,
        consensus=consensus,
        n_encuestas=len(polls_df),
        n_empresas=int(polls_df["empresa"].nunique()) if "empresa" in polls_df.columns else 0,
    )
