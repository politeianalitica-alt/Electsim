"""
Tests — Bloque 8 — Data Operations Core.

Cobertura:
  A. Source Registry (seed, list, register)
  B. Pipeline Registry (seed, list, register)
  C. Run Logger (context manager success, failure, partial)
  D. Freshness (status cálculo, compute_all sin BD)
  E. Quality Checks (missing table → skipped, summary)
  F. Cache Manager (sin BD → vacío)
  G. Raw Manifest (checksum, register sin BD)
  H. Lineage (record + query chain)
  I. Backfill (error sin pipeline, retry sin BD)
  J. Health Monitor (compute_global, sin BD → unknown)
  K. Data Ops Core Service (empty DB no crash)
  L. Data Ops Tools (6 tools registradas + callable)
  M. CLI Parser (argumentos obligatorios y exclusivos)
"""
from __future__ import annotations

import sys
from pathlib import Path
from datetime import datetime, timezone

import pytest

_ROOT = Path(__file__).resolve().parents[1]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))


# ═══════════════════════════════════════════════════════════════════════════════
# A — Source Registry
# ═══════════════════════════════════════════════════════════════════════════════

class TestSourceRegistry:

    def test_seed_returns_count(self):
        from etl.operations.source_registry import seed_default_sources
        n = seed_default_sources(engine=None)
        assert isinstance(n, int)
        assert n > 0

    def test_list_sources_no_engine_returns_list(self):
        from etl.operations.source_registry import seed_default_sources, list_sources
        seed_default_sources(engine=None)
        sources = list_sources(engine=None)
        assert isinstance(sources, list)
        assert len(sources) > 0

    def test_source_has_required_fields(self):
        from etl.operations.source_registry import seed_default_sources, list_sources
        seed_default_sources(engine=None)
        sources = list_sources(engine=None)
        src = sources[0]
        assert hasattr(src, "source_id")
        assert hasattr(src, "name")
        assert hasattr(src, "domain")
        assert hasattr(src, "source_type")

    def test_list_sources_domain_filter(self):
        from etl.operations.source_registry import seed_default_sources, list_sources
        seed_default_sources(engine=None)
        electoral = list_sources(domain="electoral", engine=None)
        assert all(s.domain == "electoral" for s in electoral)

    def test_list_sources_active_only(self):
        from etl.operations.source_registry import seed_default_sources, list_sources
        seed_default_sources(engine=None)
        active = list_sources(active_only=True, engine=None)
        assert all(s.active for s in active)

    def test_register_source(self):
        from etl.operations.source_registry import register_source, list_sources
        from etl.operations.schemas import SourceDefinition
        src = SourceDefinition(
            source_id="test_source_xyz",
            name="Test Source XYZ",
            domain="system",
            source_type="api",
        )
        register_source(src, engine=None)
        sources = list_sources(engine=None)
        ids = [s.source_id for s in sources]
        assert "test_source_xyz" in ids

    def test_multiple_domains_covered(self):
        from etl.operations.source_registry import seed_default_sources, list_sources
        seed_default_sources(engine=None)
        sources = list_sources(engine=None)
        domains = {s.domain for s in sources}
        assert len(domains) >= 3


# ═══════════════════════════════════════════════════════════════════════════════
# B — Pipeline Registry
# ═══════════════════════════════════════════════════════════════════════════════

class TestPipelineRegistry:

    def test_seed_returns_count(self):
        from etl.operations.pipeline_registry import seed_default_pipelines
        n = seed_default_pipelines(engine=None)
        assert isinstance(n, int)
        assert n > 0

    def test_list_pipelines_no_engine(self):
        from etl.operations.pipeline_registry import seed_default_pipelines, list_pipelines
        seed_default_pipelines(engine=None)
        pipelines = list_pipelines(engine=None)
        assert isinstance(pipelines, list)
        assert len(pipelines) > 0

    def test_pipeline_has_required_fields(self):
        from etl.operations.pipeline_registry import seed_default_pipelines, list_pipelines
        seed_default_pipelines(engine=None)
        pipelines = list_pipelines(engine=None)
        p = pipelines[0]
        assert hasattr(p, "pipeline_id")
        assert hasattr(p, "name")
        assert hasattr(p, "domain")
        assert hasattr(p, "entrypoint")

    def test_list_pipelines_active_only(self):
        from etl.operations.pipeline_registry import seed_default_pipelines, list_pipelines
        seed_default_pipelines(engine=None)
        active = list_pipelines(active_only=True, engine=None)
        assert all(p.active for p in active)

    def test_register_pipeline(self):
        from etl.operations.pipeline_registry import register_pipeline, list_pipelines
        from etl.operations.schemas import PipelineDefinition
        p = PipelineDefinition(
            pipeline_id="test_pipeline_xyz",
            name="Test Pipeline XYZ",
            domain="internal",
            entrypoint="pipelines.test",
        )
        register_pipeline(p, engine=None)
        pipelines = list_pipelines(engine=None)
        ids = [pp.pipeline_id for pp in pipelines]
        assert "test_pipeline_xyz" in ids


# ═══════════════════════════════════════════════════════════════════════════════
# C — Run Logger
# ═══════════════════════════════════════════════════════════════════════════════

class TestRunLogger:

    def test_context_manager_yields_context(self):
        from etl.operations.run_logger import pipeline_run, RunContext
        with pipeline_run("test_pipeline", engine=None) as ctx:
            assert isinstance(ctx, RunContext)
            assert ctx.pipeline_id == "test_pipeline"

    def test_context_manager_run_id_generated(self):
        from etl.operations.run_logger import pipeline_run
        with pipeline_run("test_pipeline", engine=None) as ctx:
            assert ctx.run_id is not None
            assert len(ctx.run_id) > 0

    def test_context_manager_records_tracked(self):
        from etl.operations.run_logger import pipeline_run
        with pipeline_run("test_pipeline", engine=None) as ctx:
            ctx.records_extracted = 100
            ctx.records_loaded = 98
        assert ctx.records_extracted == 100
        assert ctx.records_loaded == 98

    def test_context_manager_failure_reraises(self):
        from etl.operations.run_logger import pipeline_run
        with pytest.raises(ValueError, match="test error"):
            with pipeline_run("test_pipeline", engine=None) as ctx:
                ctx.records_extracted = 10
                raise ValueError("test error")

    def test_partial_status_when_some_failed(self):
        from etl.operations.run_logger import pipeline_run
        with pipeline_run("test_pipeline", engine=None) as ctx:
            ctx.records_extracted = 10
            ctx.records_loaded = 8
            ctx.records_failed = 2
        assert ctx.records_failed == 2


# ═══════════════════════════════════════════════════════════════════════════════
# D — Freshness
# ═══════════════════════════════════════════════════════════════════════════════

class TestFreshness:

    def test_healthy_status_within_expected(self):
        from etl.operations.freshness import freshness_status
        assert freshness_status(lag_minutes=30, expected_minutes=60) == "healthy"

    def test_degraded_status_double_expected(self):
        from etl.operations.freshness import freshness_status
        assert freshness_status(lag_minutes=100, expected_minutes=60) == "degraded"

    def test_down_status_way_over_expected(self):
        from etl.operations.freshness import freshness_status
        assert freshness_status(lag_minutes=200, expected_minutes=60) == "down"

    def test_healthy_status_at_exact_expected(self):
        from etl.operations.freshness import freshness_status
        # At exactly expected → healthy
        assert freshness_status(lag_minutes=60, expected_minutes=60) == "healthy"

    def test_compute_all_no_engine_returns_list(self):
        from etl.operations.freshness import compute_all_freshness
        data = compute_all_freshness(engine=None)
        assert isinstance(data, list)

    def test_compute_all_items_have_module(self):
        from etl.operations.freshness import compute_all_freshness
        data = compute_all_freshness(engine=None)
        if data:
            assert "module" in data[0]
            assert "status" in data[0]


# ═══════════════════════════════════════════════════════════════════════════════
# E — Quality Checks
# ═══════════════════════════════════════════════════════════════════════════════

class TestQualityChecks:

    def test_seed_returns_count(self):
        from etl.operations.quality_checks import seed_default_quality_checks
        n = seed_default_quality_checks(engine=None)
        assert isinstance(n, int)
        assert n > 0

    def test_run_all_no_engine_returns_results(self):
        from etl.operations.quality_checks import run_all_checks
        results = run_all_checks(engine=None, persist=False)
        assert isinstance(results, list)

    def test_missing_table_returns_skipped(self):
        from etl.operations.quality_checks import run_check
        from etl.operations.schemas import DataQualityCheck
        check = DataQualityCheck(
            check_id="test_missing_table",
            name="Test missing table",
            table_name="tabla_que_no_existe_xyz",
            domain="system",
            check_type="not_null",
            severity="WARNING",
        )
        # engine=None → skipped (no engine configured)
        result = run_check(check, engine=None)
        assert result.status == "skipped"

    def test_get_quality_summary_structure(self):
        from etl.operations.quality_checks import run_all_checks, get_quality_summary
        results = run_all_checks(engine=None, persist=False)
        summary = get_quality_summary(results)
        assert "total" in summary
        assert "passed" in summary
        assert "failed" in summary
        assert "skipped" in summary
        assert "pass_rate" in summary

    def test_pass_rate_between_zero_and_one(self):
        from etl.operations.quality_checks import run_all_checks, get_quality_summary
        results = run_all_checks(engine=None, persist=False)
        summary = get_quality_summary(results)
        assert 0.0 <= summary["pass_rate"] <= 1.0

    def test_all_results_have_status(self):
        from etl.operations.quality_checks import run_all_checks
        results = run_all_checks(engine=None, persist=False)
        valid_statuses = {"passed", "failed", "warning", "skipped"}
        for r in results:
            assert r.status in valid_statuses, f"Unexpected status: {r.status}"


# ═══════════════════════════════════════════════════════════════════════════════
# F — Cache Manager
# ═══════════════════════════════════════════════════════════════════════════════

class TestCacheManager:

    def test_cache_stats_no_engine_returns_dict(self):
        from etl.operations.cache_manager import cache_stats
        result = cache_stats(engine=None)
        assert isinstance(result, dict)

    def test_purge_source_cache_no_engine_no_crash(self):
        from etl.operations.cache_manager import purge_source_cache
        # Returns int (deleted count) — no exception raised
        result = purge_source_cache("INE_SONDEOS", engine=None)
        assert isinstance(result, int)


# ═══════════════════════════════════════════════════════════════════════════════
# G — Raw Manifest
# ═══════════════════════════════════════════════════════════════════════════════

class TestRawManifest:

    def test_compute_checksum_valid_file(self):
        import tempfile, os
        from etl.operations.raw_manifest import compute_checksum
        with tempfile.NamedTemporaryFile(delete=False, suffix=".txt") as f:
            f.write(b"test content 123")
            path = f.name
        try:
            checksum = compute_checksum(path)
            assert checksum is not None
            assert len(checksum) == 64  # SHA-256 hex
        finally:
            os.unlink(path)

    def test_compute_checksum_missing_file(self):
        from etl.operations.raw_manifest import compute_checksum
        # Debe devolver algo sin lanzar excepción
        result = compute_checksum("/path/que/no/existe.parquet")
        assert isinstance(result, str)

    def test_register_raw_file_no_engine(self):
        from etl.operations.raw_manifest import register_raw_file
        from etl.operations.schemas import RawDataManifest
        result = register_raw_file(
            source_id="test_source",
            path=Path("/data/test.parquet"),
            engine=None,
        )
        # Debe devolver un RawDataManifest o None
        assert result is None or hasattr(result, "manifest_id")

    def test_list_raw_files_no_engine(self):
        from etl.operations.raw_manifest import list_raw_files
        result = list_raw_files(engine=None)
        assert isinstance(result, list)


# ═══════════════════════════════════════════════════════════════════════════════
# H — Lineage
# ═══════════════════════════════════════════════════════════════════════════════

class TestLineage:

    def test_record_lineage_no_engine(self):
        from etl.operations.lineage import record_lineage
        result = record_lineage(
            source_object_type="source",
            source_object_id="INE_SONDEOS",
            target_object_type="table",
            target_object_id="sondeos",
            transformation="extract_and_load",
            engine=None,
        )
        # Returns DataLineage or None
        assert result is None or hasattr(result, "lineage_id")

    def test_get_lineage_chain_no_engine(self):
        from etl.operations.lineage import get_lineage_chain
        result = get_lineage_chain("table", "sondeos", engine=None)
        assert isinstance(result, dict)
        assert "upstream" in result
        assert "downstream" in result

    def test_lineage_chain_returns_lists(self):
        from etl.operations.lineage import get_lineage_chain
        result = get_lineage_chain("table", "any_table", engine=None)
        assert isinstance(result["upstream"], list)
        assert isinstance(result["downstream"], list)


# ═══════════════════════════════════════════════════════════════════════════════
# I — Backfill
# ═══════════════════════════════════════════════════════════════════════════════

class TestBackfill:

    def test_backfill_unknown_source_returns_error(self):
        from etl.operations.backfill import backfill_source
        result = backfill_source(
            "source_que_no_existe_xyz",
            start_date="2024-01-01",
            end_date="2024-01-31",
        )
        assert isinstance(result, dict)
        # No pipeline → error or not_supported
        assert "status" in result
        assert result["status"] in ("error", "not_supported")

    def test_backfill_result_has_status_key(self):
        from etl.operations.backfill import backfill_source
        result = backfill_source(
            "test_source_any",
            start_date="2024-01-01",
            end_date="2024-01-31",
        )
        assert "status" in result

    def test_retry_failed_runs_no_engine(self):
        from etl.operations.backfill import retry_failed_runs
        result = retry_failed_runs(engine=None)
        # Returns dict (with no_engine status) or list depending on engine
        assert isinstance(result, (list, dict))


# ═══════════════════════════════════════════════════════════════════════════════
# J — Health Monitor
# ═══════════════════════════════════════════════════════════════════════════════

class TestHealthMonitor:

    def test_compute_global_no_engine_returns_dict(self):
        from etl.operations.health_monitor import compute_global_data_health
        health = compute_global_data_health(engine=None)
        assert isinstance(health, dict)

    def test_global_health_has_required_keys(self):
        from etl.operations.health_monitor import compute_global_data_health
        health = compute_global_data_health(engine=None)
        required = [
            "overall_status", "sources_healthy", "sources_degraded",
            "sources_down", "pipelines_ok_24h", "pipelines_failed_24h",
            "quality_pass_rate",
        ]
        for key in required:
            assert key in health, f"Missing key: {key}"

    def test_overall_status_is_valid(self):
        from etl.operations.health_monitor import compute_global_data_health
        health = compute_global_data_health(engine=None)
        assert health["overall_status"] in ("healthy", "warning", "degraded", "unknown")

    def test_detect_failed_sources_no_engine(self):
        from etl.operations.health_monitor import detect_failed_sources
        result = detect_failed_sources(engine=None)
        assert isinstance(result, list)

    def test_detect_stale_sources_no_engine(self):
        from etl.operations.health_monitor import detect_stale_sources
        result = detect_stale_sources(engine=None)
        assert isinstance(result, list)

    def test_create_alerts_no_engine(self):
        from etl.operations.health_monitor import create_data_ops_alerts
        alerts = create_data_ops_alerts(engine=None)
        assert isinstance(alerts, list)

    def test_compute_domain_health_no_engine(self):
        from etl.operations.health_monitor import compute_domain_health
        result = compute_domain_health("electoral", engine=None)
        assert isinstance(result, dict)
        assert "domain" in result
        assert result["domain"] == "electoral"


# ═══════════════════════════════════════════════════════════════════════════════
# K — Data Ops Core Service
# ═══════════════════════════════════════════════════════════════════════════════

class TestDataOpsCoreService:

    def test_cargar_kpis_no_crash(self):
        from dashboard.services.data_ops_core import cargar_kpis_data_ops
        result = cargar_kpis_data_ops(engine=None)
        assert isinstance(result, dict)

    def test_cargar_kpis_has_overall_status(self):
        from dashboard.services.data_ops_core import cargar_kpis_data_ops
        result = cargar_kpis_data_ops(engine=None)
        assert "overall_status" in result

    def test_cargar_estado_fuentes_returns_df(self):
        from dashboard.services.data_ops_core import cargar_estado_fuentes
        import pandas as pd
        result = cargar_estado_fuentes(engine=None)
        assert isinstance(result, pd.DataFrame)

    def test_cargar_pipeline_runs_returns_df(self):
        from dashboard.services.data_ops_core import cargar_pipeline_runs
        import pandas as pd
        result = cargar_pipeline_runs(engine=None)
        assert isinstance(result, pd.DataFrame)

    def test_cargar_quality_results_returns_df(self):
        from dashboard.services.data_ops_core import cargar_quality_results
        import pandas as pd
        result = cargar_quality_results(engine=None)
        assert isinstance(result, pd.DataFrame)

    def test_cargar_quality_summary_no_crash(self):
        from dashboard.services.data_ops_core import cargar_quality_summary
        result = cargar_quality_summary(engine=None)
        assert isinstance(result, dict)

    def test_cargar_source_health_returns_df(self):
        from dashboard.services.data_ops_core import cargar_source_health
        import pandas as pd
        result = cargar_source_health(engine=None)
        assert isinstance(result, pd.DataFrame)

    def test_cargar_cache_stats_no_crash(self):
        from dashboard.services.data_ops_core import cargar_cache_stats
        result = cargar_cache_stats(engine=None)
        assert isinstance(result, dict)

    def test_cargar_raw_manifest_returns_df(self):
        from dashboard.services.data_ops_core import cargar_raw_manifest
        import pandas as pd
        result = cargar_raw_manifest(engine=None)
        assert isinstance(result, pd.DataFrame)

    def test_cargar_lineage_returns_dict(self):
        from dashboard.services.data_ops_core import cargar_lineage
        result = cargar_lineage("table", "test_table", engine=None)
        assert isinstance(result, dict)
        assert "upstream" in result
        assert "downstream" in result

    def test_cargar_modulos_freshness_returns_df(self):
        from dashboard.services.data_ops_core import cargar_modulos_freshness
        import pandas as pd
        result = cargar_modulos_freshness(engine=None)
        assert isinstance(result, pd.DataFrame)

    def test_cargar_pipelines_registry_returns_df(self):
        from dashboard.services.data_ops_core import cargar_pipelines_registry
        import pandas as pd
        result = cargar_pipelines_registry(engine=None)
        assert isinstance(result, pd.DataFrame)


# ═══════════════════════════════════════════════════════════════════════════════
# L — Data Ops Tools
# ═══════════════════════════════════════════════════════════════════════════════

class TestDataOpsTools:

    def test_tools_registered(self):
        from agents.tools.data_ops_tools import DATA_OPS_TOOLS
        assert len(DATA_OPS_TOOLS) == 6

    def test_all_tools_have_required_fields(self):
        from agents.tools.data_ops_tools import DATA_OPS_TOOLS
        for tool in DATA_OPS_TOOLS:
            assert "name" in tool, f"Tool missing 'name'"
            assert "description" in tool, f"Tool {tool.get('name')} missing 'description'"
            assert "input_schema" in tool, f"Tool {tool.get('name')} missing 'input_schema'"
            assert "function" in tool, f"Tool {tool.get('name')} missing 'function'"
            assert callable(tool["function"]), f"Tool {tool.get('name')} function not callable"

    def test_tool_names_unique(self):
        from agents.tools.data_ops_tools import DATA_OPS_TOOLS
        names = [t["name"] for t in DATA_OPS_TOOLS]
        assert len(names) == len(set(names)), "Duplicate tool names"

    def test_get_data_ops_status_callable(self):
        from agents.tools.data_ops_tools import DATA_OPS_TOOLS
        tool = next(t for t in DATA_OPS_TOOLS if t["name"] == "get_data_ops_status")
        result = tool["function"]({})
        assert isinstance(result, dict)
        assert "overall_status" in result

    def test_get_source_health_callable(self):
        from agents.tools.data_ops_tools import DATA_OPS_TOOLS
        tool = next(t for t in DATA_OPS_TOOLS if t["name"] == "get_source_health")
        result = tool["function"]({"domain": "electoral"})
        assert isinstance(result, dict)

    def test_get_stale_modules_callable(self):
        from agents.tools.data_ops_tools import DATA_OPS_TOOLS
        tool = next(t for t in DATA_OPS_TOOLS if t["name"] == "get_stale_modules")
        result = tool["function"]({})
        assert isinstance(result, dict)
        assert "stale_modules" in result

    def test_get_recent_pipeline_runs_callable(self):
        from agents.tools.data_ops_tools import DATA_OPS_TOOLS
        tool = next(t for t in DATA_OPS_TOOLS if t["name"] == "get_recent_pipeline_runs")
        result = tool["function"]({"limit": 5})
        assert isinstance(result, dict)
        assert "runs" in result

    def test_get_data_quality_summary_callable(self):
        from agents.tools.data_ops_tools import DATA_OPS_TOOLS
        tool = next(t for t in DATA_OPS_TOOLS if t["name"] == "get_data_quality_summary")
        result = tool["function"]({})
        assert isinstance(result, dict)

    def test_explain_data_lineage_no_id(self):
        from agents.tools.data_ops_tools import DATA_OPS_TOOLS
        tool = next(t for t in DATA_OPS_TOOLS if t["name"] == "explain_data_lineage")
        result = tool["function"]({"object_type": "table", "object_id": ""})
        assert "error" in result

    def test_explain_data_lineage_with_id(self):
        from agents.tools.data_ops_tools import DATA_OPS_TOOLS
        tool = next(t for t in DATA_OPS_TOOLS if t["name"] == "explain_data_lineage")
        result = tool["function"]({"object_type": "table", "object_id": "sondeos"})
        assert isinstance(result, dict)
        # Puede tener upstream o error, ambos son válidos sin BD
        assert "upstream" in result or "error" in result


# ═══════════════════════════════════════════════════════════════════════════════
# M — CLI Parser
# ═══════════════════════════════════════════════════════════════════════════════

class TestCLIParser:

    def test_parser_requires_action(self):
        from pipelines.data_ops_core import build_parser
        parser = build_parser()
        with pytest.raises(SystemExit):
            parser.parse_args([])

    def test_parser_seed_sources(self):
        from pipelines.data_ops_core import build_parser
        parser = build_parser()
        args = parser.parse_args(["--seed-sources"])
        assert args.seed_sources is True

    def test_parser_health(self):
        from pipelines.data_ops_core import build_parser
        parser = build_parser()
        args = parser.parse_args(["--health"])
        assert args.health is True

    def test_parser_quality_dry_run(self):
        from pipelines.data_ops_core import build_parser
        parser = build_parser()
        args = parser.parse_args(["--quality", "--dry-run"])
        assert args.quality is True
        assert args.dry_run is True

    def test_parser_purge_cache_with_source(self):
        from pipelines.data_ops_core import build_parser
        parser = build_parser()
        args = parser.parse_args(["--purge-cache", "--source", "INE_SONDEOS"])
        assert args.purge_cache is True
        assert args.source == "INE_SONDEOS"

    def test_parser_run_all(self):
        from pipelines.data_ops_core import build_parser
        parser = build_parser()
        args = parser.parse_args(["--run-all"])
        assert args.run_all is True

    def test_actions_are_mutually_exclusive(self):
        from pipelines.data_ops_core import build_parser
        parser = build_parser()
        with pytest.raises(SystemExit):
            parser.parse_args(["--health", "--quality"])
