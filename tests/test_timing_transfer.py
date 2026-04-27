"""Tests para timing_model y transfer_vectors (Fix 4.1 + 4.2)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from dashboard.models.timing_model import timing_weight, saturation_decay, timing_curve
from dashboard.models.transfer_vectors import (
    calcular_flujos,
    flujos_para_sankey,
    TRANSFER_VECTORS,
)


class TestTimingWeight:
    def test_semana_pico_es_maximo(self):
        # Semana 2 o 3 deben ser las de mayor impacto
        w2 = timing_weight(2)
        w1 = timing_weight(1)
        w7 = timing_weight(7)
        assert w2 >= w1
        assert w2 >= w7

    def test_rango_valido(self):
        for s in range(1, 8):
            w = timing_weight(s)
            assert 0.30 <= w <= 1.0, f"semana {s}: {w} fuera de [0.30, 1.0]"

    def test_semana_3_cercana_a_1(self):
        assert timing_weight(3) >= 0.85

    def test_semana_7_inferior_a_semana_3(self):
        assert timing_weight(7) < timing_weight(3)

    def test_curva_completa_longitud(self):
        curva = timing_curve(7)
        assert len(curva) == 7

    def test_clamping_fuera_de_rango(self):
        assert timing_weight(0) == timing_weight(1)
        assert timing_weight(99) == timing_weight(7)


class TestSaturationDecay:
    def test_primera_vez_es_uno(self):
        assert saturation_decay(0) == 1.0

    def test_monotonamente_decreciente(self):
        vals = [saturation_decay(i) for i in range(6)]
        for i in range(len(vals) - 1):
            assert vals[i] >= vals[i + 1], f"no decreciente en i={i}"

    def test_minimo_respetado(self):
        assert saturation_decay(100) >= 0.10

    def test_quinta_vez_por_debajo_de_30pct(self):
        assert saturation_decay(5) < 0.30


class TestTransferVectors:
    def test_todos_los_temas_de_impacto_tienen_vectores(self):
        from dashboard.models.voter_profiles import TEMAS_IMPACTO
        for tema in TEMAS_IMPACTO:
            # No exigimos vectores para todos, pero sí que calcular_flujos no explota
            flujos = calcular_flujos(tema, {"PP": 2.0, "PSOE": -1.0})
            assert isinstance(flujos, list)

    def test_flujos_pp_positivo(self):
        flujos = calcular_flujos("Bajada de impuestos a clase media", {"PP": 3.0})
        assert len(flujos) > 0
        for f in flujos:
            assert f.pp_abs > 0
            assert f.destino == "PP"

    def test_flujos_negativos_ignorados(self):
        flujos = calcular_flujos("Bajada de impuestos a clase media", {"SUMAR": -3.5})
        assert len(flujos) == 0, "Solo se generan flujos para ganadores (pp > 0)"

    def test_probabilidades_suman_uno(self):
        for tema, dest_dict in TRANSFER_VECTORS.items():
            for partido, flujo_list in dest_dict.items():
                total = sum(f.prob for f in flujo_list)
                assert abs(total - 1.0) < 1e-6, f"{tema}/{partido}: probs suman {total}"

    def test_sankey_data_formato_correcto(self):
        flujos = calcular_flujos("Bajada de impuestos a clase media", {"PP": 3.0, "VOX": 1.5})
        sankey = flujos_para_sankey(flujos)
        assert "labels" in sankey
        assert "source" in sankey
        assert "target" in sankey
        assert "value" in sankey
        assert len(sankey["source"]) == len(sankey["target"]) == len(sankey["value"])

    def test_sankey_sin_flujos_retorna_vacio(self):
        sankey = flujos_para_sankey([])
        assert sankey["labels"] == []
        assert sankey["value"] == []


class TestCampaignSimulatorIntegrado:
    def test_simular_incluye_nuevos_campos(self):
        from dashboard.services.campaign_simulator import simular_impacto_tema
        from dashboard.models.voter_profiles import PERFILES
        resultado = simular_impacto_tema(
            tema="Bajada de impuestos a clase media",
            partido_emisor="PP",
            perfiles_unificados=PERFILES,
            semana_campana=3,
            veces_tema_usado=0,
        )
        assert "impactos_brutos" in resultado
        assert "flujos_transferencia" in resultado
        assert "sankey_data" in resultado
        assert "timing_factor" in resultado
        assert "saturation_factor" in resultado

    def test_timing_reduce_impacto_semana_7(self):
        from dashboard.services.campaign_simulator import simular_impacto_tema
        from dashboard.models.voter_profiles import PERFILES
        r3 = simular_impacto_tema("Bajada de impuestos a clase media", "PP", PERFILES, semana_campana=3)
        r7 = simular_impacto_tema("Bajada de impuestos a clase media", "PP", PERFILES, semana_campana=7)
        pp3 = abs(r3["impactos_partido"].get("PP", 0))
        pp7 = abs(r7["impactos_partido"].get("PP", 0))
        assert pp3 >= pp7, "El impacto en semana 7 debe ser <= semana 3"

    def test_saturacion_reduce_impacto(self):
        from dashboard.services.campaign_simulator import simular_impacto_tema
        from dashboard.models.voter_profiles import PERFILES
        r0 = simular_impacto_tema("Bajada de impuestos a clase media", "PP", PERFILES, veces_tema_usado=0)
        r5 = simular_impacto_tema("Bajada de impuestos a clase media", "PP", PERFILES, veces_tema_usado=5)
        pp0 = abs(r0["impactos_partido"].get("PP", 0))
        pp5 = abs(r5["impactos_partido"].get("PP", 0))
        assert pp0 >= pp5, "El impacto saturado debe ser <= impacto fresco"

    def test_impactos_brutos_vs_ajustados(self):
        from dashboard.services.campaign_simulator import simular_impacto_tema
        from dashboard.models.voter_profiles import PERFILES
        r = simular_impacto_tema(
            "Bajada de impuestos a clase media", "PP", PERFILES,
            semana_campana=7, veces_tema_usado=4,
        )
        # Con timing y saturación, ajustados deben ser menores que brutos en magnitud
        for partido in r["impactos_brutos"]:
            bruto = abs(r["impactos_brutos"][partido])
            ajust = abs(r["impactos_partido"].get(partido, 0))
            assert ajust <= bruto + 1e-9
