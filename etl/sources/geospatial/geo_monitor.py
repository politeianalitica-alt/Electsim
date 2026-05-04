"""
GeoMonitor — Bloque 7.

Orquestador del pipeline territorial:
  1. sync_ine         → sincroniza ccaa/provincias/municipios desde INE
  2. load_geometries  → carga GeoJSON y persiste en territory_geometries
  3. detect_signals   → genera señales territoriales
  4. build_profiles   → construye perfiles de territorio
  5. generate_alerts  → crea alertas del sistema

Análogo a ElectoralMonitor (Bloque 6) pero para el módulo geoespacial.

Uso:
    python -m pipelines.territorial_core --run-all
"""
from __future__ import annotations

import logging
from datetime import date
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


class GeoMonitor:
    """
    Orquesta el pipeline de inteligencia territorial.

    Args:
        engine: SQLAlchemy engine (None → modo demo sin BD).
        dry_run: Si True, no persiste nada.
        geography: Ámbito geográfico principal (por defecto "ES").
    """

    def __init__(
        self,
        engine: Any = None,
        dry_run: bool = False,
        geography: str = "ES",
    ) -> None:
        self.engine = engine
        self.dry_run = dry_run
        self.geography = geography
        self._summary: dict[str, Any] = {}

    # ── Fase 1 — Sincronización INE ────────────────────────────────────────────

    def sync_ine(self) -> dict[str, int]:
        """
        Sincroniza territorios desde INE (ccaa, provincias, municipios).

        Returns:
            Dict con counts: {"ccaa": N, "provincias": N, "municipios": N}
        """
        counts: dict[str, int] = {"ccaa": 0, "provincias": 0, "municipios": 0}

        try:
            from etl.sources.geospatial.ine_geography_adapter import (
                load_ccaa,
                load_provinces,
                load_municipalities,
                sync_ine_geography,
            )

            if self.engine is not None and not self.dry_run:
                try:
                    sync_ine_geography(self.engine)
                except Exception as exc:
                    logger.debug("sync_ine_geography: %s", exc)

            counts["ccaa"] = len(load_ccaa(self.engine))
            counts["provincias"] = len(load_provinces(self.engine))
            counts["municipios"] = len(load_municipalities(self.engine, limit=500))

        except Exception as exc:
            logger.warning("GeoMonitor.sync_ine: %s", exc)

        logger.info("GeoMonitor.sync_ine: %s", counts)
        return counts

    # ── Fase 2 — Carga de Geometrías ──────────────────────────────────────────

    def load_geometries(
        self,
        territory_types: list[str] | None = None,
        resolution: str = "low",
        geojson_dir: str | Path | None = None,
    ) -> dict[str, int]:
        """
        Carga GeoJSON de territorios y persiste en territory_geometries.

        Args:
            territory_types: Lista de tipos a cargar. Default: ['ccaa', 'province'].
            resolution: Resolución de geometrías ('full', 'medium', 'low').
            geojson_dir: Directorio base de GeoJSON. Default: data/raw/geospatial/.

        Returns:
            Dict territory_type → número de geometrías cargadas.
        """
        types = territory_types or ["ccaa", "province"]
        counts: dict[str, int] = {}

        try:
            from etl.sources.geospatial.geojson_loader import (
                load_default_geojson,
                save_geometries_to_db,
            )

            for ttype in types:
                try:
                    geometries = load_default_geojson(
                        territory_type=ttype,
                        resolution=resolution,
                    )
                    counts[ttype] = len(geometries)

                    if geometries and self.engine is not None and not self.dry_run:
                        n_saved = save_geometries_to_db(geometries, self.engine)
                        logger.info(
                            "GeoMonitor.load_geometries: %d %s guardadas (res=%s)",
                            n_saved, ttype, resolution
                        )
                except Exception as exc:
                    logger.debug("load_geometries %s: %s", ttype, exc)
                    counts[ttype] = 0

        except Exception as exc:
            logger.warning("GeoMonitor.load_geometries: %s", exc)

        return counts

    # ── Fase 3 — Señales Territoriales ────────────────────────────────────────

    def detect_signals(
        self,
        persist: bool = True,
    ) -> list:
        """
        Ejecuta todos los detectores de señales territoriales.

        Returns:
            Lista de TerritorialSignal generadas.
        """
        from etl.sources.geospatial.territorial_signal_detector import (
            detect_all_signals,
            save_signals,
        )

        signals = detect_all_signals(engine=self.engine)

        if signals and persist and not self.dry_run and self.engine is not None:
            n = save_signals(signals, self.engine)
            logger.info("GeoMonitor.detect_signals: %d señales persistidas", n)

        logger.info(
            "GeoMonitor.detect_signals: %d señales totales (HIGH/CRITICAL=%d)",
            len(signals),
            sum(1 for s in signals if s.severity in ("HIGH", "CRITICAL"))
        )
        return signals

    # ── Fase 4 — Perfiles de Territorio ───────────────────────────────────────

    def build_profiles(
        self,
        territory_ids: list[str] | None = None,
        persist: bool = True,
    ) -> dict[str, Any]:
        """
        Construye perfiles de territorios y los persiste en caché.

        Args:
            territory_ids: IDs a perfilar. Default: todas las provincias.
            persist: Si True, guarda en territory_profiles_cache.

        Returns:
            Dict territory_id → TerritoryProfile.
        """
        from etl.sources.geospatial.territorial_aggregator import build_territory_profile
        from etl.sources.geospatial.schemas import SPAIN_PROVINCES, build_territory_id

        if territory_ids is None:
            territory_ids = [
                build_territory_id("province", code)
                for code in SPAIN_PROVINCES
            ]

        profiles: dict[str, Any] = {}
        errors = 0

        for tid in territory_ids:
            try:
                profile = build_territory_profile(tid, self.engine)
                profiles[tid] = profile

                if persist and not self.dry_run and self.engine is not None:
                    self._persist_profile(profile)

            except Exception as exc:
                logger.debug("GeoMonitor.build_profiles %s: %s", tid, exc)
                errors += 1

        logger.info(
            "GeoMonitor.build_profiles: %d perfiles generados, %d errores",
            len(profiles), errors
        )
        return profiles

    def _persist_profile(self, profile: Any) -> None:
        """Persiste un perfil en territory_profiles_cache."""
        try:
            import json
            from sqlalchemy import text as sa_text

            with self.engine.begin() as conn:
                conn.execute(sa_text("""
                    INSERT INTO territory_profiles_cache (
                        territory_id, territory_type, profile_date,
                        name, economic_risk, unemployment_rate,
                        income_avg, campaign_priority, active_alerts,
                        full_profile
                    ) VALUES (
                        :territory_id, :territory_type, :profile_date,
                        :name, :economic_risk, :unemployment_rate,
                        :income_avg, :campaign_priority, :active_alerts,
                        :full_profile::jsonb
                    )
                    ON CONFLICT (territory_id, profile_date)
                    DO UPDATE SET
                        economic_risk = EXCLUDED.economic_risk,
                        unemployment_rate = EXCLUDED.unemployment_rate,
                        income_avg = EXCLUDED.income_avg,
                        campaign_priority = EXCLUDED.campaign_priority,
                        active_alerts = EXCLUDED.active_alerts,
                        full_profile = EXCLUDED.full_profile,
                        updated_at = NOW()
                """), {
                    "territory_id": profile.territory_id,
                    "territory_type": profile.territory_type,
                    "profile_date": date.today().isoformat(),
                    "name": profile.name,
                    "economic_risk": profile.economic_risk,
                    "unemployment_rate": profile.unemployment_rate,
                    "income_avg": profile.income_avg,
                    "campaign_priority": profile.campaign_priority,
                    "active_alerts": profile.active_alerts,
                    "full_profile": json.dumps({
                        "territory_id": profile.territory_id,
                        "name": profile.name,
                        "campaign_priority": profile.campaign_priority,
                    }),
                })
        except Exception as exc:
            logger.debug("_persist_profile %s: %s", profile.territory_id, exc)

    # ── Fase 5 — Alertas del Sistema ──────────────────────────────────────────

    def generate_alerts(
        self,
        signals: list | None = None,
    ) -> list[dict]:
        """
        Convierte señales HIGH/CRITICAL en alertas del sistema.

        Args:
            signals: Lista de señales. Si None, ejecuta detect_signals().

        Returns:
            Lista de dicts de alerta.
        """
        from etl.sources.geospatial.territorial_signal_detector import (
            detect_all_signals,
            create_territorial_alerts,
        )

        if signals is None:
            signals = detect_all_signals(engine=self.engine)

        alerts = create_territorial_alerts(signals, self.engine)
        logger.info("GeoMonitor.generate_alerts: %d alertas generadas", len(alerts))
        return alerts

    # ── Pipeline completo ──────────────────────────────────────────────────────

    def run_all(
        self,
        territory_types: list[str] | None = None,
        resolution: str = "low",
        build_all_profiles: bool = True,
    ) -> dict[str, Any]:
        """
        Ejecuta el pipeline territorial completo.

        Args:
            territory_types: Tipos de geometría a cargar.
            resolution: Resolución para geometrías.
            build_all_profiles: Si True, construye perfiles de todas las provincias.

        Returns:
            Resumen de la ejecución.
        """
        logger.info("GeoMonitor.run_all: inicio (dry_run=%s)", self.dry_run)

        summary: dict[str, Any] = {
            "date": date.today().isoformat(),
            "dry_run": self.dry_run,
            "geography": self.geography,
            "ine_sync": {},
            "geometries": {},
            "signals": {"total": 0, "high": 0},
            "profiles": 0,
            "alerts": 0,
            "errors": [],
        }

        # 1. Sincronizar INE
        try:
            summary["ine_sync"] = self.sync_ine()
        except Exception as exc:
            summary["errors"].append(f"sync_ine: {exc}")

        # 2. Cargar geometrías
        try:
            summary["geometries"] = self.load_geometries(
                territory_types=territory_types,
                resolution=resolution,
            )
        except Exception as exc:
            summary["errors"].append(f"load_geometries: {exc}")

        # 3. Detectar señales
        try:
            signals = self.detect_signals(persist=True)
            summary["signals"]["total"] = len(signals)
            summary["signals"]["high"] = sum(
                1 for s in signals if s.severity in ("HIGH", "CRITICAL")
            )
        except Exception as exc:
            signals = []
            summary["errors"].append(f"detect_signals: {exc}")

        # 4. Construir perfiles
        try:
            if build_all_profiles:
                profiles = self.build_profiles(persist=True)
                summary["profiles"] = len(profiles)
        except Exception as exc:
            summary["errors"].append(f"build_profiles: {exc}")

        # 5. Generar alertas
        try:
            alerts = self.generate_alerts(signals=signals)
            summary["alerts"] = len(alerts)
        except Exception as exc:
            summary["errors"].append(f"generate_alerts: {exc}")

        self._summary = summary
        logger.info(
            "GeoMonitor.run_all: completado — %d señales, %d alertas, %d errores",
            summary["signals"]["total"],
            summary["alerts"],
            len(summary["errors"]),
        )
        return summary

    @property
    def last_summary(self) -> dict[str, Any]:
        """Devuelve el resumen de la última ejecución."""
        return self._summary
