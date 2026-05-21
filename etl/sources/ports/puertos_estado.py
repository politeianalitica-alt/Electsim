"""Scraper · Puertos del Estado (España) · series mensuales TEU/toneladas.

Sprint 2 Fase C · módulo Puertos. Activa el modo "tráfico real" del
backend cuando se programa este job (cron mensual).

Organismo: Puertos del Estado · https://www.puertos.es
Cobertura: 28 puertos de interés general (todos los puertos comerciales ES)
Datos publicados: Estadística Mensual Tráfico Portuario (CSV/Excel)

═══════════════════════════════════════════════════════════════════════
Modo de operación
═══════════════════════════════════════════════════════════════════════

  1. **Scrape real** · descarga estadística mensual desde puertos.es,
     parsea XLSX/CSV y normaliza a la tabla `port_monthly_traffic`.
  2. **Cache 30 días** · evita hits repetidos al sitio oficial.
  3. **Idempotente** · UPSERT por (port_slug, period_ym, source='puertos_estado').
  4. **Falla cerrado** · sin red o sin BD → logea, exit 0, no rompe.

Estado actual: SCAFFOLD funcional. El fetch real depende de URL
estable que puertos.es no publica en formato máquina-amistoso · el primer
paso es bajar el XLSX manual y poblarlo desde `--from-xlsx PATH`.

Sprint 3 añadirá:
  - Scrape automático del PDF/XLSX mensual
  - Parser tabular robusto (pandas + openpyxl)
  - Backfill histórico 5 años

Uso CLI:

  # Importar desde XLSX local (descarga manual primera vez)
  python -m etl.sources.ports.puertos_estado --from-xlsx ./data/puertos_estado_2025_09.xlsx

  # Demo · pobla con valores sintéticos marcados como tales
  python -m etl.sources.ports.puertos_estado --demo

  # Listar lo que hay en BD
  python -m etl.sources.ports.puertos_estado --list
"""
from __future__ import annotations

import argparse
import logging
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


# Puertos del Estado · slugs en nuestro catalog.py que MAPEAN a puertos del
# organismo. Para Sprint 2 enfoque en 6 españoles ya curados.
SPANISH_PORTS = [
    "algeciras", "valencia", "barcelona", "bilbao",
    "las_palmas", "cartagena_es",
]

# Estimaciones públicas anuales 2024 (memorias oficiales) en TEU · permiten
# demo realista mientras no se baje el XLSX. Marcado como `estimate` en BD.
ANNUAL_ESTIMATES = {
    "algeciras":   {"teu": 5200000, "tonnes": 110_000_000},
    "valencia":    {"teu": 5400000, "tonnes":  85_000_000},
    "barcelona":   {"teu": 3550000, "tonnes":  76_000_000},
    "bilbao":      {"teu":  640000, "tonnes":  37_000_000},
    "las_palmas":  {"teu":  830000, "tonnes":  25_000_000},
    "cartagena_es":{"teu":   40000, "tonnes":  33_500_000},
}


def list_traffic(
    port_slug: str | None = None,
    from_period: str | None = None,
    to_period: str | None = None,
) -> list[dict[str, Any]]:
    """Lista filas de `port_monthly_traffic` con filtros opcionales.

    Devuelve [] si no hay BD o tabla vacía.
    """
    try:
        from .ais_client import _get_engine
        from sqlalchemy import text
    except Exception:
        return []

    engine = _get_engine()
    if engine is None:
        return []

    try:
        with engine.connect() as cx:
            sql = (
                "SELECT port_slug, period_ym, teu_total, tonnes_total, "
                "tonnes_liquid_bulk, tonnes_solid_bulk, vehicles_units, "
                "cruise_passengers, source, data_quality, fetched_at "
                "FROM port_monthly_traffic WHERE 1=1"
            )
            params: dict[str, Any] = {}
            if port_slug:
                sql += " AND port_slug = :slug"
                params["slug"] = port_slug
            if from_period:
                sql += " AND period_ym >= :fp"
                params["fp"] = from_period
            if to_period:
                sql += " AND period_ym <= :tp"
                params["tp"] = to_period
            sql += " ORDER BY period_ym ASC, port_slug ASC"
            rows = cx.execute(text(sql), params).mappings().all()
            return [dict(r) for r in rows]
    except Exception as exc:
        logger.debug("list_traffic fallback: %s", exc)
        return []


def populate_demo(months_back: int = 12) -> int:
    """Pobla `port_monthly_traffic` con valores estimados desde anuales públicos.

    Distribuye el anual entre 12 meses con variación estacional realista
    (~10% verano alto, ~10% invierno bajo). Marcado con `source='estimate'`
    para distinguirlo de un scrape real. Permite demo del UI mientras no se
    baje el XLSX oficial.
    """
    try:
        from .ais_client import _get_engine
        from sqlalchemy import text
    except Exception:
        return 0

    engine = _get_engine()
    if engine is None:
        logger.warning("populate_demo · no engine · saltando")
        return 0

    import math
    now = datetime.now(timezone.utc)
    n = 0
    try:
        with engine.begin() as cx:
            for slug, est in ANNUAL_ESTIMATES.items():
                for i in range(months_back):
                    month = (now.month - i - 1) % 12 + 1
                    year = now.year - 1 if (now.month - i - 1) < 0 else now.year
                    period_ym = f"{year}-{month:02d}"
                    # variación estacional simple · sinusoidal +/- 12%
                    seasonal = 1.0 + 0.12 * math.sin((month / 12) * 2 * math.pi)
                    teu_mensual = int((est["teu"] / 12) * seasonal)
                    tonnes_mensual = int((est["tonnes"] / 12) * seasonal)

                    exists = cx.execute(
                        text(
                            "SELECT id FROM port_monthly_traffic "
                            "WHERE port_slug = :p AND period_ym = :pm AND source = :src"
                        ),
                        {"p": slug, "pm": period_ym, "src": "estimate"},
                    ).first()
                    if exists:
                        continue

                    cx.execute(
                        text(
                            "INSERT INTO port_monthly_traffic "
                            "(port_slug, period_ym, teu_total, tonnes_total, "
                            " source, data_quality, fetched_at) "
                            "VALUES (:p, :pm, :teu, :tn, :src, :dq, :ts)"
                        ),
                        {
                            "p": slug,
                            "pm": period_ym,
                            "teu": teu_mensual,
                            "tn": tonnes_mensual,
                            "src": "estimate",
                            "dq": "synthetic",
                            "ts": now,
                        },
                    )
                    n += 1
    except Exception as exc:
        logger.exception("populate_demo fallo: %s", exc)
        return 0

    logger.info("populate_demo · %d filas insertadas", n)
    return n


def parse_xlsx(path: Path) -> int:
    """Parsea un XLSX de Puertos del Estado (Estadística Mensual).

    Scaffold mínimo · Sprint 3 expandirá el parser para todos los puertos
    y todas las columnas (TEU, mercancía general, granel sólido/líquido…).
    """
    if not path.exists():
        logger.error("XLSX no encontrado: %s", path)
        return 0
    try:
        import openpyxl  # type: ignore
    except ImportError:
        logger.error("openpyxl no instalado · pip install openpyxl")
        return 0
    logger.warning(
        "parse_xlsx · scaffold pendiente Sprint 3. "
        "Devuelve 0 hasta que el formato XLSX se mappee."
    )
    # TODO Sprint 3: implementar parser openpyxl/pandas
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="puertos_estado")
    parser.add_argument("--from-xlsx", type=str, default=None,
                        help="Path a XLSX descargado de puertos.es")
    parser.add_argument("--demo", action="store_true",
                        help="Poblar con estimaciones desde anuales públicos")
    parser.add_argument("--months", type=int, default=12)
    parser.add_argument("--list", action="store_true",
                        help="Listar filas en BD para los puertos españoles")
    parser.add_argument("--log-level", default="INFO")
    args = parser.parse_args(argv)

    logging.basicConfig(
        level=getattr(logging, args.log_level.upper(), logging.INFO),
        format="%(asctime)s %(levelname)s %(name)s · %(message)s",
    )

    if args.list:
        for slug in SPANISH_PORTS:
            rows = list_traffic(port_slug=slug)
            print(f"{slug}: {len(rows)} filas")
        return 0

    if args.from_xlsx:
        return 0 if parse_xlsx(Path(args.from_xlsx)) > 0 else 1

    if args.demo:
        n = populate_demo(months_back=args.months)
        print(f"populated {n} estimated rows")
        return 0

    parser.print_help()
    return 1


if __name__ == "__main__":
    sys.exit(main())


__all__ = ["list_traffic", "populate_demo", "parse_xlsx", "SPANISH_PORTS"]
