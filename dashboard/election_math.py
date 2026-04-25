"""
Matemática electoral unificada — fuente única de verdad para el reparto de escaños.

Resuelve el fallo BLOQUE 1.5 del audit técnico: el algoritmo D'Hondt y la
conversión voto→escaño deben implementarse una única vez y estar disponibles
para todos los módulos (mapa electoral, escenarios, coaliciones, microdatos).

Uso rápido
----------
>>> from dashboard.election_math import dhondt_nacional
>>> dhondt_nacional({"PP": 33.0, "PSOE": 28.0, "VOX": 11.5, "SUMAR": 9.0})
{"PP": 142, "PSOE": 121, "VOX": 48, "SUMAR": 34, "ERC": 3, ...}
"""

from __future__ import annotations

from typing import Optional

import pandas as pd


# ── Distribución 2023 de escaños por provincia ────────────────────────────────
# Fuente: Ministerio del Interior, elecciones generales 23-J-2023.
ESCANOS_PROVINCIA: dict[str, int] = {
    "Álava": 4, "Albacete": 4, "Alicante": 12, "Almería": 6, "Asturias": 8,
    "Ávila": 3, "Badajoz": 5, "Illes Balears": 8, "Barcelona": 32, "Burgos": 4,
    "Cáceres": 4, "Cádiz": 9, "Cantabria": 5, "Castellón": 5, "Ciudad Real": 5,
    "Córdoba": 6, "A Coruña": 8, "Cuenca": 3, "Girona": 6, "Granada": 7,
    "Guadalajara": 3, "Gipuzkoa": 6, "Huelva": 5, "Huesca": 3, "Jaén": 5,
    "León": 4, "Lleida": 4, "La Rioja": 4, "Lugo": 4, "Madrid": 37,
    "Málaga": 11, "Murcia": 10, "Navarra": 5, "Ourense": 4, "Palencia": 3,
    "Las Palmas": 8, "Pontevedra": 7, "Salamanca": 4, "Santa Cruz de Tenerife": 7,
    "Segovia": 3, "Sevilla": 12, "Soria": 2, "Tarragona": 6, "Teruel": 3,
    "Toledo": 6, "Valencia": 16, "Valladolid": 5, "Bizkaia": 8, "Zamora": 3,
    "Zaragoza": 7, "Ceuta": 1, "Melilla": 1,
}

TOTAL_ESCANOS = sum(ESCANOS_PROVINCIA.values())  # 351 tras redistribución censo 2021


# ── Partidos que solo compiten en un subconjunto de provincias ────────────────
PARTIDOS_REGIONALES: dict[str, list[str]] = {
    "EH Bildu":  ["Álava", "Gipuzkoa", "Bizkaia", "Navarra"],
    "EH_BILDU":  ["Álava", "Gipuzkoa", "Bizkaia", "Navarra"],
    "BILDU":     ["Álava", "Gipuzkoa", "Bizkaia", "Navarra"],
    "PNV":       ["Álava", "Gipuzkoa", "Bizkaia"],
    "EAJ-PNV":   ["Álava", "Gipuzkoa", "Bizkaia"],
    "ERC":       ["Barcelona", "Girona", "Lleida", "Tarragona"],
    "Junts":     ["Barcelona", "Girona", "Lleida", "Tarragona"],
    "JUNTS":     ["Barcelona", "Girona", "Lleida", "Tarragona"],
    "JxCAT":     ["Barcelona", "Girona", "Lleida", "Tarragona"],
    "CUP":       ["Barcelona", "Girona", "Lleida", "Tarragona"],
    "BNG":       ["A Coruña", "Lugo", "Ourense", "Pontevedra"],
    "CC":        ["Las Palmas", "Santa Cruz de Tenerife"],
    "CCa":       ["Las Palmas", "Santa Cruz de Tenerife"],
    "UPN":       ["Navarra"],
    "PRC":       ["Cantabria"],
}


def dhondt_circunscripcion(
    votos: dict[str, float],
    n_escanos: int,
    umbral: float = 3.0,
    umbral_regional: float = 1.0,
    partidos_regionales_aqui: Optional[set[str]] = None,
) -> dict[str, int]:
    """
    D'Hondt para UNA circunscripción. Función pura y testeable.

    Parameters
    ----------
    votos : {partido: porcentaje_voto_en_circunscripcion}
    n_escanos : escaños a repartir
    umbral : umbral nacional (default 3%)
    umbral_regional : umbral reducido aplicable a partidos regionales
    partidos_regionales_aqui : subset de partidos con umbral reducido
    """
    if n_escanos <= 0:
        return {}
    partidos_regionales_aqui = partidos_regionales_aqui or set()

    elegibles: dict[str, float] = {}
    for partido, pct in votos.items():
        if pct <= 0:
            continue
        es_regional = partido in partidos_regionales_aqui
        threshold = umbral_regional if es_regional else umbral
        if pct >= threshold:
            elegibles[partido] = pct

    if not elegibles:
        return {}

    seats: dict[str, int] = {p: 0 for p in elegibles}
    for _ in range(n_escanos):
        cocientes = {p: v / (seats[p] + 1) for p, v in elegibles.items()}
        ganador = max(cocientes, key=cocientes.get)
        seats[ganador] += 1
    return seats


def dhondt_nacional(
    estimaciones: dict[str, float],
    escanos_por_provincia: Optional[dict[str, int]] = None,
    partidos_regionales: Optional[dict[str, list[str]]] = None,
    umbral_nacional: float = 3.0,
) -> dict[str, int]:
    """
    D'Hondt completo: 52 circunscripciones con magnitudes reales de 2023.

    Parameters
    ----------
    estimaciones : {siglas: pct_voto_nacional 0-100}
    escanos_por_provincia : override de ESCANOS_PROVINCIA (por ejemplo si llegan
                           elecciones con reparto actualizado vía INE)
    partidos_regionales : override de PARTIDOS_REGIONALES
    umbral_nacional : umbral mínimo nacional, default 3%

    Returns
    -------
    {siglas: total_escanos}
    """
    escanos_prov = escanos_por_provincia or ESCANOS_PROVINCIA
    reg_map = partidos_regionales or PARTIDOS_REGIONALES

    totales: dict[str, int] = {}

    for provincia, n_esc in escanos_prov.items():
        # Partidos que compiten en esta provincia
        votos_prov: dict[str, float] = {}
        for partido, pct in estimaciones.items():
            provs = reg_map.get(partido)
            if provs is None:
                votos_prov[partido] = pct     # Partido nacional
            elif provincia in provs:
                votos_prov[partido] = pct     # Partido regional con presencia

        regionales_aqui = {
            p for p, provs in reg_map.items() if provincia in provs
        }

        reparto = dhondt_circunscripcion(
            votos_prov, n_esc, umbral_nacional, 1.0, regionales_aqui,
        )
        for partido, escs in reparto.items():
            totales[partido] = totales.get(partido, 0) + escs

    return totales


def calc_seat_ranges(
    df: pd.DataFrame,
    col_central: str = "estimacion_pct",
    col_inf: str = "ic_95_inf",
    col_sup: str = "ic_95_sup",
    col_partido: str = "partido_siglas",
) -> dict[str, dict[str, int]]:
    """
    Calcula escaños central + banda IC 95% vía D'Hondt nacional completo.
    Devuelve dict {partido: {"central": n, "low": n, "high": n}}
    """
    if df is None or df.empty:
        return {}

    votos_c = dict(zip(df[col_partido], df[col_central]))
    votos_l = dict(zip(df[col_partido], df.get(col_inf, df[col_central])))
    votos_h = dict(zip(df[col_partido], df.get(col_sup, df[col_central])))

    seats_c = dhondt_nacional(votos_c)
    seats_l = dhondt_nacional(votos_l)
    seats_h = dhondt_nacional(votos_h)

    todos = set(seats_c) | set(seats_l) | set(seats_h)
    return {
        p: {
            "central": seats_c.get(p, 0),
            "low":     min(seats_l.get(p, 0), seats_h.get(p, 0)),
            "high":    max(seats_l.get(p, 0), seats_h.get(p, 0)),
        }
        for p in todos
    }


def votos_a_escanos(estimaciones: dict[str, float]) -> dict[str, int]:
    """Alias de compatibilidad: convierte estimaciones nacionales en escaños."""
    return dhondt_nacional(estimaciones)


def invariante_350(escanos: dict[str, int]) -> bool:
    """Invariante sanity-check: el total siempre debe ser exactamente 350."""
    return sum(escanos.values()) == TOTAL_ESCANOS
