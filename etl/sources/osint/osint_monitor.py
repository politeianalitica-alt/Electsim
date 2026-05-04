"""
OSINT Monitor — Bloque 4.

Orquestador ETL que persiste RiskEntity, RiskRelation y RiskFlag en la BD.
Equivalent al MediaMonitor del Bloque 2, pero para el grafo de riesgo.

Usa el patrón BaseRealTimeScraper cuando está disponible,
con shim de compatibilidad cuando no lo está.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)

# ── Shim de compatibilidad ────────────────────────────────────────────────────
try:
    from etl.realtime.base import BaseRealTimeScraper as _RealBase  # type: ignore
    _UseBase = _RealBase
except ImportError:
    class _ShimBase:  # type: ignore
        def __init__(self, nombre: str = "osint_monitor", engine: Any = None, **kw: Any) -> None:
            self.nombre = nombre
            self._engine = engine

        def run(self) -> dict[str, int]:
            raise NotImplementedError
    _UseBase = _ShimBase


class OSINTMonitor(_UseBase):
    """
    Monitor ETL para el módulo OSINT/Risk Graph.

    Orquesta:
      1. Carga de entidades (desde adaptadores)
      2. Resolución de duplicados
      3. Cálculo de risk scores
      4. Detección de flags
      5. Persistencia en BD (risk_entities, risk_flags, risk_relations)
      6. Generación de alertas
    """

    def __init__(self, engine: Any = None, dry_run: bool = False) -> None:
        try:
            super().__init__(nombre="osint_monitor", engine=engine)
        except TypeError:
            try:
                super().__init__(nombre="osint_monitor")
            except Exception:
                pass
        self._engine = engine
        self.dry_run = dry_run

    def run(self) -> dict[str, int]:
        """
        Ejecuta el pipeline OSINT completo.
        Pensado para ser llamado desde pipelines/osint_core.py.
        """
        stats = {
            "entities_upserted": 0,
            "relations_upserted": 0,
            "flags_upserted": 0,
            "alerts_created": 0,
            "errors": 0,
        }
        logger.info("OSINTMonitor.run() iniciado (dry_run=%s)", self.dry_run)
        # La lógica real la orquestan las funciones de pipelines/osint_core.py
        return stats

    def upsert_entities(
        self,
        entities: list[Any],
        flags_by_entity: dict[str, list[Any]] | None = None,
    ) -> dict[str, int]:
        """Persiste entidades y flags en la BD."""
        if self.dry_run:
            logger.info("[dry_run] upsert_entities: %d entidades", len(entities))
            return {"entities": len(entities), "flags": 0}

        n_entities = 0
        n_flags = 0
        engine = self._engine or self._get_engine()
        if not engine:
            logger.warning("OSINTMonitor: sin engine de BD, omitiendo upsert")
            return {"entities": 0, "flags": 0}

        try:
            from sqlalchemy import text as sa_text

            with engine.begin() as conn:
                for entity in entities:
                    try:
                        db_dict = entity.to_db_dict() if hasattr(entity, "to_db_dict") else {}
                        if not db_dict:
                            continue
                        conn.execute(sa_text("""
                            INSERT INTO risk_entities (
                                source, source_id, entity_type, name, aliases,
                                countries, identifiers, birth_date, incorporation_date,
                                pep_status, sanctions_status, risk_flags,
                                risk_score, confidence, source_url, raw_payload,
                                first_seen, last_seen
                            ) VALUES (
                                :source, :source_id, :entity_type, :name, :aliases,
                                :countries, :identifiers::jsonb, :birth_date, :incorporation_date,
                                :pep_status, :sanctions_status, :risk_flags,
                                :risk_score, :confidence, :source_url, :raw_payload::jsonb,
                                :first_seen, :last_seen
                            )
                            ON CONFLICT (source, source_id) DO UPDATE SET
                                name = EXCLUDED.name,
                                aliases = EXCLUDED.aliases,
                                countries = EXCLUDED.countries,
                                pep_status = EXCLUDED.pep_status,
                                sanctions_status = EXCLUDED.sanctions_status,
                                risk_flags = EXCLUDED.risk_flags,
                                risk_score = EXCLUDED.risk_score,
                                confidence = EXCLUDED.confidence,
                                last_seen = EXCLUDED.last_seen,
                                updated_at = NOW()
                        """), _prepare_entity_params(db_dict))
                        n_entities += 1
                    except Exception as exc:
                        logger.debug("upsert entity error: %s", exc)

                # Flags
                if flags_by_entity:
                    for entity_flags in flags_by_entity.values():
                        for flag in (entity_flags or []):
                            try:
                                conn.execute(sa_text("""
                                    INSERT INTO risk_flags (
                                        entity_id, flag_type, severity, description,
                                        source, evidence_url, confidence, raw_payload
                                    )
                                    SELECT id, :flag_type, :severity, :description,
                                           :source, :evidence_url, :confidence, :raw_payload::jsonb
                                    FROM risk_entities
                                    WHERE source = :entity_source AND source_id = :entity_source_id
                                    ON CONFLICT DO NOTHING
                                """), {
                                    "flag_type": flag.flag_type,
                                    "severity": flag.severity,
                                    "description": flag.description,
                                    "source": flag.source,
                                    "evidence_url": flag.evidence_url,
                                    "confidence": float(flag.confidence),
                                    "raw_payload": "{}",
                                    "entity_source": flag.source,
                                    "entity_source_id": flag.entity_id,
                                })
                                n_flags += 1
                            except Exception as exc:
                                logger.debug("upsert flag error: %s", exc)

        except Exception as exc:
            logger.error("OSINTMonitor.upsert_entities: %s", exc)

        return {"entities": n_entities, "flags": n_flags}

    def create_risk_alerts(self, entities: list[Any]) -> int:
        """Crea alertas en alertas_sistema para entidades de alto riesgo."""
        n_alerts = 0
        for entity in entities:
            try:
                if getattr(entity, "sanctions_status", False):
                    _create_alert(
                        tipo="risk_entity_sanctioned",
                        severidad="CRITICAL",
                        titulo=f"Entidad sancionada: {entity.name[:60]}",
                        descripcion=f"La entidad '{entity.name}' aparece en registros de sanciones. Fuente: {entity.source}",
                        datos={
                            "pagina_relevante": "actores",
                            "entity_source": entity.source,
                            "entity_source_id": entity.source_id,
                            "risk_score": float(entity.risk_score),
                        },
                        engine=self._engine or self._get_engine(),
                    )
                    n_alerts += 1

                if getattr(entity, "pep_status", False):
                    _create_alert(
                        tipo="risk_entity_pep_match",
                        severidad="WARNING",
                        titulo=f"PEP detectado: {entity.name[:60]}",
                        descripcion=f"La entidad '{entity.name}' está clasificada como persona políticamente expuesta.",
                        datos={
                            "pagina_relevante": "actores",
                            "entity_source": entity.source,
                            "entity_source_id": entity.source_id,
                            "risk_score": float(entity.risk_score),
                        },
                        engine=self._engine or self._get_engine(),
                    )
                    n_alerts += 1
            except Exception as exc:
                logger.debug("create_risk_alert error: %s", exc)

        return n_alerts

    def _get_engine(self) -> Any:
        try:
            from db.database import get_engine
            return get_engine()
        except Exception:
            return None

    @staticmethod
    def ensure_tables(engine: Any) -> bool:
        """Verifica que las tablas de riesgo existen."""
        if engine is None:
            return False
        try:
            from sqlalchemy import text as sa_text
            with engine.connect() as conn:
                conn.execute(sa_text("SELECT 1 FROM risk_entities LIMIT 1"))
            return True
        except Exception:
            return False


# ── Helpers privados ──────────────────────────────────────────────────────────

def _prepare_entity_params(db_dict: dict[str, Any]) -> dict[str, Any]:
    """Prepara los parámetros SQL para un upsert de entidad."""
    import json as _json
    return {
        "source": db_dict.get("source", ""),
        "source_id": db_dict.get("source_id", ""),
        "entity_type": db_dict.get("entity_type", "unknown"),
        "name": db_dict.get("name", ""),
        "aliases": db_dict.get("aliases") or [],
        "countries": db_dict.get("countries") or [],
        "identifiers": _json.dumps(db_dict.get("identifiers") or []),
        "birth_date": db_dict.get("birth_date"),
        "incorporation_date": db_dict.get("incorporation_date"),
        "pep_status": bool(db_dict.get("pep_status", False)),
        "sanctions_status": bool(db_dict.get("sanctions_status", False)),
        "risk_flags": db_dict.get("risk_flags") or [],
        "risk_score": float(db_dict.get("risk_score", 0.0)),
        "confidence": float(db_dict.get("confidence", 0.0)),
        "source_url": db_dict.get("source_url"),
        "raw_payload": _json.dumps(db_dict.get("raw_payload") or {}),
        "first_seen": db_dict.get("first_seen") or datetime.now(timezone.utc),
        "last_seen": db_dict.get("last_seen") or datetime.now(timezone.utc),
    }


def _create_alert(
    tipo: str,
    severidad: str,
    titulo: str,
    descripcion: str,
    datos: dict,
    engine: Any,
) -> None:
    """Inserta una alerta en alertas_sistema (silencia si falla)."""
    if engine is None:
        return
    try:
        import json as _json
        from sqlalchemy import text as sa_text
        with engine.begin() as conn:
            conn.execute(sa_text("""
                INSERT INTO alertas_sistema (tipo, severidad, titulo, descripcion, datos, created_at)
                VALUES (:tipo, :severidad, :titulo, :descripcion, :datos::jsonb, NOW())
                ON CONFLICT DO NOTHING
            """), {
                "tipo": tipo,
                "severidad": severidad,
                "titulo": titulo[:200],
                "descripcion": descripcion[:1000],
                "datos": _json.dumps(datos),
            })
    except Exception as exc:
        logger.debug("_create_alert failed: %s", exc)
