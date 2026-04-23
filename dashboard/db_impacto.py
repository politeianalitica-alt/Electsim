"""Acceso a datos para modulo de impacto de campana."""

from __future__ import annotations

from typing import Any

import pandas as pd

from dashboard.db import get_conn


def _q(sql: str, params: dict | tuple | list | None = None) -> pd.DataFrame:
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params or None)
            if cur.description is None:
                return pd.DataFrame()
            cols = [d[0] for d in cur.description]
            rows = cur.fetchall()
        return pd.DataFrame(rows, columns=cols)
    except Exception:
        return pd.DataFrame()
    finally:
        try:
            conn.close()
        except Exception:
            pass


def listar_eventos(cliente_id: int | None = None, solo_activos: bool = True, limit: int = 200) -> pd.DataFrame:
    clauses: list[str] = []
    params: list[Any] = []

    if cliente_id is not None:
        clauses.append("(cliente_id = %s OR cliente_id IS NULL)")
        params.append(int(cliente_id))
    else:
        clauses.append("cliente_id IS NULL")

    if solo_activos:
        clauses.append("activo = TRUE")

    where = " WHERE " + " AND ".join(clauses) if clauses else ""

    sql = f"""
        SELECT
            id, cliente_id, tipo, titulo, descripcion, localizacion,
            ccaa, provincia, fecha_inicio, fecha_fin,
            coste_estimado_eur, alcance_estimado, activo, created_at
        FROM eventos_campana
        {where}
        ORDER BY fecha_inicio DESC
        LIMIT %s
    """
    params.append(int(limit))
    return _q(sql, tuple(params))


def crear_evento(datos: dict) -> int:
    conn = get_conn()
    try:
        cols = ", ".join(datos.keys())
        vals = ", ".join([f"%({k})s" for k in datos.keys()])
        sql = f"INSERT INTO eventos_campana ({cols}) VALUES ({vals}) RETURNING id"
        with conn.cursor() as cur:
            cur.execute(sql, datos)
            new_id = cur.fetchone()[0]
        conn.commit()
        return int(new_id)
    finally:
        try:
            conn.close()
        except Exception:
            pass


def guardar_snapshot(evento_id: int, ventana: str, datos: dict) -> None:
    conn = get_conn()
    try:
        payload = {"evento_id": int(evento_id), "ventana": ventana, **datos}
        cols = ", ".join(payload.keys())
        vals = ", ".join([f"%({k})s" for k in payload.keys()])
        sql = f"INSERT INTO impacto_evento_snapshot ({cols}) VALUES ({vals})"
        with conn.cursor() as cur:
            cur.execute(sql, payload)
        conn.commit()
    finally:
        try:
            conn.close()
        except Exception:
            pass


def cargar_snapshots_evento(evento_id: int) -> pd.DataFrame:
    return _q(
        """
        SELECT
            id,
            evento_id,
            ventana,
            fecha_snapshot,
            partido,
            intencion_voto_pct,
            valoracion_lider,
            conocimiento_pct,
            menciones_prensa,
            menciones_rrss,
            sentiment_medio,
            engagement_rrss
        FROM impacto_evento_snapshot
        WHERE evento_id = %s
        ORDER BY fecha_snapshot ASC
        """,
        (int(evento_id),),
    )


def guardar_resultado_impacto(evento_id: int, resultados: list[dict]) -> None:
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            for row in resultados:
                payload = dict(row)
                payload["evento_id"] = int(evento_id)
                cur.execute(
                    """
                    INSERT INTO impacto_evento_resultado
                        (evento_id, metrica, delta_absoluto, delta_relativo_pct,
                         coste_por_punto, metodo, intervalo_inf, intervalo_sup,
                         confianza)
                    VALUES
                        (%(evento_id)s, %(metrica)s, %(delta_absoluto)s, %(delta_relativo_pct)s,
                         %(coste_por_punto)s, %(metodo)s, %(intervalo_inf)s, %(intervalo_sup)s,
                         %(confianza)s)
                    ON CONFLICT (evento_id, metrica) DO UPDATE
                        SET delta_absoluto = EXCLUDED.delta_absoluto,
                            delta_relativo_pct = EXCLUDED.delta_relativo_pct,
                            coste_por_punto = EXCLUDED.coste_por_punto,
                            metodo = EXCLUDED.metodo,
                            intervalo_inf = EXCLUDED.intervalo_inf,
                            intervalo_sup = EXCLUDED.intervalo_sup,
                            confianza = EXCLUDED.confianza,
                            calculado_en = NOW()
                    """,
                    payload,
                )
        conn.commit()
    finally:
        try:
            conn.close()
        except Exception:
            pass


def cargar_resultados_evento(evento_id: int) -> pd.DataFrame:
    return _q(
        """
        SELECT
            metrica,
            delta_absoluto,
            delta_relativo_pct,
            coste_por_punto,
            metodo,
            intervalo_inf,
            intervalo_sup,
            confianza,
            calculado_en
        FROM impacto_evento_resultado
        WHERE evento_id = %s
        ORDER BY metrica ASC
        """,
        (int(evento_id),),
    )
