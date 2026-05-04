"""
Monitor BOE — scraper operativo que ingesta el BOE en legal_items.

Extiende BaseRealTimeScraper para:
  - DRY_RUN / rate limiting / cache HTTP / logging
  - Persistencia en tabla legal_items
  - Alertas para ítems CRÍTICO y ALTO

Uso:
    from etl.sources.legislative.boe_monitor import BOEMonitor
    from etl.factory import crear_engine

    engine = crear_engine()
    monitor = BOEMonitor("boe_daily", engine)
    result = monitor.run(fecha=None)   # None = hoy
"""
from __future__ import annotations

import json
import logging
import time
from datetime import date, datetime, timezone
from typing import Any

from sqlalchemy import text

logger = logging.getLogger(__name__)

# ── Import condicional de BaseRealTimeScraper ──────────────────────────────────

try:
    from etl.realtime.base import BaseRealTimeScraper as _Base
except ImportError:
    class _Base:  # type: ignore[misc]
        """Shim mínimo cuando etl.realtime no está disponible."""
        REQUEST_DELAY_SECONDS = 1.0
        USER_AGENT = "ElectSim/2.0"

        def __init__(self, nombre: str, engine) -> None:
            self.nombre = nombre
            self.engine = engine

        @staticmethod
        def is_dry_run() -> bool:
            import os
            return os.getenv("ELECTSIM_DRY_RUN", "true").lower() != "false"

        def log_resultado(self, url, estado, n_nuevos=0, n_dup=0, error=None, duracion=0.0, tipo="scrape"):
            logger.info("[%s] %s — %s nuevos, %s dup", self.nombre, estado, n_nuevos, n_dup)

        def crear_alerta(self, tipo, severidad, titulo, descripcion, datos=None):
            logger.info("ALERTA [%s] %s: %s", severidad, tipo, titulo)

        def run(self) -> dict:
            raise NotImplementedError


class BOEMonitor(_Base):
    """
    Scraper operativo del BOE.

    run(fecha) → ingesta el sumario de un día:
      1. Descarga sumario con BOEClient
      2. Extrae ítems
      3. Convierte a LegalItem con BOEAdapter
      4. Upsert en tabla legal_items
      5. Crea alertas para CRÍTICO/ALTO
      6. Logs en scraping_log
    """

    def __init__(self, nombre: str = "boe_monitor", engine=None) -> None:
        super().__init__(nombre, engine)
        from .boe_client import BOEClient
        from .boe_adapter import BOEAdapter
        self.client = BOEClient()
        self.adapter = BOEAdapter()

    # ── Interfaz pública ───────────────────────────────────────────────────────

    def run(self, fecha: date | str | None = None, **kwargs: Any) -> dict:
        """
        Ingesta el sumario BOE de una fecha.

        Args:
            fecha: date | 'YYYY-MM-DD' | None (=hoy)

        Returns:
            dict con estadísticas: n_total, n_new, n_dup, n_critical, n_high
        """
        t0 = time.perf_counter()

        if isinstance(fecha, str):
            from datetime import datetime as _dt
            fecha = _dt.fromisoformat(fecha).date()
        target_date = fecha or date.today()

        if self.is_dry_run():
            logger.info("[DRY_RUN] BOEMonitor — fecha=%s (sin peticiones reales)", target_date)
            return {"n_total": 0, "n_new": 0, "n_dup": 0, "n_critical": 0, "n_high": 0, "dry_run": True}

        # 1. Descarga sumario
        sumario = self.client.get_sumario(target_date)
        if sumario is None:
            err = f"BOE no devolvió sumario para {target_date}"
            logger.warning(err)
            self.log_resultado(
                f"https://www.boe.es/boe/dias/{target_date}",
                "error", error=err,
            )
            return {"n_total": 0, "n_new": 0, "n_dup": 0, "error": err}

        # 2. Extrae ítems crudos
        from .boe_client import BOEClient
        raw_items = BOEClient.extract_items_from_sumario(sumario)
        logger.info("BOEMonitor: %d ítems en sumario %s", len(raw_items), target_date)

        # 3. Convierte a LegalItem
        items = self.adapter.adapt_many(raw_items, fecha=target_date)

        # 4. Upsert
        stats = self._upsert_legal_items(items)

        # 5. Alertas
        n_crit = n_high = 0
        for item in items:
            if item.impact_level == "CRÍTICO":
                n_crit += 1
                self.crear_alerta(
                    tipo="legal_boe_critical",
                    severidad="CRITICAL",
                    titulo=f"BOE CRÍTICO: {item.title[:120]}",
                    descripcion=(
                        f"Disposición de impacto crítico publicada en BOE.\n"
                        f"Rango: {item.legal_rank or '?'}\n"
                        f"Departamento: {item.department or '?'}\n"
                        f"Sectores: {', '.join(item.sectors) or '—'}"
                    ),
                    datos={
                        "source": "boe",
                        "source_id": item.source_id,
                        "impact_level": "CRÍTICO",
                        "sectors": item.sectors,
                        "pagina_relevante": "legislativo",
                        "url": item.url_html,
                    },
                )
            elif item.impact_level == "ALTO":
                n_high += 1
                self.crear_alerta(
                    tipo="legal_boe_high",
                    severidad="HIGH",
                    titulo=f"BOE ALTO: {item.title[:120]}",
                    descripcion=(
                        f"Disposición de alto impacto publicada en BOE.\n"
                        f"Rango: {item.legal_rank or '?'}\n"
                        f"Departamento: {item.department or '?'}"
                    ),
                    datos={
                        "source": "boe",
                        "source_id": item.source_id,
                        "impact_level": "ALTO",
                        "pagina_relevante": "legislativo",
                    },
                )

        dur = time.perf_counter() - t0
        self.log_resultado(
            f"https://www.boe.es/boe/dias/{target_date}",
            "ok",
            n_nuevos=stats["n_new"],
            n_dup=stats["n_dup"],
            duracion=dur,
        )
        logger.info(
            "BOEMonitor OK — %d ítems, %d nuevos, %d dup, %d críticos, %d altos — %.1fs",
            len(items), stats["n_new"], stats["n_dup"], n_crit, n_high, dur,
        )
        return {
            "n_total": len(items),
            "n_new": stats["n_new"],
            "n_dup": stats["n_dup"],
            "n_critical": n_crit,
            "n_high": n_high,
            "duracion": dur,
        }

    def run_range(self, days: int = 7) -> dict:
        """Ingesta los últimos N días."""
        from datetime import timedelta
        totals: dict[str, int] = {"n_total": 0, "n_new": 0, "n_dup": 0, "n_critical": 0, "n_high": 0}
        for i in range(days):
            day = date.today() - timedelta(days=i)
            result = self.run(fecha=day)
            for k in totals:
                totals[k] += result.get(k, 0)
        return totals

    # ── Persistencia ───────────────────────────────────────────────────────────

    def _upsert_legal_items(self, items: list) -> dict:
        """
        Hace upsert de LegalItem en tabla legal_items.
        Retorna {"n_new": int, "n_dup": int}.
        """
        if not self.engine or not items:
            return {"n_new": 0, "n_dup": 0}

        n_new = n_dup = 0
        stmt = text("""
            INSERT INTO legal_items (
                source, source_id, title, legal_rank, department, section,
                publication_date, effective_date, status, impact_level,
                sectors, actors, subjects, summary, url_html, url_pdf,
                raw_payload, text_hash, fetched_at
            ) VALUES (
                :source, :source_id, :title, :legal_rank, :department, :section,
                :publication_date, :effective_date, :status, :impact_level,
                :sectors, :actors, :subjects, :summary, :url_html, :url_pdf,
                CAST(:raw_payload AS JSONB), :text_hash, :fetched_at
            )
            ON CONFLICT (source, source_id) DO UPDATE SET
                title         = EXCLUDED.title,
                impact_level  = EXCLUDED.impact_level,
                sectors       = EXCLUDED.sectors,
                summary       = EXCLUDED.summary,
                text_hash     = EXCLUDED.text_hash,
                fetched_at    = EXCLUDED.fetched_at,
                updated_at    = NOW()
            RETURNING (xmax = 0) AS is_new
        """)

        for item in items:
            d = item.to_db_dict()
            d["raw_payload"] = json.dumps(d["raw_payload"], default=str)
            try:
                with self.engine.begin() as conn:
                    row = conn.execute(stmt, d).fetchone()
                    if row and row[0]:
                        n_new += 1
                    else:
                        n_dup += 1
            except Exception as exc:
                logger.warning("_upsert_legal_items skip %s: %s", d.get("source_id"), exc)

        return {"n_new": n_new, "n_dup": n_dup}

    @staticmethod
    def ensure_table(engine) -> None:
        """
        Crea la tabla legal_items si no existe.
        Para entornos sin Alembic o tests.
        """
        ddl = text("""
            CREATE TABLE IF NOT EXISTS legal_items (
                id               BIGSERIAL PRIMARY KEY,
                source           VARCHAR(50) NOT NULL,
                source_id        VARCHAR(120) NOT NULL,
                title            TEXT NOT NULL,
                legal_rank       VARCHAR(120),
                department       VARCHAR(200),
                section          VARCHAR(50),
                publication_date DATE,
                effective_date   DATE,
                status           VARCHAR(50),
                impact_level     VARCHAR(30),
                sectors          TEXT[],
                actors           TEXT[],
                subjects         TEXT[],
                summary          TEXT,
                url_html         TEXT,
                url_pdf          TEXT,
                raw_payload      JSONB,
                text_hash        VARCHAR(128),
                fetched_at       TIMESTAMP DEFAULT NOW(),
                created_at       TIMESTAMP DEFAULT NOW(),
                updated_at       TIMESTAMP DEFAULT NOW(),
                UNIQUE(source, source_id)
            );
            CREATE INDEX IF NOT EXISTS idx_legal_items_date
                ON legal_items(publication_date DESC);
            CREATE INDEX IF NOT EXISTS idx_legal_items_impact
                ON legal_items(impact_level);
            CREATE INDEX IF NOT EXISTS idx_legal_items_source
                ON legal_items(source, source_id);
        """)
        try:
            with engine.begin() as conn:
                conn.execute(ddl)
            logger.info("BOEMonitor.ensure_table: legal_items OK")
        except Exception as exc:
            logger.error("ensure_table failed: %s", exc)
