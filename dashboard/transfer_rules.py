"""
Reglas de transferencia macro -> voto para el simulador de escenarios.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np


@dataclass(frozen=True)
class TransferRule:
    """
    Delta de voto estimado en puntos porcentuales.

    El cálculo usa deltas frente a referencias históricas y aplica un límite
    absoluto por partido para evitar extrapolaciones no creíbles.
    """

    paro: float = 0.0
    ipc: float = 0.0
    pib: float = 0.0
    sent: float = 0.0
    prima: float = 0.0
    vivienda: float = 0.0
    max_delta_pp: float = 5.0


MACRO_REFERENCIA = {
    "paro": 11.2,
    "ipc": 2.8,
    "pib": 2.1,
    "sent": 4.2,
    "prima": 95.0,
    "vivienda": 72.0,
}


TRANSFER_RULES: dict[str, TransferRule] = {
    "PP": TransferRule(paro=-0.30, ipc=+0.20, pib=-0.10, sent=-0.30, prima=+0.30, vivienda=-0.20, max_delta_pp=6.0),
    "PSOE": TransferRule(paro=-0.20, ipc=-0.40, pib=+0.40, sent=+0.60, prima=-0.30, vivienda=+0.10, max_delta_pp=6.0),
    "VOX": TransferRule(paro=+0.40, ipc=+0.20, pib=-0.30, sent=-0.20, prima=+0.10, vivienda=0.0, max_delta_pp=4.0),
    "SUMAR": TransferRule(paro=+0.20, ipc=+0.10, pib=-0.10, sent=+0.20, prima=0.0, vivienda=+0.40, max_delta_pp=4.0),
}


def calcular_ajustes(macro_actual: dict[str, float]) -> dict[str, float]:
    """
    Calcula ajuste de voto (pp) por partido.

    Parámetros esperados en macro_actual:
    paro, ipc, pib, sent, prima, vivienda
    """
    deltas = {
        k: float(macro_actual.get(k, MACRO_REFERENCIA[k])) - float(MACRO_REFERENCIA[k])
        for k in MACRO_REFERENCIA
    }
    deltas["prima"] = deltas["prima"] / 50.0
    deltas["vivienda"] = deltas["vivienda"] / 10.0

    ajustes: dict[str, float] = {}
    for partido, rule in TRANSFER_RULES.items():
        raw = (
            rule.paro * deltas["paro"]
            + rule.ipc * deltas["ipc"]
            + rule.pib * deltas["pib"]
            + rule.sent * deltas["sent"]
            + rule.prima * deltas["prima"]
            + rule.vivienda * deltas["vivienda"]
        )
        ajustes[partido] = float(np.clip(raw, -rule.max_delta_pp, rule.max_delta_pp))
    return ajustes


def reglas_transferencia_info() -> dict[str, str]:
    return {
        "Tasa de paro":
            "Un paro elevado penaliza al partido en el gobierno y beneficia a partidos "
            "de oposición extrema (VOX) y a la izquierda alternativa (SUMAR).",
        "Inflación (IPC)":
            "La inflación alta castiga especialmente al PSOE como partido de gobierno. "
            "El PP capitaliza el descontento económico moderado.",
        "Crecimiento del PIB":
            "El crecimiento beneficia directamente al partido en el gobierno (PSOE). "
            "Un PIB fuerte reduce el voto de protesta.",
        "Sentimiento hacia el gobierno":
            "El indicador más directo: mayor valoración del gobierno implica transferencia "
            "de voto hacia PSOE y SUMAR.",
        "Prima de riesgo":
            "Una prima alta señala inestabilidad financiera y beneficia al discurso de "
            "austeridad del PP. Perjudica al gobierno.",
        "Preocupación por vivienda":
            "A mayor preocupación por acceso a vivienda, mayor beneficio para SUMAR y "
            "la izquierda, que han capitalizado este tema.",
    }
