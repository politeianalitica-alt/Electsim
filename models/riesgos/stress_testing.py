"""
Stress testing de coaliciones ante escenarios adversos.
"""

from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass

import numpy as np
import pandas as pd
from sqlalchemy import create_engine, text

from models.estrategicos.coaliciones import obtener_escanos_ultima_eleccion

logger = logging.getLogger(__name__)


@dataclass
class EscenarioStress:
    nombre: str
    descripcion: str
    probabilidad_ocurrencia: float
    impacto_por_partido: dict[str, float]
    riesgo_ruptura_coalicion: float


ESCENARIOS_STRESS_ESPAÑA: list[EscenarioStress] = [
    EscenarioStress(
        nombre="shock_energetico",
        descripcion="Precio luz +50%, gasolina +30%, duración >6 meses",
        probabilidad_ocurrencia=0.20,
        impacto_por_partido={
            "PSOE": -4.5,
            "SUMAR": -2.0,
            "PP": 2.5,
            "VOX": 2.0,
            "PNV": -0.5,
            "ERC": -0.5,
        },
        riesgo_ruptura_coalicion=0.30,
    ),
    EscenarioStress(
        nombre="escandalo_corrupcion_grave",
        descripcion="Caso de corrupción con imputados de primera línea del gobierno",
        probabilidad_ocurrencia=0.25,
        impacto_por_partido={
            "PSOE": -6.0,
            "SUMAR": -1.5,
            "PP": 1.5,
            "VOX": 1.0,
            "CS": 0.5,
        },
        riesgo_ruptura_coalicion=0.45,
    ),
    EscenarioStress(
        nombre="crisis_territorial_cataluna",
        descripcion="Declaración unilateral independencia o suspensión autonomía",
        probabilidad_ocurrencia=0.15,
        impacto_por_partido={
            "PSOE": -3.0,
            "SUMAR": -1.0,
            "PP": 3.0,
            "VOX": 4.0,
            "ERC": 1.0,
            "JUNTS": 1.5,
        },
        riesgo_ruptura_coalicion=0.60,
    ),
    EscenarioStress(
        nombre="recesion_economica",
        descripcion="PIB -2% durante dos trimestres consecutivos, paro >17%",
        probabilidad_ocurrencia=0.12,
        impacto_por_partido={
            "PSOE": -7.0,
            "SUMAR": -3.0,
            "PP": 3.5,
            "VOX": 2.5,
            "CS": 0.5,
        },
        riesgo_ruptura_coalicion=0.50,
    ),
    EscenarioStress(
        nombre="cambio_liderazgo_oposicion",
        descripcion="Nuevo líder PP más moderado o más confrontacional",
        probabilidad_ocurrencia=0.35,
        impacto_por_partido={
            "PP": 2.0,
            "VOX": -1.0,
            "CS": -0.5,
            "PSOE": -1.0,
        },
        riesgo_ruptura_coalicion=0.05,
    ),
]


def stress_test_completo(
    estimaciones_base: pd.DataFrame,
    coalicion_actual: list[str],
    escenarios: list[EscenarioStress] | None = None,
) -> pd.DataFrame:
    if escenarios is None:
        escenarios = ESCENARIOS_STRESS_ESPAÑA

    def escanos_prop(est: pd.DataFrame, cols: list[str]) -> float:
        tot = 0.0
        for p in cols:
            row = est[est["partido"] == p]
            if row.empty:
                continue
            tot += float(row.iloc[0]["estimacion_pct"]) / 100.0 * 350.0
        return tot

    base = estimaciones_base.copy()
    escanos_base = escanos_prop(base, coalicion_actual)
    filas: list[dict] = []

    for esc in escenarios:
        est = estimaciones_base.copy()
        for i in est.index:
            p = est.at[i, "partido"]
            delta = esc.impacto_por_partido.get(str(p), 0.0)
            est.at[i, "estimacion_pct"] = max(0.0, float(est.at[i, "estimacion_pct"]) + delta)
        s = est["estimacion_pct"].sum()
        if s > 0:
            est["estimacion_pct"] = est["estimacion_pct"] / s * 100.0
        esc_st = escanos_prop(est, coalicion_actual)
        perdida = escanos_base - esc_st
        vare = perdida * 1.65
        riesgo_c = esc.probabilidad_ocurrencia * max(perdida, 0.0) * (1.0 + esc.riesgo_ruptura_coalicion)
        filas.append(
            {
                "escenario": esc.nombre,
                "descripcion": esc.descripcion,
                "probabilidad": esc.probabilidad_ocurrencia,
                "escanos_coalicion_base": round(escanos_base, 2),
                "escanos_coalicion_stress": round(esc_st, 2),
                "perdida_escanos": round(perdida, 2),
                "pierden_mayoria": esc_st < 176,
                "riesgo_ruptura_coalicion": esc.riesgo_ruptura_coalicion,
                "vare_95": round(vare, 2),
                "riesgo_compuesto": round(riesgo_c, 3),
            }
        )

    return pd.DataFrame(filas).sort_values("riesgo_compuesto", ascending=False)


def guardar_stress_test(df: pd.DataFrame, engine, coalicion: list[str]) -> None:
    sql = text(
        """
        INSERT INTO stress_test_resultados (
            escenario_nombre, coalicion_analizada, escanos_base, escanos_stress,
            perdida_escanos, pierden_mayoria, riesgo_ruptura_coalicion, vare_95, riesgo_compuesto
        ) VALUES (
            :nom, :coal, :eb, :es, :pe, :pm, :rr, :va, :rc
        )
        """
    )
    coal_txt = json.dumps(coalicion, ensure_ascii=False)
    with engine.begin() as conn:
        for _, row in df.iterrows():
            conn.execute(
                sql,
                {
                    "nom": row["escenario"],
                    "coal": coal_txt,
                    "eb": row["escanos_coalicion_base"],
                    "es": row["escanos_coalicion_stress"],
                    "pe": row["perdida_escanos"],
                    "pm": bool(row["pierden_mayoria"]),
                    "rr": row["riesgo_ruptura_coalicion"],
                    "va": row["vare_95"],
                    "rc": row["riesgo_compuesto"],
                },
            )


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    from models.estadisticos.nowcasting import agregar_encuestas, cargar_encuestas_bd

    engine = create_engine(os.environ["DATABASE_URL"])
    raw = cargar_encuestas_bd(engine)
    if raw.empty:
        print("Sin estimaciones. Ejecuta nowcasting primero.")
        raise SystemExit(1)
    est = agregar_encuestas(raw)
    df_st = stress_test_completo(est, ["PSOE", "SUMAR"])
    guardar_stress_test(df_st, engine, ["PSOE", "SUMAR"])
    print(df_st[["escenario", "perdida_escanos", "pierden_mayoria", "riesgo_compuesto"]].to_string())
