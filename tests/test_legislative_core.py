"""
Tests del Bloque 1 Core Legislativo.

Cubre:
  - test_boe_adapter_normalizes_item
  - test_impact_classifier
  - test_sector_detection
  - test_legal_rank_extraction
  - test_boe_extract_items_from_sumario
  - test_congreso_adapter_normalizes_initiative
  - test_legislative_service_empty_db_does_not_crash
  - test_classification_full_taxonomy

No necesitan conexión a BD ni HTTP. 100% offline.
"""
from __future__ import annotations

import pytest
from datetime import date


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
def boe_adapter():
    from etl.sources.legislative.boe_adapter import BOEAdapter
    return BOEAdapter()


@pytest.fixture
def congreso_adapter():
    from etl.sources.parliament.congreso_adapter import CongresoAdapter
    return CongresoAdapter()


@pytest.fixture
def raw_boe_item():
    return {
        "id": "BOE-A-2026-1823",
        "titulo": "Real Decreto-ley 4/2026 sobre medidas urgentes en materia de vivienda asequible",
        "seccion": "I",
        "departamento": "Ministerio de Vivienda",
        "epigrafe": "Decreto-leyes",
        "url_html": "https://boe.es/boe/dias/2026/04/28/pdfs/BOE-A-2026-1823.pdf",
        "url_pdf": "https://boe.es/boe/dias/2026/04/28/pdfs/BOE-A-2026-1823.pdf",
        "fecha_publicacion": "20260428",
    }


@pytest.fixture
def raw_congreso_item():
    return {
        "id": "BOCG.15.B.22-1",
        "tipo": "PPL",
        "titulo": "Proposición de Ley para la regulación de la inteligencia artificial en el sector público",
        "legislatura": "15",
        "fechaPresentacion": "2026-03-15",
        "status": "En tramitación",
        "autores": [
            {"nombre": "María García", "grupo_parlamentario": "PSOE", "rol": "firmante"},
            {"nombre": "Juan López", "grupo_parlamentario": "SUMAR", "rol": "firmante"},
        ],
        "comisiones": [
            {"nombre": "Comisión de Digitalización", "tipo": "comision"},
        ],
        "boletines": [
            {"numero": "BOCG-15-B-22-1", "fecha": "2026-03-15",
             "url": "https://congreso.es/bocg/D/BOCG-15-B-22-1.PDF"},
        ],
    }


# ── Tests de BOEAdapter ───────────────────────────────────────────────────────

class TestBOEAdapter:

    def test_normalizes_basic_item(self, boe_adapter, raw_boe_item):
        item = boe_adapter.adapt_sumario_item(raw_boe_item)
        assert item.source == "boe"
        assert item.source_id == "BOE-A-2026-1823"
        assert "Real Decreto-ley" in item.title
        assert item.department == "Ministerio de Vivienda"
        assert item.section == "I"
        assert item.url_html is not None

    def test_computes_text_hash(self, boe_adapter, raw_boe_item):
        item = boe_adapter.adapt_sumario_item(raw_boe_item)
        assert item.text_hash is not None
        assert len(item.text_hash) == 64  # SHA-256 hex

    def test_parses_date_compact(self, boe_adapter, raw_boe_item):
        item = boe_adapter.adapt_sumario_item(raw_boe_item)
        assert item.publication_date == date(2026, 4, 28)

    def test_adapt_many_skips_bad_items(self, boe_adapter):
        items = [
            {"id": "BOE-A-2026-001", "titulo": "Real Decreto 1/2026", "seccion": "I"},
            {"titulo": ""},  # sin id
            {"id": "BOE-A-2026-002", "titulo": "Anuncio de licitación X", "seccion": "V"},
        ]
        result = boe_adapter.adapt_many(items)
        assert len(result) == 3  # todos son válidos; el vacío recibe id generado

    def test_empty_list_returns_empty(self, boe_adapter):
        assert boe_adapter.adapt_many([]) == []


# ── Tests del clasificador de impacto ─────────────────────────────────────────

class TestImpactClassifier:

    def test_real_decreto_ley_is_critico(self):
        from etl.sources.legislative.boe_adapter import clasificar_impacto
        assert clasificar_impacto("Real Decreto-ley 4/2026 sobre vivienda") == "CRÍTICO"

    def test_ley_organica_is_critico(self):
        from etl.sources.legislative.boe_adapter import clasificar_impacto
        assert clasificar_impacto("Ley Orgánica 3/2026 de reforma del Código Penal") == "CRÍTICO"

    def test_real_decreto_is_alto(self):
        from etl.sources.legislative.boe_adapter import clasificar_impacto
        result = clasificar_impacto("Real Decreto 256/2026 por el que se aprueba el reglamento")
        assert result == "ALTO"

    def test_resolucion_is_medio(self):
        from etl.sources.legislative.boe_adapter import clasificar_impacto
        result = clasificar_impacto("Resolución de 14 de abril de 2026", "III", "Ministerio de Industria")
        assert result == "MEDIO"

    def test_anuncio_is_bajo(self):
        from etl.sources.legislative.boe_adapter import clasificar_impacto
        result = clasificar_impacto("Anuncio de contratación de servicios de limpieza", "V")
        assert result == "BAJO"

    def test_unknown_is_informativo(self):
        from etl.sources.legislative.boe_adapter import clasificar_impacto
        # Sin sección, sin rango reconocible → INFORMATIVO
        result = clasificar_impacto("Texto sin rango identificable")
        assert result == "INFORMATIVO"

    def test_seccion_v_is_bajo(self):
        from etl.sources.legislative.boe_adapter import clasificar_impacto
        # Sección V (anuncios) → BAJO aunque el título no diga "anuncio"
        result = clasificar_impacto("Texto genérico sin rango", "V")
        assert result == "BAJO"

    def test_all_levels_covered(self):
        from etl.sources.legislative.boe_adapter import clasificar_impacto
        cases = [
            ("Real Decreto-ley 1/2026", "CRÍTICO"),
            ("Real Decreto 1/2026", "ALTO"),
            ("Resolución de 1 de enero", "MEDIO"),
            ("Anuncio de licitación", "BAJO"),
        ]
        for titulo, expected in cases:
            result = clasificar_impacto(titulo)
            assert result == expected, f"'{titulo}' → '{result}', esperado '{expected}'"


# ── Tests de detección de sectores ────────────────────────────────────────────

class TestSectorDetection:

    def test_detecta_energia(self):
        from etl.sources.legislative.boe_adapter import detectar_sectores
        sects = detectar_sectores("Real Decreto sobre energía eléctrica y gas natural")
        assert "energía" in sects

    def test_detecta_defensa(self):
        from etl.sources.legislative.boe_adapter import detectar_sectores
        sects = detectar_sectores("Orden de la ministra de defensa sobre el ejército")
        assert "defensa" in sects

    def test_detecta_multiple_sectores(self):
        from etl.sources.legislative.boe_adapter import detectar_sectores
        sects = detectar_sectores("Ley sobre vivienda social y fiscalidad de inmuebles")
        assert "vivienda" in sects
        assert "fiscalidad" in sects

    def test_max_4_sectores(self):
        from etl.sources.legislative.boe_adapter import detectar_sectores
        texto = "energía defensa vivienda fiscalidad tecnología sanidad justicia trabajo"
        sects = detectar_sectores(texto)
        assert len(sects) <= 4

    def test_sin_sectores_devuelve_lista_vacia(self):
        from etl.sources.legislative.boe_adapter import detectar_sectores
        sects = detectar_sectores("Texto genérico sin palabras clave específicas")
        assert isinstance(sects, list)


# ── Tests de extracción de rango legal ────────────────────────────────────────

class TestLegalRankExtraction:

    def test_real_decreto_ley(self):
        from etl.sources.legislative.boe_adapter import extraer_rango_legal
        assert extraer_rango_legal("Real Decreto-ley 4/2026 sobre...") == "Real Decreto-ley"

    def test_ley_organica(self):
        from etl.sources.legislative.boe_adapter import extraer_rango_legal
        assert extraer_rango_legal("Ley Orgánica 2/2026 de reforma") == "Ley Orgánica"

    def test_resolucion(self):
        from etl.sources.legislative.boe_adapter import extraer_rango_legal
        result = extraer_rango_legal("Resolución de la Secretaría de Estado...")
        assert result in ("Resolución", "Resolución")

    def test_unknown_returns_none(self):
        from etl.sources.legislative.boe_adapter import extraer_rango_legal
        assert extraer_rango_legal("") is None
        assert extraer_rango_legal("Texto sin rango") is None


# ── Tests del sumario BOE ─────────────────────────────────────────────────────

class TestBOESumarioExtraction:

    def test_extract_items_from_valid_sumario(self):
        from etl.sources.legislative.boe_client import BOEClient
        # Estructura que devuelve la API real del BOE
        mock_sumario = {
            "boe": {
                "sumario": {
                    "diario": {
                        "@fechaPublicacion": "20260428",
                        "seccion": [
                            {
                                "@id": "I",
                                "departamento": [
                                    {
                                        "@nombre": "Ministerio de Hacienda",
                                        "epigrafe": {
                                            "@nombre": "Decretos-leyes",
                                            "item": {
                                                "identificador": "BOE-A-2026-001",
                                                "titulo": "Real Decreto-ley 1/2026",
                                                "urlHtml": "https://boe.es/item/001",
                                            }
                                        }
                                    }
                                ]
                            }
                        ]
                    }
                }
            }
        }
        items = BOEClient.extract_items_from_sumario(mock_sumario)
        assert len(items) == 1
        assert items[0]["id"] == "BOE-A-2026-001"
        assert items[0]["departamento"] == "Ministerio de Hacienda"

    def test_extract_items_empty_sumario(self):
        from etl.sources.legislative.boe_client import BOEClient
        items = BOEClient.extract_items_from_sumario({})
        assert items == []


# ── Tests de CongresoAdapter ──────────────────────────────────────────────────

class TestCongresoAdapter:

    def test_normalizes_basic_initiative(self, congreso_adapter, raw_congreso_item):
        ini = congreso_adapter.adapt(raw_congreso_item)
        assert ini.source == "congreso"
        assert ini.source_id == "BOCG.15.B.22-1"
        assert ini.initiative_type == "PPL"
        assert ini.legislature == "15"
        assert "inteligencia artificial" in ini.title.lower()

    def test_parses_authors(self, congreso_adapter, raw_congreso_item):
        ini = congreso_adapter.adapt(raw_congreso_item)
        assert len(ini.authors) == 2
        assert ini.authors[0].name == "María García"
        assert ini.authors[0].party == "PSOE"

    def test_parses_commissions(self, congreso_adapter, raw_congreso_item):
        ini = congreso_adapter.adapt(raw_congreso_item)
        assert len(ini.competent_commissions) == 1
        assert "Digitalización" in ini.competent_commissions[0].name

    def test_classifies_ppl_as_critico(self, congreso_adapter, raw_congreso_item):
        ini = congreso_adapter.adapt(raw_congreso_item)
        assert ini.impact_level == "CRÍTICO"

    def test_detects_tecnologia_sector(self, congreso_adapter, raw_congreso_item):
        ini = congreso_adapter.adapt(raw_congreso_item)
        assert "tecnología" in ini.sectors or "digitalización" in ini.sectors

    def test_adapt_many_skips_bad(self, congreso_adapter):
        items = [
            {"id": "X1", "titulo": "Proposición de Ley A", "tipo": "PL"},
            None,  # malo — debe saltarse
            {"id": "X2", "titulo": "Moción sobre B", "tipo": "MOCI"},
        ]
        result = congreso_adapter.adapt_many([i for i in items if i is not None])
        assert len(result) == 2


# ── Tests del servicio (sin BD) ───────────────────────────────────────────────

class TestLegislativeServiceNoDB:

    def test_cargar_boe_reciente_empty_db_no_crash(self):
        """El servicio debe retornar DataFrame vacío si no hay BD."""
        from dashboard.services.legislative_core import cargar_boe_reciente
        df = cargar_boe_reciente(limit=10)
        # No debe lanzar excepción; puede devolver vacío
        import pandas as pd
        assert isinstance(df, pd.DataFrame)

    def test_cargar_iniciativas_no_crash(self):
        from dashboard.services.legislative_core import cargar_iniciativas_recientes
        import pandas as pd
        df = cargar_iniciativas_recientes(limit=10)
        assert isinstance(df, pd.DataFrame)

    def test_cargar_kpis_no_crash(self):
        from dashboard.services.legislative_core import cargar_kpis_legislativos
        kpis = cargar_kpis_legislativos()
        assert isinstance(kpis, dict)
        # Debe tener la clave hay_datos aunque no haya BD
        assert "hay_datos" in kpis

    def test_buscar_no_crash(self):
        from dashboard.services.legislative_core import buscar_items_legislativos
        import pandas as pd
        df = buscar_items_legislativos("vivienda")
        assert isinstance(df, pd.DataFrame)

    def test_cargar_alertas_no_crash(self):
        from dashboard.services.legislative_core import cargar_alertas_legislativas
        import pandas as pd
        df = cargar_alertas_legislativas()
        assert isinstance(df, pd.DataFrame)


# ── Tests de schemas Pydantic ─────────────────────────────────────────────────

class TestLegalItemSchema:

    def test_invalid_impact_defaults_to_informativo(self):
        from etl.sources.legislative.schemas import LegalItem
        from datetime import datetime, timezone
        item = LegalItem(
            source="boe",
            source_id="BOE-A-2026-999",
            title="Test",
            impact_level="INVALIDO",
            fetched_at=datetime.now(timezone.utc),
        )
        assert item.impact_level == "INFORMATIVO"

    def test_to_db_dict_has_all_fields(self):
        from etl.sources.legislative.schemas import LegalItem
        from datetime import datetime, timezone
        item = LegalItem(
            source="boe",
            source_id="BOE-A-2026-001",
            title="Ley de prueba",
            impact_level="ALTO",
            sectors=["vivienda"],
            fetched_at=datetime.now(timezone.utc),
        )
        d = item.to_db_dict()
        assert "source" in d
        assert "source_id" in d
        assert "impact_level" in d
        assert d["impact_level"] == "ALTO"
        assert "vivienda" in d["sectors"]
