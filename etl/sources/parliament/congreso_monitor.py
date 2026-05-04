"""
Monitor Congreso — ingesta iniciativas parlamentarias en parliamentary_initiatives.

Extiende BaseRealTimeScraper:
  - DRY_RUN / rate limiting / logging en scraping_log
  - Upsert en tabla parliamentary_initiatives
  - Alertas para nuevas iniciativas importantes

Uso:
    from etl.sources.parliament.congreso_monitor import CongresoMonitor
    monitor = CongresoMonitor("congreso_monitor", engine)
    result = monitor.run(legislatura=15, max_paginas=5)
"""
from __future__ import annotations

import json
import logging
import time
from typing import Any

logger = logging.getLogger(__name__)

# ── BaseRealTimeScraper (con shim) ────────────────────────────────────────────

try:
    from etl.realtime.base import BaseRealTimeScraper as _Base
except ImportError:
    class _Base:  # type: ignore[misc]
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


from sqlalchemy import text


class CongresoMonitor(_Base):
    """
    Scraper operativo del Congreso de los Diputados.

    run(legislatura, max_paginas, tipo) → ingesta iniciativas:
      1. Paginación con CongresoClient
      2. Conversión con CongresoAdapter
      3. Upsert en parliamentary_initiatives
      4. Alertas para PL/PPL/RDL nuevos
      5. Logs en scraping_log
    """

    def __init__(self, nombre: str = "congreso_monitor", engine=None) -> None:
        super().__init__(nombre, engine)
        from .congreso_client import CongresoClient
        from .congreso_adapter import CongresoAdapter
        self.client = CongresoClient()
        self.adapter = CongresoAdapter()

    # ── Interfaz pública ───────────────────────────────────────────────────────

    def run(
        self,
        legislatura: int | str = 15,
        max_paginas: int = 5,
        tipo: str | None = None,
        **kwargs: Any,
    ) -> dict:
        """
        Args:
            legislatura: número de legislatura (15 = actual).
            max_paginas: máx páginas a descargar (25 items/pág).
            tipo: filtrar por tipo de iniciativa o None (todas).

        Returns:
            dict con n_total, n_new, n_dup, n_alertas.
        """
        t0 = time.perf_counter()

        if self.is_dry_run():
            logger.info("[DRY_RUN] CongresoMonitor — legislatura=%s (sin peticiones reales)", legislatura)
            return {"n_total": 0, "n_new": 0, "n_dup": 0, "n_alertas": 0, "dry_run": True}

        all_items = []
        for pagina in range(1, max_paginas + 1):
            resp = self.client.get_iniciativas(
                legislatura=legislatura,
                tipo=tipo,
                pagina=pagina,
                items_por_pagina=25,
            )
            if resp is None:
                logger.warning("CongresoMonitor: API no respondió en pág %d", pagina)
                break

            raw_items = self._extract_items(resp)
            if not raw_items:
                break  # Sin más páginas

            all_items.extend(raw_items)
            logger.debug("CongresoMonitor: pág %d — %d ítems acumulados", pagina, len(all_items))

            # Respetar paginación
            total = resp.get("total", 0) if isinstance(resp, dict) else 0
            if total and len(all_items) >= total:
                break

            time.sleep(self.REQUEST_DELAY_SECONDS if hasattr(self, "REQUEST_DELAY_SECONDS") else 1.0)

        logger.info("CongresoMonitor: %d iniciativas descargadas", len(all_items))

        # Convertir y persistir
        initiatives = self.adapter.adapt_many(all_items)
        stats = self._upsert_initiatives(initiatives)

        # Alertas para iniciativas importantes nuevas
        n_alertas = 0
        if stats["n_new"] > 0:
            for ini in initiatives:
                if ini.impact_level in ("CRÍTICO", "ALTO"):
                    self.crear_alerta(
                        tipo="parliamentary_initiative_new",
                        severidad="HIGH" if ini.impact_level == "CRÍTICO" else "MEDIUM",
                        titulo=f"Nueva iniciativa: {ini.title[:100]}",
                        descripcion=(
                            f"Tipo: {ini.initiative_type_label or ini.initiative_type}\n"
                            f"Legislatura: {ini.legislature}\n"
                            f"Autores: {', '.join(a.name for a in ini.authors[:3])}\n"
                            f"Estado: {ini.status or 'presentada'}"
                        ),
                        datos={
                            "source": "congreso",
                            "source_id": ini.source_id,
                            "initiative_type": ini.initiative_type,
                            "impact_level": ini.impact_level,
                            "sectors": ini.sectors,
                            "pagina_relevante": "legislativo",
                        },
                    )
                    n_alertas += 1

        dur = time.perf_counter() - t0
        self.log_resultado(
            f"https://www.congreso.es/opendata/iniciativas?legislatura={legislatura}",
            "ok",
            n_nuevos=stats["n_new"],
            n_dup=stats["n_dup"],
            duracion=dur,
        )
        logger.info(
            "CongresoMonitor OK — %d iniciativas, %d nuevas, %d dup, %d alertas — %.1fs",
            len(initiatives), stats["n_new"], stats["n_dup"], n_alertas, dur,
        )
        return {
            "n_total": len(initiatives),
            "n_new": stats["n_new"],
            "n_dup": stats["n_dup"],
            "n_alertas": n_alertas,
            "duracion": dur,
        }

    def run_basic(self, **kwargs: Any) -> dict:
        """Ingesta básica: solo metadatos de iniciativas."""
        return self.run(max_paginas=3, **kwargs)

    # ── Persistencia ───────────────────────────────────────────────────────────

    def _upsert_initiatives(self, initiatives: list) -> dict:
        if not self.engine or not initiatives:
            return {"n_new": 0, "n_dup": 0}

        n_new = n_dup = 0
        stmt = text("""
            INSERT INTO parliamentary_initiatives (
                source, source_id, legislature, initiative_type,
                title, presented_date, qualified_date, status, result,
                tramitation_type, authors, competent_commissions,
                rapporteurs, bulletins, diaries, boe_refs,
                related_legal_items, impact_level, sectors, raw_url,
                raw_payload, fetched_at
            ) VALUES (
                :source, :source_id, :legislature, :initiative_type,
                :title, :presented_date, :qualified_date, :status, :result,
                :tramitation_type, CAST(:authors AS JSONB),
                CAST(:competent_commissions AS JSONB),
                :rapporteurs, CAST(:bulletins AS JSONB),
                CAST(:diaries AS JSONB), :boe_refs,
                :related_legal_items, :impact_level, :sectors, :raw_url,
                CAST(:raw_payload AS JSONB), :fetched_at
            )
            ON CONFLICT (source, source_id) DO UPDATE SET
                status         = EXCLUDED.status,
                result         = EXCLUDED.result,
                impact_level   = EXCLUDED.impact_level,
                boe_refs       = EXCLUDED.boe_refs,
                fetched_at     = EXCLUDED.fetched_at,
                updated_at     = NOW()
            RETURNING (xmax = 0) AS is_new
        """)

        for ini in initiatives:
            d = ini.to_db_dict()
            try:
                with self.engine.begin() as conn:
                    row = conn.execute(stmt, d).fetchone()
                    if row and row[0]:
                        n_new += 1
                    else:
                        n_dup += 1
            except Exception as exc:
                logger.warning("_upsert_initiatives skip %s: %s", d.get("source_id"), exc)

        return {"n_new": n_new, "n_dup": n_dup}

    @staticmethod
    def _extract_items(resp: Any) -> list[dict]:
        """Extrae la lista de ítems de la respuesta de la API."""
        if isinstance(resp, list):
            return resp
        if isinstance(resp, dict):
            for key in ("items", "data", "results", "iniciativas"):
                if key in resp and isinstance(resp[key], list):
                    return resp[key]
        return []

    @staticmethod
    def ensure_table(engine) -> None:
        """Crea las tablas necesarias si no existen (para tests / bootstrap)."""
        from sqlalchemy import text as _text
        ddl = _text("""
            CREATE TABLE IF NOT EXISTS parliamentary_initiatives (
                id                   BIGSERIAL PRIMARY KEY,
                source               VARCHAR(50) NOT NULL,
                source_id            VARCHAR(120) NOT NULL,
                legislature          VARCHAR(50),
                initiative_type      VARCHAR(100),
                title                TEXT NOT NULL,
                presented_date       DATE,
                qualified_date       DATE,
                status               VARCHAR(150),
                result               VARCHAR(150),
                tramitation_type     VARCHAR(150),
                authors              JSONB,
                competent_commissions JSONB,
                rapporteurs          TEXT[],
                bulletins            JSONB,
                diaries              JSONB,
                boe_refs             TEXT[],
                related_legal_items  TEXT[],
                impact_level         VARCHAR(30),
                sectors              TEXT[],
                raw_url              TEXT,
                raw_payload          JSONB,
                fetched_at           TIMESTAMP DEFAULT NOW(),
                created_at           TIMESTAMP DEFAULT NOW(),
                updated_at           TIMESTAMP DEFAULT NOW(),
                UNIQUE(source, source_id)
            );
            CREATE INDEX IF NOT EXISTS idx_parl_init_date
                ON parliamentary_initiatives(presented_date DESC);
            CREATE INDEX IF NOT EXISTS idx_parl_init_impact
                ON parliamentary_initiatives(impact_level);
            CREATE INDEX IF NOT EXISTS idx_parl_init_type
                ON parliamentary_initiatives(initiative_type);

            CREATE TABLE IF NOT EXISTS parliamentary_bodies (
                id            BIGSERIAL PRIMARY KEY,
                source        VARCHAR(50) NOT NULL,
                source_id     VARCHAR(120) NOT NULL,
                legislature   VARCHAR(50),
                name          TEXT NOT NULL,
                body_type     VARCHAR(80),
                parent_body_id VARCHAR(120),
                members       JSONB,
                raw_payload   JSONB,
                fetched_at    TIMESTAMP DEFAULT NOW(),
                created_at    TIMESTAMP DEFAULT NOW(),
                UNIQUE(source, source_id, legislature)
            );
        """)
        try:
            with engine.begin() as conn:
                conn.execute(ddl)
            logger.info("CongresoMonitor.ensure_table: OK")
        except Exception as exc:
            logger.error("ensure_table failed: %s", exc)
