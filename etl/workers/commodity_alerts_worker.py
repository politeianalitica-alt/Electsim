"""Worker · evaluación periódica de alertas commodities.

Uso:
  python -m etl.workers.commodity_alerts_worker            · una pasada y exit
  python -m etl.workers.commodity_alerts_worker --loop 900 · cada 15min infinito
  python -m etl.workers.commodity_alerts_worker --dry-run  · simulación, no envía

Variables de entorno relevantes:
  DATABASE_URL          · postgres connection (default sin BD → no-op)
  RESEND_API_KEY        · email opt-in · sin clave hace skipped
  RESEND_FROM           · sender email · default alerts@politeia-analitica.es
  FORECAST_LOOP_DELAY   · segundos entre pasadas en modo --loop

Pensado para correr como cron (Vercel cron, Railway cron, k8s CronJob, etc.)
o como contenedor side-car del backend principal.
"""
from __future__ import annotations

import argparse
import json
import logging
import os
import signal
import sys
import time
from datetime import datetime, timezone

logger = logging.getLogger("politeia.alerts_worker")


def _run_once(dry_run: bool = False) -> dict:
    """Ejecuta una pasada del evaluador. Returns summary dict."""
    from etl.sources.commodities.alerts_service import evaluate_all
    summary = evaluate_all(dry_run=dry_run)
    return summary


def _print_summary(summary: dict) -> None:
    logger.info(
        "evaluated=%d triggered=%d errors=%d",
        summary.get("evaluated", 0),
        summary.get("triggered", 0),
        len(summary.get("errors") or []),
    )
    if summary.get("events"):
        for ev in summary["events"]:
            logger.info("  triggered · %s", json.dumps(ev, default=str))
    for err in summary.get("errors") or []:
        logger.warning("  error · %s", err)


def main(argv: list[str] | None = None) -> int:
    logging.basicConfig(
        level=os.environ.get("LOG_LEVEL", "INFO"),
        format="%(asctime)s %(name)s %(levelname)s %(message)s",
    )
    parser = argparse.ArgumentParser(description="Politeia · commodity alerts worker")
    parser.add_argument(
        "--loop",
        type=int,
        default=0,
        help="Segundos entre pasadas · 0 = exit tras 1 pasada (default cron)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="No graba eventos ni envía notifications · útil para debug",
    )
    args = parser.parse_args(argv)

    # Ctrl+C limpio en modo loop
    stop = {"flag": False}

    def _stop(_sig, _frame):
        logger.info("recibido señal · terminando tras pasada actual")
        stop["flag"] = True

    signal.signal(signal.SIGINT, _stop)
    signal.signal(signal.SIGTERM, _stop)

    if args.loop <= 0:
        # Una pasada y exit (modo cron externo)
        summary = _run_once(dry_run=args.dry_run)
        _print_summary(summary)
        return 0 if not summary.get("errors") else 1

    delay = max(args.loop, int(os.environ.get("FORECAST_LOOP_DELAY", str(args.loop))))
    logger.info("iniciando loop · cada %ds · dry_run=%s", delay, args.dry_run)
    while not stop["flag"]:
        ts = datetime.now(timezone.utc).isoformat()
        logger.info("─ pass %s ─", ts)
        try:
            summary = _run_once(dry_run=args.dry_run)
            _print_summary(summary)
        except Exception as exc:
            logger.exception("evaluación falló · %s", exc)
        for _ in range(delay):
            if stop["flag"]:
                break
            time.sleep(1)
    logger.info("worker terminado limpiamente")
    return 0


if __name__ == "__main__":
    sys.exit(main())
