"""Deteccion de alertas de aceleracion/sentimiento."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence
import statistics


@dataclass
class AlertaDetectada:
    tipo_objeto: str
    valor: str
    canal: str
    motivo: str
    magnitud: float
    detalle: dict


def detectar_aceleracion(serie: Sequence[int], umbral_sigma: float = 2.0) -> tuple[bool, float]:
    if len(serie) < 3:
        return False, 0.0
    ref = list(serie[:-1])
    cur = float(serie[-1])
    mean = float(statistics.mean(ref))
    if mean <= 0:
        return False, 0.0
    if len(ref) < 2:
        delta = (cur - mean) / mean * 100
        return cur > mean * 2, round(delta, 1)

    stdev = float(statistics.stdev(ref))
    if stdev == 0.0:
        delta = (cur - mean) / mean * 100
        return cur > mean * 2, round(delta, 1)

    z = (cur - mean) / stdev
    delta = (cur - mean) / mean * 100
    return z >= umbral_sigma, round(delta, 1)


def evaluar_objeto(
    objeto_tipo: str,
    objeto_valor: str,
    canal: str,
    serie_volume: Sequence[int],
    serie_sentiment: Sequence[float],
    umbral_sigma: float = 2.0,
    umbral_neg: float = -0.4,
) -> list[AlertaDetectada]:
    out: list[AlertaDetectada] = []
    is_alert, mag = detectar_aceleracion(serie_volume, umbral_sigma=umbral_sigma)
    if is_alert:
        out.append(
            AlertaDetectada(
                tipo_objeto=objeto_tipo,
                valor=objeto_valor,
                canal=canal,
                motivo="aceleracion",
                magnitud=mag,
                detalle={"serie_volume": list(serie_volume)},
            )
        )

    if len(serie_sentiment) >= 3:
        sent = float(statistics.mean(serie_sentiment[-3:]))
        if sent <= umbral_neg:
            out.append(
                AlertaDetectada(
                    tipo_objeto=objeto_tipo,
                    valor=objeto_valor,
                    canal=canal,
                    motivo="sentiment_negativo",
                    magnitud=round(sent, 3),
                    detalle={"sent_reciente_3d": sent},
                )
            )
    return out
