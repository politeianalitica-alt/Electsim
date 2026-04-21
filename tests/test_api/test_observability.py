from api.observability import render_prometheus_metrics


def test_render_prometheus_metrics_exposes_core_series():
    summary = {
        "uptime_seconds": 123,
        "database": {"ready": True},
        "source_health": {"by_status": {"failing": 1, "ok": 3}},
        "scraper_incidents": {"by_severity": {"critical": 2}},
        "scraping_log": {"by_status": {"error": 2, "ok": 5}},
        "ingestion": {"tracked_sources": 4, "stale_sources": 1},
        "alerts": {"by_severity": {"WARNING": 3}},
    }
    request_metrics = {
        "requests_total": {
            ("GET", "/health", 200): 2,
            ("GET", "/metrics", 200): 1,
        },
        "request_duration_sum_ms": {
            ("GET", "/health"): 10.0,
        },
        "request_duration_count": {
            ("GET", "/health"): 2,
        },
    }

    rendered = render_prometheus_metrics(summary, request_metrics=request_metrics)

    assert "electsim_api_database_ready 1" in rendered
    assert 'electsim_api_requests_total{method="GET",path="/health",status="200"} 2' in rendered
    assert 'electsim_source_health_total{status="ok"} 3' in rendered
    assert "electsim_ingest_sources_total 4" in rendered
    assert 'electsim_system_alerts_total{severity="WARNING"} 3' in rendered
