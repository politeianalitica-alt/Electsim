"""
Source Registry — canonical list of all data sources for ElectSim/Politeia.
Provides health-aware source listing with graceful fallbacks.
"""
from __future__ import annotations

from datetime import datetime, timezone

from api.schemas.sources import (
    IngestionRunResult,
    SourceDefinition,
    SourceHealth,
    SourceWithHealth,
)

# ---------------------------------------------------------------------------
# Canonical source definitions
# ---------------------------------------------------------------------------

SOURCE_DEFINITIONS: list[SourceDefinition] = [
    # ── LEGISLATIVE ─────────────────────────────────────────────────────────
    SourceDefinition(
        id="boe",
        name="BOE — Boletín Oficial del Estado",
        domain="legislative",
        mode="api",
        description="Disposiciones, actos y anuncios del estado español publicados en el BOE.",
        url="https://www.boe.es/datosabiertos/api.php",
        owner="Agencia Estatal BOE",
        refresh_policy="daily",
        tags=["legislación", "normativa", "oficial"],
        legal_notes="Datos en dominio público (art. 28 LPI).",
    ),
    SourceDefinition(
        id="congreso",
        name="Congreso de los Diputados — API Datos Abiertos",
        domain="legislative",
        mode="api",
        description="Iniciativas parlamentarias, votaciones y composición del Congreso.",
        url="https://www.congreso.es/opendata/",
        owner="Congreso de los Diputados",
        refresh_policy="daily",
        tags=["parlamento", "iniciativas", "votaciones"],
    ),
    SourceDefinition(
        id="senado",
        name="Senado de España — Datos Abiertos",
        domain="legislative",
        mode="api",
        description="Actividad parlamentaria, composición y votaciones del Senado.",
        url="https://www.senado.es/web/relacionesciudadanos/datosabiertos/index.html",
        owner="Senado de España",
        refresh_policy="daily",
        tags=["senado", "cámara alta", "parlamento"],
    ),
    SourceDefinition(
        id="eur_lex",
        name="EUR-Lex — Legislación Europea",
        domain="legislative",
        mode="api",
        description="Base de datos oficial del derecho de la Unión Europea.",
        url="https://eur-lex.europa.eu/SPARQL",
        owner="Oficina de Publicaciones de la UE",
        refresh_policy="daily",
        tags=["ue", "directivas", "reglamentos"],
    ),
    SourceDefinition(
        id="bocg",
        name="BOCG — Boletín Oficial de las Cortes Generales",
        domain="legislative",
        mode="scraper",
        description="Publicaciones oficiales de las Cortes Generales (proposiciones, informes).",
        url="https://www.congreso.es/public_oficiales/L15/CONG/BOCG/",
        owner="Cortes Generales",
        refresh_policy="daily",
        tags=["cortes", "boletín", "proposiciones"],
    ),
    # ── ELECTORAL ───────────────────────────────────────────────────────────
    SourceDefinition(
        id="cis_barometro",
        name="CIS — Barómetro Mensual",
        domain="electoral",
        mode="api",
        description="Barómetros mensuales y estudios de opinión pública del CIS.",
        url="https://www.cis.es/es/buscador-estudios.html",
        owner="Centro de Investigaciones Sociológicas",
        refresh_policy="monthly",
        tags=["opinión pública", "encuestas", "intención de voto"],
    ),
    SourceDefinition(
        id="interior_resultados",
        name="Ministerio del Interior — Resultados Electorales",
        domain="electoral",
        mode="api",
        description="Resultados oficiales de elecciones generales, autonómicas y locales.",
        url="https://infoelectoral.interior.gob.es/es/elecciones/",
        owner="Ministerio del Interior",
        refresh_policy="by_election",
        tags=["resultados", "escaños", "votos"],
    ),
    SourceDefinition(
        id="encuestas_tracking",
        name="Tracking de Encuestas Electorales",
        domain="electoral",
        mode="scraper",
        description="Agregación de encuestas de intención de voto de medios y empresas demoscópicas.",
        url=None,
        owner="Interno",
        refresh_policy="daily",
        tags=["encuestas", "demoscopia", "tracking"],
    ),
    # ── ECONOMIC ────────────────────────────────────────────────────────────
    SourceDefinition(
        id="bde",
        name="Banco de España — Series Estadísticas",
        domain="economic",
        mode="api",
        description="Series temporales macroeconómicas del Banco de España (tipos, crédito, deuda).",
        url="https://www.bde.es/webbde/es/estadis/infoest/descarga_series_temporales.html",
        owner="Banco de España",
        refresh_policy="monthly",
        tags=["macro", "tipos", "crédito", "bde"],
    ),
    SourceDefinition(
        id="ine",
        name="INE — Instituto Nacional de Estadística",
        domain="economic",
        mode="api",
        description="IPC, EPA, Padrón, PIB y más estadísticas oficiales de España.",
        url="https://www.ine.es/dyngs/DataLab/es/manual.html?cid=1259945948443",
        owner="Instituto Nacional de Estadística",
        refresh_policy="monthly",
        tags=["ine", "ipc", "paro", "pib", "macro"],
    ),
    SourceDefinition(
        id="eurostat",
        name="Eurostat — Estadísticas Europeas",
        domain="economic",
        mode="api",
        description="Estadísticas armonizadas de la UE: PIB, empleo, energía, I+D.",
        url="https://ec.europa.eu/eurostat/api/dissemination/",
        owner="Oficina Estadística Europea",
        refresh_policy="monthly",
        tags=["eurostat", "ue", "macro", "nuts"],
    ),
    SourceDefinition(
        id="bce",
        name="BCE — Banco Central Europeo",
        domain="economic",
        mode="api",
        description="Tipos de interés, política monetaria y estadísticas financieras del BCE.",
        url="https://data.ecb.europa.eu/",
        owner="Banco Central Europeo",
        refresh_policy="monthly",
        tags=["bce", "tipos", "política monetaria"],
    ),
    SourceDefinition(
        id="world_bank",
        name="Banco Mundial — World Development Indicators",
        domain="economic",
        mode="api",
        description="Indicadores de desarrollo global del Banco Mundial.",
        url="https://api.worldbank.org/v2/",
        owner="Banco Mundial",
        refresh_policy="annual",
        tags=["banco mundial", "indicadores", "desarrollo"],
    ),
    # ── REGULATORY ──────────────────────────────────────────────────────────
    SourceDefinition(
        id="ree_esios",
        name="REE — ESIOS (Sistema de Información del Operador del Sistema)",
        domain="regulatory",
        mode="api",
        description="Generación eléctrica, precio pool, demanda e intercambios internacionales.",
        url="https://api.esios.ree.es/",
        owner="Red Eléctrica de España",
        refresh_policy="hourly",
        tags=["energía", "electricidad", "precio pool", "ree"],
        legal_notes="Token API gratuito requerido.",
    ),
    SourceDefinition(
        id="cnmc",
        name="CNMC — Comisión Nacional de Mercados y Competencia",
        domain="regulatory",
        mode="scraper",
        description="Resoluciones, informes y estadísticas de la CNMC.",
        url="https://www.cnmc.es/",
        owner="CNMC",
        refresh_policy="weekly",
        tags=["regulación", "competencia", "mercado"],
    ),
    SourceDefinition(
        id="cnmv",
        name="CNMV — Comisión Nacional del Mercado de Valores",
        domain="regulatory",
        mode="api",
        description="Hechos relevantes, registros de entidades y estadísticas de mercado.",
        url="https://www.cnmv.es/portal/home.aspx",
        owner="CNMV",
        refresh_policy="daily",
        tags=["mercado de valores", "hechos relevantes", "cnmv"],
    ),
    SourceDefinition(
        id="omie",
        name="OMIE — Mercado Ibérico de Electricidad",
        domain="regulatory",
        mode="api",
        description="Precios y volúmenes del mercado diario e intradiario de electricidad.",
        url="https://www.omie.es/es/datos-de-mercado",
        owner="OMIE",
        refresh_policy="daily",
        tags=["electricidad", "mercado ibérico", "precio"],
    ),
    # ── MEDIA ────────────────────────────────────────────────────────────────
    SourceDefinition(
        id="media_rss_nacional",
        name="RSS Medios Nacionales",
        domain="media",
        mode="rss",
        description="Feeds RSS de principales medios nacionales (El País, El Mundo, ABC, etc.).",
        url=None,
        owner="Interno",
        refresh_policy="hourly",
        tags=["medios", "prensa", "rss", "nacional"],
    ),
    SourceDefinition(
        id="media_rss_regional",
        name="RSS Medios Regionales",
        domain="media",
        mode="rss",
        description="Feeds RSS de principales medios regionales y autonómicos.",
        url=None,
        owner="Interno",
        refresh_policy="hourly",
        tags=["medios", "prensa", "rss", "regional", "ccaa"],
    ),
    SourceDefinition(
        id="factcheck_feeds",
        name="Fact-checking — Feeds verificación",
        domain="media",
        mode="rss",
        description="Feeds de organizaciones de fact-checking (Maldita, Newtral, AFP Factual).",
        url=None,
        owner="Interno",
        refresh_policy="daily",
        tags=["fact-checking", "desinformación", "verificación"],
    ),
    # ── OSINT ────────────────────────────────────────────────────────────────
    SourceDefinition(
        id="opensanctions",
        name="OpenSanctions — Base de Datos de Sanciones",
        domain="osint",
        mode="api",
        description="Base de datos open-source de personas y entidades sancionadas globalmente.",
        url="https://api.opensanctions.org/",
        owner="OpenSanctions",
        refresh_policy="weekly",
        tags=["sanciones", "peps", "osint", "compliance"],
        legal_notes="Uso comercial requiere licencia.",
    ),
    # ── CONTRACTS ────────────────────────────────────────────────────────────
    SourceDefinition(
        id="contratacion_estado",
        name="PLACE — Plataforma de Contratación del Estado",
        domain="contracts",
        mode="api",
        description="Contratos públicos, licitaciones y adjudicaciones del sector público español.",
        url="https://contrataciondelestado.es/wps/portal/plataforma",
        owner="Ministerio de Hacienda",
        refresh_policy="daily",
        tags=["contratos", "licitaciones", "sector público", "place"],
        legal_notes="Datos abiertos reutilizables.",
    ),
    # ── GEOPOLITICAL ─────────────────────────────────────────────────────────
    SourceDefinition(
        id="acled",
        name="ACLED — Armed Conflict Location & Event Data",
        domain="geopolitical",
        mode="api",
        description="Datos georeferenciados de conflictos armados y protestas.",
        url="https://api.acleddata.com/",
        owner="ACLED",
        refresh_policy="weekly",
        tags=["conflictos", "geopolítica", "seguridad"],
        legal_notes="API key requerida. Uso académico/no-comercial gratuito.",
    ),
    SourceDefinition(
        id="gdelt",
        name="GDELT — Global Database of Events, Language and Tone",
        domain="geopolitical",
        mode="api",
        description="Eventos geopolíticos, actores y tonos extraídos de medios globales.",
        url="https://api.gdeltproject.org/",
        owner="GDELT Project",
        refresh_policy="daily",
        tags=["eventos", "geopolítica", "medios", "nlp"],
        legal_notes="Acceso gratuito con atribución.",
    ),
    # ── TERRITORIAL ──────────────────────────────────────────────────────────
    SourceDefinition(
        id="ine_padron",
        name="INE — Padrón Municipal de Habitantes",
        domain="territorial",
        mode="api",
        description="Población por municipio, edad, sexo y nacionalidad (Padrón continuo INE).",
        url="https://www.ine.es/jaxiT3/Tabla.htm",
        owner="Instituto Nacional de Estadística",
        refresh_policy="annual",
        tags=["padrón", "población", "municipios", "ine"],
    ),
    # ── SYSTEM ───────────────────────────────────────────────────────────────
    SourceDefinition(
        id="ollama_brain",
        name="Politeia Brain (Ollama Local)",
        domain="system",
        mode="database",
        description="Motor de IA local para análisis, briefings y enriquecimiento semántico.",
        url="http://localhost:11434",
        owner="Interno",
        refresh_policy="always_on",
        tags=["ia", "llm", "ollama", "brain"],
    ),
]

# Index for fast lookup
_SOURCE_INDEX: dict[str, SourceDefinition] = {s.id: s for s in SOURCE_DEFINITIONS}


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def list_source_definitions(
    domain: str | None = None,
    enabled_only: bool = False,
) -> list[SourceDefinition]:
    """Return source definitions, optionally filtered by domain or enabled status."""
    sources = list(SOURCE_DEFINITIONS)
    if domain:
        sources = [s for s in sources if s.domain == domain]
    if enabled_only:
        sources = [s for s in sources if s.enabled]
    return sources


def get_sources_with_health() -> list[SourceWithHealth]:
    """
    Return all sources paired with their health status.
    Tries media_intelligence.source_health; falls back to all-unknown.
    """
    now = datetime.now(timezone.utc)

    # Try to get real health data
    health_map: dict[str, SourceHealth] = {}
    try:
        from media_intelligence.source_health import list_active_sources, list_degraded_sources, list_down_sources
        for item in list_active_sources():
            sid = item.source_id
            health_map[sid] = SourceHealth(
                source_id=sid,
                status="active",
                last_success_at=_parse_dt(item.last_success_at),
                last_attempt_at=_parse_dt(item.updated_at),
                records_24h=item.articles_last_24h or 0,
                quality_score=item.quality_score,
                mode="real",
            )
        for item in list_degraded_sources():
            sid = item.source_id
            health_map[sid] = SourceHealth(
                source_id=sid,
                status="degraded",
                last_success_at=_parse_dt(item.last_success_at),
                last_attempt_at=_parse_dt(item.updated_at),
                last_error=item.last_error_message,
                records_24h=item.articles_last_24h or 0,
                quality_score=item.quality_score,
                mode="real",
            )
        for item in list_down_sources():
            sid = item.source_id
            health_map[sid] = SourceHealth(
                source_id=sid,
                status="down",
                last_attempt_at=_parse_dt(item.updated_at),
                last_error=item.last_error_message,
                mode="real",
            )
    except Exception:
        pass  # Will use unknown status for all

    result: list[SourceWithHealth] = []
    for defn in SOURCE_DEFINITIONS:
        health = health_map.get(
            defn.id,
            SourceHealth(
                source_id=defn.id,
                status="unknown" if defn.enabled else "disabled",
                last_attempt_at=None,
                mode="fallback",
            ),
        )
        result.append(SourceWithHealth(definition=defn, health=health))
    return result


def get_source_coverage_summary() -> list[dict]:
    """Return coverage stats per domain."""
    items = get_sources_with_health()
    from collections import Counter, defaultdict

    domain_items: dict[str, list[SourceWithHealth]] = defaultdict(list)
    for item in items:
        domain_items[item.definition.domain].append(item)

    summary = []
    for domain, domain_sources in sorted(domain_items.items()):
        status_counts = Counter(i.health.status for i in domain_sources)
        summary.append({
            "domain": domain,
            "total": len(domain_sources),
            "active": status_counts.get("active", 0),
            "degraded": status_counts.get("degraded", 0),
            "down": status_counts.get("down", 0),
            "unknown": status_counts.get("unknown", 0),
            "disabled": status_counts.get("disabled", 0),
        })
    return summary


def list_recent_ingestion_runs(limit: int = 50) -> list[IngestionRunResult]:
    """
    Try dashboard.db.cargar_scraping_log (DataFrame) and format as IngestionRunResult.
    Falls back to empty list gracefully.
    """
    try:
        from dashboard.db import cargar_scraping_log
        df = cargar_scraping_log()
        if df is None or df.empty:
            return []
        import uuid as _uuid
        runs: list[IngestionRunResult] = []
        for _, row in df.head(limit).iterrows():
            try:
                status_raw = str(row.get("status", "success")).lower()
                status_map = {
                    "ok": "success",
                    "success": "success",
                    "error": "error",
                    "warning": "warning",
                    "skipped": "skipped",
                    "running": "running",
                    "queued": "queued",
                }
                status = status_map.get(status_raw, "success")
                started = row.get("started_at") or row.get("created_at") or datetime.now(timezone.utc)
                if hasattr(started, "to_pydatetime"):
                    started = started.to_pydatetime()
                finished = row.get("finished_at") or row.get("updated_at")
                if finished is not None and hasattr(finished, "to_pydatetime"):
                    finished = finished.to_pydatetime()
                run = IngestionRunResult(
                    run_id=str(row.get("id", _uuid.uuid4().hex[:8])),
                    source_id=str(row.get("source_id", row.get("fuente", "unknown"))),
                    dry_run=False,
                    status=status,
                    started_at=started,
                    finished_at=finished,
                    records_seen=int(row.get("records_seen", row.get("total_items", 0)) or 0),
                    records_new=int(row.get("records_new", row.get("new_items", 0)) or 0),
                    records_updated=int(row.get("records_updated", 0) or 0),
                    records_failed=int(row.get("records_failed", 0) or 0),
                    message=str(row.get("message", "") or ""),
                    error=str(row.get("error", "") or "") or None,
                    mode="real",
                )
                runs.append(run)
            except Exception:
                continue
        return runs
    except Exception:
        return []


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _parse_dt(value: object) -> datetime | None:
    """Convert string/datetime/None to datetime | None."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(str(value))
    except Exception:
        return None
