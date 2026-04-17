"""
Análisis morfológico de escenarios electorales (ejes × estados).
"""

from __future__ import annotations

import itertools
import json
import logging
import os
from dataclasses import dataclass

import pandas as pd
from sqlalchemy import create_engine, text

logger = logging.getLogger(__name__)


@dataclass
class Eje:
    nombre: str
    descripcion: str
    estados: list[dict]


@dataclass
class Escenario:
    id: str
    nombre: str
    estado_por_eje: dict
    probabilidad: float = 0.0
    coherencia: float = 1.0
    descripcion_narrativa: str = ""


EJES_ELECTORALES_ESPAÑA: list[Eje] = [
    Eje(
        nombre="situacion_economica",
        descripcion="Estado de la economía española en el momento electoral",
        estados=[
            {"id": "recesion", "descripcion": "PIB negativo, paro >15%", "prob": 0.15},
            {"id": "estancamiento", "descripcion": "Crecimiento <1%, paro 12-14%", "prob": 0.35},
            {"id": "recuperacion", "descripcion": "Crecimiento 2-3%, paro 10-12%", "prob": 0.40},
            {"id": "expansion", "descripcion": "Crecimiento >3%, paro <10%", "prob": 0.10},
        ],
    ),
    Eje(
        nombre="fragmentacion_derecha",
        descripcion="Nivel de fragmentación y competencia en el bloque derecha",
        estados=[
            {"id": "unida", "descripcion": "PP hegemónico, VOX residual (<5%)", "prob": 0.20},
            {"id": "competida", "descripcion": "PP y VOX competitivos (15-20% c/u)", "prob": 0.50},
            {"id": "fracturada", "descripcion": "Tres partidos competitivos (PP+VOX+nuevo)", "prob": 0.30},
        ],
    ),
    Eje(
        nombre="fragmentacion_izquierda",
        descripcion="Cohesión o fragmentación del bloque progresista",
        estados=[
            {"id": "coalicion_solida", "descripcion": "PSOE + Sumar coordinados, >40%", "prob": 0.25},
            {"id": "tension_coalition", "descripcion": "Fricciones PSOE-Sumar, 35-40%", "prob": 0.45},
            {"id": "ruptura", "descripcion": "Ruptura de coalición, <35%", "prob": 0.30},
        ],
    ),
    Eje(
        nombre="cuestion_territorial",
        descripcion="Estado de la cuestión catalana/vasca y su impacto nacional",
        estados=[
            {"id": "pacificada", "descripcion": "Acuerdos estables, tema desactivado", "prob": 0.25},
            {"id": "latente", "descripcion": "Tensión moderada, sin crisis aguda", "prob": 0.45},
            {"id": "crisis_abierta", "descripcion": "Conflicto activo, movilización ambos bloques", "prob": 0.30},
        ],
    ),
    Eje(
        nombre="liderazgo_partidos",
        descripcion="Popularidad y estabilidad de los líderes principales",
        estados=[
            {"id": "liderazgos_estables", "descripcion": "Todos los líderes consolidados", "prob": 0.35},
            {"id": "cambio_oposicion", "descripcion": "Renovación liderazgo PP o VOX", "prob": 0.35},
            {"id": "cambio_gobierno", "descripcion": "Cambio Pedro Sánchez u otro líder gubernamental", "prob": 0.30},
        ],
    ),
]

INCOMPATIBILIDADES: dict[tuple[str, str], float] = {
    ("recesion", "expansion"): 10.0,
    ("recesion", "coalicion_solida"): 3.0,
    ("expansion", "fracturada"): 2.0,
    ("crisis_abierta", "coalicion_solida"): 4.0,
    ("ruptura", "coalicion_solida"): 10.0,
}


def generar_escenarios(
    ejes: list[Eje],
    incompatibilidades: dict[tuple[str, str], float],
    top_n: int = 10,
) -> list[Escenario]:
    combinaciones = list(itertools.product(*[e.estados for e in ejes]))
    escenarios: list[Escenario] = []

    for i, combo in enumerate(combinaciones):
        estado_dict = {e.nombre: estado for e, estado in zip(ejes, combo)}
        estado_ids = [e["id"] for e in combo]
        coh = 10.0
        for (e1, e2), pen in incompatibilidades.items():
            if e1 in estado_ids and e2 in estado_ids:
                coh -= pen
        coh = max(0.0, coh) / 10.0
        if coh < 0.2:
            continue
        prob_raw = 1.0
        for estado in combo:
            prob_raw *= float(estado.get("prob", 0.25))
        prob_adj = prob_raw * coh
        escenarios.append(
            Escenario(
                id=f"SC_{i:04d}",
                nombre=f"Escenario_{i}",
                estado_por_eje=estado_dict,
                probabilidad=prob_adj,
                coherencia=coh,
            )
        )

    total = sum(e.probabilidad for e in escenarios)
    if total <= 0:
        return []
    for e in escenarios:
        e.probabilidad = e.probabilidad / total

    escenarios.sort(key=lambda x: x.probabilidad, reverse=True)
    top = escenarios[:top_n]
    t2 = sum(e.probabilidad for e in top)
    if t2 > 0:
        for e in top:
            e.probabilidad = e.probabilidad / t2
    return top


def exportar_a_bd(escenarios: list[Escenario], engine) -> None:
    stmt = text(
        """
        INSERT INTO escenarios_generados (
            id, nombre, probabilidad, coherencia, estados_json, descripcion_narrativa
        ) VALUES (
            :id, :nombre, :prob, :coh, :estados, :desc
        )
        ON CONFLICT (id) DO UPDATE SET
            probabilidad = EXCLUDED.probabilidad,
            coherencia = EXCLUDED.coherencia,
            estados_json = EXCLUDED.estados_json,
            descripcion_narrativa = EXCLUDED.descripcion_narrativa
        """
    )
    with engine.begin() as conn:
        for esc in escenarios:
            conn.execute(
                stmt,
                {
                    "id": esc.id,
                    "nombre": esc.nombre,
                    "prob": esc.probabilidad,
                    "coh": esc.coherencia,
                    "estados": json.dumps({k: v["id"] for k, v in esc.estado_por_eje.items()}, ensure_ascii=False),
                    "desc": esc.descripcion_narrativa or "",
                },
            )


def exportar_a_dataframe(escenarios: list[Escenario]) -> pd.DataFrame:
    filas = []
    for esc in escenarios:
        row = {
            "id": esc.id,
            "nombre": esc.nombre,
            "probabilidad": esc.probabilidad,
            "coherencia": esc.coherencia,
        }
        for k, v in esc.estado_por_eje.items():
            row[k] = v["id"]
        filas.append(row)
    return pd.DataFrame(filas)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    engine = create_engine(os.environ["DATABASE_URL"])
    esc = generar_escenarios(EJES_ELECTORALES_ESPAÑA, INCOMPATIBILIDADES, top_n=20)
    exportar_a_bd(esc, engine)
    df = exportar_a_dataframe(esc)
    print(df[["id", "probabilidad", "coherencia"]].to_string())
