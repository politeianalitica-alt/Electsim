"""Servicio de negocio para modulo de impacto de campana."""

from __future__ import annotations

import pandas as pd

from dashboard.db_impacto import (
    cargar_resultados_evento,
    cargar_snapshots_evento,
    crear_evento,
    guardar_resultado_impacto,
    guardar_snapshot,
    listar_eventos,
)
from dashboard.models.impact import (
    ResultadoImpacto,
    calcular_bsts,
    calcular_diff_diff,
    calcular_pre_post,
)

METRICAS_DEFAULT = [
    "intencion_voto_pct",
    "valoracion_lider",
    "conocimiento_pct",
    "menciones_prensa",
    "menciones_rrss",
    "sentiment_medio",
    "engagement_rrss",
]

TIPOS_EVENTO = [
    "mitin",
    "entrevista",
    "anuncio_digital",
    "puerta_a_puerta",
    "debate",
    "rueda_prensa",
    "spot",
    "otro",
]



def get_eventos(cliente_id: int | None = None) -> pd.DataFrame:
    return listar_eventos(cliente_id=cliente_id, solo_activos=True)



def registrar_evento(datos: dict) -> int:
    return crear_evento(datos)



def registrar_snapshot(evento_id: int, ventana: str, datos: dict) -> None:
    guardar_snapshot(evento_id=evento_id, ventana=ventana, datos=datos)



def calcular_y_guardar_impacto(
    evento_id: int,
    coste_evento: float | None = None,
    metodo: str = "pre_post",
    df_control: pd.DataFrame | None = None,
    serie_intencion: pd.Series | None = None,
    fecha_intervencion: str | None = None,
) -> list[ResultadoImpacto]:
    df_snap = cargar_snapshots_evento(evento_id)
    if df_snap.empty:
        return []

    resultados: list[ResultadoImpacto] = []

    if metodo == "pre_post":
        resultados = calcular_pre_post(df_snap, METRICAS_DEFAULT, coste_evento)
    elif metodo == "diff_diff"and df_control is not None:
        resultados = calcular_diff_diff(df_snap, df_control, METRICAS_DEFAULT, coste_evento)
    elif metodo == "bsts"and serie_intencion is not None and fecha_intervencion:
        r = calcular_bsts(serie_intencion, fecha_intervencion, coste_evento)
        if r is not None:
            resultados = [r]

    if resultados:
        guardar_resultado_impacto(evento_id, [r.to_dict() for r in resultados])

    return resultados



def get_resultados_guardados(evento_id: int) -> pd.DataFrame:
    return cargar_resultados_evento(evento_id)
