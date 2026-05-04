"""
Pipeline Core Legislativo — ingesta BOE + Congreso.

Uso:
    python -m pipelines.legislative_core --source boe
    python -m pipelines.legislative_core --source boe --days 7
    python -m pipelines.legislative_core --source congreso
    python -m pipelines.legislative_core --source congreso --legislatura 15 --paginas 10
    python -m pipelines.legislative_core --source all
    python -m pipelines.legislative_core --source all --dry-run

Flujo:
    BOE          → legal_items       → clasificación → alertas → D4
    Congreso     → parl_initiatives  → clasificación → alertas → D4
    link         → relaciona legal_items con parl_initiatives vía boe_refs
"""
from __future__ import annotations

import argparse
import logging
import sys
import time
from datetime import date, timedelta

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger("legislative_core_pipeline")


# ── Engine factory ────────────────────────────────────────────────────────────

def _get_engine():
    try:
        from etl.factory import crear_engine
        return crear_engine()
    except Exception as exc:
        logger.error("No se pudo crear engine: %s", exc)
        return None


# ── Tareas individuales ───────────────────────────────────────────────────────

def ingest_boe_today(engine) -> dict:
    """Ingesta el sumario BOE del día actual."""
    from etl.sources.legislative.boe_monitor import BOEMonitor
    BOEMonitor.ensure_table(engine)
    monitor = BOEMonitor("boe_daily", engine)
    return monitor.run(fecha=None)


def ingest_boe_recent(engine, days: int = 7) -> dict:
    """Ingesta los últimos N días del BOE."""
    from etl.sources.legislative.boe_monitor import BOEMonitor
    BOEMonitor.ensure_table(engine)
    monitor = BOEMonitor("boe_range", engine)
    return monitor.run_range(days=days)


def ingest_congreso_basic(
    engine,
    legislatura: int = 15,
    max_paginas: int = 5,
) -> dict:
    """Ingesta iniciativas parlamentarias del Congreso."""
    from etl.sources.parliament.congreso_monitor import CongresoMonitor
    CongresoMonitor.ensure_table(engine)
    monitor = CongresoMonitor("congreso_monitor", engine)
    return monitor.run(legislatura=legislatura, max_paginas=max_paginas)


def classify_impact(engine, days_back: int = 7) -> int:
    """
    Re-clasifica ítems recientes sin sector detectado.
    Útil si el clasificador ha mejorado después de la ingesta.
    """
    from sqlalchemy import text
    from etl.sources.legislative.boe_adapter import clasificar_impacto, detectar_sectores

    since = date.today() - timedelta(days=days_back)
    n_updated = 0

    try:
        with engine.begin() as conn:
            rows = conn.execute(text("""
                SELECT id, title, section, department, impact_level
                FROM legal_items
                WHERE (sectors IS NULL OR array_length(sectors,1) IS NULL)
                  AND publication_date >= :since
                LIMIT 200
            """), {"since": since}).fetchall()

            for row in rows:
                new_sectors = detectar_sectores(row[1])
                new_impact = clasificar_impacto(row[1], row[2] or "", row[3] or "")
                if new_sectors or new_impact != row[4]:
                    conn.execute(text("""
                        UPDATE legal_items
                        SET sectors = :sectors, impact_level = :impact, updated_at = NOW()
                        WHERE id = :id
                    """), {"sectors": new_sectors, "impact": new_impact, "id": row[0]})
                    n_updated += 1
    except Exception as exc:
        logger.error("classify_impact: %s", exc)

    logger.info("classify_impact: %d ítems actualizados", n_updated)
    return n_updated


def link_boe_congreso(engine, limit: int = 200) -> int:
    """
    Vincula iniciativas parlamentarias con ítems BOE via boe_refs.
    Actualiza related_legal_items en parliamentary_initiatives.
    """
    from sqlalchemy import text
    n_linked = 0

    try:
        with engine.begin() as conn:
            rows = conn.execute(text("""
                SELECT pi.source_id, pi.boe_refs
                FROM parliamentary_initiatives pi
                WHERE array_length(pi.boe_refs, 1) > 0
                  AND (pi.related_legal_items IS NULL OR array_length(pi.related_legal_items,1) = 0)
                LIMIT :limit
            """), {"limit": limit}).fetchall()

            for source_id, boe_refs in rows:
                if not boe_refs:
                    continue
                # Buscar los source_id de legal_items que coincidan
                matched = conn.execute(text("""
                    SELECT source_id FROM legal_items
                    WHERE source_id = ANY(:refs)
                """), {"refs": boe_refs}).fetchall()
                if matched:
                    matched_ids = [r[0] for r in matched]
                    conn.execute(text("""
                        UPDATE parliamentary_initiatives
                        SET related_legal_items = :ids, updated_at = NOW()
                        WHERE source_id = :sid
                    """), {"ids": matched_ids, "sid": source_id})
                    n_linked += 1
    except Exception as exc:
        logger.error("link_boe_congreso: %s", exc)

    logger.info("link_boe_congreso: %d iniciativas vinculadas con BOE", n_linked)
    return n_linked


def create_legislative_alerts(engine, days_back: int = 1) -> int:
    """
    Crea alertas para ítems críticos y altos aún sin alerta.
    Complementa al monitor (que crea alertas en tiempo real).
    """
    from sqlalchemy import text
    from datetime import datetime, timezone
    n_alerts = 0
    since = date.today() - timedelta(days=days_back)

    try:
        with engine.begin() as conn:
            rows = conn.execute(text("""
                SELECT li.source_id, li.title, li.impact_level, li.sectors, li.url_html
                FROM legal_items li
                WHERE li.impact_level IN ('CRÍTICO', 'ALTO')
                  AND li.publication_date >= :since
                  AND NOT EXISTS (
                    SELECT 1 FROM alertas_sistema a
                    WHERE a.datos_json->>'source_id' = li.source_id
                  )
                LIMIT 50
            """), {"since": since}).fetchall()

            for source_id, title, impact, sectors, url in rows:
                sev = "CRITICAL" if impact == "CRÍTICO" else "HIGH"
                conn.execute(text("""
                    INSERT INTO alertas_sistema (tipo, severidad, titulo, descripcion, datos_json)
                    VALUES (:tipo, :sev, :tit, :desc, :dj::jsonb)
                    ON CONFLICT DO NOTHING
                """), {
                    "tipo": f"legal_boe_{impact.lower().replace('í','i')}",
                    "sev": sev,
                    "tit": f"BOE {impact}: {title[:100]}",
                    "desc": f"Disposición BOE de impacto {impact}. Sectores: {', '.join(sectors or [])}",
                    "dj": f'{{"source":"boe","source_id":"{source_id}","impact_level":"{impact}","pagina_relevante":"legislativo"}}',
                })
                n_alerts += 1
    except Exception as exc:
        logger.error("create_legislative_alerts: %s", exc)

    logger.info("create_legislative_alerts: %d alertas creadas", n_alerts)
    return n_alerts


# ── Flujo completo ────────────────────────────────────────────────────────────

def run_boe_pipeline(engine, days: int = 1) -> None:
    logger.info("=== Pipeline BOE (days=%d) ===", days)
    t0 = time.perf_counter()

    if days <= 1:
        r = ingest_boe_today(engine)
    else:
        r = ingest_boe_recent(engine, days=days)

    logger.info("BOE: %s", r)
    classify_impact(engine, days_back=days)
    create_legislative_alerts(engine, days_back=days)
    logger.info("=== Pipeline BOE OK — %.1fs ===", time.perf_counter() - t0)


def run_congreso_pipeline(engine, legislatura: int = 15, paginas: int = 5) -> None:
    logger.info("=== Pipeline Congreso (legislatura=%d, paginas=%d) ===", legislatura, paginas)
    t0 = time.perf_counter()

    r = ingest_congreso_basic(engine, legislatura=legislatura, max_paginas=paginas)
    logger.info("Congreso: %s", r)
    link_boe_congreso(engine)
    logger.info("=== Pipeline Congreso OK — %.1fs ===", time.perf_counter() - t0)


def run_all(engine, days: int = 1, legislatura: int = 15, paginas: int = 5) -> None:
    run_boe_pipeline(engine, days=days)
    run_congreso_pipeline(engine, legislatura=legislatura, paginas=paginas)


# ── CLI ───────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Pipeline Core Legislativo — ingesta BOE + Congreso"
    )
    parser.add_argument(
        "--source", choices=["boe", "congreso", "all"], default="all",
        help="Fuente a ingestar"
    )
    parser.add_argument("--days", type=int, default=1, help="Días BOE a ingestar")
    parser.add_argument("--legislatura", type=int, default=15, help="Legislatura Congreso")
    parser.add_argument("--paginas", type=int, default=5, help="Páginas Congreso")
    parser.add_argument("--dry-run", action="store_true", help="Simular sin peticiones reales")
    args = parser.parse_args()

    if args.dry_run:
        import os
        os.environ["ELECTSIM_DRY_RUN"] = "true"
        logger.info("[DRY_RUN] Modo simulación activado — sin peticiones HTTP reales")

    engine = _get_engine()
    if engine is None:
        logger.error("No se pudo conectar a la base de datos. Verifica DATABASE_URL.")
        sys.exit(1)

    if args.source == "boe":
        run_boe_pipeline(engine, days=args.days)
    elif args.source == "congreso":
        run_congreso_pipeline(engine, legislatura=args.legislatura, paginas=args.paginas)
    else:
        run_all(engine, days=args.days, legislatura=args.legislatura, paginas=args.paginas)


if __name__ == "__main__":
    main()
