"""
Smoke tests para fichas dinámicas (territoriales y de político).

Tests sin red:
  · Schemas: FichaTerritorial / FichaPolitico se instancian sin error.
  · Builders: degradación elegante cuando data sources fallan (sin internet).
  · Persistencia: write/read JSONL sin BD.
"""
from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path

import pytest


# ─────────────────────────────────────────────────────────────────
# SCHEMAS
# ─────────────────────────────────────────────────────────────────

class TestSchemas:
    def test_ficha_territorial_construye(self):
        from agents.brain.pipelines.ficha_schemas import FichaTerritorial
        f = FichaTerritorial(id="30027", nombre="Mazarrón", tipo="municipio")
        d = f.model_dump()
        # 12 bloques + identificación + auditoría
        assert "hero" in d and "gobierno" in d and "analisis_ia" in d
        assert d["completeness"] == 0.0

    def test_ficha_politico_construye(self):
        from agents.brain.pipelines.ficha_schemas import FichaPolitico
        f = FichaPolitico(id="Q186200", nombre="Pedro Sánchez")
        d = f.model_dump()
        assert "hero" in d and "trayectoria" in d and "analisis_ia" in d

    def test_bloque_base_marca_ok_por_defecto(self):
        from agents.brain.pipelines.ficha_schemas import TerritorioHero
        h = TerritorioHero()
        assert h.ok is True
        assert h.error is None


# ─────────────────────────────────────────────────────────────────
# BUILDERS · degradación cuando no hay datos
# ─────────────────────────────────────────────────────────────────

class TestBuildersDegradan:
    def test_territorio_sin_internet_no_crashea(self, monkeypatch):
        """Si Wikidata/INE fallan, la ficha sigue construyéndose con estructura
        intacta · cada bloque mantiene su shape aunque esté vacío."""
        from agents.brain.pipelines.ficha_territorial_builder import FichaTerritorialBuilder
        # Mock de SPARQL y HTTP en los módulos consumidores
        import importlib
        for mod_path in (
            "agents.brain.pipelines.data_sources.wikidata_territorios",
            "agents.brain.pipelines.data_sources.ine_municipio",
            "agents.brain.pipelines.data_sources.rss_news",
        ):
            mod = importlib.import_module(mod_path)
            if hasattr(mod, "sparql_query"):
                monkeypatch.setattr(mod, "sparql_query", lambda *a, **k: None)
            if hasattr(mod, "http_get_json"):
                monkeypatch.setattr(mod, "http_get_json", lambda *a, **k: None)
            if hasattr(mod, "http_get_text"):
                monkeypatch.setattr(mod, "http_get_text", lambda *a, **k: None)
        # Monkeypatch del factory en TODOS los puntos de import
        import agents.brain as br_pkg
        import agents.brain.groq_brain as gb_mod
        monkeypatch.setattr(gb_mod, "get_groq_brain", lambda: None)
        monkeypatch.setattr(br_pkg, "get_groq_brain", lambda: None)

        b = FichaTerritorialBuilder(brain=None)
        f = b.build_municipio("99999")
        assert f.id == "99999"
        assert f.tipo == "municipio"
        # Wikidata sin resultado → _wiki_bundle en errs
        assert "_wiki_bundle" in f.bloques_err
        # Estructura schemática intacta
        assert hasattr(f.hero, "nombre")
        assert hasattr(f.electoral, "municipales")
        assert hasattr(f.demografia, "piramide")
        assert hasattr(f.analisis_ia, "ok")

    def test_politico_sin_qid_devuelve_ficha_vacia(self, monkeypatch):
        from agents.brain.pipelines.ficha_politico_builder import FichaPoliticoBuilder
        import agents.brain.pipelines.data_sources._http as http_mod
        monkeypatch.setattr(http_mod, "http_get_json", lambda *a, **k: None)
        monkeypatch.setattr(http_mod, "sparql_query", lambda *a, **k: None)
        b = FichaPoliticoBuilder(brain=None)
        f = b.build_by_name("XXXX No Existe XXXX")
        assert f.nombre == "XXXX No Existe XXXX"
        assert "_wd_bundle" in f.bloques_err

    def test_territorio_construye_objetos_bloque_validos(self, monkeypatch):
        """Aunque falle todo, los 12 bloques deben ser instancias válidas."""
        from agents.brain.pipelines.ficha_territorial_builder import FichaTerritorialBuilder
        from agents.brain.pipelines.ficha_schemas import (
            TerritorioHero, TerritorioGobierno, TerritorioElectoral,
            TerritorioEconomia, TerritorioDemografia, TerritorioNoticias,
            TerritorioAgenda, TerritorioPleno, TerritorioMapa,
            TerritorioEmpresas, TerritorioTercerSector, TerritorioAnalisisIA,
        )
        import agents.brain.pipelines.data_sources._http as http_mod
        monkeypatch.setattr(http_mod, "http_get_json", lambda *a, **k: None)
        monkeypatch.setattr(http_mod, "sparql_query", lambda *a, **k: None)
        b = FichaTerritorialBuilder(brain=None)
        f = b.build_municipio("99999")
        assert isinstance(f.hero, TerritorioHero)
        assert isinstance(f.gobierno, TerritorioGobierno)
        assert isinstance(f.electoral, TerritorioElectoral)
        assert isinstance(f.economia, TerritorioEconomia)
        assert isinstance(f.demografia, TerritorioDemografia)
        assert isinstance(f.noticias, TerritorioNoticias)
        assert isinstance(f.agenda, TerritorioAgenda)
        assert isinstance(f.pleno, TerritorioPleno)
        assert isinstance(f.mapa, TerritorioMapa)
        assert isinstance(f.empresas, TerritorioEmpresas)
        assert isinstance(f.tercer_sector, TerritorioTercerSector)
        assert isinstance(f.analisis_ia, TerritorioAnalisisIA)


# ─────────────────────────────────────────────────────────────────
# DATA SOURCES · parsing aislado
# ─────────────────────────────────────────────────────────────────

class TestRSSParsing:
    def test_parse_rss_minimal(self):
        from agents.brain.pipelines.data_sources.rss_news import _parse_rss
        xml = """<?xml version="1.0"?>
        <rss><channel>
          <item>
            <title>Pleno municipal aprueba presupuestos - El País</title>
            <link>https://example.com/a</link>
            <pubDate>Wed, 14 May 2025 10:00:00 GMT</pubDate>
            <description>&lt;p&gt;Texto&lt;/p&gt;</description>
            <source>El País</source>
          </item>
        </channel></rss>
        """
        items = _parse_rss(xml)
        assert len(items) == 1
        assert "Pleno" in items[0]["titulo"]
        assert items[0]["medio"] == "El País"

    def test_detect_editorial_lean(self):
        from agents.brain.pipelines.data_sources.rss_news import detect_editorial_lean
        assert detect_editorial_lean("El País") == "progresista"
        assert detect_editorial_lean("ABC") == "conservador"
        assert detect_editorial_lean("La Vanguardia") == "centro"
        assert detect_editorial_lean("Medio inventado") == ""

    def test_nivel_territorial_heuristica(self):
        from agents.brain.pipelines.data_sources.wikidata_politicos import _detectar_nivel_territorial
        assert _detectar_nivel_territorial("Ministro de Justicia", "Gobierno de España") == "nacional"
        assert _detectar_nivel_territorial("Alcalde", "Ayuntamiento") == "local"
        assert _detectar_nivel_territorial("Diputado autonómico", "Parlamento de Andalucía") == "autonomico"
        assert _detectar_nivel_territorial("Eurodiputado", "Parlamento Europeo") == "europeo"


# ─────────────────────────────────────────────────────────────────
# PERSISTENCIA · JSONL sin BD
# ─────────────────────────────────────────────────────────────────

class TestPersistenciaFichas:
    def test_write_read_ficha_territorial_jsonl(self, monkeypatch, tmp_path):
        from agents.brain.pipelines import persistence_fichas as pf
        # Redirigir _OUT_DIR al tmp_path
        monkeypatch.setattr(pf, "_OUT_DIR", tmp_path)
        # DATABASE_URL vacía para forzar fallback
        monkeypatch.delenv("DATABASE_URL", raising=False)
        d = {
            "id": "30027", "tipo": "municipio", "nombre": "Mazarrón",
            "completeness": 0.5, "hero": {"ccaa": "Murcia"},
            "bloques_ok": ["hero", "gobierno"],
        }
        s = pf.persist_ficha_territorial(d)
        assert s["written_jsonl"] is True
        # Read back
        leida = pf.read_ficha_territorial("30027")
        assert leida is not None
        assert leida["nombre"] == "Mazarrón"
        assert leida["completeness"] == 0.5

    def test_read_devuelve_none_sin_datos(self, monkeypatch, tmp_path):
        from agents.brain.pipelines import persistence_fichas as pf
        monkeypatch.setattr(pf, "_OUT_DIR", tmp_path)
        monkeypatch.delenv("DATABASE_URL", raising=False)
        assert pf.read_ficha_territorial("99999") is None
        assert pf.read_ficha_politico("Q99999") is None
