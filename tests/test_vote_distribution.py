"""Tests para _safe_vote_dist y _safe_vote_dist_ex.

Cubre:
- 100% NS/NC → fallback ideológico + fiabilidad_baja=True
- Totales > 100 → normalización correcta
- Negativos → filtrados
- JSON string como input
- Alias de partidos en keys
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

# Cargamos solo las funciones sin ejecutar Streamlit
_PAGE = Path(__file__).parent.parent / "pages" / "5_Agentes_LLM.py"


def _load_vote_fns():
    src = _PAGE.read_text(encoding="utf-8")
    # Extraemos el bloque de funciones relevantes
    markers = [
        "def _voto_fallback_por_ideologia(",
        "_NSNC_FIABILIDAD_UMBRAL",
        "def _safe_vote_dist(",
        "def _safe_vote_dist_ex(",
        "def _party_alias(",
        "def _ideo_label_color(",
    ]
    # Tomamos desde _party_alias hasta _ideo_label_color (exclusive)
    start = src.find("def _party_alias(")
    end = src.find("\ndef _edad_rango_from_media(", start)
    snippet_alias = src[start:end]

    start2 = src.find("def _voto_fallback_por_ideologia(")
    end2 = src.find("\ndef _preocupaciones_genericas(", start2)
    snippet_voto = src[start2:end2]

    start3 = src.find("_NSNC_FIABILIDAD_UMBRAL")
    end3 = src.find("\ndef _build_general_profile_label(", start3)
    snippet_safe = src[start3:end3]

    import json as _json
    ns: dict = {"json": _json}
    exec(snippet_alias, ns)   # noqa: S102
    exec(snippet_voto, ns)    # noqa: S102
    exec(snippet_safe, ns)    # noqa: S102
    return ns["_safe_vote_dist"], ns["_safe_vote_dist_ex"], ns["_NSNC_FIABILIDAD_UMBRAL"]


_safe_vote_dist, _safe_vote_dist_ex, _UMBRAL = _load_vote_fns()


class TestSafeVoteDist:
    def test_dict_limpio_suma_100(self):
        raw = {"PP": 40, "PSOE": 35, "VOX": 25}
        out = _safe_vote_dist(raw, 5.0)
        assert abs(sum(out.values()) - 100.0) < 0.1

    def test_json_string_funciona(self):
        raw = json.dumps({"PP": 40, "PSOE": 35, "VOX": 25})
        out = _safe_vote_dist(raw, 5.0)
        assert "PP" in out or "PSOE" in out

    def test_none_input_devuelve_fallback(self):
        out = _safe_vote_dist(None, 5.0)
        assert isinstance(out, dict)
        assert len(out) > 0

    def test_vacio_devuelve_fallback(self):
        out = _safe_vote_dist({}, 5.0)
        assert isinstance(out, dict)
        assert len(out) > 0

    def test_negativos_filtrados(self):
        raw = {"PP": 40, "PSOE": -10, "VOX": 25}
        out = _safe_vote_dist(raw, 5.0)
        # PSOE negativo debe quedar a 0 o no aparecer
        assert out.get("PSOE", 0) >= 0

    def test_totales_sobre_100_normaliza(self):
        raw = {"PP": 80, "PSOE": 70, "VOX": 50}
        out = _safe_vote_dist(raw, 5.0)
        assert abs(sum(out.values()) - 100.0) < 0.5

    def test_alias_aplicado_en_keys(self):
        raw = {"1": 40, "2": 35, "3": 25}  # Códigos CIS
        out = _safe_vote_dist(raw, 5.0)
        assert "PSOE" in out
        assert "PP" in out
        assert "VOX" in out

    def test_alias_no_invierte_psoe_pp(self):
        raw = {"1": 60, "2": 40}
        out = _safe_vote_dist(raw, 5.0)
        assert out.get("PSOE", 0) > out.get("PP", 0), "PSOE (código 1) debe tener más que PP (código 2)"

    def test_json_invalido_devuelve_fallback(self):
        out = _safe_vote_dist("esto no es json", 5.0)
        assert isinstance(out, dict)
        assert len(out) > 0


class TestSafeVoteDistEx:
    def test_distribucion_normal_fiabilidad_alta(self):
        raw = {"PP": 40, "PSOE": 35, "VOX": 25}
        dist, fiabilidad_baja, razon = _safe_vote_dist_ex(raw, 5.0)
        assert not fiabilidad_baja
        assert razon == ""

    def test_100_nsnc_fiabilidad_baja(self):
        raw = {"NS/NC": 100}
        dist, fiabilidad_baja, razon = _safe_vote_dist_ex(raw, 5.0)
        assert fiabilidad_baja
        assert razon != ""

    def test_nsnc_sobre_umbral_fiabilidad_baja(self):
        raw = {"NS/NC": 90, "PP": 10}
        dist, fiabilidad_baja, razon = _safe_vote_dist_ex(raw, 5.0)
        assert fiabilidad_baja
        assert razon != ""

    def test_nsnc_bajo_umbral_fiabilidad_alta(self):
        raw = {"PP": 40, "PSOE": 35, "NS/NC": 25}
        dist, fiabilidad_baja, razon = _safe_vote_dist_ex(raw, 5.0)
        # NS/NC=25% < umbral 85% → fiabilidad alta
        assert not fiabilidad_baja

    def test_vacio_fiabilidad_baja(self):
        dist, fiabilidad_baja, razon = _safe_vote_dist_ex({}, 5.0)
        assert fiabilidad_baja

    def test_distribucion_devuelta_es_dict_con_valores(self):
        raw = {"PP": 40, "PSOE": 35, "VOX": 25}
        dist, _, _ = _safe_vote_dist_ex(raw, 5.0)
        assert isinstance(dist, dict)
        assert len(dist) > 0

    def test_umbral_documentado_es_85(self):
        assert _UMBRAL == 85.0, f"El umbral NS/NC debe ser 85.0, es {_UMBRAL}"

    def test_fallback_ideologico_izquierda(self):
        """Con ideología 2 (izquierda), el fallback debe priorizar partidos de izquierda."""
        dist, fiabilidad_baja, _ = _safe_vote_dist_ex(None, 2.0)
        assert fiabilidad_baja
        assert "SUMAR" in dist or "PSOE" in dist

    def test_fallback_ideologico_derecha(self):
        """Con ideología 9 (derecha), el fallback debe priorizar PP/VOX."""
        dist, fiabilidad_baja, _ = _safe_vote_dist_ex(None, 9.0)
        assert fiabilidad_baja
        assert "PP" in dist or "VOX" in dist
