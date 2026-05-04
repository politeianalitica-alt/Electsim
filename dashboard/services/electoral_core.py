"""
Electoral Core Service — Bloque 6.

Funciones de acceso a datos electorales para el dashboard.
Todas las funciones degradan gracefully si no hay BD o datos disponibles.

Funciones principales:
  cargar_elecciones()
  cargar_resultados_electorales()
  cargar_encuestas_recientes()
  cargar_nowcast_actual()
  cargar_nowcast_historico()
  cargar_escanos_actuales()
  cargar_coaliciones_actuales()
  cargar_volatilidad()
  cargar_swing_territorial()
  cargar_provincias_tipping_point()
"""
from __future__ import annotations

import logging
from datetime import date, datetime, timedelta
from typing import Any

import pandas as pd

from db.connection import get_engine

logger = logging.getLogger(__name__)


# ── Helper DB ──────────────────────────────────────────────────────────────────

def _engine():
    try:
        return get_engine()
    except Exception:
        return None


def _query_df(sql: str, params: dict | None = None) -> pd.DataFrame:
    """Ejecuta SQL y devuelve DataFrame. Devuelve vacío si falla."""
    try:
        engine = _engine()
        if engine is None:
            return pd.DataFrame()
        from sqlalchemy import text as sa_text
        with engine.connect() as conn:
            return pd.read_sql(sa_text(sql), conn, params=params or {})
    except Exception as exc:
        logger.debug("electoral_core._query_df: %s", exc)
        return pd.DataFrame()


# ── Elecciones ─────────────────────────────────────────────────────────────────

def cargar_elecciones(
    geography: str = "ES",
    election_type: str | None = None,
    status: str | None = None,
    limit: int = 50,
) -> pd.DataFrame:
    """
    Carga metadatos de elecciones desde BD.

    Returns:
        DataFrame con columnas: election_id, election_date, election_type,
        geography, name, total_seats, majority_threshold, status.
        Vacío si no hay datos.
    """
    where = ["country = :geography"]
    params: dict[str, Any] = {"geography": geography, "limit": limit}

    if election_type:
        where.append("election_type = :election_type")
        params["election_type"] = election_type
    if status:
        where.append("status = :status")
        params["status"] = status

    where_clause = " AND ".join(where)
    sql = f"""
        SELECT election_id, election_date, election_type, geography,
               name, total_seats, majority_threshold, status
        FROM elections
        WHERE {where_clause}
        ORDER BY election_date DESC
        LIMIT :limit
    """
    return _query_df(sql, params)


# ── Resultados electorales ─────────────────────────────────────────────────────

def cargar_resultados_electorales(
    election_id: str,
    geography_id: str | None = None,
    top_parties: int | None = None,
) -> pd.DataFrame:
    """
    Carga resultados de una elección desde BD.

    Returns:
        DataFrame con columnas: geography_id, party_id, votes, vote_share,
        seats, turnout. Vacío si no hay datos.
    """
    where = ["election_id = :election_id"]
    params: dict[str, Any] = {"election_id": election_id}

    if geography_id:
        where.append("geography_id = :geography_id")
        params["geography_id"] = geography_id

    where_clause = " AND ".join(where)
    limit_clause = f"LIMIT {int(top_parties)}" if top_parties else ""

    sql = f"""
        SELECT geography_id, party_id, votes, vote_share, seats, turnout
        FROM election_results
        WHERE {where_clause}
        ORDER BY vote_share DESC NULLS LAST
        {limit_clause}
    """
    return _query_df(sql, params)


# ── Encuestas ──────────────────────────────────────────────────────────────────

def cargar_encuestas_recientes(
    geography: str = "ES",
    days_back: int = 90,
    limit: int = 50,
) -> pd.DataFrame:
    """
    Carga encuestas recientes con sus estimaciones medias por partido.

    Returns:
        DataFrame con columnas: poll_id, pollster, publication_date,
        sample_size, methodology, party_id, vote_share.
    """
    cutoff = (date.today() - timedelta(days=days_back)).isoformat()
    sql = """
        SELECT p.poll_id, p.pollster, p.publication_date, p.sample_size,
               p.methodology, pe.party_id, pe.vote_share
        FROM polls p
        JOIN poll_estimates pe ON p.poll_id = pe.poll_id
        WHERE p.geography = :geography
          AND p.publication_date >= :cutoff
        ORDER BY p.publication_date DESC
        LIMIT :limit
    """
    return _query_df(sql, {"geography": geography, "cutoff": cutoff, "limit": limit})


def cargar_encuestas_wide(
    geography: str = "ES",
    days_back: int = 90,
    limit: int = 30,
) -> pd.DataFrame:
    """
    Encuestas en formato wide (una fila por encuesta, columnas por partido).

    Returns:
        DataFrame pivotado o vacío.
    """
    long_df = cargar_encuestas_recientes(geography, days_back, limit * 20)
    if long_df.empty or "party_id" not in long_df.columns:
        return pd.DataFrame()

    try:
        wide = long_df.pivot_table(
            index=["poll_id", "pollster", "publication_date", "sample_size", "methodology"],
            columns="party_id",
            values="vote_share",
            aggfunc="first",
        ).reset_index()
        wide.columns.name = None
        return wide.head(limit)
    except Exception as exc:
        logger.debug("cargar_encuestas_wide pivot error: %s", exc)
        return pd.DataFrame()


# ── Nowcasting ─────────────────────────────────────────────────────────────────

def cargar_nowcast_actual(geography: str = "ES") -> dict[str, Any]:
    """
    Carga el nowcasting más reciente desde BD.

    Returns:
        Dict con: hay_datos, leading_party, party_estimates, seat_estimates,
        uncertainty, majority_probability, snapshot_date, model_name.
        hay_datos=False si no hay datos disponibles.
    """
    empty = {
        "hay_datos": False,
        "leading_party": None,
        "party_estimates": {},
        "seat_estimates": {},
        "uncertainty": {},
        "majority_probability": {},
        "snapshot_date": None,
        "model_name": None,
    }
    sql = """
        SELECT id, snapshot_date, model_name, model_version,
               party_estimates, seat_estimates, uncertainty,
               leading_party, majority_probability, inputs_summary
        FROM nowcast_snapshots
        WHERE geography = :geography
        ORDER BY snapshot_date DESC
        LIMIT 1
    """
    df = _query_df(sql, {"geography": geography})
    if df.empty:
        return empty

    row = df.iloc[0]
    try:
        party_estimates = _parse_json_col(row, "party_estimates", {})
        seat_estimates = _parse_json_col(row, "seat_estimates", {})
        uncertainty = _parse_json_col(row, "uncertainty", {})
        majority_prob = _parse_json_col(row, "majority_probability", {})

        return {
            "hay_datos": bool(party_estimates),
            "snapshot_id": int(row.get("id", 0)) if row.get("id") else None,
            "leading_party": row.get("leading_party"),
            "party_estimates": party_estimates,
            "seat_estimates": seat_estimates,
            "uncertainty": uncertainty,
            "majority_probability": majority_prob,
            "snapshot_date": row.get("snapshot_date"),
            "model_name": row.get("model_name"),
        }
    except Exception as exc:
        logger.debug("cargar_nowcast_actual parse error: %s", exc)
        return empty


def cargar_nowcast_historico(
    geography: str = "ES",
    days_back: int = 180,
    party_id: str | None = None,
) -> pd.DataFrame:
    """
    Devuelve la serie histórica del nowcasting por partido.

    Returns:
        DataFrame con columnas: snapshot_date, party_id, vote_share.
        Vacío si no hay datos.
    """
    cutoff = (datetime.utcnow() - timedelta(days=days_back)).isoformat()
    sql = """
        SELECT snapshot_date,
               (jsonb_each_text(party_estimates)).key   AS party_id,
               (jsonb_each_text(party_estimates)).value::float AS vote_share
        FROM nowcast_snapshots
        WHERE geography = :geography
          AND snapshot_date >= :cutoff
        ORDER BY snapshot_date DESC
    """
    df = _query_df(sql, {"geography": geography, "cutoff": cutoff})
    if df.empty:
        return pd.DataFrame()

    if party_id:
        df = df[df["party_id"] == party_id]

    return df.reset_index(drop=True)


# ── Escaños ────────────────────────────────────────────────────────────────────

def cargar_escanos_actuales(
    geography: str = "ES",
    method: str = "dhondt",
    min_share: float = 1.0,
) -> dict[str, int]:
    """
    Devuelve estimación de escaños a partir del nowcast más reciente.

    Returns:
        {partido: n_escaños} o {} si no hay datos.
    """
    nc = cargar_nowcast_actual(geography)
    if not nc["hay_datos"]:
        return {}

    # Si el snapshot ya tiene escaños calculados, devolverlos directamente
    if nc.get("seat_estimates"):
        return nc["seat_estimates"]

    # Si no, calcular con D'Hondt
    try:
        from etl.sources.electoral.seat_allocator import allocate_congress_seats
        party_estimates = nc["party_estimates"]
        valid = {p: v for p, v in party_estimates.items() if v >= min_share}
        return allocate_congress_seats(valid, method=method)
    except Exception as exc:
        logger.debug("cargar_escanos_actuales: %s", exc)
        return {}


# ── Coaliciones ────────────────────────────────────────────────────────────────

def cargar_coaliciones_actuales(
    geography: str = "ES",
    limit: int = 15,
    scenario_type: str | None = None,
) -> pd.DataFrame:
    """
    Carga los escenarios de coalición más recientes desde BD.

    Returns:
        DataFrame con columnas: name, parties, seats_total, has_majority,
        majority_margin, probability, scenario_type, explanation.
        Vacío si no hay datos.
    """
    nc = cargar_nowcast_actual(geography)
    snapshot_id = nc.get("snapshot_id")

    if snapshot_id:
        where = "WHERE snapshot_id = :snapshot_id"
        params: dict[str, Any] = {"snapshot_id": snapshot_id, "limit": limit}
        if scenario_type:
            where += " AND scenario_type = :scenario_type"
            params["scenario_type"] = scenario_type
    else:
        where = "WHERE 1=1"
        params = {"limit": limit}
        if scenario_type:
            where += " AND scenario_type = :scenario_type"
            params["scenario_type"] = scenario_type

    sql = f"""
        SELECT name, parties, seats_total, has_majority, majority_margin,
               ideological_compatibility, historical_plausibility,
               negotiation_complexity, probability, scenario_type, explanation
        FROM coalition_scenarios
        {where}
        ORDER BY probability DESC
        LIMIT :limit
    """
    df = _query_df(sql, params)
    if not df.empty:
        return df

    # Fallback: calcular en tiempo real con el nowcast actual
    if nc["hay_datos"] and nc.get("seat_estimates"):
        return _compute_coalitions_realtime(nc["seat_estimates"])

    return pd.DataFrame()


def _compute_coalitions_realtime(seats: dict[str, int]) -> pd.DataFrame:
    """Calcula coaliciones en tiempo real sin BD."""
    try:
        from etl.sources.electoral.coalition_model import analyze_all_coalitions

        coalitions = analyze_all_coalitions(seats, max_parties=4)
        if not coalitions:
            return pd.DataFrame()

        records = []
        for c in coalitions[:15]:
            records.append({
                "name": c.name,
                "parties": c.parties,
                "seats_total": c.seats_total,
                "has_majority": c.has_majority,
                "majority_margin": c.majority_margin,
                "probability": c.probability,
                "scenario_type": c.scenario_type,
                "explanation": c.explanation,
            })
        return pd.DataFrame(records)
    except Exception as exc:
        logger.debug("_compute_coalitions_realtime: %s", exc)
        return pd.DataFrame()


# ── Volatilidad ────────────────────────────────────────────────────────────────

def cargar_volatilidad(
    election_id_a: str | None = None,
    election_id_b: str | None = None,
    geography: str = "ES",
) -> dict[str, Any]:
    """
    Calcula indicadores de volatilidad entre dos elecciones o snapshots.

    Returns:
        Dict con: pedersen_index, party_swing, bloc_swing, enp_before,
        enp_after, most_volatile_party, max_swing.
        Vacío si no hay datos suficientes.
    """
    empty = {"hay_datos": False}

    # Intentar cargar resultados de las dos elecciones
    result_a: dict[str, float] = {}
    result_b: dict[str, float] = {}

    if election_id_a:
        df_a = cargar_resultados_electorales(election_id_a, geography_id=geography)
        if not df_a.empty and "vote_share" in df_a.columns:
            result_a = dict(zip(df_a["party_id"], df_a["vote_share"]))

    if election_id_b:
        df_b = cargar_resultados_electorales(election_id_b, geography_id=geography)
        if not df_b.empty and "vote_share" in df_b.columns:
            result_b = dict(zip(df_b["party_id"], df_b["vote_share"]))

    # Si no hay datos históricos, comparar nowcast con última elección
    if not result_b:
        nc = cargar_nowcast_actual(geography)
        if nc["hay_datos"]:
            result_b = nc["party_estimates"]

    if not result_a or not result_b:
        return empty

    try:
        from etl.sources.electoral.volatility_model import compute_volatility_summary
        summary = compute_volatility_summary(result_a, result_b)
        summary["hay_datos"] = True
        return summary
    except Exception as exc:
        logger.debug("cargar_volatilidad: %s", exc)
        return empty


# ── Swing territorial ─────────────────────────────────────────────────────────

def cargar_swing_territorial(
    election_id_prev: str | None = None,
    geography: str = "ES",
    top_n: int = 20,
) -> pd.DataFrame:
    """
    Calcula el swing territorial por provincia entre la elección anterior
    y el nowcast actual.

    Returns:
        DataFrame con columnas: geography_id, party_id, share_prev,
        share_curr, swing. Vacío si no hay datos.
    """
    # Proyección actual
    nc = cargar_nowcast_actual(geography)
    if not nc["hay_datos"]:
        return pd.DataFrame()

    # Resultados anteriores
    if election_id_prev:
        df_prev = cargar_resultados_electorales(election_id_prev)
    else:
        # Sin elección de referencia, usar datos nacionales como proxy
        df_prev = pd.DataFrame()

    if df_prev.empty:
        return pd.DataFrame()

    # Construir DataFrame de proyección (nacional, sin desglose provincial)
    nc_records = [
        {"geography_id": geography, "party_id": p, "vote_share": v}
        for p, v in nc["party_estimates"].items()
    ]
    df_curr = pd.DataFrame(nc_records)

    try:
        from etl.sources.electoral.volatility_model import territorial_swing
        return territorial_swing(df_prev, df_curr).head(top_n)
    except Exception as exc:
        logger.debug("cargar_swing_territorial: %s", exc)
        return pd.DataFrame()


# ── Tipping point provinces ───────────────────────────────────────────────────

def cargar_provincias_tipping_point(
    geography: str = "ES",
    threshold_delta: float = 2.0,
    top_n: int = 10,
) -> list[dict[str, Any]]:
    """
    Detecta provincias donde un pequeño swing cambiaría el reparto de escaños.

    Requiere datos provinciales en BD. Sin datos, devuelve [].

    Returns:
        Lista de dicts con {province, party_simulated, seat_changes, sensitivity}.
    """
    # Intentar cargar datos provinciales de la última elección conocida
    elections = cargar_elecciones(geography=geography, limit=1)
    if elections.empty:
        return []

    election_id = elections.iloc[0]["election_id"]
    df = cargar_resultados_electorales(election_id)
    if df.empty or "geography_id" not in df.columns:
        return []

    # Construir shares por provincia
    try:
        from etl.sources.electoral.seat_allocator import SPAIN_SEATS_BY_PROVINCE
        from etl.sources.electoral.volatility_model import detect_tipping_provinces

        province_shares: dict[str, dict[str, float]] = {}
        for _, row in df.iterrows():
            prov = row.get("geography_id", "")
            if not prov or row.get("vote_share") is None:
                continue
            if prov not in province_shares:
                province_shares[prov] = {}
            province_shares[prov][row["party_id"]] = float(row["vote_share"])

        if not province_shares:
            return []

        tipping = detect_tipping_provinces(
            vote_share_by_province=province_shares,
            seats_by_province=SPAIN_SEATS_BY_PROVINCE,
            threshold_delta=threshold_delta,
        )
        return tipping[:top_n]

    except Exception as exc:
        logger.debug("cargar_provincias_tipping_point: %s", exc)
        return []


# ── Resumen electoral ─────────────────────────────────────────────────────────

def cargar_resumen_electoral(geography: str = "ES") -> dict[str, Any]:
    """
    Devuelve un resumen de la situación electoral actual.

    Returns:
        Dict con: nowcast, seats, top_coalition, volatility, hay_datos.
    """
    nc = cargar_nowcast_actual(geography)
    seats = cargar_escanos_actuales(geography)

    top_coalition = None
    coal_df = cargar_coaliciones_actuales(geography, limit=1)
    if not coal_df.empty:
        top_coalition = coal_df.iloc[0].to_dict()

    return {
        "hay_datos": nc["hay_datos"],
        "nowcast": nc,
        "seats": seats,
        "top_coalition": top_coalition,
    }


# ── Helpers internos ──────────────────────────────────────────────────────────

def _parse_json_col(row: Any, col: str, default: Any) -> Any:
    """Parsea columna JSON de un row de pandas."""
    import json as _json

    val = row.get(col, default)
    if val is None or (isinstance(val, float) and str(val) == "nan"):
        return default
    if isinstance(val, (dict, list)):
        return val
    try:
        return _json.loads(str(val))
    except (ValueError, TypeError):
        return default
