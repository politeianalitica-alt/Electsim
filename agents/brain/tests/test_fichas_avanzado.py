"""
Smoke tests para los componentes nuevos del ciclo avanzado:
  · municipios_inventory · CCAA y provincias
  · pdf_ocr · parser regex de declaraciones
  · opencorporates · interfaz pública
  · backfill script · selección por filtros

Sin red · usa mocks o constantes locales.
"""
from __future__ import annotations

import pytest


# ─────────────────────────────────────────────────────────────────
# MUNICIPIOS INVENTORY (CCAA + provincias estáticas)
# ─────────────────────────────────────────────────────────────────

class TestMunicipiosInventory:
    def test_list_ccaa_17_mas_2(self):
        from agents.brain.pipelines.data_sources.municipios_inventory import list_ccaa
        ccaa = list_ccaa()
        assert len(ccaa) == 19
        tipos = {c["tipo"] for c in ccaa}
        assert "ccaa" in tipos
        assert "ciudad_autonoma" in tipos
        # 17 CCAA + 2 ciudades autónomas
        n_ccaa = sum(1 for c in ccaa if c["tipo"] == "ccaa")
        n_ciu = sum(1 for c in ccaa if c["tipo"] == "ciudad_autonoma")
        assert n_ccaa == 17
        assert n_ciu == 2

    def test_list_provincias_52(self):
        from agents.brain.pipelines.data_sources.municipios_inventory import list_provincias
        provs = list_provincias()
        assert len(provs) == 52
        # Cada provincia debe mapear a CCAA
        for p in provs:
            assert p["codigo"]
            assert p["nombre"]
            assert p["ccaa_codigo"]
            assert p["ccaa"]

    def test_codigos_provincia_unicos(self):
        from agents.brain.pipelines.data_sources.municipios_inventory import list_provincias
        codigos = [p["codigo"] for p in list_provincias()]
        assert len(codigos) == len(set(codigos))


# ─────────────────────────────────────────────────────────────────
# PDF OCR · parser regex
# ─────────────────────────────────────────────────────────────────

class TestPdfOcrParser:
    def test_parse_importe_eur_formato_espanol(self):
        from agents.brain.pipelines.data_sources.pdf_ocr import _parse_importe_eur
        assert _parse_importe_eur("1.234.567,89") == 1234567.89
        assert _parse_importe_eur("350.000") == 350000.0
        assert _parse_importe_eur("12,50") == 12.5

    def test_parse_importe_eur_formato_ingles(self):
        from agents.brain.pipelines.data_sources.pdf_ocr import _parse_importe_eur
        assert _parse_importe_eur("1,234,567.89") == 1234567.89

    def test_parse_importe_eur_invalido(self):
        from agents.brain.pipelines.data_sources.pdf_ocr import _parse_importe_eur
        assert _parse_importe_eur("") is None
        assert _parse_importe_eur("texto") is None

    def test_extract_match_patrimonio(self):
        from agents.brain.pipelines.data_sources.pdf_ocr import (
            _extract_match_float, _PATRONES_PATRIMONIO,
        )
        text = "Patrimonio total bruto: 350.000 € declarados en 2024"
        val = _extract_match_float(text, _PATRONES_PATRIMONIO)
        assert val == 350000.0

    def test_extract_match_salario(self):
        from agents.brain.pipelines.data_sources.pdf_ocr import (
            _extract_match_float, _PATRONES_SALARIO,
        )
        text = "Retribución bruta anual: 67.890,50 euros"
        val = _extract_match_float(text, _PATRONES_SALARIO)
        assert val == 67890.5

    def test_extract_bienes_inmuebles_y_cuentas(self):
        from agents.brain.pipelines.data_sources.pdf_ocr import _extract_bienes
        text = """
        BIENES INMUEBLES
        Vivienda en Madrid · 280.000 €
        Local comercial Murcia · 95.500 €

        CUENTAS BANCARIAS
        BBVA cuenta corriente · 12.450 €
        Santander depósito · 30.000 €

        ACCIONES
        Fondo indexado · 25.000 €
        """
        bienes = _extract_bienes(text)
        tipos = {b["tipo"] for b in bienes}
        assert "inmueble" in tipos
        assert "cuenta" in tipos

    def test_parse_declaracion_sin_pdf_backend(self, monkeypatch):
        """Si ningún backend está, devolvemos {ok: False, hint}."""
        from agents.brain.pipelines.data_sources import pdf_ocr
        # Mockeamos _download_pdf_bytes para que devuelva bytes (PDF dummy)
        monkeypatch.setattr(pdf_ocr, "_download_pdf_bytes",
                            lambda *a, **k: b"%PDF-1.4 fake")
        # Forzamos que NO encuentre ningún backend
        import sys
        for mod in ("pdfplumber", "fitz", "pdfminer", "pdfminer.high_level",
                    "pytesseract", "pdf2image"):
            sys.modules[mod] = None  # type: ignore
        out = pdf_ocr.extract_text_from_pdf("https://example.com/x.pdf")
        assert out["ok"] is False
        assert "hint" in out


# ─────────────────────────────────────────────────────────────────
# OPENCORPORATES · interfaz
# ─────────────────────────────────────────────────────────────────

class TestOpenCorporates:
    def test_inferir_sectores_desde_nombres(self):
        from agents.brain.pipelines.data_sources.opencorporates import inferir_sectores_de_empresas
        empresas = [
            {"empresa_nombre": "BBVA Banca Comercial"},
            {"empresa_nombre": "Iberdrola Energía Renovable"},
            {"empresa_nombre": "Almirall Farmacéutica SA"},
        ]
        sectores = inferir_sectores_de_empresas(empresas)
        assert "financiero" in sectores
        assert "energía" in sectores
        assert "farmacéutico" in sectores

    def test_sabi_client_sin_licencia(self):
        from agents.brain.pipelines.data_sources.opencorporates import SABIClient
        c = SABIClient(api_key="", token="")
        assert c.configured is False
        assert c.search_officer("X") == []
        assert c.company_directors("A12345") == []
        assert c.company_financials("A12345") == []

    def test_search_companies_no_internet(self, monkeypatch):
        """Sin red, devuelve []."""
        import agents.brain.pipelines.data_sources.opencorporates as oc
        monkeypatch.setattr(oc, "http_get_json", lambda *a, **k: None)
        assert oc.search_companies_by_name("BBVA") == []
        assert oc.find_officer_companies("Pedro Sánchez") == []


# ─────────────────────────────────────────────────────────────────
# BACKFILL SCRIPT · filtros sin red
# ─────────────────────────────────────────────────────────────────

class TestBackfillScript:
    def test_rate_limiter_basico(self):
        from pipelines.backfill_municipios_masivo import RateLimiter
        rl = RateLimiter(60)  # 1/seg
        import time
        t0 = time.time()
        rl.wait()
        rl.wait()  # debería esperar ~1s
        elapsed = time.time() - t0
        assert elapsed >= 0.8

    def test_checkpoint_append_y_load(self, monkeypatch, tmp_path):
        from pipelines import backfill_municipios_masivo as bm
        monkeypatch.setattr(bm, "_CKPT_DIR", tmp_path)
        monkeypatch.setattr(bm, "_CKPT_FILE", tmp_path / "ck.txt")
        assert bm._load_checkpoint() == set()
        bm._append_checkpoint("30001")
        bm._append_checkpoint("30002")
        assert bm._load_checkpoint() == {"30001", "30002"}
