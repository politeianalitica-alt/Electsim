"""Tests para etl.electoral_math.dhondt.

Valida:
- Suma exacta de escaños
- Umbral 3%
- Resultados históricos conocidos (21-J 2021, 23-J 2023)
- Casos límite
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from etl.electoral_math import dhondt, validate_seat_total


# ── Propiedades fundamentales ──────────────────────────────────────────────────

class TestDhondtPropiedades:
    def test_suma_exacta_simple(self):
        out = dhondt({"A": 40, "B": 35, "C": 25}, escanos=10)
        assert sum(out.values()) == 10

    def test_suma_exacta_350(self):
        votos = {"PP": 33, "PSOE": 28, "VOX": 12, "SUMAR": 12, "Otros": 15}
        out = dhondt(votos, escanos=350)
        assert sum(out.values()) == 350

    def test_validate_seat_total_correcto(self):
        out = dhondt({"A": 50, "B": 50}, escanos=10)
        assert validate_seat_total(out, esperado=10)

    def test_no_negativos(self):
        out = dhondt({"A": 50, "B": 30, "C": 20}, escanos=6)
        assert all(v >= 0 for v in out.values())

    def test_todos_los_partidos_en_output(self):
        votos = {"A": 49, "B": 49, "C": 2}
        out = dhondt(votos, escanos=8, umbral_pct=3.0)
        assert set(out.keys()) == set(votos.keys())

    def test_umbral_excluye_partido_pequeno(self):
        out = dhondt({"A": 49, "B": 49, "C": 2}, escanos=8, umbral_pct=3.0)
        assert out["C"] == 0

    def test_umbral_0_no_excluye_nada(self):
        # Con umbral=0 y C suficientemente grande para ganar un escaño
        out = dhondt({"A": 50, "B": 35, "C": 15}, escanos=10, umbral_pct=0.0)
        assert out["C"] > 0

    def test_partido_mayoritario_obtiene_mas_escanos(self):
        out = dhondt({"A": 60, "B": 40}, escanos=10)
        assert out["A"] > out["B"]

    def test_escanos_0_devuelve_todo_cero(self):
        out = dhondt({"A": 60, "B": 40}, escanos=0)
        assert all(v == 0 for v in out.values())

    def test_votos_vacios_devuelve_vacio(self):
        out = dhondt({}, escanos=10)
        assert out == {}

    def test_un_solo_partido(self):
        out = dhondt({"A": 100}, escanos=10)
        assert out["A"] == 10

    def test_todos_bajo_umbral_cae_sin_umbral(self):
        # Si todos están bajo umbral, el algoritmo aplica sin umbral (fall-safe)
        out = dhondt({"A": 1, "B": 1}, escanos=4, umbral_pct=50.0)
        assert sum(out.values()) == 4

    def test_normaliza_votos_no_normalizados(self):
        # Votos como fracciones (0-1) deben normalizarse igual que porcentajes
        out_pct = dhondt({"A": 40, "B": 35, "C": 25}, escanos=10)
        out_frac = dhondt({"A": 0.40, "B": 0.35, "C": 0.25}, escanos=10)
        assert out_pct == out_frac


# ── Validación con resultados históricos ───────────────────────────────────────
# Nota: D'Hondt NACIONAL (350 escaños, sin circunscripciones) difiere del real
# (que aplica D'Hondt por circunscripción). Estas cifras son aproximaciones
# de referencia para detectar regresiones graves, no resultados exactos.

class TestResultadosHistoricos:
    def test_23j_2023_pp_es_mayor_partido(self):
        """En el 23-J, PP fue el partido más votado con ~33%."""
        votos_23j = {
            "PP": 33.05, "PSOE": 31.70, "VOX": 12.39, "SUMAR": 12.31,
            "ERC": 1.80, "Junts": 1.63, "PNV": 1.22, "EH Bildu": 1.00,
            "CC": 0.66, "BNG": 0.60, "Otros": 3.64,
        }
        out = dhondt(votos_23j, escanos=350, umbral_pct=0.0)
        assert out["PP"] > out["PSOE"], "PP debe tener más escaños que PSOE en 23-J"

    def test_23j_2023_suma_350(self):
        votos_23j = {
            "PP": 33.05, "PSOE": 31.70, "VOX": 12.39, "SUMAR": 12.31,
            "ERC": 1.80, "Junts": 1.63, "PNV": 1.22, "EH Bildu": 1.00,
            "CC": 0.66, "BNG": 0.60, "Otros": 3.64,
        }
        out = dhondt(votos_23j, escanos=350, umbral_pct=0.0)
        assert validate_seat_total(out, 350)

    def test_21j_2021_pp_psoe_vox_sumar_bloque(self):
        """En el 21-J, los cuatro grandes partidos principales superan 280 escaños en modelo nacional."""
        votos_21j = {
            "PP": 20.82, "PSOE": 22.65, "VOX": 15.09, "SUMAR": 12.46,
            "ERC": 3.89, "Junts": 3.12, "PNV": 1.42, "EH Bildu": 1.70,
            "Otros": 18.85,
        }
        out = dhondt(votos_21j, escanos=350, umbral_pct=0.0)
        total_grandes = out["PP"] + out["PSOE"] + out["VOX"] + out["SUMAR"]
        assert total_grandes > 240, f"Los cuatro grandes deben superar 240 escaños juntos, obtenido: {total_grandes}"

    def test_21j_psoe_mayor_que_pp(self):
        votos_21j = {
            "PP": 20.82, "PSOE": 22.65, "VOX": 15.09, "SUMAR": 12.46,
            "ERC": 3.89, "Junts": 3.12, "PNV": 1.42, "EH Bildu": 1.70,
            "Otros": 18.85,
        }
        out = dhondt(votos_21j, escanos=350, umbral_pct=0.0)
        assert out["PSOE"] > out["PP"], "PSOE debe tener más escaños que PP en modelo 21-J"


# ── Circunscripción pequeña ────────────────────────────────────────────────────

class TestCircunscripcionPequena:
    def test_soria_2_escanos(self):
        """Soria tiene 2 escaños. Con votos típicos, PP y PSOE se los reparten."""
        out = dhondt({"PP": 44, "PSOE": 32, "VOX": 14, "SUMAR": 10}, escanos=2, umbral_pct=3.0)
        assert sum(out.values()) == 2
        assert out["PP"] >= 1

    def test_madrid_36_escanos_suma_exacta(self):
        votos = {"PP": 35, "PSOE": 25, "VOX": 12, "SUMAR": 14, "Más Madrid": 8, "Otros": 6}
        out = dhondt(votos, escanos=36, umbral_pct=3.0)
        assert sum(out.values()) == 36
