from etl.electoral.config import load_config


def test_load_config_defaults(monkeypatch, tmp_path):
    monkeypatch.setenv("RAW_DATA_PATH", str(tmp_path))
    cfg = load_config()

    assert cfg.pipeline_name == "dashboard_electoral"
    assert "interior_resultados" in cfg.enabled_sources
    assert cfg.raw_root.exists()
