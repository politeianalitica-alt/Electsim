"""
Economy Monitor — Bloque 5.

Orquestador ETL del módulo de Inteligencia Económica.
Equivalente al OSINTMonitor del Bloque 4, pero para economía.

Usa el patrón BaseRealTimeScraper cuando está disponible,
con shim de compatibilidad cuando no lo está.
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

# ── Shim de compatibilidad ────────────────────────────────────────────────────
try:
    from etl.realtime.base import BaseRealTimeScraper as _RealBase  # type: ignore
    _UseBase = _RealBase
except ImportError:
    class _ShimBase:  # type: ignore
        def __init__(self, nombre: str = "economy_monitor", engine: Any = None, **kw: Any) -> None:
            self.nombre = nombre
            self._engine = engine

        def run(self) -> dict[str, int]:
            raise NotImplementedError

    _UseBase = _ShimBase


class EconomyMonitor(_UseBase):
    """
    Monitor ETL para el módulo de Inteligencia Económica.

    Orquesta:
      1. Fetch de indicadores desde providers registrados
      2. Validación y deduplicación
      3. Persistencia en BD (macro_indicators, economic_series)
      4. Detección de señales económico-políticas
      5. Cálculo de ITPE económico
      6. Generación de alertas
    """

    def __init__(
        self,
        engine: Any = None,
        dry_run: bool = False,
        providers: list[str] | None = None,
    ) -> None:
        try:
            super().__init__(nombre="economy_monitor", engine=engine)
        except TypeError:
            try:
                super().__init__(nombre="economy_monitor")
            except Exception:
                pass
        self._engine = engine
        self.dry_run = dry_run
        self.providers = providers  # None = todos

    def run(self) -> dict[str, int]:
        """
        Ejecuta el pipeline económico completo.
        """
        stats = {
            "indicators_fetched": 0,
            "indicators_upserted": 0,
            "series_upserted": 0,
            "signals_detected": 0,
            "alerts_created": 0,
            "errors": 0,
        }

        logger.info("EconomyMonitor.run() iniciado (dry_run=%s)", self.dry_run)

        # 1. Fetch indicadores
        indicators = self._fetch_indicators()
        stats["indicators_fetched"] = len(indicators)

        if not indicators:
            logger.info("EconomyMonitor: no se obtuvieron indicadores.")
            return stats

        # 2. Persistir
        if not self.dry_run:
            stats.update(self._persist(indicators))

        # 3. Detectar señales
        signals = self._detect_signals(indicators)
        stats["signals_detected"] = len(signals)

        if not self.dry_run and signals:
            stats.update(self._persist_signals(signals))

        logger.info(
            "EconomyMonitor.run() completado: %d indicadores, %d señales, %d alertas",
            stats["indicators_fetched"], stats["signals_detected"], stats["alerts_created"],
        )
        return stats

    def _fetch_indicators(self) -> list[Any]:
        try:
            from etl.sources.economy.provider_registry import get_registry
            registry = get_registry()
            if self.providers:
                indicators = []
                for p_name in self.providers:
                    indicators.extend(registry.fetch_provider_indicators(p_name))
            else:
                indicators = registry.fetch_all_core_indicators()
            return indicators
        except Exception as exc:
            logger.error("EconomyMonitor._fetch_indicators: %s", exc)
            return []

    def _persist(self, indicators: list[Any]) -> dict[str, int]:
        stats = {"indicators_upserted": 0, "series_upserted": 0}
        try:
            from etl.sources.economy.economic_adapter import (
                upsert_indicators, upsert_series, indicators_to_series,
            )
            engine = self._engine or self._get_engine()

            ind_stats = upsert_indicators(indicators, engine)
            stats["indicators_upserted"] = ind_stats.get("n_inserted", 0)

            series = indicators_to_series(indicators)
            ser_stats = upsert_series(series, engine)
            stats["series_upserted"] = ser_stats.get("n_upserted", 0)
        except Exception as exc:
            logger.error("EconomyMonitor._persist: %s", exc)
        return stats

    def _detect_signals(self, indicators: list[Any]) -> list[Any]:
        try:
            from etl.sources.economy.economic_signal_detector import detect_signals
            return detect_signals(indicators)
        except Exception as exc:
            logger.error("EconomyMonitor._detect_signals: %s", exc)
            return []

    def _persist_signals(self, signals: list[Any]) -> dict[str, int]:
        stats = {"alerts_created": 0}
        engine = self._engine or self._get_engine()
        try:
            from etl.sources.economy.economic_signal_detector import (
                upsert_signals, create_signal_alerts,
            )
            upsert_signals(signals, engine)
            n_alerts = create_signal_alerts(signals, engine)
            stats["alerts_created"] = n_alerts
        except Exception as exc:
            logger.error("EconomyMonitor._persist_signals: %s", exc)
        return stats

    def _get_engine(self) -> Any:
        try:
            from db.database import get_engine
            return get_engine()
        except Exception:
            return None

    @staticmethod
    def ensure_tables(engine: Any) -> bool:
        """Verifica que las tablas del bloque económico existen."""
        if engine is None:
            return False
        try:
            from sqlalchemy import text as sa_text
            with engine.connect() as conn:
                conn.execute(sa_text("SELECT 1 FROM macro_indicators LIMIT 1"))
            return True
        except Exception:
            return False
