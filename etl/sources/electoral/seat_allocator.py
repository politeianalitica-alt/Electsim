"""
Seat Allocator — Bloque 6.

Métodos de asignación de escaños: D'Hondt, Webster, Hare, Droop.
Métricas de desproporcionalidad: Gallagher, Loosemore-Hanby, Rae.

Reutiliza lógica existente de coalition_service si está disponible.
Funciona de forma autónoma si no.
"""
from __future__ import annotations

import logging
import math
from typing import Any

logger = logging.getLogger(__name__)


# ── D'Hondt ───────────────────────────────────────────────────────────────────

def dhondt(vote_shares: dict[str, float], total_seats: int) -> dict[str, int]:
    """
    Asignación de escaños por método D'Hondt.

    Args:
        vote_shares: {partido: porcentaje_voto} (suma no necesita ser 100)
        total_seats: Total de escaños a repartir.

    Returns:
        {partido: escaños}
    """
    # Intentar usar la implementación de coalition_service si existe
    try:
        from dashboard.services.coalition_service import dhondt as _cs_dhondt
        return _cs_dhondt(vote_shares, total_seats)
    except Exception:
        pass

    # Implementación autónoma
    parties = [p for p, v in vote_shares.items() if v > 0]
    seats: dict[str, int] = {p: 0 for p in parties}
    votes = {p: vote_shares[p] for p in parties}

    for _ in range(total_seats):
        quotients = {p: votes[p] / (seats[p] + 1) for p in parties}
        winner = max(quotients, key=lambda p: quotients[p])
        seats[winner] += 1

    return seats


def webster(vote_shares: dict[str, float], total_seats: int) -> dict[str, int]:
    """Asignación por método Webster (divisores impares: 1, 3, 5...)."""
    parties = [p for p, v in vote_shares.items() if v > 0]
    seats: dict[str, int] = {p: 0 for p in parties}
    votes = {p: vote_shares[p] for p in parties}

    for _ in range(total_seats):
        quotients = {p: votes[p] / (2 * seats[p] + 1) for p in parties}
        winner = max(quotients, key=lambda p: quotients[p])
        seats[winner] += 1

    return seats


def hare_quota(vote_shares: dict[str, float], total_seats: int) -> dict[str, int]:
    """Cuota Hare (método de restos más grandes / Hamilton)."""
    total_votes = sum(vote_shares.values())
    if total_votes == 0:
        return {p: 0 for p in vote_shares}
    quota = total_votes / total_seats
    seats = {p: int(v / quota) for p, v in vote_shares.items() if v > 0}
    allocated = sum(seats.values())
    remainders = {
        p: (v / quota) - int(v / quota)
        for p, v in vote_shares.items() if v > 0
    }
    remaining = total_seats - allocated
    for p in sorted(remainders, key=lambda x: remainders[x], reverse=True)[:remaining]:
        seats[p] = seats.get(p, 0) + 1
    return seats


def droop_quota(vote_shares: dict[str, float], total_seats: int) -> dict[str, int]:
    """Cuota Droop."""
    total_votes = sum(vote_shares.values())
    if total_votes == 0:
        return {p: 0 for p in vote_shares}
    quota = total_votes / (total_seats + 1)
    seats = {p: int(v / quota) for p, v in vote_shares.items() if v > 0}
    allocated = sum(seats.values())
    remainders = {
        p: (v / quota) - int(v / quota)
        for p, v in vote_shares.items() if v > 0
    }
    remaining = total_seats - allocated
    for p in sorted(remainders, key=lambda x: remainders[x], reverse=True)[:remaining]:
        seats[p] = seats.get(p, 0) + 1
    return seats


# ── Asignación provincial ─────────────────────────────────────────────────────

def allocate_seats_by_province(
    vote_share_by_province: dict[str, dict[str, float]],
    seats_by_province: dict[str, int],
    method: str = "dhondt",
    threshold_pct: float = 3.0,
) -> dict[str, int]:
    """
    Asigna escaños sumando los resultados de todas las circunscripciones.

    Args:
        vote_share_by_province: {provincia: {partido: % votos}}
        seats_by_province: {provincia: n_escaños}
        method: 'dhondt', 'webster', 'hare'
        threshold_pct: Umbral de exclusión (% mínimo en la circunscripción).

    Returns:
        {partido: escaños_totales}
    """
    _method_fn = {"dhondt": dhondt, "webster": webster, "hare": hare_quota}.get(method, dhondt)
    total_seats: dict[str, int] = {}

    for province, shares in vote_share_by_province.items():
        prov_seats = seats_by_province.get(province, 0)
        if prov_seats == 0:
            continue
        # Aplicar umbral
        filtered = {p: v for p, v in shares.items() if v >= threshold_pct}
        if not filtered:
            continue
        prov_result = _method_fn(filtered, prov_seats)
        for party, s in prov_result.items():
            total_seats[party] = total_seats.get(party, 0) + s

    return total_seats


# ── Escaños para España (Congreso) ────────────────────────────────────────────

# Distribución oficial de escaños por provincia (2023)
SPAIN_SEATS_BY_PROVINCE: dict[str, int] = {
    "Álava": 4, "Albacete": 4, "Alicante": 12, "Almería": 6, "Asturias": 8,
    "Ávila": 3, "Badajoz": 6, "Islas Baleares": 8, "Barcelona": 32, "Burgos": 4,
    "Cáceres": 4, "Cádiz": 9, "Cantabria": 5, "Castellón": 5, "Ciudad Real": 5,
    "Córdoba": 6, "La Coruña": 8, "Cuenca": 3, "Girona": 6, "Granada": 7,
    "Guadalajara": 3, "Guipúzcoa": 6, "Huelva": 5, "Huesca": 3, "Jaén": 5,
    "León": 4, "Lérida": 4, "La Rioja": 4, "Lugo": 4, "Madrid": 37,
    "Málaga": 11, "Murcia": 10, "Navarra": 5, "Orense": 4, "Palencia": 3,
    "Las Palmas": 8, "Pontevedra": 7, "Salamanca": 4, "Santa Cruz de Tenerife": 7,
    "Segovia": 3, "Sevilla": 12, "Soria": 2, "Tarragona": 6, "Teruel": 3,
    "Toledo": 6, "Valencia": 15, "Valladolid": 5, "Vizcaya": 8, "Zamora": 3,
    "Zaragoza": 7, "Ceuta": 1, "Melilla": 1,
}


def allocate_congress_seats(
    vote_share_national: dict[str, float],
    method: str = "dhondt",
) -> dict[str, int]:
    """
    Aproximación de escaños en el Congreso usando D'Hondt nacional.

    Nota: la realidad española usa circunscripciones provinciales.
    Esta función es una aproximación útil para demos y proyecciones rápidas.
    """
    from etl.sources.electoral.schemas import TOTAL_ESCANOS_CONGRESO
    _fn = {"dhondt": dhondt, "webster": webster, "hare": hare_quota}.get(method, dhondt)
    # Umbral del 3% nacional
    filtered = {p: v for p, v in vote_share_national.items() if v >= 3.0}
    if not filtered:
        filtered = vote_share_national
    return _fn(filtered, TOTAL_ESCANOS_CONGRESO)


# ── Métricas de desproporcionalidad ──────────────────────────────────────────

def gallagher_index(votes: dict[str, float], seats: dict[str, int]) -> float:
    """
    Índice de Gallagher (Least Squares Index).

    Mide la desproporcionalidad entre votos y escaños.
    Rango: 0 (proporcional) a 100 (máximo desproporcional).
    """
    total_seats = sum(seats.values()) or 1
    total_votes = sum(votes.values()) or 1

    parties = set(votes) | set(seats)
    lsq = sum(
        (votes.get(p, 0) / total_votes * 100 - seats.get(p, 0) / total_seats * 100) ** 2
        for p in parties
    )
    return round(math.sqrt(lsq / 2), 3)


def loosemore_hanby_index(votes: dict[str, float], seats: dict[str, int]) -> float:
    """Índice de Loosemore-Hanby."""
    total_seats = sum(seats.values()) or 1
    total_votes = sum(votes.values()) or 1
    parties = set(votes) | set(seats)
    return round(
        0.5 * sum(
            abs(votes.get(p, 0) / total_votes * 100 - seats.get(p, 0) / total_seats * 100)
            for p in parties
        ),
        3,
    )


def rae_index(votes: dict[str, float], seats: dict[str, int]) -> float:
    """Índice de Rae."""
    total_seats = sum(seats.values()) or 1
    total_votes = sum(votes.values()) or 1
    parties = set(votes) | set(seats)
    n = len(parties)
    if n == 0:
        return 0.0
    return round(
        sum(
            abs(votes.get(p, 0) / total_votes * 100 - seats.get(p, 0) / total_seats * 100)
            for p in parties
        ) / n,
        3,
    )


def effective_number_of_parties(shares: dict[str, float]) -> float:
    """Número efectivo de partidos (Laakso-Taagepera)."""
    total = sum(shares.values())
    if total == 0:
        return 0.0
    fracs = [v / total for v in shares.values() if v > 0]
    return round(1 / sum(f ** 2 for f in fracs), 3)
