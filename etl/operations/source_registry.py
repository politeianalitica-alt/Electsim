"""
Source Registry — Bloque 8.

Registro centralizado de fuentes de datos de ElectSim.
Persiste en la tabla source_registry (si existe) o en memoria.

Fuentes incluidas por defecto:
  boe, congreso, senado, eurlex, rss_media, fundus, ine, bde,
  eurostat, opensanctions, infoelectoral, geojson_provincias,
  polls_manual, brain_rag, youtube, cis
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)

from etl.operations.schemas import SourceDefinition, SourceHealth

# ── Fuentes por defecto ────────────────────────────────────────────────────────

_DEFAULT_SOURCES: list[SourceDefinition] = [
    # Legislativo
    SourceDefinition(
        source_id="boe",
        name="Boletín Oficial del Estado",
        domain="legislative",
        source_type="api",
        base_url="https://www.boe.es",
        refresh_interval_minutes=60,
        expected_latency_minutes=120,
        risk_level="LOW",
        metadata={"country": "ES", "language": "es"},
    ),
    SourceDefinition(
        source_id="congreso",
        name="Congreso de los Diputados",
        domain="legislative",
        source_type="scraper",
        base_url="https://www.congreso.es",
        refresh_interval_minutes=240,
        expected_latency_minutes=480,
        risk_level="LOW",
    ),
    SourceDefinition(
        source_id="senado",
        name="Senado de España",
        domain="legislative",
        source_type="scraper",
        base_url="https://www.senado.es",
        refresh_interval_minutes=480,
        expected_latency_minutes=960,
        risk_level="LOW",
    ),
    SourceDefinition(
        source_id="eurlex",
        name="EUR-Lex (Legislación UE)",
        domain="legislative",
        source_type="api",
        base_url="https://eur-lex.europa.eu",
        refresh_interval_minutes=360,
        expected_latency_minutes=720,
        risk_level="LOW",
    ),
    SourceDefinition(
        source_id="moncloa",
        name="La Moncloa — Agenda Gobierno",
        domain="legislative",
        source_type="scraper",
        base_url="https://www.lamoncloa.gob.es",
        refresh_interval_minutes=120,
        expected_latency_minutes=240,
        risk_level="LOW",
    ),

    # Medios
    SourceDefinition(
        source_id="rss_media",
        name="RSS Medios Españoles (10 fuentes)",
        domain="media",
        source_type="rss",
        refresh_interval_minutes=30,
        expected_latency_minutes=60,
        risk_level="LOW",
        metadata={"sources": ["elpais", "elmundo", "abc", "lavanguardia", "expansion", "20minutos", "elconfidencial", "publico", "eldiario", "rtve"]},
    ),
    SourceDefinition(
        source_id="fundus",
        name="Fundus — Media Intelligence",
        domain="media",
        source_type="api",
        refresh_interval_minutes=60,
        expected_latency_minutes=120,
        risk_level="MEDIUM",
    ),
    SourceDefinition(
        source_id="youtube",
        name="YouTube — Canales políticos",
        domain="media",
        source_type="api",
        base_url="https://www.googleapis.com/youtube/v3",
        refresh_interval_minutes=180,
        expected_latency_minutes=360,
        requires_credentials=True,
        risk_level="LOW",
    ),

    # Economía
    SourceDefinition(
        source_id="ine",
        name="INE — Instituto Nacional de Estadística",
        domain="economy",
        source_type="api",
        base_url="https://www.ine.es",
        refresh_interval_minutes=1440,   # diario
        expected_latency_minutes=2880,
        risk_level="LOW",
    ),
    SourceDefinition(
        source_id="bde",
        name="Banco de España — Estadísticas",
        domain="economy",
        source_type="api",
        base_url="https://www.bde.es",
        refresh_interval_minutes=1440,
        expected_latency_minutes=4320,
        risk_level="LOW",
    ),
    SourceDefinition(
        source_id="eurostat",
        name="Eurostat — Estadísticas UE",
        domain="economy",
        source_type="api",
        base_url="https://ec.europa.eu/eurostat",
        refresh_interval_minutes=10080,  # semanal
        expected_latency_minutes=20160,
        risk_level="LOW",
    ),

    # Electoral
    SourceDefinition(
        source_id="infoelectoral",
        name="Infoelectoral — Resultados electorales",
        domain="electoral",
        source_type="file",
        base_url="https://infoelectoral.interior.gob.es",
        refresh_interval_minutes=43200,  # mensual en días sin elecciones
        expected_latency_minutes=86400,
        risk_level="LOW",
    ),
    SourceDefinition(
        source_id="polls_manual",
        name="Encuestas — Carga Manual / Wikipedia",
        domain="electoral",
        source_type="manual",
        refresh_interval_minutes=1440,
        expected_latency_minutes=2880,
        risk_level="LOW",
    ),
    SourceDefinition(
        source_id="cis",
        name="CIS — Centro de Investigaciones Sociológicas",
        domain="electoral",
        source_type="scraper",
        base_url="https://www.cis.es",
        refresh_interval_minutes=2880,
        expected_latency_minutes=10080,
        risk_level="LOW",
    ),

    # OSINT
    SourceDefinition(
        source_id="opensanctions",
        name="OpenSanctions — Personas y entidades sancionadas",
        domain="osint",
        source_type="file",
        base_url="https://www.opensanctions.org",
        refresh_interval_minutes=10080,
        expected_latency_minutes=20160,
        risk_level="MEDIUM",
    ),

    # Geoespacial
    SourceDefinition(
        source_id="geojson_provincias",
        name="IGN / INE — GeoJSON Provincias y CCAA",
        domain="geospatial",
        source_type="file",
        base_url="https://www.ine.es",
        refresh_interval_minutes=43200,  # mensual
        expected_latency_minutes=86400,
        risk_level="LOW",
    ),

    # Sistema
    SourceDefinition(
        source_id="brain_rag",
        name="Politeia Brain — Índice RAG",
        domain="system",
        source_type="llm",
        refresh_interval_minutes=360,
        expected_latency_minutes=720,
        risk_level="LOW",
    ),
]

# Caché en memoria
_SOURCE_CACHE: dict[str, SourceDefinition] = {s.source_id: s for s in _DEFAULT_SOURCES}


# ── Funciones ──────────────────────────────────────────────────────────────────

def register_source(source: SourceDefinition, engine: Any = None) -> None:
    """
    Registra una fuente de datos.

    Persiste en source_registry si el engine está disponible.
    Siempre actualiza el caché en memoria.
    """
    _SOURCE_CACHE[source.source_id] = source

    if engine is None:
        return

    try:
        import json
        from sqlalchemy import text as sa_text
        with engine.begin() as conn:
            conn.execute(sa_text("""
                INSERT INTO source_registry (
                    source_id, name, domain, source_type,
                    base_url, owner, refresh_interval_minutes,
                    expected_latency_minutes, requires_credentials,
                    robots_policy, active, risk_level, metadata, updated_at
                ) VALUES (
                    :source_id, :name, :domain, :source_type,
                    :base_url, :owner, :refresh_interval_minutes,
                    :expected_latency_minutes, :requires_credentials,
                    :robots_policy, :active, :risk_level, :metadata::jsonb, NOW()
                )
                ON CONFLICT (source_id) DO UPDATE SET
                    name = EXCLUDED.name,
                    domain = EXCLUDED.domain,
                    source_type = EXCLUDED.source_type,
                    base_url = EXCLUDED.base_url,
                    refresh_interval_minutes = EXCLUDED.refresh_interval_minutes,
                    active = EXCLUDED.active,
                    risk_level = EXCLUDED.risk_level,
                    metadata = EXCLUDED.metadata,
                    updated_at = NOW()
            """), {
                "source_id": source.source_id,
                "name": source.name,
                "domain": source.domain,
                "source_type": source.source_type,
                "base_url": source.base_url,
                "owner": source.owner,
                "refresh_interval_minutes": source.refresh_interval_minutes,
                "expected_latency_minutes": source.expected_latency_minutes,
                "requires_credentials": source.requires_credentials,
                "robots_policy": source.robots_policy,
                "active": source.active,
                "risk_level": source.risk_level,
                "metadata": json.dumps(source.metadata),
            })
    except Exception as exc:
        logger.debug("register_source DB: %s", exc)


def list_sources(
    domain: str | None = None,
    active_only: bool = True,
    engine: Any = None,
) -> list[SourceDefinition]:
    """
    Lista fuentes registradas.

    Args:
        domain: Filtrar por dominio.
        active_only: Solo fuentes activas.
        engine: SQLAlchemy engine (None → usa caché en memoria).

    Returns:
        Lista de SourceDefinition.
    """
    # Intentar desde BD
    if engine is not None:
        try:
            import json
            import pandas as pd
            from sqlalchemy import text as sa_text
            with engine.connect() as conn:
                df = pd.read_sql(sa_text("""
                    SELECT * FROM source_registry
                    WHERE (:domain IS NULL OR domain = :domain)
                      AND (:active_only = FALSE OR active = TRUE)
                    ORDER BY domain, source_id
                """), conn, params={"domain": domain, "active_only": active_only})
            if not df.empty:
                sources = []
                for _, row in df.iterrows():
                    try:
                        meta = row.get("metadata") or {}
                        if isinstance(meta, str):
                            meta = json.loads(meta)
                        sources.append(SourceDefinition(
                            source_id=row["source_id"],
                            name=row["name"],
                            domain=row["domain"],
                            source_type=row["source_type"],
                            base_url=row.get("base_url"),
                            owner=row.get("owner"),
                            refresh_interval_minutes=row.get("refresh_interval_minutes"),
                            expected_latency_minutes=row.get("expected_latency_minutes"),
                            requires_credentials=bool(row.get("requires_credentials", False)),
                            active=bool(row.get("active", True)),
                            risk_level=row.get("risk_level", "LOW"),
                            metadata=meta,
                        ))
                    except Exception:
                        continue
                return sources
        except Exception as exc:
            logger.debug("list_sources DB: %s", exc)

    # Fallback: caché en memoria
    sources = list(_SOURCE_CACHE.values())
    if domain:
        sources = [s for s in sources if s.domain == domain]
    if active_only:
        sources = [s for s in sources if s.active]
    return sorted(sources, key=lambda s: (s.domain, s.source_id))


def get_source(source_id: str, engine: Any = None) -> SourceDefinition | None:
    """Obtiene una fuente por su ID."""
    sources = list_sources(active_only=False, engine=engine)
    for s in sources:
        if s.source_id == source_id:
            return s
    return _SOURCE_CACHE.get(source_id)


def update_source_health(
    source_id: str,
    health: SourceHealth,
    engine: Any = None,
) -> None:
    """Actualiza el estado de salud de una fuente en source_health."""
    if engine is None:
        return
    try:
        from sqlalchemy import text as sa_text
        with engine.begin() as conn:
            conn.execute(sa_text("""
                INSERT INTO source_health (
                    source_id, status, last_success_at, last_failure_at,
                    freshness_lag_minutes, consecutive_failures,
                    avg_latency_ms, last_error, checked_at
                ) VALUES (
                    :source_id, :status, :last_success_at, :last_failure_at,
                    :freshness_lag_minutes, :consecutive_failures,
                    :avg_latency_ms, :last_error, :checked_at
                )
            """), {
                "source_id": health.source_id,
                "status": health.status,
                "last_success_at": health.last_success_at,
                "last_failure_at": health.last_failure_at,
                "freshness_lag_minutes": health.freshness_lag_minutes,
                "consecutive_failures": health.consecutive_failures,
                "avg_latency_ms": health.avg_latency_ms,
                "last_error": health.last_error,
                "checked_at": health.checked_at,
            })
    except Exception as exc:
        logger.debug("update_source_health: %s", exc)


def seed_default_sources(engine: Any = None) -> int:
    """
    Registra las fuentes por defecto de ElectSim.

    Returns:
        Número de fuentes registradas.
    """
    n = 0
    for source in _DEFAULT_SOURCES:
        try:
            register_source(source, engine=engine)
            n += 1
        except Exception as exc:
            logger.debug("seed_default_sources %s: %s", source.source_id, exc)

    logger.info("seed_default_sources: %d fuentes registradas", n)
    return n
