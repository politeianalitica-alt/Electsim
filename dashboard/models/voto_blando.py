"""Modelo de propensión al voto blando y transferible."""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Optional

import pandas as pd

_PESOS = {
    "volatilidad_historica": 0.30,
    "distancia_ideologica": 0.25,
    "insatisfaccion_gobierno": 0.20,
    "desempleo_local": 0.15,
    "fragmentacion": 0.10,
}


@dataclass
class InputsBlandura:
    circunscripcion: str
    partido_ref: str
    volatilidad_historica: float = 0.0
    distancia_ideologica: float = 0.0
    insatisfaccion_gobierno: float = 0.0
    desempleo_local: float = 0.0
    fragmentacion: float = 0.0
    segmento_edad: Optional[str] = None
    segmento_estudios: Optional[str] = None
    segmento_ideologia: Optional[str] = None
    n_electores_est: int = 0


@dataclass
class ResultadoBlandura:
    circunscripcion: str
    partido_ref: str
    score_medio_blando: float
    pct_voto_blando: float
    pct_probable_abst: float
    pct_transferible: float
    dist_quintiles: dict = field(default_factory=dict)
    etiqueta: str = "blando"
    contribuciones: dict = field(default_factory=dict)


def _clip01(v: float) -> float:
    return min(max(float(v), 0.0), 1.0)


def _score_to_pct_blando(score: float) -> float:
    return _clip01(1 / (1 + math.exp(-10 * (score - 0.45))))


def _score_to_pct_abst(score: float, insatisfaccion: float) -> float:
    return _clip01(score * 0.4 + insatisfaccion * 0.2)


def _score_to_pct_transferible(score: float, fragmentacion: float) -> float:
    return _clip01(min(score * 0.5 * (1 + fragmentacion * 0.3), 0.60))


def _etiqueta(score: float) -> str:
    if score >= 0.60:
        return "muy_blando"
    if score >= 0.33:
        return "blando"
    return "duro"


def calcular_score_analitico(inp: InputsBlandura) -> ResultadoBlandura:
    valores = {
        "volatilidad_historica": _clip01(inp.volatilidad_historica),
        "distancia_ideologica": _clip01(inp.distancia_ideologica),
        "insatisfaccion_gobierno": _clip01(inp.insatisfaccion_gobierno),
        "desempleo_local": _clip01(inp.desempleo_local),
        "fragmentacion": _clip01(inp.fragmentacion),
    }

    bonus_centro = 0.05 if inp.segmento_ideologia in {"centro", "centro_izq", "centro_der"} else 0.0
    score = _clip01(sum(_PESOS[k] * valores[k] for k in _PESOS) + bonus_centro)

    quintiles = {
        "q20": round(max(score - 0.25, 0.0), 3),
        "q40": round(max(score - 0.10, 0.0), 3),
        "q60": round(min(score + 0.10, 1.0), 3),
        "q80": round(min(score + 0.25, 1.0), 3),
    }

    pct_blando = _score_to_pct_blando(score)
    pct_abst = _score_to_pct_abst(score, valores["insatisfaccion_gobierno"])
    pct_transfer = _score_to_pct_transferible(score, valores["fragmentacion"])

    contrib = {k: round(_PESOS[k] * valores[k], 4) for k in _PESOS}

    return ResultadoBlandura(
        circunscripcion=inp.circunscripcion,
        partido_ref=inp.partido_ref,
        score_medio_blando=round(score, 4),
        pct_voto_blando=round(pct_blando, 4),
        pct_probable_abst=round(pct_abst, 4),
        pct_transferible=round(pct_transfer, 4),
        dist_quintiles=quintiles,
        etiqueta=_etiqueta(score),
        contribuciones=contrib,
    )


def calcular_scores_dataframe(df_inputs: pd.DataFrame) -> pd.DataFrame:
    if df_inputs.empty:
        return pd.DataFrame()
    out: list[dict] = []
    for _, row in df_inputs.iterrows():
        inp = InputsBlandura(
            circunscripcion=str(row.get("circunscripcion", "nacional")),
            partido_ref=str(row.get("partido_ref", "PSOE")),
            volatilidad_historica=float(row.get("volatilidad_historica", 0.0) or 0.0),
            distancia_ideologica=float(row.get("distancia_ideologica", 0.0) or 0.0),
            insatisfaccion_gobierno=float(row.get("insatisfaccion_gobierno", 0.0) or 0.0),
            desempleo_local=float(row.get("desempleo_local", 0.0) or 0.0),
            fragmentacion=float(row.get("fragmentacion", 0.0) or 0.0),
            segmento_edad=row.get("segmento_edad"),
            segmento_estudios=row.get("segmento_estudios"),
            segmento_ideologia=row.get("segmento_ideologia"),
            n_electores_est=int(row.get("n_electores_est", 0) or 0),
        )
        r = calcular_score_analitico(inp)
        out.append(
            {
                "circunscripcion": r.circunscripcion,
                "partido_ref": r.partido_ref,
                "score_medio_blando": r.score_medio_blando,
                "pct_voto_blando": r.pct_voto_blando,
                "pct_probable_abst": r.pct_probable_abst,
                "pct_transferible": r.pct_transferible,
                "dist_quintiles": r.dist_quintiles,
                "etiqueta": r.etiqueta,
                "contribuciones": r.contribuciones,
            }
        )
    return pd.DataFrame(out)
