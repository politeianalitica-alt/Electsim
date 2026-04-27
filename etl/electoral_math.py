"""
Matemática electoral canónica para ElectSim.

Módulo único de verdad para D'Hondt y conversión voto→escaños.
Todos los módulos del dashboard deben importar desde aquí.
"""
from __future__ import annotations

from collections import defaultdict


def dhondt(
    votos: dict[str, float],
    escanos: int,
    umbral_pct: float = 3.0,
) -> dict[str, int]:
    """Algoritmo D'Hondt puro.

    Args:
        votos: Diccionario partido → porcentaje de voto (0-100 o 0-1; se normaliza).
        escanos: Número de escaños a repartir.
        umbral_pct: Umbral mínimo de voto para participar (en la misma escala que votos).

    Returns:
        Diccionario partido → escaños asignados. Los partidos bajo umbral reciben 0.
        La suma garantizada es exactamente `escanos`.

    Validación rápida:
        assert sum(dhondt({"A": 40, "B": 35, "C": 25}, 10).values()) == 10
    """
    if escanos <= 0 or not votos:
        return {p: 0 for p in votos}

    total = sum(votos.values())
    if total <= 0:
        return {p: 0 for p in votos}

    # Normalizar a porcentaje 0-100
    escala = 100.0 / total if total != 100.0 else 1.0
    pct = {p: v * escala for p, v in votos.items()}

    # Umbral: si todos los partidos están bajo umbral, lo ignoramos para no
    # devolver un reparto vacío (caso límite con circunscripciones pequeñas).
    elegibles = {p: v for p, v in pct.items() if v >= umbral_pct}
    if not elegibles:
        elegibles = dict(pct)  # caída segura sin umbral

    asignados: dict[str, int] = defaultdict(int)
    for _ in range(escanos):
        cocientes = {p: elegibles[p] / (asignados[p] + 1) for p in elegibles}
        ganador = max(cocientes, key=cocientes.__getitem__)
        asignados[ganador] += 1

    # Devolver todos los partidos originales (los excluidos por umbral con 0)
    return {p: asignados.get(p, 0) for p in votos}


def dhondt_nacional(
    votos: dict[str, float],
    umbral_pct: float = 3.0,
    total_escanos: int = 350,
) -> dict[str, int]:
    """D'Hondt simplificado para simulaciones nacionales en una sola circunscripción."""
    return dhondt(votos, total_escanos, umbral_pct)


def validate_seat_total(resultado: dict[str, int], esperado: int = 350) -> bool:
    """Comprueba que la suma de escaños es exactamente `esperado`."""
    return sum(resultado.values()) == esperado


def seat_share_from_polls(
    encuestas: dict[str, float],
    circunscripciones: list[dict],
    umbral_pct: float = 3.0,
) -> dict[str, int]:
    """Reparte escaños por D'Hondt en múltiples circunscripciones (swing uniforme).

    Args:
        encuestas: Estimación nacional partido → %.
        circunscripciones: Lista de dicts con 'siglas': {partido: pct} y 'escanos': int.
        umbral_pct: Umbral de voto por circunscripción.

    Returns:
        Totales nacionales partido → escaños.
    """
    totales: dict[str, int] = defaultdict(int)
    for circ in circunscripciones:
        votos_circ = circ.get("votos", encuestas)
        n_escanos = int(circ.get("escanos", 0))
        if n_escanos <= 0:
            continue
        resultado = dhondt(votos_circ, n_escanos, umbral_pct)
        for partido, esc in resultado.items():
            totales[partido] += esc
    return dict(totales)
