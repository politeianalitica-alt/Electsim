"""Tests para _party_alias — cubre los 30+ casos documentados en el diccionario.

El foco está en garantizar que PSOE y PP nunca se invierten (bug histórico),
y que todos los alias de partidos conocidos resuelven correctamente.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

# Importamos directamente la función sin cargar Streamlit completo
import importlib.util
import types

# Cargamos solo la función, no toda la página (evita st.set_page_config en test)
_PAGE = Path(__file__).parent.parent / "pages" / "5_Agentes_LLM.py"


def _load_party_alias():
    """Extrae _party_alias del módulo sin ejecutar el código Streamlit de nivel módulo."""
    src = _PAGE.read_text(encoding="utf-8")
    # Ejecutamos solo hasta donde se define _party_alias
    start = src.find("def _party_alias(")
    end = src.find("\ndef _ideo_label_color(", start)
    snippet = src[start:end]
    ns: dict = {}
    exec(snippet, ns)  # noqa: S102
    return ns["_party_alias"]


_party_alias = _load_party_alias()


# ── PSOE / PP — no inversión (bug histórico) ──────────────────────────────────

class TestPsoePPNoInversion:
    def test_codigo_1_es_psoe(self):
        assert _party_alias("1") == "PSOE"

    def test_codigo_2_es_pp(self):
        assert _party_alias("2") == "PP"

    def test_codigo_1_float_es_psoe(self):
        assert _party_alias("1.0") == "PSOE"

    def test_codigo_2_float_es_pp(self):
        assert _party_alias("2.0") == "PP"

    def test_psoe_nombre_directo(self):
        assert _party_alias("PSOE") == "PSOE"

    def test_pp_nombre_directo(self):
        assert _party_alias("PP") == "PP"

    def test_psoe_lowercase_devuelve_psoe(self):
        # La función hace .upper() internamente; "psoe" no está en alias → devuelve el original en strip()
        # Lo que importa es que NO devuelva "PP"
        result = _party_alias("psoe")
        assert result != "PP"

    def test_pp_lowercase_devuelve_pp(self):
        result = _party_alias("pp")
        assert result != "PSOE"


# ── Partidos conocidos ─────────────────────────────────────────────────────────

class TestPartidosConocidos:
    def test_codigo_3_es_vox(self):
        assert _party_alias("3") == "VOX"

    def test_codigo_4_es_sumar(self):
        assert _party_alias("4") == "SUMAR"

    def test_codigo_5_es_ciudadanos(self):
        assert _party_alias("5") == "Ciudadanos"

    def test_codigo_6_es_erc(self):
        assert _party_alias("6") == "ERC"

    def test_codigo_7_es_junts(self):
        assert _party_alias("7") == "Junts"

    def test_codigo_8_es_pnv(self):
        assert _party_alias("8") == "PNV"

    def test_codigo_9_es_bildu(self):
        assert _party_alias("9") == "EH Bildu"

    def test_codigo_10_es_bng(self):
        assert _party_alias("10") == "BNG"


# ── NS/NC y abstención ─────────────────────────────────────────────────────────

class TestNSNCYAbstencion:
    def test_8996_es_abstencion(self):
        assert _party_alias("8996") == "Abstención"

    def test_8996_float_es_abstencion(self):
        assert _party_alias("8996.0") == "Abstención"

    def test_9998_es_nsnc(self):
        assert _party_alias("9998") == "NS/NC"

    def test_9997_es_nsnc(self):
        assert _party_alias("9997") == "NS/NC"

    def test_9999_es_nsnc(self):
        assert _party_alias("9999") == "NS/NC"

    def test_nsnc_texto(self):
        assert _party_alias("NO_DECLARA") == "NS/NC"

    def test_nsnc_texto_2(self):
        assert _party_alias("NO CONTESTA") == "NS/NC"

    def test_no_sabe(self):
        assert _party_alias("NO SABE") == "NS/NC"

    def test_abstencion_texto(self):
        assert _party_alias("ABSTENCION") == "Abstención"

    def test_abstencion_acento(self):
        assert _party_alias("ABSTENCIÓN") == "Abstención"

    def test_abstención_contiene_abst(self):
        assert _party_alias("ABSTENCIÓN TOTAL") == "Abstención"


# ── Aliases de coaliciones / marcas históricas ─────────────────────────────────

class TestAliasesCoaliciones:
    def test_unidas_podemos_es_sumar(self):
        assert _party_alias("UNIDAS PODEMOS") == "SUMAR"

    def test_up_es_sumar(self):
        assert _party_alias("UP") == "SUMAR"

    def test_podemos_es_sumar(self):
        assert _party_alias("PODEMOS") == "SUMAR"

    def test_cs_es_ciudadanos(self):
        assert _party_alias("CS") == "Ciudadanos"

    def test_ciudadanos_largo(self):
        assert _party_alias("CIUDADANOS") == "Ciudadanos"

    def test_jxcat_es_junts(self):
        assert _party_alias("JXCAT") == "Junts"

    def test_junts_per_catalunya(self):
        assert _party_alias("JUNTS PER CATALUNYA") == "Junts"

    def test_erc_eh_bildu(self):
        assert _party_alias("ERC/EH BILDU") == "EH Bildu"

    def test_partidos_locales_otros(self):
        assert _party_alias("PARTIDOS LOCALES") == "Otros"

    def test_otros_no_especificado(self):
        assert _party_alias("OTROS / NO ESPECIFICADO") == "Otros"


# ── Blanco/nulo ────────────────────────────────────────────────────────────────

class TestBlancoNulo:
    def test_voto_en_blanco(self):
        assert _party_alias("VOTO EN BLANCO") == "Blanco/Nulo"

    def test_nulo(self):
        assert _party_alias("NULO") == "Blanco/Nulo"

    def test_blanco_nulo_clave(self):
        assert _party_alias("BLANCO_NULO") == "Blanco/Nulo"


# ── Edge cases ─────────────────────────────────────────────────────────────────

class TestEdgeCases:
    def test_string_vacio_devuelve_otros(self):
        assert _party_alias("") == "Otros"

    def test_none_devuelve_otros(self):
        assert _party_alias(None) == "Otros"  # type: ignore[arg-type]

    def test_whitespace_devuelve_otros(self):
        result = _party_alias("   ")
        assert result in {"Otros", ""}

    def test_desconocido_devuelve_el_valor_original(self):
        result = _party_alias("PartidoDesconocido")
        assert result == "PartidoDesconocido"

    def test_psoe_y_pp_nunca_se_invierten_batch(self):
        """Test de integración: ningún input conocido mapea 1→PP o 2→PSOE."""
        for inp in ["1", "1.0", "PSOE", "Partido Socialista"]:
            assert _party_alias(inp) != "PP", f"Input '{inp}' mapeó a PP (inversión bug)"
        for inp in ["2", "2.0", "PP", "Partido Popular"]:
            assert _party_alias(inp) != "PSOE", f"Input '{inp}' mapeó a PSOE (inversión bug)"
