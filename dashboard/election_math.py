"""
Utilidades de matematica electoral para proyeccion de escanos.
"""

from __future__ import annotations

from typing import Optional

import pandas as pd

# Magnitudes Congreso (anexo Real Decreto 400/2023 - 23J).
ESCANOS_PROVINCIA: dict[str, int] = {
    "Álava": 4,
    "Albacete": 4,
    "Alicante": 12,
    "Almería": 6,
    "Asturias": 7,
    "Ávila": 3,
    "Badajoz": 5,
    "Illes Balears": 8,
    "Barcelona": 32,
    "Burgos": 4,
    "Cáceres": 4,
    "Cádiz": 9,
    "Cantabria": 5,
    "Castellón": 5,
    "Ciudad Real": 5,
    "Córdoba": 6,
    "A Coruña": 8,
    "Cuenca": 3,
    "Girona": 6,
    "Granada": 7,
    "Guadalajara": 3,
    "Gipuzkoa": 6,
    "Huelva": 5,
    "Huesca": 3,
    "Jaén": 5,
    "León": 4,
    "Lleida": 4,
    "La Rioja": 4,
    "Lugo": 4,
    "Madrid": 37,
    "Málaga": 11,
    "Murcia": 10,
    "Navarra": 5,
    "Ourense": 4,
    "Palencia": 3,
    "Las Palmas": 8,
    "Pontevedra": 7,
    "Salamanca": 4,
    "Santa Cruz de Tenerife": 7,
    "Segovia": 3,
    "Sevilla": 12,
    "Soria": 2,
    "Tarragona": 6,
    "Teruel": 3,
    "Toledo": 6,
    "Valencia": 16,
    "Valladolid": 5,
    "Bizkaia": 8,
    "Zamora": 3,
    "Zaragoza": 7,
    "Ceuta": 1,
    "Melilla": 1,
}
TOTAL_ESCANOS_CONGRESO = 350
if sum(ESCANOS_PROVINCIA.values()) != TOTAL_ESCANOS_CONGRESO:
    raise ValueError("ESCANOS_PROVINCIA debe sumar 350")

# Partidos regionales que compiten solo en determinadas provincias.
PARTIDOS_REGIONALES: dict[str, list[str]] = {
    "EH Bildu": ["Álava", "Gipuzkoa", "Bizkaia", "Navarra"],
    "EH_BILDU": ["Álava", "Gipuzkoa", "Bizkaia", "Navarra"],
    "PNV": ["Álava", "Gipuzkoa", "Bizkaia"],
    "ERC": ["Barcelona", "Girona", "Lleida", "Tarragona"],
    "JUNTS": ["Barcelona", "Girona", "Lleida", "Tarragona"],
    "Junts": ["Barcelona", "Girona", "Lleida", "Tarragona"],
    "JxCAT": ["Barcelona", "Girona", "Lleida", "Tarragona"],
    "CUP": ["Barcelona", "Girona", "Lleida", "Tarragona"],
    "BNG": ["A Coruña", "Lugo", "Ourense", "Pontevedra"],
    "CC": ["Las Palmas", "Santa Cruz de Tenerife"],
    "UPN": ["Navarra"],
    "PRC": ["Cantabria"],
}


def _dhondt_circunscripcion(
    votos: dict[str, float],
    n_escanos: int,
    umbral: float = 3.0,
    partidos_con_umbral_reducido: Optional[set[str]] = None,
) -> dict[str, int]:
    """Reparto D'Hondt para una circunscripcion."""
    elegibles: dict[str, float] = {}
    for partido, voto in votos.items():
        if voto <= 0:
            continue
        es_regional = bool(partidos_con_umbral_reducido and partido in partidos_con_umbral_reducido)
        if voto >= umbral or (es_regional and voto >= 1.0):
            elegibles[partido] = voto

    if not elegibles:
        return {}

    seats: dict[str, int] = {partido: 0 for partido in elegibles}
    for _ in range(n_escanos):
        cocientes = {partido: voto / (seats[partido] + 1) for partido, voto in elegibles.items()}
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
    D'Hondt por circunscripcion (52 provincias) y agregacion nacional.
    """
    escanos_prov = escanos_por_provincia or ESCANOS_PROVINCIA
    reg_map = partidos_regionales or PARTIDOS_REGIONALES
    totales: dict[str, int] = {}

    for provincia, n_esc in escanos_prov.items():
        votos_prov: dict[str, float] = {}
        for partido, pct in estimaciones.items():
            provincias_partido = reg_map.get(partido)
            if provincias_partido is None or provincia in provincias_partido:
                votos_prov[partido] = pct

        regionales_en_prov = {partido for partido, provs in reg_map.items() if provincia in provs}
        result_prov = _dhondt_circunscripcion(
            votos_prov,
            n_esc,
            umbral=umbral_nacional,
            partidos_con_umbral_reducido=regionales_en_prov,
        )
        for partido, escanos in result_prov.items():
            totales[partido] = totales.get(partido, 0) + escanos

    return totales


def calc_seat_ranges(
    df: pd.DataFrame,
    col_central: str = "estimacion_pct",
    col_inf: str = "ic_95_inf",
    col_sup: str = "ic_95_sup",
    col_partido: str = "partido_siglas",
) -> dict[str, dict[str, int]]:
    """
    Calcula escanos central + rango [inf, sup] via D'Hondt nacional.
    """
    if df.empty:
        return {}

    votos_c = dict(zip(df[col_partido], df[col_central]))
    votos_l = dict(zip(df[col_partido], df[col_inf]))
    votos_h = dict(zip(df[col_partido], df[col_sup]))

    seats_c = dhondt_nacional(votos_c)
    seats_l = dhondt_nacional(votos_l)
    seats_h = dhondt_nacional(votos_h)

    todos = set(seats_c) | set(seats_l) | set(seats_h)
    return {
        partido: {
            "central": seats_c.get(partido, 0),
            "low": seats_l.get(partido, 0),
            "high": seats_h.get(partido, 0),
        }
        for partido in todos
    }
