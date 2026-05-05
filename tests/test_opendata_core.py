"""
Tests para Bloque 10 — Open Data Core.

Cubre: schemas, portal_registry, catalog_bridge, ckan_connector,
       datos_gob_connector, dataset_mapper, license_classifier,
       dataset_profiler, resource_downloader, opendata_monitor,
       opendata_tools, pipeline CLI, migración 0047.
"""
from __future__ import annotations

import importlib
import importlib.util
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

# ── helpers ──────────────────────────────────────────────────────────────────

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


# ═══════════════════════════════════════════════════════════════════════════════
# 1 — Schemas
# ═══════════════════════════════════════════════════════════════════════════════

class TestSchemas:
    def test_open_data_portal_defaults(self):
        from etl.sources.opendata.schemas import OpenDataPortal
        p = OpenDataPortal(portal_id="test", name="Test Portal", base_url="https://test.example.com")
        assert p.portal_id == "test"
        assert p.active is True  # campo "active" no "is_active"
        assert p.country == "ES"
        assert p.administration_level == "other"

    def test_open_dataset_defaults(self):
        from etl.sources.opendata.schemas import OpenDataset
        ds = OpenDataset(dataset_id="ds:001", portal_id="test", title="Mi dataset")
        assert ds.dataset_id == "ds:001"
        assert ds.themes == []
        assert ds.keywords == []
        assert ds.issued_at is None  # campo "issued_at"

    def test_open_dataset_resource_flags(self):
        from etl.sources.opendata.schemas import OpenDatasetResource
        r = OpenDatasetResource(
            resource_id="r:001",
            dataset_id="ds:001",
            url="https://example.com/data.csv",
            format="CSV",
        )
        assert r.is_machine_readable is False  # default False
        assert r.format == "CSV"

    def test_institutional_api_endpoint(self):
        from etl.sources.opendata.schemas import InstitutionalAPIEndpoint
        ep = InstitutionalAPIEndpoint(
            source_id="ine",
            name="INE Series",
            url_template="https://servicios.ine.es/wstempus/js/ES/SERIES",
            protocol="rest_json",
        )
        assert ep.auth_required is False
        assert ep.protocol == "rest_json"

    def test_dataset_ingestion_plan_defaults(self):
        from etl.sources.opendata.schemas import DatasetIngestionPlan
        plan = DatasetIngestionPlan(
            dataset_id="ds:001",
            target_domain="other",
        )
        assert plan.review_status == "candidate"
        assert plan.enabled is False

    def test_data_license_assessment(self):
        from etl.sources.opendata.schemas import DataLicenseAssessment
        a = DataLicenseAssessment(risk_level="LOW")
        assert a.risk_level == "LOW"

    def test_dataset_profile(self):
        from etl.sources.opendata.schemas import DatasetProfile
        p = DatasetProfile(dataset_id="ds:001", rows_count=100, columns_count=10)
        assert isinstance(p.null_ratio, dict)  # null_ratio es dict
        assert p.sample_rows == []

    def test_portal_harvest_result(self):
        from etl.sources.opendata.schemas import PortalHarvestResult
        r = PortalHarvestResult(portal_id="ine", datasets_found=5)
        assert r.datasets_found == 5
        assert r.errors == []


# ═══════════════════════════════════════════════════════════════════════════════
# 2 — Portal Registry
# ═══════════════════════════════════════════════════════════════════════════════

class TestPortalRegistry:
    def test_default_portals_in_cache(self):
        """Portales por defecto deben estar en cache en memoria."""
        from etl.sources.opendata import portal_registry
        portal_registry._PORTAL_CACHE.clear()
        portals = portal_registry.list_portals()
        assert len(portals) >= 10, "Deben existir al menos 10 portales por defecto"

    def test_get_portal_known(self):
        from etl.sources.opendata.portal_registry import get_portal
        p = get_portal("ine")
        assert p is not None
        assert p.portal_id == "ine"

    def test_get_portal_unknown(self):
        from etl.sources.opendata.portal_registry import get_portal
        p = get_portal("portal_que_no_existe_xyz")
        assert p is None

    def test_list_portals_active_only(self):
        from etl.sources.opendata.portal_registry import list_portals
        active = list_portals(active_only=True)
        for p in active:
            assert p.active is True  # campo "active"

    def test_list_portals_by_admin_level(self):
        from etl.sources.opendata.portal_registry import list_portals
        national = list_portals(administration_level="national")
        for p in national:
            assert p.administration_level == "national"

    def test_detect_portal_type_ckan(self):
        from etl.sources.opendata.portal_registry import detect_portal_type
        # URL que contiene el path CKAN conocido
        t = detect_portal_type("https://abertos.xunta.gal", "https://abertos.xunta.gal/api/3/action")
        assert t == "ckan"

    def test_detect_portal_type_sparql(self):
        from etl.sources.opendata.portal_registry import detect_portal_type
        t = detect_portal_type("", "https://publications.europa.eu/webapi/rdf/sparql")
        assert t == "sparql"

    def test_upsert_portal(self):
        from etl.sources.opendata.schemas import OpenDataPortal
        from etl.sources.opendata.portal_registry import upsert_portal, get_portal

        p = OpenDataPortal(
            portal_id="test_portal_upsert",
            name="Test Upsert",
            base_url="https://test.example.com",
            administration_level="agency",
        )
        upsert_portal(p)  # Solo en cache
        found = get_portal("test_portal_upsert")
        assert found is not None
        assert found.name == "Test Upsert"

    def test_seed_default_portals_without_db(self):
        """Sin engine, seed debe sembrar en cache y devolver el count sin lanzar excepción."""
        from etl.sources.opendata.portal_registry import seed_default_portals
        count = seed_default_portals(None)
        assert count >= 10  # Siembra en cache aunque no haya DB


# ═══════════════════════════════════════════════════════════════════════════════
# 3 — Catalog Bridge
# ═══════════════════════════════════════════════════════════════════════════════

class TestCatalogBridge:
    def test_sync_without_catalog_source_table(self):
        """Sin tabla catalog_sources en BD, debe devolver 0 sin excepción."""
        from etl.sources.opendata.catalog_bridge import sync_catalog_sources_to_portals
        # Simular engine que falla al ejecutar la query
        mock_engine = MagicMock()
        mock_conn = MagicMock()
        mock_conn.execute.side_effect = Exception("tabla no existe")
        mock_engine.connect.return_value.__enter__ = lambda s: mock_conn
        mock_engine.connect.return_value.__exit__ = MagicMock(return_value=False)

        count = sync_catalog_sources_to_portals(mock_engine)
        assert count == 0

    def test_sync_without_engine(self):
        from etl.sources.opendata.catalog_bridge import sync_catalog_sources_to_portals
        count = sync_catalog_sources_to_portals(None)
        assert count == 0

    def test_map_dataset_to_catalog_modules_economy(self):
        from etl.sources.opendata.catalog_bridge import map_dataset_to_catalog_modules
        from etl.sources.opendata.schemas import OpenDataset
        ds = OpenDataset(
            dataset_id="test:001",
            portal_id="ine",
            title="PIB España 2023",
            themes=["economia"],
            keywords=["pib", "crecimiento"],
        )
        modules = map_dataset_to_catalog_modules(ds)
        assert "economy" in modules

    def test_map_dataset_to_catalog_sectors(self):
        from etl.sources.opendata.catalog_bridge import map_dataset_to_catalog_sectors
        from etl.sources.opendata.schemas import OpenDataset
        ds = OpenDataset(
            dataset_id="test:002",
            portal_id="cnmc",
            title="Resoluciones regulatorias",
            themes=["regulacion"],
        )
        sectors = map_dataset_to_catalog_sectors(ds)
        # No debe lanzar excepción
        assert isinstance(sectors, list)


# ═══════════════════════════════════════════════════════════════════════════════
# 4 — CKAN Connector
# ═══════════════════════════════════════════════════════════════════════════════

class TestCkanConnector:
    def test_ckan_dataset_normalize_minimal(self):
        """Normaliza un dict CKAN mínimo sin lanzar excepción."""
        from etl.sources.opendata.ckan_connector import ckan_dataset_normalize
        raw = {
            "id": "abc123",
            "title": "Dataset de prueba",
            "notes": "Descripcion",
            "organization": {"title": "Ministerio"},
            "tags": [{"display_name": "elecciones"}],
            "resources": [],
        }
        ds = ckan_dataset_normalize(raw, "datos_gob_es")
        assert ds.title == "Dataset de prueba"
        assert ds.portal_id == "datos_gob_es"
        assert "elecciones" in ds.keywords

    def test_ckan_resource_normalize_csv(self):
        from etl.sources.opendata.ckan_connector import ckan_resource_normalize
        raw = {
            "id": "r001",
            "name": "Datos CSV",
            "url": "https://example.com/data.csv",
            "format": "CSV",
            "size": "1024",
        }
        res = ckan_resource_normalize(raw, "ds:001")
        assert res.format == "CSV"
        assert res.is_tabular is True
        assert res.is_machine_readable is True

    def test_ckan_resource_normalize_pdf(self):
        from etl.sources.opendata.ckan_connector import ckan_resource_normalize
        raw = {
            "id": "r002",
            "name": "Informe PDF",
            "url": "https://example.com/informe.pdf",
            "format": "PDF",
        }
        res = ckan_resource_normalize(raw, "ds:001")
        assert res.is_document is True
        assert res.is_tabular is False

    def test_ckan_package_search_no_network(self):
        """Sin red, debe devolver lista vacía sin excepción."""
        from etl.sources.opendata.ckan_connector import ckan_package_search

        with patch("requests.get") as mock_get:
            mock_get.side_effect = Exception("sin red")
            results = ckan_package_search("https://datos.gob.es", "elecciones", portal_id="test")
        assert results == []


# ═══════════════════════════════════════════════════════════════════════════════
# 5 — Dataset Mapper
# ═══════════════════════════════════════════════════════════════════════════════

class TestDatasetMapper:
    def test_infer_modules_electoral(self):
        from etl.sources.opendata.dataset_mapper import infer_applicable_modules
        from etl.sources.opendata.schemas import OpenDataset
        ds = OpenDataset(
            dataset_id="test:electoral",
            portal_id="datos_gob_es",
            title="Resultados electorales generales 2023",
            keywords=["elecciones", "votos", "escanos"],
        )
        modules = infer_applicable_modules(ds)
        assert "electoral" in modules

    def test_infer_modules_contracting(self):
        from etl.sources.opendata.dataset_mapper import infer_applicable_modules
        from etl.sources.opendata.schemas import OpenDataset
        ds = OpenDataset(
            dataset_id="test:contract",
            portal_id="place",
            title="Licitaciones del sector publico",
            themes=["contratacion"],
            keywords=["adjudicacion", "cpv"],
        )
        modules = infer_applicable_modules(ds)
        assert "contracting" in modules

    def test_infer_modules_geospatial(self):
        from etl.sources.opendata.dataset_mapper import infer_applicable_modules
        from etl.sources.opendata.schemas import OpenDataset
        ds = OpenDataset(
            dataset_id="test:geo",
            portal_id="cnig",
            title="Cartografia SIG municipios espana",
            keywords=["sig", "geometria"],
        )
        modules = infer_applicable_modules(ds)
        assert "geospatial" in modules

    def test_infer_modules_legislative(self):
        from etl.sources.opendata.dataset_mapper import infer_applicable_modules
        from etl.sources.opendata.schemas import OpenDataset
        ds = OpenDataset(
            dataset_id="test:boe",
            portal_id="boe",
            title="Disposiciones publicadas en el BOE",
            keywords=["boe", "normativa"],
        )
        modules = infer_applicable_modules(ds)
        assert "legislative" in modules

    def test_recommend_ingestion_plan_always_candidate(self):
        from etl.sources.opendata.dataset_mapper import recommend_ingestion_plan
        from etl.sources.opendata.schemas import OpenDataset
        ds = OpenDataset(
            dataset_id="test:plan",
            portal_id="ine",
            title="Estadistica economica",
        )
        plan = recommend_ingestion_plan(ds)
        assert plan.review_status == "candidate"
        assert plan.dataset_id == "test:plan"
        assert plan.enabled is False

    def test_recommend_ingestion_plan_has_metadata(self):
        from etl.sources.opendata.dataset_mapper import recommend_ingestion_plan
        from etl.sources.opendata.schemas import OpenDataset
        ds = OpenDataset(
            dataset_id="test:meta",
            portal_id="datos_gob_es",
            title="Dataset con metadatos",
        )
        plan = recommend_ingestion_plan(ds)
        assert "priority" in plan.metadata
        assert 1 <= plan.metadata["priority"] <= 5


# ═══════════════════════════════════════════════════════════════════════════════
# 6 — License Classifier
# ═══════════════════════════════════════════════════════════════════════════════

class TestLicenseClassifier:
    def test_classify_cc_by(self):
        from etl.sources.opendata.license_classifier import classify_license
        from etl.sources.opendata.schemas import OpenDataset
        ds = OpenDataset(
            dataset_id="lic:001", portal_id="test", title="Dataset CC-BY",
            license_id="cc-by",
            license_title="Creative Commons Attribution",
        )
        a = classify_license(ds)
        assert a.risk_level == "LOW"
        assert a.commercial_use_allowed is True

    def test_classify_copyright(self):
        from etl.sources.opendata.license_classifier import classify_license
        from etl.sources.opendata.schemas import OpenDataset
        ds = OpenDataset(
            dataset_id="lic:002", portal_id="test", title="Dataset privado",
            license_id="copyright",
            license_title="All Rights Reserved",
        )
        a = classify_license(ds)
        assert a.risk_level == "HIGH"
        assert a.redistribution_allowed is False

    def test_classify_unknown_license(self):
        from etl.sources.opendata.license_classifier import classify_license
        from etl.sources.opendata.schemas import OpenDataset
        ds = OpenDataset(
            dataset_id="lic:003", portal_id="test", title="Dataset custom",
            license_id="zzz_custom_license_xyzabc",  # Ninguna keyword conocida
            license_title="Acuerdo de Uso Especifico",
        )
        a = classify_license(ds)
        assert a.risk_level == "UNKNOWN"

    def test_classify_no_license(self):
        from etl.sources.opendata.license_classifier import classify_license
        from etl.sources.opendata.schemas import OpenDataset
        ds = OpenDataset(dataset_id="lic:004", portal_id="test", title="Sin licencia")
        a = classify_license(ds)
        assert a.risk_level == "UNKNOWN"
        assert "Sin información" in (a.notes or "")

    def test_classify_nc_medium_risk(self):
        from etl.sources.opendata.license_classifier import classify_license
        from etl.sources.opendata.schemas import OpenDataset
        ds = OpenDataset(
            dataset_id="lic:005", portal_id="test", title="Dataset NC",
            license_id="cc-by-nc",
        )
        a = classify_license(ds)
        assert a.risk_level == "MEDIUM"

    def test_classify_reutilizacion_low(self):
        from etl.sources.opendata.license_classifier import classify_license
        from etl.sources.opendata.schemas import OpenDataset
        ds = OpenDataset(
            dataset_id="lic:006", portal_id="datos_gob_es", title="Dataset abierto",
            license_id="reutilizacion",
            license_title="Condiciones de Reutilizacion",
        )
        a = classify_license(ds)
        assert a.risk_level == "LOW"

    def test_is_freely_usable(self):
        from etl.sources.opendata.license_classifier import is_freely_usable
        from etl.sources.opendata.schemas import DataLicenseAssessment
        assert is_freely_usable(DataLicenseAssessment(risk_level="LOW")) is True
        assert is_freely_usable(DataLicenseAssessment(risk_level="HIGH")) is False

    def test_requires_legal_review(self):
        from etl.sources.opendata.license_classifier import requires_legal_review
        from etl.sources.opendata.schemas import DataLicenseAssessment
        assert requires_legal_review(DataLicenseAssessment(risk_level="HIGH")) is True
        assert requires_legal_review(DataLicenseAssessment(risk_level="UNKNOWN")) is True
        assert requires_legal_review(DataLicenseAssessment(risk_level="LOW")) is False


# ═══════════════════════════════════════════════════════════════════════════════
# 7 — Dataset Profiler (sin red)
# ═══════════════════════════════════════════════════════════════════════════════

class TestDatasetProfiler:
    def test_detect_geographic_columns(self):
        pytest.importorskip("pandas")
        import pandas as pd
        from etl.sources.opendata.dataset_profiler import detect_geographic_columns

        df = pd.DataFrame({
            "municipio": ["Madrid", "Barcelona"],
            "latitud": [40.4, 41.4],
            "longitud": [-3.7, 2.2],
            "nombre": ["A", "B"],
        })
        geo_cols = detect_geographic_columns(df)
        assert "municipio" in geo_cols
        assert "latitud" in geo_cols
        assert "nombre" not in geo_cols

    def test_detect_date_columns(self):
        pytest.importorskip("pandas")
        import pandas as pd
        from etl.sources.opendata.dataset_profiler import detect_date_columns

        df = pd.DataFrame({
            "fecha_publicacion": ["2023-01-01", "2023-02-01"],
            "valor": [100, 200],
        })
        date_cols = detect_date_columns(df)
        assert "fecha_publicacion" in date_cols

    def test_detect_topic_columns(self):
        pytest.importorskip("pandas")
        import pandas as pd
        from etl.sources.opendata.dataset_profiler import detect_topic_columns

        df = pd.DataFrame({
            "categoria": ["A", "B", "A"],
            "nombre": ["x" * i for i in range(1, 4)],
            "valor": [1, 2, 3],
        })
        topic_cols = detect_topic_columns(df)
        assert "categoria" in topic_cols

    def test_profile_csv_resource_no_network(self):
        from etl.sources.opendata.dataset_profiler import profile_csv_resource
        with patch("requests.get") as mock_get:
            mock_get.side_effect = Exception("sin red")
            result = profile_csv_resource("https://example.com/data.csv")
        assert result is None

    def test_profile_json_resource_no_network(self):
        from etl.sources.opendata.dataset_profiler import profile_json_resource
        with patch("requests.get") as mock_get:
            mock_get.side_effect = Exception("sin red")
            result = profile_json_resource("https://example.com/data.json")
        assert result is None

    def test_profile_dataframe_direct(self):
        pytest.importorskip("pandas")
        import pandas as pd
        from etl.sources.opendata.dataset_profiler import _profile_dataframe

        df = pd.DataFrame({
            "municipio": ["Madrid", "Barcelona", "Sevilla"],
            "fecha": ["2023-01-01", "2023-02-01", "2023-03-01"],
            "votos": [1000, 2000, 1500],
            "elecciones": ["generales", "generales", "generales"],
        })
        profile = _profile_dataframe(df, "test://url")
        assert profile.rows_count == 3
        assert profile.columns_count == 4
        assert isinstance(profile.null_ratio, dict)


# ═══════════════════════════════════════════════════════════════════════════════
# 8 — Resource Downloader (sin red)
# ═══════════════════════════════════════════════════════════════════════════════

class TestResourceDownloader:
    def test_detect_resource_format_csv_url(self):
        from etl.sources.opendata.resource_downloader import detect_resource_format
        assert detect_resource_format("https://example.com/data.csv") == "CSV"

    def test_detect_resource_format_json_url(self):
        from etl.sources.opendata.resource_downloader import detect_resource_format
        assert detect_resource_format("https://example.com/datos.json") == "JSON"

    def test_detect_resource_format_xlsx_url(self):
        from etl.sources.opendata.resource_downloader import detect_resource_format
        assert detect_resource_format("https://example.com/tabla.xlsx") == "XLSX"

    def test_detect_resource_format_content_type(self):
        from etl.sources.opendata.resource_downloader import detect_resource_format
        assert detect_resource_format("https://example.com/api", "text/csv") == "CSV"
        assert detect_resource_format("https://example.com/api", "application/json") == "JSON"

    def test_detect_resource_format_unknown(self):
        from etl.sources.opendata.resource_downloader import detect_resource_format
        assert detect_resource_format("https://example.com/no-extension") == "UNKNOWN"

    def test_download_resource_no_network(self):
        from etl.sources.opendata.resource_downloader import download_resource
        with patch("requests.get") as mock_get:
            mock_get.side_effect = Exception("sin red")
            result = download_resource("https://example.com/data.csv")
        assert result is None

    def test_stream_csv_resource_no_network(self):
        pytest.importorskip("pandas")
        from etl.sources.opendata.resource_downloader import stream_csv_resource
        with patch("requests.get") as mock_get:
            mock_get.side_effect = Exception("sin red")
            result = stream_csv_resource("https://example.com/data.csv")
        import pandas as pd
        assert isinstance(result, pd.DataFrame)
        assert result.empty

    def test_load_json_resource_no_network(self):
        from etl.sources.opendata.resource_downloader import load_json_resource
        with patch("requests.get") as mock_get:
            mock_get.side_effect = Exception("sin red")
            result = load_json_resource("https://example.com/data.json")
        assert result is None

    def test_get_resource_metadata_no_network(self):
        from etl.sources.opendata.resource_downloader import get_resource_metadata
        with patch("requests.head") as mock_head:
            mock_head.side_effect = Exception("sin red")
            meta = get_resource_metadata("https://example.com/data.csv")
        assert meta["accessible"] is False
        # El formato se infiere de la URL incluso sin red
        assert meta["format"] in ("CSV", "UNKNOWN")


# ═══════════════════════════════════════════════════════════════════════════════
# 9 — OpenData Monitor
# ═══════════════════════════════════════════════════════════════════════════════

class TestOpenDataMonitor:
    def test_harvest_summary_as_dict(self):
        from etl.sources.opendata.opendata_monitor import HarvestSummary
        s = HarvestSummary(portals_seeded=5, datasets_discovered=20)
        d = s.as_dict()
        assert d["portals_seeded"] == 5
        assert d["datasets_discovered"] == 20
        assert isinstance(d["errors"], list)

    def test_run_full_harvest_no_engine_no_network(self):
        """Sin engine ni red, debe devolver summary vacío sin excepción."""
        from etl.sources.opendata.opendata_monitor import run_full_harvest

        with patch("requests.get") as mock_get:
            mock_get.side_effect = Exception("sin red")
            summary = run_full_harvest(engine=None, dry_run=True)

        assert isinstance(summary.datasets_discovered, int)
        assert isinstance(summary.duration_seconds, float)

    def test_seed_and_sync_no_engine(self):
        from etl.sources.opendata.opendata_monitor import seed_and_sync
        result = seed_and_sync(None)
        assert result["portals_seeded"] == 0
        assert result["portals_synced"] == 0


# ═══════════════════════════════════════════════════════════════════════════════
# 10 — OpenData Tools
# ═══════════════════════════════════════════════════════════════════════════════

class TestOpenDataTools:
    def test_tools_registered(self):
        from agents.tools.opendata_tools import OPENDATA_TOOLS
        assert len(OPENDATA_TOOLS) == 6
        names = [t["name"] for t in OPENDATA_TOOLS]
        assert "search_open_datasets" in names
        assert "get_open_dataset" in names
        assert "get_dataset_resources" in names
        assert "recommend_datasets_for_module" in names
        assert "recommend_ingestion_plan" in names
        assert "get_official_sources_status" in names

    def test_all_tools_have_required_fields(self):
        from agents.tools.opendata_tools import OPENDATA_TOOLS
        for tool in OPENDATA_TOOLS:
            assert "name" in tool
            assert "description" in tool
            assert "input_schema" in tool
            assert "function" in tool
            assert callable(tool["function"])

    def test_get_official_sources_status(self):
        from agents.tools.opendata_tools import _get_official_sources_status
        result = _get_official_sources_status()
        assert "total_portales_activos" in result
        assert result["total_portales_activos"] >= 0

    def test_search_open_datasets_no_network(self):
        from agents.tools.opendata_tools import _search_open_datasets
        with patch("requests.get") as mock_get:
            mock_get.side_effect = Exception("sin red")
            result = _search_open_datasets("elecciones")
        assert result["total"] == 0
        assert result["datasets"] == []


# ═══════════════════════════════════════════════════════════════════════════════
# 11 — Pipeline CLI
# ═══════════════════════════════════════════════════════════════════════════════

class TestOpenDataCoreCLI:
    def test_parser_build(self):
        from pipelines.opendata_core import build_parser
        p = build_parser()
        assert p is not None

    def test_mutually_exclusive_actions(self):
        from pipelines.opendata_core import build_parser
        import argparse
        p = build_parser()
        with pytest.raises(SystemExit):
            p.parse_args(["--seed-portals", "--sync-catalog"])

    def test_status_action(self):
        from pipelines.opendata_core import main
        ret = main(["--status"])
        assert ret == 0

    def test_list_portals_action(self):
        from pipelines.opendata_core import main
        ret = main(["--list-portals"])
        assert ret == 0

    def test_seed_portals_dry_run(self):
        from pipelines.opendata_core import main
        ret = main(["--seed-portals", "--dry-run"])
        assert ret == 0

    def test_sync_catalog_dry_run(self):
        from pipelines.opendata_core import main
        ret = main(["--sync-catalog", "--dry-run"])
        assert ret == 0

    def test_harvest_all_dry_run_no_network(self):
        from pipelines.opendata_core import main
        with patch("requests.get") as mock_get:
            mock_get.side_effect = Exception("sin red")
            ret = main(["--harvest", "all", "--dry-run", "--limit", "5"])
        assert ret == 0

    def test_recommend_plans_no_network(self):
        from pipelines.opendata_core import main
        with patch("requests.get") as mock_get:
            mock_get.side_effect = Exception("sin red")
            ret = main(["--recommend-plans", "--query", "test"])
        assert ret == 0


# ═══════════════════════════════════════════════════════════════════════════════
# 12 — Migración 0047
# ═══════════════════════════════════════════════════════════════════════════════

class TestMigration0047:
    def _load_migration(self):
        migration_path = ROOT / "db" / "migrations" / "versions" / "0047_open_data_core.py"
        spec = importlib.util.spec_from_file_location("migration_0047", migration_path)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        return mod

    def test_revision_metadata(self):
        mod = self._load_migration()
        assert mod.revision == "0047"
        assert mod.down_revision == "0046"

    def test_upgrade_creates_tables(self):
        mod = self._load_migration()
        mock_op = MagicMock()

        with patch.object(mod, "op", mock_op):
            mod.upgrade()

        table_names = [
            call.args[0]
            for call in mock_op.create_table.call_args_list
        ]
        assert "open_data_portals" in table_names
        assert "open_data_datasets" in table_names
        assert "open_data_resources" in table_names
        assert "institutional_api_endpoints" in table_names
        assert "dataset_ingestion_plans" in table_names
        assert "dataset_profiles" in table_names

    def test_downgrade_drops_tables(self):
        mod = self._load_migration()
        mock_op = MagicMock()

        with patch.object(mod, "op", mock_op):
            mod.downgrade()

        dropped = [call.args[0] for call in mock_op.drop_table.call_args_list]
        assert "open_data_portals" in dropped
        assert "dataset_ingestion_plans" in dropped


# ═══════════════════════════════════════════════════════════════════════════════
# 13 — Regulatory Connectors
# ═══════════════════════════════════════════════════════════════════════════════

class TestRegulatoryConnectors:
    def test_list_all_regulatory_datasets(self):
        from etl.sources.opendata.regulatory_connectors import list_all_regulatory_datasets
        datasets = list_all_regulatory_datasets()
        assert len(datasets) >= 4  # BdE + CNMV + CNMC + 2 PLACE

    def test_list_all_regulatory_endpoints(self):
        from etl.sources.opendata.regulatory_connectors import list_all_regulatory_endpoints
        endpoints = list_all_regulatory_endpoints()
        assert len(endpoints) >= 6

    def test_fetch_cnmv_no_network(self):
        from etl.sources.opendata.regulatory_connectors import fetch_cnmv_hechos_relevantes
        with patch("requests.get") as mock_get:
            mock_get.side_effect = Exception("sin red")
            result = fetch_cnmv_hechos_relevantes()
        assert result == []

    def test_fetch_place_no_network(self):
        from etl.sources.opendata.regulatory_connectors import fetch_place_licitaciones_feed
        with patch("requests.get") as mock_get:
            mock_get.side_effect = Exception("sin red")
            result = fetch_place_licitaciones_feed()
        assert result == []


# ═══════════════════════════════════════════════════════════════════════════════
# 14 — EUR-Lex SPARQL Connector
# ═══════════════════════════════════════════════════════════════════════════════

class TestEurlexSparqlConnector:
    def test_list_common_queries(self):
        from etl.sources.opendata.eurlex_sparql_connector import list_common_queries
        queries = list_common_queries()
        assert len(queries) >= 3

    def test_get_predefined_query(self):
        from etl.sources.opendata.eurlex_sparql_connector import get_predefined_query
        q = get_predefined_query("recent_regulations")
        assert q is not None
        assert "cdm:regulation" in q

    def test_get_predefined_query_unknown(self):
        from etl.sources.opendata.eurlex_sparql_connector import get_predefined_query
        q = get_predefined_query("nonexistent_query")
        assert q is None

    def test_run_sparql_query_no_network(self):
        from etl.sources.opendata.eurlex_sparql_connector import run_sparql_query
        with patch("requests.get") as mock_get:
            mock_get.side_effect = Exception("sin red")
            results = run_sparql_query("SELECT ?x WHERE { ?x a <test> } LIMIT 1")
        assert results == []


# ═══════════════════════════════════════════════════════════════════════════════
# 15 — Dashboard Services
# ═══════════════════════════════════════════════════════════════════════════════

class TestOpenDataDashboardService:
    def test_cargar_portales_opendata_empty_db(self):
        from dashboard.services.opendata_core import cargar_portales_opendata
        result = cargar_portales_opendata()
        # Debe devolver lista (puede ser la del registry en memoria)
        assert isinstance(result, list)

    def test_cargar_kpis_opendata_no_db(self):
        from dashboard.services.opendata_core import cargar_kpis_opendata
        kpis = cargar_kpis_opendata(engine=None)
        assert "total_portales" in kpis
        assert kpis["total_portales"] >= 0

    def test_buscar_datasets_empty_query(self):
        from dashboard.services.opendata_core import buscar_datasets
        result = buscar_datasets("", limit=10)
        assert result == []

    def test_cargar_recursos_dataset_no_network(self):
        from dashboard.services.opendata_core import cargar_recursos_dataset
        with patch("requests.get") as mock_get:
            mock_get.side_effect = Exception("sin red")
            result = cargar_recursos_dataset("dataset:inexistente")
        assert isinstance(result, list)

    def test_cargar_ingestion_plans_no_db(self):
        from dashboard.services.opendata_core import cargar_ingestion_plans
        result = cargar_ingestion_plans(engine=None)
        assert result == []

    def test_cargar_datasets_candidatos_no_db(self):
        from dashboard.services.opendata_core import cargar_datasets_candidatos
        result = cargar_datasets_candidatos(engine=None)
        assert isinstance(result, list)
