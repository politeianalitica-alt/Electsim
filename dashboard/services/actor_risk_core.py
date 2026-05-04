"""
Actor Risk Core Service — Bloque 4.

Capa de servicio para D2 (Mapa de Actores), D3 (Termómetro de Riesgo),
D8 (Geopolítica) y Politeia Brain.

Todas las funciones devuelven DataFrames/dicts vacíos y seguros si:
  - Las tablas no existen (migración no aplicada)
  - No hay datos en BD
  - Cualquier error de conexión

Nunca lanza excepciones al caller.
"""
from __future__ import annotations

import logging
from typing import Any

import pandas as pd

logger = logging.getLogger(__name__)

# ── Helpers internos ──────────────────────────────────────────────────────────

def _get_engine() -> Any:
    """Obtiene el engine de BD, o None si no está disponible."""
    try:
        from db.database import get_engine
        return get_engine()
    except Exception:
        return None


def _safe_read_sql(query: str, params: dict | None = None) -> pd.DataFrame:
    """Ejecuta una query y devuelve un DataFrame vacío si falla."""
    engine = _get_engine()
    if engine is None:
        return pd.DataFrame()
    try:
        from sqlalchemy import text as sa_text
        with engine.connect() as conn:
            result = conn.execute(sa_text(query), params or {})
            rows = result.fetchall()
            if not rows:
                return pd.DataFrame()
            return pd.DataFrame(rows, columns=list(result.keys()))
    except Exception as exc:
        logger.debug("actor_risk_core._safe_read_sql: %s", exc)
        return pd.DataFrame()


# ── Entidades ─────────────────────────────────────────────────────────────────

def cargar_entidades_riesgo(
    limit: int = 100,
    entity_type: str | None = None,
    min_risk_score: float = 0.0,
    only_pep: bool = False,
    only_sanctioned: bool = False,
) -> pd.DataFrame:
    """
    Carga entidades de riesgo del grafo.

    Returns:
        DataFrame con columnas: id, name, entity_type, risk_score, pep_status,
        sanctions_status, countries, source, confidence, updated_at
    """
    conditions = ["1=1"]
    params: dict[str, Any] = {"limit": limit}

    if entity_type:
        conditions.append("entity_type = :entity_type")
        params["entity_type"] = entity_type
    if min_risk_score > 0:
        conditions.append("risk_score >= :min_risk_score")
        params["min_risk_score"] = min_risk_score
    if only_pep:
        conditions.append("pep_status = TRUE")
    if only_sanctioned:
        conditions.append("sanctions_status = TRUE")

    where = " AND ".join(conditions)
    return _safe_read_sql(
        f"""
        SELECT id, name, entity_type, risk_score,
               pep_status, sanctions_status, countries,
               source, confidence, source_url,
               updated_at, risk_flags
        FROM risk_entities
        WHERE {where}
        ORDER BY risk_score DESC NULLS LAST
        LIMIT :limit
        """,
        params,
    )


def buscar_entidades(query: str, limit: int = 25) -> pd.DataFrame:
    """Búsqueda full-text de entidades por nombre."""
    if not query or not query.strip():
        return cargar_entidades_riesgo(limit=limit)
    return _safe_read_sql(
        """
        SELECT id, name, entity_type, risk_score,
               pep_status, sanctions_status, countries, source, confidence
        FROM risk_entities
        WHERE to_tsvector('simple', name) @@ plainto_tsquery('simple', :q)
           OR name ILIKE :q_like
        ORDER BY risk_score DESC NULLS LAST
        LIMIT :limit
        """,
        {"q": query.strip(), "q_like": f"%{query.strip()}%", "limit": limit},
    )


def cargar_relaciones_entidad(entity_id: int) -> pd.DataFrame:
    """Carga las relaciones de una entidad específica (grafo ego, depth=1)."""
    return _safe_read_sql(
        """
        SELECT r.id, r.relation_type, r.confidence,
               r.start_date, r.end_date,
               e_subj.id   AS subject_id,
               e_subj.name AS subject_name,
               e_subj.entity_type AS subject_type,
               e_obj.id    AS object_id,
               e_obj.name  AS object_name,
               e_obj.entity_type  AS object_type
        FROM risk_relations r
        JOIN risk_entities e_subj ON r.subject_entity_id = e_subj.id
        JOIN risk_entities e_obj  ON r.object_entity_id  = e_obj.id
        WHERE r.subject_entity_id = :entity_id
           OR r.object_entity_id  = :entity_id
        ORDER BY r.confidence DESC NULLS LAST
        LIMIT 200
        """,
        {"entity_id": entity_id},
    )


def cargar_flags_entidad(entity_id: int) -> pd.DataFrame:
    """Carga los flags de riesgo de una entidad."""
    return _safe_read_sql(
        """
        SELECT id, flag_type, severity, description, source,
               evidence_url, confidence, created_at
        FROM risk_flags
        WHERE entity_id = :entity_id
        ORDER BY
            CASE severity
                WHEN 'CRITICAL' THEN 1
                WHEN 'HIGH' THEN 2
                WHEN 'MEDIUM' THEN 3
                ELSE 4
            END,
            confidence DESC NULLS LAST
        """,
        {"entity_id": entity_id},
    )


def cargar_identidades_publicas(
    entity_id: int | None = None,
    actor_id: str | None = None,
    only_verified: bool = False,
) -> pd.DataFrame:
    """Carga candidatos de identidad social (verificados y no verificados)."""
    conditions = ["1=1"]
    params: dict[str, Any] = {}

    if entity_id is not None:
        conditions.append("entity_id = :entity_id")
        params["entity_id"] = entity_id
    if actor_id:
        conditions.append("actor_id = :actor_id")
        params["actor_id"] = actor_id
    if only_verified:
        conditions.append("verified = TRUE")

    where = " AND ".join(conditions)
    return _safe_read_sql(
        f"""
        SELECT id, platform, handle, profile_url,
               discovery_method, confidence, verified,
               verified_by, verified_at, risk_notes, created_at
        FROM social_identity_candidates
        WHERE {where}
        ORDER BY verified DESC, confidence DESC
        LIMIT 100
        """,
        params,
    )


def cargar_identidades_pendientes(limit: int = 50) -> pd.DataFrame:
    """Carga identidades sociales candidatas pendientes de verificación."""
    return _safe_read_sql(
        """
        SELECT s.id, s.platform, s.handle, s.profile_url,
               s.discovery_method, s.confidence,
               s.actor_id,
               e.name AS entity_name,
               s.created_at
        FROM social_identity_candidates s
        LEFT JOIN risk_entities e ON s.entity_id = e.id
        WHERE s.verified = FALSE
        ORDER BY s.confidence DESC, s.created_at DESC
        LIMIT :limit
        """,
        {"limit": limit},
    )


# ── Grafo ─────────────────────────────────────────────────────────────────────

def cargar_grafo_actor(entity_id: int, depth: int = 2) -> dict[str, Any]:
    """
    Construye el subgrafo ego de una entidad hasta profundidad `depth`.

    Returns:
        {"nodes": [...], "edges": [...], "meta": {...}}
        Nodos: {id, name, entity_type, risk_score, pep_status, sanctions_status}
        Edges: {source, target, relation_type, confidence}
    """
    nodes: dict[int, dict] = {}
    edges: list[dict] = []

    try:
        # Entidad central
        center_df = _safe_read_sql(
            "SELECT id, name, entity_type, risk_score, pep_status, sanctions_status "
            "FROM risk_entities WHERE id = :eid",
            {"eid": entity_id},
        )
        if center_df.empty:
            return {"nodes": [], "edges": [], "meta": {"entity_id": entity_id, "depth": 0}}

        center = center_df.iloc[0].to_dict()
        nodes[entity_id] = {**center, "level": 0, "is_center": True}

        frontier = {entity_id}
        for lvl in range(1, depth + 1):
            if not frontier:
                break
            rels_df = _safe_read_sql(
                """
                SELECT r.id, r.relation_type, r.confidence,
                       r.subject_entity_id, r.object_entity_id,
                       e_subj.name AS subj_name, e_subj.entity_type AS subj_type,
                       e_subj.risk_score AS subj_score,
                       e_subj.pep_status AS subj_pep,
                       e_subj.sanctions_status AS subj_sanc,
                       e_obj.name  AS obj_name, e_obj.entity_type AS obj_type,
                       e_obj.risk_score AS obj_score,
                       e_obj.pep_status AS obj_pep,
                       e_obj.sanctions_status AS obj_sanc
                FROM risk_relations r
                JOIN risk_entities e_subj ON r.subject_entity_id = e_subj.id
                JOIN risk_entities e_obj  ON r.object_entity_id  = e_obj.id
                WHERE r.subject_entity_id = ANY(:ids) OR r.object_entity_id = ANY(:ids)
                LIMIT 300
                """,
                {"ids": list(frontier)},
            )
            new_frontier: set[int] = set()
            for _, row in rels_df.iterrows():
                sid = int(row["subject_entity_id"])
                oid = int(row["object_entity_id"])
                edges.append({
                    "source": sid, "target": oid,
                    "relation_type": row["relation_type"],
                    "confidence": float(row.get("confidence", 0) or 0),
                })
                for nid, name, etype, score, pep, sanc in [
                    (sid, row["subj_name"], row["subj_type"], row.get("subj_score", 0), row.get("subj_pep", False), row.get("subj_sanc", False)),
                    (oid, row["obj_name"], row["obj_type"], row.get("obj_score", 0), row.get("obj_pep", False), row.get("obj_sanc", False)),
                ]:
                    if nid not in nodes:
                        nodes[nid] = {
                            "id": nid, "name": name, "entity_type": etype,
                            "risk_score": float(score or 0),
                            "pep_status": bool(pep), "sanctions_status": bool(sanc),
                            "level": lvl, "is_center": False,
                        }
                        new_frontier.add(nid)
            frontier = new_frontier

    except Exception as exc:
        logger.debug("cargar_grafo_actor error: %s", exc)

    # Deduplicar edges
    seen_edges: set[tuple] = set()
    unique_edges = []
    for e in edges:
        key = (min(e["source"], e["target"]), max(e["source"], e["target"]), e["relation_type"])
        if key not in seen_edges:
            seen_edges.add(key)
            unique_edges.append(e)

    return {
        "nodes": list(nodes.values()),
        "edges": unique_edges,
        "meta": {
            "entity_id": entity_id,
            "depth": depth,
            "n_nodes": len(nodes),
            "n_edges": len(unique_edges),
        },
    }


# ── KPIs ──────────────────────────────────────────────────────────────────────

def cargar_kpis_riesgo() -> dict[str, Any]:
    """
    KPIs agregados del módulo OSINT para D3 y D2.

    Returns:
        dict con: total_entities, pep_count, sanctioned_count,
                  critical_count, high_count, pending_identities,
                  high_risk_relations, hay_datos
    """
    default = {
        "total_entities": 0,
        "pep_count": 0,
        "sanctioned_count": 0,
        "critical_count": 0,
        "high_count": 0,
        "pending_identities": 0,
        "high_risk_relations": 0,
        "countries_exposed": 0,
        "hay_datos": False,
    }

    df = _safe_read_sql("""
        SELECT
            COUNT(*) AS total_entities,
            COUNT(*) FILTER (WHERE pep_status)          AS pep_count,
            COUNT(*) FILTER (WHERE sanctions_status)    AS sanctioned_count,
            COUNT(*) FILTER (WHERE risk_score >= 71)    AS critical_count,
            COUNT(*) FILTER (WHERE risk_score BETWEEN 46 AND 70) AS high_count
        FROM risk_entities
    """)

    if df.empty:
        return default

    row = df.iloc[0]
    result = {
        "total_entities": int(row.get("total_entities", 0) or 0),
        "pep_count": int(row.get("pep_count", 0) or 0),
        "sanctioned_count": int(row.get("sanctioned_count", 0) or 0),
        "critical_count": int(row.get("critical_count", 0) or 0),
        "high_count": int(row.get("high_count", 0) or 0),
        "pending_identities": 0,
        "high_risk_relations": 0,
        "countries_exposed": 0,
        "hay_datos": False,
    }

    # Pending identities
    pend_df = _safe_read_sql(
        "SELECT COUNT(*) AS n FROM social_identity_candidates WHERE verified = FALSE"
    )
    if not pend_df.empty:
        result["pending_identities"] = int(pend_df.iloc[0].get("n", 0) or 0)

    # High risk relations
    rel_df = _safe_read_sql(
        "SELECT COUNT(*) AS n FROM risk_relations WHERE confidence >= 0.70"
    )
    if not rel_df.empty:
        result["high_risk_relations"] = int(rel_df.iloc[0].get("n", 0) or 0)

    # Countries exposed
    ctry_df = _safe_read_sql(
        "SELECT COUNT(DISTINCT unnest(countries)) AS n FROM risk_entities WHERE array_length(countries, 1) > 0"
    )
    if not ctry_df.empty:
        result["countries_exposed"] = int(ctry_df.iloc[0].get("n", 0) or 0)

    result["hay_datos"] = result["total_entities"] > 0
    return result


def cargar_top_risk_entities(limit: int = 20) -> pd.DataFrame:
    """Top entidades por risk_score."""
    return _safe_read_sql(
        """
        SELECT id, name, entity_type, risk_score,
               pep_status, sanctions_status, countries, source
        FROM risk_entities
        ORDER BY risk_score DESC NULLS LAST
        LIMIT :limit
        """,
        {"limit": limit},
    )


def cargar_exposicion_por_pais() -> pd.DataFrame:
    """
    Exposición de entidades por país (para D8 Geopolítica).
    Returns DataFrame: country, n_entities, avg_risk_score, n_sanctioned, n_pep
    """
    return _safe_read_sql("""
        SELECT
            UPPER(country) AS country,
            COUNT(*)                                AS n_entities,
            ROUND(AVG(risk_score)::numeric, 2)      AS avg_risk_score,
            COUNT(*) FILTER (WHERE sanctions_status) AS n_sanctioned,
            COUNT(*) FILTER (WHERE pep_status)       AS n_pep,
            MAX(risk_score)                          AS max_risk_score
        FROM risk_entities,
             LATERAL UNNEST(countries) AS country
        WHERE array_length(countries, 1) > 0
        GROUP BY UPPER(country)
        ORDER BY n_entities DESC, avg_risk_score DESC
        LIMIT 100
    """)


def cargar_alertas_riesgo(limit: int = 20) -> pd.DataFrame:
    """Alertas de riesgo OSINT recientes."""
    return _safe_read_sql(
        """
        SELECT tipo, severidad, titulo, descripcion, datos, created_at
        FROM alertas_sistema
        WHERE tipo LIKE 'risk_%'
        ORDER BY created_at DESC
        LIMIT :limit
        """,
        {"limit": limit},
    )
