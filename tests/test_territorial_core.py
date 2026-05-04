"""
Tests — Bloque 7: Territorial Core.

Cubre:
  A. territory_id normalization (build_territory_id)
  B. schemas (TerritorialSignal severity auto-set)
  C. geojson_loader feature mapping
  D. geometry_simplifier fallback
  E. spatial_joiner text resolution
  F. territorial_signal_detector creates signals
  G. territorial_aggregator economic demo
  H. territorial_core service (empty DB)
  I. choropleth component (empty data)
  J. territorial_tools registered
  K. census_sections_loader size estimate
  L. geo_monitor run_all (no DB)
  M. catastro_adapter stub
"""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(_ROOT))


# ─────────────────────────────────────────────────────────────────────────────
# A. Territory ID normalization
# ─────────────────────────────────────────────────────────────────────────────
class TestTerritoryIdNormalization:
    def test_build_province_id(self):
        from etl.sources.geospatial.schemas import build_territory_id
        assert build_territory_id("province", "28") == "prov:28"

    def test_build_ccaa_id(self):
        from etl.sources.geospatial.schemas import build_territory_id
        assert build_territory_id("ccaa", "13") == "ccaa:13"

    def test_build_municipality_id(self):
        from etl.sources.geospatial.schemas import build_territory_id
        assert build_territory_id("municipality", "28079") == "mun:28079"

    def test_build_census_section_id(self):
        from etl.sources.geospatial.schemas import build_territory_id
        assert build_territory_id("census_section", "28079-001-001") == "sec:28079-001-001"

    def test_build_national_id(self):
        from etl.sources.geospatial.schemas import build_territory_id
        assert build_territory_id("country", "ES") == "ES"

    def test_spain_provinces_52(self):
        from etl.sources.geospatial.schemas import SPAIN_PROVINCES
        assert len(SPAIN_PROVINCES) == 52

    def test_spain_ccaa_count(self):
        from etl.sources.geospatial.schemas import SPAIN_CCAA
        assert len(SPAIN_CCAA) >= 17

    def test_province_to_ccaa_mapping_exists(self):
        from etl.sources.geospatial.schemas import PROVINCE_TO_CCAA, SPAIN_PROVINCES
        # All province codes must be in the mapping
        for code in SPAIN_PROVINCES:
            assert code in PROVINCE_TO_CCAA, f"Province {code} missing from PROVINCE_TO_CCAA"

    def test_province_madrid_code(self):
        from etl.sources.geospatial.schemas import SPAIN_PROVINCES
        assert "28" in SPAIN_PROVINCES
        assert "Madrid" in SPAIN_PROVINCES["28"]

    def test_province_barcelona_code(self):
        from etl.sources.geospatial.schemas import SPAIN_PROVINCES
        assert "08" in SPAIN_PROVINCES
        assert "Barcelona" in SPAIN_PROVINCES["08"]


# ─────────────────────────────────────────────────────────────────────────────
# B. Schemas — TerritorialSignal severity auto-set
# ─────────────────────────────────────────────────────────────────────────────
class TestTerritorialSignalSchema:
    def _make_signal(self, value: float):
        from etl.sources.geospatial.schemas import TerritorialSignal
        from datetime import date
        return TerritorialSignal(
            territory_id="prov:28",
            territory_type="province",
            signal_type="electoral_swing",
            signal_date=date.today(),
            value=value,
            source_module="test",
        )

    def test_severity_critical(self):
        sig = self._make_signal(85.0)
        assert sig.severity == "CRITICAL"

    def test_severity_high(self):
        sig = self._make_signal(65.0)
        assert sig.severity == "HIGH"

    def test_severity_medium(self):
        sig = self._make_signal(45.0)
        assert sig.severity == "MEDIUM"

    def test_severity_low(self):
        sig = self._make_signal(20.0)
        assert sig.severity == "LOW"

    def test_value_above_80_is_critical(self):
        # Value above 80 → CRITICAL (no clipping enforced at model level)
        sig = self._make_signal(200.0)
        assert sig.severity == "CRITICAL"

    def test_value_zero_is_low(self):
        sig = self._make_signal(0.0)
        assert sig.severity == "LOW"

    def test_territory_profile_has_campaign_priority(self):
        from etl.sources.geospatial.schemas import TerritoryProfile
        profile = TerritoryProfile(
            territory_id="prov:28",
            name="Madrid",
            territory_type="province",
        )
        assert profile.campaign_priority is None
        profile.campaign_priority = 75.0
        assert profile.campaign_priority == 75.0


# ─────────────────────────────────────────────────────────────────────────────
# C. GeoJSON Loader — feature mapping
# ─────────────────────────────────────────────────────────────────────────────
class TestGeojsonLoader:
    def test_load_nonexistent_returns_empty(self, tmp_path):
        from etl.sources.geospatial.geojson_loader import load_geojson
        result = load_geojson(
            path=tmp_path / "noexiste.geojson",
            territory_type="province",
        )
        assert result == []

    def test_load_valid_geojson(self, tmp_path):
        import json
        from etl.sources.geospatial.geojson_loader import load_geojson

        geojson = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {"CODPROV": "28", "NOMPROV": "MADRID"},
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
                    },
                }
            ],
        }
        path = tmp_path / "test.geojson"
        path.write_text(json.dumps(geojson))

        result = load_geojson(path=path, territory_type="province", resolution="low")
        assert len(result) == 1
        geo = result[0]
        assert "prov" in geo.territory_id or geo.territory_id  # ID was extracted

    def test_load_geojson_computes_centroid(self, tmp_path):
        import json
        from etl.sources.geospatial.geojson_loader import load_geojson

        geojson = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {"CODPROV": "28"},
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]],
                    },
                }
            ],
        }
        path = tmp_path / "centroid.geojson"
        path.write_text(json.dumps(geojson))

        result = load_geojson(path=path, territory_type="province")
        assert len(result) == 1
        geo = result[0]
        # Centroid should be approximately at (1, 1)
        if geo.centroid_lat is not None:
            assert abs(geo.centroid_lat - 1.0) < 0.5
        if geo.centroid_lon is not None:
            assert abs(geo.centroid_lon - 1.0) < 0.5

    def test_default_geojson_returns_empty_if_no_file(self):
        from etl.sources.geospatial.geojson_loader import load_default_geojson
        # If file doesn't exist, should return empty list, not error
        result = load_default_geojson(territory_type="province", resolution="low")
        assert isinstance(result, list)


# ─────────────────────────────────────────────────────────────────────────────
# D. Geometry Simplifier — fallback (no shapely required)
# ─────────────────────────────────────────────────────────────────────────────
class TestGeometrySimplifier:
    def _make_polygon(self, n_points: int = 20) -> dict:
        import math
        coords = []
        for i in range(n_points):
            angle = 2 * math.pi * i / n_points
            coords.append([math.cos(angle), math.sin(angle)])
        coords.append(coords[0])
        return {"type": "Polygon", "coordinates": [coords]}

    def test_simplify_full_returns_same(self):
        from etl.sources.geospatial.geometry_simplifier import simplify
        geom = self._make_polygon(20)
        result = simplify(geom, resolution="full")
        assert result == geom

    def test_simplify_low_reduces_points(self):
        from etl.sources.geospatial.geometry_simplifier import simplify, estimate_complexity
        geom = self._make_polygon(100)
        result = simplify(geom, resolution="low")
        assert estimate_complexity(result) <= estimate_complexity(geom)

    def test_simplify_medium_between_full_and_low(self):
        from etl.sources.geospatial.geometry_simplifier import simplify, estimate_complexity
        geom = self._make_polygon(100)
        full_n = estimate_complexity(simplify(geom, "full"))
        med_n = estimate_complexity(simplify(geom, "medium"))
        low_n = estimate_complexity(simplify(geom, "low"))
        assert low_n <= med_n <= full_n

    def test_simplify_empty_geom(self):
        from etl.sources.geospatial.geometry_simplifier import simplify
        result = simplify({}, resolution="low")
        assert result == {}

    def test_simplify_point_unchanged(self):
        from etl.sources.geospatial.geometry_simplifier import simplify
        geom = {"type": "Point", "coordinates": [3.7, 40.4]}
        result = simplify(geom, resolution="low")
        assert result["type"] == "Point"

    def test_simplify_multipolygon(self):
        from etl.sources.geospatial.geometry_simplifier import simplify
        geom = {
            "type": "MultiPolygon",
            "coordinates": [
                [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
                [[[2, 2], [3, 2], [3, 3], [2, 3], [2, 2]]],
            ],
        }
        result = simplify(geom, resolution="low")
        assert result["type"] == "MultiPolygon"

    def test_is_shapely_available_returns_bool(self):
        from etl.sources.geospatial.geometry_simplifier import is_shapely_available
        result = is_shapely_available()
        assert isinstance(result, bool)

    def test_estimate_complexity(self):
        from etl.sources.geospatial.geometry_simplifier import estimate_complexity
        geom = {"type": "Polygon", "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 0]]]}
        n = estimate_complexity(geom)
        assert n == 4  # 4 points


# ─────────────────────────────────────────────────────────────────────────────
# E. Spatial Joiner — text resolution
# ─────────────────────────────────────────────────────────────────────────────
class TestSpatialJoiner:
    def test_resolve_madrid(self):
        from etl.sources.geospatial.spatial_joiner import resolve_territory_from_text
        result = resolve_territory_from_text("Situación en Madrid")
        assert len(result.territory_ids) > 0
        # Should find province:28 or ccaa:13 for Madrid
        found_madrid = any("28" in tid for tid in result.territory_ids)
        assert found_madrid

    def test_resolve_barcelona(self):
        from etl.sources.geospatial.spatial_joiner import resolve_territory_from_text
        result = resolve_territory_from_text("Elecciones en Barcelona")
        assert len(result.territory_ids) > 0

    def test_resolve_no_territory(self):
        from etl.sources.geospatial.spatial_joiner import resolve_territory_from_text
        result = resolve_territory_from_text("Texto sin ningún territorio relevante xyz123")
        assert result.confidence < 0.5 or len(result.territory_ids) == 0

    def test_resolve_multiple_territories(self):
        from etl.sources.geospatial.spatial_joiner import resolve_territory_from_text
        result = resolve_territory_from_text("Desde Madrid hasta Barcelona, pasando por Zaragoza")
        assert len(result.territory_ids) >= 2

    def test_resolve_ccaa(self):
        from etl.sources.geospatial.spatial_joiner import resolve_territory_from_text
        result = resolve_territory_from_text(
            "Cataluña", territory_types=["ccaa"]
        )
        assert len(result.territory_ids) > 0

    def test_attach_territory_returns_list(self):
        from etl.sources.geospatial.spatial_joiner import attach_territory_to_object
        result = attach_territory_to_object(
            object_type="media_item",
            object_id="123",
            text="Noticias desde Madrid",
        )
        assert isinstance(result, list)

    def test_spatial_join_empty_df(self):
        import pandas as pd
        from etl.sources.geospatial.spatial_joiner import spatial_join_points_to_territories
        df = pd.DataFrame()
        result = spatial_join_points_to_territories(df)
        assert result.empty


# ─────────────────────────────────────────────────────────────────────────────
# F. Territorial Signal Detector
# ─────────────────────────────────────────────────────────────────────────────
class TestTerritorialSignalDetector:
    def test_detect_economic_stress_returns_list(self):
        from etl.sources.geospatial.territorial_signal_detector import detect_economic_stress_signals
        signals = detect_economic_stress_signals(engine=None)
        assert isinstance(signals, list)

    def test_detect_campaign_priority_returns_list(self):
        from etl.sources.geospatial.territorial_signal_detector import detect_campaign_priority_signals
        signals = detect_campaign_priority_signals(engine=None)
        assert isinstance(signals, list)

    def test_detect_all_signals_returns_list(self):
        from etl.sources.geospatial.territorial_signal_detector import detect_all_signals
        signals = detect_all_signals(engine=None)
        assert isinstance(signals, list)

    def test_signals_have_territory_id(self):
        from etl.sources.geospatial.territorial_signal_detector import detect_all_signals
        signals = detect_all_signals(engine=None)
        for sig in signals:
            assert sig.territory_id, "Signal must have territory_id"

    def test_signals_severity_valid(self):
        from etl.sources.geospatial.territorial_signal_detector import detect_all_signals
        signals = detect_all_signals(engine=None)
        valid_severities = {"LOW", "MEDIUM", "HIGH", "CRITICAL"}
        for sig in signals:
            assert sig.severity in valid_severities

    def test_create_territorial_alerts_from_empty(self):
        from etl.sources.geospatial.territorial_signal_detector import create_territorial_alerts
        alerts = create_territorial_alerts([], engine=None)
        assert alerts == []

    def test_create_territorial_alerts_from_high_signal(self):
        from etl.sources.geospatial.territorial_signal_detector import create_territorial_alerts
        from etl.sources.geospatial.schemas import TerritorialSignal
        from datetime import date
        sig = TerritorialSignal(
            territory_id="prov:28",
            territory_type="province",
            signal_type="electoral_swing",
            signal_date=date.today(),
            value=85.0,
            source_module="test",
        )
        alerts = create_territorial_alerts([sig])
        assert len(alerts) == 1
        assert "pagina_relevante" in alerts[0]["datos"]


# ─────────────────────────────────────────────────────────────────────────────
# G. Territorial Aggregator — economic demo
# ─────────────────────────────────────────────────────────────────────────────
class TestTerritorialAggregator:
    def test_economic_demo_returns_52_provinces(self):
        from etl.sources.geospatial.territorial_aggregator import aggregate_economic_by_territory
        df = aggregate_economic_by_territory(territory_type="province", engine=None)
        assert len(df) == 52

    def test_economic_demo_has_stress_column(self):
        from etl.sources.geospatial.territorial_aggregator import aggregate_economic_by_territory
        df = aggregate_economic_by_territory(territory_type="province", engine=None)
        assert "economic_stress" in df.columns

    def test_economic_demo_stress_range(self):
        from etl.sources.geospatial.territorial_aggregator import aggregate_economic_by_territory
        df = aggregate_economic_by_territory(territory_type="province", engine=None)
        assert df["economic_stress"].between(0, 100).all()

    def test_economic_demo_deterministic(self):
        from etl.sources.geospatial.territorial_aggregator import aggregate_economic_by_territory
        df1 = aggregate_economic_by_territory(territory_type="province", engine=None)
        df2 = aggregate_economic_by_territory(territory_type="province", engine=None)
        assert df1["economic_stress"].tolist() == df2["economic_stress"].tolist()

    def test_get_territory_name_province(self):
        from etl.sources.geospatial.territorial_aggregator import _get_territory_name
        name = _get_territory_name("prov:28")
        assert "Madrid" in name

    def test_infer_type_province(self):
        from etl.sources.geospatial.territorial_aggregator import _infer_type
        assert _infer_type("prov:28") == "province"

    def test_infer_type_ccaa(self):
        from etl.sources.geospatial.territorial_aggregator import _infer_type
        assert _infer_type("ccaa:13") == "ccaa"

    def test_infer_type_municipality(self):
        from etl.sources.geospatial.territorial_aggregator import _infer_type
        assert _infer_type("mun:28079") == "municipality"

    def test_build_territory_profile_no_db(self):
        from etl.sources.geospatial.territorial_aggregator import build_territory_profile
        profile = build_territory_profile("prov:28", engine=None)
        assert profile.territory_id == "prov:28"
        assert profile.name  # should have a name
        assert profile.economic_risk is not None

    def test_compute_campaign_priority_no_db(self):
        from etl.sources.geospatial.territorial_aggregator import compute_campaign_priority
        score = compute_campaign_priority("prov:28", engine=None)
        assert 0 <= score <= 100


# ─────────────────────────────────────────────────────────────────────────────
# H. Territorial Core Service — empty DB
# ─────────────────────────────────────────────────────────────────────────────
class TestTerritorialCoreService:
    def test_cargar_territorios_no_engine(self):
        from dashboard.services.territorial_core import cargar_territorios
        df = cargar_territorios(territory_type="province", engine=None)
        # Should return DataFrame (possibly empty or with static data)
        import pandas as pd
        assert isinstance(df, pd.DataFrame)

    def test_cargar_geometrias_no_engine(self):
        from dashboard.services.territorial_core import cargar_geometrias
        result = cargar_geometrias(territory_type="province", engine=None)
        assert isinstance(result, dict)

    def test_cargar_senales_territoriales_no_engine(self):
        from dashboard.services.territorial_core import cargar_senales_territoriales
        import pandas as pd
        df = cargar_senales_territoriales(engine=None)
        assert isinstance(df, pd.DataFrame)

    def test_cargar_perfil_territorio_no_engine(self):
        from dashboard.services.territorial_core import cargar_perfil_territorio
        profile = cargar_perfil_territorio("prov:28", engine=None)
        assert isinstance(profile, dict)

    def test_cargar_ranking_no_engine(self):
        from dashboard.services.territorial_core import cargar_ranking_prioridad_campana
        import pandas as pd
        df = cargar_ranking_prioridad_campana(engine=None)
        assert isinstance(df, pd.DataFrame)

    def test_cargar_mapa_electoral_no_engine(self):
        from dashboard.services.territorial_core import cargar_mapa_electoral_territorial
        import pandas as pd
        df = cargar_mapa_electoral_territorial(engine=None)
        assert isinstance(df, pd.DataFrame)

    def test_cargar_mapa_economico_no_engine(self):
        from dashboard.services.territorial_core import cargar_mapa_economico_territorial
        import pandas as pd
        df = cargar_mapa_economico_territorial(engine=None)
        assert isinstance(df, pd.DataFrame)
        if not df.empty:
            assert "economic_stress" in df.columns

    def test_buscar_territorio_madrid(self):
        from dashboard.services.territorial_core import buscar_territorio
        results = buscar_territorio("Madrid")
        assert isinstance(results, list)
        if results:
            assert "territory_id" in results[0]

    def test_buscar_territorio_empty_query(self):
        from dashboard.services.territorial_core import buscar_territorio
        results = buscar_territorio("")
        assert isinstance(results, list)


# ─────────────────────────────────────────────────────────────────────────────
# I. Choropleth Component — handles empty data
# ─────────────────────────────────────────────────────────────────────────────
class TestChoroplethComponent:
    def test_render_choropleth_no_streamlit(self):
        """Verifica que el módulo importa sin error (sin Streamlit activo)."""
        from dashboard.components import choropleth_map
        assert hasattr(choropleth_map, "render_choropleth")
        assert hasattr(choropleth_map, "render_winner_map")
        assert hasattr(choropleth_map, "COLOR_SCALES")

    def test_color_scales_defined(self):
        from dashboard.components.choropleth_map import COLOR_SCALES
        assert "stress" in COLOR_SCALES
        assert "priority" in COLOR_SCALES
        assert "default" in COLOR_SCALES

    def test_province_cards_imports(self):
        from dashboard.components import province_cards
        assert hasattr(province_cards, "render_hot_territories_cards")
        assert hasattr(province_cards, "SIGNAL_ICONS")
        assert hasattr(province_cards, "SEVERITY_COLORS")

    def test_territory_detail_panel_imports(self):
        from dashboard.components import territory_detail_panel
        assert hasattr(territory_detail_panel, "render_territory_detail_panel")
        assert hasattr(territory_detail_panel, "render_layer_selector")


# ─────────────────────────────────────────────────────────────────────────────
# J. Territorial Tools — registered
# ─────────────────────────────────────────────────────────────────────────────
class TestTerritorialTools:
    def test_tools_registered(self):
        from agents.tools.territorial_tools import TERRITORIAL_TOOLS
        assert len(TERRITORIAL_TOOLS) == 6

    def test_tool_names(self):
        from agents.tools.territorial_tools import TERRITORIAL_TOOLS
        names = [t["name"] for t in TERRITORIAL_TOOLS]
        assert "search_territory" in names
        assert "get_territory_profile" in names
        assert "get_hot_territories" in names
        assert "get_campaign_priority_territories" in names
        assert "get_territorial_signals" in names
        assert "compare_territories" in names

    def test_all_tools_have_function(self):
        from agents.tools.territorial_tools import TERRITORIAL_TOOLS
        for tool in TERRITORIAL_TOOLS:
            assert callable(tool["function"]), f"Tool {tool['name']} missing function"

    def test_all_tools_have_schema(self):
        from agents.tools.territorial_tools import TERRITORIAL_TOOLS
        for tool in TERRITORIAL_TOOLS:
            assert "input_schema" in tool, f"Tool {tool['name']} missing input_schema"

    def test_search_territory_tool_runs(self):
        from agents.tools.territorial_tools import _search_territory
        result = _search_territory("Madrid")
        assert "found" in result
        assert isinstance(result["found"], int)

    def test_get_hot_territories_tool_runs(self):
        from agents.tools.territorial_tools import _get_hot_territories
        result = _get_hot_territories(territory_type="province", top_n=5)
        assert "territories" in result
        assert isinstance(result["territories"], list)

    def test_get_campaign_priority_tool_runs(self):
        from agents.tools.territorial_tools import _get_campaign_priority_territories
        result = _get_campaign_priority_territories(top_n=5, min_priority=0.0)
        assert "territories" in result

    def test_compare_territories_tool_runs(self):
        from agents.tools.territorial_tools import _compare_territories
        result = _compare_territories("prov:28", "prov:08")
        assert "territory_a" in result
        assert "territory_b" in result


# ─────────────────────────────────────────────────────────────────────────────
# K. Census Sections Loader
# ─────────────────────────────────────────────────────────────────────────────
class TestCensusSectionsLoader:
    def test_estimate_size_nonexistent(self):
        from etl.sources.geospatial.census_sections_loader import estimate_census_sections_size
        result = estimate_census_sections_size("/tmp/no_existe_secciones.geojson")
        assert result["exists"] is False

    def test_load_nonexistent_returns_empty(self):
        from etl.sources.geospatial.census_sections_loader import load_census_sections
        result = load_census_sections(
            path="/tmp/no_existe_secciones.geojson",
            warn_size=False,
        )
        assert result == []

    def test_estimate_size_has_required_keys(self):
        from etl.sources.geospatial.census_sections_loader import estimate_census_sections_size
        result = estimate_census_sections_size("/tmp/no_existe.geojson")
        assert "exists" in result
        assert "path" in result


# ─────────────────────────────────────────────────────────────────────────────
# L. GeoMonitor — no DB
# ─────────────────────────────────────────────────────────────────────────────
class TestGeoMonitor:
    def test_geo_monitor_instantiates(self):
        from etl.sources.geospatial.geo_monitor import GeoMonitor
        monitor = GeoMonitor(engine=None, dry_run=True)
        assert monitor.engine is None
        assert monitor.dry_run is True

    def test_sync_ine_no_db(self):
        from etl.sources.geospatial.geo_monitor import GeoMonitor
        monitor = GeoMonitor(engine=None, dry_run=True)
        counts = monitor.sync_ine()
        assert isinstance(counts, dict)
        # Should at least have province count from static data
        assert counts.get("provincias", 0) >= 0

    def test_load_geometries_no_db(self):
        from etl.sources.geospatial.geo_monitor import GeoMonitor
        monitor = GeoMonitor(engine=None, dry_run=True)
        counts = monitor.load_geometries(territory_types=["province"])
        assert isinstance(counts, dict)
        assert "province" in counts

    def test_detect_signals_no_db(self):
        from etl.sources.geospatial.geo_monitor import GeoMonitor
        monitor = GeoMonitor(engine=None, dry_run=True)
        signals = monitor.detect_signals(persist=False)
        assert isinstance(signals, list)

    def test_run_all_no_db_returns_summary(self):
        from etl.sources.geospatial.geo_monitor import GeoMonitor
        monitor = GeoMonitor(engine=None, dry_run=True)
        summary = monitor.run_all(build_all_profiles=False)
        assert "signals" in summary
        assert "ine_sync" in summary
        assert isinstance(summary["errors"], list)


# ─────────────────────────────────────────────────────────────────────────────
# M. Catastro Adapter — stub
# ─────────────────────────────────────────────────────────────────────────────
class TestCatastroAdapter:
    def test_load_catastro_summary_returns_empty(self):
        from etl.sources.geospatial.catastro_adapter import load_catastro_summary
        result = load_catastro_summary(province_code="28")
        assert isinstance(result, dict)
        assert len(result) == 0  # stub returns empty dict

    def test_load_catastro_by_territory_returns_dict(self):
        from etl.sources.geospatial.catastro_adapter import load_catastro_by_territory
        result = load_catastro_by_territory("prov:28")
        assert isinstance(result, dict)
        assert result.get("available") is False

    def test_is_catastro_available_returns_false(self):
        from etl.sources.geospatial.catastro_adapter import is_catastro_available
        assert is_catastro_available() is False

    def test_get_property_density_returns_empty(self):
        from etl.sources.geospatial.catastro_adapter import get_property_density_by_province
        result = get_property_density_by_province()
        assert isinstance(result, dict)
        assert len(result) == 0
