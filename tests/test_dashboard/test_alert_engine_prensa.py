from __future__ import annotations

import pandas as pd

from dashboard.services.alert_engine import (
    detectar_alertas_fuentes,
    detectar_alertas_prensa,
)


def test_detectar_alertas_prensa_genera_critical_y_warning():
    df = pd.DataFrame(
        [
            {
                "partido": "PSOE",
                "n_24h": 14,
                "n_prev": 8,
                "sent_24h": -0.42,
                "sent_prev": -0.15,
                "ratio_menciones": 2.8,
            },
            {
                "partido": "PP",
                "n_24h": 7,
                "n_prev": 12,
                "sent_24h": -0.25,
                "sent_prev": -0.18,
                "ratio_menciones": 1.95,
            },
            {
                "partido": "VOX",
                "n_24h": 3,  # por debajo de min_menciones
                "n_prev": 10,
                "sent_24h": -0.5,
                "sent_prev": -0.2,
                "ratio_menciones": 4.0,
            },
        ]
    )

    out = detectar_alertas_prensa(df)
    sev = {(a.tipo, a.severidad, a.metadata.get("partido")) for a in out}
    assert ("prensa", "CRITICAL", "PSOE") in sev
    assert ("prensa", "WARNING", "PP") in sev
    assert all(a.metadata.get("partido") != "VOX" for a in out)


def test_detectar_alertas_fuentes_filtra_estados_ok():
    df = pd.DataFrame(
        [
            {"source_id": "elpais", "status": "ok", "errors_count": 0, "freshness_lag_s": 600},
            {"source_id": "elmundo", "status": "degraded", "errors_count": 2, "freshness_lag_s": 9000},
            {"source_id": "abc", "status": "failing", "errors_count": 6, "freshness_lag_s": 56000},
        ]
    )
    out = detectar_alertas_fuentes(df)
    sev = {(a.metadata.get("source_id"), a.severidad) for a in out}
    assert ("elmundo", "WARNING") in sev
    assert ("abc", "CRITICAL") in sev
    assert all(a.metadata.get("source_id") != "elpais" for a in out)
