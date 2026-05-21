"""AIS ingestion worker · daemon WebSocket persistente sobre AISStream.

Sprint 2 · Fase B · módulo Puertos. Activa el "AIS real" mencionado en
la Fase A (badges DataQuality pasan de SYNTH a LIVE cuando este worker
corre con vessel_positions populado).

═══════════════════════════════════════════════════════════════════════
Modo de operación
═══════════════════════════════════════════════════════════════════════

  - **Sin AISSTREAM_API_KEY** · loguea warning, devuelve exit 0 sin
    crashear pipelines. Las páginas /puertos seguirán mostrando datos
    sintéticos marcados como tales.

  - **Con AISSTREAM_API_KEY** · conecta a `wss://stream.aisstream.io/v0/stream`,
    suscribe a BoundingBoxes de cada puerto del catálogo (radio 0.5° lat/lon
    en torno a `lat,lon`), filtra `PositionReport`, llama a
    `persist_position(msg)` por cada mensaje · upsert en `vessel_positions`.

  - Reconnect con back-off exponencial (1s → 2s → 4s → 8s → max 60s).

CLI:
  python -m etl.workers.ais_ingest_worker [--duration SECONDS] [--ports slug1,slug2,...]

Ejemplos:
  # Ingesta 5 min de los puertos del catálogo completo
  python -m etl.workers.ais_ingest_worker --duration 300

  # Solo 3 puertos concretos
  python -m etl.workers.ais_ingest_worker --ports algeciras,valencia,rotterdam

  # Daemon perpetuo (Ctrl-C para parar)
  python -m etl.workers.ais_ingest_worker

═══════════════════════════════════════════════════════════════════════
Scheduling
═══════════════════════════════════════════════════════════════════════

Para producción registra este script como long-running task:
  - systemd  · ExecStart=python -m etl.workers.ais_ingest_worker
  - docker   · `command: python -m etl.workers.ais_ingest_worker`
  - k8s      · CronJob con restartPolicy=Always sobre Deployment

El worker es idempotente · si `AISSTREAM_API_KEY` no está, sale con código 0
para no romper el pipeline general (ver `etl/workers/README.md`).
"""
from __future__ import annotations

import argparse
import asyncio
import json
import logging
import os
import signal
import sys
import time
from typing import Iterable

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────
# Configuración
# ─────────────────────────────────────────────────────────────────

AISSTREAM_URL = "wss://stream.aisstream.io/v0/stream"
DEFAULT_BBOX_DEG = 0.5  # ~30nm en torno al puerto
MAX_BACKOFF_S = 60
INITIAL_BACKOFF_S = 1.0
LOG_EVERY_N = 100


def _build_bboxes(port_slugs: Iterable[str], bbox_deg: float = DEFAULT_BBOX_DEG) -> list:
    """Genera la lista de BoundingBoxes AISStream para los puertos dados.

    Formato AISStream: lista de cajas, cada caja `[[lat_min, lon_min], [lat_max, lon_max]]`.
    """
    from etl.sources.ports.catalog import get_port

    out = []
    for slug in port_slugs:
        p = get_port(slug)
        if not p:
            continue
        out.append(
            [
                [p["lat"] - bbox_deg, p["lon"] - bbox_deg],
                [p["lat"] + bbox_deg, p["lon"] + bbox_deg],
            ]
        )
    return out


# ─────────────────────────────────────────────────────────────────
# Conexión + persistencia
# ─────────────────────────────────────────────────────────────────

async def _stream_loop(
    port_slugs: list[str],
    duration_s: float | None,
    bbox_deg: float,
    stop_event: asyncio.Event,
) -> int:
    """Bucle principal · reconnect + persist en vessel_positions."""
    # Comprueba la API key ANTES de importar websockets · idempotente: si no
    # hay clave, el worker no necesita la dep y sale limpio con exit 0.
    api_key = os.environ.get("AISSTREAM_API_KEY")
    if not api_key:
        logger.warning(
            "AISSTREAM_API_KEY no configurada · worker exit 0. "
            "Las páginas /puertos seguirán en modo synthetic. "
            "Registro: https://aisstream.io para obtener clave gratuita."
        )
        return 0

    try:
        import websockets  # type: ignore
    except ImportError:
        logger.error(
            "websockets no instalado · pip install websockets>=12.0 (o ya en requirements.txt)"
        )
        return 1

    from etl.sources.ports.ais_client import persist_position

    bboxes = _build_bboxes(port_slugs, bbox_deg)
    if not bboxes:
        logger.error("No se pudo construir BoundingBoxes · catálogo vacío?")
        return 2

    subscribe_msg = {
        "APIKey": api_key,
        "BoundingBoxes": bboxes,
        "FilterMessageTypes": ["PositionReport"],
    }

    deadline = time.monotonic() + duration_s if duration_s else None
    backoff = INITIAL_BACKOFF_S
    total_persisted = 0

    while not stop_event.is_set():
        if deadline and time.monotonic() >= deadline:
            logger.info("Duración alcanzada · %d mensajes persistidos", total_persisted)
            return 0

        try:
            logger.info(
                "Conectando a AISStream · %d puertos · bbox %.2f°",
                len(bboxes),
                bbox_deg,
            )
            async with websockets.connect(AISSTREAM_URL, ping_interval=20) as ws:
                await ws.send(json.dumps(subscribe_msg))
                backoff = INITIAL_BACKOFF_S  # reset al reconectar OK

                async for raw in ws:
                    if stop_event.is_set():
                        break
                    if deadline and time.monotonic() >= deadline:
                        break
                    try:
                        msg = json.loads(raw)
                    except Exception as exc:
                        logger.debug("parse error: %s", exc)
                        continue
                    if msg.get("MessageType") != "PositionReport":
                        continue
                    if persist_position(msg):
                        total_persisted += 1
                        if total_persisted % LOG_EVERY_N == 0:
                            logger.info("persisted %d positions", total_persisted)
        except asyncio.CancelledError:
            break
        except Exception as exc:
            logger.warning("WebSocket caído (%s) · reintentando en %.1fs", exc, backoff)
            try:
                await asyncio.wait_for(stop_event.wait(), timeout=backoff)
                break  # stop_event seteado durante el sleep
            except asyncio.TimeoutError:
                pass
            backoff = min(backoff * 2, MAX_BACKOFF_S)

    logger.info("Worker AIS detenido · total persistido: %d", total_persisted)
    return 0


# ─────────────────────────────────────────────────────────────────
# CLI entry point
# ─────────────────────────────────────────────────────────────────

def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="ais_ingest_worker",
        description="Worker AIS · WebSocket AISStream → vessel_positions",
    )
    parser.add_argument(
        "--duration",
        type=float,
        default=None,
        help="Segundos de ingesta (default: indefinido)",
    )
    parser.add_argument(
        "--ports",
        type=str,
        default=None,
        help="CSV de port_slugs (default: catálogo completo)",
    )
    parser.add_argument(
        "--bbox-deg",
        type=float,
        default=DEFAULT_BBOX_DEG,
        help=f"Grados lat/lon del bbox por puerto (default: {DEFAULT_BBOX_DEG})",
    )
    parser.add_argument(
        "--log-level",
        type=str,
        default="INFO",
        help="DEBUG|INFO|WARNING|ERROR",
    )
    args = parser.parse_args(argv)

    logging.basicConfig(
        level=getattr(logging, args.log_level.upper(), logging.INFO),
        format="%(asctime)s %(levelname)s %(name)s · %(message)s",
    )

    if args.ports:
        port_slugs = [s.strip() for s in args.ports.split(",") if s.strip()]
    else:
        from etl.sources.ports.catalog import list_ports
        port_slugs = [p["slug"] for p in list_ports()]

    stop_event = asyncio.Event()

    def _on_signal(signum, _frame):  # noqa: ANN001
        logger.info("Señal %s recibida · cerrando worker…", signum)
        stop_event.set()

    signal.signal(signal.SIGINT, _on_signal)
    signal.signal(signal.SIGTERM, _on_signal)

    try:
        return asyncio.run(
            _stream_loop(port_slugs, args.duration, args.bbox_deg, stop_event)
        )
    except KeyboardInterrupt:
        return 0


if __name__ == "__main__":
    sys.exit(main())
