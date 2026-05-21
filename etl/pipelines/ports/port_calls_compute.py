"""Job nocturno · calcula port calls desde `vessel_positions` y rellena
`port_call_events`. También recomputa congestión actual por puerto.

Diseñado para correr cada 10 minutos (cron-like) o sobre todo el catálogo
cada noche · idempotente.

CLI:
  python -m etl.pipelines.ports.port_calls_compute [--ports slug1,slug2,...]
                                                    [--lookback-h N]
"""
from __future__ import annotations

import argparse
import logging
import sys

logger = logging.getLogger(__name__)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="port_calls_compute")
    parser.add_argument("--ports", type=str, default=None,
                        help="CSV port_slugs (default: catálogo completo)")
    parser.add_argument("--lookback-h", type=int, default=24,
                        help="Ventana en horas hacia atrás (default 24)")
    parser.add_argument("--log-level", type=str, default="INFO")
    args = parser.parse_args(argv)

    logging.basicConfig(
        level=getattr(logging, args.log_level.upper(), logging.INFO),
        format="%(asctime)s %(levelname)s %(name)s · %(message)s",
    )

    from etl.sources.ports.port_intel import (
        compute_congestion,
        detect_port_calls,
    )

    if args.ports:
        slugs = [s.strip() for s in args.ports.split(",") if s.strip()]
    else:
        from etl.sources.ports.catalog import list_ports
        slugs = [p["slug"] for p in list_ports()]

    total_arrivals = 0
    n_with_data = 0
    for slug in slugs:
        n = detect_port_calls(slug, lookback_h=args.lookback_h)
        cong = compute_congestion(slug, since_h=args.lookback_h)
        total_arrivals += n
        if (cong.get("vessels_anchored") or 0) > 0 or (cong.get("arrivals_24h") or 0) > 0:
            n_with_data += 1
        logger.debug("%s · arrivals %d · cong %s", slug, n, cong)

    logger.info(
        "Pipeline port_calls_compute · %d puertos · %d arrivals nuevos · %d con datos AIS",
        len(slugs),
        total_arrivals,
        n_with_data,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
