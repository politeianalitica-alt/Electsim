"""
Servicio Core Legislativo — capa de datos para D4 Monitor Legislativo.

Funciones:
    cargar_boe_reciente(limit)          → pd.DataFrame
    cargar_iniciativas_recientes(limit) → pd.DataFrame
    cargar_kpis_legislativos()          → dict
    cargar_alertas_legislativas()       → pd.DataFrame
    buscar_items_legislativos(query)    → pd.DataFrame
    cargar_timeline_iniciativa(id)      → pd.DataFrame

Regla: si la BD no tiene tablas o está vacía, devuelve DataFrame vacío
       o dict con defaults. NUNCA rompe el dashboard.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

import pandas as pd

logger = logging.getLogger(__name__)


# ── Engine helper ─────────────────────────────────────────────────────────────

def _get_engine():
    """Retorna el engine SQLAlchemy del proyecto o None."""
    try:
        from etl.factory import crear_engine
        return crear_engine()
    except Exception:
        pass
    try:
        import dashboard.db as _db
        return _db.get_engine()
    except Exception:
        return None


def _safe_read_sql(query: str, params: dict | None = None) -> pd.DataFrame:
    """Ejecuta una query SQL y retorna DataFrame vacío en caso de error."""
    engine = _get_engine()
    if engine is None:
        return pd.DataFrame()
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            result = conn.execute(text(query), params or {})
            rows = result.fetchall()
            cols = list(result.keys())
        return pd.DataFrame(rows, columns=cols)
    except Exception as exc:
        logger.debug("legislative_core._safe_read_sql: %s", exc)
        return pd.DataFrame()


# ── BOE ───────────────────────────────────────────────────────────────────────

def cargar_boe_reciente(
    limit: int = 100,
    days: int = 7,
    impact_filter: list[str] | None = None,
) -> pd.DataFrame:
    """
    Carga ítems recientes del BOE desde la tabla legal_items.

    Args:
        limit: máximo de ítems.
        days: ventana temporal (días atrás desde hoy).
        impact_filter: lista de niveles de impacto, ej. ['CRÍTICO', 'ALTO'].

    Returns:
        DataFrame con columnas: source_id, title, legal_rank, department,
        section, publication_date, impact_level, sectors, url_html, fetched_at.
    """
    since = (datetime.now(timezone.utc) - timedelta(days=days)).date()

    where_clauses = ["source = 'boe'", "publication_date >= :since"]
    params: dict[str, Any] = {"since": since, "limit": limit}

    if impact_filter:
        placeholders = ", ".join(f":imp{i}" for i, _ in enumerate(impact_filter))
        where_clauses.append(f"impact_level IN ({placeholders})")
        for i, v in enumerate(impact_filter):
            params[f"imp{i}"] = v

    query = f"""
        SELECT
            source_id, title, legal_rank, department, section,
            publication_date, impact_level, sectors, url_html, fetched_at
        FROM legal_items
        WHERE {' AND '.join(where_clauses)}
        ORDER BY publication_date DESC, impact_level ASC
        LIMIT :limit
    """
    df = _safe_read_sql(query, params)

    # Enriquecer con campo 'impacto' para compatibilidad con D4
    if not df.empty and "impact_level" in df.columns:
        df["impacto"] = df["impact_level"]
        df["id"] = df["source_id"]
        df["titulo"] = df["title"]
        df["departamento"] = df.get("department", "")
        df["seccion"] = df.get("section", "")
        df["url_html"] = df.get("url_html", "")
    return df


def cargar_boe_hoy() -> pd.DataFrame:
    """Alias conveniente — BOE del día actual."""
    return cargar_boe_reciente(limit=200, days=1)


# ── Iniciativas parlamentarias ────────────────────────────────────────────────

def cargar_iniciativas_recientes(
    limit: int = 100,
    days: int = 90,
    tipos: list[str] | None = None,
    legislatura: str = "15",
) -> pd.DataFrame:
    """
    Carga iniciativas parlamentarias recientes.

    Args:
        limit: máximo de registros.
        days: ventana temporal.
        tipos: ['PL', 'PPL', 'PNL', …] o None (todas).
        legislatura: número de legislatura.

    Returns:
        DataFrame con columnas: source_id, initiative_type, title,
        presented_date, status, impact_level, sectors, authors_json.
    """
    since = (datetime.now(timezone.utc) - timedelta(days=days)).date()
    params: dict[str, Any] = {"since": since, "limit": limit, "legis": legislatura}
    where_clauses = ["presented_date >= :since", "legislature = :legis"]

    if tipos:
        pls = ", ".join(f":tip{i}" for i, _ in enumerate(tipos))
        where_clauses.append(f"initiative_type IN ({pls})")
        for i, v in enumerate(tipos):
            params[f"tip{i}"] = v

    query = f"""
        SELECT
            source_id, initiative_type, title, presented_date,
            qualified_date, status, result, impact_level,
            sectors, authors, boe_refs, raw_url
        FROM parliamentary_initiatives
        WHERE {' AND '.join(where_clauses)}
        ORDER BY presented_date DESC
        LIMIT :limit
    """
    return _safe_read_sql(query, params)


# ── KPIs ──────────────────────────────────────────────────────────────────────

def cargar_kpis_legislativos() -> dict:
    """
    Retorna KPIs del módulo legislativo.

    Returns:
        dict con keys:
            boe_hoy, boe_criticos, boe_altos,
            iniciativas_mes, iniciativas_criticas,
            ultima_actualizacion, hay_datos
    """
    defaults: dict[str, Any] = {
        "boe_hoy": 0, "boe_criticos": 0, "boe_altos": 0,
        "iniciativas_mes": 0, "iniciativas_criticas": 0,
        "ultima_actualizacion": None, "hay_datos": False,
    }

    df_boe = cargar_boe_reciente(limit=500, days=1)
    if df_boe.empty:
        # No hay tabla o no hay datos hoy — intentar semana
        df_boe = cargar_boe_reciente(limit=500, days=7)

    df_init = cargar_iniciativas_recientes(limit=500, days=30)

    if df_boe.empty and df_init.empty:
        return defaults

    kpis: dict[str, Any] = dict(defaults)
    kpis["hay_datos"] = True

    if not df_boe.empty:
        kpis["boe_hoy"] = len(df_boe)
        if "impact_level" in df_boe.columns:
            kpis["boe_criticos"] = int((df_boe["impact_level"] == "CRÍTICO").sum())
            kpis["boe_altos"] = int((df_boe["impact_level"] == "ALTO").sum())
        if "fetched_at" in df_boe.columns:
            kpis["ultima_actualizacion"] = df_boe["fetched_at"].max()

    if not df_init.empty:
        kpis["iniciativas_mes"] = len(df_init)
        if "impact_level" in df_init.columns:
            kpis["iniciativas_criticas"] = int((df_init["impact_level"] == "CRÍTICO").sum())

    return kpis


# ── Alertas legislativas ───────────────────────────────────────────────────────

def cargar_alertas_legislativas(limit: int = 20) -> pd.DataFrame:
    """
    Lee alertas del sistema relacionadas con el módulo legislativo.

    Returns:
        DataFrame con columnas: tipo, severidad, titulo, descripcion,
        datos_json, created_at.
    """
    query = """
        SELECT tipo, severidad, titulo, descripcion, datos_json, created_at
        FROM alertas_sistema
        WHERE tipo IN (
            'legal_boe_critical', 'legal_boe_high',
            'parliamentary_initiative_new', 'parliamentary_initiative_updated',
            'legal_parliament_link'
        )
        ORDER BY created_at DESC
        LIMIT :limit
    """
    return _safe_read_sql(query, {"limit": limit})


# ── Búsqueda ──────────────────────────────────────────────────────────────────

def buscar_items_legislativos(
    query_text: str,
    limit: int = 50,
) -> pd.DataFrame:
    """
    Búsqueda de texto libre en legal_items + parliamentary_initiatives.

    Usa ILIKE en title + ILIKE en summary para compatibilidad sin FTS.
    Si hay pg_trgm, usa similarity automáticamente (PostgreSQL decide).

    Returns:
        DataFrame unificado con columna 'tipo_fuente': 'boe' | 'congreso'.
    """
    q = f"%{query_text}%"
    params: dict[str, Any] = {"q": q, "limit": limit}

    query = """
        SELECT
            source_id, 'boe' AS tipo_fuente, title AS titulo,
            legal_rank AS tipo, department AS departamento,
            publication_date AS fecha, impact_level AS impacto,
            url_html AS url, sectors
        FROM legal_items
        WHERE title ILIKE :q OR summary ILIKE :q
        UNION ALL
        SELECT
            source_id, 'congreso' AS tipo_fuente, title AS titulo,
            initiative_type AS tipo, NULL AS departamento,
            presented_date AS fecha, impact_level AS impacto,
            raw_url AS url, sectors
        FROM parliamentary_initiatives
        WHERE title ILIKE :q
        ORDER BY fecha DESC NULLS LAST
        LIMIT :limit
    """
    return _safe_read_sql(query, params)


# ── Timeline de una iniciativa ─────────────────────────────────────────────────

def cargar_timeline_iniciativa(source_id: str) -> pd.DataFrame:
    """
    Retorna el timeline de tramitación de una iniciativa concreta.
    Extrae de los campos bulletins y diaries (JSONB).
    """
    query = """
        SELECT
            source_id, initiative_type, title, presented_date,
            qualified_date, status, result, bulletins, diaries, boe_refs
        FROM parliamentary_initiatives
        WHERE source_id = :sid
        LIMIT 1
    """
    df = _safe_read_sql(query, {"sid": source_id})
    if df.empty:
        return df

    # Expandir timeline desde bulletins y diaries
    events: list[dict] = []
    row = df.iloc[0]

    if pd.notna(row.get("presented_date")):
        events.append({"fecha": row["presented_date"], "hito": "Presentación", "tipo": "inicio"})
    if pd.notna(row.get("qualified_date")):
        events.append({"fecha": row["qualified_date"], "hito": "Calificación", "tipo": "tramitacion"})

    # Parsear bulletins JSONB
    import json
    for field, label in [("bulletins", "Boletin"), ("diaries", "Diario sesion")]:
        val = row.get(field)
        if val:
            try:
                docs = json.loads(val) if isinstance(val, str) else val
                for d in (docs if isinstance(docs, list) else []):
                    if d.get("date_published"):
                        events.append({
                            "fecha": d["date_published"],
                            "hito": f"{label} {d.get('number', '')}",
                            "tipo": field,
                        })
            except Exception:
                pass

    if row.get("status"):
        events.append({"fecha": None, "hito": f"Estado actual: {row['status']}", "tipo": "estado"})

    return pd.DataFrame(events).sort_values("fecha", na_position="last")


# ── Utility: enriquecer BOE legacy ────────────────────────────────────────────

def enriquecer_boe_legacy(items: list[dict]) -> list[dict]:
    """
    Enriquece ítems del BOE en formato antiguo (de boe_api.py)
    añadiendo campos del esquema nuevo: impact_level, sectors.
    """
    from etl.sources.legislative.boe_adapter import clasificar_impacto, detectar_sectores
    enriched = []
    for item in items:
        if "impacto" not in item:
            item["impacto"] = clasificar_impacto(
                item.get("titulo", ""),
                item.get("seccion", ""),
                item.get("departamento", ""),
            )
        if "sectors" not in item:
            item["sectors"] = detectar_sectores(item.get("titulo", ""))
        enriched.append(item)
    return enriched
