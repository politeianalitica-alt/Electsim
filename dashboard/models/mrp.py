"""
MRP simplificado por CCAA para España.

Aplica factores de ajuste regionales calibrados contra resultados electorales
reales (elecciones generales 2019-abril / 2019-noviembre / 2023) para
generar estimaciones subregionales a partir de sondeos nacionales.

Sin dependencias ML — tabla de ajuste + regla de tres.
"""

from __future__ import annotations

from dataclasses import dataclass, field
import pandas as pd


# ── Factores de ajuste regional (desviación histórica promedio vs. media nacional)
# Positivo = la CCAA tiende a dar más voto del que el promedio nacional indica.
# Fuente: INE resultados electorales 2019-A, 2019-N, 2023.
# Los partidos regionales (ERC, Junts, PNV…) NO aparecen aquí —
# se modelan directamente como sólo presentes en sus CCAA.

_FACTORES: dict[str, dict[str, float]] = {
    # CCAA: {partido_siglas: factor_multiplicativo}
    "Andalucía": {
        "PP": 1.12, "PSOE": 0.95, "VOX": 1.18, "SUMAR": 0.85,
        "Cs": 0.90, "IU": 0.88,
    },
    "Aragón": {
        "PP": 1.08, "PSOE": 0.92, "VOX": 1.10, "SUMAR": 0.95,
    },
    "Asturias": {
        "PP": 0.94, "PSOE": 1.12, "VOX": 0.80, "SUMAR": 1.15,
    },
    "Baleares": {
        "PP": 1.05, "PSOE": 0.98, "VOX": 1.08, "SUMAR": 0.92,
    },
    "Canarias": {
        "PP": 0.92, "PSOE": 1.05, "VOX": 0.88, "SUMAR": 1.02,
        "CC": 8.5,  # Coalición Canaria concentrada aquí
    },
    "Cantabria": {
        "PP": 1.10, "PSOE": 0.93, "VOX": 1.05, "SUMAR": 0.88,
        "PRC": 12.0,
    },
    "Castilla-La Mancha": {
        "PP": 1.10, "PSOE": 1.05, "VOX": 1.15, "SUMAR": 0.82,
    },
    "Castilla y León": {
        "PP": 1.18, "PSOE": 0.88, "VOX": 1.12, "SUMAR": 0.80,
    },
    "Cataluña": {
        "PP": 0.62, "PSOE": 0.90, "VOX": 0.72, "SUMAR": 1.05,
        "ERC": 18.0, "Junts": 15.0, "CUP": 3.5, "PSC": 0.0,
    },
    "C. Valenciana": {
        "PP": 1.05, "PSOE": 1.02, "VOX": 1.08, "SUMAR": 1.02,
        "Compromís": 5.5,
    },
    "Extremadura": {
        "PP": 1.05, "PSOE": 1.08, "VOX": 1.10, "SUMAR": 0.90,
    },
    "Galicia": {
        "PP": 1.22, "PSOE": 0.88, "VOX": 0.78, "SUMAR": 0.92,
        "BNG": 9.5,
    },
    "Madrid": {
        "PP": 1.15, "PSOE": 0.92, "VOX": 1.05, "SUMAR": 0.95,
        "Más Madrid": 8.0,
    },
    "Murcia": {
        "PP": 1.18, "PSOE": 0.85, "VOX": 1.25, "SUMAR": 0.78,
    },
    "Navarra": {
        "PP": 0.95, "PSOE": 0.88, "VOX": 0.92, "SUMAR": 0.95,
        "UPN": 6.5, "EH Bildu": 7.0, "PNV": 4.5, "Geroa Bai": 5.0,
    },
    "País Vasco": {
        "PP": 0.38, "PSOE": 0.72, "VOX": 0.25, "SUMAR": 0.85,
        "PNV": 30.0, "EH Bildu": 22.0,
    },
    "La Rioja": {
        "PP": 1.12, "PSOE": 0.95, "VOX": 1.08, "SUMAR": 0.88,
    },
    "Ceuta": {
        "PP": 1.15, "PSOE": 0.88, "VOX": 1.30, "SUMAR": 0.70,
    },
    "Melilla": {
        "PP": 1.05, "PSOE": 0.92, "VOX": 1.20, "SUMAR": 0.72,
    },
}

# Partidos regionales (solo compiten en su territorio)
_REGIONALES: dict[str, list[str]] = {
    "ERC": ["Cataluña"],
    "Junts": ["Cataluña"],
    "CUP": ["Cataluña"],
    "PNV": ["País Vasco", "Navarra"],
    "EH Bildu": ["País Vasco", "Navarra"],
    "BNG": ["Galicia"],
    "CC": ["Canarias"],
    "PRC": ["Cantabria"],
    "UPN": ["Navarra"],
    "Compromís": ["C. Valenciana"],
    "Más Madrid": ["Madrid"],
    "Geroa Bai": ["Navarra"],
}

CCAA_LIST = list(_FACTORES.keys())


@dataclass
class MRPResult:
    ccaa: str
    partido: str
    estimacion_nacional: float   # estimación base del sondeo nacional
    estimacion_regional: float   # ajustada por factor MRP
    factor_aplicado: float
    es_regional: bool            # partido sólo presente en esta CCAA


def run_mrp_ccaa(
    polls_df: pd.DataFrame,
    col_partido: str = "partido_siglas",
    col_estimacion: str = "estimacion_pct",
    poststrat_df: pd.DataFrame | None = None,
) -> pd.DataFrame:
    """
    Genera estimaciones por CCAA aplicando factores de ajuste regional.

    Parameters
    ----------
    polls_df      : DataFrame con partido_siglas, estimacion_pct (sondeo nacional)
    poststrat_df  : Ignorado (interfaz legacy). Los pesos demográficos están
                    implícitos en los factores históricos.

    Returns
    -------
    DataFrame con columnas: ccaa, partido, estimacion_nacional,
                             estimacion_regional, factor_aplicado, es_regional
    """
    if polls_df.empty:
        return pd.DataFrame(columns=[
            "ccaa", "partido", "estimacion_nacional", "estimacion_regional",
            "factor_aplicado", "es_regional",
        ])

    # Mapa partido → estimación nacional
    nacional: dict[str, float] = {
        str(r[col_partido]): float(r[col_estimacion])
        for _, r in polls_df.iterrows()
        if col_partido in polls_df.columns and col_estimacion in polls_df.columns
    }
    if not nacional:
        return pd.DataFrame()

    rows: list[dict] = []

    for ccaa, factores in _FACTORES.items():
        for partido, factor in factores.items():
            es_regional = partido in _REGIONALES
            if es_regional:
                # Partidos regionales: el factor es la estimación directa (no multiplicativo)
                est_nacional = 0.0
                est_regional = round(factor, 1)
            else:
                est_nacional = nacional.get(partido, 0.0)
                est_regional = round(est_nacional * factor, 1)

            rows.append({
                "ccaa": ccaa,
                "partido": partido,
                "estimacion_nacional": est_nacional,
                "estimacion_regional": est_regional,
                "factor_aplicado": factor,
                "es_regional": es_regional,
            })

        # Añadir también los partidos del sondeo nacional sin factor explícito
        partidos_ccaa = set(factores.keys())
        for partido, est in nacional.items():
            if partido not in partidos_ccaa and partido not in _REGIONALES:
                rows.append({
                    "ccaa": ccaa,
                    "partido": partido,
                    "estimacion_nacional": est,
                    "estimacion_regional": round(est, 1),  # sin ajuste
                    "factor_aplicado": 1.0,
                    "es_regional": False,
                })

    df = pd.DataFrame(rows)

    # Normalizar por CCAA para que sumen ~100%
    totales = df.groupby("ccaa")["estimacion_regional"].sum()
    df = df.merge(totales.rename("total_ccaa"), on="ccaa")
    df["estimacion_regional_norm"] = (df["estimacion_regional"] / df["total_ccaa"] * 100).round(1)
    df = df.drop(columns=["total_ccaa"])

    return df.sort_values(["ccaa", "estimacion_regional_norm"], ascending=[True, False])


def mrp_pivot(df_mrp: pd.DataFrame) -> pd.DataFrame:
    """Pivota el resultado MRP en forma de tabla ccaa × partido."""
    if df_mrp.empty:
        return pd.DataFrame()
    return (
        df_mrp.pivot_table(
            index="ccaa",
            columns="partido",
            values="estimacion_regional_norm",
            aggfunc="first",
        )
        .fillna(0)
        .round(1)
    )


def ccaa_leader(df_mrp: pd.DataFrame) -> pd.DataFrame:
    """Devuelve el partido líder y su estimación para cada CCAA."""
    if df_mrp.empty:
        return pd.DataFrame()
    col = "estimacion_regional_norm" if "estimacion_regional_norm" in df_mrp.columns else "estimacion_regional"
    return (
        df_mrp.sort_values(col, ascending=False)
        .groupby("ccaa")
        .first()
        .reset_index()[["ccaa", "partido", col]]
        .rename(columns={col: "estimacion_lider"})
    )
