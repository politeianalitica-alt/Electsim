"""Tests para dashboard/election_math.py — invariantes D'Hondt."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from dashboard.election_math import (
    dhondt_circunscripcion,
    dhondt_nacional,
    invariante_350,
    TOTAL_ESCANOS,
)

# ── dhondt_circunscripcion ────────────────────────────────────────────────────

def test_circunscripcion_suma_exacta():
    votos = {"PP": 40.0, "PSOE": 30.0, "VOX": 20.0}
    seats = dhondt_circunscripcion(votos, n_escanos=5)
    assert sum(seats.values()) == 5

def test_circunscripcion_umbral_excluye():
    votos = {"PP": 40.0, "MICRO": 1.0}
    seats = dhondt_circunscripcion(votos, n_escanos=4, umbral=3.0)
    assert seats.get("MICRO", 0) == 0
    assert seats["PP"] == 4

def test_circunscripcion_regional_umbral_reducido():
    # LOCAL al 25% con umbral nacional 3% — gana escaños en 4 escaños disponibles
    votos = {"PP": 50.0, "LOCAL": 25.0, "OTRO": 1.5}
    seats = dhondt_circunscripcion(
        votos, n_escanos=4, umbral=3.0,
        umbral_regional=1.0,
        partidos_regionales_aqui={"LOCAL"},
    )
    # LOCAL supera umbral_regional y tiene votos suficientes para ganar escaños
    assert seats.get("LOCAL", 0) > 0
    # OTRO no supera ningún umbral (1.5 < 3.0 nacional y no es regional)
    assert seats.get("OTRO", 0) == 0

def test_circunscripcion_sin_elegibles():
    votos = {"PP": 1.0}
    seats = dhondt_circunscripcion(votos, n_escanos=5, umbral=3.0)
    assert seats == {}

def test_circunscripcion_cero_escanos():
    votos = {"PP": 40.0}
    seats = dhondt_circunscripcion(votos, n_escanos=0)
    assert seats == {}

# ── dhondt_nacional ───────────────────────────────────────────────────────────

def test_nacional_suma_total_constante():
    """El total de escaños debe ser siempre TOTAL_ESCANOS (351 en distribución 2023)."""
    estimaciones = {
        "PP": 33.0, "PSOE": 28.0, "VOX": 12.0, "SUMAR": 9.0,
        "ERC": 3.5, "Junts": 3.2, "PNV": 2.0, "EH Bildu": 2.5,
        "BNG": 1.0, "CC": 0.8, "Otros": 4.0,
    }
    seats = dhondt_nacional(estimaciones)
    total = sum(seats.values())
    assert total == TOTAL_ESCANOS, f"Suma es {total}, esperado {TOTAL_ESCANOS}"

def test_nacional_invariante_helper():
    estimaciones = {"PP": 40.0, "PSOE": 35.0, "VOX": 15.0, "SUMAR": 10.0}
    seats = dhondt_nacional(estimaciones)
    assert invariante_350(seats)

def test_nacional_psoe_no_es_pp():
    """Verifica que PP y PSOE no se invierten — bug histórico documentado."""
    estimaciones = {"PP": 40.0, "PSOE": 25.0, "VOX": 15.0, "SUMAR": 10.0, "Otros": 10.0}
    seats = dhondt_nacional(estimaciones)
    assert seats.get("PP", 0) > seats.get("PSOE", 0), (
        f"PP debería tener más escaños que PSOE con mayor voto. "
        f"PP={seats.get('PP')}, PSOE={seats.get('PSOE')}"
    )

def test_nacional_partido_regional_solo_en_sus_provincias():
    """ERC no debe sumar escaños fuera de Cataluña."""
    estimaciones = {"PP": 35.0, "PSOE": 30.0, "ERC": 4.0, "VOX": 12.0, "SUMAR": 10.0, "Otros": 9.0}
    seats = dhondt_nacional(estimaciones)
    # ERC solo compite en 4 provincias catalanas (máx ~32+6+6+4=48 escaños disponibles)
    assert seats.get("ERC", 0) <= 15, f"ERC con {seats.get('ERC')} escaños parece excesivo"

def test_nacional_escanos_no_negativos():
    estimaciones = {"PP": 33.0, "PSOE": 28.0, "VOX": 12.0, "SUMAR": 9.0}
    seats = dhondt_nacional(estimaciones)
    for partido, n in seats.items():
        assert n >= 0, f"{partido} tiene escaños negativos: {n}"
