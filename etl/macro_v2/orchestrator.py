"""
Macro Finance v2 orchestrator.

Runs every connector, persists rows + pair rows, updates source health.
CLI: python -m etl.macro_v2.orchestrator [--only ecb_sdw,imf_dots]
"""
from __future__ import annotations

import logging
from typing import Optional

from .base import IngestResult, MacroConnector

logger = logging.getLogger(__name__)


def _all_connectors() -> list[MacroConnector]:
    from .connectors import (
        ECBYieldsConnector,
        EurostatHICPConnector,
        EurostatLFSConnector,
        EurostatHPIConnector,
        IMFDOTSConnector,
        IMFCOFERConnector,
        IMFWEOConnector,
        WorldBankNTLConnector,
        BISLBSConnector,
        BlackMarbleConnector,
        BdeBopConnector,
    )
    return [
        ECBYieldsConnector(),
        EurostatHICPConnector(),
        EurostatLFSConnector(),
        EurostatHPIConnector(),
        IMFDOTSConnector(),
        IMFCOFERConnector(),
        IMFWEOConnector(),
        WorldBankNTLConnector(),
        BISLBSConnector(),
        BlackMarbleConnector(),
        BdeBopConnector(),
    ]


def run_all(only: Optional[list[str]] = None) -> dict:
    results: list[IngestResult] = []
    for conn in _all_connectors():
        if only and conn.source_id not in only:
            continue
        logger.info("Running macro connector: %s", conn.source_id)
        results.append(conn.run())
    total_rows  = sum(r.n_rows for r in results)
    total_pairs = sum(r.n_pairs for r in results)
    n_ok        = sum(1 for r in results if r.error is None and (r.n_rows > 0 or r.n_pairs > 0))
    n_stub      = sum(1 for r in results if r.is_stub)
    n_failed    = sum(1 for r in results if r.error is not None)
    return {
        "n_connectors": len(results),
        "n_ok":         n_ok,
        "n_stub":       n_stub,
        "n_failed":     n_failed,
        "total_rows":   total_rows,
        "total_pairs":  total_pairs,
        "results": [
            {
                "source_id":   r.source_id,
                "n_rows":      r.n_rows,
                "n_pairs":     r.n_pairs,
                "n_metrics":   r.n_metrics,
                "countries":   r.countries,
                "duration_ms": r.duration_ms,
                "is_stub":     r.is_stub,
                "error":       r.error,
            }
            for r in results
        ],
    }


def _cli():
    import argparse
    import json
    p = argparse.ArgumentParser()
    p.add_argument("--only", type=str, default="")
    args = p.parse_args()
    only = [s.strip() for s in args.only.split(",") if s.strip()] or None
    print(json.dumps(run_all(only=only), indent=2, default=str))


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    _cli()
