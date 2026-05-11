"""
Orchestrator — runs every Risk v2 connector and reports a summary.

Usage from CLI:
    python -m etl.risk_v2.orchestrator [--only gpr,bce,wgi] [--country ES]

Usage from FastAPI:
    from etl.risk_v2.orchestrator import run_all
    summary = run_all(only=None, country='ES', recompute=True)
"""
from __future__ import annotations

import logging
from typing import Optional

from .base import IngestResult, RiskV2Connector

logger = logging.getLogger(__name__)


# ── Registry of connectors ────────────────────────────────────────────────────

def _all_connectors() -> list[RiskV2Connector]:
    from .connector_gpr        import GPRConnector
    from .connector_wgi        import WGIConnector
    from .connector_bce        import BCEConnector
    from .connector_eurostat   import EurostatConnector
    from .connector_epu        import EPUConnector
    from .connector_metaculus  import MetaculusConnector
    from .connector_rss_nlp    import RssNlpConnector
    from .connector_stubs import (
        ACLEDConnector, GDELTConnector, VDemConnector,
        CISConnector, RSUIConnector, IDEAConnector, RSFConnector,
    )
    return [
        GPRConnector(),
        WGIConnector(),
        BCEConnector(),
        EurostatConnector(),
        EPUConnector(),
        MetaculusConnector(),
        RssNlpConnector(),
        ACLEDConnector(),
        GDELTConnector(),
        VDemConnector(),
        CISConnector(),
        RSUIConnector(),
        IDEAConnector(),
        RSFConnector(),
    ]


def run_all(
    only: Optional[list[str]] = None,
    country: str = "ES",
    recompute: bool = True,
) -> dict:
    """Run every connector (or filtered subset) and optionally recompute indices."""
    results: list[IngestResult] = []
    for conn in _all_connectors():
        if only and conn.source_id not in only:
            continue
        logger.info("Running connector: %s", conn.source_id)
        results.append(conn.run())

    total_rows = sum(r.n_rows for r in results)
    n_ok       = sum(1 for r in results if r.error is None and r.n_rows > 0)
    n_stub     = sum(1 for r in results if r.is_stub)
    n_failed   = sum(1 for r in results if r.error is not None)

    # Recompute indices + fire alerts
    recompute_summary: dict = {}
    if recompute:
        try:
            from dashboard.services import risk_engine_v2 as eng
            indices = eng.compute_all(country=country, persist=True)
            alerts = eng.fire_alerts(country=country)
            recompute_summary = {
                "n_indices_computed": len(indices),
                "n_alerts_fired":     len(alerts),
                "scores": [
                    {"index_id": i["index_id"], "score": i["score"], "label": i["label"],
                     "n_components_used": i["n_components_used"]}
                    for i in indices
                ],
            }
        except Exception as exc:
            logger.warning("recompute failed: %s", exc)
            recompute_summary = {"error": str(exc)}

    return {
        "country":    country,
        "n_connectors":  len(results),
        "n_ok":          n_ok,
        "n_stub":        n_stub,
        "n_failed":      n_failed,
        "total_rows":    total_rows,
        "results": [
            {
                "source_id":   r.source_id,
                "n_rows":      r.n_rows,
                "n_metrics":   r.n_metrics,
                "countries":   r.countries,
                "duration_ms": r.duration_ms,
                "is_stub":     r.is_stub,
                "error":       r.error,
            }
            for r in results
        ],
        "recompute": recompute_summary,
    }


def _cli():
    import argparse
    import json
    p = argparse.ArgumentParser()
    p.add_argument("--only", type=str, default="", help="csv of source_ids")
    p.add_argument("--country", type=str, default="ES")
    p.add_argument("--no-recompute", action="store_true")
    args = p.parse_args()
    only = [s.strip() for s in args.only.split(",") if s.strip()] or None
    summary = run_all(only=only, country=args.country, recompute=not args.no_recompute)
    print(json.dumps(summary, indent=2, default=str))


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    _cli()
